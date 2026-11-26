// Line-based link to a micro:bit running the Unifiscratch firmware.
// Bluetooth (Web Bluetooth, UART service) is the preferred path; USB (Web
// Serial) speaks exactly the same text protocol. The firmware answers "?"
// with its version and streams "D ..." sensor lines while it hears from us.

export const UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
// The micro:bit names them from its own side: it indicates on 0002 and
// receives on 0003. Roles are taken from the characteristic properties.
export const UART_CHAR_A = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
export const UART_CHAR_B = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
export const MICROBIT_USB_VENDOR = 0x0d28;
const BLE_CHUNK = 20;
const KEEPALIVE_MS = 500;

const cancelled = () => new Error('Operación cancelada por la parada del dispositivo.');

export class MicrobitUartTransport {
    constructor (label, {
        hello = '?', expect = 'CB', stop = 'S', timeout = 3000, onLine = null,
        noReply = 'La micro:bit no responde: carga el firmware de Unifiscratch para Cutebot (ver la guía).',
        notConnected = 'Conecta el Cutebot (Bluetooth o USB) antes de usar los bloques.'
    } = {}) {
        this.label = label;
        this.noReply = noReply;
        this.notConnected = notConnected;
        this.hello = hello;
        this.expect = expect;
        this.stopLine = stop;
        this.timeout = timeout;
        this.onLine = onLine;
        this.kind = null; // 'ble' | 'usb'
        this.ready = false;
        this.epoch = 0;
        this.queue = Promise.resolve();
        this.buffer = '';
        this.waiters = new Set();
        this.lastError = '';
        this.version = '';
        this.onBleDisconnected = () => this.lost('Se ha perdido la conexión Bluetooth con la micro:bit.');
    }

    isConnected () {
        if (!this.ready) return false;
        if (this.kind === 'ble') return Boolean(this.device && this.device.gatt && this.device.gatt.connected);
        return Boolean(this.port && this.port.writable);
    }

