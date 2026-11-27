import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {
    WebBluetoothLinkSocket, installWebBluetoothLink, patchRequestDevice, toRequestDeviceOptions
} from '../../src/lib/web-bluetooth-link.mjs';

const require = createRequire(import.meta.url);
globalThis.window = globalThis;

const LEGO_SERVICE = '00001623-1212-EFDE-1623-785FEABCD123';
const LEGO_CHAR = '00001624-1212-efde-1623-785feabcd123';
const SPIKE_ESSENTIAL_OPTIONS = {
    filters: [{services: [LEGO_SERVICE], manufacturerData: {0x0397: {dataPrefix: [0x00, 0x83], mask: [0x00, 0xff]}}}],
    optionalServices: []
};
const tick = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// A LEGO hub as Web Bluetooth shows it. GATT refuses overlapping operations, like Chrome.
const fakeHub = () => {
    const hub = {written: [], requests: [], busy: false, overlapped: false, connected: false};
    const characteristic = new EventTarget();
    const op = async work => {
        if (hub.busy) hub.overlapped = true;
        hub.busy = true;
        await tick(2);
        hub.busy = false;
        return work();
    };
    characteristic.writeValueWithResponse = value => op(() => hub.written.push(Array.from(value)));
    characteristic.writeValueWithoutResponse = characteristic.writeValueWithResponse;
    characteristic.startNotifications = () => op(() => {
        hub.notifying = true;
    });
    characteristic.stopNotifications = () => op(() => {
        hub.notifying = false;
    });
    characteristic.readValue = () => op(() => new DataView(new Uint8Array([5, 0, 1, 2, 3]).buffer));
    hub.send = bytes => {
        const event = new Event('characteristicvaluechanged');
        Object.defineProperty(event, 'target', {value: {value: new DataView(new Uint8Array(bytes).buffer)}});
        characteristic.dispatchEvent(event);
    };
    const server = {
        get connected () {
            return hub.connected;
        },
        getPrimaryService: async id => {
            assert.equal(id, LEGO_SERVICE.toLowerCase());
            return {getCharacteristic: async cid => {
                assert.equal(cid, LEGO_CHAR);
                return characteristic;
            }};
        }
    };
    const device = new EventTarget();
    device.id = 'hub-1';
    device.name = 'SPIKE Essential';
    device.gatt = {
        get connected () {
            return hub.connected;
        },
        connect: async () => {
            hub.connected = true;
            return server;
        },
        disconnect: () => {
            hub.connected = false;
        }
    };
    hub.drop = () => {
        hub.connected = false;
        device.dispatchEvent(new Event('gattserverdisconnected'));
    };
    hub.bluetooth = {
        requestDevice: async options => {
            hub.requests.push(options);
            if (hub.cancel) throw new Error('User cancelled the requestDevice() chooser.');
            return device;
        }
    };
    return hub;
};

// WebSocket that never reaches Scratch Link (not installed), or one that does.
class ClosedWebSocket {
    constructor () {
        setTimeout(() => this.onerror && this.onerror(new Event('error')), 1);
    }
    close () {}
}
class OpenWebSocket {
    constructor (url) {
        this.url = url;
        this.sent = [];
        OpenWebSocket.last = this;
        setTimeout(() => this.onopen && this.onopen(new Event('open')), 1);
    }
    send (text) {
        this.sent.push(JSON.parse(text));
    }
    close () {
        this.closed = true;
    }
}

// Scratch's Scratch Link BLE class, the same one the LEGO originals bundle.
const runtimeWith = socketFactory => {
    const runtime = new EventEmitter();
    runtime.constructor = {
        PERIPHERAL_CONNECTED: 'PERIPHERAL_CONNECTED',
        PERIPHERAL_DISCONNECTED: 'PERIPHERAL_DISCONNECTED',
        PERIPHERAL_LIST_UPDATE: 'PERIPHERAL_LIST_UPDATE',
        PERIPHERAL_SCAN_TIMEOUT: 'PERIPHERAL_SCAN_TIMEOUT',
        PERIPHERAL_REQUEST_ERROR: 'PERIPHERAL_REQUEST_ERROR',
        PERIPHERAL_CONNECTION_LOST_ERROR: 'PERIPHERAL_CONNECTION_LOST_ERROR',
        USER_PICKED_PERIPHERAL: 'USER_PICKED_PERIPHERAL'
    };
    runtime.getScratchLinkSocket = type => socketFactory(type);
    return runtime;
};
const ScratchLinkBLE = require(new URL('../../node_modules/scratch-vm/src/io/ble.js', import.meta.url).pathname);

test('Scratch Link filters become Web Bluetooth options', () => {
    const options = toRequestDeviceOptions(SPIKE_ESSENTIAL_OPTIONS);
    assert.deepEqual(options.optionalServices, [LEGO_SERVICE.toLowerCase()]);
    const [maker] = options.filters[0].manufacturerData;
    assert.equal(maker.companyIdentifier, 0x0397);
    assert.deepEqual(Array.from(maker.dataPrefix), [0x00, 0x83]);
    assert.deepEqual(Array.from(maker.mask), [0x00, 0xff]);
    const any = toRequestDeviceOptions({filters: [{services: [LEGO_SERVICE], manufacturerData: {0x0397: {dataPrefix: []}}}]});
    assert.deepEqual(any.filters[0].manufacturerData, [{companyIdentifier: 0x0397}]);
});

