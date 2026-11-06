/* eslint-disable max-len */
// Wonder Workshop Dash over Web Bluetooth.
//
// Wonder Workshop does not publish the protocol. The UUIDs, command IDs and
// byte layouts below come from two independent community implementations that
// agree with each other:
//   - morseapi (Ilya Sukhanov, Apache-2.0): https://github.com/IlyaSukhanov/morseapi
//   - dash (Brent Rager, MIT): https://github.com/brentrager/dash
// Only protocol facts are reused; this file is an independent implementation.
//
// Safety: movement uses Dash's own "move" command, which carries its duration
// in the packet, so the robot stops by itself even if Bluetooth is lost. Each
// block is limited to five seconds. A continuous "drive" is never sent.
import {bindSafetyEvents, boundedNumber} from './micropython-transport.mjs';
import {makeIcon, msg, colorToRgb} from './unifiscratch-extra-hardware.mjs';

export const DASH_SERVICE = 'af237777-879d-6186-1f49-deca0e85d9c1';
export const DASH_COMMAND = 'af230002-879d-6186-1f49-deca0e85d9c1';
export const DASH_SENSOR = 'af230006-879d-6186-1f49-deca0e85d9c1';
export const DOT_SENSOR = 'af230003-879d-6186-1f49-deca0e85d9c1';

const CMD = {
    drive: 0x02,
    neckColor: 0x03,
    tailBrightness: 0x04,
    headYaw: 0x06,
    headPitch: 0x07,
    eyeBrightness: 0x08,
    eye: 0x09,
    leftEarColor: 0x0b,
    rightEarColor: 0x0c,
    headColor: 0x0d,
    say: 0x18,
    move: 0x23
};

// Sound bank payloads ("SYST" + sound file name + playback parameters).
const SOUNDS = {
    hi: '53595354444153485f48495f564f0b00c900',
    bragging: '535953544252414747494e4731410b232300',
    ohno: '5359535456375f4f484e4f5f30390b000000',
    confused: '53595354434f4e46555345445f310b000000',
    curious: '53595354435552494f55535f30340b000000',
    okay: '53595354424f5f4f4b41595f30330b000000',
    yawn: '53595354424f5f56375f5941574e0b000000',
    tada: '535953545441485f4441485f30310b000000',
    wee: '53595354455843495445445f30310b000000',
    charge: '535953544348415247455f3033000b000000',
    elephant: '53595354454c455048414e545f300e460000',
    horse: '53595354484f5253455748494e320b000000',
    cat: '5359535446585f4341545f3031000b000000',
    dog: '5359535446585f444f475f3032000b000000',
    dinosaur: '5359535444494e4f534155525f330b000000',
    lion: '5359535446585f4c494f4e5f30310b000000',
    horn: '53595354545255434b484f524e000b000000',
    tires: '535953545449524553515545414c0b000000',
    helicopter: '5359535448454c49434f505445520b000000',
    beep: '53595354424f545f435554455f300b000000'
};

const hexBytes = hex => hex.match(/../g).map(byte => parseInt(byte, 16));
// Menu lookups must ignore inherited keys such as __proto__ or constructor.
const own = (table, key) => (Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null);

const SPEEDS = {slow: 150, normal: 300, fast: 500}; // mm/s
const TURN_SPEED = 120; // degrees per second
const MAX_SECONDS = 5;

const toSigned = (value, bits) => (value >= 1 << (bits - 1) ? value - (1 << bits) : value);

// Payload of the "move" command (after the command byte). Same layout as
// morseapi _get_move_byte_array and dash_robot move/turn.
export const movePayload = ({distanceMm = 0, degrees = 0, seconds}) => {
    if (distanceMm && degrees) throw new Error('Dash no puede avanzar y girar en la misma orden.');
    const time = Math.round(seconds * 1000);
    const centiradians = Math.trunc(degrees * Math.PI / 180 * 100);
    const sixth = ((distanceMm >> 8) & 0x3f) | ((centiradians & 0x0300) >> 2);
    return [
        distanceMm & 0xff,
        0x00,
        centiradians & 0xff,
        (time >> 8) & 0xff,
        time & 0xff,
        sixth,
        centiradians < 0 ? 0xc0 : 0x00,
        distanceMm < 0 ? 0x81 : 0x80
    ];
};

