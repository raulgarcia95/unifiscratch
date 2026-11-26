/* eslint-disable max-len */
// micro:bit on a Wappsto:bit board (Seluxit) with the Unifiscratch firmware
// (firmware/wappsto-bit). Bluetooth first, USB as an alternative.
// The micro:bit blocks work live; the Wappsto blocks reach the cloud through
// the board, which the firmware drives over I2C.
import {MicrobitUartTransport} from './microbit-uart-transport.mjs';
import {bindSafetyEvents, boundedNumber} from './micropython-transport.mjs';
import {makeIcon, msg} from './unifiscratch-extra-hardware.mjs';
import {openSetupGuide} from '../setup-guides.mjs';

const id = 'wappstoBit';
const name = 'Wappsto:bit';
const t = (key, text) => msg(`${id}.${key}`, text);
const icon = {title: 'WAPP', body: 'STO:BIT', kind: 'wappsto', color1: '#0f766e', color2: '#facc15', color3: '#134e4a'};

export const HEART = '0101011111111110111000100';
export const NUMBER_IDS = Array.from({length: 15}, (_, i) => String(i + 1));
export const TEXT_IDS = ['16', '17', '18', '19', '20'];
// Same order as the firmware's TEMPLATES table.
export const TEMPLATES = ['temperature', 'light', 'compass', 'acceleration', 'rotation', 'magnetic', 'number', 'latitude', 'longitude', 'sound'];
const MAX_TEXT = 24;

// "D a b temp light ax ay az"
export const parseSensors = line => {
    if (!line.startsWith('D ')) return null;
    const values = line.slice(2).trim()
        .split(/\s+/)
        .map(Number);
    if (values.length < 7 || !values.slice(0, 7).every(Number.isFinite)) return null;
    const [a, b, temperature, light, x, y, z] = values;
    return {a, b, temperature, light, x, y, z};
};

// "E online signal lat lon" (lat/lon may be NaN)
export const parseStatus = line => {
    if (!line.startsWith('E ')) return null;
    const [online, signal, latitude, longitude] = line.slice(2).trim()
        .split(/\s+/);
    if (!Number.isFinite(Number(online)) || !Number.isFinite(Number(signal))) return null;
    const coordinate = value => (Number.isFinite(Number(value)) ? Number(value) : '');
    return {online: Number(online) === 1, signal: Number(signal), latitude: coordinate(latitude), longitude: coordinate(longitude)};
};

// "W id text"
export const parseIncoming = line => {
    const match = /^W (\d+)(?: (.*))?$/.exec(line);
    if (!match) return null;
    return {valueId: Number(match[1]), text: match[2] || ''};
};

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

// One line of text, without line breaks, of limited length.
const line = (value, max = MAX_TEXT) => String(value).replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, max);

const checkedId = (value, ids, kind) => {
    const text = String(Math.round(Number(value)));
    if (!ids.includes(text)) {
        throw new Error(`${kind} de Wappsto: usa un número de ${ids[0]} a ${ids[ids.length - 1]}.`);
    }
    return Number(text);
};
const numberId = value => checkedId(value, NUMBER_IDS, 'Valor numérico');
const textId = value => checkedId(value, TEXT_IDS, 'Valor de texto');
const anyId = value => checkedId(value, NUMBER_IDS.concat(TEXT_IDS), 'Valor');
const pin = value => {
    const number = Number(value);
    if (![0, 1, 2].includes(number)) throw new Error('Pin no permitido. Usa 0, 1 o 2.');
    return number;
};

class WappstoBit {
    constructor (runtime) {
        this.runtime = runtime;
        this.sensors = {a: 0, b: 0, temperature: 0, light: 0, x: 0, y: 0, z: 0};
        this.status = {online: false, signal: 0, latitude: '', longitude: ''};
        this.received = {};
        this.sequence = {};
        this.seen = {};
        this.listening = new Set();
        this.lastSent = {};
        this.transport = new MicrobitUartTransport(name, {
            expect: 'WB',
            notConnected: 'Conecta la micro:bit de la Wappsto:bit (Bluetooth o USB) antes de usar los bloques.',
            noReply: 'La micro:bit no responde: carga el programa de Unifiscratch para Wappsto:bit (ver la guía).',
            onLine: text => this.onLine(text)
        });
        if (runtime) bindSafetyEvents(runtime, this.transport);
    }

