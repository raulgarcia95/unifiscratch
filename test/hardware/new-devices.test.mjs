import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {
    blockClass as Dash, DASH_COMMAND, DASH_SENSOR, DOT_SENSOR, movePayload, angleByte, decodeDotSensors
} from '../../src/lib/libraries/extensions/preInstall/dash-robot.mjs';
import {
    blockClass as Ed1, stepperCode, bothMotorPhases, singleMotorPhases
} from '../../src/lib/libraries/extensions/preInstall/ed1-board.mjs';
import {
    blockClass as Face, facePart, faceTilt, faceSize, partIndices
} from '../../src/lib/libraries/extensions/preInstall/face-sensing.mjs';
import {entries} from '../../src/lib/libraries/extensions/preInstall/unifiscratch-extra-hardware.mjs';
import {
    blockClass as Edison, encodeOrder, ORDER
} from '../../src/lib/libraries/extensions/preInstall/edison-v3.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

// ---------- Dash: simulated Web Bluetooth peripheral ----------

class FakeCharacteristic extends EventTarget {
    constructor (uuid, device) {
        super();
        this.uuid = uuid;
        this.device = device;
    }
    async writeValueWithResponse (data) {
        if (this.device.hold) await this.device.hold;
        this.device.writes.push(Array.from(data));
    }
    async startNotifications () {
        this.device.notifying.push(this.uuid);
    }
    notify (bytes) {
        // Listeners read event.target.value, as in Web Bluetooth.
        this.value = new DataView(new Uint8Array(bytes).buffer);
        this.dispatchEvent(new Event('characteristicvaluechanged'));
    }
}

class FakeDash extends EventTarget {
    constructor ({dot = false} = {}) {
        super();
        this.writes = [];
        this.notifying = [];
        this.chars = {};
        [DASH_COMMAND, DOT_SENSOR].concat(dot ? [] : [DASH_SENSOR]).forEach(uuid => {
            this.chars[uuid] = new FakeCharacteristic(uuid, this);
        });
        const service = {getCharacteristic: async uuid => {
            if (!this.chars[uuid]) throw new Error('NotFoundError');
            return this.chars[uuid];
        }};
        this.gatt = {
            connected: false,
            connect: async () => { this.gatt.connected = true; return {getPrimaryService: async () => service}; },
            disconnect: () => { this.gatt.connected = false; }
        };
    }
    drop () {
        this.gatt.connected = false;
        this.dispatchEvent(new Event('gattserverdisconnected'));
    }
}

const dashFixture = options => {
    const device = new FakeDash(options);
    let requests = 0;
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
        bluetooth: {requestDevice: async () => { requests++; return device; }}
    }});
    const runtime = new EventEmitter();
    const robot = new Dash(runtime);
    return {device, robot, runtime, requests: () => requests};
};

test('Dash move packet matches the community protocol (morseapi / dash_robot)', () => {
    // 100 mm in one second, as in morseapi move(100, 100).
    assert.deepEqual(movePayload({distanceMm: 100, seconds: 1}), [100, 0, 0, 0x03, 0xe8, 0, 0, 0x80]);
    // Backwards keeps the heading: last byte 0x81.
    assert.deepEqual(movePayload({distanceMm: -100, seconds: 1}), [0x9c, 0, 0, 0x03, 0xe8, 0x3f, 0, 0x81]);
    // 90 degrees = 157 centiradians; negative turns set 0xc0.
    assert.deepEqual(movePayload({degrees: 90, seconds: 0.75}), [0, 0, 0x9d, 0x02, 0xee, 0, 0, 0x80]);
    assert.deepEqual(movePayload({degrees: -90, seconds: 0.75}), [0, 0, 0x63, 0x02, 0xee, 0xc0, 0xc0, 0x80]);
    assert.equal(angleByte(-5), 0xfb);
    assert.throws(() => movePayload({distanceMm: 10, degrees: 10, seconds: 1}), /misma orden/);
});

