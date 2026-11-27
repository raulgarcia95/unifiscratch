/* eslint-disable max-len */
// TTS Blue-Bot floor robot, by Web Bluetooth (Bluetooth Low Energy).
//
// Written for Unifiscratch. TTS does not publish the protocol; what we use is
// the interoperability information that two independent public projects show
// in the same way (only these facts, no code taken from them):
//  - Vittascience's Blue-Bot web interface (Web Bluetooth): device name
//    starting with "BlueBot", service 0xFFF0, commands written to 0xFFF2,
//    notifications on 0xFFF1, one frame per robot key.
//  - vilarion/bluebot-python (Bluetooth serial): the same frame layout and key
//    codes.
// Frame: 0xAA, length, type 0x81, 0x11, key, checksum. length counts the bytes
// from the type to the end of the data; the checksum makes the sum of the
// bytes from length to checksum a multiple of 256.
// A key frame acts like pressing that key on the robot, and a movement key
// moves the robot at once. The robot does not report when it has finished, so
// the blocks wait for the usual duration of the movement.
import {bindSafetyEvents, boundedNumber} from './micropython-transport.mjs';
import {msg} from './unifiscratch-extra-hardware.mjs';
import {deviceIconURL} from './device-icons.mjs';
import {openSetupGuide} from '../setup-guides.mjs';
import {actionButton} from './action-buttons.mjs';
import {blueBotTexts} from './bluebot-texts.mjs';
import {tr} from './runtime-texts.mjs';

const id = 'blueBot';
const name = 'BlueBot';
const t = key => msg(`blueBot.${key}`, blueBotTexts[key][0]);
const colors = {color1: '#0284c7', color2: '#0369a1', color3: '#075985'};

export const BLUEBOT_SERVICE = '0000fff0-0000-1000-8000-00805f9b34fb';
export const BLUEBOT_NOTIFY = '0000fff1-0000-1000-8000-00805f9b34fb';
export const BLUEBOT_WRITE = '0000fff2-0000-1000-8000-00805f9b34fb';
export const NAME_PREFIX = 'BlueBot';

export const KEY = {
    go: 0x01,
    clear: 0x02,
    pause: 0x03,
    forward: 0x04,
    backward: 0x05,
    left90: 0x06,
    right90: 0x07,
    left45: 0x08,
    right45: 0x09,
    left135: 0x0a,
    right135: 0x0b
};
const KEY_FRAME = 0x81;
const KEY_GROUP = 0x11;

// Usual durations (seconds). They can only be estimated: a step is 15 cm.
export const DEFAULT_STEP_SECONDS = 3;
export const SECONDS_PER_45_DEGREES = 1;
const KEY_SECONDS = 0.3;
const MAX_STEPS = 50;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * One command frame for the robot.
 * @param {number} type - 0x81 for a key.
 * @param {Array.<number>} data - bytes after 0x11 (the key code).
 * @returns {Uint8Array} the frame, with its header, length and checksum.
 */
export const frame = (type, data) => {
    const body = [2 + data.length, type, KEY_GROUP, ...data];
    const sum = body.reduce((total, byte) => total + byte, 0);
    return Uint8Array.from([0xaa, ...body, (256 - (sum & 0xff)) & 0xff]);
};

export const keyFrame = code => frame(KEY_FRAME, [code]);

// A frame is valid when its bytes from length to checksum add up to a multiple of 256.
export const checkFrame = bytes => bytes.length >= 4 && bytes[0] === 0xaa && bytes[1] === bytes.length - 3 &&
    bytes.slice(1).reduce((total, byte) => total + byte, 0) % 256 === 0;

export const turnKey = (side, angle) => {
    const degrees = Number(angle);
    const wanted = [45, 90, 135].includes(degrees) ? degrees : null;
    if (wanted === null) throw new Error(tr(`BlueBot only turns 45, 90 or 135 degrees (not ${angle}).`, `BlueBot solo gira 45, 90 o 135 grados (no ${angle}).`, `BlueBot només gira 45, 90 o 135 graus (no ${angle}).`));
    const left = String(side).toLowerCase() === 'left';
    return KEY[`${left ? 'left' : 'right'}${wanted}`];
};

