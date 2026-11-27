import './spanish-locale.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {UART_SERVICE, UART_CHAR_A, UART_CHAR_B} from '../../src/lib/libraries/extensions/preInstall/microbit-uart-transport.mjs';
import {
    blockClass as MicroShield, entry, parseSensors, parsePins, stepperMs, matrixBits, HEART, MAX_STEPPER_MS
} from '../../src/lib/libraries/extensions/preInstall/microbit-microshield.mjs';
import {guideFor} from '../../src/lib/libraries/extensions/setup-guides.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

// ---------- Simulated micro:bit with the Unifiscratch micro:shield firmware ----------

class Firmware {
    constructor ({silent = false} = {}) {
        this.silent = silent;
        this.lines = [];
        this.partial = '';
        this.packets = [];
    }
    input (bytes) {
        this.packets.push(bytes.length);
        this.partial += new TextDecoder().decode(bytes);
        let index;
        while ((index = this.partial.indexOf('\n')) >= 0) {
            const line = this.partial.slice(0, index);
            this.partial = this.partial.slice(index + 1);
            this.lines.push(line);
            if (line === '?' && !this.silent) this.reply('MS1\n');
        }
    }
}

class FakeCharacteristic extends EventTarget {
    constructor (uuid, properties, firmware) {
        super();
        this.uuid = uuid;
        this.properties = properties;
        this.firmware = firmware;
    }
    async writeValueWithResponse (data) {
        this.firmware.input(new Uint8Array(data));
    }
    async startNotifications () {
        this.notifying = true;
    }
    notify (text) {
        this.value = new DataView(new TextEncoder().encode(text).buffer);
        this.dispatchEvent(new Event('characteristicvaluechanged'));
    }
}

class FakeMicrobit extends EventTarget {
    constructor (options) {
        super();
        this.name = 'BBC micro:bit [zuvet]';
        this.firmware = new Firmware(options);
        const toHost = new FakeCharacteristic(UART_CHAR_A, {indicate: true}, this.firmware);
        const fromHost = new FakeCharacteristic(UART_CHAR_B, {write: true, writeWithoutResponse: true}, this.firmware);
        this.firmware.reply = text => setImmediate(() => toHost.notify(text));
        this.toHost = toHost;
        const chars = {[UART_CHAR_A]: toHost, [UART_CHAR_B]: fromHost};
        const service = {getCharacteristic: async uuid => chars[uuid]};
        this.gatt = {
            connected: false,
            connect: async () => {
                this.gatt.connected = true;
                return {getPrimaryService: async uuid => {
                    if (uuid !== UART_SERVICE) throw new Error('NotFoundError');
                    return service;
                }};
            },
            disconnect: () => {
                this.gatt.connected = false;
            }
        };
    }
    drop () {
        this.gatt.connected = false;
        this.dispatchEvent(new Event('gattserverdisconnected'));
    }
}

const withBluetooth = async (device, run) => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {bluetooth: {requestDevice: async () => device}}
    });
    try {
        await run();
    } finally {
        if (previous) Object.defineProperty(globalThis, 'navigator', previous);
        else delete globalThis.navigator;
    }
};

// ---------- Tests ----------

test('sensor and pin lines are decoded; stepper time is bounded', () => {
    assert.deepEqual(parseSensors('D 23 0 1'), {distance: 23, a: 0, b: 1});
    assert.equal(parseSensors('MS1'), null);
    assert.equal(parseSensors('D x 0 1'), null);
    assert.deepEqual(parsePins('E 0:512 8:1'), {0: 512, 8: 1});
    assert.deepEqual(parsePins('E'), {});
    assert.equal(parsePins('D 1 0 0'), null);
    assert.equal(stepperMs(360, 'degrees'), 10750);
    assert.equal(stepperMs(-90, 'degrees'), 2688);
    assert.equal(stepperMs(10, 'turns'), MAX_STEPPER_MS);
    assert.equal(matrixBits(HEART), 0b0010001110111111111101010);
});