export const angleByte = angle => (angle < 0 ? ((Math.abs(angle) ^ 0xff) + 1) & 0xff : angle & 0xff);

// Sensor packets, decoded as in morseapi/sensors.py.
export const decodeDashSensors = value => ({
    proxRight: value[6],
    proxLeft: value[7],
    proxRear: value[8],
    yaw: toSigned((value[13] << 8) | value[12], 12),
    headPitch: value[18],
    headYaw: value[19]
});

export const decodeDotSensors = value => ({
    buttonMain: (value[8] & 0x10) > 0,
    button1: (value[8] & 0x20) > 0,
    button2: (value[8] & 0x40) > 0,
    button3: (value[8] & 0x80) > 0,
    pickedUp: (value[11] & 0x04) > 0,
    hit: (value[11] & 0x01) > 0,
    micLevel: value[7]
});

const cancelled = () => new Error('Orden cancelada por la parada de Dash.');

export class DashLink {
    constructor (label = 'Dash') {
        this.label = label;
        this.device = null;
        this.command = null;
        this.ready = false;
        this.epoch = 0;
        this.queue = Promise.resolve();
        this.lastError = '';
        this.sensors = {};
        this.isDash = false;
        this.waits = new Set();
        this.onDisconnected = () => this.lost('Dash se ha desconectado por Bluetooth.');
    }

    isConnected () {
        return Boolean(this.ready && this.device && this.device.gatt && this.device.gatt.connected);
    }

    async connect () {
        if (this.isConnected()) return;
        if (this.connecting) throw new Error('Conexión ocupada.');
        if (typeof navigator === 'undefined' || !navigator.bluetooth) {
            throw new Error('Web Bluetooth no está disponible. Usa Chrome o Edge en HTTPS o localhost.');
        }
        this.connecting = true;
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{services: [DASH_SERVICE]}, {namePrefix: 'Dash'}],
                optionalServices: [DASH_SERVICE]
            });
            this.device = device;
            device.addEventListener('gattserverdisconnected', this.onDisconnected);
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService(DASH_SERVICE);
            this.command = await service.getCharacteristic(DASH_COMMAND);
            this.sensors = {};
            this.isDash = false;
            await this.subscribe(service, DOT_SENSOR, value => Object.assign(this.sensors, decodeDotSensors(value)));
            // Dot robots expose only the first sensor stream and have no wheels.
            this.isDash = await this.subscribe(service, DASH_SENSOR,
                value => Object.assign(this.sensors, decodeDashSensors(value)));
            this.epoch++;
            this.ready = true;
            this.lastError = '';
            await this.write([CMD.drive, 0, 0, 0]);
        } catch (error) {
            this.lastError = `${this.label}: ${error.message}`;
            await this.close();
            throw new Error(this.lastError);
        } finally {
            this.connecting = false;
        }
    }

    async subscribe (service, uuid, handler) {
        try {
            const characteristic = await service.getCharacteristic(uuid);
            characteristic.addEventListener('characteristicvaluechanged', event => {
                const view = event.target.value;
                handler(Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength)));
            });
            await characteristic.startNotifications();
            return true;
        } catch (error) {
            return false;
        }
    }

    lost (message) {
        if (!this.ready && !this.device) return;
        this.ready = false;
        this.epoch++;
        this.lastError = message;
        this.wakeWaits();
    }

    wakeWaits () {
        this.waits.forEach(wake => wake());
        this.waits.clear();
    }

    // Serialised GATT write: Web Bluetooth rejects overlapping operations.
    write (bytes, epoch = this.epoch) {
        if (!this.isConnected()) {
            return Promise.reject(new Error('Conecta explícitamente Dash antes de ejecutar bloques.'));
        }
        const operation = this.queue.then(() => {
            if (epoch !== this.epoch) throw cancelled();
            if (!this.command) throw new Error('Dash no está conectado.');
            const data = new Uint8Array(bytes);
            return this.command.writeValueWithResponse ?
                this.command.writeValueWithResponse(data) : this.command.writeValue(data);
        });
        this.queue = operation.catch(() => {});
        return operation;
    }

    // Wait while the robot performs a timed move; a stop ends the wait early.
    wait (seconds, epoch) {
        return new Promise((resolve, reject) => {
            let timer; // eslint-disable-line prefer-const
            const wake = () => {
                clearTimeout(timer);
                this.waits.delete(wake);
                if (epoch === this.epoch) resolve();
                else reject(cancelled());
            };
            timer = setTimeout(wake, seconds * 1000);
            this.waits.add(wake);
        });
    }

    async run (bytes, seconds = 0) {
        const epoch = this.epoch;
        await this.write(bytes, epoch);
        if (seconds > 0) await this.wait(seconds, epoch);
    }

    emergencyStop () {
        this.epoch++;
        this.wakeWaits();
        if (!this.isConnected()) return Promise.resolve();
        // A new epoch drops queued movements; the stop itself uses that epoch.
        return this.write([CMD.drive, 0, 0, 0], this.epoch).catch(error => {
            this.lastError = error.message;
            throw error;
        });
    }

    async disconnect () {
        try {
            await this.emergencyStop();
        } finally {
            await this.close();
        }
    }

    close () {
        this.ready = false;
        this.epoch++;
        this.wakeWaits();
        const device = this.device;
        this.device = null;
        this.command = null;
        if (device) {
            device.removeEventListener('gattserverdisconnected', this.onDisconnected);
            if (device.gatt && device.gatt.connected) device.gatt.disconnect();
        }
        return Promise.resolve();
    }
}

