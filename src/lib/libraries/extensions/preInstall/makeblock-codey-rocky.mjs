import {bindSafetyEvents, boundedMotion} from './micropython-transport.mjs';
import {
    MakeblockSerialTransport,
    clamp,
    colorToRgb,
    makeSvgDataUri,
    msg,
    toPythonString
} from './makeblock-serial.mjs';

const EXTENSION_ID = 'makeblockCodeyRocky';
const iconURL = makeSvgDataUri({
    title: 'CODEY',
    body: 'ROCKY',
    kind: 'codey',
    color1: '#12a3c7',
    color2: '#f2c94c'
});

const blockClass = class MakeblockCodeyRocky {
    constructor (runtime) {
        this.runtime = runtime;
        this.transport = new MakeblockSerialTransport('Codey Rocky', {
            probe: 'import codey\nimport rocky\nassert callable(rocky.drive) and callable(rocky.stop)',
            stop: 'import rocky\nrocky.stop()'
        });
        bindSafetyEvents(runtime, this.transport);
    }

    getInfo () {
        return {
            id: EXTENSION_ID,
            name: 'Codey Rocky',
            color1: '#12a3c7',
            color2: '#0b86a4',
            color3: '#086177',
            blocks: [
                {
                    opcode: 'connect',
                    blockType: 'command',
                    text: msg('codey.connect', 'connect Codey Rocky by USB')
                },
                {
                    opcode: 'disconnect',
                    blockType: 'command',
                    text: msg('codey.disconnect', 'disconnect Codey Rocky')
                },
                {
                    opcode: 'isConnected',
                    blockType: 'Boolean',
                    text: msg('codey.connected', 'Codey Rocky connected?')
                },
                {opcode: 'connectionError',
                    blockType: 'reporter',
                    text: msg('connectionError', 'last connection error')},
                '---',
                {
                    opcode: 'showText',
                    blockType: 'command',
                    text: msg('codey.showText', 'show text [TEXT]'),
                    arguments: {
                        TEXT: {
                            type: 'string',
                            defaultValue: 'Hola'
                        }
                    }
                },
                {
                    opcode: 'clearDisplay',
                    blockType: 'command',
                    text: msg('codey.clearDisplay', 'clear display')
                },
                {
                    opcode: 'setLed',
                    blockType: 'command',
                    text: msg('codey.setLed', 'RGB LED [COLOR]'),
                    arguments: {
                        COLOR: {
                            type: 'color',
                            defaultValue: '#ff0000'
                        }
                    }
                },
                {
                    opcode: 'playNote',
                    blockType: 'command',
                    text: msg('codey.playNote', 'play note [NOTE] for [BEATS] beats'),
                    arguments: {
                        NOTE: {
                            type: 'note',
                            defaultValue: 60
                        },
                        BEATS: {
                            type: 'number',
                            defaultValue: 1
                        }
                    }
                },
                '---',
                {
                    opcode: 'move',
                    blockType: 'command',
                    text: msg('codey.move', 'move [DIRECTION] power [POWER] for [SECONDS] s'),
                    arguments: {
                        DIRECTION: {
                            type: 'string',
                            menu: 'directions',
                            defaultValue: 'forward'
                        },
                        POWER: {
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
                    opcode: 'drive',
                    blockType: 'command',
                    text: msg('codey.drive', 'left wheel [LEFT] right [RIGHT] for [SECONDS] s'),
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
                    text: msg('codey.stop', 'stop Rocky')
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
        return this.transport.runPython(`import codey\ncodey.display.show(${toPythonString(args.TEXT)})`);
    }

    clearDisplay () {
        return this.transport.runPython('import codey\ncodey.display.clear()');
    }

    setLed (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.transport.runPython(`import codey\ncodey.led.show(${r}, ${g}, ${b})`);
    }

    playNote (args) {
        const note = clamp(args.NOTE, 48, 72);
        const beats = clamp(args.BEATS, 0, 16);
        return this.transport.runPython(`import codey\ncodey.speaker.play_note(${note}, ${beats})`);
    }

    move (args) {
        const methods = {
            forward: 'forward',
            backward: 'backward',
            left: 'turn_left',
            right: 'turn_right'
        };
        const method = Object.prototype.hasOwnProperty.call(methods, args.DIRECTION) && methods[args.DIRECTION];
        if (!method) throw new Error('Dirección no válida.');
        const power = clamp(args.POWER, -100, 100);
        const seconds = clamp(args.SECONDS, 0, 5);
        return this.transport.runPython(boundedMotion(
            'import rocky', `rocky.${method}(${power})`, 'rocky.stop()', seconds
        ));
    }

    drive (args) {
        const left = clamp(args.LEFT, -100, 100);
        const right = clamp(args.RIGHT, -100, 100);
        const seconds = clamp(args.SECONDS, 0, 5);
        return this.transport.runPython(
            boundedMotion('import rocky', `rocky.drive(${left}, ${right})`, 'rocky.stop()', seconds)
        );
    }

    stop () {
        return this.transport.emergencyStop();
    }
};

blockClass.EXTENSION_ID = EXTENSION_ID;

const entry = {
    name: 'Codey Rocky',
    extensionId: EXTENSION_ID,
    collaborator: 'Makeblock / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('codey.description', 'Basic USB control using MicroPython.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    category: 'robots',
    helpLink: 'https://makeblock-micropython-api.readthedocs.io/en/latest/codey%26rocky/'
};

export {entry, blockClass};
