/* eslint-disable max-len */
import {tr, textOf} from './runtime-texts.mjs';
// Link to a LEGO hub running the Pybricks firmware, over Web Bluetooth.
//
// Written for Unifiscratch from the public description of the Pybricks BLE
// profile (pybricks/technical-info, "pybricks-ble-profile.md"). Commands and
// events travel on one characteristic: the first byte is the type.
//
// We do not download a compiled program. We start the hub's MicroPython REPL
// and type one short line per block into its stdin. Each line answers with
// "@V <id> <value>" or "@E <id> <error>", so the host waits for one answer
// before the next line: that is the flow control for the hub's small stdin
// buffer. Long actions (motors) are started without waiting on the hub and
// polled from here, so sensors stay readable while a motor turns.

export const PYBRICKS_SERVICE = 'c5f50001-8280-46da-89f4-6d8051e4aeef';
export const PYBRICKS_COMMAND_EVENT = 'c5f50002-8280-46da-89f4-6d8051e4aeef';
export const PYBRICKS_HUB_CAPABILITIES = 'c5f50003-8280-46da-89f4-6d8051e4aeef';

export const COMMAND = {STOP_USER_PROGRAM: 0, START_REPL: 2, WRITE_STDIN: 6};
export const EVENT = {STATUS_REPORT: 0, WRITE_STDOUT: 1};
export const STATUS_USER_PROGRAM_RUNNING = 6;
const FEATURE_REPL = 1;
const DEFAULT_MAX_WRITE = 20;

