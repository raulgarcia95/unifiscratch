import {bindSafetyEvents} from './micropython-transport.mjs';
import {
    MakeblockSerialTransport,
    clamp,
    colorToRgb,
    msg,
    pyArgs
} from './makeblock-serial.mjs';
import {deviceIconURL} from './device-icons.mjs';
import {actionButton} from './action-buttons.mjs';

const EXTENSION_ID = 'makeblockMbot2';
const iconURL = deviceIconURL('mbot2');

// In live mode CyberPi evaluates one Python call per frame under the `cyberpi` name.
// The right encoder motor (EM2) is mounted mirrored, so "forward" is (+p, -p).
const MBOT_STOP = 'cyberpi.mbot2.EM_stop("all")';
const drive = (left, right) => `cyberpi.mbot2.drive_power(${pyArgs(left, -right)})`;
const DIRECTIONS = {
    forward: [1, 1],
    backward: [-1, -1],
    left: [-1, 1],
    right: [1, -1]
};
const BUTTONS = ['a', 'b', 'middle', 'up', 'down', 'left', 'right'];
const LABEL_SIZES = [16, 24, 32];

const blockClass = class MakeblockMbot2 {
    constructor (runtime) {
        this.runtime = runtime;
        this.transport = new MakeblockSerialTransport('mBot2', {
            probe: 'cyberpi.get_firmware_version()',
            stop: MBOT_STOP
        });
        this.motion = 0;
        bindSafetyEvents(runtime, this.transport);
    }

    getInfo () {
        return {
            id: EXTENSION_ID,
            name: 'mBot2',
            color1: '#5b62d6',
            color2: '#484eb8',
            color3: '#343881',
            blocks: [
                ...actionButton('connect', msg('mbot2.connect', 'connect mBot2 by USB')),
                {
                    opcode: 'disconnect',
                    blockType: 'command',
                    text: msg('mbot2.disconnect', 'disconnect mBot2')
                },
                {
                    opcode: 'isConnected',
                    blockType: 'Boolean',
                    text: msg('mbot2.connected', 'mBot2 connected?')
                },
                {opcode: 'connectionError',
                    blockType: 'reporter',
                    text: msg('connectionError', 'last connection error')},
                '---',
                {
                    opcode: 'move',
                    blockType: 'command',
                    text: msg('mbot2.move', 'move [DIRECTION] at [POWER] % power for [SECONDS] s'),
                    arguments: {
                        DIRECTION: {type: 'string', menu: 'directions', defaultValue: 'forward'},
                        POWER: {type: 'number', defaultValue: 50},
                        SECONDS: {type: 'number', defaultValue: 1}
                    }
                },
                {
                    opcode: 'drivePower',
                    blockType: 'command',
                    text: msg('mbot2.drivePower', 'motors left [LEFT] right [RIGHT] for [SECONDS] s'),
                    arguments: {
                        LEFT: {type: 'number', defaultValue: 50},
                        RIGHT: {type: 'number', defaultValue: 50},
                        SECONDS: {type: 'number', defaultValue: 1}
                    }
                },
                {
                    opcode: 'stop',
                    blockType: 'command',
                    text: msg('mbot2.stop', 'stop mBot2')
                },
                '---',
                {
                    opcode: 'showText',
                    blockType: 'command',
                    text: msg('mbot2.showText', 'show text [TEXT] size [SIZE]'),
                    arguments: {
                        TEXT: {type: 'string', defaultValue: 'Hola'},
                        SIZE: {type: 'number', defaultValue: 24}
                    }
                },
                {
                    opcode: 'clearDisplay',
                    blockType: 'command',
                    text: msg('mbot2.clearDisplay', 'clear display')
                },
                {
                    opcode: 'setLed',
                    blockType: 'command',
                    text: msg('mbot2.setLed', 'CyberPi LED [COLOR]'),
                    arguments: {
                        COLOR: {type: 'color', defaultValue: '#00ff00'}
                    }
                },
                {
                    opcode: 'ledOff',
                    blockType: 'command',
                    text: msg('mbot2.ledOff', 'turn off CyberPi LEDs')
                },
                {
                    opcode: 'playSound',
                    blockType: 'command',
                    text: msg('mbot2.playSound', 'play sound [SOUND]'),
                    arguments: {
                        SOUND: {type: 'string', menu: 'sounds', defaultValue: 'hello'}
                    }
                },
                '---',
                {
                    opcode: 'distance',
                    blockType: 'reporter',
                    text: msg('mbot2.distance', 'ultrasonic distance (cm)')
                },
                {
                    opcode: 'buttonPressed',
                    blockType: 'Boolean',
                    text: msg('mbot2.buttonPressed', 'button [BUTTON] pressed?'),
                    arguments: {
                        BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'a'}
                    }
                },
                {
                    opcode: 'loudness',
                    blockType: 'reporter',
                    text: msg('mbot2.loudness', 'loudness')
                },
                {
                    opcode: 'brightness',
                    blockType: 'reporter',
                    text: msg('mbot2.brightness', 'light level')
                },
                {
                    opcode: 'battery',
                    blockType: 'reporter',
                    text: msg('mbot2.battery', 'battery (%)')
                }
            ],
            menus: {
                directions: {
                    acceptReporters: true,
                    items: [
                        {text: msg('codey.forward', 'forward'), value: 'forward'},
                        {text: msg('codey.backward', 'backward'), value: 'backward'},
                        {text: msg('codey.left', 'left'), value: 'left'},
                        {text: msg('codey.right', 'right'), value: 'right'}
                    ]
                },
                buttons: {
                    acceptReporters: true,
                    items: [
                        {text: 'A', value: 'a'},
                        {text: 'B', value: 'b'},
                        {text: msg('mbot2.joystickMiddle', 'joystick pressed'), value: 'middle'},
                        {text: msg('mbot2.joystickUp', 'joystick up'), value: 'up'},
                        {text: msg('mbot2.joystickDown', 'joystick down'), value: 'down'},
                        {text: msg('mbot2.joystickLeft', 'joystick left'), value: 'left'},
                        {text: msg('mbot2.joystickRight', 'joystick right'), value: 'right'}
                    ]
                },
                sounds: {
                    acceptReporters: true,
                    items: [
                        {text: 'hello', value: 'hello'},
                        {text: 'hi', value: 'hi'},
                        {text: 'yeah', value: 'yeah'},
                        {text: 'switch', value: 'switch'}
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

    runPython () {
        throw new Error('La ejecución libre de Python está desactivada para este dispositivo.');
    }

    // Starts the motors, waits on the computer, then stops unless a newer motion took over.
    async timedDrive (left, right, seconds) {
        const duration = clamp(seconds, 0, 5);
        const token = ++this.motion;
        if (duration === 0) return this.transport.run(MBOT_STOP);
        await this.transport.run(drive(left, right));
        try {
            await this.transport.wait(duration * 1000);
        } finally {
            if (token === this.motion && this.transport.isConnected()) {
                await this.transport.run(MBOT_STOP).catch(() => {});
            }
        }
    }

    move (args) {
        const factors = Object.prototype.hasOwnProperty.call(DIRECTIONS, args.DIRECTION) &&
            DIRECTIONS[args.DIRECTION];
        if (!factors) throw new Error('Dirección no válida.');
        const power = clamp(args.POWER, 0, 100);
        return this.timedDrive(power * factors[0], power * factors[1], args.SECONDS);
    }

    drivePower (args) {
        const left = clamp(args.LEFT, -100, 100);
        const right = clamp(args.RIGHT, -100, 100);
        return this.timedDrive(left, right, args.SECONDS);
    }

    stop () {
        this.motion++;
        return this.transport.emergencyStop();
    }

    showText (args) {
        const wanted = clamp(args.SIZE, 12, 36);
        const size = LABEL_SIZES.reduce((best, item) => (
            Math.abs(item - wanted) < Math.abs(best - wanted) ? item : best
        ));
        return this.transport.run(`cyberpi.display.show_label(${pyArgs(String(args.TEXT), size, 'center')})`);
    }

    clearDisplay () {
        return this.transport.run('cyberpi.display.clear()');
    }

    setLed (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.transport.run(`cyberpi.led.on(${pyArgs(r, g, b)})`);
    }

    ledOff () {
        return this.transport.run('cyberpi.led.off()');
    }

    playSound (args) {
        return this.transport.run(`cyberpi.audio.play(${pyArgs(String(args.SOUND))})`);
    }

    distance () {
        return this.transport.run('cyberpi.ultrasonic2.get(1)');
    }

    async buttonPressed (args) {
        const button = String(args.BUTTON).toLowerCase();
        if (!BUTTONS.includes(button)) throw new Error('Botón no válido.');
        return (await this.transport.run(`cyberpi.controller.is_press(${pyArgs(button)})`)) === true;
    }

    loudness () {
        return this.transport.run('cyberpi.get_loudness("maximum")');
    }

    brightness () {
        return this.transport.run('cyberpi.get_bri()');
    }

    battery () {
        return this.transport.run('cyberpi.get_battery()');
    }
};

blockClass.EXTENSION_ID = EXTENSION_ID;

const entry = {
    name: 'mBot2',
    extensionId: EXTENSION_ID,
    collaborator: 'Makeblock / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('mbot2.description', 'USB control of CyberPi in live mode.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    category: 'robots',
    helpLink: 'https://geekdaxue.co/read/makeblock-help-center-en%40mcode/cyberpi-api-shields'
};

export {entry, blockClass};
