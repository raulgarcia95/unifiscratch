/* eslint-disable max-len */
// micro:shield (Make&Learn) on a micro:bit with the Unifiscratch firmware
// (firmware/microshield). Bluetooth first, USB as an alternative, with the
// same line protocol as Cutebot. The firmware drives the shield's PCA9685
// (DC motors, steppers, servos) and the free micro:bit pins, and stops the
// motors if the link goes quiet.
import {getShieldLink} from './microbit-shield-link.mjs';
import {boundedNumber} from './micropython-transport.mjs';
import {colorToRgb, msg} from './unifiscratch-extra-hardware.mjs';
import {deviceIconURL} from './device-icons.mjs';
import {openSetupGuide} from '../setup-guides.mjs';
import {actionButton} from './action-buttons.mjs';

// Kept from the earlier MicroPython profile so saved projects still load.
const id = 'microShield';
const name = 'micro:shield';
const t = (key, text) => msg(`${id}.${key}`, text);
const icon = {
    title: 'MICRO',
    body: 'SHIELD',
    kind: 'microshield',
    color1: '#ff8f1f',
    color2: '#1d4ed8',
    color3: '#b45309'
};

export const MAX_TIMED_SECONDS = 5;
// The original library times one stepper turn at 10.75 s (28BYJ-48).
export const STEPPER_MS_PER_TURN = 10750;
export const MAX_STEPPER_MS = 30000;
export const HEART = '0101011111111110111000100';
export const PINS = ['0', '1', '2', '8', '12', '13', '14', '15', '16'];
export const ANALOG_PINS = ['0', '1', '2'];
const PIN_WAIT_SECONDS = 0.3;

// "D cm a b" from the firmware.
export const parseSensors = line => {
    if (!line.startsWith('D ')) return null;
    const [distance, a, b] = line.slice(2).trim()
        .split(/\s+/)
        .map(Number);
    if (![distance, a, b].every(Number.isFinite)) return null;
    return {distance, a, b};
};

