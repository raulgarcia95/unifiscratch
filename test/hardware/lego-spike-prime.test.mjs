import './spanish-locale.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {
    PYBRICKS_SERVICE, PYBRICKS_COMMAND_EVENT, PYBRICKS_HUB_CAPABILITIES, COMMAND, pyString, parseValue
} from '../../src/lib/libraries/extensions/preInstall/pybricks-transport.mjs';
import {
    blockClass as SpikePrime, entry, SETUP, matrixBits, rgbToHsv, port, HEART
} from '../../src/lib/libraries/extensions/preInstall/lego-spike-prime.mjs';
import {guideFor} from '../../src/lib/libraries/extensions/setup-guides.mjs';

const tick = () => new Promise(resolve => setImmediate(resolve));

// ---------- Simulated hub with the Pybricks firmware (REPL only) ----------

class FakeHub extends EventTarget {
    constructor ({maxWrite = 64, answer = () => 'None', repl = true} = {}) {
        super();
        this.name = 'Pybricks Hub';
        this.answer = answer; // expression -> printed value, or {error}
        this.repl = repl;
        this.commands = [];
        this.lines = [];
        this.writes = [];
        this.stdin = '';
        this.running = false;
        const hub = this;
        this.char = new (class extends EventTarget {
            constructor () {
                super();
                this.uuid = PYBRICKS_COMMAND_EVENT;
            }
            async writeValueWithResponse (data) {
                hub.input(new Uint8Array(data));
            }
            async startNotifications () {
                this.notifying = true;
            }
        })();
        const caps = new DataView(new ArrayBuffer(10));
        caps.setUint16(0, maxWrite, true);
        caps.setUint32(2, repl ? 1 : 0, true);
        caps.setUint32(6, 65536, true);
        const capsChar = {readValue: async () => caps};
        const service = {getCharacteristic: async uuid => {
            if (uuid === PYBRICKS_COMMAND_EVENT) return this.char;
            if (uuid === PYBRICKS_HUB_CAPABILITIES) return capsChar;
            throw new Error('NotFoundError');
        }};
        this.gatt = {
            connected: false,
            connect: async () => {
                this.gatt.connected = true;
                return {getPrimaryService: async uuid => {
                    if (uuid !== PYBRICKS_SERVICE) throw new Error('NotFoundError');
                    return service;
                }};
            },
            disconnect: () => {
                this.gatt.connected = false;
            }
        };
    }
    event (bytes) {
        setImmediate(() => {
            this.char.value = new DataView(new Uint8Array(bytes).buffer);
            this.char.dispatchEvent(new Event('characteristicvaluechanged'));
        });
    }
    status (running) {
        this.running = running;
        const flags = running ? (1 << 6) : 0;
        this.event([0, flags & 0xff, 0, 0, 0]);
    }
    stdout (text) {
        this.event([1, ...new TextEncoder().encode(text)]);
    }
    input (bytes) {
        this.writes.push(bytes.length);
        const type = bytes[0];
        if (type !== COMMAND.WRITE_STDIN) {
            this.commands.push(type);
            if (type === COMMAND.STOP_USER_PROGRAM) this.status(false);
            if (type === COMMAND.START_REPL) {
                this.status(true);
                this.stdout('Pybricks MicroPython\r\n>>> ');
            }
            return;
        }
        this.stdin += new TextDecoder().decode(bytes.subarray(1));
        let index;
        while ((index = this.stdin.indexOf('\r')) >= 0) {
            const line = this.stdin.slice(0, index).replace(/^\x03+/, '');
            this.stdin = this.stdin.slice(index + 1);
            this.lines.push(line);
            this.run(line);
        }
    }
    run (line) {
        let reply;
        const raw = /print\('@V',(\d+),0\)$/.exec(line);
        const call = /^_r\((\d+),lambda:(.*)\)$/.exec(line);
        if (raw) reply = `@V ${raw[1]} 0`;
        if (call) {
            const value = this.answer(call[2]);
            reply = value && value.error ? `@E ${call[1]} ${value.error}` : `@V ${call[1]} ${value}`;
        }
        this.stdout(`${line}\r\n${reply ? `${reply}\r\n` : ''}>>> `);
    }
}

