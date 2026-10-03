import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {MicroPythonTransport, bindSafetyEvents, boundedMotion} from '../../src/lib/libraries/extensions/preInstall/micropython-transport.mjs';
import {blockClass as Codey} from '../../src/lib/libraries/extensions/preInstall/makeblock-codey-rocky.mjs';
import {blockClass as Mbot} from '../../src/lib/libraries/extensions/preInstall/makeblock-mbot2.mjs';
import {entries} from '../../src/lib/libraries/extensions/preInstall/unifiscratch-extra-hardware.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));
class SerialDevice {
    constructor () {
        this.commands = [];
        this.opens = 0;
        this.closes = 0;
    }
    async open () {
        this.opens++;
        this.readable = new ReadableStream({start: controller => { this.output = controller; }});
        this.writable = new WritableStream({write: data => {
            const text = new TextDecoder().decode(data);
            this.commands.push(text);
            if (text.includes('\x01')) this.send('raw REPL; CTRL-B to exit\r\n>');
            else if (this.respond) this.respond(text);
            else this.send('OK\x04\x04>');
        }});
    }
    send (data) { this.output.enqueue(new TextEncoder().encode(data)); }
    async close () { this.closes++; }
}
const fixture = () => {
    const device = new SerialDevice();
    let requests = 0;
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
        serial: {requestPort: async () => { requests++; return device; }}
    }});
    const transport = new MicroPythonTransport('Test', {probe: 'probe()', stop: 'stop()', timeout: 80});
    return {device, transport, requests: () => requests};
};

test('requires explicit connection and verifies firmware before reporting connected', async () => {
    const {transport, device, requests} = fixture();
    await assert.rejects(transport.runPython('move()'), /explícitamente/);
    assert.equal(requests(), 0);
    await transport.connect();
    assert.equal(transport.isConnected(), true);
    assert.deepEqual(device.commands.slice(1), ['probe()\x04', 'stop()\x04']);
    await transport.disconnect();
    assert.equal(transport.isConnected(), false);
    assert.equal(device.closes, 1);
});

test('waits for complete fragmented reply before starting next command', async () => {
    const {transport, device} = fixture();
    await transport.connect();
    device.respond = () => {};
    let done = false;
    const first = transport.runPython('move()').then(() => { done = true; });
    const next = transport.runPython('light()');
    await tick();
    device.send('OKhello\x04');
    await tick();
    assert.equal(done, false);
    assert.equal(device.commands.includes('light()\x04'), false);
    device.send('\x04>');
    await first;
    await tick();
    assert.equal(device.commands.at(-1), 'light()\x04');
    device.send('OK\x04\x04>');
    await next;
    device.respond = null;
    await transport.disconnect();
});

test('red stop preempts active work and cancels queued movements; repeated stop is idempotent', async () => {
    const {transport, device} = fixture();
    await transport.connect();
    device.respond = text => { if (text === 'stop()\x04') device.send('OK\x04\x04>'); };
    const running = assert.rejects(transport.runPython('move()'), /cancelada/);
    const queued = assert.rejects(transport.runPython('later()'), /cancelada/);
    await tick();
    const stopping = transport.emergencyStop();
    assert.equal(transport.emergencyStop(), stopping);
    await Promise.all([running, queued, stopping]);
    assert.equal(device.commands.includes('later()\x04'), false);
    assert.equal(device.commands.at(-1), 'stop()\x04');
    await transport.disconnect();
});

test('firmware error stops, closes and allows a clean explicit reconnection', async () => {
    const {transport, device} = fixture();
    await transport.connect();
    device.respond = text => device.send(text.startsWith('bad') ?
        'OK\x04Traceback: NameError\x04>' : 'OK\x04\x04>');
    await assert.rejects(transport.runPython('bad()'), /NameError/);
    assert.equal(transport.isConnected(), false);
    assert.equal(device.commands.at(-1), 'stop()\x04');
    device.respond = null;
    await transport.connect();
    await transport.runPython('ok()');
    assert.equal(transport.isConnected(), true);
    await transport.disconnect();
});

