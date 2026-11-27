import './spanish-locale.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {
    MicrobitUartTransport, UART_SERVICE, UART_CHAR_A, UART_CHAR_B, MICROBIT_USB_VENDOR
} from '../../src/lib/libraries/extensions/preInstall/microbit-uart-transport.mjs';
import {
    blockClass as Cutebot, entry, parseSensors, parseGesture, matrixBits, tiltAngle, HEART, ICONS, GESTURES
} from '../../src/lib/libraries/extensions/preInstall/microbit-cutebot.mjs';
import {guideFor} from '../../src/lib/libraries/extensions/setup-guides.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

// ---------- Simulated micro:bit with the Unifyscratch firmware ----------

class Firmware {
    constructor ({silent = false, hello = 'CB2 2'} = {}) {
        this.silent = silent;
        this.hello = hello;
        this.lines = [];
        this.partial = '';
        this.packets = [];
    }
    // Bytes from the host; replies go through this.reply.
    input (bytes) {
        this.packets.push(bytes.length);
        this.partial += new TextDecoder().decode(bytes);
        let index;
        while ((index = this.partial.indexOf('\n')) >= 0) {
            const line = this.partial.slice(0, index);
            this.partial = this.partial.slice(index + 1);
            this.lines.push(line);
            if (line === '?' && !this.silent) this.reply(`${this.hello}\n`);
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
        // The micro:bit indicates on 0002 and receives on 0003.
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
    let request;
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {bluetooth: {requestDevice: async options => {
            request = options;
            return device;
        }}}
    });
    try {
        await run(() => request);
    } finally {
        if (previous) Object.defineProperty(globalThis, 'navigator', previous);
        else delete globalThis.navigator;
    }
};

class FakePort {
    constructor () {
        this.firmware = new Firmware();
        this.firmware.reply = text => this.output.enqueue(new TextEncoder().encode(text));
    }
    async open (options) {
        this.options = options;
        this.readable = new ReadableStream({start: controller => { this.output = controller; }});
        this.writable = new WritableStream({write: data => this.firmware.input(data)});
    }
    async close () {
        this.closed = true;
    }
}

// ---------- Tests ----------

test('sensor lines and LED matrices are decoded', () => {
    assert.deepEqual(parseSensors('D 23 1 0 0 1'), {distance: 23, left: 1, right: 0, a: 0, b: 1});
    assert.deepEqual(parseSensors('D 23 1 0 0 1 1 24 130 -12 500 -1020 40 271'), {
        distance: 23, left: 1, right: 0, a: 0, b: 1, logo: 1, temperature: 24, light: 130,
        x: -12, y: 500, z: -1020, sound: 40, heading: 271
    });
    assert.equal(parseGesture('G 1'), 'shake');
    assert.equal(parseGesture('G 8'), 'freeFall');
    assert.equal(parseGesture('G 9'), null);
    assert.equal(GESTURES.length, 8);
    Object.values(ICONS).forEach(icon => assert.match(icon, /^[01]{25}$/));
    assert.equal(parseSensors('CB1'), null);
    assert.equal(parseSensors('D x 1 0 0 1'), null);
    assert.equal(matrixBits('1'.padEnd(25, '0')), 1);
    assert.equal(matrixBits('1'.repeat(25)), (2 ** 25) - 1);
    assert.equal(matrixBits(HEART), 0b0010001110111111111101010);
});

