/* eslint-disable max-len */
// Citilab ED1 (ESP32) over USB with MicroPython firmware.
//
// Pin map and the stepper sequence follow the open MicroBlocks libraries
// "ED1 Buttons", "ED1 Stepper Motor" and "ED1 Fantàstic"
// (https://github.com/MicroBlocksCN/smallvm, gp/Libraries) and the ESPHome
// device page for the ED1 (https://devices.esphome.io/devices/Citilab-ED1/):
//   touch buttons up 4, down 13, left 2, right 27, OK 15, X 14
//   buzzer 26, light sensor 34 (ADC), I2C SDA 21 / SCL 22
//   stepper outputs through the I2C expander at 0x20 (MCP23009 on ED1 v2,
//   output register 0x09; register 0x14 on v1 boards).
//
// The ED1 ships with MicroBlocks firmware. This extension needs the board to
// run MicroPython for ESP32 instead (see docs/extensions-audit.md).
import {MicroPythonTransport, bindSafetyEvents, boundedNumber} from './micropython-transport.mjs';
import {makeIcon, msg} from './unifiscratch-extra-hardware.mjs';

const MAX_SECONDS = 5;
const STEP_PHASE_US = 1500; // four phases per step, as in MicroBlocks
const STEPS_PER_MM = 2.3; // ED1 Fantàstic robot
const STEPS_PER_DEGREE = 1.96;
const CW = [0xc, 0x3];
const CCW = [0x3, 0xc];
const BUTTONS = {up: 4, down: 13, left: 2, right: 27, ok: 15, x: 14};

const PROBE = `import sys, time
assert sys.platform == 'esp32', 'No es una placa ESP32 con MicroPython'
from machine import Pin, PWM, ADC, TouchPad, I2C
_i2c = I2C(0, scl=Pin(22), sda=Pin(21), freq=100000)
assert 0x20 in _i2c.scan(), 'No se encuentra el expansor de motores de la ED1 (I2C 0x20)'
_reg = 0x09 if _i2c.readfrom_mem(0x20, 1, 1)[0] == 0 else 0x14
_i2c.writeto_mem(0x20, 0, b'\\x00')
_i2c.writeto_mem(0x20, 6, b'\\xff')
_buz = None
_touch = {${Object.entries(BUTTONS).map(([button, pin]) => `'${button}': TouchPad(Pin(${pin}))`)
        .join(', ')}}
_base = {}
for _n in _touch:
    _base[_n] = _touch[_n].read()
_light = ADC(Pin(34))
_light.atten(ADC.ATTN_11DB)
def _unifi_stop():
    global _buz
    try:
        _i2c.writeto_mem(0x20, _reg, b'\\x00')
    finally:
        if _buz:
            _buz.deinit()
            _buz = None
        Pin(26, Pin.OUT, value=0)`;

// Board-side loop: the deadline and the finally run on the ESP32 itself.
export const stepperCode = (phases, steps) => `import time
_end = time.ticks_add(time.ticks_ms(), ${MAX_SECONDS * 1000})
try:
    for _s in range(${steps}):
        if time.ticks_diff(_end, time.ticks_ms()) <= 0:
            break
        for _v in (${phases.join(', ')}):
            _i2c.writeto_mem(0x20, _reg, bytes((_v,)))
            time.sleep_us(${STEP_PHASE_US})
finally:
    _i2c.writeto_mem(0x20, _reg, b'\\x00')`;

export const bothMotorPhases = (direction1, direction2) => {
    const [a1, a2] = direction1 === 'clockwise' ? CW : CCW;
    const [b1, b2] = direction2 === 'clockwise' ? CW : CCW;
    return [0x99, (a1 << 4) | b1, 0x66, (a2 << 4) | b2];
};

export const singleMotorPhases = (motor, direction) => {
    const shift = (motor % 2) << 2; // motor 1 -> high nibble, motor 2 -> low nibble
    const [p1, p2] = direction === 'clockwise' ? CW : CCW;
    return [0x9 << shift, p1 << shift, 0x6 << shift, p2 << shift];
};

const parseNumber = output => {
    const value = Number(String(output).trim());
    if (!Number.isFinite(value)) throw new Error('Respuesta de la ED1 no válida.');
    return value;
};

const id = 'ed1Board';
const name = 'ED1';
const icon = {title: 'ED1', body: 'CITILAB', kind: 'esp32', color1: '#7c3aed', color2: '#22c55e', color3: '#4c1d95'};
const t = (key, text) => msg(`${id}.${key}`, text);

