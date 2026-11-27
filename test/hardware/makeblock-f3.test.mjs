import './spanish-locale.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    BLE_SERVICES,
    FrameParser,
    MakeblockF3Transport,
    decodeScriptReply,
    encodeFrame,
    modeFrame,
    parseReturnValue,
    pyArgs,
    scriptFrame
} from '../../src/lib/libraries/extensions/preInstall/makeblock-f3-transport.mjs';
import {blockClass as Codey} from '../../src/lib/libraries/extensions/preInstall/makeblock-codey-rocky.mjs';
import {blockClass as Mbot} from '../../src/lib/libraries/extensions/preInstall/makeblock-mbot2.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

// A fake CyberPi/Codey that understands F3 frames and answers script frames.
class FakeRobot {
    constructor ({answer = () => 'None', silent = false} = {}) {
        this.answer = answer;
        this.silent = silent;
        this.scripts = [];
        this.modes = [];
        this.closes = 0;
        this.parser = new FrameParser();
    }
    async open () {
        this.readable = new ReadableStream({start: controller => { this.output = controller; }});
        this.writable = new WritableStream({write: data => {
            for (const payload of this.parser.push(data)) {
                if (payload[0] === 0x0D) this.modes.push(payload[2]);
                const frame = decodeScriptReply(payload);
                if (!frame) continue;
                this.scripts.push(frame.text);
                if (payload[1] === 1 && !this.silent) this.reply(frame.idx, `{'ret': ${this.answer(frame.text)}}`);
            }
        }});
    }
    reply (idx, text) {
        // Noise before the frame must be ignored by the parser.
        this.output.enqueue(new TextEncoder().encode('boot log\r\n'));
        this.output.enqueue(scriptFrame(text, idx, true));
    }
    async close () { this.closes++; }
}

const install = robot => Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
    serial: {requestPort: async () => robot}
}});

test('frames match the documented layout and checksums', () => {
    assert.deepEqual(Array.from(modeFrame(1)), [0xF3, 0xF6, 0x03, 0x00, 0x0D, 0x00, 0x01, 0x0E, 0xF4]);
    const frame = Array.from(scriptFrame('ab', 0x0102, true));
    assert.deepEqual(frame.slice(0, 10), [0xF3, (0xF3 + 8) & 0xFF, 8, 0, 0x28, 1, 0x02, 0x01, 2, 0]);
    assert.deepEqual(frame.slice(10, 12), [0x61, 0x62]);
    assert.equal(frame[12], (0x28 + 1 + 2 + 1 + 2 + 0x61 + 0x62) & 0xFF);
    assert.equal(frame.at(-1), 0xF4);
});

test('parser skips noise, waits for split frames and drops corrupt ones', () => {
    const parser = new FrameParser();
    const good = Array.from(encodeFrame([1, 2, 3]));
    const bad = [...good];
    bad[bad.length - 2] ^= 0xFF;
    assert.deepEqual(parser.push([0x41, 0xF3, ...bad, ...good.slice(0, 5)]), []);
    assert.deepEqual(parser.push(good.slice(5)), [[1, 2, 3]]);
});

test('return values are converted from Python literals', () => {
    assert.equal(parseReturnValue("{'ret': 42}"), 42);
    assert.equal(parseReturnValue("{'ret': -1.5}"), -1.5);
    assert.equal(parseReturnValue("{'ret': True}"), true);
    assert.equal(parseReturnValue("{'ret': None}"), '');
    assert.equal(parseReturnValue("{'ret': 'v1.2'}"), 'v1.2');
    assert.equal(parseReturnValue("{'ret': [1, 'a']}"), '[1,"a"]');
    assert.equal(parseReturnValue('garbage'), '');
    assert.equal(pyArgs(1, 'a"b', true), '1, "a\\"b", True');
    assert.throws(() => pyArgs(NaN), /finito/);
});

