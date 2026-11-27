/* eslint-disable max-len */
import {tr, timeoutError, isTimeout} from './runtime-texts.mjs';
// Makeblock "live mode" transport for CyberPi (mBot2) and Codey Rocky over Web Serial
// (USB cable) or Web Bluetooth (the robot's own BLE radio).
//
// These robots do not expose a MicroPython raw REPL. Their factory firmware
// speaks a framed binary protocol instead:
//
//   F3, headerCheck, lenLo, lenHi, payload..., payloadCheck, F4
//
//   headerCheck  = (0xF3 + lenLo + lenHi) & 0xFF
//   len          = number of payload bytes
//   payloadCheck = sum(payload) & 0xFF
//
// Payload types used here:
//   0x0D mode switch:  [0x0D, 0x00, mode]           mode 1 = live (online), 0 = upload
//   0x28 run script:   [0x28, reply, idxLo, idxHi, textLenLo, textLenHi, ...utf8]
//                      reply 1 asks the robot to answer with the same idx and a
//                      Python dict text such as "{'ret': 42}".
//
// Written for Unifiscratch from the publicly observable frame format; no
// Makeblock source code is included.

const HEAD = 0xF3;
const TAIL = 0xF4;
const MAX_PAYLOAD = 4096;

export const TYPE_MODE = 0x0D;
export const TYPE_SCRIPT = 0x28;
export const MODE_LIVE = 0x01;
export const MODE_UPLOAD = 0x00;

const cancelled = () => new Error(tr('Operation cancelled because the device was stopped.', 'Operación cancelada por la parada del dispositivo.', 'Operació cancel·lada per l’aturada del dispositiu.'));

const sum = bytes => bytes.reduce((total, byte) => (total + byte) & 0xFF, 0);

export const encodeFrame = payload => {
    const body = Array.from(payload);
    if (body.length > MAX_PAYLOAD) throw new Error(tr('Command too long for the robot.', 'Orden demasiado larga para el robot.', 'Ordre massa llarga per al robot.'));
    const lenLo = body.length & 0xFF;
    const lenHi = (body.length >> 8) & 0xFF;
    return Uint8Array.from([HEAD, (HEAD + lenLo + lenHi) & 0xFF, lenLo, lenHi, ...body, sum(body), TAIL]);
};

export const modeFrame = mode => encodeFrame([TYPE_MODE, 0x00, mode]);

export const scriptFrame = (script, idx, reply = true) => {
    const text = Array.from(new TextEncoder().encode(String(script)));
    return encodeFrame([
        TYPE_SCRIPT, reply ? 1 : 0, idx & 0xFF, (idx >> 8) & 0xFF,
        text.length & 0xFF, (text.length >> 8) & 0xFF, ...text
    ]);
};

// Splits a byte stream into payloads. Bytes outside valid frames (boot logs,
// print output) are skipped.
export class FrameParser {
    constructor () {
        this.buffer = [];
    }

    push (chunk) {
        for (const byte of chunk) this.buffer.push(byte);
        const frames = [];
        let start = 0;
        while (start + 4 <= this.buffer.length) {
            const b = this.buffer;
            if (b[start] !== HEAD || b[start + 1] !== ((HEAD + b[start + 2] + b[start + 3]) & 0xFF)) {
                start++;
                continue;
            }
            const length = b[start + 2] | (b[start + 3] << 8);
            if (length > MAX_PAYLOAD) {
                start++;
                continue;
            }
            const end = start + 4 + length + 2;
            if (end > b.length) break; // wait for the rest of the frame
            const payload = b.slice(start + 4, start + 4 + length);
            if (b[end - 1] === TAIL && b[end - 2] === sum(payload)) {
                frames.push(payload);
                start = end;
            } else {
                start++;
            }
        }
        this.buffer = this.buffer.slice(start);
        if (this.buffer.length > 65536) this.buffer = [];
        return frames;
    }
}