    connectBluetooth () {
        if (typeof navigator === 'undefined' || !navigator.bluetooth) {
            return Promise.reject(new Error('Web Bluetooth no está disponible. Usa Chrome o Edge en HTTPS o localhost.'));
        }
        return this.open('ble', async () => {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{namePrefix: 'BBC micro:bit'}],
                optionalServices: [UART_SERVICE]
            });
            this.device = device;
            device.addEventListener('gattserverdisconnected', this.onBleDisconnected);
            const server = await device.gatt.connect();
            let service;
            try {
                service = await server.getPrimaryService(UART_SERVICE);
            } catch (error) {
                throw new Error('La micro:bit no ofrece el servicio UART: carga el firmware de Unifiscratch.');
            }
            const chars = [await service.getCharacteristic(UART_CHAR_A), await service.getCharacteristic(UART_CHAR_B)];
            const props = c => c.properties || {};
            this.rx = chars.find(c => props(c).notify || props(c).indicate) || chars[0];
            this.tx = chars.find(c => c !== this.rx);
            const decoder = new TextDecoder();
            this.rx.addEventListener('characteristicvaluechanged', event => {
                const view = event.target.value;
                this.receive(decoder.decode(new Uint8Array(view.buffer, view.byteOffset, view.byteLength)));
            });
            await this.rx.startNotifications();
        });
    }

    connectUsb () {
        if (typeof navigator === 'undefined' || !navigator.serial) {
            return Promise.reject(new Error('Web Serial no está disponible. Usa Chrome o Edge en HTTPS o localhost.'));
        }
        return this.open('usb', async () => {
            const port = await navigator.serial.requestPort({filters: [{usbVendorId: MICROBIT_USB_VENDOR}]});
            await port.open({baudRate: 115200});
            this.port = port;
            if (!port.readable || !port.writable) throw new Error('Puerto USB no disponible.');
            this.reader = port.readable.getReader();
            this.readTask = this.readLoop(this.reader);
        });
    }

    async open (kind, setup) {
        if (this.isConnected()) {
            if (this.kind === kind) return;
            await this.disconnect();
        }
        if (this.connecting) throw new Error('Conexión ocupada.');
        this.connecting = true;
        this.epoch++;
        this.kind = kind;
        this.buffer = '';
        try {
            await setup();
            this.ready = true;
            const reply = await this.request(this.hello, line => line.startsWith(this.expect));
            this.version = reply;
            await this.sendNow(this.stopLine);
            this.keepalive = setInterval(() => {
                if (this.isConnected()) this.send('K').catch(() => {});
            }, KEEPALIVE_MS);
            if (this.keepalive.unref) this.keepalive.unref();
            this.lastError = '';
        } catch (error) {
            const message = /no respondió/.test(error.message) ? this.noReply : error.message;
            this.lastError = `${this.label}: ${message}`;
            await this.close();
            throw new Error(this.lastError);
        } finally {
            this.connecting = false;
        }
    }

    async readLoop (reader) {
        const decoder = new TextDecoder();
        try {
            while (this.reader === reader) {
                const {value, done} = await reader.read();
                if (done) break;
                this.receive(decoder.decode(value, {stream: true}));
            }
            if (this.reader === reader) this.lost('El cable USB de la micro:bit se ha desconectado.');
        } catch (error) {
            if (this.reader === reader) this.lost(`USB: ${error.message}`);
        } finally {
            reader.releaseLock();
        }
    }

    receive (text) {
        this.buffer += text;
        if (this.buffer.length > 4096) this.buffer = this.buffer.slice(-1024);
        let index;
        while ((index = this.buffer.indexOf('\n')) >= 0) { // eslint-disable-line no-cond-assign
            const line = this.buffer.slice(0, index).replace(/\r$/, '')
                .trim();
            this.buffer = this.buffer.slice(index + 1);
            if (!line) continue;
            this.waiters.forEach(waiter => waiter.check(line));
            if (this.onLine) this.onLine(line);
        }
    }

    // Sends a line and waits for the first reply that matches.
    request (line, match) {
        return new Promise((resolve, reject) => {
            const waiter = {};
            const finish = (error, reply) => {
                clearTimeout(waiter.timer);
                this.waiters.delete(waiter);
                if (error) reject(error);
                else resolve(reply);
            };
            waiter.check = reply => {
                if (match(reply)) finish(null, reply);
            };
            waiter.reject = error => finish(error);
            waiter.timer = setTimeout(() => finish(new Error('El firmware no respondió a tiempo.')), this.timeout);
            this.waiters.add(waiter);
            this.sendNow(line).catch(error => finish(error));
        });
    }

    send (line) {
        if (!this.isConnected()) {
            return Promise.reject(new Error(this.notConnected));
        }
        return this.sendNow(line);
    }

    // Serialised writes: Web Bluetooth rejects overlapping GATT operations.
    sendNow (line) {
        const data = new TextEncoder().encode(`${line}\n`);
        const operation = this.queue.then(() => this.writeBytes(data));
        this.queue = operation.catch(() => {});
        return operation;
    }

    async writeBytes (data) {
        if (this.kind === 'ble') {
            if (!this.tx) throw new Error('La micro:bit no está conectada.');
            for (let i = 0; i < data.length; i += BLE_CHUNK) {
                const chunk = data.slice(i, i + BLE_CHUNK);
                const props = this.tx.properties || {};
                if (props.write === false && this.tx.writeValueWithoutResponse) {
                    await this.tx.writeValueWithoutResponse(chunk);
                } else if (this.tx.writeValueWithResponse) {
                    await this.tx.writeValueWithResponse(chunk);
                } else {
                    await this.tx.writeValue(chunk);
                }
            }
            return;
        }
        if (!this.port || !this.port.writable) throw new Error('La micro:bit no está conectada.');
        const writer = this.port.writable.getWriter();
        try {
            await writer.write(data);
        } finally {
            writer.releaseLock();
        }
    }

    // Waits for a timed action; a stop or a lost link ends it early.
    wait (seconds, epoch = this.epoch) {
        if (epoch !== this.epoch) return Promise.reject(cancelled());
        return new Promise((resolve, reject) => {
            const waiter = {check: () => {}};
            const finish = error => {
                clearTimeout(waiter.timer);
                this.waiters.delete(waiter);
                if (error || epoch !== this.epoch) reject(error || cancelled());
                else resolve();
            };
            waiter.reject = error => finish(error);
            waiter.timer = setTimeout(() => finish(null), seconds * 1000);
            this.waiters.add(waiter);
        });
    }

    rejectWaiters (error) {
        Array.from(this.waiters).forEach(waiter => waiter.reject(error));
    }

    lost (message) {
        if (!this.ready) return;
        this.ready = false;
        this.epoch++;
        this.lastError = message;
        this.rejectWaiters(new Error(message));
        this.close().catch(() => {});
    }

    emergencyStop () {
        this.epoch++;
        this.rejectWaiters(cancelled());
        if (!this.isConnected()) return Promise.resolve();
        return this.sendNow(this.stopLine).catch(error => {
            this.lastError = error.message;
        });
    }

    async disconnect () {
        try {
            await this.emergencyStop();
        } finally {
            await this.close();
        }
    }

    async close () {
        this.ready = false;
        clearInterval(this.keepalive);
        this.keepalive = null;
        const {device, port, reader} = this;
        this.device = null;
        this.port = null;
        this.reader = null;
        this.tx = null;
        this.rx = null;
        if (device) {
            device.removeEventListener('gattserverdisconnected', this.onBleDisconnected);
            if (device.gatt && device.gatt.connected) device.gatt.disconnect();
        }
        if (reader) await reader.cancel().catch(() => {});
        if (this.readTask) await this.readTask.catch(() => {});
        this.readTask = null;
        if (port) await port.close().catch(() => {});
    }
}