const withBluetooth = async (hub, run) => {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    let request;
    Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: {bluetooth: {requestDevice: async options => {
            request = options;
            return hub;
        }}}
    });
    try {
        await run(() => request);
    } finally {
        if (previous) Object.defineProperty(globalThis, 'navigator', previous);
        else delete globalThis.navigator;
    }
};

// ---------- Tests ----------

test('helpers: Python strings, printed values, matrices, colours and ports', () => {
    assert.equal(pyString('Hola "tú"\n'), '"Hola \\"t\\u00fa\\"\\n"');
    assert.equal(parseValue('True'), true);
    assert.equal(parseValue('-12.5'), -12.5);
    assert.equal(parseValue('red'), 'red');
    assert.equal(matrixBits('1'.padEnd(25, '0')), 1);
    assert.equal(matrixBits(HEART), 0b0010001110111111111101010);
    assert.deepEqual(rgbToHsv({r: 255, g: 0, b: 0}), {h: 0, s: 100, v: 100});
    assert.deepEqual(rgbToHsv({r: 0, g: 0, b: 255}), {h: 240, s: 100, v: 100});
    assert.equal(port(' b '), 'B');
    assert.throws(() => port('G'), /Puerto no válido/);
    SETUP.forEach(line => assert.ok(line.length < 400, line));
});

test('SPIKE Prime connects by Bluetooth, starts the REPL and loads the helpers', async () => {
    const hub = new FakeHub({maxWrite: 40});
    await withBluetooth(hub, async request => {
        const robot = new SpikePrime(new EventEmitter());
        await robot.connectBluetooth();
        assert.deepEqual(request().filters, [{services: [PYBRICKS_SERVICE]}]);
        assert.equal(robot.isConnected(), true);
        assert.deepEqual(hub.commands, [COMMAND.STOP_USER_PROGRAM, COMMAND.START_REPL]);
        assert.equal(hub.lines.length, SETUP.length);
        assert.ok(hub.writes.every(size => size <= 40), 'writes fit in the hub buffer');
        await robot.disconnect();
        assert.equal(hub.commands.at(-1), COMMAND.STOP_USER_PROGRAM);
        assert.equal(hub.gatt.connected, false);
    });
});

test('blocks type bounded Python lines and read sensors', async () => {
    const answers = {
        "_g(Motor,'A').done()": 'True',
        "_cn('C')": 'green',
        "_g(UltrasonicSensor,'D').distance()": '153',
        "_g(ForceSensor,'E').force()": '4.27',
        'Button.LEFT in _h.buttons.pressed()': 'True',
        '_h.imu.tilt()[1]': '-12'
    };
    const hub = new FakeHub({answer: code => answers[code] || 'None'});
    await withBluetooth(hub, async () => {
        const robot = new SpikePrime(new EventEmitter());
        await robot.connectBluetooth();
        const start = hub.lines.length;
        await robot.motorDegrees({PORT: 'a', DEGREES: 90, SPEED: 150});
        await robot.drive({LEFT_PORT: 'A', RIGHT_PORT: 'B', LEFT: 50, RIGHT: -20});
        await robot.showMatrix({MATRIX: HEART});
        await robot.centerLight({COLOR: '#ff0000'});
        await robot.showText({TEXT: 'Hola\nñ'});
        const typed = hub.lines.slice(start).map(line => line.replace(/^_r\(\d+,lambda:(.*)\)$/, '$1'));
        assert.deepEqual(typed, [
            "_g(Motor,'A').run_angle(1000,90,wait=False)",
            "_g(Motor,'A').done()",
            "(_g(Motor,'A').run(500),_g(Motor,'B').run(-200))",
            `_px(${matrixBits(HEART)})`,
            '_h.light.on(Color(0,100,100))',
            '_h.display.text("Hola \\u00f1")'
        ]);
        assert.equal(await robot.distance({PORT: 'D'}), 15.3);
        assert.equal(await robot.force({PORT: 'E'}), 4.3);
        assert.equal(await robot.buttonPressed({BUTTON: 'LEFT'}), true);
        assert.equal(await robot.tilt({AXIS: 'roll'}), -12);
        assert.equal(await robot.isColor({PORT: 'C', COLOR: 'green'}), true);
        assert.equal(await robot.isColor({PORT: 'C', COLOR: 'verde'}), true);
        assert.equal(await robot.isColor({PORT: 'C', COLOR: 'red'}), false);
        assert.throws(() => robot.motorStart({PORT: 'A', SPEED: Infinity}), /finito/);
        await robot.disconnect();
    });
});