export class BlueBotLink {
    constructor () {
        this.device = null;
        this.writeChar = null;
        this.epoch = 0;
        this.queue = Promise.resolve();
        this.lastError = '';
        this.lastNotification = null;
        this.connecting = false;
        this.onBleDisconnected = () => {
            this.epoch++;
            this.writeChar = null;
            this.lastError = tr('The Bluetooth connection with BlueBot was lost.', 'Se ha perdido la conexión Bluetooth con BlueBot.', 'S’ha perdut la connexió Bluetooth amb BlueBot.');
        };
    }

    isConnected () {
        return Boolean(this.writeChar && this.device && this.device.gatt && this.device.gatt.connected);
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
                filters: [{namePrefix: NAME_PREFIX}, {services: [BLUEBOT_SERVICE]}],
                optionalServices: [BLUEBOT_SERVICE]
            });
            this.device = device;
            device.addEventListener('gattserverdisconnected', this.onBleDisconnected);
            const server = await device.gatt.connect();
            let service;
            try {
                service = await server.getPrimaryService(BLUEBOT_SERVICE);
            } catch (error) {
                throw new Error(tr('This device is not a BlueBot (it lacks the BlueBot Bluetooth service).', 'Este dispositivo no es un BlueBot (no tiene el servicio Bluetooth de BlueBot).', 'Aquest dispositiu no és un BlueBot (no té el servei Bluetooth de BlueBot).'));
            }
            this.writeChar = await service.getCharacteristic(BLUEBOT_WRITE);
            // The robot's answers are not needed; listening is only kept for diagnosis.
            try {
                const notify = await service.getCharacteristic(BLUEBOT_NOTIFY);
                notify.addEventListener('characteristicvaluechanged', event => {
                    const view = event.target.value;
                    this.lastNotification = Array.from(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
                });
                await notify.startNotifications();
            } catch (error) {
                // Not fatal.
            }
            this.lastError = '';
        } catch (error) {
            this.lastError = `${name}: ${error.message}`;
            await this.close();
            throw new Error(this.lastError);
        } finally {
            this.connecting = false;
        }
    }

    close () {
        this.epoch++;
        const device = this.device;
        this.writeChar = null;
        this.device = null;
        if (device) {
            device.removeEventListener('gattserverdisconnected', this.onBleDisconnected);
            if (device.gatt && device.gatt.connected) device.gatt.disconnect();
        }
        return Promise.resolve();
    }

    disconnect () {
        return this.close();
    }

    // The robot has no stop command: the red stop sign only cancels what the
    // blocks were still going to send. A step already started finishes.
    emergencyStop () {
        this.epoch++;
        return Promise.resolve();
    }

    send (bytes) {
        const run = async () => {
            if (!this.isConnected()) {
                throw new Error(tr('Connect BlueBot (Bluetooth) before using the blocks.', 'Conecta BlueBot (Bluetooth) antes de usar los bloques.', 'Connecta BlueBot (Bluetooth) abans de fer servir els blocs.'));
            }
            const char = this.writeChar;
            const props = char.properties || {};
            if (props.write === false && props.writeWithoutResponse && char.writeValueWithoutResponse) {
                await char.writeValueWithoutResponse(bytes);
            } else if (char.writeValueWithResponse) {
                await char.writeValueWithResponse(bytes);
            } else {
                await char.writeValue(bytes);
            }
        };
        const result = this.queue.then(run, run);
        this.queue = result.catch(() => {});
        return result;
    }

    // Waits unless the red stop sign or a lost link cancels it.
    async wait (ms, epoch) {
        const end = Date.now() + ms;
        while (Date.now() < end) {
            if (epoch !== this.epoch) throw new Error(tr('Operation cancelled because the device was stopped.', 'Operación cancelada por la parada del dispositivo.', 'Operació cancel·lada per l’aturada del dispositiu.'));
            await sleep(Math.min(50, end - Date.now()));
        }
    }
}

