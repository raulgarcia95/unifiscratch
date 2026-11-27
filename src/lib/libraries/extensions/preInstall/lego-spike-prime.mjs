/* eslint-disable max-len */
// LEGO SPIKE Prime hub with the Pybricks firmware, by Web Bluetooth.
// The hub is flashed once with Pybricks (install.pybricks.com, reversible);
// the blocks then type short MicroPython lines into the hub's REPL through
// our own implementation of the Pybricks BLE profile (pybricks-transport.mjs).
import formatMessage from 'format-message';
import {PybricksTransport, pyString} from './pybricks-transport.mjs';
import {bindSafetyEvents, boundedNumber} from './micropython-transport.mjs';
import {colorToRgb, msg} from './unifiscratch-extra-hardware.mjs';
import {deviceIconURL} from './device-icons.mjs';
import {openSetupGuide, pickText} from '../setup-guides.mjs';
import {actionButton} from './action-buttons.mjs';
import {spikePrimeTexts} from './lego-spike-prime-texts.mjs';

const id = 'legoSpikePrime';
const name = 'LEGO SPIKE Prime';
const t = key => msg(`spikePrime.${key}`, spikePrimeTexts[key][0]);
const colors = {color1: '#c026d3', color2: '#a21caf', color3: '#86198f'};

export const PORTS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const COLORS = ['red', 'yellow', 'green', 'blue', 'white', 'black', 'none'];
export const HEART = '0101011111111110111000100';
// 100 % is 1000 degrees per second; Pybricks limits each motor to its own maximum.
export const DEG_PER_PERCENT = 10;
const MAX_MOTOR_SECONDS = 60;
const POLL_MS = 60;

// Python helpers loaded into the REPL once per connection. Each line prints
// "@V <id> 0" so the host knows the hub has finished it.
const statement = code => `${code};print('@V',{id},0)`;
const define = source => statement(`exec(${pyString(source)})`);
export const SETUP = [
    statement('from pybricks.hubs import PrimeHub;from pybricks.parameters import Port,Color,Button'),
    statement('from pybricks.pupdevices import Motor,ColorSensor,UltrasonicSensor,ForceSensor'),
    statement('_h=PrimeHub();_d={}'),
    // The center button would end the REPL: the Bluetooth button stops instead.
    define('try:\n _h.system.set_stop_button(Button.BLUETOOTH)\nexcept Exception:\n pass'),
    define(`_C=((Color.RED,'red'),(Color.YELLOW,'yellow'),(Color.GREEN,'green'),(Color.BLUE,'blue'),(Color.WHITE,'white'),(Color.BLACK,'black'),(Color.NONE,'none'))`),
    // One device object per port, created again if the block asks for another type.
    define('def _g(c,p):\n o=_d.get(p)\n if type(o) is not c:\n  _d[p]=None\n  o=c(getattr(Port,p))\n  if c is ColorSensor:\n   o.detectable_colors([x[0] for x in _C])\n  _d[p]=o\n return o'),
    define("def _r(i,f):\n try:\n  v=f()\n except Exception as e:\n  print('@E',i,type(e).__name__,e)\n  return\n print('@V',i,v)"),
    define("def _cn(p):\n c=_g(ColorSensor,p).color()\n for x in _C:\n  if x[0]==c:\n   return x[1]\n return 'none'"),
    define('def _px(b):\n for i in range(25):\n  _h.display.pixel(i//5,i%5,100 if b>>i&1 else 0)'),
    define('def _s():\n for o in _d.values():\n  if type(o) is Motor:\n   try:\n    o.stop()\n   except Exception:\n    pass')
];

export const port = value => {
    const text = String(value).trim()
        .toUpperCase();
    if (!PORTS.includes(text)) throw new Error(`Puerto no válido: ${value}. Usa A, B, C, D, E o F.`);
    return text;
};

const degPerSecond = value => Math.round(boundedNumber(value, -100, 100) * DEG_PER_PERCENT);

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

