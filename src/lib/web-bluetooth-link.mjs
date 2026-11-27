// Scratch Link stand-in over Web Bluetooth.
//
// The LEGO extensions by bricklife (SPIKE Essential, Powered UP, CONTROL+,
// DUPLO Train, Mario, Luigi, Peach, the remote and LEGO BLE Device) carry their
// own copy of Scratch's BLE class, which only talks JSON-RPC to the Scratch Link
// application through runtime.getScratchLinkSocket('BLE'). Those originals are
// pinned by hash, so instead of changing them the editor gives the runtime a
// socket factory: when the browser has Web Bluetooth and Scratch Link is not
// running, the socket answers the same JSON-RPC calls (discover, connect, write,
// read, startNotifications, stopNotifications) with navigator.bluetooth.
// When Scratch Link is running it is still used, exactly as before.
// Bluetooth Classic ('BT', used by EV3) is left to Scratch Link.

const SCRATCH_LINK_BLE_URL = 'ws://127.0.0.1:20111/scratch/ble';
const PROBE_TIMEOUT_MS = 800;

const bytesToBase64 = bytes => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
};
const base64ToBytes = base64 => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
const dataViewToBytes = view => new Uint8Array(view.buffer, view.byteOffset, view.byteLength);

const uuid = id => (typeof id === 'string' ? id.toLowerCase() : id);

// Scratch Link manufacturerData: {[companyId]: {dataPrefix: [...], mask: [...]}}
// Web Bluetooth manufacturerData: [{companyIdentifier, dataPrefix, mask}], where an
// empty dataPrefix is rejected, so it is left out.
const toManufacturerData = data => {
    if (Array.isArray(data)) return data;
    return Object.keys(data).map(companyId => {
        const entry = {companyIdentifier: Number(companyId)};
        const {dataPrefix, mask} = data[companyId] || {};
        if (dataPrefix && dataPrefix.length) {
            entry.dataPrefix = new Uint8Array(dataPrefix);
            if (mask && mask.length) entry.mask = new Uint8Array(mask);
        }
        return entry;
    });
};

const toFilter = filter => {
    const out = Object.assign({}, filter);
    if (out.services) out.services = out.services.map(uuid);
    if (out.manufacturerData) out.manufacturerData = toManufacturerData(out.manufacturerData);
    return out;
};

// Scratch Link discover parameters -> navigator.bluetooth.requestDevice options.
// Services named in the filters are also listed as optional, so they stay usable.
export const toRequestDeviceOptions = (params = {}) => {
    const services = new Set();
    const filters = (params.filters || []).map(toFilter);
    filters.forEach(filter => (filter.services || []).forEach(service => services.add(service)));
    (params.optionalServices || []).forEach(service => services.add(uuid(service)));
    const options = filters.length ? {filters} : {acceptAllDevices: true};
    options.optionalServices = Array.from(services);
    return options;
};

// Scratch's own Web Bluetooth class (WeDo 2.0, BOOST, Force and Acceleration)
// hands its Scratch Link style options straight to requestDevice, and Chrome
// rejects BOOST's manufacturerData object. Accept that style here too.
export const patchRequestDevice = bluetooth => {
    if (!bluetooth || bluetooth.unifiscratchPatched || typeof bluetooth.requestDevice !== 'function') return false;
    const requestDevice = bluetooth.requestDevice.bind(bluetooth);
    bluetooth.requestDevice = (options = {}) => requestDevice(Object.assign({}, options, options.filters ? {
        filters: options.filters.map(toFilter)
    } : {}));
    bluetooth.unifiscratchPatched = true;
    return true;
};

// One JSON-RPC peer that answers like Scratch Link, using Web Bluetooth.
export class WebBluetoothLink {
    constructor (bluetooth, send) {
        this._bluetooth = bluetooth;
        this._send = send; // receives JSON-RPC objects for the extension
        this._device = null;
        this._server = null;
        this._queue = Promise.resolve();
        this._listeners = new Map();
        this._closed = false;
        this.onDisconnected = null;
        this._handleGattDisconnected = () => {
            if (!this._closed && this.onDisconnected) this.onDisconnected();
        };
    }

    _notify (method, params) {
        this._send({jsonrpc: '2.0', method, params});
    }

    // GATT allows one operation at a time; Scratch Link queues them too.
    _enqueue (task) {
        const run = this._queue.then(task, task);
        this._queue = run.catch(() => null);
        return run;
    }

    async _characteristic (serviceId, characteristicId) {
        if (!this._server || !this._server.connected) throw new Error('Not connected');
        const service = await this._server.getPrimaryService(uuid(serviceId));
        return service.getCharacteristic(uuid(characteristicId));
    }

