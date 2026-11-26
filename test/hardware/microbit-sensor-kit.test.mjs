import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {UART_SERVICE, UART_CHAR_A, UART_CHAR_B} from '../../src/lib/libraries/extensions/preInstall/microbit-uart-transport.mjs';
import {
    blockClass as SensorKit, entry, oledSafe, convert, altitude, IR_KEYS
} from '../../src/lib/libraries/extensions/preInstall/microbit-sensor-kit.mjs';
import {blockClass as MicroShield} from '../../src/lib/libraries/extensions/preInstall/microbit-microshield.mjs';
import {sensorKitTexts} from '../../src/lib/libraries/extensions/preInstall/microbit-sensor-kit-texts.mjs';
import {ACTION_BUTTON_PREFIX} from '../../src/lib/libraries/extensions/preInstall/action-buttons.mjs';

// ---------- Simulated micro:bit with the micro:shield firmware + kit.ts ----------
class Firmware {
    constructor (answers) {
        this.answers = answers;
        this.lines = [];
        this.partial = '';
    }
    input (bytes) {
        this.partial += new TextDecoder().decode(bytes);
        let index;
        while ((index = this.partial.indexOf('\n')) >= 0) {
            const line = this.partial.slice(0, index);
            this.partial = this.partial.slice(index + 1);
            this.lines.push(line);
            if (line === '?') this.reply('MS2\n');
            const x = /^X (\d+) (\w+)(.*)$/.exec(line);
            if (x) {
                const answer = this.answers[`${x[2]}${x[3]}`.trim()];
                this.reply(`X ${x[1]} ${typeof answer === 'undefined' ? 'E' : answer}\n`);
            }
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
    async startNotifications () {}
    notify (text) {
        this.value = new DataView(new TextEncoder().encode(text).buffer);
        this.dispatchEvent(new Event('characteristicvaluechanged'));
    }
}

class FakeMicrobit extends EventTarget {
    constructor (answers = {}) {
        super();
        this.firmware = new Firmware(answers);
        const toHost = new FakeCharacteristic(UART_CHAR_A, {indicate: true}, this.firmware);
        const fromHost = new FakeCharacteristic(UART_CHAR_B, {write: true}, this.firmware);
        this.firmware.reply = text => setImmediate(() => toHost.notify(text));
        this.toHost = toHost;
        const chars = {[UART_CHAR_A]: toHost, [UART_CHAR_B]: fromHost};
        this.gatt = {
            connected: false,
            connect: async () => {
                this.gatt.connected = true;
                return {getPrimaryService: async uuid => {
                    if (uuid !== UART_SERVICE) throw new Error('NotFoundError');
                    return {getCharacteristic: async c => chars[c]};
                }};
            },
            disconnect: () => {
                this.gatt.connected = false;
            }
        };
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

test('conversions and OLED text are safe', () => {
    assert.equal(convert.percent(1023), 100);
    assert.equal(convert.percent(512), 50);
    assert.equal(convert.lm35(70), 22.6);
    assert.equal(altitude(101325), 0);
    assert.ok(Math.abs(altitude(89875) - 1000) < 5);
    assert.equal(oledSafe('Humitat: 45% ñ àé 21°'), 'Humitat: 45% n ae 21°');
    assert.equal(oledSafe('x'.repeat(40)).length, 21);
    assert.equal(IR_KEYS.ok, 0x40);
});

test('every block has its three translations and every menu value is handled', () => {
    const info = new SensorKit().getInfo();
    info.blocks.filter(block => typeof block === 'object').forEach(block => {
        const key = block.text.id.replace('unifiscratch.extensions.sensorKit.', '');
        assert.equal(sensorKitTexts[key].length, 3, key);
        // A connection or help button runs the method named after its prefix.
        const method = block.blockType === 'button' ? block.func.replace(ACTION_BUTTON_PREFIX, '') : block.opcode;
        assert.equal(typeof SensorKit.prototype[method], 'function', method);
    });
    assert.equal(entry.extensionId, 'microbitSensorKit');
});

test('sensor blocks ask the firmware once per reading and convert the answer', async () => {
    const device = new FakeMicrobit({
        'AR 2': 512, 'AR 0': 70, 'DR 8': 0, 'DR 13': 1, 'US 1 2': 37,
        'DH 8': '2300 55', 'IM': '-500 0 1000 12 -3 0', 'CO': '612 40',
        'BA': '101325 2150', 'IR 8': '22 3', 'IS 1 22': 0, 'OC': 0,
        'OT 2 3 Hola': 0, 'OL 1 0 3.14': 0
    });
    await withBluetooth(device, async () => {
        const kit = new SensorKit(new EventEmitter());
        await kit.connectBluetooth();
        assert.equal(await kit.soil({PIN: 'P2'}), 50);
        assert.equal(await kit.lm35({PIN: '0'}), 22.6);
        assert.equal(await kit.collision({PIN: '8'}), true);
        assert.equal(await kit.line({PIN: '13'}), true);
        assert.equal(await kit.distance({TRIG: '1', ECHO: '2'}), 37);
        assert.equal(await kit.dht({PIN: '8', VALUE: 'temperature'}), 23);
        assert.equal(await kit.dht({PIN: '8', VALUE: 'humidity'}), 55);
        assert.equal(await kit.imu({AXIS: 'ax'}), -0.5);
        assert.equal(await kit.imu({AXIS: 'gx'}), 12);
        assert.equal(await kit.co2({VALUE: 'eco2'}), 612);
        assert.equal(await kit.co2({VALUE: 'tvoc'}), 40);
        assert.equal(await kit.baro({VALUE: 'pressure'}), 1013.3);
        assert.equal(await kit.baro({VALUE: 'temperature'}), 21.5);
        assert.equal(await kit.baro({VALUE: 'altitude'}), 0);
        assert.equal(await kit.irKey({PIN: '8'}), '1');
        assert.equal(await kit.irPressed({KEY: '1', PIN: '8'}), false, 'first look only learns the counter');
        await kit.irSend({PIN: '1', CODE: 22});
        await kit.oledClear();
        await kit.oledText({TEXT: 'Hola', ROW: 2, COL: 3});
        await kit.oledNumber({NUMBER: 3.14159, ROW: 1});
        await assert.rejects(kit.analogValue({PIN: '8'}), /Pin no permitido/);
        await assert.rejects(kit.digitalValue({PIN: '12'}), /no responde/);
        // The temperature and humidity of one DHT11 reading share a request.
        assert.equal(device.firmware.lines.filter(line => / DH 8$/.test(line)).length, 1);
    });
});

test('actuator blocks send micro:shield orders', async () => {
    const device = new FakeMicrobit();
    await withBluetooth(device, async () => {
        const kit = new SensorKit(new EventEmitter());
        await kit.connectBluetooth();
        kit.transport.wait = () => Promise.resolve();
        await kit.led({PIN: '12', STATE: '1'});
        await kit.ledBrightness({PIN: '0', VALUE: 50});
        await kit.rgb({R: '0', G: '1', B: '2', COLOR: '#ff0000'});
        await kit.relay({PIN: '14', STATE: '0'});
        await kit.pumpTimed({PIN: '15', SECONDS: 99});
        await kit.stripAll({PIN: '8', COUNT: 30, COLOR: '#0000ff'});
        await kit.boardLeds({COLOR: '#00ff00'});
        await kit.servo({SERVO: 'S1', ANGLE: 180});
        await kit.motor({MOTOR: 'M2', SPEED: -40});
        assert.deepEqual(device.firmware.lines.slice(2), [
            'W 12 1', 'A 0 512', 'A 0 1023', 'A 1 0', 'A 2 0', 'W 14 0', 'W 15 1', 'W 15 0',
            'L 8 30 0 0 0 255', 'L 16 4 0 0 255 0', 'V 1 180', 'M 2 -40 0'
        ]);
    });
});

test('micro:shield and the kit share one connection in the same project', async () => {
    const device = new FakeMicrobit({'DR 8': 1});
    await withBluetooth(device, async () => {
        const runtime = new EventEmitter();
        const shield = new MicroShield(runtime);
        const kit = new SensorKit(runtime);
        await shield.connectBluetooth();
        assert.equal(kit.isConnected(), true);
        assert.equal(await kit.pir({PIN: '8'}), true);
        device.toHost.notify('D 12 1 0\n');
        assert.equal(await shield.buttonPressed({BUTTON: 'a'}), true);
        assert.equal(device.firmware.lines.filter(line => line === '?').length, 1);
    });
});
