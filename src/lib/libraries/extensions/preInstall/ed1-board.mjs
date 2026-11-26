/* eslint-disable max-len */
// Citilab ED1 (ESP32) over USB with the MicroBlocks firmware it ships with.
//
// Nothing has to be installed on the board: on connect, Unifiscratch checks
// that the board is an ED1 running MicroBlocks, then stores a few small helper
// programs ("chunks") written with its own bytecode assembler
// (microblocks-transport.mjs). Each block sets a few global variables and
// starts one of those chunks, the same way MicroBlocks runs a clicked block.
//
// Hardware facts follow the open MicroBlocks libraries "ED1 Buttons",
// "ED1 Stepper Motor" and "ED1 Fantàstic" (MicroBlocks project, MPL-2.0;
// only pin numbers, registers and the step sequence are reused):
//   touch buttons up 4, down 13, left 2, right 27, OK 15, X 14 (touched when
//   the reading is below 16); buzzer on the default tone pin; light sensor
//   0-1000; stepper motors through the I2C expander at 0x20 (output register
//   0x09 on ED1 v2, 0x14 on v1); 1.5 ms per phase, four phases per step;
//   2.3 steps per mm and 1.96 steps per degree on the Fantàstic robot.
import {ChunkBuilder, CHUNK_COMMAND, CHUNK_REPORTER, MicroBlocksTransport} from './microblocks-transport.mjs';
import {bindSafetyEvents, boundedNumber} from './micropython-transport.mjs';
import {msg} from './unifiscratch-extra-hardware.mjs';
import {deviceIconURL} from './device-icons.mjs';
import {actionButton} from './action-buttons.mjs';

const MAX_SECONDS = 5;
const MAX_STEPS = 2400;
const STEP_PHASE_US = 1500;
const STEP_MS = (4 * STEP_PHASE_US) / 1000;
const STEPS_PER_MM = 2.3;
const STEPS_PER_DEGREE = 1.96;
const TOUCH_THRESHOLD = 16;
const EXPANDER = 0x20;
const CW = [0xc, 0x3];
const CCW = [0x3, 0xc];
const BUTTONS = {up: 4, down: 13, left: 2, right: 27, ok: 15, x: 14};
const SENSOR_ORDER = ['up', 'down', 'left', 'right', 'ok', 'x', 'light', 'tiltX', 'tiltY', 'tiltZ', 'temperature'];
const SENSOR_CACHE_MS = 40;

// Global variable slots used to pass arguments (high numbers, so they do not
// collide with the variables of a MicroBlocks project on the same board).
export const G = Object.freeze({text: 116, freq: 118, ms: 119, steps: 120, p1: 121, p2: 122, p3: 123, p4: 124, reg: 127});

const expanderWrite = (b, pushValue) => {
    b.int(EXPANDER).global(G.reg);
    pushValue(b);
    b.op('i2cSet', 3);
};

// Detects the expander register (0x09 on ED1 v2, 0x14 on v1) and makes the
// motor pins outputs, as the "ED1 Stepper Motor" library does.
const emitExpanderInit = b => {
    b.int(0x14).setGlobal(G.reg);
    b.int(EXPANDER).int(1)
        .op('i2cGet', 2)
        .int(0)
        .op('equal', 2);
    b.ifTrue(c => c.int(0x09).setGlobal(G.reg));
    b.int(EXPANDER).int(0)
        .int(0)
        .op('i2cSet', 3);
    b.int(EXPANDER).int(6)
        .int(255)
        .op('i2cSet', 3);
};

// The board may have rebooted since connect (globals back to 0): set up the
// expander again before touching the motors.
const emitEnsureExpander = b => {
    b.global(G.reg).int(0)
        .op('equal', 2);
    b.ifTrue(emitExpanderInit);
};

// Helper chunks, stored once per board (the transport compares CRCs first).
export const buildChunks = () => {
    const init = new ChunkBuilder();
    emitExpanderInit(init);
    init.global(G.reg).ret();

    const motors = new ChunkBuilder();
    emitEnsureExpander(motors);
    motors.global(G.steps);
    motors.repeat(b => {
        for (const phase of [G.p1, G.p2, G.p3, G.p4]) {
            expanderWrite(b, c => c.global(phase));
            b.int(STEP_PHASE_US).op('waitMicros', 1);
        }
    });
    expanderWrite(motors, c => c.int(0));

    const stop = new ChunkBuilder();
    emitEnsureExpander(stop);
    expanderWrite(stop, c => c.int(0));
    stop.int(0).int(0)
        .prim('io', 'playTone', 2, true);

    const tone = new ChunkBuilder();
    tone.int(0).global(G.freq)
        .prim('io', 'playTone', 2, true);
    tone.global(G.ms).op('waitMillis', 1);
    tone.int(0).int(0)
        .prim('io', 'playTone', 2, true);

    const sensors = new ChunkBuilder();
    for (const button of SENSOR_ORDER.slice(0, 6)) sensors.int(BUTTONS[button]).prim('sensors', 'touchRead', 1, false);
    sensors.prim('display', 'lightLevel', 0, false);
    sensors.prim('sensors', 'tiltX', 0, false);
    sensors.prim('sensors', 'tiltY', 0, false);
    sensors.prim('sensors', 'tiltZ', 0, false);
    sensors.prim('sensors', 'temperature', 0, false);
    sensors.prim('data', 'makeList', SENSOR_ORDER.length, false).ret();

    const text = new ChunkBuilder();
    text.prim('tft', 'clear', 0, true);
    text.global(G.text).int(4)
        .int(4)
        .int(0xFFFFFF)
        .int(2)
        .bool(true)
        .prim('tft', 'text', 6, true);

    const clear = new ChunkBuilder();
    clear.prim('tft', 'clear', 0, true);

    const chunk = (id, type, builder) => ({id, type, bytes: builder.bytes()});
    return {
        init: chunk(230, CHUNK_REPORTER, init),
        motors: chunk(231, CHUNK_COMMAND, motors),
        stop: chunk(232, CHUNK_COMMAND, stop),
        tone: chunk(233, CHUNK_COMMAND, tone),
        sensors: chunk(234, CHUNK_REPORTER, sensors),
        text: chunk(235, CHUNK_COMMAND, text),
        clear: chunk(236, CHUNK_COMMAND, clear)
    };
};

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