    async handleRequest (request) {
        const {id, method, params = {}} = request;
        const reply = (result, error) => {
            if (id === null || typeof id === 'undefined') return;
            const response = {jsonrpc: '2.0', id};
            if (error) response.error = {code: -32000, message: String(error.message || error)};
            else response.result = typeof result === 'undefined' ? null : result;
            this._send(response);
        };
        try {
            reply(await this._call(method, params));
        } catch (error) {
            reply(null, error);
        }
    }

    _call (method, params) {
        switch (method) {
        case 'discover':
            this._discover(params);
            return null;
        case 'connect':
            return this._connect();
        case 'write':
            return this._enqueue(() => this._write(params));
        case 'read':
            return this._enqueue(() => this._read(params));
        case 'startNotifications':
            return this._enqueue(() => this._startNotifications(params));
        case 'stopNotifications':
            return this._enqueue(() => this._stopNotifications(params));
        case 'getVersion':
            return {protocol: '1.3'};
        case 'ping':
            return 42;
        default:
            throw new Error(`Method not supported: ${method}`);
        }
    }

    // Scratch Link lists the hubs it sees and the user picks one in the editor.
    // Here the browser's own chooser picks it, and the editor then lists only that one.
    _discover (params) {
        this._bluetooth.requestDevice(toRequestDeviceOptions(params))
            .then(device => {
                this._device = device;
                this._notify('didDiscoverPeripheral', {
                    peripheralId: device.id,
                    name: device.name || 'LEGO Hub',
                    rssi: -40
                });
            })
            .catch(() => {
                // Chooser closed without a device, or Bluetooth unavailable.
                this._notify('userDidNotPickPeripheral', {});
            });
    }

    async _connect () {
        if (!this._device) throw new Error('No device chosen');
        this._device.removeEventListener('gattserverdisconnected', this._handleGattDisconnected);
        this._device.addEventListener('gattserverdisconnected', this._handleGattDisconnected);
        this._server = await this._device.gatt.connect();
        return null;
    }

    async _write ({serviceId, characteristicId, message, encoding, withResponse}) {
        const characteristic = await this._characteristic(serviceId, characteristicId);
        const value = encoding === 'base64' ? base64ToBytes(message) : new TextEncoder().encode(message);
        if (withResponse && characteristic.writeValueWithResponse) {
            await characteristic.writeValueWithResponse(value);
        } else if (!withResponse && characteristic.writeValueWithoutResponse) {
            await characteristic.writeValueWithoutResponse(value);
        } else {
            await characteristic.writeValue(value);
        }
        return value.length;
    }

    async _read (params) {
        const characteristic = await this._characteristic(params.serviceId, params.characteristicId);
        if (params.startNotifications) await this._listen(params, characteristic);
        const view = await characteristic.readValue();
        return {message: bytesToBase64(dataViewToBytes(view)), encoding: 'base64'};
    }

    async _startNotifications (params) {
        const characteristic = await this._characteristic(params.serviceId, params.characteristicId);
        await this._listen(params, characteristic);
        return null;
    }

    async _listen ({serviceId, characteristicId}, characteristic) {
        const key = `${uuid(serviceId)}/${uuid(characteristicId)}`;
        if (!this._listeners.has(key)) {
            const listener = event => {
                this._notify('characteristicDidChange', {
                    serviceId,
                    characteristicId,
                    encoding: 'base64',
                    message: bytesToBase64(dataViewToBytes(event.target.value))
                });
            };
            characteristic.addEventListener('characteristicvaluechanged', listener);
            this._listeners.set(key, {characteristic, listener});
        }
        await characteristic.startNotifications();
    }

    async _stopNotifications ({serviceId, characteristicId}) {
        const key = `${uuid(serviceId)}/${uuid(characteristicId)}`;
        const entry = this._listeners.get(key);
        if (!entry) return null;
        this._listeners.delete(key);
        entry.characteristic.removeEventListener('characteristicvaluechanged', entry.listener);
        await entry.characteristic.stopNotifications();
        return null;
    }

    close () {
        this._closed = true;
        this._listeners.forEach(({characteristic, listener}) => {
            characteristic.removeEventListener('characteristicvaluechanged', listener);
        });
        this._listeners.clear();
        if (this._device) {
            this._device.removeEventListener('gattserverdisconnected', this._handleGattDisconnected);
            if (this._device.gatt && this._device.gatt.connected) this._device.gatt.disconnect();
        }
        this._device = null;
        this._server = null;
    }
}

