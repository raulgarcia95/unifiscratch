import './spanish-locale.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {
    blockClass as BlueBot, entry, frame, keyFrame, checkFrame, turnKey, KEY,
    BLUEBOT_SERVICE, BLUEBOT_WRITE, BLUEBOT_NOTIFY, NAME_PREFIX
} from '../../src/lib/libraries/extensions/preInstall/bluebot.mjs';
import {guideFor} from '../../src/lib/libraries/extensions/setup-guides.mjs';

// ---------- Simulated Blue-Bot: GATT service 0xFFF0, keys written to 0xFFF2 ----------

class FakeBlueBot extends EventTarget {
    constructor ({service = true} = {}) {
        super();
        this.name = 'BlueBot-1234';
        this.frames = [];
        this.keys = [];
        this.position = {x: 0, y: 0, heading: 0}; // heading in degrees, 0 = forward
        const bot = this;
        const write = {
            uuid: BLUEBOT_WRITE,
            properties: {write: true, writeWithoutResponse: true},
            async writeValueWithResponse (data) {
                bot.receive(Uint8Array.from(data));
            }
        };
        const notify = new (class extends EventTarget {
            async startNotifications () {
                this.notifying = true;
            }
        })();
        const gattService = {getCharacteristic: async uuid => {
            if (uuid === BLUEBOT_WRITE) return write;
            if (uuid === BLUEBOT_NOTIFY) return notify;
            throw new Error('NotFoundError');
        }};
        this.gatt = {
            connected: false,
            connect: async () => {
                this.gatt.connected = true;
                return {getPrimaryService: async uuid => {
                    if (!service || uuid !== BLUEBOT_SERVICE) throw new Error('NotFoundError');
                    return gattService;
                }};
            },
            disconnect: () => {
                this.gatt.connected = false;
                this.dispatchEvent(new Event('gattserverdisconnected'));
            }
        };
    }

    // The robot only acts on valid key frames, like the real one ignores bad checksums.
    receive (bytes) {
        this.frames.push(Array.from(bytes));
        if (!checkFrame(bytes) || bytes[2] !== 0x81 || bytes[3] !== 0x11) return;
        const key = bytes[4];
        this.keys.push(key);
        const turns = {6: -90, 7: 90, 8: -45, 9: 45, 10: -135, 11: 135};
        if (turns[key]) this.position.heading = (this.position.heading + turns[key] + 360) % 360;
        if (key === KEY.forward || key === KEY.backward) {
            const sign = key === KEY.forward ? 1 : -1;
            const rad = this.position.heading * Math.PI / 180;
            this.position.x = Math.round(this.position.x + (sign * Math.sin(rad))) || 0;
            this.position.y = Math.round(this.position.y + (sign * Math.cos(rad))) || 0;
        }
    }
}

const withBluetooth = async (device, fn) => {
    const requests = [];
    const bluetooth = {requestDevice: async options => {
        requests.push(options);
        return device;
    }};
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {bluetooth}});
    try {
        await fn(requests);
    } finally {
        delete globalThis.navigator;
    }
};

// Blocks wait for the robot to move: make that instant in tests.
const fast = bot => {
    bot.stepSeconds = 0.5;
    bot.link.wait = async () => {};
    return bot;
};

test('frames match the public Blue-Bot captures byte for byte', () => {
    // Frames published by Vittascience's Blue-Bot interface.
    assert.deepEqual(Array.from(keyFrame(KEY.forward)), [0xAA, 0x03, 0x81, 0x11, 0x04, 0x67]);
    assert.deepEqual(Array.from(keyFrame(KEY.go)), [0xAA, 0x03, 0x81, 0x11, 0x01, 0x6A]);
    assert.deepEqual(Array.from(keyFrame(KEY.clear)), [0xAA, 0x03, 0x81, 0x11, 0x02, 0x69]);
    assert.deepEqual(Array.from(keyFrame(KEY.pause)), [0xAA, 0x03, 0x81, 0x11, 0x03, 0x68]);
    assert.deepEqual(Array.from(keyFrame(KEY.right135)), [0xAA, 0x03, 0x81, 0x11, 0x0B, 0x60]);
    // Layout of longer frames (bluebot-python): length counts type to data, checksum closes the sum.
    const long = frame(0x82, [4, 6, 4, 1]);
    assert.deepEqual(Array.from(long.slice(0, 4)), [0xAA, 6, 0x82, 0x11]);
    assert.ok(checkFrame(long));
    assert.equal(checkFrame(Uint8Array.from([0xAA, 0x03, 0x81, 0x11, 0x04, 0x66])), false);
});