test('connect switches to live mode, waits for the firmware and sends a stop', async () => {
    const robot = new FakeRobot({answer: () => "'44.01.011'"});
    install(robot);
    const transport = new MakeblockF3Transport('Test', {probe: 'ping()', stop: 'halt()', probeInterval: 50});
    await assert.rejects(transport.run('x()'), /explícitamente/);
    await transport.connect();
    assert.equal(transport.isConnected(), true);
    assert.deepEqual(robot.modes, [1]);
    await tick();
    assert.deepEqual(robot.scripts, ['ping()', 'halt()']);
    assert.equal(await transport.run('read()'), '44.01.011');
    await transport.disconnect();
    assert.equal(transport.isConnected(), false);
    assert.equal(robot.closes, 1);
});

test('a robot that never answers gives a clear error and frees the port', async () => {
    const robot = new FakeRobot({silent: true});
    install(robot);
    const transport = new MakeblockF3Transport('mBot2', {probe: 'ping()', probeInterval: 20, connectTimeout: 100});
    await assert.rejects(transport.connect(), /mBot2: El robot no responde/);
    assert.equal(transport.isConnected(), false);
    assert.equal(robot.closes, 1);
    assert.match(transport.lastError, /mBlock/);
});

const connected = async (Robot, answer) => {
    const robot = new FakeRobot({answer});
    install(robot);
    const extension = new Robot();
    extension.transport.probeInterval = 50;
    await extension.connect();
    robot.scripts.length = 0;
    return {robot, extension};
};

test('mBot2 blocks send CyberPi live calls with the right motor signs', async () => {
    const {robot, extension} = await connected(Mbot, text => (text.includes('is_press') ? 'True' : '17'));
    await extension.move({DIRECTION: 'forward', POWER: 150, SECONDS: 0.01});
    await extension.drivePower({LEFT: 30, RIGHT: -40, SECONDS: 0.01});
    await extension.setLed({COLOR: '#ff8000'});
    await extension.showText({TEXT: 'Hola "mon"', SIZE: 30});
    assert.equal(await extension.distance(), 17);
    assert.equal(await extension.buttonPressed({BUTTON: 'A'}), true);
    await assert.rejects(extension.buttonPressed({BUTTON: 'import os'}), /no válido/);
    assert.deepEqual(robot.scripts, [
        'cyberpi.mbot2.drive_power(100, -100)',
        'cyberpi.mbot2.EM_stop("all")',
        'cyberpi.mbot2.drive_power(30, 40)',
        'cyberpi.mbot2.EM_stop("all")',
        'cyberpi.led.on(255, 128, 0)',
        'cyberpi.display.show_label("Hola \\"mon\\"", 32, "center")',
        'cyberpi.ultrasonic2.get(1)',
        'cyberpi.controller.is_press("a")'
    ]);
    assert.throws(() => extension.runPython({CODE: 'x'}), /desactivada/);
    assert.equal(extension.getInfo().blocks.some(block => block.opcode === 'runPython'), false);
    await extension.disconnect();
});

test('stop interrupts a timed move at once and the old move does not stop a newer one', async () => {
    const {robot, extension} = await connected(Mbot);
    const long = extension.move({DIRECTION: 'forward', POWER: 50, SECONDS: 5});
    await new Promise(resolve => setTimeout(resolve, 20));
    const started = Date.now();
    await extension.stop();
    await assert.rejects(long, /cancelada/);
    assert.ok(Date.now() - started < 500);
    assert.equal(robot.scripts.at(-1), 'cyberpi.mbot2.EM_stop("all")');
    // A move started after the stop runs normally.
    await extension.move({DIRECTION: 'left', POWER: 20, SECONDS: 0.01});
    assert.deepEqual(robot.scripts.slice(-2), ['cyberpi.mbot2.drive_power(-20, -20)', 'cyberpi.mbot2.EM_stop("all")']);
    await extension.disconnect();
});