export const decodeScriptReply = payload => {
    if (payload[0] !== TYPE_SCRIPT || payload.length < 6) return null;
    const idx = payload[2] | (payload[3] << 8);
    const length = payload[4] | (payload[5] << 8);
    const text = new TextDecoder().decode(Uint8Array.from(payload.slice(6, 6 + length)));
    return {idx, text};
};

// Converts the Python literal the robot sends back ("{'ret': True}") into a JS value.
export const parseReturnValue = text => {
    const match = /['"]ret['"]\s*:\s*([\s\S]*?)\s*}\s*$/.exec(String(text));
    if (!match) return '';
    const raw = match[1];
    if (raw === 'True') return true;
    if (raw === 'False') return false;
    if (raw === 'None' || raw === '') return '';
    if (/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(raw)) return Number(raw);
    const quoted = /^(['"])([\s\S]*)\1$/.exec(raw);
    if (quoted) return quoted[2].replace(/\\(['"\\])/g, '$1');
    try {
        return JSON.stringify(JSON.parse(raw.replace(/'/g, '"')
            .replace(/\bTrue\b/g, 'true')
            .replace(/\bFalse\b/g, 'false')
            .replace(/\bNone\b/g, 'null')));
    } catch (error) {
        return raw;
    }
};

export const pyArgs = (...values) => values.map(value => {
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) throw new Error(tr('The value must be a finite number.', 'El valor debe ser un número finito.', 'El valor ha de ser un nombre finit.'));
        return String(value);
    }
    if (typeof value === 'boolean') return value ? 'True' : 'False';
    return JSON.stringify(String(value));
}).join(', ');

// ---------- Bluetooth: the same F3 frames over the robot's BLE serial service ----------
// Makeblock boards expose a serial-like GATT service (0xFFE1): one characteristic
// to write and one that notifies. The characteristics are picked by their
// properties, so a board that numbers them differently still works.
// Not yet tested on a real mBot2 or Codey Rocky.
export const BLE_SERVICES = [0xFFE1, 0xFFE0];
export const BLE_NAME_PREFIXES = ['Makeblock', 'CyberPi', 'Codey', 'mBot'];
const BLE_CHUNK = 20;

const pickCharacteristics = async service => {
    const all = await service.getCharacteristics();
    const tx = all.find(c => c.properties && (c.properties.writeWithoutResponse || c.properties.write));
    const rx = all.find(c => c.properties && (c.properties.notify || c.properties.indicate));
    if (!tx || !rx) throw new Error(tr('The robot does not offer the Makeblock Bluetooth service.', 'El robot no ofrece el servicio Bluetooth de Makeblock.', 'El robot no ofereix el servei Bluetooth de Makeblock.'));
    return {tx, rx};
};

// Wraps a Bluetooth device in the same shape as a Web Serial port
// (open, readable, writable, close), so the transport does not change.
export class BluetoothSerialPort {
    constructor (device) {
        this.device = device;
        this.readable = null;
        this.writable = null;
    }

    async open () {
        const device = this.device;
        if (!device.gatt) throw new Error(tr('This Bluetooth device does not accept connections.', 'Este dispositivo Bluetooth no admite conexión.', 'Aquest dispositiu Bluetooth no admet connexió.'));
        const server = await device.gatt.connect();
        let service = null;
        for (const uuid of BLE_SERVICES) {
            try {
                service = await server.getPrimaryService(uuid);
                break;
            } catch (error) {
                // try the next one
            }
        }
        if (!service) {
            device.gatt.disconnect();
            throw new Error(tr('The robot does not offer the Makeblock Bluetooth service.', 'El robot no ofrece el servicio Bluetooth de Makeblock.', 'El robot no ofereix el servei Bluetooth de Makeblock.'));
        }
        const {tx, rx} = await pickCharacteristics(service);
        this.tx = tx;
        this.rx = rx;
        let output = null;
        const finish = () => {
            if (!output) return;
            try {
                output.close();
            } catch (error) {
                // already closed
            }
            output = null;
        };
        this.onValue = event => {
            const view = event.target.value;
            if (output) output.enqueue(new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice());
        };
        this.onGone = finish;
        this.readable = new ReadableStream({
            start: controller => {
                output = controller;
            },
            cancel: finish
        });
        rx.addEventListener('characteristicvaluechanged', this.onValue);
        device.addEventListener('gattserverdisconnected', this.onGone);
        await rx.startNotifications();
        const write = tx.properties.writeWithoutResponse && tx.writeValueWithoutResponse ?
            chunk => tx.writeValueWithoutResponse(chunk) :
            chunk => (tx.writeValueWithResponse ? tx.writeValueWithResponse(chunk) : tx.writeValue(chunk));
        this.writable = new WritableStream({
            write: async data => {
                const bytes = Uint8Array.from(data);
                for (let start = 0; start < bytes.length; start += BLE_CHUNK) {
                    await write(bytes.slice(start, start + BLE_CHUNK));
                }
            }
        });
    }

    async close () {
        const device = this.device;
        if (this.rx) {
            this.rx.removeEventListener('characteristicvaluechanged', this.onValue);
            await this.rx.stopNotifications().catch(() => {});
        }
        if (this.onGone) {
            device.removeEventListener('gattserverdisconnected', this.onGone);
            this.onGone();
        }
        if (device.gatt && device.gatt.connected) device.gatt.disconnect();
        this.readable = null;
        this.writable = null;
    }
}

const requestPort = async kind => {
    if (kind === 'bluetooth') {
        if (typeof navigator === 'undefined' || !navigator.bluetooth) {
            throw new Error(tr('Web Bluetooth is not available. Use Chrome or Edge on HTTPS and turn on Bluetooth.', 'Web Bluetooth no está disponible. Usa Chrome o Edge en HTTPS y activa el Bluetooth.', 'Web Bluetooth no està disponible. Fes servir Chrome o Edge en HTTPS i activa el Bluetooth.'));
        }
        const device = await navigator.bluetooth.requestDevice({
            filters: [
                ...BLE_SERVICES.map(service => ({services: [service]})),
                ...BLE_NAME_PREFIXES.map(namePrefix => ({namePrefix}))
            ],
            optionalServices: BLE_SERVICES
        });
        return new BluetoothSerialPort(device);
    }
    if (typeof navigator === 'undefined' || !navigator.serial) {
        throw new Error(tr('Web Serial is not available. Use Chrome or Edge on HTTPS or localhost.', 'Web Serial no está disponible. Usa Chrome o Edge en HTTPS o localhost.', 'Web Serial no està disponible. Fes servir Chrome o Edge en HTTPS o localhost.'));
    }
    return navigator.serial.requestPort();
};

export class MakeblockF3Transport {
    constructor (label, {
        probe = '',
        stop = '',
        baudRate = 115200,
        timeout = 3000,
        connectTimeout = 6000,
        probeInterval = 400
    } = {}) {
        this.label = label;
        this.probe = probe;
        this.stopCode = stop;
        this.baudRate = baudRate;
        this.timeout = timeout;
        this.connectTimeout = connectTimeout;
        this.probeInterval = probeInterval;
        this.port = null;
        this.reader = null;
        this.ready = false;
        this.epoch = 0;
        this.idx = 0;
        this.queue = Promise.resolve();
        this.writes = Promise.resolve();
        this.pending = new Map();
        this.sleepers = new Set();
        this.parser = new FrameParser();
        this.lastError = '';
    }

    isConnected () {
        return Boolean(this.ready && this.port && this.port.writable);
    }

    nextIdx () {
        this.idx = (this.idx % 0xFFFF) + 1;
        return this.idx;
    }

    // kind: 'usb' (Web Serial, default) or 'bluetooth' (Web Bluetooth).
    async connect (kind = 'usb') {
        if (this.isConnected()) return;
        if (this.connecting || this.closing) throw new Error(tr('Connection busy.', 'Conexión ocupada.', 'Connexió ocupada.'));
        this.connecting = true;
        const epoch = this.epoch;
        const bluetooth = kind === 'bluetooth';
        this.kind = bluetooth ? 'bluetooth' : 'usb';
        try {
            const selected = await requestPort(this.kind);
            if (epoch !== this.epoch) throw cancelled();
            this.port = selected;
            await selected.open({baudRate: this.baudRate});
            if (!selected.readable || !selected.writable) {
                throw new Error(bluetooth ? tr('Bluetooth connection not available.', 'Conexión Bluetooth no disponible.', 'Connexió Bluetooth no disponible.') : tr('USB port not available.', 'Puerto USB no disponible.', 'Port USB no disponible.'));
            }
            this.parser = new FrameParser();
            this.reader = selected.readable.getReader();
            this.readTask = this.readLoop(this.reader);
            // Ask for live mode, then ping until the firmware answers a script frame.
            await this.write(modeFrame(MODE_LIVE));
            await this.waitForFirmware(epoch);
            if (this.stopCode) await this.send(this.stopCode, {reply: false});
            this.ready = true;
            this.lastError = '';
        } catch (error) {
            let reason = error.message;
            if (isTimeout(error)) {
                reason = bluetooth ?
                    tr('The robot does not answer by Bluetooth. Check that it is on and close, and that mBlock ' +
                        'is not connected to it.',
                    'El robot no responde por Bluetooth. Comprueba que está encendido y cerca, y que mBlock ' +
                        'no está conectado a él.',
                    'El robot no respon per Bluetooth. Comprova que està encès i a prop, i que mBlock ' +
                        'no hi està connectat.') :
                    tr('The robot does not answer. Check that it is on, that the USB cable carries data ' +
                        'and that mBlock or another tab is not using the port.',
                    'El robot no responde. Comprueba que está encendido, que el cable USB transmite datos ' +
                        'y que mBlock u otra pestaña no está usando el puerto.',
                    'El robot no respon. Comprova que està encès, que el cable USB transmet dades ' +
                        'i que mBlock o una altra pestanya no està fent servir el port.');
            }
            this.lastError = `${this.label}: ${reason}`;
            await this.closePort();
            throw new Error(this.lastError);
        } finally {
            this.connecting = false;
        }
    }

    async waitForFirmware (epoch) {
        const deadline = Date.now() + this.connectTimeout;
        let lastError = timeoutError(tr('The robot did not answer in time.', 'El robot no respondió a tiempo.', 'El robot no ha respost a temps.'));
        while (Date.now() < deadline) {
            if (epoch !== this.epoch) throw cancelled();
            try {
                await this.send(this.probe || '1', {timeout: this.probeInterval});
                return;
            } catch (error) {
                if (!isTimeout(error)) throw error;
                lastError = error;
            }
        }
        throw lastError;
    }

    async readLoop (reader) {
        try {
            while (this.reader === reader) {
                const {value, done} = await reader.read();
                if (done) break;
                for (const payload of this.parser.push(value)) this.handlePayload(payload);
            }
            if (!this.closing) {
                throw new Error(this.kind === 'bluetooth' ?
                    tr('The robot has disconnected from Bluetooth.', 'El robot se ha desconectado del Bluetooth.', 'El robot s’ha desconnectat del Bluetooth.') :
                    tr('The USB device has been disconnected.', 'El dispositivo USB se ha desconectado.', 'El dispositiu USB s’ha desconnectat.'));
            }
        } catch (error) {
            if (!this.closing) {
                this.lastError = error.message;
                Promise.resolve().then(() => this.closePort())
                    .catch(() => {});
            }
        } finally {
            reader.releaseLock();
        }
    }

    handlePayload (payload) {
        const reply = decodeScriptReply(payload);
        if (!reply) return;
        const waiter = this.pending.get(reply.idx);
        if (waiter) waiter.resolve(reply.text);
    }

    write (bytes) {
        const operation = this.writes.then(async () => {
            if (!this.port || !this.port.writable) throw new Error(tr('Connect the device first.', 'Conecta el dispositivo primero.', 'Connecta el dispositiu primer.'));
            const writer = this.port.writable.getWriter();
            let timer;
            try {
                await Promise.race([
                    writer.write(bytes),
                    new Promise((resolve, reject) => {
                        timer = setTimeout(() => {
                            writer.abort().catch(() => {});
                            reject(new Error(tr('Sending to the robot did not finish in time.', 'El envío al robot no respondió a tiempo.', 'L’enviament al robot no ha respost a temps.')));
                        }, Math.max(this.timeout, 1000));
                    })
                ]);
            } finally {
                clearTimeout(timer);
                writer.releaseLock();
            }
        });
        this.writes = operation.catch(() => {});
        return operation;
    }

    // Sends one script frame. With reply, resolves with the robot's raw answer text.
    async send (script, {reply = true, timeout = this.timeout} = {}) {
        const idx = this.nextIdx();
        if (!reply) {
            await this.write(scriptFrame(script, idx, false));
            return '';
        }
        let timer;
        const answer = new Promise((resolve, reject) => {
            const finish = (error, text) => {
                clearTimeout(timer);
                this.pending.delete(idx);
                if (error) reject(error);
                else resolve(text);
            };
            this.pending.set(idx, {resolve: text => finish(null, text), reject: error => finish(error)});
            timer = setTimeout(() => finish(timeoutError(tr('The robot did not answer in time.', 'El robot no respondió a tiempo.', 'El robot no ha respost a temps.'))), timeout);
        });
        try {
            await this.write(scriptFrame(script, idx, true));
        } catch (error) {
            const waiter = this.pending.get(idx);
            if (waiter) waiter.reject(error);
        }
        return answer;
    }

    // Runs one block's script in order with the other blocks and returns its value.
    run (script, {timeout = this.timeout} = {}) {
        if (!this.isConnected()) {
            return Promise.reject(new Error(tr('Connect the device with its connect button before running blocks.', 'Conecta explícitamente el dispositivo antes de ejecutar bloques.', 'Connecta explícitament el dispositiu abans d’executar blocs.')));
        }
        const epoch = this.epoch;
        const operation = this.queue.then(async () => {
            if (epoch !== this.epoch) throw cancelled();
            try {
                return parseReturnValue(await this.send(script, {timeout}));
            } catch (error) {
                if (epoch === this.epoch) this.lastError = error.message;
                throw error;
            }
        });
        this.queue = operation.catch(() => {});
        return operation;
    }

    // Waits on the computer side; a stop or disconnect ends the wait early.
    wait (ms) {
        const epoch = this.epoch;
        return new Promise((resolve, reject) => {
            const sleeper = {
                cancel: () => {
                    clearTimeout(sleeper.timer);
                    this.sleepers.delete(sleeper);
                    reject(cancelled());
                }
            };
            sleeper.timer = setTimeout(() => {
                this.sleepers.delete(sleeper);
                if (epoch === this.epoch) resolve();
                else reject(cancelled());
            }, Math.max(0, ms));
            this.sleepers.add(sleeper);
        });
    }

    cancelAll () {
        this.epoch++;
        for (const waiter of [...this.pending.values()]) waiter.reject(cancelled());
        for (const sleeper of [...this.sleepers]) sleeper.cancel();
    }

    emergencyStop () {
        this.cancelAll();
        if (!this.port || this.connecting || this.closing || !this.stopCode) return Promise.resolve();
        // Bypass the block queue: the stop frame goes out right away.
        return this.send(this.stopCode, {reply: false}).catch(error => {
            this.lastError = error.message;
            throw error;
        });
    }

    async disconnect () {
        try {
            await this.emergencyStop();
        } finally {
            await this.closePort();
        }
    }

    async closePort () {
        if (this.closing) return this.closing;
        this.ready = false;
        this.cancelAll();
        const port = this.port;
        const reader = this.reader;
        this.port = null;
        this.reader = null;
        this.closing = Promise.resolve().then(async () => {
            if (reader) await reader.cancel().catch(() => {});
            if (this.readTask) await this.readTask;
            if (port) await port.close().catch(() => {});
        });
        try {
            await this.closing;
        } finally {
            this.closing = null;
        }
    }
}