// Socket with the ScratchLinkWebSocket interface (open, close, sendMessage,
// isOpen, setOnOpen/Close/Error, setHandleMessage). It tries Scratch Link first
// for a moment and otherwise answers through Web Bluetooth.
export class WebBluetoothLinkSocket {
    constructor (type, options = {}) {
        this._type = type;
        this._bluetooth = options.bluetooth;
        this._WebSocket = options.WebSocket || (typeof WebSocket === 'undefined' ? null : WebSocket);
        this._probeUrl = options.probeUrl || SCRATCH_LINK_BLE_URL;
        this._probeTimeout = typeof options.probeTimeout === 'number' ? options.probeTimeout : PROBE_TIMEOUT_MS;
        this._onOpen = null;
        this._onClose = null;
        this._onError = null;
        this._handleMessage = null;
        this._ws = null;
        this._link = null;
        this._open = false;
        this.mode = null; // 'scratch-link' or 'web-bluetooth', for tests and diagnostics
    }

    setOnOpen (fn) {
        this._onOpen = fn;
    }

    setOnClose (fn) {
        this._onClose = fn;
    }

    setOnError (fn) {
        this._onError = fn;
    }

    setHandleMessage (fn) {
        this._handleMessage = fn;
    }

    open () {
        if (!(this._onOpen && this._onClose && this._onError && this._handleMessage)) {
            throw new Error('Must set open, close, message and error handlers before calling open on the socket');
        }
        this._probeScratchLink().then(ws => {
            if (ws) this._useScratchLink(ws);
            else this._useWebBluetooth();
        });
    }

    _probeScratchLink () {
        if (!this._WebSocket || this._probeTimeout <= 0) return Promise.resolve(null);
        return new Promise(resolve => {
            let ws;
            try {
                ws = new this._WebSocket(this._probeUrl);
            } catch (e) {
                resolve(null);
                return;
            }
            let done = false;
            let timer = null;
            const finish = result => {
                if (done) return;
                done = true;
                clearTimeout(timer);
                ws.onopen = ws.onerror = ws.onclose = null;
                if (!result) {
                    try {
                        ws.close();
                    } catch (e) { /* already closed */ }
                }
                resolve(result);
            };
            timer = setTimeout(() => finish(null), this._probeTimeout);
            ws.onopen = () => finish(ws);
            ws.onerror = () => finish(null);
            ws.onclose = () => finish(null);
        });
    }

    _useScratchLink (ws) {
        this.mode = 'scratch-link';
        this._ws = ws;
        this._open = true;
        ws.onclose = event => {
            this._open = false;
            this._onClose(event);
        };
        ws.onerror = event => this._onError(event);
        ws.onmessage = event => this._handleMessage(JSON.parse(event.data));
        this._onOpen();
    }

    _useWebBluetooth () {
        this.mode = 'web-bluetooth';
        this._link = new WebBluetoothLink(this._bluetooth, message => {
            if (this._open) this._handleMessage(message);
        });
        this._link.onDisconnected = () => this._closeWith('disconnected');
        this._open = true;
        this._onOpen();
    }

    _closeWith (reason) {
        if (!this._open) return;
        this._open = false;
        if (this._link) this._link.close();
        this._link = null;
        this._onClose({type: 'close', reason});
    }

    sendMessage (message) {
        if (this._ws) {
            this._ws.send(JSON.stringify(message));
        } else if (this._link) {
            if (Object.prototype.hasOwnProperty.call(message, 'method')) {
                this._link.handleRequest(message);
            }
            // Responses from the extension (to 'ping') need no answer.
        }
    }

    isOpen () {
        return this._open;
    }

    close () {
        if (this._ws) {
            const ws = this._ws;
            this._ws = null;
            ws.close();
            return;
        }
        this._closeWith('closed');
    }
}

export const webBluetoothAvailable = (nav = typeof navigator === 'undefined' ? null : navigator) =>
    !!(nav && nav.bluetooth && typeof nav.bluetooth.requestDevice === 'function');

// Give the runtime the socket factory. BLE goes through Web Bluetooth when the
// browser has it (with Scratch Link still preferred when running); everything
// else keeps the runtime's default Scratch Link socket.
export const installWebBluetoothLink = runtime => {
    if (!runtime || typeof runtime.configureScratchLinkSocketFactory !== 'function') return false;
    if (webBluetoothAvailable()) patchRequestDevice(navigator.bluetooth);
    const defaultFactory = runtime._defaultScratchLinkSocketFactory.bind(runtime);
    runtime.configureScratchLinkSocketFactory(type => {
        if (type === 'BLE' && webBluetoothAvailable()) {
            return new WebBluetoothLinkSocket(type, {bluetooth: navigator.bluetooth});
        }
        return defaultFactory(type);
    });
    return true;
};

// Extensions that use Bluetooth Classic, which browsers cannot reach.
const SCRATCH_LINK_ONLY = ['ev3'];

// What the connection window should advise when a search fails.
export const connectionKindFor = (extensionId, nav = typeof navigator === 'undefined' ? null : navigator) => {
    if (SCRATCH_LINK_ONLY.includes(extensionId)) return 'scratch-link';
    return webBluetoothAvailable(nav) ? 'web-bluetooth' : 'no-web-bluetooth';
};
