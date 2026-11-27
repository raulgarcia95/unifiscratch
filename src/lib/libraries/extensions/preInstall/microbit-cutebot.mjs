/* eslint-disable max-len */
// Cutebot (ELECFREAKS) on a micro:bit with the Unifiscratch firmware
// (static/extensions/cutebot). Bluetooth first, USB as an alternative.
// The firmware is our own MakeCode program; it drives the robot's I2C
// coprocessor and pins and stops the motors if the link goes quiet.
import {MicrobitUartTransport} from './microbit-uart-transport.mjs';
import {bindSafetyEvents, boundedNumber} from './micropython-transport.mjs';
import {colorToRgb, msg} from './unifiscratch-extra-hardware.mjs';
import {deviceIconURL} from './device-icons.mjs';
import {openSetupGuide} from '../setup-guides.mjs';
import {actionButton} from './action-buttons.mjs';

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
export const TILT_THRESHOLD = 15;
// How long a gesture keeps its hat block "true" (ms).
const GESTURE_WINDOW = 300;

// Own 5x5 drawings, row by row (1 = LED on).
export const ICONS = {
    heart: HEART,
    smallHeart: '0000001010011100010000000',
    happy: '0000001010000001000101110',
    sad: '0000001010000000111010001',
    surprised: '0101000000001000101000100',
    angry: '1000101010000001111110101',
    asleep: '0000011011000000111000000',
    yes: '0000000001000101010001000',
    no: '1000101010001000101010001',
    up: '0010001110101010010000100',
    down: '0010000100101010111000100',
    left: '0010001000111110100000100',
    right: '0010000010111110001000100',
    square: '1111110001100011000111111',
    dot: '0000000000001000000000000'
};

export const GESTURES = ['shake', 'logoUp', 'logoDown', 'screenUp', 'screenDown', 'tiltLeft', 'tiltRight', 'freeFall'];

const SENSOR_FIELDS = ['distance', 'left', 'right', 'a', 'b', 'logo', 'temperature', 'light', 'x', 'y', 'z', 'sound', 'heading'];
const EMPTY_SENSORS = {distance: 0, left: 0, right: 0, a: 0, b: 0, logo: 0, temperature: 0, light: 0, x: 0, y: 0, z: 0, sound: 0, heading: -1};

// Decodes "D cm left right a b [logo temp light ax ay az sound heading]".
// Firmware CB1 sends only the first five values.
export const parseSensors = line => {
    if (!line.startsWith('D ')) return null;
    const values = line.slice(2).trim()
        .split(/\s+/)
        .map(Number);
    if (values.length < 5 || !values.every(Number.isFinite)) return null;
    const sensors = {};
    SENSOR_FIELDS.slice(0, 5).forEach((key, i) => {
        sensors[key] = values[i];
    });
    if (values.length >= SENSOR_FIELDS.length) {
        SENSOR_FIELDS.forEach((key, i) => {
            sensors[key] = values[i];
        });
    }
    return sensors;
};

// Decodes "G n" gesture events (1 = shake ... 8 = free fall).
export const parseGesture = line => {
    const match = /^G (\d+)$/.exec(line.trim());
    return match ? GESTURES[Number(match[1]) - 1] || null : null;
};

