/* eslint-disable max-len */
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
import {openSetupGuide} from '../setup-guides.mjs';
import {tr, defaultText} from './runtime-texts.mjs';

const EXTENSION_ID = 'makeblockCodeyRocky';
const iconURL = deviceIconURL('codeyRocky');

// In live mode Codey evaluates one Python call per frame with `codey` and `rocky` loaded.
const ROCKY_STOP = 'rocky.stop()';
const MOVES = {
    forward: 'forward',
    backward: 'backward',
    left: 'turn_left',
    right: 'turn_right'
};
const BUTTONS = {a: 'button_a', b: 'button_b', c: 'button_c'};

const blockClass = class MakeblockCodeyRocky {
    constructor (runtime) {
        this.runtime = runtime;
        this.transport = new MakeblockSerialTransport('Codey Rocky', {
            probe: 'codey.light_sensor.get_value()',
            stop: ROCKY_STOP
        });
        this.motion = 0;
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
                ...actionButton('showHelp', msg('codey.showHelp', 'how to connect Codey Rocky (help)')),
                ...actionButton('connectBluetooth', msg('codey.connectBluetooth', 'connect Codey Rocky by Bluetooth')),
                ...actionButton('connect', msg('codey.connect', 'connect Codey Rocky by USB')),
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
                    opcode: 'move',
                    blockType: 'command',
                    text: msg('codey.move', 'move [DIRECTION] power [POWER] for [SECONDS] s'),
                    arguments: {
                        DIRECTION: {type: 'string', menu: 'directions', defaultValue: 'forward'},
                        POWER: {type: 'number', defaultValue: 50},
                        SECONDS: {type: 'number', defaultValue: 1}
                    }
                },
                {
                    opcode: 'drive',
                    blockType: 'command',
                    text: msg('codey.drive', 'left wheel [LEFT] right [RIGHT] for [SECONDS] s'),
                    arguments: {
                        LEFT: {type: 'number', defaultValue: 50},
                        RIGHT: {type: 'number', defaultValue: 50},
                        SECONDS: {type: 'number', defaultValue: 1}
                    }
                },
                {
                    opcode: 'stop',
                    blockType: 'command',
                    text: msg('codey.stop', 'stop Rocky')
                },
                '---',
                {
                    opcode: 'showText',
                    blockType: 'command',
                    text: msg('codey.showText', 'show text [TEXT]'),
                    arguments: {
                        TEXT: {type: 'string', defaultValue: defaultText('hello', 'Hello!')}
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
                        COLOR: {type: 'color', defaultValue: '#ff0000'}
                    }
                },
                {
                    opcode: 'playNote',
                    blockType: 'command',
                    text: msg('codey.playNote', 'play note [NOTE] for [BEATS] beats'),
                    arguments: {
                        NOTE: {type: 'note', defaultValue: 60},
                        BEATS: {type: 'number', defaultValue: 1}
                    }
                },
                '---',
                {
                    opcode: 'buttonPressed',
                    blockType: 'Boolean',
                    text: msg('codey.buttonPressed', 'button [BUTTON] pressed?'),
                    arguments: {
                        BUTTON: {type: 'string', menu: 'buttons', defaultValue: 'a'}
                    }
                },
                {
                    opcode: 'lightLevel',
                    blockType: 'reporter',
                    text: msg('codey.lightLevel', 'light level')
                },
                {
                    opcode: 'loudness',
                    blockType: 'reporter',
                    text: msg('codey.loudness', 'loudness')
                },
                {
                    opcode: 'dial',
                    blockType: 'reporter',
                    text: msg('codey.dial', 'gear potentiometer')
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
                        {text: 'C', value: 'c'}
                    ]
                }
            }
        };
    }

    showHelp () {
        openSetupGuide(EXTENSION_ID);
    }

    connectBluetooth () {
        return this.transport.connect('bluetooth');
    }

    connect () {
        return this.transport.connect('usb');
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
        throw new Error(tr('Running free Python code is disabled for this device.', 'La ejecución libre de Python está desactivada para este dispositivo.', 'L’execució lliure de Python està desactivada per a aquest dispositiu.'));
    }

    // Starts Rocky, waits on the computer, then stops unless a newer motion took over.
    async timedMotion (script, seconds) {
        const duration = clamp(seconds, 0, 5);
        const token = ++this.motion;
        if (duration === 0) return this.transport.run(ROCKY_STOP);
        await this.transport.run(script);
        try {
            await this.transport.wait(duration * 1000);
        } finally {
            if (token === this.motion && this.transport.isConnected()) {
                await this.transport.run(ROCKY_STOP).catch(() => {});
            }
        }
    }

    move (args) {
        const method = Object.prototype.hasOwnProperty.call(MOVES, args.DIRECTION) && MOVES[args.DIRECTION];
        if (!method) throw new Error(tr('Invalid direction.', 'Dirección no válida.', 'Direcció no vàlida.'));
        const power = clamp(args.POWER, -100, 100);
        return this.timedMotion(`rocky.${method}(${pyArgs(power)})`, args.SECONDS);
    }

    drive (args) {
        const left = clamp(args.LEFT, -100, 100);
        const right = clamp(args.RIGHT, -100, 100);
        return this.timedMotion(`rocky.drive(${pyArgs(left, right)})`, args.SECONDS);
    }

    stop () {
        this.motion++;
        return this.transport.emergencyStop();
    }

    showText (args) {
        return this.transport.run(`codey.display.show(${pyArgs(String(args.TEXT))})`);
    }

    clearDisplay () {
        return this.transport.run('codey.display.clear()');
    }

    setLed (args) {
        const {r, g, b} = colorToRgb(args.COLOR);
        return this.transport.run(`codey.led.show(${pyArgs(r, g, b)})`);
    }

    playNote (args) {
        const note = clamp(args.NOTE, 48, 72);
        const beats = clamp(args.BEATS, 0, 16);
        // The robot answers when the note ends; allow for its length.
        return this.transport.run(`codey.speaker.play_note(${pyArgs(note, beats)})`, {timeout: 3000 + (beats * 1500)});
    }

    async buttonPressed (args) {
        const button = BUTTONS[String(args.BUTTON).toLowerCase()];
        if (!button) throw new Error(tr('Invalid button.', 'Botón no válido.', 'Botó no vàlid.'));
        return (await this.transport.run(`codey.${button}.is_pressed()`)) === true;
    }

    lightLevel () {
        return this.transport.run('codey.light_sensor.get_value()');
    }

    loudness () {
        return this.transport.run('codey.sound_sensor.get_loudness()');
    }

    dial () {
        return this.transport.run('codey.potentiometer.get_value()');
    }
};

blockClass.EXTENSION_ID = EXTENSION_ID;

const entry = {
    name: 'Codey Rocky',
    extensionId: EXTENSION_ID,
    collaborator: 'Makeblock / Unifiscratch',
    iconURL,
    insetIconURL: iconURL,
    description: msg('codey.description', 'USB or Bluetooth control of Codey Rocky in live mode.'),
    tags: ['device', 'hardware'],
    featured: true,
    disabled: false,
    category: 'robots',
    helpLink: 'https://makeblock-micropython-api.readthedocs.io/en/latest/codey%26rocky/'
};

export {entry, blockClass};