test('Dash needs an explicit connection and never sends an unbounded drive', async () => {
    const {robot, device, requests} = dashFixture();
    await assert.rejects(robot.move({DIRECTION: 'forward', DISTANCE: 10, SPEED: 'fast'}), /explícitamente/);
    assert.equal(requests(), 0);
    await robot.connect();
    assert.equal(robot.isConnected(), true);
    assert.deepEqual(device.writes, [[0x02, 0, 0, 0]]);
    assert.deepEqual(device.notifying.sort(), [DASH_SENSOR, DOT_SENSOR].sort());
    // 1000 cm requested at 50 cm/s: capped to five seconds = 2500 mm.
    const moving = robot.move({DIRECTION: 'forward', DISTANCE: 1000, SPEED: 'fast'});
    await tick();
    const packet = device.writes.at(-1);
    assert.equal(packet[0], 0x23);
    const distance = packet[1] | (packet[6] << 8);
    const millis = (packet[4] << 8) | packet[5];
    assert.equal(distance, 2500);
    assert.equal(millis, 5000);
    assert.equal(device.writes.some(bytes => bytes[0] === 0x02 && bytes.slice(1).some(Boolean)), false);
    await robot.stop();
    await assert.rejects(moving, /cancelada/);
    await robot.disconnect();
});

test('Dash stop cancels queued commands and is sent last', async () => {
    const {robot, device} = dashFixture();
    await robot.connect();
    let release;
    device.hold = new Promise(resolve => { release = resolve; });
    // A slow write is in flight; a second command waits behind it.
    const first = robot.playSound({SOUND: 'hi'});
    await tick();
    const queued = robot.setLight({PART: 'front', COLOR: '#ff0000'});
    await tick();
    const stopping = robot.stop();
    device.hold = null;
    release();
    await first;
    await assert.rejects(queued, /cancelada/);
    await stopping;
    assert.deepEqual(device.writes.at(-1), [0x02, 0, 0, 0]);
    assert.equal(device.writes.some(bytes => bytes[0] === 0x03), false);
});

test('Dash project stop and Bluetooth loss end waiting blocks without reconnecting', async () => {
    const {robot, device, runtime, requests} = dashFixture();
    await robot.connect();
    const moving = robot.turn({SIDE: 'left', DEGREES: 360});
    await tick();
    runtime.emit('PROJECT_STOP_ALL');
    await assert.rejects(moving, /cancelada/);
    await tick();
    assert.deepEqual(device.writes.at(-1), [0x02, 0, 0, 0]);
    const again = robot.move({DIRECTION: 'backward', DISTANCE: 20, SPEED: 'slow'});
    await tick();
    device.drop();
    await assert.rejects(again, /cancelada/);
    assert.equal(robot.isConnected(), false);
    assert.match(robot.connectionError(), /desconectado/);
    await assert.rejects(robot.playSound({SOUND: 'hi'}), /explícitamente/);
    assert.equal(requests(), 1);
});

test('Dash decodes sensors and refuses motion on a Dot robot', async () => {
    const dot = new Array(20).fill(0);
    dot[8] = 0x10 | 0x40;
    dot[11] = 0x04 | 0x01;
    dot[7] = 77;
    assert.deepEqual(decodeDotSensors(dot), {
        buttonMain: true, button1: false, button2: true, button3: false, pickedUp: true, hit: true, micLevel: 77
    });
    const {robot, device} = dashFixture();
    await robot.connect();
    const dash = new Array(20).fill(0);
    dash[6] = 11;
    dash[7] = 22;
    dash[8] = 33;
    device.chars[DASH_SENSOR].notify(dash);
    device.chars[DOT_SENSOR].notify(dot);
    assert.equal(robot.proximity({SENSOR: 'left'}), 22);
    assert.equal(robot.proximity({SENSOR: 'rear'}), 33);
    assert.equal(robot.buttonPressed({BUTTON: '2'}), true);
    assert.equal(robot.pickedUp(), true);
    assert.equal(robot.soundLevel(), 77);
    await robot.disconnect();

    const {robot: dotRobot} = dashFixture({dot: true});
    await dotRobot.connect();
    assert.throws(() => dotRobot.move({DIRECTION: 'forward', DISTANCE: 10, SPEED: 'slow'}), /Dot/);
    await dotRobot.disconnect();
});

test('Dash rejects values outside its menus', async () => {
    const {robot} = dashFixture();
    await robot.connect();
    assert.throws(() => robot.move({DIRECTION: 'up', DISTANCE: 10}), /Dirección/);
    assert.throws(() => robot.turn({SIDE: 'up', DEGREES: 10}), /giro/);
    assert.throws(() => robot.setLight({PART: 'tail', COLOR: '#000000'}), /Luz/);
    assert.throws(() => robot.playSound({SOUND: '__proto__'}), /Sonido/);
    assert.throws(() => robot.move({DIRECTION: 'forward', DISTANCE: 'abc'}), /finito/);
    await robot.disconnect();
});

// ---------- ED1 ----------