test('a missing sensor gives a clear error and reporters do not hang', async () => {
    const hub = new FakeHub({answer: () => ({error: 'OSError [Errno 19] ENODEV'})});
    await withBluetooth(hub, async () => {
        const robot = new SpikePrime(new EventEmitter());
        await robot.connectBluetooth();
        assert.equal(await robot.distance({PORT: 'F'}), 200);
        assert.match(robot.connectionError(), /sensor de distancia en el puerto F/);
        await assert.rejects(robot.motorStart({PORT: 'B', SPEED: 10}), /motor en el puerto B/);
        await robot.disconnect();
    });
});

test('the red stop sign interrupts the hub and stops every motor', async () => {
    const hub = new FakeHub({answer: code => (code.endsWith('.done()') ? 'False' : 'None')});
    await withBluetooth(hub, async () => {
        const runtime = new EventEmitter();
        const robot = new SpikePrime(runtime);
        await robot.connectBluetooth();
        const moving = robot.motorSeconds({PORT: 'A', SECONDS: 5, SPEED: 50});
        await new Promise(resolve => setTimeout(resolve, 150));
        runtime.emit('PROJECT_STOP_ALL');
        await assert.rejects(moving, /cancelada/);
        await new Promise(resolve => setTimeout(resolve, 20));
        assert.ok(hub.lines.at(-1).endsWith('lambda:_s())'));
        await robot.disconnect();
    });
});

test('a REPL stopped on the hub restarts with the next block', async () => {
    const hub = new FakeHub({answer: () => '7'});
    await withBluetooth(hub, async () => {
        const robot = new SpikePrime(new EventEmitter());
        await robot.connectBluetooth();
        hub.status(false); // Bluetooth button pressed on the hub
        await tick();
        await tick();
        assert.equal(await robot.heading(), 7);
        assert.deepEqual(hub.commands.filter(type => type === COMMAND.START_REPL).length, 2);
        await robot.disconnect();
    });
});

test('a lost link and a hub without Pybricks are reported', async () => {
    const hub = new FakeHub();
    await withBluetooth(hub, async () => {
        const robot = new SpikePrime(new EventEmitter());
        await robot.connectBluetooth();
        hub.gatt.connected = false;
        hub.dispatchEvent(new Event('gattserverdisconnected'));
        assert.equal(robot.isConnected(), false);
        assert.match(robot.connectionError(), /Bluetooth/);
        await assert.rejects(robot.motorStop({PORT: 'A'}), /Conecta el SPIKE Prime/);
    });
    const noRepl = new FakeHub({repl: false});
    await withBluetooth(noRepl, async () => {
        const robot = new SpikePrime(new EventEmitter());
        await assert.rejects(robot.connectBluetooth(), /REPL/);
        assert.equal(noRepl.gatt.connected, false);
    });
});

test('SPIKE Prime has a Pybricks guide and connection buttons', () => {
    assert.equal(entry.extensionId, 'legoSpikePrime');
    const guide = guideFor('legoSpikePrime');
    assert.ok(guide.warning);
    assert.equal(guide.actions[0].href, 'https://code.pybricks.com/');
    const blocks = new SpikePrime(new EventEmitter()).getInfo().blocks;
    assert.ok(blocks.some(block => block.func === 'unifiscratchAction:connectBluetooth'));
    assert.ok(blocks.some(block => block.func === 'unifiscratchAction:showHelp'));
});
