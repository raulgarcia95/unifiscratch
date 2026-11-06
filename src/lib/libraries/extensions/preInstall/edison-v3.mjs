/* eslint-disable max-len */
// Edison V3 (Microbric) over WebUSB.
//
// Edison V3 runs programs compiled by Microbric's EdPy/EdScratch servers, so
// Unifiscratch cannot build them itself. Instead the robot runs a small EdPy
// "bridge" (static/extensions/edison/unfyscratch-puente-edison-v3.py), loaded
// once with the official app https://www.edpyapp.com/v3/. The bridge reads
// numbers sent over USB with Ed.ReadUSB() and answers with Ed.WriteUSB().
//
// USB framing (vendor 0x16D0, product 0x1207, endpoint 1, 8-byte commands
// starting with 0x58) is the one used by Microbric's own web app.
//
// Order number = id * 4096 + command * 256 + value (always below 32768 so it
// fits EdPy integers). Every movement carries its own distance or angle, so
// the robot stops by itself; the red flag uses the firmware's STOP_USER_PROGRAM.
import {bindSafetyEvents, boundedNumber} from './micropython-transport.mjs';
import {makeIcon, msg} from './unifiscratch-extra-hardware.mjs';

export const EDISON_VENDOR_ID = 0x16d0;
export const EDISON_PRODUCT_ID = 0x1207;
const HEADER = 0x58;
const USB = {
    firmwareVersion: 0x10,
    runProgram: 0x15,
    stopProgram: 0x16,
    dataOut: 0x17,
    dataIn: 0x18,
    changedState: 0x19
};
const STATE_PROGRAM_COMPLETE = 3;
export const BRIDGE_ID = 3001;
export const BRIDGE_FILE = 'unfyscratch-puente-edison-v3.py';
const BRIDGE_HELP = `Carga en el Edison el programa puente ${BRIDGE_FILE} con https://www.edpyapp.com/v3/ ` +
    '(botón de programar) y vuelve a conectar. Haz clic en el bloque «cómo conectar Edison» para ver los pasos.';

// The editor shows a step-by-step window (src/components/edison-setup) on this event.
export const EDISON_HELP_EVENT = 'unifiscratch-edison-help';
export const openEdisonHelp = () => {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new Event(EDISON_HELP_EVENT));
    }
};
export const BRIDGE_PATH = `static/extensions/edison/${BRIDGE_FILE}`;

export const ORDER = {forward: 1, backward: 2, spinRight: 3, spinLeft: 4, leds: 5, beep: 6, sensor: 7, ping: 9};
export const SENSOR = {obstacle: 1, line: 2, leftLight: 3, rightLight: 4, keypad: 5, clap: 6};
const MAX_CM = 30;

export const encodeOrder = (id, command, value) => {
    if (!Number.isInteger(id) || id < 1 || id > 7) throw new Error('Identificador de orden no válido.');
    if (!Number.isInteger(command) || command < 0 || command > 15) throw new Error('Orden no válida.');
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Valor fuera de rango (0-255).');
    return (id * 4096) + (command * 256) + value;
};

const command = (code, b2 = 0, b3 = 0, b4 = 0, b5 = 0) => new Uint8Array([HEADER, code, b2, b3, b4, b5, 0, 0]);
export const dataOutPacket = value => command(USB.dataOut, value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);

const cancelled = () => new Error('Orden cancelada por la parada de Edison.');

export class EdisonLink {
    constructor (label = 'Edison V3', {timeout = 2000} = {}) {
        this.label = label;
        this.timeout = timeout;
        this.device = null;
        this.ready = false;
        this.epoch = 0;
        this.nextId = 0;
        this.queue = Promise.resolve();
        this.replyWaiters = [];
        this.ackWaiter = null;
        this.lastError = '';
    }

    isConnected () {
        return Boolean(this.ready && this.device && this.device.opened);
    }