    onLine (text) {
        const sensors = parseSensors(text);
        if (sensors) {
            this.sensors = sensors;
            return;
        }
        const status = parseStatus(text);
        if (status) {
            this.status = status;
            return;
        }
        const incoming = parseIncoming(text);
        if (incoming) {
            this.received[incoming.valueId] = incoming.text;
            this.sequence[incoming.valueId] = (this.sequence[incoming.valueId] || 0) + 1;
        }
    }

    getInfo () {
        return {
            id,
            name,
            color1: icon.color1,
            color2: icon.color2,
            color3: icon.color3,
            blocks: [
                {opcode: 'showHelp', blockType: 'command', text: t('showHelp', 'how to connect Wappsto:bit (help)')},
                {opcode: 'connectBluetooth', blockType: 'command', text: t('connectBluetooth', 'connect micro:bit by Bluetooth')},
                {opcode: 'connectUsb', blockType: 'command', text: t('connectUsb', 'connect micro:bit by USB')},
                {opcode: 'disconnect', blockType: 'command', text: t('disconnect', 'disconnect micro:bit')},
                {opcode: 'isConnected', blockType: 'Boolean', text: t('connected', 'micro:bit connected?')},
                {opcode: 'connectionError', blockType: 'reporter', text: msg('connectionError', 'last connection error')},
                '---',
                {
                    opcode: 'setName',
                    blockType: 'command',
                    text: t('setName', 'set up micro:bit on Wappsto with name [NAME]'),
                    arguments: {NAME: {type: 'string', defaultValue: 'Unifiscratch'}}
                },
                {
                    opcode: 'setupNumber',
                    blockType: 'command',
                    text: t('setupNumber', 'set up Wappsto number value [ID] name [NAME] as [TYPE]'),
                    arguments: {
                        ID: {type: 'string', menu: 'numberIds', defaultValue: '1'},
                        NAME: {type: 'string', defaultValue: 'Temperatura'},
                        TYPE: {type: 'string', menu: 'templates', defaultValue: 'temperature'}
                    }
                },
                {
                    opcode: 'setupText',
                    blockType: 'command',
                    text: t('setupText', 'set up Wappsto text value [ID] name [NAME]'),
                    arguments: {
                        ID: {type: 'string', menu: 'textIds', defaultValue: '16'},
                        NAME: {type: 'string', defaultValue: 'Mensaje'}
                    }
                },
                {
                    opcode: 'sendNumber',
                    blockType: 'command',
                    text: t('sendNumber', 'send number [VALUE] to Wappsto value [ID] [WHEN]'),
                    arguments: {
                        VALUE: {type: 'number', defaultValue: 0},
                        ID: {type: 'string', menu: 'numberIds', defaultValue: '1'},
                        WHEN: {type: 'string', menu: 'when', defaultValue: 'change'}
                    }
                },
                {
                    opcode: 'sendText',
                    blockType: 'command',
                    text: t('sendText', 'send text [VALUE] to Wappsto value [ID] [WHEN]'),
                    arguments: {
                        VALUE: {type: 'string', defaultValue: 'Hola'},
                        ID: {type: 'string', menu: 'textIds', defaultValue: '16'},
                        WHEN: {type: 'string', menu: 'when', defaultValue: 'change'}
                    }
                },
                {
                    opcode: 'whenReceived',
                    blockType: 'hat',
                    isEdgeActivated: false,
                    text: t('whenReceived', 'when Wappsto value [ID] is received'),
                    arguments: {ID: {type: 'string', menu: 'allIds', defaultValue: '1'}}
                },
                {
                    opcode: 'receivedValue',
                    blockType: 'reporter',
                    text: t('receivedValue', 'value [ID] received from Wappsto'),
                    arguments: {ID: {type: 'string', menu: 'allIds', defaultValue: '1'}}
                },
                {opcode: 'isOnline', blockType: 'Boolean', text: t('online', 'Wappsto:bit online?')},
                {opcode: 'signal', blockType: 'reporter', text: t('signal', 'Wappsto:bit signal quality (%)')},
                {
                    opcode: 'location',
                    blockType: 'reporter',
                    text: t('location', 'GPS [AXIS]'),
                    arguments: {AXIS: {type: 'string', menu: 'axes', defaultValue: 'latitude'}}
                },
                {opcode: 'clearModel', blockType: 'command', text: t('clearModel', 'clear the micro:bit data on Wappsto')},
                '---',
                {
                    opcode: 'buttonPressed',
                    blockType: 'Boolean',
                    text: t('buttonPressed', 'button [BUTTON] pressed?'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'a'}}
                },
                {opcode: 'temperature', blockType: 'reporter', text: t('temperature', 'temperature (°C)')},
                {opcode: 'lightLevel', blockType: 'reporter', text: t('lightLevel', 'light level')},
                {
                    opcode: 'acceleration',
                    blockType: 'reporter',
                    text: t('acceleration', 'acceleration [DIRECTION] (mg)'),
                    arguments: {DIRECTION: {type: 'string', menu: 'directions', defaultValue: 'x'}}
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
                {opcode: 'clearDisplay', blockType: 'command', text: t('clearDisplay', 'clear display')},
                {
                    opcode: 'playTone',
                    blockType: 'command',
                    text: t('playTone', 'play tone [FREQ] Hz for [SECONDS] s'),
                    arguments: {
                        FREQ: {type: 'number', defaultValue: 440},
                        SECONDS: {type: 'number', defaultValue: 0.5}
                    }
                },
                '---',
                {
                    opcode: 'digitalWrite',
                    blockType: 'command',
                    text: t('digitalWrite', 'set pin [PIN] digital to [VALUE]'),
                    arguments: {
                        PIN: {type: 'string', menu: 'pins', defaultValue: '0'},
                        VALUE: {type: 'string', menu: 'onOff', defaultValue: '1'}
                    }
                },
                {
                    opcode: 'analogWrite',
                    blockType: 'command',
                    text: t('analogWrite', 'set pin [PIN] analog to [VALUE] (0-1023)'),
                    arguments: {
                        PIN: {type: 'string', menu: 'pins', defaultValue: '0'},
                        VALUE: {type: 'number', defaultValue: 512}
                    }
                },
                {
                    opcode: 'readPin',
                    blockType: 'reporter',
                    text: t('readPin', 'read pin [PIN] [MODE]'),
                    arguments: {
                        PIN: {type: 'string', menu: 'pins', defaultValue: '0'},
                        MODE: {type: 'string', menu: 'modes', defaultValue: 'a'}
                    }
                }
            ],
            menus: {
                numberIds: {acceptReporters: true, items: NUMBER_IDS},
                textIds: {acceptReporters: true, items: TEXT_IDS},
                allIds: {acceptReporters: true, items: NUMBER_IDS.concat(TEXT_IDS)},
                templates: {
                    acceptReporters: false,
                    items: [
                        {text: t('tplTemperature', 'temperature'), value: 'temperature'},
                        {text: t('tplLight', 'light level'), value: 'light'},
                        {text: t('tplCompass', 'compass'), value: 'compass'},
                        {text: t('tplAcceleration', 'acceleration'), value: 'acceleration'},
                        {text: t('tplRotation', 'rotation'), value: 'rotation'},
                        {text: t('tplMagnetic', 'magnetic field'), value: 'magnetic'},
                        {text: t('tplNumber', 'number'), value: 'number'},
                        {text: t('tplLatitude', 'latitude'), value: 'latitude'},
                        {text: t('tplLongitude', 'longitude'), value: 'longitude'},
                        {text: t('tplSound', 'sound level'), value: 'sound'}
                    ]
                },
                when: {
                    acceptReporters: false,
                    items: [
                        {text: t('ifChanged', 'if changed'), value: 'change'},
                        {text: t('always', 'always'), value: 'always'}
                    ]
                },
                axes: {
                    acceptReporters: false,
                    items: [
                        {text: t('latitude', 'latitude'), value: 'latitude'},
                        {text: t('longitude', 'longitude'), value: 'longitude'}
                    ]
                },
                buttons: {acceptReporters: true, items: [{text: 'A', value: 'a'}, {text: 'B', value: 'b'}]},
                directions: {acceptReporters: true, items: ['x', 'y', 'z']},
                pins: {acceptReporters: true, items: ['0', '1', '2']},
                onOff: {
                    acceptReporters: true,
                    items: [
                        {text: msg('high', 'on'), value: '1'},
                        {text: msg('low', 'off'), value: '0'}
                    ]
                },
                modes: {
                    acceptReporters: false,
                    items: [
                        {text: t('analog', 'analog'), value: 'a'},
                        {text: t('digital', 'digital'), value: 'd'}
                    ]
                }
            }
        };
    }