const id = 'dashRobot';
const name = 'Dash';
const icon = {title: 'DASH', body: 'ROBOT', kind: 'dash', color1: '#0ea5e9', color2: '#f97316', color3: '#075985'};
const t = (key, text) => msg(`${id}.${key}`, text);

const blockClass = class DashRobot {
    constructor (runtime) {
        this.runtime = runtime;
        this.link = new DashLink(name);
        // bindSafetyEvents expects the transport interface.
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
                {opcode: 'connect', blockType: 'command', text: t('connect', 'connect Dash by Bluetooth')},
                {opcode: 'disconnect', blockType: 'command', text: t('disconnect', 'disconnect Dash')},
                {opcode: 'isConnected', blockType: 'Boolean', text: t('connected', 'Dash connected?')},
                {opcode: 'connectionError', blockType: 'reporter', text: msg('connectionError', 'last connection error')},
                '---',
                {
                    opcode: 'move',
                    blockType: 'command',
                    text: t('move', 'move [DIRECTION] [DISTANCE] cm [SPEED]'),
                    arguments: {
                        DIRECTION: {type: 'string', menu: 'directions', defaultValue: 'forward'},
                        DISTANCE: {type: 'number', defaultValue: 20},
                        SPEED: {type: 'string', menu: 'speeds', defaultValue: 'normal'}
                    }
                },
                {
                    opcode: 'turn',
                    blockType: 'command',
                    text: t('turn', 'turn [SIDE] [DEGREES] degrees'),
                    arguments: {
                        SIDE: {type: 'string', menu: 'sides', defaultValue: 'right'},
                        DEGREES: {type: 'number', defaultValue: 90}
                    }
                },
                {opcode: 'stop', blockType: 'command', text: t('stop', 'stop Dash')},
                '---',
                {
                    opcode: 'look',
                    blockType: 'command',
                    text: t('look', 'turn head left-right [YAW] up-down [PITCH]'),
                    arguments: {
                        YAW: {type: 'number', defaultValue: 0},
                        PITCH: {type: 'number', defaultValue: 0}
                    }
                },
                {
                    opcode: 'setLight',
                    blockType: 'command',
                    text: t('setLight', 'set [PART] light to [COLOR]'),
                    arguments: {
                        PART: {type: 'string', menu: 'lights', defaultValue: 'all'},
                        COLOR: {type: 'color', defaultValue: '#00a0ff'}
                    }
                },
                {
                    opcode: 'setEye',
                    blockType: 'command',
                    text: t('setEye', 'eye [PATTERN] brightness [BRIGHTNESS] %'),
                    arguments: {
                        PATTERN: {type: 'string', menu: 'eyePatterns', defaultValue: 'all'},
                        BRIGHTNESS: {type: 'number', defaultValue: 100}
                    }
                },
                {
                    opcode: 'playSound',
                    blockType: 'command',
                    text: t('playSound', 'play sound [SOUND]'),
                    arguments: {SOUND: {type: 'string', menu: 'sounds', defaultValue: 'hi'}}
                },
                '---',
                {
                    opcode: 'proximity',
                    blockType: 'reporter',
                    text: t('proximity', '[SENSOR] distance sensor'),
                    arguments: {SENSOR: {type: 'string', menu: 'proximity', defaultValue: 'left'}}
                },
                {
                    opcode: 'buttonPressed',
                    blockType: 'Boolean',
                    text: t('buttonPressed', 'button [BUTTON] pressed?'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'main'}}
                },
                {opcode: 'pickedUp', blockType: 'Boolean', text: t('pickedUp', 'Dash picked up?')},
                {opcode: 'bumped', blockType: 'Boolean', text: t('bumped', 'Dash bumped?')},
                {opcode: 'soundLevel', blockType: 'reporter', text: t('soundLevel', 'sound level')}
            ],
            menus: {
                directions: {acceptReporters: true,
                    items: [
                        {text: t('forward', 'forward'), value: 'forward'},
                        {text: t('backward', 'backward'), value: 'backward'}
                    ]},
                speeds: {acceptReporters: true,
                    items: [
                        {text: t('slow', 'slow'), value: 'slow'},
                        {text: t('normal', 'normal'), value: 'normal'},
                        {text: t('fast', 'fast'), value: 'fast'}
                    ]},
                sides: {acceptReporters: true,
                    items: [
                        {text: t('left', 'left'), value: 'left'},
                        {text: t('right', 'right'), value: 'right'}
                    ]},
                lights: {acceptReporters: true,
                    items: [
                        {text: t('all', 'all'), value: 'all'},
                        {text: t('front', 'front'), value: 'front'},
                        {text: t('ears', 'ears'), value: 'ears'},
                        {text: t('leftEar', 'left ear'), value: 'leftEar'},
                        {text: t('rightEar', 'right ear'), value: 'rightEar'},
                        {text: t('top', 'top button'), value: 'top'}
                    ]},
                eyePatterns: {acceptReporters: true,
                    items: [
                        {text: t('all', 'all'), value: 'all'},
                        {text: t('eyeHalf', 'half'), value: 'alternate'},
                        {text: t('eyeTop', 'top'), value: 'top'},
                        {text: t('eyeOff', 'off'), value: 'off'}
                    ]},
                sounds: {acceptReporters: true,
                    items: Object.keys(SOUNDS).map(sound => ({
                        text: t(`sound.${sound}`, sound), value: sound
                    }))},
                proximity: {acceptReporters: true,
                    items: [
                        {text: t('left', 'left'), value: 'left'},
                        {text: t('right', 'right'), value: 'right'},
                        {text: t('rear', 'rear'), value: 'rear'}
                    ]},
                buttons: {acceptReporters: true,
                    items: [
                        {text: t('mainButton', 'main'), value: 'main'},
                        {text: '1', value: '1'},
                        {text: '2', value: '2'},
                        {text: '3', value: '3'}
                    ]}
            }
        };
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

    requireDash () {
        if (this.link.isConnected() && !this.link.isDash) {
            throw new Error('El robot conectado no tiene ruedas (parece un Dot, no un Dash).');
        }
    }

    move (args) {
        this.requireDash();
        if (args.DIRECTION !== 'forward' && args.DIRECTION !== 'backward') throw new Error('Dirección no válida.');
        const speed = own(SPEEDS, args.SPEED) || SPEEDS.normal;
        // Never more than five seconds of movement per block.
        const maxMm = speed * MAX_SECONDS;
        const mm = Math.round(Math.min(maxMm, Math.abs(boundedNumber(args.DISTANCE, -1000, 1000)) * 10));
        if (mm === 0) return this.link.run([CMD.drive, 0, 0, 0]);
        const seconds = mm / speed;
        const signed = args.DIRECTION === 'backward' ? -mm : mm;
        return this.link.run([CMD.move, ...movePayload({distanceMm: signed, seconds})], seconds);
    }

    turn (args) {
        this.requireDash();
        if (args.SIDE !== 'left' && args.SIDE !== 'right') throw new Error('Sentido de giro no válido.');
        const degrees = Math.round(Math.abs(boundedNumber(args.DEGREES, -360, 360)));
        if (degrees === 0) return Promise.resolve();
        const seconds = Math.min(MAX_SECONDS, Math.max(0.3, degrees / TURN_SPEED));
        const signed = args.SIDE === 'left' ? -degrees : degrees;
        return this.link.run([CMD.move, ...movePayload({degrees: signed, seconds})], seconds);
    }

    stop () {
        return this.link.emergencyStop();
    }

    look (args) {
        this.requireDash();
        const yaw = Math.round(boundedNumber(args.YAW, -53, 53));
        const pitch = Math.round(boundedNumber(args.PITCH, -5, 10));
        return this.link.run([CMD.headYaw, angleByte(yaw)])
            .then(() => this.link.run([CMD.headPitch, angleByte(pitch)]));
    }

    setLight (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        const targets = own({
            all: [CMD.neckColor, CMD.leftEarColor, CMD.rightEarColor, CMD.headColor],
            front: [CMD.neckColor],
            ears: [CMD.leftEarColor, CMD.rightEarColor],
            leftEar: [CMD.leftEarColor],
            rightEar: [CMD.rightEarColor],
            top: [CMD.headColor]
        }, args.PART);
        if (!targets) throw new Error('Luz no válida.');
        return targets.reduce((done, command) => done.then(() => this.link.run([command, r, g, b])), Promise.resolve());
    }

    setEye (args) {
        const patterns = {all: 0x1fff, alternate: 0x1555, top: 0x0001, off: 0};
        if (!Object.prototype.hasOwnProperty.call(patterns, args.PATTERN)) throw new Error('Patrón no válido.');
        const mask = patterns[args.PATTERN];
        const brightness = Math.round(boundedNumber(args.BRIGHTNESS, 0, 100) * 2.55);
        return this.link.run([CMD.eye, (mask >> 8) & 0xff, mask & 0xff])
            .then(() => this.link.run([CMD.eyeBrightness, brightness]));
    }

    playSound (args) {
        const sound = own(SOUNDS, args.SOUND);
        if (!sound) throw new Error('Sonido no válido.');
        return this.link.run([CMD.say, ...hexBytes(sound)]);
    }

    proximity (args) {
        const key = own({left: 'proxLeft', right: 'proxRight', rear: 'proxRear'}, args.SENSOR);
        return key ? (this.link.sensors[key] || 0) : 0;
    }

    buttonPressed (args) {
        const key = own({main: 'buttonMain', 1: 'button1', 2: 'button2', 3: 'button3'}, args.BUTTON);
        return Boolean(key && this.link.sensors[key]);
    }

    pickedUp () {
        return Boolean(this.link.sensors.pickedUp);
    }

    bumped () {
        return Boolean(this.link.sensors.hit);
    }

    soundLevel () {
        return this.link.sensors.micLevel || 0;
    }
};
blockClass.EXTENSION_ID = id;

const iconURL = makeIcon(icon);
const entry = {
    name,
    extensionId: id,
    collaborator: 'Wonder Workshop / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('dashRobot.description', 'Bluetooth control of Dash: timed moves, turns, head, lights, sounds and sensors.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    bluetoothRequired: true,
    category: 'robots',
    helpLink: 'https://github.com/IlyaSukhanov/morseapi'
};

export {entry, blockClass};