test('turn keys cover 45, 90 and 135 degrees and reject other angles', () => {
    assert.equal(turnKey('left', 90), KEY.left90);
    assert.equal(turnKey('right', '45'), KEY.right45);
    assert.equal(turnKey('left', 135), KEY.left135);
    assert.throws(() => turnKey('right', 30), /solo gira 45, 90 o 135/);
});

test('connects by Web Bluetooth and drives a square on the simulated robot', async () => {
    const robot = new FakeBlueBot();
    await withBluetooth(robot, async requests => {
        const bot = fast(new BlueBot(new EventEmitter()));
        await assert.rejects(bot.move({DIRECTION: 'forward', STEPS: 1}), /Conecta BlueBot/);
        await bot.connectBluetooth();
        assert.equal(bot.isConnected(), true);
        assert.deepEqual(requests[0].filters, [{namePrefix: NAME_PREFIX}, {services: [BLUEBOT_SERVICE]}]);
        assert.deepEqual(requests[0].optionalServices, [BLUEBOT_SERVICE]);
        for (let side = 0; side < 4; side++) {
            await bot.move({DIRECTION: 'forward', STEPS: 2});
            await bot.turn({SIDE: 'right', ANGLE: '90'});
        }
        assert.deepEqual(robot.position, {x: 0, y: 0, heading: 0});
        await bot.move({DIRECTION: 'backward', STEPS: 3});
        assert.deepEqual(robot.position, {x: 0, y: -3, heading: 0});
        await bot.turn({SIDE: 'left', ANGLE: '45'});
        assert.equal(robot.position.heading, 315);
        await bot.pressKey({KEY: 'clear'});
        await bot.pressKey({KEY: 'pause'});
        await bot.pressKey({KEY: 'go'});
        assert.deepEqual(robot.keys.slice(-3), [KEY.clear, KEY.pause, KEY.go]);
        // Every frame sent was valid.
        assert.ok(robot.frames.every(bytes => checkFrame(Uint8Array.from(bytes))));
        await bot.move({DIRECTION: 'forward', STEPS: 0});
        await bot.disconnect();
        assert.equal(bot.isConnected(), false);
    });
});

test('a device without the BlueBot service is refused with a clear message', async () => {
    await withBluetooth(new FakeBlueBot({service: false}), async () => {
        const bot = new BlueBot(new EventEmitter());
        await assert.rejects(bot.connectBluetooth(), /no es un BlueBot/);
        assert.match(bot.connectionError(), /no es un BlueBot/);
        assert.equal(bot.isConnected(), false);
    });
});

test('the red stop sign cancels the waiting steps and a lost link is reported', async () => {
    const robot = new FakeBlueBot();
    await withBluetooth(robot, async () => {
        const runtime = new EventEmitter();
        const bot = new BlueBot(runtime);
        bot.stepSeconds = 0.5;
        await bot.connectBluetooth();
        const moving = bot.move({DIRECTION: 'forward', STEPS: 5});
        await new Promise(resolve => setTimeout(resolve, 60));
        runtime.emit('PROJECT_STOP_ALL');
        await assert.rejects(moving, /cancelada/);
        assert.equal(robot.keys.length, 1);
        robot.gatt.disconnect();
        assert.equal(bot.isConnected(), false);
        assert.match(bot.connectionError(), /perdido la conexión/);
        await assert.rejects(bot.turn({SIDE: 'left', ANGLE: 90}), /Conecta BlueBot/);
    });
});

test('BlueBot is an enabled robot card with its guide and buttons', () => {
    assert.equal(entry.extensionId, 'blueBot');
    assert.equal(entry.disabled, false);
    assert.equal(entry.category, 'robots');
    assert.equal(entry.bluetoothRequired, true);
    const guide = guideFor('blueBot');
    assert.equal(guide.openOnAdd, false);
    const info = new BlueBot(new EventEmitter()).getInfo();
    const opcodes = info.blocks.filter(block => typeof block === 'object').map(block => block.opcode || block.func);
    ['move', 'turn', 'pressKey', 'setStepTime', 'unifiscratchAction:connectBluetooth', 'unifiscratchAction:showHelp']
        .forEach(opcode => assert.ok(opcodes.includes(opcode), opcode));
});