class BlueBot {
    constructor (runtime) {
        this.runtime = runtime;
        this.link = new BlueBotLink();
        this.stepSeconds = DEFAULT_STEP_SECONDS;
        bindSafetyEvents(runtime, this.link);
    }

    getInfo () {
        return {
            id,
            name,
            ...colors,
            blocks: [
                ...actionButton('showHelp', t('showHelp')),
                ...actionButton('connectBluetooth', t('connectBluetooth')),
                {opcode: 'disconnect', blockType: 'command', text: t('disconnect')},
                {opcode: 'isConnected', blockType: 'Boolean', text: t('connected')},
                {opcode: 'connectionError', blockType: 'reporter', text: msg('connectionError', 'last connection error')},
                '---',
                {
                    opcode: 'move',
                    blockType: 'command',
                    text: t('move'),
                    arguments: {
                        DIRECTION: {type: 'string', menu: 'directions', defaultValue: 'forward'},
                        STEPS: {type: 'number', defaultValue: 1}
                    }
                },
                {
                    opcode: 'turn',
                    blockType: 'command',
                    text: t('turn'),
                    arguments: {
                        SIDE: {type: 'string', menu: 'sides', defaultValue: 'right'},
                        ANGLE: {type: 'string', menu: 'angles', defaultValue: '90'}
                    }
                },
                {
                    opcode: 'pressKey',
                    blockType: 'command',
                    text: t('pressKey'),
                    arguments: {KEY: {type: 'string', menu: 'keys', defaultValue: 'go'}}
                },
                '---',
                {
                    opcode: 'setStepTime',
                    blockType: 'command',
                    text: t('setStepTime'),
                    arguments: {SECONDS: {type: 'number', defaultValue: DEFAULT_STEP_SECONDS}}
                }
            ],
            menus: {
                directions: {
                    acceptReporters: true,
                    items: [{text: t('forward'), value: 'forward'}, {text: t('backward'), value: 'backward'}]
                },
                sides: {
                    acceptReporters: true,
                    items: [{text: t('left'), value: 'left'}, {text: t('right'), value: 'right'}]
                },
                angles: {acceptReporters: true, items: ['90', '45', '135']},
                keys: {
                    acceptReporters: false,
                    items: [
                        {text: t('go'), value: 'go'},
                        {text: t('clear'), value: 'clear'},
                        {text: t('pause'), value: 'pause'}
                    ]
                }
            }
        };
    }

    showHelp () {
        openSetupGuide(id);
    }

    connectBluetooth () {
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

    async press (code, seconds) {
        const epoch = this.link.epoch;
        try {
            await this.link.send(keyFrame(code));
            await this.link.wait(Math.round(seconds * 1000), epoch);
        } catch (error) {
            this.link.lastError = error.message;
            throw error;
        }
    }

    async move (args) {
        const steps = Math.round(boundedNumber(args.STEPS, 0, MAX_STEPS));
        const back = String(args.DIRECTION).toLowerCase() === 'backward';
        for (let i = 0; i < steps; i++) {
            await this.press(back ? KEY.backward : KEY.forward, this.stepSeconds);
        }
    }

    turn (args) {
        const code = turnKey(args.SIDE, args.ANGLE);
        return this.press(code, (Number(args.ANGLE) / 45) * SECONDS_PER_45_DEGREES);
    }

    pressKey (args) {
        const code = KEY[String(args.KEY)];
        if (!code || code > KEY.pause) return Promise.resolve();
        return this.press(code, KEY_SECONDS);
    }

    setStepTime (args) {
        this.stepSeconds = boundedNumber(args.SECONDS, 0.5, 10);
    }
}
BlueBot.EXTENSION_ID = id;

const iconURL = deviceIconURL('blueBot');

export const blockClass = BlueBot;
export const entry = {
    name,
    extensionId: id,
    collaborator: 'TTS / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: t('description'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    bluetoothRequired: true,
    category: 'robots',
    helpLink: 'https://www.tts-group.co.uk/blue-bot-bluetooth-programmable-floor-robot/1015268.html'
};
