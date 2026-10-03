import {bindSafetyEvents, boundedMotion} from './micropython-transport.mjs';
import {
    MakeblockSerialTransport,
    clamp,
    colorToRgb,
    makeSvgDataUri,
    msg,
    toPythonString
} from './makeblock-serial.mjs';

const EXTENSION_ID = 'makeblockMbot2';
const iconURL = makeSvgDataUri({
    title: 'mBOT2',
    body: 'CYBERPI',
    kind: 'mbot2',
    color1: '#5b62d6',
    color2: '#22c55e'
});

const MBOT_SETUP = `try:
    from cyberpi import mbot2 as _mbot
except ImportError:
    import mbot2`;
const MBOT_STOP = `${MBOT_SETUP}\n_mbot.drive_power(0, 0)`;
const cyberpiDriveCode = (left, right, seconds) => boundedMotion(
    MBOT_SETUP, `_mbot.drive_power(${left}, ${right})`, '_mbot.drive_power(0, 0)', seconds
);

const blockClass = class MakeblockMbot2 {
    constructor (runtime) {
        this.runtime = runtime;
        this.transport = new MakeblockSerialTransport('mBot2', {
            probe: `${MBOT_SETUP}\nassert callable(_mbot.drive_power)`,
            stop: MBOT_STOP
        });
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
                {
                    opcode: 'connect',
                    blockType: 'command',
                    text: msg('mbot2.connect', 'connect mBot2 by USB')
                },
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
                    opcode: 'showText',
                    blockType: 'command',
                    text: msg('mbot2.showText', 'show text [TEXT] size [SIZE]'),
                    arguments: {
                        TEXT: {
                            type: 'string',
                            defaultValue: 'Hola'
                        },
                        SIZE: {
                            type: 'number',
                            defaultValue: 24
                        }
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
                        COLOR: {
                            type: 'color',
                            defaultValue: '#00ff00'
                        }
                    }
                },
                {
                    opcode: 'playSound',
                    blockType: 'command',
                    text: msg('mbot2.playSound', 'play sound [SOUND]'),
                    arguments: {
                        SOUND: {
                            type: 'string',
                            menu: 'sounds',
                            defaultValue: 'hello'
                        }
                    }
                },
                '---',
                {
                    opcode: 'drivePower',
                    blockType: 'command',
                    text: msg('mbot2.drivePower', 'motors left [LEFT] right [RIGHT] for [SECONDS] s'),
                    arguments: {
                        LEFT: {
                            type: 'number',
                            defaultValue: 50
                        },
                        RIGHT: {
                            type: 'number',
                            defaultValue: 50
                        },
                        SECONDS: {
                            type: 'number',
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'stop',
                    blockType: 'command',
                    text: msg('mbot2.stop', 'stop mBot2')
                }

            ],
            menus: {
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

    showText (args) {
        const size = clamp(args.SIZE, 12, 36);
        return this.transport.runPython(
            `import cyberpi\ncyberpi.display.show_label(${toPythonString(args.TEXT)}, ${size}, 0, 0)`
        );
    }

    clearDisplay () {
        return this.transport.runPython('import cyberpi\ncyberpi.display.clear()');
    }

    setLed (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.transport.runPython(
            `import cyberpi
try:
    cyberpi.led.on(${r}, ${g}, ${b})
except Exception:
    cyberpi.led.show('${r} ${g} ${b} ${r} ${g} ${b} ${r} ${g} ${b} ${r} ${g} ${b} ${r} ${g} ${b}')`
        );
    }

    playSound (args) {
        return this.transport.runPython(`import cyberpi\ncyberpi.audio.play(${toPythonString(args.SOUND)})`);
    }

    drivePower (args) {
        const left = clamp(args.LEFT, -100, 100);
        const right = clamp(args.RIGHT, -100, 100);
        const seconds = clamp(args.SECONDS, 0, 5);
        return this.transport.runPython(cyberpiDriveCode(left, right, seconds));
    }

    stop () {
        return this.transport.emergencyStop();
    }
};

blockClass.EXTENSION_ID = EXTENSION_ID;

const entry = {
    name: 'mBot2',
    extensionId: EXTENSION_ID,
    collaborator: 'Makeblock / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('mbot2.description', 'Basic USB control using CyberPi/MicroPython.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    category: 'robots',
    helpLink: 'https://geekdaxue.co/read/makeblock-help-center-en%40mcode/cyberpi-api-shields'
};

export {entry, blockClass};