test('Cutebot connects by Bluetooth, checks the firmware and sends bounded orders', async () => {
    const device = new FakeMicrobit();
    await withBluetooth(device, async request => {
        const robot = new Cutebot(new EventEmitter());
        await robot.connectBluetooth();
        assert.deepEqual(request().filters, [{namePrefix: 'BBC micro:bit'}]);
        assert.deepEqual(request().optionalServices, [UART_SERVICE]);
        assert.equal(robot.isConnected(), true);
        assert.deepEqual(device.firmware.lines, ['?', 'S']);

        robot.transport.wait = () => Promise.resolve();
        await robot.driveTimed({LEFT: 150, RIGHT: -30.4, SECONDS: 9});
        await robot.drive({LEFT: 20, RIGHT: 20});
        await robot.headlight({LIGHT: 'right', COLOR: '#ff0010'});
        await robot.headlight({LIGHT: 'both', COLOR: '#000000'});
        await robot.servo({SERVO: '2', ANGLE: 500});
        await robot.showText({TEXT: 'una frase bastante larga que no cabe en la pantalla'});
        assert.deepEqual(device.firmware.lines.slice(2), [
            'M 100 -30 5000', 'M 20 20 0', 'H 1 255 0 16', 'H 2 0 0 0', 'V 2 180',
            'T una frase bastante larga que no cabe en '
        ]);
        assert.ok(device.firmware.packets.every(size => size <= 20), 'Bluetooth writes fit in 20 bytes');
        assert.throws(() => robot.drive({LEFT: Infinity, RIGHT: 0}), /finito/);

        device.toHost.notify('D 12 1 0 1 0\n');
        assert.equal(robot.distance(), 12);
        assert.equal(robot.onLine({SIDE: 'left'}), true);
        assert.equal(robot.onLine({SIDE: 'right'}), false);
        assert.equal(robot.buttonPressed({BUTTON: 'a'}), true);

        await robot.stop();
        assert.equal(device.firmware.lines.at(-1), 'S');

        device.drop();
        assert.equal(robot.isConnected(), false);
        assert.match(robot.connectionError(), /Bluetooth/);
        await assert.rejects(robot.drive({LEFT: 1, RIGHT: 1}), /Conecta el Cutebot/);
    });
});

test('a stop or a red flag cancels a timed move on the robot', async () => {
    const device = new FakeMicrobit();
    await withBluetooth(device, async () => {
        const runtime = new EventEmitter();
        const robot = new Cutebot(runtime);
        await robot.connectBluetooth();
        const moving = robot.driveTimed({LEFT: 50, RIGHT: 50, SECONDS: 5});
        await tick();
        runtime.emit('PROJECT_STOP_ALL');
        await assert.rejects(moving, /cancelada/);
        await tick();
        assert.equal(device.firmware.lines.at(-1), 'S');
        await robot.disconnect();
    });
});

test('a micro:bit without the Unifyscratch firmware is reported clearly', async () => {
    const device = new FakeMicrobit({silent: true});
    await withBluetooth(device, async () => {
        const robot = new Cutebot(new EventEmitter());
        robot.transport.timeout = 50;
        await assert.rejects(robot.connectBluetooth(), /firmware de Unifyscratch/);
        assert.equal(robot.isConnected(), false);
        assert.equal(device.gatt.connected, false);
    });
});

test('USB speaks the same protocol through Web Serial', async () => {
    const port = new FakePort();
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
        const transport = new MicrobitUartTransport('Cutebot');
        await transport.connectUsb();
        assert.deepEqual(filters, [{usbVendorId: MICROBIT_USB_VENDOR}]);
        assert.equal(port.options.baudRate, 115200);
        await transport.send('M 10 10 0');
        assert.deepEqual(port.firmware.lines, ['?', 'S', 'M 10 10 0']);
        await transport.disconnect();
        assert.equal(port.firmware.lines.at(-1), 'S');
        assert.equal(port.closed, true);
        assert.equal(transport.isConnected(), false);
    } finally {
        if (previous) Object.defineProperty(globalThis, 'navigator', previous);
        else delete globalThis.navigator;
    }
});

