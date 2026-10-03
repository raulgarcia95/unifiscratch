/* eslint-disable max-len */
import {MicroPythonTransport, bindSafetyEvents, boundedMotion, boundedNumber} from './micropython-transport.mjs';

const clamp = boundedNumber;
const msg = (id, defaultText) => ({
    id: `unifiscratch.extensions.${id}`,
    default: defaultText,
    description: `Unifiscratch hardware extension text: ${id}`
});

const colorToRgb = color => {
    const hex = String(color || '#000000')
        .replace('#', '')
        .trim();
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return {r: 0, g: 0, b: 0};
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
    };
};

const iconArt = ({kind, color1, color2}) => {
    switch (kind) {
    case 'arduino':
        return `<rect x="68" y="72" width="184" height="86" rx="24" fill="#fff" stroke="#0f766e" stroke-width="8"/>
<circle cx="114" cy="115" r="26" fill="none" stroke="${color1}" stroke-width="10"/>
<path d="M188 90c26 0 42 14 42 28s-16 28-42 28c-20 0-32-10-48-28 16-18 28-28 48-28z" fill="none" stroke="${color1}" stroke-width="10"/>
<path d="M177 118h24M189 106v24M97 115h34" stroke="${color1}" stroke-width="7" stroke-linecap="round"/>
<rect x="84" y="58" width="64" height="12" rx="4" fill="#d1d5db"/><rect x="176" y="58" width="54" height="12" rx="4" fill="#d1d5db"/>`;
    case 'esp32':
        return `<rect x="83" y="58" width="154" height="116" rx="16" fill="#172554" stroke="#fff" stroke-width="8"/>
<rect x="111" y="86" width="98" height="58" rx="10" fill="#e5e7eb"/>
<rect x="124" y="99" width="72" height="32" rx="6" fill="${color1}"/>
<path d="M94 73v86M226 73v86" stroke="#f8fafc" stroke-width="5" stroke-dasharray="5 7"/>
<path d="M138 55v-17h44v17" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`;
    case 'microshield':
        return `<rect x="86" y="64" width="148" height="100" rx="22" fill="#fff" stroke="#16a34a" stroke-width="9"/>
<rect x="116" y="88" width="88" height="52" rx="12" fill="#111827"/>
<circle cx="132" cy="105" r="5" fill="${color2}"/><circle cx="160" cy="105" r="5" fill="${color2}"/><circle cx="188" cy="105" r="5" fill="${color2}"/>
<path d="M105 78v72M215 78v72" stroke="#d1d5db" stroke-width="7" stroke-dasharray="7 7"/>
<path d="M133 132h54" stroke="${color1}" stroke-width="6" stroke-linecap="round"/>`;
    case 'wappsto':
        return `<rect x="83" y="67" width="154" height="94" rx="28" fill="#fff" stroke="#0f766e" stroke-width="9"/>
<path d="M113 117c17-24 32-24 47 0s30 24 47 0" fill="none" stroke="${color1}" stroke-width="12" stroke-linecap="round"/>
<circle cx="116" cy="90" r="8" fill="${color2}"/><circle cx="204" cy="90" r="8" fill="${color2}"/>
<path d="M111 146h98" stroke="#d1d5db" stroke-width="7" stroke-linecap="round"/>`;
    case 'board':
        return `<rect x="64" y="58" width="192" height="112" rx="18" fill="#fff" stroke="${color2}" stroke-width="10"/>
<circle cx="96" cy="90" r="10" fill="${color1}"/><circle cx="224" cy="90" r="10" fill="${color1}"/>
<circle cx="96" cy="138" r="10" fill="${color1}"/><circle cx="224" cy="138" r="10" fill="${color1}"/>
<path d="M122 114h76M160 82v64" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>`;
    case 'cutebot':
        return `<path d="M82 124l18-38c5-11 16-18 29-18h62c13 0 24 7 29 18l18 38" fill="#fff"/>
<rect x="61" y="112" width="198" height="58" rx="22" fill="#fff" stroke="${color2}" stroke-width="9"/>
<circle cx="103" cy="176" r="24" fill="#111827"/><circle cx="217" cy="176" r="24" fill="#111827"/>
<circle cx="103" cy="176" r="10" fill="${color1}"/><circle cx="217" cy="176" r="10" fill="${color1}"/>
<circle cx="126" cy="98" r="10" fill="${color1}"/><circle cx="194" cy="98" r="10" fill="${color1}"/>
<path d="M136 135h48" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>`;
    case 'edison':
        return `<rect x="70" y="83" width="180" height="74" rx="24" fill="#fff" stroke="#334155" stroke-width="9"/>
<circle cx="104" cy="163" r="27" fill="#111827"/><circle cx="216" cy="163" r="27" fill="#111827"/>
<circle cx="104" cy="163" r="9" fill="${color2}"/><circle cx="216" cy="163" r="9" fill="${color2}"/>
<rect x="115" y="101" width="90" height="30" rx="8" fill="${color1}" opacity=".9"/>
<path d="M95 79v-20M225 79v-20" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`;
    case 'bluebot':
        return `<ellipse cx="160" cy="121" rx="86" ry="60" fill="#fff" stroke="#0284c7" stroke-width="9"/>
<circle cx="130" cy="110" r="11" fill="${color1}"/><circle cx="190" cy="110" r="11" fill="${color1}"/>
<path d="M135 139c16 13 34 13 50 0" fill="none" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>
<path d="M160 61V39M120 70l-16-18M200 70l16-18" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
<path d="M96 121H68M252 121h-28" stroke="${color2}" stroke-width="11" stroke-linecap="round"/>`;
    case 'car':
        return `<path d="M66 141l20-43c6-13 18-21 33-21h82c15 0 27 8 33 21l20 43" fill="#fff"/>
<rect x="54" y="121" width="212" height="54" rx="20" fill="#fff" stroke="${color2}" stroke-width="9"/>
<circle cx="99" cy="179" r="22" fill="${color1}"/><circle cx="221" cy="179" r="22" fill="${color1}"/>
<rect x="116" y="88" width="88" height="32" rx="10" fill="${color1}" opacity=".9"/>`;
    case 'dash':
        return `<circle cx="160" cy="112" r="62" fill="#fff" stroke="#0ea5e9" stroke-width="10"/>
<circle cx="137" cy="104" r="9" fill="${color1}"/><circle cx="183" cy="104" r="9" fill="${color1}"/>
<path d="M137 135c15 12 31 12 46 0" fill="none" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>
<circle cx="102" cy="169" r="19" fill="#1f2937"/><circle cx="218" cy="169" r="19" fill="#1f2937"/>
<path d="M101 71l-18-22M219 71l18-22" stroke="#fff" stroke-width="8" stroke-linecap="round"/>`;
    case 'sensor':
        return `<circle cx="160" cy="108" r="62" fill="#fff" stroke="${color2}" stroke-width="10"/>
<circle cx="138" cy="103" r="9" fill="${color1}"/><circle cx="182" cy="103" r="9" fill="${color1}"/>
<path d="M135 132c14 12 36 12 50 0" fill="none" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>
<path d="M88 57c37-34 107-34 144 0M68 37c50-48 134-48 184 0" fill="none"
 stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".85"/>`;
    case 'pose':
        return `<circle cx="160" cy="73" r="20" fill="#fff"/>
<path d="M160 94v48M118 116h84M160 142l-38 42M160 142l38 42" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round"/>
<circle cx="118" cy="116" r="9" fill="${color2}"/><circle cx="202" cy="116" r="9" fill="${color2}"/>
<circle cx="122" cy="184" r="9" fill="${color2}"/><circle cx="198" cy="184" r="9" fill="${color2}"/>`;
    case 'hand':
        return `<path d="M113 155V98c0-9 13-9 13 0v42V80c0-10 15-10 15 0v56V72c0-10 16-10 16 0v62V84c0-10 15-10 15 0v66l12-18c6-8 18-1 14 8l-23 48c-4 9-13 14-23 14h-34c-20 0-36-16-36-36v-11c0-10 15-10 15 0z" fill="#fff" stroke="${color2}" stroke-width="7" stroke-linejoin="round"/>`;
    case 'face':
        return `<circle cx="160" cy="110" r="62" fill="#fff" stroke="${color2}" stroke-width="9"/>
<path d="M119 96c11-9 25-9 36 0M165 96c11-9 25-9 36 0M137 137c15 15 31 15 46 0" fill="none" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>
<path d="M97 88h126M97 132h126M126 54v112M194 54v112" stroke="${color1}" stroke-width="4" opacity=".28"/>`;
    case 'classifier':
        return `<rect x="78" y="65" width="164" height="112" rx="24" fill="#fff" stroke="${color2}" stroke-width="9"/>
<rect x="103" y="90" width="51" height="37" rx="8" fill="${color1}" opacity=".88"/>
<circle cx="193" cy="108" r="19" fill="${color2}" opacity=".95"/>
<path d="M104 150h112M104 164h84" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>`;
    case 'ai':
        return `<rect x="88" y="58" width="144" height="112" rx="30" fill="#fff" stroke="${color2}" stroke-width="10"/>
<circle cx="130" cy="108" r="10" fill="${color1}"/><circle cx="190" cy="108" r="10" fill="${color1}"/>
<path d="M122 137c20 14 56 14 76 0" fill="none" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>
<path d="M160 58V31M127 170l-22 24M193 170l22 24" stroke="#fff" stroke-width="9" stroke-linecap="round"/>`;
    default:
        return `<rect x="50" y="76" width="156" height="88" rx="26" fill="#fff"/>
<circle cx="94" cy="117" r="10" fill="${color1}"/>
<circle cx="162" cy="117" r="10" fill="${color1}"/>
<path d="M102 142c18 15 42 15 60 0" fill="none" stroke="${color1}" stroke-width="9" stroke-linecap="round"/>`;
    }
};

