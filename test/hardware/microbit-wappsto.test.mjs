import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {
    blockClass as WappstoBit, entry, parseSensors, parseStatus, parseIncoming, TEMPLATES
} from '../../src/lib/libraries/extensions/preInstall/microbit-wappsto.mjs';
import {MICROBIT_USB_VENDOR} from '../../src/lib/libraries/extensions/preInstall/microbit-uart-transport.mjs';
import {guideFor} from '../../src/lib/libraries/extensions/setup-guides.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

// Simulated micro:bit with the Unifiscratch Wappsto:bit firmware, over USB.
class FakePort {
    constructor ({silent = false} = {}) {
        this.silent = silent;
        this.lines = [];
        this.partial = '';
    }
    async open (options) {
        this.options = options;
        this.readable = new ReadableStream({start: controller => {
            this.output = controller;
        }});
        this.writable = new WritableStream({write: data => this.input(data)});
    }
    async close () {
        this.closed = true;
    }
    reply (text) {
        this.output.enqueue(new TextEncoder().encode(text));
    }
    input (bytes) {
        this.partial += new TextDecoder().decode(bytes);
        let index;
        while ((index = this.partial.indexOf('\n')) >= 0) {
            const line = this.partial.slice(0, index);
            this.partial = this.partial.slice(index + 1);
            this.lines.push(line);
            if (this.silent) continue;
            if (line === '?') this.reply('WB1\n');
            const read = /^R (\d) ([ad])$/.exec(line);
            if (read) this.reply(`R ${read[1]} ${read[2] === 'a' ? 612 : 1}\n`);
        }
    }
}

const withSerial = async (port, run) => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    let filters;
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {serial: {requestPort: async options => {
            filters = options.filters;
            return port;
        }}}
    });
    try {
        await run(() => filters);
    } finally {
        if (previous) Object.defineProperty(globalThis, 'navigator', previous);
        else delete globalThis.navigator;
    }
};

const settle = async () => {
    for (let i = 0; i < 5; i++) await tick();
};

test('firmware lines are decoded', () => {
    assert.deepEqual(parseSensors('D 1 0 23 120 -16 980 4'), {a: 1, b: 0, temperature: 23, light: 120, x: -16, y: 980, z: 4});
    assert.equal(parseSensors('D 1 0'), null);
    assert.deepEqual(parseStatus('E 1 73 NaN NaN'), {online: true, signal: 73, latitude: '', longitude: ''});
    assert.deepEqual(parseStatus('E 0 0 41.38 2.17'), {online: false, signal: 0, latitude: 41.38, longitude: 2.17});
    assert.deepEqual(parseIncoming('W 16 hola món'), {valueId: 16, text: 'hola món'});
    assert.deepEqual(parseIncoming('W 3'), {valueId: 3, text: ''});
    assert.equal(parseIncoming('WB1'), null);
    assert.equal(TEMPLATES.length, 10);
});

test('Wappsto blocks send bounded orders and receive dashboard values', async () => {
    const port = new FakePort();
    await withSerial(port, async filters => {
        const board = new WappstoBit(new EventEmitter());
        await board.connectUsb();
        assert.deepEqual(filters(), [{usbVendorId: MICROBIT_USB_VENDOR}]);
        assert.equal(port.options.baudRate, 115200);
        assert.deepEqual(port.lines.slice(0, 2), ['?', 'S']);

        await board.setName({NAME: 'Aula 3\nB'});
        await board.setupNumber({ID: '2', NAME: 'Llum', TYPE: 'light'});
        await board.setupText({ID: 16, NAME: 'Missatge'});
        await board.sendNumber({VALUE: 21.1234567, ID: '2', WHEN: 'change'});
        await board.sendNumber({VALUE: 21.1234567, ID: '2', WHEN: 'change'}); // unchanged: skipped
        await board.sendNumber({VALUE: 21.1234567, ID: '2', WHEN: 'always'});
        await board.sendText({VALUE: 'un text molt llarg que no hi cap sencer', ID: '16', WHEN: 'change'});
        await board.digitalWrite({PIN: '1', VALUE: '1'});
        await board.analogWrite({PIN: 2, VALUE: 5000});
        await board.clearModel();
        const sent = port.lines.filter(line => line !== 'K').slice(2);
        assert.deepEqual(sent, [
            'N Aula 3 B', 'V 2 1 Llum', 'G 16 Missatge', 'U 2 21.123457', 'U 2 21.123457',
            'X 16 un text molt llarg que n', 'P 1 1', 'A 2 1023', 'Z'
        ]);
        assert.throws(() => board.setupNumber({ID: 16, NAME: 'x', TYPE: 'number'}), /1 a 15/);
        assert.throws(() => board.sendText({ID: 3, VALUE: 'x'}), /16 a 20/);
        assert.throws(() => board.sendNumber({ID: 1, VALUE: Infinity}), /finito/);
        assert.throws(() => board.digitalWrite({PIN: 8, VALUE: 1}), /Pin no permitido/);

        assert.equal(await board.readPin({PIN: '0', MODE: 'a'}), 612);
        assert.equal(await board.readPin({PIN: '1', MODE: 'd'}), 1);

        // The hat offers the value to Wappsto and fires once per new message.
        const util = {target: {id: 'sprite'}};
        assert.equal(board.whenReceived({ID: '3'}, util), false);
        await settle();
        assert.ok(port.lines.includes('L 3'));
        port.reply('D 1 0 22 80 0 0 -1024\nE 1 64 NaN NaN\nW 3 42\n');
        await settle();
        assert.equal(board.whenReceived({ID: '3'}, util), true);
        assert.equal(board.whenReceived({ID: '3'}, util), false);
        assert.equal(board.receivedValue({ID: '3'}), 42);
        assert.equal(board.isOnline(), true);
        assert.equal(board.signal(), 64);
        assert.equal(board.location({AXIS: 'latitude'}), '');
        assert.equal(board.buttonPressed({BUTTON: 'a'}), true);
        assert.equal(board.temperature(), 22);
        assert.equal(board.acceleration({DIRECTION: 'z'}), -1024);
        assert.equal(port.lines.filter(line => line === 'L 3').length, 1, 'listens only once');

        await board.disconnect();
        assert.equal(port.lines.at(-1), 'S');
        assert.equal(board.isConnected(), false);
        assert.equal(board.isOnline(), false);
        await assert.rejects(board.sendNumber({VALUE: 1, ID: 1, WHEN: 'always'}), /Wappsto:bit/);
    });
});

test('a micro:bit without the Unifiscratch program is reported clearly', async () => {
    const port = new FakePort({silent: true});
    await withSerial(port, async () => {
        const board = new WappstoBit(new EventEmitter());
        board.transport.timeout = 50;
        await assert.rejects(board.connectUsb(), /programa de Unifiscratch para Wappsto:bit/);
        assert.equal(board.isConnected(), false);
    });
});

test('Wappsto:bit has its own guide with the .hex download', () => {
    assert.equal(entry.extensionId, 'wappstoBit');
    assert.equal(entry.disabled, false);
    const guide = guideFor('wappstoBit');
    assert.ok(guide.warning);
    const download = guide.actions.find(action => action.type === 'download');
    assert.equal(download.path, 'static/extensions/wappsto-bit/unifiscratch-wappsto-bit.hex');
    const blocks = new WappstoBit().getInfo().blocks.map(block => block.opcode);
    assert.ok(blocks.indexOf('connectBluetooth') < blocks.indexOf('connectUsb'), 'Bluetooth comes first');
    assert.ok(blocks.includes('showHelp'));
});