    async connect () {
        if (this.isConnected()) return;
        if (this.connecting) throw new Error('Conexión ocupada.');
        if (typeof navigator === 'undefined' || !navigator.usb) {
            throw new Error('WebUSB no está disponible. Usa Chrome o Edge en HTTPS o localhost.');
        }
        this.connecting = true;
        try {
            const device = await navigator.usb.requestDevice({
                filters: [{vendorId: EDISON_VENDOR_ID, productId: EDISON_PRODUCT_ID}]
            });
            this.device = device;
            await device.open();
            if (!device.configuration || device.configuration.configurationValue !== 1) {
                await device.selectConfiguration(1);
            }
            await device.claimInterface(0);
            this.readLoop(device);
            const version = await this.request(command(USB.firmwareVersion));
            if (version.getUint8(2) === 0) {
                throw new Error('Edison está en modo de actualización de firmware. Actualízalo con la app oficial.');
            }
            await this.restartBridge();
            this.ready = true;
            let answer;
            try {
                answer = await this.order(ORDER.ping, 0, 3000);
            } catch (error) {
                throw new Error(`El robot no responde. ${BRIDGE_HELP}`);
            }
            if (answer !== BRIDGE_ID) throw new Error(`Programa del robot desconocido. ${BRIDGE_HELP}`);
            this.lastError = '';
        } catch (error) {
            this.lastError = `${this.label}: ${error.message}`;
            await this.close();
            throw new Error(this.lastError);
        } finally {
            this.connecting = false;
        }
    }

    // Clear the last USB value first: a restarted bridge must never replay an
    // order received before the stop.
    async restartBridge () {
        await this.request(dataOutPacket(0));
        await this.request(command(USB.runProgram));
        await new Promise(resolve => setTimeout(resolve, 300));
    }

    async readLoop (device) {
        try {
            while (this.device === device && device.opened) {
                const result = await device.transferIn(1, 64);
                if (result.status === 'ok' && result.data) this.handle(result.data);
            }
        } catch (error) {
            if (this.device === device) this.lost('Edison se ha desconectado del USB.');
        }
    }

    handle (data) {
        if (data.byteLength < 2 || data.getUint8(0) !== HEADER) return;
        const code = data.getUint8(1);
        if (code === USB.dataIn && data.byteLength >= 6) {
            const value = data.getInt32(2, true);
            if (this.ackWaiter) this.ackWaiter(value);
            return;
        }
        if (code === USB.changedState && data.byteLength >= 4) {
            // Our own stop also ends the program; only an end we did not request counts.
            const ownStop = this.stopping || Date.now() - (this.stoppedAt || 0) < 2000;
            if (data.getUint8(2) === STATE_PROGRAM_COMPLETE && this.ready && !ownStop) {
                this.ready = false;
                this.epoch++;
                this.lastError = 'El programa puente del Edison se ha detenido (botón cuadrado). Vuelve a conectar.';
                if (this.ackWaiter) this.ackWaiter(null);
            }
            return;
        }
        const index = this.replyWaiters.findIndex(waiter => waiter.code === code);
        if (index !== -1) this.replyWaiters.splice(index, 1)[0].resolve(data);
    }

    // One USB command and its 8-byte reply.
    request (packet) {
        if (!this.device || !this.device.opened) return Promise.reject(new Error('Conecta el Edison primero.'));
        return new Promise((resolve, reject) => {
            const waiter = {
                code: packet[1],
                resolve: data => {
                    clearTimeout(timer); // eslint-disable-line no-use-before-define
                    resolve(data);
                },
                reject: error => {
                    clearTimeout(timer); // eslint-disable-line no-use-before-define
                    reject(error);
                }
            };
            const timer = setTimeout(() => {
                this.replyWaiters.splice(this.replyWaiters.indexOf(waiter), 1);
                reject(new Error('Edison no respondió a tiempo.'));
            }, this.timeout);
            this.replyWaiters.push(waiter);
            this.device.transferOut(1, packet).catch(error => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    // Send one bridge order and wait until the robot reports it finished.
    order (code, value = 0, timeout = 15000) {
        // Orders issued after a stop queue behind it, with the new epoch.
        if (!this.isConnected()) {
            return Promise.reject(new Error('Conecta explícitamente el Edison antes de ejecutar bloques.'));
        }
        const epoch = this.epoch;
        const operation = this.queue.then(async () => {
            if (epoch !== this.epoch) throw cancelled();
            this.nextId = (this.nextId % 7) + 1;
            const id = this.nextId;
            const answer = new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    this.ackWaiter = null;
                    reject(new Error('Edison no confirmó la orden.'));
                }, timeout);
                this.ackWaiter = reply => {
                    if (reply === null) {
                        clearTimeout(timer);
                        this.ackWaiter = null;
                        reject(cancelled());
                    } else if (Math.floor(reply / 4096) === id) {
                        clearTimeout(timer);
                        this.ackWaiter = null;
                        resolve(reply - (id * 4096));
                    }
                };
            });
            await this.request(dataOutPacket(encodeOrder(id, code, value)));
            return answer;
        });
        this.queue = operation.catch(() => {});
        return operation;
    }