test('ED1 stepper phases follow the MicroBlocks sequence', () => {
    // Motor 1 clockwise + motor 2 counter-clockwise = Fantàstic forward.
    assert.deepEqual(bothMotorPhases('clockwise', 'counterclockwise'), [0x99, 0xc3, 0x66, 0x3c]);
    assert.deepEqual(singleMotorPhases(1, 'clockwise'), [0x90, 0xc0, 0x60, 0x30]);
    assert.deepEqual(singleMotorPhases(2, 'counterclockwise'), [0x9, 0x3, 0x6, 0xc]);
    const code = stepperCode([1, 2, 3, 4], 10);
    assert.match(code, /ticks_add\(time\.ticks_ms\(\), 5000\)/);
    assert.match(code, /finally:\n {4}_i2c\.writeto_mem\(0x20, _reg, b'\\x00'\)$/);
});

test('ED1 blocks emit bounded board-side code and parse sensor replies', async () => {
    const board = new Ed1(new EventEmitter());
    const sent = [];
    board.transport.runPython = source => {
        sent.push(source);
        return Promise.resolve(source.includes('_light') ? '57\r\n' : '1\r\n');
    };
    await board.robotMove({DIRECTION: 'forward', DISTANCE: 100000});
    assert.match(sent.at(-1), /range\(2000\)/);
    assert.match(sent.at(-1), /0x99, 195, 0x66, 60|153, 195, 102, 60/);
    await board.robotTurn({SIDE: 'left', DEGREES: 90});
    assert.match(sent.at(-1), /range\(176\)/);
    await board.playTone({FREQ: 99999, SECONDS: 60});
    assert.match(sent.at(-1), /freq=10000/);
    assert.match(sent.at(-1), /time\.sleep\(5\)\nfinally:/);
    assert.equal(await board.buttonTouched({BUTTON: 'ok'}), true);
    assert.equal(await board.lightLevel(), 57);
    assert.throws(() => board.buttonTouched({BUTTON: "ok'] + __import__('os')"}), /Botón/);
    assert.throws(() => board.motorSteps({MOTOR: 3, ROTATION: 'clockwise', STEPS: 1}), /Motor/);
    assert.throws(() => board.runPython({CODE: 'while True: pass'}), /desactivada/);
    assert.equal(board.getInfo().blocks.some(block => block.opcode === 'runPython'), false);
});

test('ED1 connection probes the I2C motor expander before declaring itself ready', () => {
    const board = new Ed1();
    assert.match(board.transport.probe, /assert 0x20 in _i2c\.scan\(\)/);
    assert.equal(board.transport.stopCode, '_unifi_stop()');
});

// ---------- Face Sensing ----------

const fakeMesh = ({tilt = 0} = {}) => {
    const mesh = new Array(468).fill(null).map(() => [240, 180]);
    const radians = tilt * Math.PI / 180;
    const eye = (dx, index) => {
        mesh[index] = [240 + (dx * Math.cos(radians)), 150 + (dx * Math.sin(radians))];
    };
    // Unmirrored camera: the person's right eye (33/133) is on the image left.
    eye(-40, 33); eye(-20, 133); eye(40, 263); eye(20, 362);
    mesh[1] = [250, 190];
    mesh[234] = [180, 180];
    mesh[454] = [300, 180];
    return mesh;
};

test('Face Sensing maps keypoints to stage coordinates and sides', () => {
    const mesh = fakeMesh();
    assert.deepEqual(facePart(mesh, 'nose', false), {x: 10, y: -10});
    assert.deepEqual(facePart(mesh, 'leftEye', false), {x: 30, y: 30});
    assert.deepEqual(facePart(mesh, 'leftEye', true), {x: -30, y: 30});
    assert.deepEqual(partIndices('rightEar', false), [234]);
    assert.equal(facePart(mesh, 'constructor', false), null);
    assert.equal(faceTilt(mesh), 90);
    assert.equal(faceSize(mesh), 120);
    // Image y grows downward: the right-hand eye lower on screen = leaning right.
    assert.ok(faceTilt(fakeMesh({tilt: 20})) > 100);
    assert.ok(faceTilt(fakeMesh({tilt: -20})) < 80);
});