test('micro:shield connects by Bluetooth, checks the firmware and sends bounded orders', async () => {
    const device = new FakeMicrobit();
    await withBluetooth(device, async () => {
        const board = new MicroShield(new EventEmitter());
        await board.connectBluetooth();
        assert.equal(board.isConnected(), true);
        assert.deepEqual(device.firmware.lines, ['?', 'S']);

        board.transport.wait = () => Promise.resolve();
        await board.servo({SERVO: 'S7', ANGLE: 500});
        await board.servoOff({SERVO: 'S0'});
        await board.motorTimed({MOTOR: 'M2', SPEED: -150, SECONDS: 9});
        await board.motor({MOTOR: 'M4', SPEED: 33.6});
        await board.motorStop({MOTOR: 'M4'});
        await board.stepper({STEPPER: '2', AMOUNT: -90, UNIT: 'degrees'});
        await board.digitalWrite({PIN: 'P12', VALUE: '1'});
        await board.analogWrite({PIN: '1', VALUE: 5000});
        await board.stripAll({PIN: '8', COUNT: 200, COLOR: '#ff0010'});
        await board.stripPixel({PIN: '8', INDEX: 3, COLOR: '#000000'});
        assert.deepEqual(device.firmware.lines.slice(2), [
            'V 7 180', 'F 0', 'M 2 -100 5000', 'M 4 34 0', 'M 4 0 0', 'P 2 -1 2688',
            'W 12 1', 'A 1 1023', 'L 8 64 0 255 0 16', 'L 8 0 3 0 0 0'
        ]);
        assert.ok(device.firmware.packets.every(size => size <= 20), 'Bluetooth writes fit in 20 bytes');

        assert.throws(() => board.servo({SERVO: 'S8', ANGLE: 0}), /Servo no válido/);
        assert.throws(() => board.motor({MOTOR: 'M5', SPEED: 0}), /Motor no válido/);
        assert.throws(() => board.digitalWrite({PIN: '3', VALUE: '1'}), /Pin no permitido/);
        await assert.rejects(board.analogRead({PIN: '8'}), /Pin no permitido/);

        // Reading a pin asks the firmware to watch it once, then uses its reports.
        const reading = board.analogRead({PIN: '0'});
        await reading;
        device.toHost.notify('E 0:700\n');
        assert.equal(await board.analogRead({PIN: '0'}), 700);
        assert.equal(device.firmware.lines.filter(line => line === 'G 0 2').length, 1);

        const distance = board.distance({TRIG: '1', ECHO: '2'});
        await distance;
        device.toHost.notify('D 42 1 0\n');
        assert.equal(await board.distance({TRIG: '1', ECHO: '2'}), 42);
        assert.equal(device.firmware.lines.filter(line => line === 'U 1 2').length, 1);
        assert.equal(board.buttonPressed({BUTTON: 'a'}), true);
        assert.equal(board.buttonPressed({BUTTON: 'b'}), false);

        await board.stop();
        assert.equal(device.firmware.lines.at(-1), 'S');

        device.drop();
        assert.equal(board.isConnected(), false);
        await assert.rejects(board.motor({MOTOR: 'M1', SPEED: 1}), /Conecta la micro:shield/);
    });
});

test('a red flag cancels a stepper turn on the board', async () => {
    const device = new FakeMicrobit();
    await withBluetooth(device, async () => {
        const runtime = new EventEmitter();
        const board = new MicroShield(runtime);
        await board.connectBluetooth();
        const turning = board.stepper({STEPPER: '1', AMOUNT: 1, UNIT: 'turns'});
        await tick();
        runtime.emit('PROJECT_STOP_ALL');
        await assert.rejects(turning, /cancelada/);
        await tick();
        assert.equal(device.firmware.lines.at(-1), 'S');
        await board.disconnect();
    });
});

test('a micro:bit without the micro:shield firmware is reported clearly', async () => {
    const device = new FakeMicrobit({silent: true});
    await withBluetooth(device, async () => {
        const board = new MicroShield(new EventEmitter());
        board.transport.timeout = 50;
        await assert.rejects(board.connectBluetooth(), /firmware de Unifiscratch para micro:shield/);
        assert.equal(board.isConnected(), false);
    });
});

test('micro:shield keeps its extension id and shows a firmware guide with the .hex download', () => {
    assert.equal(entry.extensionId, 'microShield');
    const guide = guideFor('microShield');
    assert.ok(guide.warning);
    const download = guide.actions.find(action => action.type === 'download');
    assert.equal(download.path, 'static/extensions/microshield/unifiscratch-microshield.hex');
    const blocks = new MicroShield().getInfo().blocks.map(block => block.opcode);
    assert.ok(blocks.indexOf('connectBluetooth') < blocks.indexOf('connectUsb'), 'Bluetooth comes first');
    ['servo', 'motor', 'stepper', 'distance', 'stripAll', 'showHelp'].forEach(opcode => assert.ok(blocks.includes(opcode), opcode));
});
