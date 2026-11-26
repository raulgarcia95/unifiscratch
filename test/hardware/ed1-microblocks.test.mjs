import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {
    ChunkBuilder, MSG, MessageParser, MicroBlocksTransport, crc32, decodeValue, encodeValue, longMessage,
    parseVersion, shortMessage
} from '../../src/lib/libraries/extensions/preInstall/microblocks-transport.mjs';
import {
    G, blockClass as Ed1, bothMotorPhases, buildChunks, decodeSensors, singleMotorPhases
} from '../../src/lib/libraries/extensions/preInstall/ed1-board.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

const int32Bytes = n => [n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >>> 24) & 0xFF];
const boardLong = (type, id, data) => [0xFB, type, id, data.length & 0xFF, (data.length >> 8) & 0xFF, ...data];

// A fake MicroBlocks board: understands the IDE messages and answers like the VM.
class FakeBoard {
    constructor ({board = 'Citilab ED1', version = 383, silent = false, results = {}} = {}) {
        this.board = board;
        this.version = version;
        this.silent = silent;
        this.results = results; // chunk id -> value bytes to return
        this.stored = new Map();
        this.vars = {};
        this.started = [];
        this.stopAlls = 0;
        this.writesOfChunks = 0;
        this.hold = new Set(); // chunk ids that keep running until stopped
        this.running = new Set();
    }
    async open () {
        this.readable = new ReadableStream({start: controller => {
            this.output = controller;
        }});
        this.writable = new WritableStream({write: data => this.receive(data)});
        // ESP32 boot log before the VM starts: must be skipped by the parser.
        this.send([...new TextEncoder().encode('ets Jun  8 2016 00:22:57\r\nrst:0x1\r\n')]);
    }
    async close () {
        this.closed = true;
    }
    send (bytes) {
        if (!this.silent) this.output.enqueue(Uint8Array.from(bytes));
    }
    receive (data) {
        this.buffer = [...(this.buffer || []), ...data];
        while (this.buffer.length >= 3) {
            const b = this.buffer;
            if (b[0] === 0xFA) {
                this.short(b[1], b[2]);
                this.buffer = b.slice(3);
            } else if (b[0] === 0xFB) {
                if (b.length < 5) return;
                const size = b[3] | (b[4] << 8);
                if (b.length < 5 + size) return;
                assert.equal(b[5 + size - 1], 0xFE, 'messages to the board end with FE');
                this.long(b[1], b[2], b.slice(5, 5 + size - 1));
                this.buffer = b.slice(5 + size);
            } else {
                throw new Error(`byte inesperado ${b[0]}`);
            }
        }
    }
    short (type, id) {
        if (type === MSG.ping) this.send([0xFA, MSG.ping, id]);
        if (type === MSG.getVersion) {
            this.send(boardLong(MSG.version, 0, [2, ...new TextEncoder().encode(`v${this.version} ${this.board}`)]));
        }
        if (type === MSG.getChunkCRC && this.stored.has(id)) {
            this.send(boardLong(MSG.chunkCRC, id, int32Bytes(crc32(this.stored.get(id).slice(1)))));
        }
        if (type === MSG.stopAll) {
            this.stopAlls++;
            for (const running of this.running) this.send([0xFA, MSG.taskDone, running]);
            this.running.clear();
        }
        if (type === MSG.startChunk) {
            this.started.push({id, vars: {...this.vars}});
            this.send([0xFA, MSG.ping, id, 0xFA, MSG.taskStarted, id]);
            if (this.hold.has(id)) {
                this.running.add(id);
                return;
            }
            const result = this.results[id];
            if (result) this.send(boardLong(MSG.taskReturnedValue, id, result));
            else this.send([0xFA, MSG.taskDone, id]);
        }
    }
    long (type, id, body) {
        if (type === MSG.chunkCode16) {
            this.writesOfChunks++;
            this.stored.set(id, body);
            this.send([0xFA, MSG.ping, id]);
            this.send(boardLong(MSG.chunkCRC, id, int32Bytes(crc32(body.slice(1)))));
        }
        if (type === MSG.setVar) this.vars[id] = decodeValue(body);
    }
}

const withSerial = async (port, run) => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
        value: {serial: {requestPort: () => Promise.resolve(port)}},
        configurable: true
    });
    try {
        await run();
    } finally {
        if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor);
        else delete globalThis.navigator;
    }
};

const sensorList = values => {
    const data = [4, values.length, 0, values.length];
    for (const value of values) data.push(1, ...int32Bytes(value));
    return data;
};