    showHelp () {
        openSetupGuide(id);
    }

    async connect (kind) {
        this.listening.clear();
        this.lastSent = {};
        await (kind === 'ble' ? this.transport.connectBluetooth() : this.transport.connectUsb());
    }

    connectBluetooth () {
        return this.connect('ble');
    }

    connectUsb () {
        return this.connect('usb');
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

    // ---------- Wappsto ----------

    setName (args) {
        const text = line(args.NAME) || 'Unifiscratch';
        return this.transport.send(`N ${text}`);
    }

    setupNumber (args) {
        const valueId = numberId(args.ID);
        const template = Math.max(0, TEMPLATES.indexOf(String(args.TYPE)));
        return this.transport.send(`V ${valueId} ${template} ${line(args.NAME) || `Valor ${valueId}`}`);
    }

    setupText (args) {
        const valueId = textId(args.ID);
        return this.transport.send(`G ${valueId} ${line(args.NAME) || `Texto ${valueId}`}`);
    }

    sendValue (command, valueId, text, when) {
        if (when !== 'always' && this.lastSent[valueId] === text) return Promise.resolve();
        this.lastSent[valueId] = text;
        return this.transport.send(`${command} ${valueId} ${text}`);
    }

    sendNumber (args) {
        const valueId = numberId(args.ID);
        const value = Number(args.VALUE);
        if (!Number.isFinite(value)) throw new Error('El valor debe ser un número finito.');
        // Wappsto works with plain decimals; avoid exponents and long tails.
        const text = String(Number(value.toFixed(6)));
        return this.sendValue('U', valueId, text, args.WHEN);
    }

    sendText (args) {
        return this.sendValue('X', textId(args.ID), line(args.VALUE), args.WHEN);
    }

    // Wappsto only lets the dashboard change a value the micro:bit offers.
    listen (valueId) {
        if (this.listening.has(valueId) || !this.isConnected()) return;
        this.listening.add(valueId);
        this.transport.send(`L ${valueId}`).catch(() => this.listening.delete(valueId));
    }

    whenReceived (args, util) {
        const valueId = anyId(args.ID);
        this.listen(valueId);
        const key = `${util && util.target ? util.target.id : ''}:${valueId}`;
        const current = this.sequence[valueId] || 0;
        if (typeof this.seen[key] === 'undefined') {
            this.seen[key] = current;
            return false;
        }
        if (current === this.seen[key]) return false;
        this.seen[key] = current;
        return true;
    }

    receivedValue (args) {
        const valueId = anyId(args.ID);
        this.listen(valueId);
        const text = this.received[valueId];
        if (typeof text === 'undefined') return '';
        if (valueId <= 15 && text.trim() !== '' && Number.isFinite(Number(text))) return Number(text);
        return text;
    }

    isOnline () {
        return this.isConnected() && this.status.online;
    }

    signal () {
        return this.status.signal;
    }

    location (args) {
        return this.status[args.AXIS === 'longitude' ? 'longitude' : 'latitude'];
    }

    clearModel () {
        this.lastSent = {};
        return this.transport.send('Z');
    }

    // ---------- micro:bit ----------

    buttonPressed (args) {
        return this.sensors[String(args.BUTTON).toLowerCase() === 'b' ? 'b' : 'a'] === 1;
    }

    temperature () {
        return this.sensors.temperature;
    }

    lightLevel () {
        return this.sensors.light;
    }

    acceleration (args) {
        const axis = String(args.DIRECTION).toLowerCase();
        return this.sensors[['x', 'y', 'z'].includes(axis) ? axis : 'x'];
    }

    showMatrix (args) {
        return this.transport.send(`I ${matrixBits(args.MATRIX)}`);
    }

    showText (args) {
        return this.transport.send(`T ${line(args.TEXT, 40)}`);
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

    digitalWrite (args) {
        return this.transport.send(`P ${pin(args.PIN)} ${Number(args.VALUE) === 1 ? 1 : 0}`);
    }

    analogWrite (args) {
        return this.transport.send(`A ${pin(args.PIN)} ${Math.round(boundedNumber(args.VALUE, 0, 1023))}`);
    }

    async readPin (args) {
        const number = pin(args.PIN);
        const mode = args.MODE === 'd' ? 'd' : 'a';
        if (!this.isConnected()) await this.transport.send('K'); // reports how to connect
        const reply = await this.transport.request(`R ${number} ${mode}`, text => text.startsWith(`R ${number} `));
        return Number(reply.split(' ')[2]) || 0;
    }
}
WappstoBit.EXTENSION_ID = id;

const iconURL = makeIcon(icon);

export const blockClass = WappstoBit;
export const entry = {
    name,
    extensionId: id,
    collaborator: 'Seluxit / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('wappstoBit.description', 'micro:bit on Wappsto:bit by Bluetooth or USB: send and receive Wappsto cloud data, sensors, LED display and pins.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    bluetoothRequired: true,
    category: 'boards',
    helpLink: 'https://bit.wappsto.com/'
};
