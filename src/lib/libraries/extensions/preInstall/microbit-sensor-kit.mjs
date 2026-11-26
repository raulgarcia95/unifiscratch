/* eslint-disable max-len */
// "Sensores y actuadores" (formerly "Kit micro:bit"): blocks for every sensor and actuator of the three XTEC
// micro:bit kits (primary with challenges, secondary basic, secondary
// advanced). All of them plug into the micro:shield, so this extension shares
// the micro:shield link and firmware (firmware/microshield, orders in kit.ts):
// each block only asks for the port and what to do, as in MakeCode.
// Own code (MIT). Register maps and formulas come from the public datasheets
// (SSD1306, MPU6050, CCS811, BMP280, BMP180, DHT11, NEC IR).
import {getShieldLink} from './microbit-shield-link.mjs';
import {boundedNumber} from './micropython-transport.mjs';
import {colorToRgb} from './unifiscratch-extra-hardware.mjs';
import {deviceIconURL} from './device-icons.mjs';
import {openSetupGuide} from '../setup-guides.mjs';
import {sensorKitTexts} from './microbit-sensor-kit-texts.mjs';
import {actionButton} from './action-buttons.mjs';

const id = 'microbitSensorKit';
const name = 'Sensores y actuadores';
const t = key => ({
    id: `unifiscratch.extensions.sensorKit.${key}`,
    default: sensorKitTexts[key][0],
    description: `Unifiscratch hardware extension text: sensorKit.${key}`
});
const icon = {
    title: 'KIT',
    body: 'MICRO:BIT',
    kind: 'microshield',
    color1: '#0f9d8a',
    color2: '#f59e0b',
    color3: '#0b7568'
};

export const PINS = ['0', '1', '2', '8', '12', '13', '14', '15', '16'];
export const ANALOG_PINS = ['0', '1', '2'];
export const MAX_PUMP_SECONDS = 10;
const CACHE_MS = 60;

// NEC command of each key of the 17-key remote in the kit.
export const IR_KEYS = {
    '1': 0x16, '2': 0x19, '3': 0x0d, '4': 0x0c, '5': 0x18, '6': 0x5e, '7': 0x08, '8': 0x1c, '9': 0x5a, '0': 0x52, '*': 0x42, '#': 0x4a, 'up': 0x46, 'down': 0x15, 'left': 0x44, 'right': 0x43, 'ok': 0x40
};
const IR_NAMES = Object.fromEntries(Object.entries(IR_KEYS).map(([key, code]) => [code, key]));

const integer = (value, min, max) => Math.round(boundedNumber(value, min, max));
const round = (value, digits) => Math.round(value * (10 ** digits)) / (10 ** digits);

export const pinNumber = (value, allowed = PINS) => {
    const pin = String(value).trim()
        .replace(/^P/i, '');
    if (!allowed.includes(pin)) {
        throw new Error(`Pin no permitido: ${value}. Usa ${allowed.map(p => `P${p}`).join(', ')}.`);
    }
    return Number(pin);
};

// The OLED font is plain ASCII plus the degree sign.
export const oledSafe = text => String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ñÑ]/g, c => (c === 'ñ' ? 'n' : 'N'))
    .replace(/[^\x20-\x7e°]/g, '?')
    .slice(0, 21);

// 0..1023 from the micro:bit ADC (3.3 V) to the unit of each sensor.
export const convert = {
    percent: raw => Math.round(raw * 100 / 1023),
    lm35: raw => round(raw * 3300 / 1023 / 10, 1)
};

// Pressure (Pa) to altitude (m) with the standard atmosphere.
export const altitude = pa => round(44330 * (1 - ((pa / 101325) ** (1 / 5.255))), 1);

const onWords = ['1', 'true', 'on', 'high', 'encender', 'encén'];
const isOn = value => onWords.includes(String(value).trim()
    .toLowerCase());

class MicrobitSensorKit {
    constructor (runtime) {
        this.runtime = runtime;
        this.transport = getShieldLink(runtime);
        this.nextId = 1;
        this.cache = new Map();
        this.irSeen = {};
    }