test('MicroBlocks messages use the board framing', () => {
    assert.deepEqual([...shortMessage(MSG.ping)], [0xFA, 26, 0]);
    assert.deepEqual([...longMessage(MSG.setVar, 120, encodeValue(300))], [0xFB, 8, 120, 6, 0, 1, 44, 1, 0, 0, 0xFE]);
    assert.deepEqual([...longMessage(MSG.setVar, 116, encodeValue('Hi'))], [0xFB, 8, 116, 4, 0, 2, 72, 105, 0xFE]);
    assert.throws(() => encodeValue(1.5), /enteros/);
    const parser = new MessageParser();
    // Noise, a long version message split in two reads, then a short ping.
    const first = parser.push([0x0D, 0x0A, 0xFB, 22, 0, 11, 0, 2, 118, 51]);
    assert.deepEqual(first, []);
    const rest = parser.push([56, 51, 32, 76, 105, 110, 117, 120, 0xFA, 26, 0]);
    assert.equal(rest.length, 2);
    assert.deepEqual(parseVersion(decodeValue(rest[0].data)), {version: 383, board: 'Linux'});
    assert.deepEqual(rest[1], {type: MSG.ping, id: 0, data: []});
    assert.deepEqual(decodeValue([4, 3, 0, 3, 1, 5, 0, 0, 0, 2, 2, 104, 105, 3, 1]), [5, 'hi', true]);
    assert.equal(decodeValue([1, 0xFF, 0xFF, 0xFF, 0xFF]), -1);
});

test('the assembler emits MicroBlocks 16-bit bytecode with aligned string literals', () => {
    const chunk = new ChunkBuilder();
    chunk.int(0).global(118)
        .prim('io', 'playTone', 2, true);
    // initLocals 0, pushImmediate 0, pushGlobal 118, commandPrimitive io:playTone/2
    // (second word: set 3, literal 2 words ahead), codeEnd, then the literal
    // "playTone" (header 0x34: 3 words, string) padded with zeros.
    assert.deepEqual(chunk.bytes(), [
        9, 0, 2, 1, 6, 118, 36, 2, 2, 12, 127, 0,
        52, 0, 0, 0, 112, 108, 97, 121, 84, 111, 110, 101, 0, 0, 0, 0
    ]);
    const numbers = new ChunkBuilder().int(1500)
        .int(0xFFFFFF)
        .int(-1);
    assert.deepEqual(numbers.bytes().slice(2, 14), [3, 185, 11, 0, 4, 0, 255, 255, 255, 1, 2, 255]);
});

// These CRCs belong to chunks that were run on the MicroBlocks VM v383
// (Linux build with a simulated ED1 I2C expander, buzzer and screen): the
// stepper sequence, tone, text, sensor list and stop behaved as expected.
test('ED1 helper chunks match the versions checked on the MicroBlocks VM', () => {
    const chunks = buildChunks();
    const crcs = Object.fromEntries(Object.entries(chunks).map(([name, chunk]) => [
        name, crc32(Uint8Array.from(chunk.bytes)).toString(16)
    ]));
    assert.deepEqual(crcs, {
        init: 'fa429bbd',
        motors: '8fa2b996',
        stop: '1c88d38c',
        tone: '7390d6e3',
        sensors: '1587783d',
        text: 'f4b43e1',
        clear: '63f465a8'
    });
    for (const chunk of Object.values(chunks)) assert.equal(chunk.bytes.length % 4, 0);
});

test('ED1 stepper phases follow the MicroBlocks sequence', () => {
    // Motor 1 clockwise + motor 2 counter-clockwise = Fantàstic forward.
    assert.deepEqual(bothMotorPhases('clockwise', 'counterclockwise'), [0x99, 0xc3, 0x66, 0x3c]);
    assert.deepEqual(singleMotorPhases(1, 'clockwise'), [0x90, 0xc0, 0x60, 0x30]);
    assert.deepEqual(singleMotorPhases(2, 'counterclockwise'), [0x9, 0x3, 0x6, 0xc]);
    assert.throws(() => decodeSensors([1, 2]), /no válida/);
});