// Pybricks colours are hue (degrees), saturation and value (%).
export const rgbToHsv = ({r, g, b}) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;
    if (delta) {
        if (max === r) h = ((g - b) / delta) % 6;
        else if (max === g) h = ((b - r) / delta) + 2;
        else h = ((r - g) / delta) + 4;
    }
    h = Math.round((h * 60) + 360) % 360;
    return {h, s: max ? Math.round((delta / max) * 100) : 0, v: Math.round((max / 255) * 100)};
};

// "OSError [Errno 19] ENODEV" and similar: nothing, or another device, on the port.
const friendly = (error, portName, device) => {
    if (/ENODEV|Errno 19|OSError 19/.test(error.message)) {
        return new Error(`No hay ningún ${device} en el puerto ${portName} (o es otro tipo de dispositivo).`);
    }
    return error;
};

const locale = () => {
    try {
        return formatMessage.setup().locale || 'es';
    } catch (error) {
        return 'es';
    }
};

class SpikePrime {
    constructor (runtime) {
        this.runtime = runtime;
        this.transport = new PybricksTransport(name, {
            setup: SETUP,
            notConnected: 'Conecta el SPIKE Prime (Bluetooth) antes de usar los bloques.'
        });
        bindSafetyEvents(runtime, this.transport);
    }