test('incompatible firmware never becomes connected', async () => {
    const {transport, device} = fixture();
    device.respond = () => device.send('OK\x04ImportError: rocky\x04>');
    await assert.rejects(transport.connect(), /ImportError/);
    assert.equal(transport.isConnected(), false);
    assert.equal(device.closes, 1);
});

test('USB removal cancels outstanding and queued commands without requesting a new port', async () => {
    const {transport, device, requests} = fixture();
    await transport.connect();
    device.respond = () => {};
    const pending = assert.rejects(transport.runPython('move()'));
    const queued = assert.rejects(transport.runPython('later()'));
    await tick();
    device.output.error(new Error('USB removed'));
    await Promise.all([pending, queued]);
    await tick();
    assert.equal(transport.isConnected(), false);
    assert.equal(requests(), 1);
    assert.equal(device.commands.includes('later()\x04'), false);
});

test('a silent board times out and invalidates queued commands', async () => {
    const {transport, device} = fixture();
    await transport.connect();
    device.respond = () => {};
    await assert.rejects(transport.runPython('move()'), /tiempo/);
    assert.equal(transport.isConnected(), false);
});

test('project replacement disconnects but retains safety for a reused extension', async () => {
    const {transport, device} = fixture();
    const runtime = new EventEmitter();
    bindSafetyEvents(runtime, transport);
    await transport.connect();
    runtime.emit('PROJECT_STOP_ALL');
    await transport.queue;
    assert.equal(device.commands.at(-1), 'stop()\x04');
    runtime.emit('RUNTIME_DISPOSED');
    await tick();
    await tick();
    assert.equal(runtime.listenerCount('PROJECT_STOP_ALL'), 1);
    assert.equal(transport.isConnected(), false);
    await transport.connect();
    runtime.emit('PROJECT_STOP_ALL');
    await transport.queue;
    assert.equal(device.commands.at(-1), 'stop()\x04');
    await transport.disconnect();
});

test('motion always has a board-side finally and a maximum five-second duration', () => {
    assert.match(boundedMotion('', 'drive()', 'stop()', 100), /sleep\(5\)\nfinally:\n    stop\(\)/);
    assert.equal(boundedMotion('', 'drive()', 'stop()', 0), '\nstop()');
    assert.throws(() => boundedMotion('', 'drive()', 'stop()', Infinity), /finito/);
});

test('robot blocks emit bounded commands and cannot execute arbitrary Python', async () => {
    for (const Robot of [Codey, Mbot, entries.find(x => x.entry.extensionId === 'smartCutebot').blockClass]) {
        const robot = new Robot();
        let code;
        robot.transport.runPython = source => { code = source; };
        const drive = robot.drivePower || robot.drive;
        await drive.call(robot, {LEFT: 150, RIGHT: -150, SECONDS: 100});
        assert.match(code, /\(100, -100\)/);
        assert.match(code, /finally:/);
        assert.match(code, /sleep\(5\)/);
        assert.throws(() => robot.runPython({CODE: 'drive_forever()'}), /desactivada/);
        assert.equal(robot.getInfo().blocks.some(b => b.opcode === 'runPython'), false);
    }
});

test('micro:bit uses its own pin API, rejects invalid pins and stops timed outputs', () => {
    const board = new (entries.find(x => x.entry.extensionId === 'microShield').blockClass)();
    let source;
    board.transport.runPython = code => { source = code; };
    board.digitalWrite({PIN: 1, VALUE: '1', SECONDS: 1});
    assert.match(source, /microbit.pin1/);
    assert.match(source, /finally:\n    _pin.write_digital\(0\)/);
    assert.throws(() => board.digitalWrite({PIN: 1.5}), /Pin no permitido/);
    assert.throws(() => board.digitalWrite({PIN: 37}), /Pin no permitido/);
    board.pwmWrite({PIN: 2, VALUE: 9999, FREQ: 50000, SECONDS: 1});
    assert.match(source, /write_analog\(1023\)/);
    assert.match(source, /set_analog_period_microseconds\(256\)/);
});