const blockClass = class Ed1Board {
    constructor (runtime) {
        this.transport = new MicroPythonTransport(name, {probe: PROBE, stop: '_unifi_stop()'});
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
                {opcode: 'connect', blockType: 'command', text: t('connect', 'connect ED1 by USB')},
                {opcode: 'disconnect', blockType: 'command', text: t('disconnect', 'disconnect ED1')},
                {opcode: 'isConnected', blockType: 'Boolean', text: t('connected', 'ED1 connected?')},
                {opcode: 'connectionError', blockType: 'reporter', text: msg('connectionError', 'last connection error')},
                '---',
                {
                    opcode: 'robotMove',
                    blockType: 'command',
                    text: t('robotMove', 'Fantàstic robot move [DIRECTION] [DISTANCE] mm'),
                    arguments: {
                        DIRECTION: {type: 'string', menu: 'directions', defaultValue: 'forward'},
                        DISTANCE: {type: 'number', defaultValue: 100}
                    }
                },
                {
                    opcode: 'robotTurn',
                    blockType: 'command',
                    text: t('robotTurn', 'Fantàstic robot turn [SIDE] [DEGREES] degrees'),
                    arguments: {
                        SIDE: {type: 'string', menu: 'sides', defaultValue: 'right'},
                        DEGREES: {type: 'number', defaultValue: 90}
                    }
                },
                {
                    opcode: 'motorSteps',
                    blockType: 'command',
                    text: t('motorSteps', 'motor [MOTOR] [ROTATION] [STEPS] steps'),
                    arguments: {
                        MOTOR: {type: 'string', menu: 'motors', defaultValue: '1'},
                        ROTATION: {type: 'string', menu: 'rotations', defaultValue: 'clockwise'},
                        STEPS: {type: 'number', defaultValue: 128}
                    }
                },
                {opcode: 'stop', blockType: 'command', text: t('stop', 'stop ED1')},
                '---',
                {
                    opcode: 'playTone',
                    blockType: 'command',
                    text: t('playTone', 'play tone [FREQ] Hz for [SECONDS] s'),
                    arguments: {
                        FREQ: {type: 'number', defaultValue: 440},
                        SECONDS: {type: 'number', defaultValue: 0.5}
                    }
                },
                {
                    opcode: 'buttonTouched',
                    blockType: 'Boolean',
                    text: t('buttonTouched', 'button [BUTTON] touched?'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'ok'}}
                },
                {opcode: 'lightLevel', blockType: 'reporter', text: t('lightLevel', 'light level')}
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
                motors: {acceptReporters: true, items: ['1', '2']},
                rotations: {acceptReporters: true,
                    items: [
                        {text: t('clockwise', 'clockwise'), value: 'clockwise'},
                        {text: t('counterclockwise', 'counter-clockwise'), value: 'counterclockwise'}
                    ]},
                buttons: {acceptReporters: true,
                    items: [
                        {text: t('up', 'up'), value: 'up'},
                        {text: t('down', 'down'), value: 'down'},
                        {text: t('left', 'left'), value: 'left'},
                        {text: t('right', 'right'), value: 'right'},
                        {text: 'OK', value: 'ok'},
                        {text: 'X', value: 'x'}
                    ]}
            }
        };
    }

    connect () {
        return this.transport.connect();
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

    steps (phases, steps) {
        const count = Math.round(boundedNumber(steps, 0, 2000));
        if (count === 0) return this.transport.runPython('_unifi_stop()');
        return this.transport.runPython(stepperCode(phases, count));
    }

    robotMove (args) {
        if (args.DIRECTION !== 'forward' && args.DIRECTION !== 'backward') throw new Error('Dirección no válida.');
        const mm = Math.abs(boundedNumber(args.DISTANCE, -1000, 1000));
        const phases = args.DIRECTION === 'forward' ?
            bothMotorPhases('clockwise', 'counterclockwise') :
            bothMotorPhases('counterclockwise', 'clockwise');
        return this.steps(phases, mm * STEPS_PER_MM);
    }

    robotTurn (args) {
        if (args.SIDE !== 'left' && args.SIDE !== 'right') throw new Error('Sentido de giro no válido.');
        const degrees = Math.abs(boundedNumber(args.DEGREES, -360, 360));
        const rotation = args.SIDE === 'right' ? 'counterclockwise' : 'clockwise';
        return this.steps(bothMotorPhases(rotation, rotation), degrees * STEPS_PER_DEGREE);
    }

    motorSteps (args) {
        const motor = Number(args.MOTOR);
        if (motor !== 1 && motor !== 2) throw new Error('Motor no válido. Usa 1 o 2.');
        if (args.ROTATION !== 'clockwise' && args.ROTATION !== 'counterclockwise') throw new Error('Sentido no válido.');
        return this.steps(singleMotorPhases(motor, args.ROTATION), Math.abs(boundedNumber(args.STEPS, -2000, 2000)));
    }

    stop () {
        return this.transport.emergencyStop();
    }

    playTone (args) {
        const freq = Math.round(boundedNumber(args.FREQ, 20, 10000));
        const seconds = boundedNumber(args.SECONDS, 0, MAX_SECONDS);
        // Top-level code in the raw REPL already assigns module globals.
        return this.transport.runPython(`_buz = PWM(Pin(26), freq=${freq}, duty=512)
try:
    time.sleep(${seconds})
finally:
    _buz.deinit()
    _buz = None
    Pin(26, Pin.OUT, value=0)`);
    }

    buttonTouched (args) {
        if (!Object.prototype.hasOwnProperty.call(BUTTONS, args.BUTTON)) throw new Error('Botón no válido.');
        // Capacitive pads read lower when touched; compare with the reading taken on connect.
        return this.transport.runPython(`print(int(_touch['${args.BUTTON}'].read() < _base['${args.BUTTON}'] * 0.6))`)
            .then(output => parseNumber(output) === 1);
    }

    lightLevel () {
        return this.transport.runPython('print(_light.read() * 100 // 4095)').then(parseNumber);
    }

    runPython () {
        throw new Error('La ejecución libre de Python está desactivada para este dispositivo.');
    }
};
blockClass.EXTENSION_ID = id;

const iconURL = makeIcon(icon);
const entry = {
    name,
    extensionId: id,
    collaborator: 'Citilab / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('ed1Board.description', 'USB control for the Citilab ED1 with MicroPython: Fantàstic robot motors, buzzer, touch buttons and light sensor.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    category: 'boards',
    helpLink: 'https://devices.esphome.io/devices/Citilab-ED1/'
};

export {entry, blockClass};