test('Face Sensing moves the sprite only while a face is visible', () => {
    const face = new Face(null);
    const target = {setXY (x, y) { this.pos = [x, y]; }, setDirection (d) { this.dir = d; }, setSize (s) { this.size = s; }};
    face.goToPart({PART: 'nose'}, {target});
    assert.equal(target.pos, undefined);
    assert.equal(face.faceDetected(), false);
    assert.match(face.status(), /Cámara no disponible/);
    face.mesh = fakeMesh();
    face.lastSeen = Date.now();
    face.goToPart({PART: 'nose'}, {target});
    assert.deepEqual(target.pos, [10, -10]);
    face.pointInTiltDirection({}, {target});
    assert.equal(target.dir, 90);
    face.setSizeToFace({}, {target});
    assert.equal(target.size, 120);
    assert.equal(face.partPosition({COORDINATE: 'y', PART: 'nose'}), -10);
    face.lastSeen = Date.now() - 5000;
    assert.equal(face.faceDetected(), false);
    assert.equal(face.size(), 0);
});

test('only BlueBot remains as a disabled information card', () => {
    // The AI placeholders here are replaced by the working Stretch3 entries in stretch/index.js.
    const disabled = entries.filter(item => item.entry.disabled && item.entry.category !== 'ai')
        .map(item => item.entry.extensionId);
    assert.deepEqual(disabled, ['blueBot']);
});

// ---------- Edison V3: simulated WebUSB firmware running the bridge ----------

class FakeEdison {
    constructor ({bridge = true, bootloader = false, sensors = {}} = {}) {
        this.opened = false;
        this.configuration = null;
        this.bridge = bridge;
        this.bootloader = bootloader;
        this.sensors = sensors;
        this.running = false;
        this.usbValue = 0;
        this.lastOrder = 0;
        this.log = [];
        this.inbox = [];
        this.readers = [];
        this.hold = false;
    }
    async open () { this.opened = true; }
    async close () { this.opened = false; this.readers.splice(0).forEach(r => r.reject(new Error('closed'))); }
    async selectConfiguration () { this.configuration = {configurationValue: 1}; }
    async claimInterface () {}
    push (bytes) {
        const data = new DataView(new Uint8Array(bytes).buffer);
        const reader = this.readers.shift();
        if (reader) reader.resolve({status: 'ok', data});
        else this.inbox.push(data);
    }
    transferIn () {
        if (this.inbox.length) return Promise.resolve({status: 'ok', data: this.inbox.shift()});
        return new Promise((resolve, reject) => this.readers.push({resolve, reject}));
    }
    async transferOut (endpoint, packet) {
        const [header, code] = packet;
        assert.equal(header, 0x58);
        assert.equal(packet.length, 8);
        this.log.push(code === 0x17 ? ['data', new DataView(packet.buffer).getInt32(2, true)] : [code]);
        if (code === 0x10) {
            const version = 'v0.3.0';
            this.push([0x58, 0x10, this.bootloader ? 0 : 2, 8, ...[...version].map(c => c.charCodeAt(0)), 0, 0,
                ...[...version].map(c => c.charCodeAt(0)), 0, 0]);
            return;
        }
        this.push([0x58, code, 1, 0, 0, 0, 0, 0]);
        if (code === 0x15) this.running = this.bridge;
        if (code === 0x16) {
            this.running = false;
            this.motorsStoppedBy = 'firmware';
        }
        if (code === 0x17) {
            this.usbValue = new DataView(packet.buffer).getInt32(2, true);
            if (this.running) setImmediate(() => this.step());
        }
    }
    // Same decoding as unfyscratch-puente-edison-v3.py.
    step () {
        const data = this.usbValue;
        const order = Math.floor(data / 4096);
        if (!this.running || data <= 0 || order === this.lastOrder || this.hold) return;
        this.lastOrder = order;
        const rest = data - (order * 4096);
        const command = Math.floor(rest / 256);
        const value = rest - (command * 256);
        this.executed = [...(this.executed || []), [command, value]];
        let result = 0;
        if (command === 7) result = this.sensors[value] || 0;
        if (command === 9) result = 3001;
        this.push([0x58, 0x18, ...new Uint8Array(new Int32Array([(order * 4096) + result]).buffer)]);
    }
}

const edisonFixture = options => {
    const device = new FakeEdison(options);
    let requests = 0;
    Object.defineProperty(globalThis, 'navigator', {configurable: true, value: {
        usb: {requestDevice: async ({filters}) => {
            requests++;
            assert.deepEqual(filters, [{vendorId: 0x16d0, productId: 0x1207}]);
            return device;
        }}
    }});
    const runtime = new EventEmitter();
    const robot = new Edison(runtime);
    return {device, robot, runtime, requests: () => requests};
};