const makeIcon = ({title, body, color1, color2, kind}) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
<rect width="320" height="240" rx="24" fill="${color1}"/>
<circle cx="246" cy="62" r="42" fill="${color2}" opacity=".9"/>
${iconArt({kind, color1, color2})}
<text x="160" y="204" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="31"
 font-weight="700" fill="#fff">${title}</text>
<text x="160" y="228" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17"
 font-weight="700" fill="#fff" opacity=".9">${body}</text>
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const createMicroPythonBoard = ({id, name, collaborator, icon, description, helpLink, board = 'microbit'}) => {
    const blockClass = class MicroPythonBoard {
        constructor (runtime) {
            this.isMicrobit = board === 'microbit';
            this.pins = this.isMicrobit ? [0, 1, 2] : [2, 4, 13, 14, 25, 26, 27, 32, 33];
            const probe = this.isMicrobit ? 'import microbit' :
                "import sys\nassert sys.platform == 'esp32'\nfrom machine import Pin, PWM";
            this.transport = new MicroPythonTransport(name, {
                probe: `${probe}\n_unifi_pins = {}`,
                stop: this.isMicrobit ?
                    'for _pin in _unifi_pins.values():\n    _pin.write_digital(0)' :
                    'for _pin in _unifi_pins.values():\n    _pin.value(0)'
            });
            bindSafetyEvents(runtime, this.transport);
        }

        checkedPin (value) {
            const pin = Number(value);
            if (!Number.isInteger(pin) || !this.pins.includes(pin)) {
                throw new Error(`Pin no permitido. Usa: ${this.pins.join(', ')}.`);
            }
            return pin;
        }

        getInfo () {
            return {
                id,
                name,
                color1: icon.color1,
                color2: icon.color2,
                color3: icon.color3,
                blocks: [
                    {opcode: 'connect', blockType: 'command', text: msg('connectUsb', 'connect by USB')},
                    {opcode: 'disconnect', blockType: 'command', text: msg('disconnect', 'disconnect')},
                    {opcode: 'isConnected', blockType: 'Boolean', text: msg('connected', 'connected?')},
                    {opcode: 'connectionError',
                        blockType: 'reporter',
                        text: msg('connectionError', 'last connection error')},
                    '---',
                    {
                        opcode: 'digitalWrite',
                        blockType: 'command',
                        text: msg('pinDigitalWriteTimed', 'pin [PIN] digital [VALUE] for [SECONDS] s (max 5)'),
                        arguments: {
                            PIN: {type: 'number', defaultValue: 2},
                            VALUE: {type: 'string', menu: 'digitalValues', defaultValue: '1'},
                            SECONDS: {type: 'number', defaultValue: 1}
                        }
                    },
                    {
                        opcode: 'pwmWrite',
                        blockType: 'command',
                        text: msg('pinPwmWriteTimed', 'pin [PIN] PWM [VALUE] frequency [FREQ] for [SECONDS] s (max 5)'),
                        arguments: {
                            PIN: {type: 'number', defaultValue: 2},
                            VALUE: {type: 'number', defaultValue: 512},
                            FREQ: {type: 'number', defaultValue: 1000},
                            SECONDS: {type: 'number', defaultValue: 1}
                        }
                    }

                ],
                menus: {
                    digitalValues: {
                        acceptReporters: true,
                        items: [
                            {text: msg('high', 'on'), value: '1'},
                            {text: msg('low', 'off'), value: '0'}
                        ]
                    }
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

        digitalWrite (args) {
            const pin = this.checkedPin(args.PIN);
            const value = Number(args.VALUE) === 1 ? 1 : 0;
            const setup = this.isMicrobit ?
                `_pin = microbit.pin${pin}\n_unifi_pins[${pin}] = _pin` :
                `_pin = Pin(${pin}, Pin.OUT)\n_unifi_pins[${pin}] = _pin`;
            const write = this.isMicrobit ? '_pin.write_digital' : '_pin.value';
            return this.transport.runPython(boundedMotion(
                setup, `${write}(${value})`, `${write}(0)`, typeof args.SECONDS === 'undefined' ? 1 : args.SECONDS
            ));
        }

        pwmWrite (args) {
            const pin = this.checkedPin(args.PIN);
            const value = Math.round(clamp(args.VALUE, 0, 1023));
            const freq = Math.round(clamp(args.FREQ, 1, this.isMicrobit ? 3906 : 40000));
            const setup = this.isMicrobit ?
                `_pin = microbit.pin${pin}\n_unifi_pins[${pin}] = _pin` :
                `_pin = Pin(${pin})\n_unifi_pins[${pin}] = _pin\n_pwm = PWM(_pin, freq=${freq}, duty=0)`;
            const movement = this.isMicrobit ?
                `_pin.write_analog(${value}); _pin.set_analog_period_microseconds(${Math.round(1000000 / freq)})` :
                `_pwm.duty(${value})`;
            const stop = this.isMicrobit ? '_pin.write_digital(0)' : '_pwm.deinit(); _pin.init(Pin.OUT); _pin.value(0)';
            return this.transport.runPython(boundedMotion(
                setup, movement, stop, typeof args.SECONDS === 'undefined' ? 1 : args.SECONDS
            ));
        }

        runPython () {
            throw new Error('La ejecución libre de Python está desactivada para este dispositivo.');
        }

    };
    blockClass.EXTENSION_ID = id;
    const iconURL = makeIcon(icon);
    return {
        entry: {
            name,
            extensionId: id,
            collaborator,
            iconURL,
            insetIconURL: iconURL,
            description,
            tags: ['device', 'hardware'],
            featured: true,
            disabled: false,
            category: icon.category || 'boards',
            helpLink
        },
        blockClass
    };
};

const smartCutebot = (() => {
    const id = 'smartCutebot';
    const name = 'Smart Cutebot';
    const icon = {
        title: 'CUTE',
        body: 'MICROBIT',
        kind: 'cutebot',
        color1: '#ef6c00',
        color2: '#5b21b6',
        color3: '#8a3d00'
    };
    const blockClass = class SmartCutebot {
        constructor (runtime) {
            this.transport = new MicroPythonTransport(name, {
                probe: 'from Cutebot import *\nct = CUTEBOT()\nassert callable(ct.set_motors_speed)',
                stop: 'ct.set_motors_speed(0, 0)'
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
                    {
                        opcode: 'connect',
                        blockType: 'command',
                        text: msg(`${id}.connect`, 'conectar micro:bit por USB')
                    },
                    {
                        opcode: 'disconnect',
                        blockType: 'command',
                        text: msg(`${id}.disconnect`, 'desconectar Smart Cutebot')
                    },
                    {
                        opcode: 'isConnected',
                        blockType: 'Boolean',
                        text: msg(`${id}.connected`, 'Smart Cutebot conectado?')
                    },
                    {opcode: 'connectionError',
                        blockType: 'reporter',
                        text: msg('connectionError', 'last connection error')},
                    '---',
                    {
                        opcode: 'drive',
                        blockType: 'command',
                        text: msg(`${id}.driveTimed`, 'motores izquierda [LEFT] derecha [RIGHT] durante [SECONDS] s (máx. 5)'),
                        arguments: {
                            LEFT: {type: 'number', defaultValue: 50},
                            RIGHT: {type: 'number', defaultValue: 50},
                            SECONDS: {type: 'number', defaultValue: 1}
                        }
                    },
                    {opcode: 'stop', blockType: 'command', text: msg(`${id}.stop`, 'parar Smart Cutebot')},
                    {
                        opcode: 'headlight',
                        blockType: 'command',
                        text: msg(`${id}.headlight`, 'luz [LIGHT] color [COLOR]'),
                        arguments: {
                            LIGHT: {type: 'string', menu: 'lights', defaultValue: 'left'},
                            COLOR: {type: 'color', defaultValue: '#ff9900'}
                        }
                    },
                    {
                        opcode: 'servo',
                        blockType: 'command',
                        text: msg(`${id}.servo`, 'servo [SERVO] angulo [ANGLE]'),
                        arguments: {
                            SERVO: {type: 'number', defaultValue: 1},
                            ANGLE: {type: 'number', defaultValue: 90}
                        }
                    }

                ],
                menus: {
                    lights: {
                        acceptReporters: true,
                        items: [
                            {text: msg(`${id}.left`, 'izquierda'), value: 'left'},
                            {text: msg(`${id}.right`, 'derecha'), value: 'right'}
                        ]
                    }
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

        drive (args) {
            const left = clamp(args.LEFT, -100, 100);
            const right = clamp(args.RIGHT, -100, 100);
            return this.transport.runPython(
                boundedMotion('', `ct.set_motors_speed(${left}, ${right})`,
                    'ct.set_motors_speed(0, 0)', typeof args.SECONDS === 'undefined' ? 1 : args.SECONDS)
            );
        }

        stop () {
            return this.transport.emergencyStop();
        }

        headlight (args) {
            const {r, g, b} = colorToRgb(args.COLOR);
            const light = args.LIGHT === 'right' ? 'right' : 'left';
            return this.transport.runPython(
                `ct.set_car_light(${light}, ${r}, ${g}, ${b})`
            );
        }

        servo (args) {
            const servo = Math.round(clamp(args.SERVO, 1, 2));
            const angle = Math.round(clamp(args.ANGLE, 0, 180));
            return this.transport.runPython(
                `ct.set_servo(${servo}, ${angle})`
            );
        }

        runPython () {
            throw new Error('La ejecución libre de Python está desactivada para este dispositivo.');
        }
    };
    blockClass.EXTENSION_ID = id;
    const iconURL = makeIcon(icon);
    return {
        entry: {
            name,
            extensionId: id,
            collaborator: 'ELECFREAKS / Unifiscratch',
            iconURL,
            insetIconURL: iconURL,
            description: msg('smartCutebot.description',
                'USB control for Smart Cutebot using micro:bit MicroPython and Cutebot.py.'),
            tags: ['device', 'hardware'],
            featured: true,
            disabled: false,
            category: 'robots',
            helpLink: 'https://wiki.elecfreaks.com/en/microbit/microbit-smart-car/microbit-samrt-cutebot/cutebot-python/'
        },
        blockClass
    };
})();

const createInfoExtension = ({
    id,
    name,
    collaborator,
    icon,
    description,
    helpLink,
    message,
    category = 'boards',
    tags
}) => {
    const blockClass = class InfoExtension {
        getInfo () {
            return {
                id,
                name,
                color1: icon.color1,
                color2: icon.color2,
                color3: icon.color3,
                blocks: [
                    {
                        opcode: 'showInfo',
                        blockType: 'command',
                        text: msg('info', 'device information')
                    }
                ]
            };
        }

        showInfo () {
            throw new Error(message);
        }
    };
    blockClass.EXTENSION_ID = id;
    const iconURL = makeIcon(icon);
    return {
        entry: {
            name,
            extensionId: id,
            collaborator,
            iconURL,
            insetIconURL: iconURL,
            description,
            tags: tags || ['device', 'hardware'],
            featured: true,
            disabled: true,
            category,
            helpLink
        },
        blockClass
    };
};

const entries = [
    createInfoExtension({
        id: 'ed1Board',
        name: 'ED1',
        collaborator: 'Unifiscratch',
        message: 'ED1 pendiente: no se ha verificado firmware, protocolo ni mapa de pines.',
        icon: {title: 'ED1', body: 'FIRMATA', kind: 'arduino', color1: '#7c3aed', color2: '#22c55e', color3: '#4c1d95'},
        description: msg('ed1Board.description', 'Experimental USB control for ED1 boards compatible with Firmata.'),
        helpLink: 'https://docs.arduino.cc/built-in-examples/communication/StandardFirmata/'
    }),
    createMicroPythonBoard({
        id: 'keyestudioEsp32',
        board: 'esp32',
        name: 'Keyestudio ESP32',
        collaborator: 'Keyestudio / Unifiscratch',
        icon: {
            title: 'ESP32',
            body: 'KEYESTUDIO',
            kind: 'esp32',
            color1: '#2563eb',
            color2: '#f97316',
            color3: '#1e3a8a'
        },
        description: msg('keyestudioEsp32.description', 'USB control for Keyestudio ESP32 with MicroPython firmware.'),
        helpLink: 'https://docs.keyestudio.com/projects/KS0809/en/latest/docs/ESP32/Software_Tutorial.html'
    }),
    createMicroPythonBoard({
        id: 'microShield',
        name: 'Micro:Shield',
        collaborator: 'micro:bit / Unifiscratch',
        icon: {title: 'MICRO', body: 'SHIELD', kind: 'microshield', color1: '#16a34a', color2: '#8b5cf6', color3: '#166534'},
        description: msg('microShield.description', 'MicroPython USB blocks for micro:bit with Micro:Shield.'),
        helpLink: 'https://microbit.org/'
    }),
    createMicroPythonBoard({
        id: 'wappstoBit',
        name: 'Wappsto:Bit',
        collaborator: 'Seluxit / Unifiscratch',
        icon: {title: 'WAPP', body: 'STO:BIT', kind: 'wappsto', color1: '#0f766e', color2: '#facc15', color3: '#134e4a'},
        description: msg('wappstoBit.description', 'MicroPython USB blocks for micro:bit-based Wappsto:Bit projects.'),
        helpLink: 'https://bit.wappsto.com/'
    }),
    smartCutebot,
    createInfoExtension({
        id: 'edisonV3',
        category: 'robots',
        name: 'Edison V3',
        collaborator: 'Microbric / Unifiscratch',
        icon: {title: 'EDISON', body: 'V3', kind: 'edison', color1: '#475569', color2: '#f97316', color3: '#1f2937'},
        description: msg('edisonV3.description',
            'Experimental access: Edison V3 uses EdScratch/EdPy and program download.'),
        helpLink: 'https://meetedison.com/robot-programming-software/edscratch/',
        message: 'Edison V3 no expone un protocolo Web Serial/Web Bluetooth directo documentado para control ' +
            'en vivo desde Scratch. Usa EdScratch/EdPy para cargar programas; esta entrada queda preparada.'
    }),
    createInfoExtension({
        id: 'blueBot',
        category: 'robots',
        name: 'BlueBot',
        collaborator: 'TTS / Unifiscratch',
        icon: {title: 'BLUE', body: 'BOT', kind: 'bluebot', color1: '#0284c7', color2: '#facc15', color3: '#075985'},
        description: msg('blueBot.description',
            'Experimental access: BlueBot depends on a proprietary Bluetooth protocol.'),
        helpLink: 'https://www.tts-group.co.uk/blue-bot-bluetooth-programmable-floor-robot/1015268.html',
        message: 'BlueBot usa Bluetooth, pero no he encontrado un protocolo Scratch 3 abierto y estable ' +
            'para enviar movimientos desde navegador. La extension queda visible como punto de integracion.'
    }),
    createInfoExtension({
        id: 'dashRobot',
        category: 'robots',
        name: 'Dash',
        collaborator: 'Wonder Workshop / Unifiscratch',
        icon: {title: 'DASH', body: 'ROBOT', kind: 'dash', color1: '#0ea5e9', color2: '#f97316', color3: '#075985'},
        description: msg('dashRobot.description',
            'Experimental access: Dash uses apps and protocols not published for Scratch web.'),
        helpLink: 'https://www.makewonder.com/',
        message: 'Dash no tiene un protocolo Scratch 3 web abierto equivalente a Web Serial. ' +
            'La extension queda preparada para anadir un puente local si encontramos uno fiable.'
    }),
    createInfoExtension({
        id: 'faceSensing',
        name: 'Face Sensing',
        collaborator: 'Unifiscratch',
        icon: {
            title: 'FACE',
            body: 'SENSING',
            kind: 'face',
            color1: '#7c3aed',
            color2: '#facc15',
            color3: '#4c1d95'
        },
        description: msg('faceSensing.description',
            'AI face sensing card. A public standalone module was not available in the current extension format.'),
        helpLink: 'https://www.scratchfoundation.org/learn/learning-library/video-sensing',
        message: 'Face Sensing existe como extension experimental de Scratch Lab, pero no he encontrado un modulo ' +
            '.mjs publico compatible con el cargador. Esta tarjeta queda en IA hasta integrar un modulo abierto.',
        category: 'ai',
        tags: ['ai', 'image']
    }),
    createInfoExtension({
        id: 'tm2scratch',
        name: 'Teachable Machine',
        collaborator: 'Unifiscratch',
        icon: {title: 'TM', body: 'IMAGE', kind: 'ai', color1: '#2563eb', color2: '#facc15', color3: '#1e3a8a'},
        description: msg('tm2scratch.description',
            'This AI feature is available in another editor, but not as a compatible standalone module.'),
        helpLink: 'https://teachablemachine.withgoogle.com/',
        message: 'Teachable Machine no se publica aqui como modulo .mjs independiente compatible.',
        category: 'ai',
        tags: ['ai', 'image']
    }),
    createInfoExtension({
        id: 'tmpose2scratch',
        name: 'Teachable Machine Pose',
        collaborator: 'Unifiscratch',
        icon: {title: 'TM', body: 'POSE', kind: 'pose', color1: '#0f766e', color2: '#facc15', color3: '#134e4a'},
        description: msg('tmpose2scratch.description',
            'This pose AI feature is available in another editor, but not as a compatible standalone module.'),
        helpLink: 'https://teachablemachine.withgoogle.com/',
        message: 'Teachable Machine Pose no se publica aqui como modulo .mjs independiente compatible.',
        category: 'ai',
        tags: ['ai', 'image']
    }),
    createInfoExtension({
        id: 'ic2scratch',
        name: 'Image Classifier',
        collaborator: 'Unifiscratch',
        icon: {title: 'IMG', body: 'CLASS', kind: 'classifier', color1: '#dc2626', color2: '#facc15', color3: '#7f1d1d'},
        description: msg('ic2scratch.description',
            'This image classifier is available in another editor, but not as a compatible standalone module.'),
        helpLink: 'https://ml5js.org/',
        message: 'Image Classifier no se publica aqui como modulo .mjs independiente compatible.',
        category: 'ai',
        tags: ['ai', 'image']
    }),
    createInfoExtension({
        id: 'handpose2scratch',
        name: 'HandPose2Scratch',
        collaborator: 'Unifiscratch',
        icon: {title: 'HAND', body: 'POSE', kind: 'hand', color1: '#ea580c', color2: '#22c55e', color3: '#9a3412'},
        description: msg('handpose2scratch.description',
            'This hand pose feature is available in another editor, but not as a compatible standalone module.'),
        helpLink: 'https://champierre.github.io/handpose2scratch/',
        message: 'HandPose2Scratch no se publica aqui como modulo .mjs independiente compatible.',
        category: 'ai',
        tags: ['ai', 'image']
    }),
    createInfoExtension({
        id: 'facemesh2scratch',
        name: 'FaceMesh2Scratch',
        collaborator: 'Unifiscratch',
        icon: {title: 'FACE', body: 'MESH', kind: 'face', color1: '#9333ea', color2: '#22c55e', color3: '#581c87'},
        description: msg('facemesh2scratch.description',
            'This face mesh feature is available in another editor, but not as a compatible standalone module.'),
        helpLink: 'https://ml5js.org/',
        message: 'FaceMesh2Scratch no se publica aqui como modulo .mjs independiente compatible.',
        category: 'ai',
        tags: ['ai', 'image']
    })
];

export {entries};