export const decodeSensors = list => {
    if (!Array.isArray(list) || list.length < SENSOR_ORDER.length) throw new Error('Respuesta de la ED1 no válida.');
    const values = {};
    SENSOR_ORDER.forEach((key, index) => {
        values[key] = Number(list[index]) || 0;
    });
    return values;
};

const id = 'ed1Board';
const name = 'ED1';
const icon = {title: 'ED1', body: 'CITILAB', kind: 'esp32', color1: '#7c3aed', color2: '#22c55e', color3: '#4c1d95'};
const t = (key, text) => msg(`${id}.${key}`, text);

const blockClass = class Ed1Board {
    constructor (runtime) {
        this.transport = new MicroBlocksTransport(name, {
            boardMatch: /ED1/i,
            boardHint: 'una Citilab ED1',
            chunks: buildChunks(),
            onReady: transport => transport.run('init'),
            stop: transport => transport.run('stop')
        });
        this.sensorCache = null;
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
                ...actionButton('connect', t('connect', 'connect ED1 by USB')),
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
                    opcode: 'showText',
                    blockType: 'command',
                    text: t('showText', 'show [TEXT] on screen'),
                    arguments: {TEXT: {type: 'string', defaultValue: 'Hola!'}}
                },
                {opcode: 'clearScreen', blockType: 'command', text: t('clearScreen', 'clear screen')},
                '---',
                {
                    opcode: 'buttonTouched',
                    blockType: 'Boolean',
                    text: t('buttonTouched', 'button [BUTTON] touched?'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'ok'}}
                },
                {opcode: 'lightLevel', blockType: 'reporter', text: t('lightLevel', 'light level')},
                {
                    opcode: 'tilt',
                    blockType: 'reporter',
                    text: t('tilt', 'tilt [AXIS]'),
                    arguments: {AXIS: {type: 'string', menu: 'axes', defaultValue: 'x'}}
                },
                {opcode: 'temperature', blockType: 'reporter', text: t('temperature', 'temperature (°C)')}
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
                    ]},
                axes: {acceptReporters: true, items: ['x', 'y', 'z']}
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
        const count = Math.round(boundedNumber(steps, 0, MAX_STEPS));
        if (count === 0) return this.transport.run('stop');
        const [p1, p2, p3, p4] = phases;
        return this.transport.run('motors', {
            [G.steps]: count, [G.p1]: p1, [G.p2]: p2, [G.p3]: p3, [G.p4]: p4
        }, {timeout: (count * STEP_MS * 2) + 3000});
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
        return this.steps(singleMotorPhases(motor, args.ROTATION), Math.abs(boundedNumber(args.STEPS, -MAX_STEPS, MAX_STEPS)));
    }

    stop () {
        return this.transport.emergencyStop();
    }

    playTone (args) {
        const freq = Math.round(boundedNumber(args.FREQ, 20, 10000));
        const ms = Math.round(boundedNumber(args.SECONDS, 0, MAX_SECONDS) * 1000);
        return this.transport.run('tone', {[G.freq]: freq, [G.ms]: ms}, {timeout: ms + 3000});
    }

    showText (args) {
        const text = String(typeof args.TEXT === 'undefined' ? '' : args.TEXT).slice(0, 120);
        return this.transport.run('text', {[G.text]: text});
    }

    clearScreen () {
        return this.transport.run('clear');
    }

    // One board round trip reads every sensor; blocks in the same frame share it.
    readSensors () {
        const now = Date.now();
        if (this.sensorCache && now - this.sensorCache.time < SENSOR_CACHE_MS) return this.sensorCache.promise;
        const promise = this.transport.run('sensors').then(decodeSensors);
        this.sensorCache = {time: now, promise};
        promise.catch(() => {
            if (this.sensorCache && this.sensorCache.promise === promise) this.sensorCache = null;
        });
        return promise;
    }

    buttonTouched (args) {
        if (!Object.prototype.hasOwnProperty.call(BUTTONS, args.BUTTON)) throw new Error('Botón no válido.');
        return this.readSensors().then(values => values[args.BUTTON] < TOUCH_THRESHOLD);
    }

    lightLevel () {
        // MicroBlocks reports 0-1000; Unifiscratch keeps the 0-100 scale.
        return this.readSensors().then(values => Math.round(values.light / 10));
    }

    tilt (args) {
        const axis = String(args.AXIS).toLowerCase();
        if (!['x', 'y', 'z'].includes(axis)) throw new Error('Eje no válido.');
        return this.readSensors().then(values => values[`tilt${axis.toUpperCase()}`]);
    }

    temperature () {
        return this.readSensors().then(values => values.temperature);
    }

    runPython () {
        throw new Error('La ejecución libre de Python está desactivada para este dispositivo.');
    }
};
blockClass.EXTENSION_ID = id;

const iconURL = deviceIconURL('ed1');
const entry = {
    name,
    extensionId: id,
    collaborator: 'Citilab / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('ed1Board.description', 'USB control for the Citilab ED1 with its MicroBlocks firmware: Fantàstic robot motors, buzzer, screen, touch buttons and sensors.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    category: 'boards',
    helpLink: 'https://microblocks.fun/run/microblocks.html'
};

export {entry, blockClass};