// "E 0:512 8:1" from the firmware: values of the watched pins.
export const parsePins = line => {
    if (!(line === 'E' || line.startsWith('E '))) return null;
    const pins = {};
    line.slice(1).trim()
        .split(/\s+/)
        .filter(Boolean)
        .forEach(pair => {
            const [pin, value] = pair.split(':').map(Number);
            if (Number.isInteger(pin) && Number.isFinite(value)) pins[pin] = value;
        });
    return pins;
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

const integer = (value, min, max) => Math.round(boundedNumber(value, min, max));

const pinNumber = (value, allowed = PINS) => {
    const pin = String(value).trim()
        .replace(/^P/i, '');
    if (!allowed.includes(pin)) {
        throw new Error(`Pin no permitido: ${value}. Usa ${allowed.join(', ')}.`);
    }
    return Number(pin);
};

export const stepperMs = (amount, unit) => {
    const turns = Math.abs(Number(amount) || 0) / (unit === 'turns' ? 1 : 360);
    return Math.min(Math.round(turns * STEPPER_MS_PER_TURN), MAX_STEPPER_MS);
};

class MicroShield {
    constructor (runtime) {
        this.runtime = runtime;
        this.sensors = {distance: 0, a: 0, b: 0};
        this.pins = {};
        this.watched = {};
        this.sonar = '';
        // Shared with the "Sensores y actuadores" extension: same board, one link.
        this.transport = getShieldLink(runtime);
        this.transport.addLineListener(line => {
            const sensors = parseSensors(line);
            if (sensors) {
                this.sensors = sensors;
                return;
            }
            const pins = parsePins(line);
            if (pins) Object.assign(this.pins, pins);
        });
        this.transport.addConnectListener(() => this.resetState());
    }

    getInfo () {
        const pinArg = defaultValue => ({type: 'string', menu: 'pins', defaultValue});
        return {
            id,
            name,
            color1: icon.color1,
            color2: icon.color2,
            color3: icon.color3,
            blocks: [
                ...actionButton('showHelp', t('showHelp', 'how to connect micro:shield (help)')),
                ...actionButton('connectBluetooth', t('connectBluetooth', 'connect micro:shield by Bluetooth')),
                ...actionButton('connectUsb', t('connectUsb', 'connect micro:shield by USB')),
                {opcode: 'disconnect', blockType: 'command', text: t('disconnect', 'disconnect micro:shield')},
                {opcode: 'isConnected', blockType: 'Boolean', text: t('connected', 'micro:shield connected?')},
                {opcode: 'connectionError', blockType: 'reporter', text: msg('connectionError', 'last connection error')},
                '---',
                {
                    opcode: 'servo',
                    blockType: 'command',
                    text: t('servo', 'servo [SERVO] to [ANGLE] degrees'),
                    arguments: {
                        SERVO: {type: 'string', menu: 'servos', defaultValue: 'S0'},
                        ANGLE: {type: 'number', defaultValue: 90}
                    }
                },
                {
                    opcode: 'servoOff',
                    blockType: 'command',
                    text: t('servoOff', 'release servo [SERVO]'),
                    arguments: {SERVO: {type: 'string', menu: 'servos', defaultValue: 'S0'}}
                },
                '---',
                {
                    opcode: 'motorTimed',
                    blockType: 'command',
                    text: t('motorTimed', 'motor [MOTOR] speed [SPEED] for [SECONDS] s (max. 5)'),
                    arguments: {
                        MOTOR: {type: 'string', menu: 'motors', defaultValue: 'M1'},
                        SPEED: {type: 'number', defaultValue: 50},
                        SECONDS: {type: 'number', defaultValue: 1}
                    }
                },
                {
                    opcode: 'motor',
                    blockType: 'command',
                    text: t('motor', 'motor [MOTOR] speed [SPEED]'),
                    arguments: {
                        MOTOR: {type: 'string', menu: 'motors', defaultValue: 'M1'},
                        SPEED: {type: 'number', defaultValue: 50}
                    }
                },
                {
                    opcode: 'motorStop',
                    blockType: 'command',
                    text: t('motorStop', 'stop motor [MOTOR]'),
                    arguments: {MOTOR: {type: 'string', menu: 'motors', defaultValue: 'M1'}}
                },
                {opcode: 'stop', blockType: 'command', text: t('stop', 'stop all motors')},
                {
                    opcode: 'stepper',
                    blockType: 'command',
                    text: t('stepper', 'stepper [STEPPER] turn [AMOUNT] [UNIT]'),
                    arguments: {
                        STEPPER: {type: 'string', menu: 'steppers', defaultValue: '1'},
                        AMOUNT: {type: 'number', defaultValue: 90},
                        UNIT: {type: 'string', menu: 'stepUnits', defaultValue: 'degrees'}
                    }
                },
                '---',
                {
                    opcode: 'distance',
                    blockType: 'reporter',
                    text: t('distance', 'ultrasonic distance (cm) trig [TRIG] echo [ECHO]'),
                    arguments: {TRIG: pinArg('1'), ECHO: pinArg('2')}
                },
                {
                    opcode: 'digitalRead',
                    blockType: 'reporter',
                    text: t('digitalRead', 'digital read pin [PIN]'),
                    arguments: {PIN: pinArg('0')}
                },
                {
                    opcode: 'analogRead',
                    blockType: 'reporter',
                    text: t('analogRead', 'analog read pin [PIN]'),
                    arguments: {PIN: {type: 'string', menu: 'analogPins', defaultValue: '0'}}
                },
                {
                    opcode: 'digitalWrite',
                    blockType: 'command',
                    text: t('digitalWrite', 'digital write pin [PIN] to [VALUE]'),
                    arguments: {PIN: pinArg('0'), VALUE: {type: 'string', menu: 'onOff', defaultValue: '1'}}
                },
                {
                    opcode: 'analogWrite',
                    blockType: 'command',
                    text: t('analogWrite', 'analog write pin [PIN] to [VALUE] (0-1023)'),
                    arguments: {PIN: pinArg('0'), VALUE: {type: 'number', defaultValue: 512}}
                },
                {
                    opcode: 'buttonPressed',
                    blockType: 'Boolean',
                    text: t('buttonPressed', 'button [BUTTON] pressed?'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'a'}}
                },
                '---',
                {
                    opcode: 'stripAll',
                    blockType: 'command',
                    text: t('stripAll', 'LED strip on pin [PIN] with [COUNT] LEDs color [COLOR]'),
                    arguments: {
                        PIN: pinArg('8'),
                        COUNT: {type: 'number', defaultValue: 8},
                        COLOR: {type: 'color', defaultValue: '#ff0000'}
                    }
                },
                {
                    opcode: 'stripPixel',
                    blockType: 'command',
                    text: t('stripPixel', 'LED strip on pin [PIN] LED number [INDEX] color [COLOR]'),
                    arguments: {
                        PIN: pinArg('8'),
                        INDEX: {type: 'number', defaultValue: 1},
                        COLOR: {type: 'color', defaultValue: '#00ff00'}
                    }
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
                servos: {acceptReporters: true, items: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']},
                motors: {acceptReporters: true, items: ['M1', 'M2', 'M3', 'M4']},
                steppers: {acceptReporters: true, items: [{text: 'STEP1', value: '1'}, {text: 'STEP2', value: '2'}]},
                stepUnits: {
                    acceptReporters: false,
                    items: [
                        {text: t('degrees', 'degrees'), value: 'degrees'},
                        {text: t('turns', 'turns'), value: 'turns'}
                    ]
                },
                pins: {acceptReporters: true, items: PINS.map(pin => ({text: `P${pin}`, value: pin}))},
                analogPins: {acceptReporters: true, items: ANALOG_PINS.map(pin => ({text: `P${pin}`, value: pin}))},
                onOff: {acceptReporters: true, items: ['1', '0']},
                buttons: {acceptReporters: true, items: [{text: 'A', value: 'a'}, {text: 'B', value: 'b'}]}
            }
        };
    }

    showHelp () {
        openSetupGuide(id);
    }

    connectBluetooth () {
        return this.connected(this.transport.connectBluetooth());
    }

    connectUsb () {
        return this.connected(this.transport.connectUsb());
    }

    // A fresh link means fresh firmware state: forget pin watches and sonar.
    async connected (opening) {
        await opening;
        this.resetState();
    }

    resetState () {
        this.watched = {};
        this.pins = {};
        this.sonar = '';
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

    servoNumber (value) {
        const servo = Number(String(value).trim()
            .replace(/^S/i, ''));
        if (!Number.isInteger(servo) || servo < 0 || servo > 7) throw new Error(`Servo no válido: ${value}. Usa S0 a S7.`);
        return servo;
    }

    motorNumber (value) {
        const motor = Number(String(value).trim()
            .replace(/^M/i, ''));
        if (!Number.isInteger(motor) || motor < 1 || motor > 4) throw new Error(`Motor no válido: ${value}. Usa M1 a M4.`);
        return motor;
    }

    servo (args) {
        return this.transport.send(`V ${this.servoNumber(args.SERVO)} ${integer(args.ANGLE, 0, 180)}`);
    }

    servoOff (args) {
        return this.transport.send(`F ${this.servoNumber(args.SERVO)}`);
    }

    async motorTimed (args) {
        const motor = this.motorNumber(args.MOTOR);
        const seconds = boundedNumber(typeof args.SECONDS === 'undefined' ? 1 : args.SECONDS, 0, MAX_TIMED_SECONDS);
        const ms = Math.round(seconds * 1000);
        if (ms === 0) return this.transport.send(`M ${motor} 0 0`);
        const epoch = this.transport.epoch;
        // The firmware stops this motor on its own after ms, even if the link drops.
        await this.transport.send(`M ${motor} ${integer(args.SPEED, -100, 100)} ${ms}`);
        await this.transport.wait(seconds, epoch);
    }

    motor (args) {
        // Continuous: the firmware stops if it hears nothing for 1.5 s.
        return this.transport.send(`M ${this.motorNumber(args.MOTOR)} ${integer(args.SPEED, -100, 100)} 0`);
    }

    motorStop (args) {
        return this.transport.send(`M ${this.motorNumber(args.MOTOR)} 0 0`);
    }

    stop () {
        return this.transport.emergencyStop();
    }

    async stepper (args) {
        const stepper = String(args.STEPPER).trim()
            .replace(/^STEP/i, '') === '2' ? 2 : 1;
        const amount = Number(args.AMOUNT) || 0;
        const ms = stepperMs(amount, args.UNIT);
        if (ms === 0) return;
        const epoch = this.transport.epoch;
        await this.transport.send(`P ${stepper} ${amount < 0 ? -1 : 1} ${ms}`);
        await this.transport.wait(ms / 1000, epoch);
    }

    async watch (pin, mode) {
        if (this.watched[pin] === mode) return;
        const epoch = this.transport.epoch;
        await this.transport.send(`G ${pin} ${mode}`);
        this.watched[pin] = mode;
        delete this.pins[pin];
        // Wait for the first report so the block does not answer 0 by mistake.
        await this.transport.wait(PIN_WAIT_SECONDS, epoch);
    }

    async distance (args) {
        const trig = pinNumber(args.TRIG);
        const echo = pinNumber(args.ECHO);
        const key = `${trig} ${echo}`;
        if (this.sonar !== key) {
            const epoch = this.transport.epoch;
            await this.transport.send(`U ${key}`);
            this.sonar = key;
            delete this.watched[trig];
            delete this.watched[echo];
            await this.transport.wait(PIN_WAIT_SECONDS, epoch);
        }
        return this.sensors.distance;
    }

    async digitalRead (args) {
        const pin = pinNumber(args.PIN);
        await this.watch(pin, 1);
        return this.pins[pin] || 0;
    }

    async analogRead (args) {
        const pin = pinNumber(args.PIN, ANALOG_PINS);
        await this.watch(pin, 2);
        return this.pins[pin] || 0;
    }

    digitalWrite (args) {
        const pin = pinNumber(args.PIN);
        delete this.watched[pin];
        const on = ['1', 'true', 'on', 'high'].includes(String(args.VALUE).trim()
            .toLowerCase());
        return this.transport.send(`W ${pin} ${on ? 1 : 0}`);
    }

    analogWrite (args) {
        const pin = pinNumber(args.PIN);
        delete this.watched[pin];
        return this.transport.send(`A ${pin} ${integer(args.VALUE, 0, 1023)}`);
    }

    buttonPressed (args) {
        return this.sensors[String(args.BUTTON).toLowerCase() === 'b' ? 'b' : 'a'] === 1;
    }

    stripAll (args) {
        const pin = pinNumber(args.PIN);
        delete this.watched[pin];
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.transport.send(`L ${pin} ${integer(args.COUNT, 1, 64)} 0 ${r} ${g} ${b}`);
    }

    stripPixel (args) {
        const pin = pinNumber(args.PIN);
        delete this.watched[pin];
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.transport.send(`L ${pin} 0 ${integer(args.INDEX, 1, 64)} ${r} ${g} ${b}`);
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
        const freq = integer(args.FREQ, 20, 10000);
        const seconds = boundedNumber(args.SECONDS, 0, 3);
        const epoch = this.transport.epoch;
        await this.transport.send(`B ${freq} ${Math.round(seconds * 1000)}`);
        await this.transport.wait(seconds, epoch);
    }
}
MicroShield.EXTENSION_ID = id;

const iconURL = deviceIconURL('microshield');

export const blockClass = MicroShield;
export const entry = {
    name,
    extensionId: id,
    collaborator: 'Make&Learn / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('microShield.description', 'micro:shield with micro:bit by Bluetooth or USB: DC motors, steppers, servos, pins, sonar and LED strip.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    bluetoothRequired: true,
    category: 'boards',
    helpLink: 'https://github.com/MakeAndLearn/pxt-microshield'
};