test('ED1 connects to MicroBlocks, installs chunks once and runs blocks', async () => {
    const values = [64, 73, 62, 87, 5, 74, 570, -12, 30, 100, 23];
    const board = new FakeBoard({results: {230: [1, 9, 0, 0, 0], 234: sensorList(values)}});
    const ed1 = new Ed1(new EventEmitter());
    await withSerial(board, async () => {
        await ed1.connect();
        assert.equal(ed1.isConnected(), true);
        assert.equal(board.writesOfChunks, 7);
        assert.equal(board.stopAlls, 1);
        assert.equal(board.started.at(-1).id, 230); // expander set-up

        await ed1.robotMove({DIRECTION: 'forward', DISTANCE: 100000});
        assert.deepEqual(board.started.at(-1), {id: 231, vars: {
            [G.steps]: 2300, [G.p1]: 0x99, [G.p2]: 0xc3, [G.p3]: 0x66, [G.p4]: 0x3c
        }});
        await ed1.robotTurn({SIDE: 'left', DEGREES: 90});
        assert.equal(board.started.at(-1).vars[G.steps], 176);
        await ed1.playTone({FREQ: 99999, SECONDS: 60});
        assert.equal(board.started.at(-1).id, 233);
        assert.equal(board.vars[G.freq], 10000);
        assert.equal(board.vars[G.ms], 5000);
        await ed1.showText({TEXT: 'Hola'});
        assert.equal(board.vars[G.text], 'Hola');

        // One round trip feeds every sensor block in the same frame.
        const before = board.started.length;
        assert.equal(await ed1.buttonTouched({BUTTON: 'ok'}), true);
        assert.equal(await ed1.buttonTouched({BUTTON: 'up'}), false);
        assert.equal(await ed1.lightLevel(), 57);
        assert.equal(await ed1.tilt({AXIS: 'y'}), 30);
        assert.equal(await ed1.temperature(), 23);
        assert.equal(board.started.length, before + 1);

        assert.throws(() => ed1.buttonTouched({BUTTON: "ok'] + x"}), /Botón/);
        assert.throws(() => ed1.motorSteps({MOTOR: 3, ROTATION: 'clockwise', STEPS: 1}), /Motor/);
        assert.throws(() => ed1.runPython({CODE: 'while True: pass'}), /desactivada/);
        assert.equal(ed1.getInfo().blocks.some(block => block.opcode === 'runPython'), false);

        // Reconnecting does not store the chunks again.
        await ed1.disconnect();
        assert.equal(ed1.isConnected(), false);
        await ed1.connect();
        assert.equal(board.writesOfChunks, 7);
        await ed1.disconnect();
    });
});

test('ED1 stop ends a running move and switches the coils off', async () => {
    const board = new FakeBoard({results: {230: [1, 9, 0, 0, 0]}});
    board.hold.add(231);
    const ed1 = new Ed1(new EventEmitter());
    await withSerial(board, async () => {
        await ed1.connect();
        const move = ed1.motorSteps({MOTOR: '1', ROTATION: 'clockwise', STEPS: 500});
        await tick();
        await tick();
        await ed1.stop();
        await assert.rejects(move, /cancelada/);
        assert.equal(board.stopAlls, 2);
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(board.started.at(-1).id, 232); // stop chunk: expander output 0, tone off
        // Blocks work again after a stop.
        board.hold.clear();
        await ed1.motorSteps({MOTOR: '2', ROTATION: 'counterclockwise', STEPS: 3});
        assert.equal(board.started.at(-1).id, 231);
        await ed1.disconnect();
    });
});

test('ED1 connection refuses other boards, old firmware and silent ports', async () => {
    for (const [options, pattern] of [
        [{board: 'micro:bit'}, /«micro:bit», no una Citilab ED1/],
        [{version: 99}, /antiguo/],
        [{silent: true}, /no responde/]
    ]) {
        const board = new FakeBoard(options);
        const ed1 = new Ed1(new EventEmitter());
        ed1.transport.connectTimeout = 300;
        await withSerial(board, async () => {
            await assert.rejects(ed1.connect(), pattern);
        });
        assert.equal(ed1.isConnected(), false);
        assert.equal(board.closed, true);
        assert.match(ed1.connectionError(), pattern);
        await assert.rejects(ed1.lightLevel(), /Conecta/);
    }
});

test('a lost USB port marks the ED1 as disconnected', async () => {
    const board = new FakeBoard({results: {230: [1, 9, 0, 0, 0]}});
    const ed1 = new Ed1(new EventEmitter());
    await withSerial(board, async () => {
        await ed1.connect();
        board.output.error(new Error('The device has been lost.'));
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.equal(ed1.isConnected(), false);
        assert.match(ed1.connectionError(), /lost/);
    });
});

test('MicroBlocksTransport refuses blocks before connecting', async () => {
    const transport = new MicroBlocksTransport('X');
    await assert.rejects(transport.run('anything'), /Conecta/);
});