test('Codey Rocky blocks keep their saved arguments and send codey/rocky calls', async () => {
    const {robot, extension} = await connected(Codey, () => '3');
    await extension.move({DIRECTION: 'backward', POWER: 40, SECONDS: 0.01});
    await extension.drive({LEFT: 150, RIGHT: -150, SECONDS: 0});
    await extension.playNote({NOTE: 90, BEATS: 0.25});
    assert.equal(await extension.lightLevel(), 3);
    assert.throws(() => extension.move({DIRECTION: 'up', POWER: 1, SECONDS: 1}), /no válida/);
    assert.deepEqual(robot.scripts, [
        'rocky.backward(40)',
        'rocky.stop()',
        'rocky.stop()',
        'codey.speaker.play_note(72, 0.25)',
        'codey.light_sensor.get_value()'
    ]);
    await extension.disconnect();
});

// A fake robot seen through Web Bluetooth: same F3 frames, 20-byte writes, notifications back.
class FakeBleRobot extends FakeRobot {
    constructor (options) {
        super(options);
        this.chunks = [];
        this.connected = false;
        this.listeners = {};
        const robot = this;
        const notify = {
            properties: {notify: true},
            listeners: [],
            addEventListener: (type, fn) => notify.listeners.push(fn),
            removeEventListener: (type, fn) => { notify.listeners = notify.listeners.filter(f => f !== fn); },
            startNotifications: async () => {},
            stopNotifications: async () => {}
        };
        const write = {
            properties: {writeWithoutResponse: true},
            writeValueWithoutResponse: async chunk => {
                robot.chunks.push(chunk.length);
                await robot.writer.write(chunk);
            }
        };
        this.notify = notify;
        this.device = {
            addEventListener: (type, fn) => { robot.listeners[type] = fn; },
            removeEventListener: type => { delete robot.listeners[type]; },
            gatt: {
                get connected () { return robot.connected; },
                connect: async () => {
                    robot.connected = true;
                    await robot.open();
                    robot.writer = robot.writable.getWriter();
                    const reader = robot.readable.getReader();
                    (async () => {
                        for (;;) {
                            const {value, done} = await reader.read();
                            if (done) return;
                            const view = new DataView(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
                            notify.listeners.forEach(fn => fn({target: {value: view}}));
                        }
                    })();
                    return {getPrimaryService: async uuid => {
                        if (uuid !== BLE_SERVICES[0]) throw new Error('no service');
                        return {getCharacteristics: async () => [notify, write]};
                    }};
                },
                disconnect: () => {
                    robot.connected = false;
                    robot.closes++;
                }
            }
        };
    }
}

test('Bluetooth connection sends the same frames in 20-byte chunks and closes the link', async () => {
    const robot = new FakeBleRobot({answer: () => '5'});
    let request;
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
        bluetooth: {requestDevice: async options => {
            request = options;
            return robot.device;
        }}
    }});
    const transport = new MakeblockF3Transport('mBot2', {probe: 'ping()', stop: 'halt()', probeInterval: 50});
    await transport.connect('bluetooth');
    assert.equal(transport.isConnected(), true);
    assert.ok(request.optionalServices.includes(0xFFE1));
    assert.deepEqual(robot.modes, [1]);
    assert.equal(await transport.run(`show(${JSON.stringify('x'.repeat(40))})`), 5);
    assert.ok(robot.chunks.length > 2 && robot.chunks.every(size => size <= 20));
    await transport.disconnect();
    assert.equal(transport.isConnected(), false);
    assert.equal(robot.connected, false);
});

test('mBot2 and Codey Rocky offer help, Bluetooth and USB buttons', async () => {
    for (const Robot of [Mbot, Codey]) {
        const info = new Robot().getInfo();
        const buttons = info.blocks.filter(block => block.blockType === 'button').map(block => block.func);
        assert.deepEqual(buttons, ['showHelp', 'connectBluetooth', 'connect'].map(name => `unifiscratchAction:${name}`));
    }
    const robot = new FakeBleRobot();
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
        bluetooth: {requestDevice: async () => robot.device}
    }});
    const extension = new Codey();
    extension.transport.probeInterval = 50;
    await extension.connectBluetooth();
    assert.equal(extension.isConnected(), true);
    await extension.disconnect();
});
