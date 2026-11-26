/* eslint-disable max-len */
// Cutebot (ELECFREAKS) on a micro:bit with the Unifiscratch firmware
// (static/extensions/cutebot). Bluetooth first, USB as an alternative.
// The firmware is our own MakeCode program; it drives the robot's I2C
// coprocessor and pins and stops the motors if the link goes quiet.
import {MicrobitUartTransport} from './microbit-uart-transport.mjs';
import {bindSafetyEvents, boundedNumber} from './micropython-transport.mjs';
import {colorToRgb, makeIcon, msg} from './unifiscratch-extra-hardware.mjs';
import {openSetupGuide} from '../setup-guides.mjs';

const id = 'smartCutebot';
const name = 'Cutebot';
const t = (key, text) => msg(`${id}.${key}`, text);
const icon = {
    title: 'CUTEBOT',
    body: 'MICRO:BIT',
    kind: 'cutebot',
    color1: '#ef6c00',
    color2: '#5b21b6',
    color3: '#8a3d00'
};

export const MAX_TIMED_SECONDS = 5;
export const HEART = '0101011111111110111000100';

// Decodes "D cm left right a b" sensor lines from the firmware.
export const parseSensors = line => {
    if (!line.startsWith('D ')) return null;
    const [distance, left, right, a, b] = line.slice(2).trim()
        .split(/\s+/)
        .map(Number);
    if (![distance, left, right, a, b].every(Number.isFinite)) return null;
    return {distance, left, right, a, b};
};

// Scratch matrix fields are 25 characters, row by row; bit 0 is top left.
export const matrixBits = matrix => {
    const text = String(matrix || '').replace(/[^01]/g, '')
        .padEnd(25, '0')
        .slice(0, 25);
    let bits = 0;
    for (let i = 0; i < 25; i++) {
        if (text[i] === '1') bits += 2 ** i;
    }
    return bits;
};

const speed = value => Math.round(boundedNumber(value, -100, 100));

class Cutebot {
    constructor (runtime) {
        this.runtime = runtime;
        this.sensors = {distance: 0, left: 0, right: 0, a: 0, b: 0};
        this.transport = new MicrobitUartTransport(name, {
            onLine: line => {
                const sensors = parseSensors(line);
                if (sensors) this.sensors = sensors;
            }
        });
        bindSafetyEvents(runtime, this.transport);
    }