// Tilt angles in degrees from the accelerometer (mg). "front" is the logo
// going down, "right" the right edge going down.
export const tiltAngle = (sensors, direction) => {
    const {x, y, z} = sensors;
    const deg = rad => Math.round(rad * 180 / Math.PI);
    const front = deg(Math.atan2(y, Math.sqrt((x * x) + (z * z))));
    const right = deg(Math.atan2(x, Math.sqrt((y * y) + (z * z))));
    return {front, back: -front, right, left: -right}[direction] || 0;
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
        this.sensors = {...EMPTY_SENSORS};
        this.gestureAt = {};
        this.extraOn = {epoch: -1, flags: 0};
        this.transport = new MicrobitUartTransport(name, {
            onLine: line => {
                const sensors = parseSensors(line);
                if (sensors) {
                    this.sensors = {...this.sensors, ...sensors};
                    return;
                }
                const gesture = parseGesture(line);
                if (gesture) this.gestureAt[gesture] = Date.now();
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
                ...actionButton('showHelp', t('showHelp', 'how to connect Cutebot (help)')),
                ...actionButton('connectBluetooth', t('connectBluetooth', 'connect Cutebot by Bluetooth')),
                ...actionButton('connectUsb', t('connectUsb', 'connect Cutebot by USB')),
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
                '---',
                {
                    opcode: 'whenButton',
                    blockType: 'hat',
                    text: t('whenButton', 'when button [BUTTON] is pressed'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'a'}}
                },
                {
                    opcode: 'buttonPressed',
                    blockType: 'Boolean',
                    text: t('buttonPressed', 'button [BUTTON] pressed?'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'a'}}
                },
                {opcode: 'whenLogoTouched', blockType: 'hat', text: t('whenLogoTouched', 'when logo is touched (V2)')},
                {opcode: 'logoTouched', blockType: 'Boolean', text: t('logoTouched', 'logo touched? (V2)')},
                {
                    opcode: 'whenGesture',
                    blockType: 'hat',
                    text: t('whenGesture', 'when [GESTURE]'),
                    arguments: {GESTURE: {type: 'string', menu: 'gestures', defaultValue: 'shake'}}
                },
                {
                    opcode: 'isTilted',
                    blockType: 'Boolean',
                    text: t('isTilted', 'tilted [DIRECTION]?'),
                    arguments: {DIRECTION: {type: 'string', menu: 'tiltAny', defaultValue: 'any'}}
                },
                {
                    opcode: 'tiltAngle',
                    blockType: 'reporter',
                    text: t('tiltAngle', 'tilt angle [DIRECTION]'),
                    arguments: {DIRECTION: {type: 'string', menu: 'tilts', defaultValue: 'front'}}
                },
                {
                    opcode: 'acceleration',
                    blockType: 'reporter',
                    text: t('acceleration', 'acceleration [AXIS] (mg)'),
                    arguments: {AXIS: {type: 'string', menu: 'axes', defaultValue: 'x'}}
                },
                {opcode: 'temperature', blockType: 'reporter', text: t('temperature', 'temperature (°C)')},
                {opcode: 'lightLevel', blockType: 'reporter', text: t('lightLevel', 'light level')},
                {opcode: 'compassHeading', blockType: 'reporter', text: t('compassHeading', 'compass heading (°)')},
                {opcode: 'soundLevel', blockType: 'reporter', text: t('soundLevel', 'sound level (V2)')},
                '---',
                {
                    opcode: 'showIcon',
                    blockType: 'command',
                    text: t('showIcon', 'display icon [ICON]'),
                    arguments: {ICON: {type: 'string', menu: 'icons', defaultValue: 'heart'}}
                },
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
                {
                    opcode: 'plotLed',
                    blockType: 'command',
                    text: t('plotLed', 'turn LED x [X] y [Y] [STATE]'),
                    arguments: {
                        X: {type: 'number', defaultValue: 2},
                        Y: {type: 'number', defaultValue: 2},
                        STATE: {type: 'string', menu: 'onOff', defaultValue: 'on'}
                    }
                },
                {
                    opcode: 'setBrightness',
                    blockType: 'command',
                    text: t('setBrightness', 'set display brightness to [LEVEL] %'),
                    arguments: {LEVEL: {type: 'number', defaultValue: 100}}
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
                buttons: {
                    acceptReporters: true,
                    items: [{text: 'A', value: 'a'}, {text: 'B', value: 'b'}, {text: t('anyButton', 'any'), value: 'any'}]
                },
                gestures: {
                    acceptReporters: false,
                    items: GESTURES.map(gesture => ({text: t(`gesture.${gesture}`, gesture), value: gesture}))
                },
                tilts: {
                    acceptReporters: true,
                    items: ['front', 'back', 'left', 'right'].map(dir => ({text: t(`tilt.${dir}`, dir), value: dir}))
                },
                tiltAny: {
                    acceptReporters: true,
                    items: ['any', 'front', 'back', 'left', 'right'].map(dir => ({text: t(`tilt.${dir}`, dir), value: dir}))
                },
                axes: {
                    acceptReporters: true,
                    items: [
                        {text: 'x', value: 'x'}, {text: 'y', value: 'y'}, {text: 'z', value: 'z'},
                        {text: t('strength', 'strength'), value: 'strength'}
                    ]
                },
                icons: {
                    acceptReporters: true,
                    items: Object.keys(ICONS).map(key => ({text: t(`icon.${key}`, key), value: key}))
                },
                onOff: {
                    acceptReporters: true,
                    items: [{text: t('on', 'on'), value: 'on'}, {text: t('off', 'off'), value: 'off'}]
                }
            }
        };
    }

    showHelp () {
        openSetupGuide(id);
    }

    async connectBluetooth () {
        await this.transport.connectBluetooth();
        this.checkFirmware();
    }

    async connectUsb () {
        await this.transport.connectUsb();
        this.checkFirmware();
    }

    // Firmware CB1 drives the robot but has no micro:bit sensor values.
    checkFirmware () {
        if (!String(this.transport.version || '').startsWith('CB2')) {
            this.transport.lastError = 'Cutebot: firmware antiguo. Vuelve a cargar el .hex de Unifiscratch para usar ' +
                'acelerómetro, gestos, logo, temperatura, luz, brújula y sonido.';
        }
    }

    // micro:bit version reported by the firmware ("CB2 2" = V2).
    isV2 () {
        return String(this.transport.version || '').trim() === 'CB2 2';
    }

    // Compass and microphone only run once a block asks for them.
    enableExtra (flag) {
        if (!this.transport.isConnected()) return;
        if (this.extraOn.epoch !== this.transport.epoch) this.extraOn = {epoch: this.transport.epoch, flags: 0};
        if (this.extraOn.flags & flag) return;
        this.extraOn.flags |= flag;
        this.transport.send(`Q ${flag}`).catch(() => {});
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
        const button = String(args.BUTTON).toLowerCase();
        if (button === 'any') return this.sensors.a === 1 || this.sensors.b === 1;
        return this.sensors[button === 'b' ? 'b' : 'a'] === 1;
    }

    whenButton (args) {
        return this.buttonPressed(args);
    }

    logoTouched () {
        return this.sensors.logo === 1;
    }

    whenLogoTouched () {
        return this.logoTouched();
    }

    whenGesture (args) {
        const at = this.gestureAt[args.GESTURE];
        return typeof at === 'number' && Date.now() - at < GESTURE_WINDOW;
    }

    isTilted (args) {
        const dir = String(args.DIRECTION);
        if (dir === 'any') {
            return ['front', 'back', 'left', 'right'].some(side => tiltAngle(this.sensors, side) >= TILT_THRESHOLD);
        }
        return tiltAngle(this.sensors, dir) >= TILT_THRESHOLD;
    }

    tiltAngle (args) {
        return tiltAngle(this.sensors, String(args.DIRECTION));
    }

    acceleration (args) {
        const axis = String(args.AXIS).toLowerCase();
        if (axis === 'strength') {
            const {x, y, z} = this.sensors;
            return Math.round(Math.sqrt((x * x) + (y * y) + (z * z)));
        }
        return this.sensors[['x', 'y', 'z'].includes(axis) ? axis : 'x'];
    }

    temperature () {
        return this.sensors.temperature;
    }

    lightLevel () {
        return this.sensors.light;
    }

    compassHeading () {
        this.enableExtra(1);
        return this.sensors.heading;
    }

    soundLevel () {
        this.enableExtra(2);
        return this.sensors.sound;
    }

    showIcon (args) {
        const pattern = ICONS[args.ICON] || String(args.ICON);
        return this.transport.send(`I ${matrixBits(pattern)}`);
    }

    plotLed (args) {
        const x = Math.round(boundedNumber(args.X, 0, 4));
        const y = Math.round(boundedNumber(args.Y, 0, 4));
        return this.transport.send(`P ${x} ${y} ${args.STATE === 'off' ? 0 : 1}`);
    }

    setBrightness (args) {
        return this.transport.send(`R ${Math.round(boundedNumber(args.LEVEL, 0, 100) * 255 / 100)}`);
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

const iconURL = deviceIconURL('cutebot');

export const blockClass = Cutebot;
export const entry = {
    name,
    extensionId: id,
    collaborator: 'ELECFREAKS / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('smartCutebot.description', 'Cutebot with micro:bit by Bluetooth or USB: motors, lights, servos, sensors, LED display and the micro:bit buttons, accelerometer and sensors.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    bluetoothRequired: true,
    category: 'robots',
    helpLink: 'https://wiki.elecfreaks.com/en/microbit/microbit-smart-car/microbit-samrt-cutebot/'
};