test('Cutebot shows a firmware guide with the .hex download', () => {
    assert.equal(entry.extensionId, 'smartCutebot');
    const guide = guideFor('smartCutebot');
    assert.ok(guide.warning);
    const download = guide.actions.find(action => action.type === 'download');
    assert.equal(download.path, 'static/extensions/cutebot/unifyscratch-cutebot.hex');
    const blocks = new Cutebot().getInfo().blocks.map(block => block.opcode);
    assert.ok(blocks.indexOf('connectBluetooth') < blocks.indexOf('connectUsb'), 'Bluetooth comes first');
    assert.ok(blocks.includes('showHelp'));
});

test('micro:bit blocks: buttons, logo, gestures, tilt, sensors and display', async () => {
    const device = new FakeMicrobit();
    await withBluetooth(device, async () => {
        const robot = new Cutebot(new EventEmitter());
        await robot.connectBluetooth();
        assert.equal(robot.connectionError(), '');
        assert.equal(robot.isV2(), true);

        device.toHost.notify('D 30 0 0 0 1 1 22 140 0 500 -866 55 90\n');
        assert.equal(robot.whenButton({BUTTON: 'b'}), true);
        assert.equal(robot.buttonPressed({BUTTON: 'a'}), false);
        assert.equal(robot.buttonPressed({BUTTON: 'any'}), true);
        assert.equal(robot.logoTouched(), true);
        assert.equal(robot.whenLogoTouched(), true);
        assert.equal(robot.temperature(), 22);
        assert.equal(robot.lightLevel(), 140);
        assert.equal(robot.acceleration({AXIS: 'y'}), 500);
        assert.equal(robot.acceleration({AXIS: 'strength'}), 1000);
        assert.equal(robot.tiltAngle({DIRECTION: 'front'}), 30);
        assert.equal(robot.tiltAngle({DIRECTION: 'back'}), -30);
        assert.equal(robot.isTilted({DIRECTION: 'front'}), true);
        assert.equal(robot.isTilted({DIRECTION: 'left'}), false);
        assert.equal(robot.isTilted({DIRECTION: 'any'}), true);
        assert.equal(robot.compassHeading(), 90);
        assert.equal(robot.soundLevel(), 55);
        robot.compassHeading();

        assert.equal(robot.whenGesture({GESTURE: 'shake'}), false);
        device.toHost.notify('G 1\n');
        assert.equal(robot.whenGesture({GESTURE: 'shake'}), true);
        assert.equal(robot.whenGesture({GESTURE: 'freeFall'}), false);

        await robot.showIcon({ICON: 'yes'});
        await robot.plotLed({X: 9, Y: 1.2, STATE: 'off'});
        await robot.plotLed({X: 0, Y: 4, STATE: 'on'});
        await robot.setBrightness({LEVEL: 50});
        await tick();
        assert.deepEqual(device.firmware.lines.slice(2), [
            'Q 1', 'Q 2', `I ${matrixBits(ICONS.yes)}`, 'P 4 1 0', 'P 0 4 1', 'R 128'
        ]);
        assert.ok(device.firmware.packets.every(size => size <= 20), 'Bluetooth writes fit in 20 bytes');
        await robot.disconnect();
    });
});

test('tilt angles follow the micro:bit axes', () => {
    assert.equal(tiltAngle({x: 0, y: 0, z: -1024}, 'front'), 0);
    assert.equal(tiltAngle({x: 1024, y: 0, z: 0}, 'right'), 90);
    assert.equal(tiltAngle({x: 1024, y: 0, z: 0}, 'left'), -90);
});

test('an old Cutebot firmware still connects but asks for the new .hex', async () => {
    const device = new FakeMicrobit({hello: 'CB1'});
    await withBluetooth(device, async () => {
        const robot = new Cutebot(new EventEmitter());
        await robot.connectBluetooth();
        assert.equal(robot.isConnected(), true);
        assert.equal(robot.isV2(), false);
        assert.match(robot.connectionError(), /firmware antiguo/);
        device.toHost.notify('D 12 1 0 1 0\n');
        assert.equal(robot.distance(), 12);
        assert.equal(robot.temperature(), 0);
        await robot.disconnect();
    });
});