    getInfo () {
        const pin = defaultValue => ({type: 'string', menu: 'pins', defaultValue});
        const analog = defaultValue => ({type: 'string', menu: 'analogPins', defaultValue});
        const state = {type: 'string', menu: 'onOff', defaultValue: '1'};
        return {
            id,
            name,
            color1: icon.color1,
            color2: icon.color2,
            color3: icon.color3,
            blocks: [
                ...actionButton('showHelp', t('showHelp')),
                ...actionButton('connectBluetooth', t('connectBluetooth')),
                ...actionButton('connectUsb', t('connectUsb')),
                {opcode: 'disconnect', blockType: 'command', text: t('disconnect')},
                {opcode: 'isConnected', blockType: 'Boolean', text: t('connected')},
                '---',
                {opcode: 'soil', blockType: 'reporter', text: t('soil'), arguments: {PIN: analog('2')}},
                {opcode: 'light', blockType: 'reporter', text: t('light'), arguments: {PIN: analog('1')}},
                {opcode: 'lm35', blockType: 'reporter', text: t('lm35'), arguments: {PIN: analog('0')}},
                {opcode: 'sound', blockType: 'reporter', text: t('sound'), arguments: {PIN: analog('0')}},
                {opcode: 'analogValue', blockType: 'reporter', text: t('analogValue'), arguments: {PIN: analog('0')}},
                '---',
                {opcode: 'collision', blockType: 'Boolean', text: t('collision'), arguments: {PIN: pin('8')}},
                {opcode: 'line', blockType: 'Boolean', text: t('line'), arguments: {PIN: pin('13')}},
                {opcode: 'pir', blockType: 'Boolean', text: t('pir'), arguments: {PIN: pin('12')}},
                {opcode: 'button', blockType: 'Boolean', text: t('button'), arguments: {PIN: pin('8')}},
                {opcode: 'digitalValue', blockType: 'reporter', text: t('digitalValue'), arguments: {PIN: pin('8')}},
                {opcode: 'distance', blockType: 'reporter', text: t('distance'), arguments: {TRIG: pin('1'), ECHO: pin('2')}},
                '---',
                {
                    opcode: 'dht',
                    blockType: 'reporter',
                    text: t('dht'),
                    arguments: {PIN: pin('8'), VALUE: {type: 'string', menu: 'dhtValues', defaultValue: 'temperature'}}
                },
                {opcode: 'imu', blockType: 'reporter', text: t('imu'), arguments: {AXIS: {type: 'string', menu: 'axes', defaultValue: 'ax'}}},
                {opcode: 'co2', blockType: 'reporter', text: t('co2'), arguments: {VALUE: {type: 'string', menu: 'airValues', defaultValue: 'eco2'}}},
                {opcode: 'baro', blockType: 'reporter', text: t('baro'), arguments: {VALUE: {type: 'string', menu: 'baroValues', defaultValue: 'pressure'}}},
                '---',
                {opcode: 'irKey', blockType: 'reporter', text: t('irKey'), arguments: {PIN: pin('8')}},
                {
                    opcode: 'irPressed',
                    blockType: 'Boolean',
                    text: t('irPressed'),
                    arguments: {KEY: {type: 'string', menu: 'irKeys', defaultValue: '1'}, PIN: pin('8')}
                },
                {
                    opcode: 'irSend',
                    blockType: 'command',
                    text: t('irSend'),
                    arguments: {PIN: pin('1'), CODE: {type: 'number', defaultValue: 22}}
                },
                '---',
                {opcode: 'led', blockType: 'command', text: t('led'), arguments: {PIN: pin('12'), STATE: state}},
                {
                    opcode: 'ledBrightness',
                    blockType: 'command',
                    text: t('ledBrightness'),
                    arguments: {PIN: pin('0'), VALUE: {type: 'number', defaultValue: 50}}
                },
                {
                    opcode: 'rgb',
                    blockType: 'command',
                    text: t('rgb'),
                    arguments: {R: pin('0'), G: pin('1'), B: pin('2'), COLOR: {type: 'color', defaultValue: '#ff8800'}}
                },
                {opcode: 'buzzer', blockType: 'command', text: t('buzzer'), arguments: {PIN: pin('13'), STATE: state}},
                {
                    opcode: 'playTone',
                    blockType: 'command',
                    text: t('playTone'),
                    arguments: {FREQ: {type: 'number', defaultValue: 392}, SECONDS: {type: 'number', defaultValue: 0.5}}
                },
                {opcode: 'relay', blockType: 'command', text: t('relay'), arguments: {PIN: pin('14'), STATE: state}},
                {opcode: 'pump', blockType: 'command', text: t('pump'), arguments: {PIN: pin('15'), STATE: state}},
                {
                    opcode: 'pumpTimed',
                    blockType: 'command',
                    text: t('pumpTimed'),
                    arguments: {PIN: pin('15'), SECONDS: {type: 'number', defaultValue: 2}}
                },
                '---',
                {
                    opcode: 'stripAll',
                    blockType: 'command',
                    text: t('stripAll'),
                    arguments: {PIN: pin('8'), COUNT: {type: 'number', defaultValue: 30}, COLOR: {type: 'color', defaultValue: '#ff0000'}}
                },
                {
                    opcode: 'stripPixel',
                    blockType: 'command',
                    text: t('stripPixel'),
                    arguments: {PIN: pin('8'), INDEX: {type: 'number', defaultValue: 1}, COLOR: {type: 'color', defaultValue: '#0000ff'}}
                },
                {opcode: 'stripOff', blockType: 'command', text: t('stripOff'), arguments: {PIN: pin('8')}},
                {opcode: 'boardLeds', blockType: 'command', text: t('boardLeds'), arguments: {COLOR: {type: 'color', defaultValue: '#00ff00'}}},
                '---',
                {opcode: 'oledClear', blockType: 'command', text: t('oledClear')},
                {
                    opcode: 'oledText',
                    blockType: 'command',
                    text: t('oledText'),
                    arguments: {
                        TEXT: {type: 'string', defaultValue: 'Hola!'},
                        ROW: {type: 'number', defaultValue: 0},
                        COL: {type: 'number', defaultValue: 0}
                    }
                },
                {
                    opcode: 'oledNumber',
                    blockType: 'command',
                    text: t('oledNumber'),
                    arguments: {NUMBER: {type: 'number', defaultValue: 0}, ROW: {type: 'number', defaultValue: 1}}
                },
                '---',
                {
                    opcode: 'servo',
                    blockType: 'command',
                    text: t('servo'),
                    arguments: {SERVO: {type: 'string', menu: 'servos', defaultValue: 'S1'}, ANGLE: {type: 'number', defaultValue: 90}}
                },
                {
                    opcode: 'motor',
                    blockType: 'command',
                    text: t('motor'),
                    arguments: {MOTOR: {type: 'string', menu: 'motors', defaultValue: 'M1'}, SPEED: {type: 'number', defaultValue: 50}}
                },
                {opcode: 'stop', blockType: 'command', text: t('stop')}
            ],
            menus: {
                pins: {acceptReporters: true, items: PINS.map(p => ({text: `P${p}`, value: p}))},
                analogPins: {acceptReporters: true, items: ANALOG_PINS.map(p => ({text: `P${p}`, value: p}))},
                onOff: {acceptReporters: true, items: [{text: t('on'), value: '1'}, {text: t('off'), value: '0'}]},
                dhtValues: {
                    acceptReporters: false,
                    items: [{text: t('temperature'), value: 'temperature'}, {text: t('humidity'), value: 'humidity'}]
                },
                axes: {
                    acceptReporters: false,
                    items: ['accelX', 'accelY', 'accelZ', 'gyroX', 'gyroY', 'gyroZ'].map((key, i) => ({
                        text: t(key), value: ['ax', 'ay', 'az', 'gx', 'gy', 'gz'][i]
                    }))
                },
                airValues: {acceptReporters: false, items: [{text: t('eco2'), value: 'eco2'}, {text: t('tvoc'), value: 'tvoc'}]},
                baroValues: {
                    acceptReporters: false,
                    items: [
                        {text: t('pressure'), value: 'pressure'},
                        {text: t('temperature'), value: 'temperature'},
                        {text: t('altitude'), value: 'altitude'}
                    ]
                },
                irKeys: {
                    acceptReporters: true,
                    items: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#', 'up', 'down', 'left', 'right', 'ok'].map(key => ({
                        text: {up: '▲', down: '▼', left: '◀', right: '▶', ok: 'OK'}[key] || key,
                        value: key
                    }))
                },
                servos: {acceptReporters: true, items: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']},
                motors: {acceptReporters: true, items: ['M1', 'M2', 'M3', 'M4']}
            }
        };
    }

    // ---------- connection (shared with the micro:shield extension) ----------
    showHelp () {
        // Same board and firmware as micro:shield, so the same guide.
        openSetupGuide('microShield');
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

    // Asks the firmware for one value: "X id OP args" -> "X id values".
    // Readings of the same thing within 60 ms share one request.
    query (op) {
        if (!this.transport.isConnected()) return Promise.reject(new Error(this.transport.notConnected));
        const cached = this.cache.get(op);
        if (cached && Date.now() - cached.time < CACHE_MS) return cached.reply;
        const tag = this.nextId;
        this.nextId = (this.nextId % 9999) + 1;
        const reply = this.transport.request(`X ${tag} ${op}`, line => line.startsWith(`X ${tag} `))
            .then(line => {
                const values = line.split(/\s+/).slice(2);
                if (values[0] === 'E') throw new Error(`El sensor no responde (${op.split(' ')[0]}): revisa el cable y el puerto.`);
                return values.map(Number);
            });
        this.cache.set(op, {time: Date.now(), reply});
        reply.catch(() => this.cache.delete(op));
        return reply;
    }

    async analog (args) {
        const [raw] = await this.query(`AR ${pinNumber(args.PIN, ANALOG_PINS)}`);
        return raw;
    }

    async digital (args) {
        const [value] = await this.query(`DR ${pinNumber(args.PIN)}`);
        return value;
    }

    // ---------- analog sensors ----------
    async soil (args) {
        return convert.percent(await this.analog(args));
    }

    async light (args) {
        return convert.percent(await this.analog(args));
    }

    async lm35 (args) {
        return convert.lm35(await this.analog(args));
    }

    async sound (args) {
        return convert.percent(await this.analog(args));
    }

    analogValue (args) {
        return this.analog(args);
    }

    // ---------- digital sensors ----------
    async collision (args) {
        // The switch module pulls its output low when it is pressed.
        return (await this.digital(args)) === 0;
    }

    async line (args) {
        // The reflection sensor gives 1 on black (no light comes back).
        return (await this.digital(args)) === 1;
    }

    async pir (args) {
        return (await this.digital(args)) === 1;
    }

    async button (args) {
        return (await this.digital(args)) === 1;
    }

    digitalValue (args) {
        return this.digital(args);
    }

    async distance (args) {
        const [cm] = await this.query(`US ${pinNumber(args.TRIG)} ${pinNumber(args.ECHO)}`);
        return cm;
    }

    // ---------- DHT11 and I2C sensors ----------
    async dht (args) {
        const [temp, humidity] = await this.query(`DH ${pinNumber(args.PIN)}`);
        return args.VALUE === 'humidity' ? humidity : temp / 100;
    }

    async imu (args) {
        const values = await this.query('IM');
        const index = ['ax', 'ay', 'az', 'gx', 'gy', 'gz'].indexOf(args.AXIS);
        if (index < 0) return 0;
        return index < 3 ? round(values[index] / 1000, 2) : values[index];
    }

    async co2 (args) {
        const [eco2, tvoc] = await this.query('CO');
        return args.VALUE === 'tvoc' ? tvoc : eco2;
    }

    async baro (args) {
        const [pa, temp] = await this.query('BA');
        if (args.VALUE === 'temperature') return temp / 100;
        if (args.VALUE === 'altitude') return altitude(pa);
        return round(pa / 100, 1);
    }

    // ---------- infrared ----------
    async irRead (args) {
        const [code, count] = await this.query(`IR ${pinNumber(args.PIN)}`);
        return {code, count};
    }

    async irKey (args) {
        const {code} = await this.irRead(args);
        if (code < 0) return '';
        return IR_NAMES[code] || String(code);
    }

    // True once for every new press (or repeat while held) of that key.
    async irPressed (args) {
        const key = String(args.KEY).trim()
            .toLowerCase();
        const wanted = key in IR_KEYS ? IR_KEYS[key] : Number(key);
        const {code, count} = await this.irRead(args);
        const seen = `${args.PIN}:${key}`;
        if (code !== wanted || this.irSeen[seen] === count) return false;
        const first = !(seen in this.irSeen);
        this.irSeen[seen] = count;
        // The first look only learns the counter: an old press does not count.
        return !first;
    }

    async irSend (args) {
        await this.query(`IS ${pinNumber(args.PIN)} ${integer(args.CODE, 0, 255)}`);
    }

    // ---------- outputs (micro:shield orders) ----------
    send (line) {
        return this.transport.send(line);
    }

    onOff (args) {
        return this.send(`W ${pinNumber(args.PIN)} ${isOn(args.STATE) ? 1 : 0}`);
    }

    led (args) {
        return this.onOff(args);
    }

    ledBrightness (args) {
        return this.send(`A ${pinNumber(args.PIN)} ${Math.round(integer(args.VALUE, 0, 100) * 1023 / 100)}`);
    }

    async rgb (args) {
        const pins = [args.R, args.G, args.B].map(p => pinNumber(p));
        const {r, g, b} = colorToRgb(args.COLOR);
        const levels = [r, g, b];
        for (let i = 0; i < 3; i++) {
            await this.send(`A ${pins[i]} ${Math.round(levels[i] * 1023 / 255)}`);
        }
    }

    buzzer (args) {
        return this.onOff(args);
    }

    async playTone (args) {
        const freq = integer(args.FREQ, 20, 10000);
        const seconds = boundedNumber(args.SECONDS, 0, 3);
        const epoch = this.transport.epoch;
        await this.send(`B ${freq} ${Math.round(seconds * 1000)}`);
        await this.transport.wait(seconds, epoch);
    }

    relay (args) {
        return this.onOff(args);
    }

    pump (args) {
        return this.onOff(args);
    }

    async pumpTimed (args) {
        const pin = pinNumber(args.PIN);
        const seconds = boundedNumber(args.SECONDS, 0, MAX_PUMP_SECONDS);
        const epoch = this.transport.epoch;
        await this.send(`W ${pin} 1`);
        try {
            await this.transport.wait(seconds, epoch);
        } finally {
            if (this.transport.isConnected()) await this.send(`W ${pin} 0`);
        }
    }

    stripAll (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.send(`L ${pinNumber(args.PIN)} ${integer(args.COUNT, 1, 64)} 0 ${r} ${g} ${b}`);
    }

    stripPixel (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.send(`L ${pinNumber(args.PIN)} 0 ${integer(args.INDEX, 1, 64)} ${r} ${g} ${b}`);
    }

    stripOff (args) {
        return this.send(`L ${pinNumber(args.PIN)} 0 0 0 0 0`);
    }

    boardLeds (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.send(`L 16 4 0 ${r} ${g} ${b}`);
    }

    async oledClear () {
        await this.query('OC');
    }

    async oledText (args) {
        const row = integer(args.ROW, 0, 7);
        const col = integer(args.COL, 0, 20);
        await this.query(`OT ${row} ${col} ${oledSafe(args.TEXT).slice(0, 21 - col)}`);
    }

    async oledNumber (args) {
        const value = Number(args.NUMBER);
        const text = Number.isFinite(value) ? String(round(value, 2)) : '0';
        // OL blanks the rest of the row, so a shorter number erases the old one.
        await this.query(`OL ${integer(args.ROW, 0, 7)} 0 ${text}`);
    }

    servo (args) {
        const servo = Number(String(args.SERVO).trim()
            .replace(/^S/i, ''));
        if (!Number.isInteger(servo) || servo < 0 || servo > 7) throw new Error(`Servo no válido: ${args.SERVO}. Usa S0 a S7.`);
        return this.send(`V ${servo} ${integer(args.ANGLE, 0, 180)}`);
    }

    motor (args) {
        const motor = Number(String(args.MOTOR).trim()
            .replace(/^M/i, ''));
        if (!Number.isInteger(motor) || motor < 1 || motor > 4) throw new Error(`Motor no válido: ${args.MOTOR}. Usa M1 a M4.`);
        // Continuous: the firmware stops it if it hears nothing for 1.5 s.
        return this.send(`M ${motor} ${integer(args.SPEED, -100, 100)} 0`);
    }

    stop () {
        return this.transport.emergencyStop();
    }
}
MicrobitSensorKit.EXTENSION_ID = id;

const iconURL = deviceIconURL('kitSensores');

export const blockClass = MicrobitSensorKit;
export const entry = {
    name,
    extensionId: id,
    collaborator: 'XTEC / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: t('description'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    bluetoothRequired: true,
    category: 'boards',
    helpLink: 'https://projectes.xtec.cat/digital/'
};