const cancelled = () => new Error(tr('Operation cancelled because the device was stopped.', 'Operación cancelada por la parada del dispositivo.', 'Operació cancel·lada per l’aturada del dispositiu.'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Python string literal: ASCII only, so the REPL never sees a split UTF-8 character.
export const pyString = value => JSON.stringify(String(value))
    .replace(/[\u007f-￿]/g, ch => `\\u${ch.charCodeAt(0).toString(16)
        .padStart(4, '0')}`);

// Values printed by the REPL: True/False, numbers, tuples or plain text.
export const parseValue = text => {
    if (text === 'True') return true;
    if (text === 'False') return false;
    if (text === 'None') return null;
    if (/^-?\d+(\.\d+)?(e-?\d+)?$/i.test(text)) return Number(text);
    return text;
};

export class PybricksTransport {
    constructor (label, {setup = [], timeout = 3000, notConnected = () => tr('Connect the hub before using the blocks.', 'Conecta el hub antes de usar los bloques.', 'Connecta el hub abans de fer servir els blocs.')} = {}) {
        this.label = label;
        this.setup = setup; // Python lines that prepare the REPL, run in order.
        this.timeout = timeout;
        this.notConnected = notConnected;
        this.device = null;
        this.char = null;
        this.maxWrite = DEFAULT_MAX_WRITE;
        this.ready = false; // Bluetooth link and REPL helpers ready.
        this.replReady = false;
        this.running = null; // user program flag from the last status report
        this.epoch = 0;
        this.nextId = 1;
        this.pending = new Map(); // id -> {resolve, reject, timer}
        this.inflight = new Map(); // python expression -> promise (reporters)
        this.queue = Promise.resolve(); // one REPL line at a time
        this.gattQueue = Promise.resolve(); // one GATT write at a time
        this.stdout = '';
        this.lineWaiters = new Set();
        this.lastError = '';
        this.onBleDisconnected = () => this.lost(tr('The Bluetooth connection with the hub was lost.', 'Se ha perdido la conexión Bluetooth con el hub.', 'S’ha perdut la connexió Bluetooth amb el hub.'));
    }

    isConnected () {
        return Boolean(this.ready && this.device && this.device.gatt && this.device.gatt.connected);
    }

    async connect () {
        if (this.isConnected()) return;
        if (typeof navigator === 'undefined' || !navigator.bluetooth) {
            throw new Error(tr('Web Bluetooth is not available. Use Chrome or Edge on HTTPS or localhost.', 'Web Bluetooth no está disponible. Usa Chrome o Edge en HTTPS o localhost.', 'Web Bluetooth no està disponible. Fes servir Chrome o Edge en HTTPS o localhost.'));
        }
        if (this.connecting) throw new Error(tr('Connection busy.', 'Conexión ocupada.', 'Connexió ocupada.'));
        this.connecting = true;
        this.epoch++;
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{services: [PYBRICKS_SERVICE]}],
                optionalServices: [PYBRICKS_SERVICE]
            });
            this.device = device;
            device.addEventListener('gattserverdisconnected', this.onBleDisconnected);
            const server = await device.gatt.connect();
            let service;
            try {
                service = await server.getPrimaryService(PYBRICKS_SERVICE);
            } catch (error) {
                throw new Error(tr('The hub does not have the Pybricks firmware (see the guide).', 'El hub no tiene el firmware Pybricks (ver la guía).', 'El hub no té el firmware Pybricks (mira la guia).'));
            }
            this.char = await service.getCharacteristic(PYBRICKS_COMMAND_EVENT);
            await this.readCapabilities(service);
            this.char.addEventListener('characteristicvaluechanged', event => this.onEvent(event.target.value));
            await this.char.startNotifications();
            this.ready = true;
            await this.startRepl();
            this.lastError = '';
        } catch (error) {
            this.lastError = `${this.label}: ${error.message}`;
            await this.close();
            throw new Error(this.lastError);
        } finally {
            this.connecting = false;
        }
    }

    async readCapabilities (service) {
        let view;
        try {
            const caps = await service.getCharacteristic(PYBRICKS_HUB_CAPABILITIES);
            view = await caps.readValue();
        } catch (error) {
            return; // Older firmware: keep the safe 20-byte writes.
        }
        if (!view || view.byteLength < 6) return;
        this.maxWrite = Math.max(DEFAULT_MAX_WRITE, view.getUint16(0, true));
        const features = view.getUint32(2, true);
        if (!(features & FEATURE_REPL)) {
            throw new Error(tr('This Pybricks firmware does not include the console (REPL) that Unifiscratch uses.', 'Este firmware Pybricks no incluye la consola (REPL) que usa Unifiscratch.', 'Aquest firmware Pybricks no inclou la consola (REPL) que fa servir Unifiscratch.'));
        }
    }

    onEvent (view) {
        if (!view || view.byteLength < 1) return;
        const type = view.getUint8(0);
        if (type === EVENT.STATUS_REPORT && view.byteLength >= 5) {
            const flags = view.getUint32(1, true);
            const running = Boolean(flags & (1 << STATUS_USER_PROGRAM_RUNNING));
            const wasRunning = this.running;
            this.running = running;
            if (this.statusWaiters) this.statusWaiters.forEach(check => check());
            if (wasRunning && !running && this.replReady) {
                // The stop button, a power-off request or a fatal error ended the REPL.
                this.replReady = false;
                this.rejectPending(new Error(tr('The hub program has stopped; the next block restarts it.', 'El programa del hub se ha detenido; el siguiente bloque lo reinicia.', 'El programa del hub s’ha aturat; el bloc següent el reinicia.')));
            }
            return;
        }
        if (type === EVENT.WRITE_STDOUT) {
            const bytes = new Uint8Array(view.buffer, view.byteOffset + 1, view.byteLength - 1);
            this.receive(new TextDecoder().decode(bytes));
        }
    }

    receive (text) {
        this.stdout += text;
        if (this.stdout.length > 8192) this.stdout = this.stdout.slice(-2048);
        let index;
        while ((index = this.stdout.indexOf('\n')) >= 0) { // eslint-disable-line no-cond-assign
            const line = this.stdout.slice(0, index).replace(/\r$/, '');
            this.stdout = this.stdout.slice(index + 1);
            this.onLine(line);
        }
        // The prompt has no newline after it.
        if (this.stdout.endsWith('>>> ')) this.lineWaiters.forEach(check => check('>>> '));
    }

    onLine (line) {
        this.lineWaiters.forEach(check => check(line));
        const match = /^@([VE]) (\d+) ?(.*)$/.exec(line);
        if (!match) return;
        const entry = this.pending.get(Number(match[2]));
        if (!entry) return;
        this.pending.delete(Number(match[2]));
        clearTimeout(entry.timer);
        if (match[1] === 'V') entry.resolve(parseValue(match[3]));
        else entry.reject(new Error(`${tr('Error on the hub', 'Error en el hub', 'Error al hub')}: ${match[3]}`));
    }

    waitFor (test, ms) {
        return new Promise((resolve, reject) => {
            const check = line => {
                if (!test(line)) return;
                clearTimeout(timer); // eslint-disable-line no-use-before-define
                this.lineWaiters.delete(check);
                resolve(line);
            };
            const timer = setTimeout(() => {
                this.lineWaiters.delete(check);
                reject(new Error(tr('The hub did not answer in time.', 'El hub no respondió a tiempo.', 'El hub no ha respost a temps.')));
            }, ms);
            this.lineWaiters.add(check);
        });
    }

    waitStatus (test, ms) {
        if (test()) return Promise.resolve(true);
        this.statusWaiters = this.statusWaiters || new Set();
        return new Promise(resolve => {
            const check = () => {
                if (!test()) return;
                clearTimeout(timer); // eslint-disable-line no-use-before-define
                this.statusWaiters.delete(check);
                resolve(true);
            };
            const timer = setTimeout(() => {
                this.statusWaiters.delete(check);
                resolve(false);
            }, ms);
            this.statusWaiters.add(check);
        });
    }

    // Serialised GATT writes, always with response (the profile requires it).
    writeCommand (bytes) {
        const operation = this.gattQueue.then(() => {
            if (!this.char) throw new Error(textOf(this.notConnected));
            const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
            if (this.char.writeValueWithResponse) return this.char.writeValueWithResponse(data);
            return this.char.writeValue(data);
        });
        this.gattQueue = operation.catch(() => {});
        return operation;
    }

    async writeStdin (text) {
        const data = new TextEncoder().encode(text);
        const size = this.maxWrite - 1;
        for (let i = 0; i < data.length; i += size) {
            const chunk = new Uint8Array(Math.min(size, data.length - i) + 1);
            chunk[0] = COMMAND.WRITE_STDIN;
            chunk.set(data.subarray(i, i + size), 1);
            await this.writeCommand(chunk);
        }
    }

    // Stops any running program, starts the REPL and loads the helpers.
    async startRepl () {
        this.replReady = false;
        if (this.running !== false) {
            await this.writeCommand([COMMAND.STOP_USER_PROGRAM]).catch(() => {});
            await this.waitStatus(() => this.running === false, 1500);
        }
        const prompt = this.waitFor(line => line === '>>> ', 4000).catch(() => null);
        let started = false;
        for (let attempt = 0; attempt < 3 && !started; attempt++) {
            try {
                await this.writeCommand([COMMAND.START_REPL]);
                started = true;
            } catch (error) {
                // BUSY while the previous program is still closing.
                await sleep(400);
            }
        }
        if (!started) throw new Error(tr('The hub is busy and does not open the Pybricks console.', 'El hub está ocupado y no abre la consola de Pybricks.', 'El hub està ocupat i no obre la consola de Pybricks.'));
        await prompt;
        for (const line of this.setup) {
            await this.exchange(line, 5000, true);
        }
        this.replReady = true;
    }

    // Types one line and waits for its "@V/@E <id>" answer. `code` is an
    // expression evaluated on the hub, unless `raw` gives a whole statement.
    exchange (code, timeout = this.timeout, raw = false) {
        const id = this.nextId++;
        if (this.nextId > 1e9) this.nextId = 1;
        const line = raw ? code.replace(/\{id\}/g, id) : `_r(${id},lambda:${code})`;
        const answer = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pending.delete(id);
                reject(new Error(tr('The hub did not answer in time: does it have the Pybricks firmware?', 'El hub no respondió a tiempo: ¿tiene el firmware Pybricks?', 'El hub no ha respost a temps: té el firmware Pybricks?')));
            }, timeout);
            this.pending.set(id, {resolve, reject, timer});
        });
        this.writeStdin(`${line}\r`).catch(error => {
            const entry = this.pending.get(id);
            if (!entry) return;
            this.pending.delete(id);
            clearTimeout(entry.timer);
            entry.reject(error);
        });
        return answer;
    }

    // Runs `code` on the hub after the previous lines, restarting the REPL if needed.
    run (code, timeout = this.timeout) {
        if (!this.isConnected()) return Promise.reject(new Error(textOf(this.notConnected)));
        const epoch = this.epoch;
        const operation = this.queue.then(async () => {
            if (epoch !== this.epoch) throw cancelled();
            if (!this.replReady) await this.startRepl();
            return this.exchange(code, timeout);
        });
        this.queue = operation.catch(() => {});
        return operation;
    }

    // Reporters: identical reads already on their way share the answer.
    query (code) {
        if (this.inflight.has(code)) return this.inflight.get(code);
        const promise = this.run(code).finally(() => this.inflight.delete(code));
        this.inflight.set(code, promise);
        return promise;
    }

    // Waits on the host; a stop or a lost link ends it early.
    wait (ms, epoch = this.epoch) {
        if (epoch !== this.epoch) return Promise.reject(cancelled());
        return sleep(ms).then(() => {
            if (epoch !== this.epoch) throw cancelled();
        });
    }

    rejectPending (error) {
        Array.from(this.pending.values()).forEach(entry => {
            clearTimeout(entry.timer);
            entry.reject(error);
        });
        this.pending.clear();
        this.inflight.clear();
    }

    lost (message) {
        if (!this.ready) return;
        this.ready = false;
        this.replReady = false;
        this.epoch++;
        this.lastError = message;
        this.rejectPending(new Error(message));
        this.close().catch(() => {});
    }

    // Ctrl-C interrupts a line that is still running (a scrolling text, a
    // beep); then every motor the helpers created is stopped.
    emergencyStop () {
        this.epoch++;
        this.rejectPending(cancelled());
        this.queue = Promise.resolve();
        if (!this.isConnected() || !this.replReady) return Promise.resolve();
        return this.writeStdin('\x03')
            .then(() => this.exchange('_s()'))
            .catch(error => {
                this.lastError = error.message;
            });
    }

    async disconnect () {
        try {
            await this.emergencyStop();
            // Ending the REPL program also releases the motors on the hub.
            if (this.char) await this.writeCommand([COMMAND.STOP_USER_PROGRAM]).catch(() => {});
        } finally {
            await this.close();
        }
    }

    close () {
        this.ready = false;
        this.replReady = false;
        this.running = null;
        this.rejectPending(new Error(textOf(this.notConnected)));
        const device = this.device;
        this.device = null;
        this.char = null;
        this.stdout = '';
        if (device) {
            device.removeEventListener('gattserverdisconnected', this.onBleDisconnected);
            if (device.gatt && device.gatt.connected) device.gatt.disconnect();
        }
        return Promise.resolve();
    }
}