    getInfo () {
        const portArg = (defaultValue, menu = 'ports') => ({type: 'string', menu, defaultValue});
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
                    opcode: 'motorDegrees',
                    blockType: 'command',
                    text: t('motorDegrees'),
                    arguments: {PORT: portArg('A'), DEGREES: {type: 'number', defaultValue: 360}, SPEED: {type: 'number', defaultValue: 50}}
                },
                {
                    opcode: 'motorSeconds',
                    blockType: 'command',
                    text: t('motorSeconds'),
                    arguments: {PORT: portArg('A'), SECONDS: {type: 'number', defaultValue: 1}, SPEED: {type: 'number', defaultValue: 50}}
                },
                {
                    opcode: 'motorGoTo',
                    blockType: 'command',
                    text: t('motorGoTo'),
                    arguments: {PORT: portArg('A'), ANGLE: {type: 'number', defaultValue: 0}, SPEED: {type: 'number', defaultValue: 50}}
                },
                {
                    opcode: 'motorStart',
                    blockType: 'command',
                    text: t('motorStart'),
                    arguments: {PORT: portArg('A'), SPEED: {type: 'number', defaultValue: 50}}
                },
                {opcode: 'motorStop', blockType: 'command', text: t('motorStop'), arguments: {PORT: portArg('A')}},
                {
                    opcode: 'drive',
                    blockType: 'command',
                    text: t('drive'),
                    arguments: {
                        LEFT_PORT: portArg('A'),
                        RIGHT_PORT: portArg('B'),
                        LEFT: {type: 'number', defaultValue: 50},
                        RIGHT: {type: 'number', defaultValue: 50}
                    }
                },
                {opcode: 'stopAll', blockType: 'command', text: t('stopAll')},
                {opcode: 'resetMotor', blockType: 'command', text: t('resetMotor'), arguments: {PORT: portArg('A')}},
                {opcode: 'motorPosition', blockType: 'reporter', text: t('motorPosition'), arguments: {PORT: portArg('A')}},
                {opcode: 'motorSpeed', blockType: 'reporter', text: t('motorSpeed'), arguments: {PORT: portArg('A')}},
                '---',
                {opcode: 'color', blockType: 'reporter', text: t('color'), arguments: {PORT: portArg('C')}},
                {
                    opcode: 'isColor',
                    blockType: 'Boolean',
                    text: t('isColor'),
                    arguments: {PORT: portArg('C'), COLOR: {type: 'string', menu: 'colors', defaultValue: 'red'}}
                },
                {opcode: 'reflection', blockType: 'reporter', text: t('reflection'), arguments: {PORT: portArg('C')}},
                {opcode: 'ambient', blockType: 'reporter', text: t('ambient'), arguments: {PORT: portArg('C')}},
                {opcode: 'distance', blockType: 'reporter', text: t('distance'), arguments: {PORT: portArg('D')}},
                {opcode: 'force', blockType: 'reporter', text: t('force'), arguments: {PORT: portArg('E')}},
                {opcode: 'forcePressed', blockType: 'Boolean', text: t('forcePressed'), arguments: {PORT: portArg('E')}},
                '---',
                {
                    opcode: 'buttonPressed',
                    blockType: 'Boolean',
                    text: t('buttonPressed'),
                    arguments: {BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'LEFT'}}
                },
                {opcode: 'heading', blockType: 'reporter', text: t('heading')},
                {
                    opcode: 'tilt',
                    blockType: 'reporter',
                    text: t('tilt'),
                    arguments: {AXIS: {type: 'string', menu: 'axes', defaultValue: 'pitch'}}
                },
                {opcode: 'resetHeading', blockType: 'command', text: t('resetHeading')},
                {opcode: 'battery', blockType: 'reporter', text: t('battery')},
                '---',
                {
                    opcode: 'showMatrix',
                    blockType: 'command',
                    text: t('showMatrix'),
                    arguments: {MATRIX: {type: 'matrix', defaultValue: HEART}}
                },
                {
                    opcode: 'showText',
                    blockType: 'command',
                    text: t('showText'),
                    arguments: {TEXT: {type: 'string', defaultValue: 'Hola'}}
                },
                {
                    opcode: 'showNumber',
                    blockType: 'command',
                    text: t('showNumber'),
                    arguments: {NUMBER: {type: 'number', defaultValue: 7}}
                },
                {
                    opcode: 'setPixel',
                    blockType: 'command',
                    text: t('setPixel'),
                    arguments: {
                        ROW: {type: 'number', defaultValue: 3},
                        COLUMN: {type: 'number', defaultValue: 3},
                        BRIGHTNESS: {type: 'number', defaultValue: 100}
                    }
                },
                {opcode: 'clearDisplay', blockType: 'command', text: t('clearDisplay')},
                {
                    opcode: 'centerLight',
                    blockType: 'command',
                    text: t('centerLight'),
                    arguments: {COLOR: {type: 'color', defaultValue: '#00ff66'}}
                },
                {opcode: 'centerLightOff', blockType: 'command', text: t('centerLightOff')},
                {
                    opcode: 'beep',
                    blockType: 'command',
                    text: t('beep'),
                    arguments: {FREQ: {type: 'number', defaultValue: 440}, SECONDS: {type: 'number', defaultValue: 0.5}}
                }
            ],
            menus: {
                ports: {acceptReporters: true, items: PORTS},
                colors: {acceptReporters: true, items: COLORS.map(value => ({text: t(value), value}))},
                buttons: {
                    acceptReporters: true,
                    items: [
                        {text: t('left'), value: 'LEFT'},
                        {text: t('right'), value: 'RIGHT'},
                        {text: t('center'), value: 'CENTER'}
                    ]
                },
                axes: {
                    acceptReporters: true,
                    items: [{text: t('pitch'), value: 'pitch'}, {text: t('roll'), value: 'roll'}]
                }
            }
        };
    }

    showHelp () {
        openSetupGuide(id);
    }

    connectBluetooth () {
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

    // Commands: errors reach Scratch and are kept for «last connection error».
    async command (code, timeout) {
        try {
            return await this.transport.run(code, timeout);
        } catch (error) {
            this.transport.lastError = error.message;
            throw error;
        }
    }

    // Reporters never hang a script: on error they answer `fallback`.
    async read (code, fallback, portName, device) {
        try {
            const value = await this.transport.query(code);
            return value === null ? fallback : value;
        } catch (error) {
            this.transport.lastError = (portName ? friendly(error, portName, device) : error).message;
            return fallback;
        }
    }

    motor (args) {
        return `_g(Motor,'${port(args.PORT)}')`;
    }

    // The hub runs the movement on its own; we poll done() so other blocks
    // can still use the hub. A stop or a lost link stops the motor.
    async untilDone (portName, seconds) {
        const epoch = this.transport.epoch;
        const deadline = Date.now() + (seconds * 1000);
        try {
            while (Date.now() < deadline) {
                await this.transport.wait(POLL_MS, epoch);
                if (await this.transport.run(`_g(Motor,'${portName}').done()`) === true) return;
            }
        } catch (error) {
            this.transport.lastError = friendly(error, portName, 'motor').message;
            throw error;
        }
        // Too long (a blocked motor): stop it rather than wait for ever.
        await this.command(`_g(Motor,'${portName}').stop()`).catch(() => {});
    }

    async motorDegrees (args) {
        const portName = port(args.PORT);
        const speed = degPerSecond(args.SPEED);
        const degrees = Math.round(boundedNumber(args.DEGREES, -100000, 100000));
        if (speed === 0 || degrees === 0) return;
        await this.command(`${this.motor(args)}.run_angle(${speed},${degrees},wait=False)`)
            .catch(error => Promise.reject(friendly(error, portName, 'motor')));
        const seconds = Math.min(MAX_MOTOR_SECONDS, (Math.abs(degrees) / Math.abs(speed)) + 3);
        await this.untilDone(portName, seconds);
    }

    async motorSeconds (args) {
        const portName = port(args.PORT);
        const seconds = boundedNumber(args.SECONDS, 0, MAX_MOTOR_SECONDS);
        const ms = Math.round(seconds * 1000);
        if (ms === 0) return;
        await this.command(`${this.motor(args)}.run_time(${degPerSecond(args.SPEED)},${ms},wait=False)`)
            .catch(error => Promise.reject(friendly(error, portName, 'motor')));
        await this.untilDone(portName, seconds + 3);
    }

    async motorGoTo (args) {
        const portName = port(args.PORT);
        const speed = Math.abs(degPerSecond(args.SPEED));
        if (speed === 0) return;
        const angle = Math.round(boundedNumber(args.ANGLE, -100000, 100000));
        await this.command(`${this.motor(args)}.run_target(${speed},${angle},wait=False)`)
            .catch(error => Promise.reject(friendly(error, portName, 'motor')));
        await this.untilDone(portName, MAX_MOTOR_SECONDS);
    }

    motorStart (args) {
        const portName = port(args.PORT);
        return this.command(`${this.motor(args)}.run(${degPerSecond(args.SPEED)})`)
            .catch(error => Promise.reject(friendly(error, portName, 'motor')));
    }

    motorStop (args) {
        const portName = port(args.PORT);
        return this.command(`${this.motor(args)}.stop()`)
            .catch(error => Promise.reject(friendly(error, portName, 'motor')));
    }

    drive (args) {
        const left = port(args.LEFT_PORT);
        const right = port(args.RIGHT_PORT);
        return this.command(`(_g(Motor,'${left}').run(${degPerSecond(args.LEFT)}),_g(Motor,'${right}').run(${degPerSecond(args.RIGHT)}))`)
            .catch(error => Promise.reject(friendly(error, `${left}/${right}`, 'motor')));
    }

    stopAll () {
        return this.command('_s()');
    }

    resetMotor (args) {
        const portName = port(args.PORT);
        return this.command(`${this.motor(args)}.reset_angle(0)`)
            .catch(error => Promise.reject(friendly(error, portName, 'motor')));
    }

    motorPosition (args) {
        return this.read(`${this.motor(args)}.angle()`, 0, port(args.PORT), 'motor');
    }

    async motorSpeed (args) {
        const value = await this.read(`${this.motor(args)}.speed()`, 0, port(args.PORT), 'motor');
        return Math.round(Number(value) / DEG_PER_PERCENT);
    }

    async color (args) {
        const value = await this.read(`_cn('${port(args.PORT)}')`, 'none', port(args.PORT), 'sensor de color');
        const key = COLORS.includes(value) ? value : 'none';
        return pickText(spikePrimeTexts[key], locale());
    }

    async isColor (args) {
        const wanted = String(args.COLOR).toLowerCase();
        const value = await this.read(`_cn('${port(args.PORT)}')`, '', port(args.PORT), 'sensor de color');
        if (value === wanted) return true;
        // A colour typed or dropped in another language also counts.
        const key = COLORS.find(item => spikePrimeTexts[item].some(text => text.toLowerCase() === wanted));
        return Boolean(key) && key === value;
    }

    reflection (args) {
        return this.read(`_g(ColorSensor,'${port(args.PORT)}').reflection()`, 0, port(args.PORT), 'sensor de color');
    }

    ambient (args) {
        return this.read(`_g(ColorSensor,'${port(args.PORT)}').ambient()`, 0, port(args.PORT), 'sensor de color');
    }

    async distance (args) {
        // Millimetres on the hub; 2000 when nothing is in front.
        const mm = await this.read(`_g(UltrasonicSensor,'${port(args.PORT)}').distance()`, 200 * 10, port(args.PORT), 'sensor de distancia');
        return Math.round(Number(mm)) / 10;
    }

    async force (args) {
        const value = await this.read(`_g(ForceSensor,'${port(args.PORT)}').force()`, 0, port(args.PORT), 'sensor de fuerza');
        return Math.round(Number(value) * 10) / 10;
    }

    async forcePressed (args) {
        return await this.read(`_g(ForceSensor,'${port(args.PORT)}').pressed()`, false, port(args.PORT), 'sensor de fuerza') === true;
    }

    async buttonPressed (args) {
        const button = {LEFT: 'LEFT', RIGHT: 'RIGHT', CENTER: 'CENTER'}[String(args.BUTTON).toUpperCase()] || 'LEFT';
        return await this.read(`Button.${button} in _h.buttons.pressed()`, false) === true;
    }

    heading () {
        return this.read('_h.imu.heading()', 0);
    }

    tilt (args) {
        return this.read(`_h.imu.tilt()[${args.AXIS === 'roll' ? 1 : 0}]`, 0);
    }

    resetHeading () {
        return this.command('_h.imu.reset_heading(0)');
    }

    async battery () {
        const mv = await this.read('_h.battery.voltage()', 0);
        return Math.round(Number(mv) / 10) / 100;
    }

    showMatrix (args) {
        return this.command(`_px(${matrixBits(args.MATRIX)})`);
    }

    showText (args) {
        // display.text scrolls on the hub and returns at the end.
        const text = String(args.TEXT).replace(/[\r\n]/g, ' ')
            .slice(0, 40);
        return this.command(`_h.display.text(${pyString(text)})`, 3000 + (text.length * 700));
    }

    showNumber (args) {
        return this.command(`_h.display.number(${Math.round(boundedNumber(args.NUMBER, -99, 99))})`);
    }

    setPixel (args) {
        const row = Math.round(boundedNumber(args.ROW, 1, 5)) - 1;
        const column = Math.round(boundedNumber(args.COLUMN, 1, 5)) - 1;
        const brightness = Math.round(boundedNumber(args.BRIGHTNESS, 0, 100));
        return this.command(`_h.display.pixel(${row},${column},${brightness})`);
    }

    clearDisplay () {
        return this.command('_h.display.off()');
    }

    centerLight (args) {
        const {h, s, v} = rgbToHsv(colorToRgb(args.COLOR));
        if (v === 0) return this.command('_h.light.off()');
        return this.command(`_h.light.on(Color(${h},${s},${v}))`);
    }

    centerLightOff () {
        return this.command('_h.light.off()');
    }

    beep (args) {
        const freq = Math.round(boundedNumber(args.FREQ, 64, 10000));
        const ms = Math.round(boundedNumber(args.SECONDS, 0, 3) * 1000);
        if (ms === 0) return Promise.resolve();
        return this.command(`_h.speaker.beep(${freq},${ms})`, ms + 3000);
    }
}
SpikePrime.EXTENSION_ID = id;

const iconURL = deviceIconURL('spikePrime');

export const blockClass = SpikePrime;
export const entry = {
    name,
    extensionId: id,
    collaborator: 'LEGO Education / Pybricks / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: t('description'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    bluetoothRequired: true,
    category: 'robots',
    helpLink: 'https://pybricks.com/learn/getting-started/install-pybricks/'
};