    getInfo () {
        return {
            id,
            name,
            color1: icon.color1,
            color2: icon.color2,
            color3: icon.color3,
            blocks: [
                {opcode: 'showHelp', blockType: 'command', text: t('showHelp', 'how to connect Cutebot (help)')},
                {opcode: 'connectBluetooth', blockType: 'command', text: t('connectBluetooth', 'connect Cutebot by Bluetooth')},
                {opcode: 'connectUsb', blockType: 'command', text: t('connectUsb', 'connect Cutebot by USB')},
                {opcode: 'disconnect', blockType: 'command', text: t('disconnect', 'disconnect Cutebot')},
                {opcode: 'isConnected', blockType: 'Boolean', text: t('connected', 'Cutebot connected?')},
                {opcode: 'connectionError', blockType: 'reporter', text: msg('connectionError', 'last connection error')},
                '---',
                {
                    opcode: 'driveTimed',
                    blockType: 'command',
                    text: t('driveTimed', 'motors left [LEFT] right [RIGHT] for [SECONDS] s (max. 5)'),
                    arguments: {
                        LEFT: {type: 'number', defaultValue: 50},
                        RIGHT: {type: 'number', defaultValue: 50},
                        SECONDS: {type: 'number', defaultValue: 1}
                    }
                },
                {
                    opcode: 'drive',
                    blockType: 'command',
                    text: t('drive', 'set motors left [LEFT] right [RIGHT]'),
                    arguments: {
                        LEFT: {type: 'number', defaultValue: 30},
                        RIGHT: {type: 'number', defaultValue: 30}
                    }
                },
                {opcode: 'stop', blockType: 'command', text: t('stop', 'stop Cutebot')},
                '---',
                {
                    opcode: 'headlight',
                    blockType: 'command',
                    text: t('headlight', 'headlight [LIGHT] color [COLOR]'),
                    arguments: {
                        LIGHT: {type: 'string', menu: 'lights', defaultValue: 'both'},
                        COLOR: {type: 'color', defaultValue: '#ff9900'}
                    }
                },
                {
                    opcode: 'underglow',
                    blockType: 'command',
                    text: t('underglow', 'underglow color [COLOR]'),
                    arguments: {COLOR: {type: 'color', defaultValue: '#0066ff'}}
                },
                {opcode: 'lightsOff', blockType: 'command', text: t('lightsOff', 'turn off lights')},
                {
                    opcode: 'servo',
                    blockType: 'command',
                    text: t('servo', 'servo [SERVO] angle [ANGLE]'),
                    arguments: {
                        SERVO: {type: 'string', menu: 'servos', defaultValue: '1'},
                        ANGLE: {type: 'number', defaultValue: 90}
                    }
                },
                '---',
                {opcode: 'distance', blockType: 'reporter', text: t('distance', 'distance (cm)')},
                {
                    opcode: 'onLine',
                    blockType: 'Boolean',
                    text: t('onLine', 'line sensor [SIDE] on black line?'),
                    arguments: {SIDE: {type: 'string', menu: 'sides', defaultValue: 'left'}}
                },
                {
                    opcode: 'buttonPressed',
                    blockType: 'Boolean',
                    text: t('buttonPressed', 'button [BUTTON] pressed?'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'a'}}
                },
                '---',
                {
                    opcode: 'showMatrix',
                    blockType: 'command',
                    text: t('showMatrix', 'display [MATRIX]'),
                    arguments: {MATRIX: {type: 'matrix', defaultValue: HEART}}
                },
                {
                    opcode: 'showText',
                    blockType: 'command',
                    text: t('showText', 'display text [TEXT]'),
                    arguments: {TEXT: {type: 'string', defaultValue: 'Hola'}}
                },
                {opcode: 'clearDisplay', blockType: 'command', text: t('clearDisplay', 'clear display')},
                {
                    opcode: 'playTone',
                    blockType: 'command',
                    text: t('playTone', 'play tone [FREQ] Hz for [SECONDS] s'),
                    arguments: {
                        FREQ: {type: 'number', defaultValue: 440},
                        SECONDS: {type: 'number', defaultValue: 0.5}
                    }
                }
            ],
            menus: {
                lights: {
                    acceptReporters: true,
                    items: [
                        {text: t('both', 'both'), value: 'both'},
                        {text: t('left', 'left'), value: 'left'},
                        {text: t('right', 'right'), value: 'right'}
                    ]
                },
                sides: {
                    acceptReporters: true,
                    items: [
                        {text: t('left', 'left'), value: 'left'},
                        {text: t('right', 'right'), value: 'right'}
                    ]
                },
                servos: {acceptReporters: true, items: ['1', '2']},
                buttons: {acceptReporters: true, items: [{text: 'A', value: 'a'}, {text: 'B', value: 'b'}]}
            }
        };
    }

    showHelp () {
        openSetupGuide(id);
    }

    connectBluetooth () {
        return this.transport.connectBluetooth();
    }

    connectUsb () {
        return this.transport.connectUsb();
    }

    disconnect () {
        return this.transport.disconnect();
    }

    isConnected () {
        return this.transport.isConnected();
    }

    connectionError () {
        return this.transport.lastError;
    }

    async driveTimed (args) {
        const seconds = boundedNumber(typeof args.SECONDS === 'undefined' ? 1 : args.SECONDS, 0, MAX_TIMED_SECONDS);
        const ms = Math.round(seconds * 1000);
        if (ms === 0) return this.transport.send('S');
        const epoch = this.transport.epoch;
        // The firmware stops on its own after ms, even if the link drops.
        await this.transport.send(`M ${speed(args.LEFT)} ${speed(args.RIGHT)} ${ms}`);
        await this.transport.wait(seconds, epoch);
    }

    drive (args) {
        // Continuous: the firmware stops if it hears nothing for 1.5 s.
        return this.transport.send(`M ${speed(args.LEFT)} ${speed(args.RIGHT)} 0`);
    }

    stop () {
        return this.transport.emergencyStop();
    }

    headlight (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        const side = {left: 0, right: 1}[args.LIGHT];
        return this.transport.send(`H ${typeof side === 'undefined' ? 2 : side} ${r} ${g} ${b}`);
    }

    underglow (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.transport.send(`N ${r} ${g} ${b}`);
    }

    async lightsOff () {
        await this.transport.send('H 2 0 0 0');
        await this.transport.send('N 0 0 0');
    }

    servo (args) {
        const servo = String(args.SERVO) === '2' ? 2 : 1;
        return this.transport.send(`V ${servo} ${Math.round(boundedNumber(args.ANGLE, 0, 180))}`);
    }

    distance () {
        return this.sensors.distance;
    }

    onLine (args) {
        return this.sensors[args.SIDE === 'right' ? 'right' : 'left'] === 1;
    }

    buttonPressed (args) {
        return this.sensors[String(args.BUTTON).toLowerCase() === 'b' ? 'b' : 'a'] === 1;
    }

    showMatrix (args) {
        return this.transport.send(`I ${matrixBits(args.MATRIX)}`);
    }

    showText (args) {
        // Keep it short: Bluetooth packets are small and the text scrolls slowly.
        const text = String(args.TEXT).replace(/[\r\n]/g, ' ')
            .slice(0, 40);
        return this.transport.send(`T ${text}`);
    }

    clearDisplay () {
        return this.transport.send('C');
    }

    async playTone (args) {
        const freq = Math.round(boundedNumber(args.FREQ, 20, 10000));
        const seconds = boundedNumber(args.SECONDS, 0, 3);
        const epoch = this.transport.epoch;
        await this.transport.send(`B ${freq} ${Math.round(seconds * 1000)}`);
        await this.transport.wait(seconds, epoch);
    }
}
Cutebot.EXTENSION_ID = id;

const iconURL = makeIcon(icon);

export const blockClass = Cutebot;
export const entry = {
    name,
    extensionId: id,
    collaborator: 'ELECFREAKS / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('smartCutebot.description', 'Cutebot with micro:bit by Bluetooth or USB: motors, lights, servos, sensors and LED display.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    bluetoothRequired: true,
    category: 'robots',
    helpLink: 'https://wiki.elecfreaks.com/en/microbit/microbit-smart-car/microbit-samrt-cutebot/'
};