    emergencyStop () {
        if (this.stopping) return this.stopping;
        this.epoch++;
        if (this.ackWaiter) this.ackWaiter(null);
        if (!this.device || !this.device.opened || this.connecting) return Promise.resolve();
        const wasReady = this.ready;
        this.stopping = (async () => {
            try {
                // The firmware ends the program; then the bridge is re-armed with an empty order.
                this.stoppedAt = Date.now();
                await this.request(command(USB.stopProgram));
                this.stoppedAt = Date.now();
                if (wasReady) await this.restartBridge();
            } catch (error) {
                this.lastError = error.message;
                this.ready = false;
                throw error;
            }
        })().finally(() => {
            this.stopping = null;
        });
        this.queue = this.stopping.catch(() => {});
        return this.stopping;
    }

    async disconnect () {
        try {
            if (this.device && this.device.opened && !this.connecting) {
                this.epoch++;
                if (this.ackWaiter) this.ackWaiter(null);
                await this.request(command(USB.stopProgram)).catch(() => {});
            }
        } finally {
            await this.close();
        }
    }

    lost (message) {
        this.ready = false;
        this.epoch++;
        this.lastError = message;
        if (this.ackWaiter) this.ackWaiter(null);
    }

    async close () {
        this.ready = false;
        this.epoch++;
        const device = this.device;
        this.device = null;
        this.replyWaiters.splice(0).forEach(waiter => waiter.reject(new Error('Edison desconectado.')));
        if (device && device.opened) await device.close().catch(() => {});
    }
}

const id = 'edisonV3';
const name = 'Edison V3';
const icon = {title: 'EDISON', body: 'V3', kind: 'edison', color1: '#475569', color2: '#f97316', color3: '#1f2937'};
const t = (key, text) => msg(`${id}.${key}`, text);
const own = (table, key) => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null);