test('BOOST options from Scratch reach requestDevice in Web Bluetooth form', async () => {
    const hub = fakeHub();
    assert.equal(patchRequestDevice(hub.bluetooth), true);
    assert.equal(patchRequestDevice(hub.bluetooth), false);
    await hub.bluetooth.requestDevice({filters: [{services: [LEGO_SERVICE],
        manufacturerData: {0x0397: {dataPrefix: [0x00, 0x40], mask: [0x00, 0xff]}}}], optionalServices: []});
    const [maker] = hub.requests[0].filters[0].manufacturerData;
    assert.equal(maker.companyIdentifier, 0x0397);
    assert.deepEqual(Array.from(maker.dataPrefix), [0x00, 0x40]);
});

test('without Scratch Link, a LEGO hub connects, writes in order and notifies', async () => {
    const hub = fakeHub();
    const socket = new WebBluetoothLinkSocket('BLE', {bluetooth: hub.bluetooth, WebSocket: ClosedWebSocket});
    const runtime = runtimeWith(() => socket);
    const lists = [];
    runtime.on('PERIPHERAL_LIST_UPDATE', list => lists.push(list));
    let connected = false;
    const ble = new ScratchLinkBLE(runtime, 'spikeessential', SPIKE_ESSENTIAL_OPTIONS, () => {
        connected = true;
    });
    await tick(20);
    assert.equal(socket.mode, 'web-bluetooth');
    assert.equal(hub.requests.length, 1);
    assert.deepEqual(Object.keys(lists.at(-1)), ['hub-1']);

    ble.connectPeripheral('hub-1');
    await tick(5);
    assert.equal(connected, true);
    assert.equal(ble.isConnected(), true);

    const received = [];
    await ble.startNotifications(LEGO_SERVICE, LEGO_CHAR, message => received.push(message));
    assert.equal(hub.notifying, true);
    hub.send([5, 0, 0x45, 0, 7]);
    assert.deepEqual(received, [Buffer.from([5, 0, 0x45, 0, 7]).toString('base64')]);

    await Promise.all([1, 2, 3].map(n => ble.write(LEGO_SERVICE, LEGO_CHAR,
        Buffer.from([n, 0, 0x81]).toString('base64'), 'base64', true)));
    assert.deepEqual(hub.written, [[1, 0, 0x81], [2, 0, 0x81], [3, 0, 0x81]]);
    assert.equal(hub.overlapped, false, 'GATT operations overlapped');

    const read = await ble.read(LEGO_SERVICE, LEGO_CHAR);
    assert.equal(read.message, Buffer.from([5, 0, 1, 2, 3]).toString('base64'));

    ble.disconnect();
    await tick(5);
    assert.equal(hub.connected, false);
    assert.equal(socket.isOpen(), false);
});

test('a hub switched off reports the lost connection', async () => {
    const hub = fakeHub();
    const socket = new WebBluetoothLinkSocket('BLE', {bluetooth: hub.bluetooth, WebSocket: ClosedWebSocket});
    const runtime = runtimeWith(() => socket);
    let lost = 0;
    runtime.on('PERIPHERAL_CONNECTION_LOST_ERROR', () => lost++);
    const ble = new ScratchLinkBLE(runtime, 'spikeessential', SPIKE_ESSENTIAL_OPTIONS, () => {}, () => {});
    await tick(20);
    ble.connectPeripheral('hub-1');
    await tick(5);
    hub.drop();
    await tick(5);
    assert.equal(lost, 1);
    assert.equal(ble.isConnected(), false);
});

test('closing the browser chooser ends the search', async () => {
    const hub = fakeHub();
    hub.cancel = true;
    const socket = new WebBluetoothLinkSocket('BLE', {bluetooth: hub.bluetooth, WebSocket: ClosedWebSocket});
    const runtime = runtimeWith(() => socket);
    let timeouts = 0;
    runtime.on('PERIPHERAL_SCAN_TIMEOUT', () => timeouts++);
    const ble = new ScratchLinkBLE(runtime, 'spikeessential', SPIKE_ESSENTIAL_OPTIONS, () => {});
    await tick(20);
    assert.equal(timeouts, 1);
    ble.disconnect();
});

test('when Scratch Link is running it is still used', async () => {
    const hub = fakeHub();
    const socket = new WebBluetoothLinkSocket('BLE', {bluetooth: hub.bluetooth, WebSocket: OpenWebSocket});
    const runtime = runtimeWith(() => socket);
    const ble = new ScratchLinkBLE(runtime, 'spikeessential', SPIKE_ESSENTIAL_OPTIONS, () => {});
    await tick(20);
    assert.equal(socket.mode, 'scratch-link');
    assert.equal(OpenWebSocket.last.url, 'ws://127.0.0.1:20111/scratch/ble');
    assert.equal(OpenWebSocket.last.sent[0].method, 'discover');
    assert.equal(hub.requests.length, 0);
    ble.disconnect();
    assert.equal(OpenWebSocket.last.closed, true);
});

test('the runtime factory uses Web Bluetooth only for BLE', () => {
    const calls = [];
    const runtime = {
        _defaultScratchLinkSocketFactory: type => {
            calls.push(type);
            return {type};
        },
        configureScratchLinkSocketFactory (factory) {
            this.factory = factory;
        }
    };
    const hub = fakeHub();
    const hadNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {value: {bluetooth: hub.bluetooth}, configurable: true});
    try {
        assert.equal(installWebBluetoothLink(runtime), true);
        assert.ok(runtime.factory('BLE') instanceof WebBluetoothLinkSocket);
        assert.deepEqual(runtime.factory('BT'), {type: 'BT'});
        assert.equal(hub.bluetooth.unifiscratchPatched, true);
        Object.defineProperty(globalThis, 'navigator', {value: {}, configurable: true});
        assert.deepEqual(runtime.factory('BLE'), {type: 'BLE'});
        assert.deepEqual(calls, ['BT', 'BLE']);
    } finally {
        if (hadNavigator) Object.defineProperty(globalThis, 'navigator', hadNavigator);
    }
});