test('Edison order numbers fit EdPy integers', () => {
    assert.equal(encodeOrder(1, ORDER.forward, 30), 4096 + 256 + 30);
    assert.equal(encodeOrder(7, 15, 255), 32767);
    assert.throws(() => encodeOrder(8, 1, 1), /Identificador/);
    assert.throws(() => encodeOrder(1, 1, 256), /rango/);
});

test('Edison connects only after the bridge answers, clearing stale orders first', async () => {
    const {robot, device, requests} = edisonFixture();
    await assert.rejects(robot.move({DIRECTION: 'forward', DISTANCE: 10}), /explícitamente/);
    assert.equal(requests(), 0);
    await robot.connect();
    assert.equal(robot.isConnected(), true);
    // version, clear USB value, run program, then ping.
    assert.deepEqual(device.log.slice(0, 3), [[0x10], ['data', 0], [0x15]]);
    assert.deepEqual(device.executed, [[ORDER.ping, 0]]);
    await robot.disconnect();
    assert.equal(device.log.at(-1)[0], 0x16);
    assert.equal(device.opened, false);

    const {robot: noBridge} = edisonFixture({bridge: false});
    noBridge.link.timeout = 50;
    await assert.rejects(Promise.race([noBridge.connect(), new Promise((r, j) => setTimeout(() => j(new Error('slow')), 5000))]), /puente/);
    assert.equal(noBridge.isConnected(), false);

    const {robot: boot} = edisonFixture({bootloader: true});
    await assert.rejects(boot.connect(), /actualización/);
});

test('Edison movements are bounded and sensors are decoded', async () => {
    const {robot, device} = edisonFixture({sensors: {1: 3, 2: 1, 3: 812, 5: 2, 6: 0}});
    await robot.connect();
    await robot.move({DIRECTION: 'backward', DISTANCE: 500});
    await robot.turn({SIDE: 'left', DEGREES: 1000});
    await robot.setLeds({LEFT: 'off', RIGHT: 'on'});
    assert.deepEqual(device.executed.slice(1), [[ORDER.backward, 30], [ORDER.spinLeft, 180], [ORDER.leds, 2]]);
    assert.equal(await robot.obstacle({WHERE: 'ahead'}), true);
    assert.equal(await robot.obstacle({WHERE: 'left'}), false);
    assert.equal(await robot.onBlack(), true);
    assert.equal(await robot.lightLevel({SIDE: 'left'}), 812);
    assert.equal(await robot.buttonPressed({BUTTON: 'round'}), true);
    assert.equal(await robot.clap(), false);
    assert.throws(() => robot.move({DIRECTION: '__proto__', DISTANCE: 1}), /Dirección/);
    assert.throws(() => robot.setLeds({LEFT: 'constructor', RIGHT: 'on'}), /LED/);
    await robot.disconnect();
});

test('Edison red flag stops the program in firmware and re-arms the bridge without replaying orders', async () => {
    const {robot, device, runtime} = edisonFixture();
    await robot.connect();
    device.hold = true; // the robot is still driving
    const moving = robot.move({DIRECTION: 'forward', DISTANCE: 20});
    await tick();
    runtime.emit('PROJECT_STOP_ALL');
    await assert.rejects(moving, /cancelada/);
    await robot.link.queue;
    assert.equal(device.motorsStoppedBy, 'firmware');
    const afterStop = device.log.slice(device.log.findIndex(entry => entry[0] === 0x16));
    assert.deepEqual(afterStop.slice(0, 3), [[0x16], ['data', 0], [0x15]]);
    device.hold = false;
    // The order cut off by the stop is not executed when the bridge restarts.
    assert.equal(device.executed.some(([code]) => code === ORDER.forward), false);
    await robot.beep();
    assert.deepEqual(device.executed.at(-1), [ORDER.beep, 0]);
    await robot.disconnect();
});

test('Edison square-button stop and USB loss require an explicit reconnection', async () => {
    const {robot, device, requests} = edisonFixture();
    await robot.connect();
    robot.link.stoppedAt = 0;
    device.push([0x58, 0x19, 3, 2]);
    await tick();
    assert.equal(robot.isConnected(), false);
    assert.match(robot.connectionError(), /cuadrado/);
    await robot.connect();
    device.readers.splice(0).forEach(reader => reader.reject(new Error('USB removed')));
    await tick();
    assert.equal(robot.isConnected(), false);
    assert.match(robot.connectionError(), /USB/);
    await assert.rejects(robot.beep(), /explícitamente/);
    assert.equal(requests(), 2);
});