const blockClass = class EdisonV3 {
    constructor (runtime) {
        this.link = new EdisonLink(name);
        bindSafetyEvents(runtime, this.link);
    }

    getInfo () {
        return {
            id,
            name,
            color1: icon.color1,
            color2: icon.color2,
            color3: icon.color3,
            blocks: [
                {opcode: 'showHelp', blockType: 'command', text: t('showHelp', 'how to connect Edison (help)')},
                {opcode: 'connect', blockType: 'command', text: t('connect', 'connect Edison V3 by USB')},
                {opcode: 'disconnect', blockType: 'command', text: t('disconnect', 'disconnect Edison')},
                {opcode: 'isConnected', blockType: 'Boolean', text: t('connected', 'Edison connected?')},
                {opcode: 'connectionError', blockType: 'reporter', text: msg('connectionError', 'last connection error')},
                '---',
                {
                    opcode: 'move',
                    blockType: 'command',
                    text: t('move', 'move [DIRECTION] [DISTANCE] cm'),
                    arguments: {
                        DIRECTION: {type: 'string', menu: 'directions', defaultValue: 'forward'},
                        DISTANCE: {type: 'number', defaultValue: 10}
                    }
                },
                {
                    opcode: 'turn',
                    blockType: 'command',
                    text: t('turn', 'spin [SIDE] [DEGREES] degrees'),
                    arguments: {
                        SIDE: {type: 'string', menu: 'sides', defaultValue: 'right'},
                        DEGREES: {type: 'number', defaultValue: 90}
                    }
                },
                {opcode: 'stop', blockType: 'command', text: t('stop', 'stop Edison')},
                '---',
                {
                    opcode: 'setLeds',
                    blockType: 'command',
                    text: t('setLeds', 'LEDs left [LEFT] right [RIGHT]'),
                    arguments: {
                        LEFT: {type: 'string', menu: 'onOff', defaultValue: 'on'},
                        RIGHT: {type: 'string', menu: 'onOff', defaultValue: 'on'}
                    }
                },
                {opcode: 'beep', blockType: 'command', text: t('beep', 'beep')},
                '---',
                {
                    opcode: 'obstacle',
                    blockType: 'Boolean',
                    text: t('obstacle', 'obstacle [WHERE]?'),
                    arguments: {WHERE: {type: 'string', menu: 'obstacles', defaultValue: 'any'}}
                },
                {opcode: 'onBlack', blockType: 'Boolean', text: t('onBlack', 'line sensor on black?')},
                {
                    opcode: 'lightLevel',
                    blockType: 'reporter',
                    text: t('lightLevel', '[SIDE] light level'),
                    arguments: {SIDE: {type: 'string', menu: 'sides', defaultValue: 'left'}}
                },
                {
                    opcode: 'buttonPressed',
                    blockType: 'Boolean',
                    text: t('buttonPressed', '[BUTTON] button pressed?'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'round'}}
                },
                {opcode: 'clap', blockType: 'Boolean', text: t('clap', 'clap heard?')}
            ],
            menus: {
                directions: {acceptReporters: true,
                    items: [
                        {text: t('forward', 'forward'), value: 'forward'},
                        {text: t('backward', 'backward'), value: 'backward'}
                    ]},
                sides: {acceptReporters: true,
                    items: [
                        {text: t('left', 'left'), value: 'left'},
                        {text: t('right', 'right'), value: 'right'}
                    ]},
                onOff: {acceptReporters: true,
                    items: [
                        {text: t('on', 'on'), value: 'on'},
                        {text: t('off', 'off'), value: 'off'}
                    ]},
                obstacles: {acceptReporters: true,
                    items: [
                        {text: t('any', 'anywhere'), value: 'any'},
                        {text: t('ahead', 'ahead'), value: 'ahead'},
                        {text: t('left', 'left'), value: 'left'},
                        {text: t('right', 'right'), value: 'right'}
                    ]},
                buttons: {acceptReporters: true,
                    items: [
                        {text: t('round', 'round'), value: 'round'},
                        {text: t('triangle', 'triangle'), value: 'triangle'}
                    ]}
            }
        };
    }

    showHelp () {
        openEdisonHelp();
    }

    connect () {
        return this.link.connect();
    }

    disconnect () {
        return this.link.disconnect();
    }

    isConnected () {
        return this.link.isConnected();
    }

    connectionError () {
        return this.link.lastError;
    }

    move (args) {
        const code = own({forward: ORDER.forward, backward: ORDER.backward}, args.DIRECTION);
        if (!code) throw new Error('Dirección no válida.');
        const cm = Math.round(Math.abs(boundedNumber(args.DISTANCE, -MAX_CM, MAX_CM)));
        if (cm === 0) return Promise.resolve();
        return this.link.order(code, cm);
    }

    turn (args) {
        const code = own({right: ORDER.spinRight, left: ORDER.spinLeft}, args.SIDE);
        if (!code) throw new Error('Sentido de giro no válido.');
        // The bridge doubles the value: 0-180 covers 0-360 degrees.
        const half = Math.round(Math.abs(boundedNumber(args.DEGREES, -360, 360)) / 2);
        if (half === 0) return Promise.resolve();
        return this.link.order(code, half);
    }

    stop () {
        return this.link.emergencyStop();
    }

    setLeds (args) {
        const left = own({on: 1, off: 0}, args.LEFT);
        const right = own({on: 1, off: 0}, args.RIGHT);
        if (left === null || right === null) throw new Error('Valor de LED no válido.');
        return this.link.order(ORDER.leds, left + (right * 2));
    }

    beep () {
        return this.link.order(ORDER.beep, 0);
    }

    sensor (which) {
        return this.link.order(ORDER.sensor, which, 3000);
    }

    obstacle (args) {
        const expected = own({any: null, left: 1, right: 2, ahead: 3}, args.WHERE);
        if (expected === null && args.WHERE !== 'any') throw new Error('Opción no válida.');
        return this.sensor(SENSOR.obstacle).then(result => (args.WHERE === 'any' ? result > 0 : result === expected));
    }

    onBlack () {
        return this.sensor(SENSOR.line).then(result => result === 1);
    }

    lightLevel (args) {
        const which = own({left: SENSOR.leftLight, right: SENSOR.rightLight}, args.SIDE);
        if (!which) throw new Error('Sensor no válido.');
        return this.sensor(which);
    }

    buttonPressed (args) {
        const expected = own({triangle: 1, round: 2}, args.BUTTON);
        if (!expected) throw new Error('Botón no válido.');
        return this.sensor(SENSOR.keypad).then(result => result === expected);
    }

    clap () {
        return this.sensor(SENSOR.clap).then(result => result === 1);
    }
};
blockClass.EXTENSION_ID = id;

const iconURL = makeIcon(icon);
const entry = {
    name,
    extensionId: id,
    collaborator: 'Microbric / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('edisonV3.description', 'USB control of Edison V3 through a bridge program loaded once with EdPy: moves, spins, LEDs, beep and sensors.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    category: 'robots',
    // Shown on the library card; the extension library also opens the help window on selection.
    extraLinks: [
        {text: msg('edisonV3.bridgeLink', 'Edison bridge program (.py)'), href: BRIDGE_PATH, download: BRIDGE_FILE},
        {text: msg('edisonV3.helpLink', 'How to connect Edison'), event: EDISON_HELP_EVENT}
    ],
    setupHelpEvent: EDISON_HELP_EVENT
};

export {entry, blockClass};
