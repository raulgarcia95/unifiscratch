/* eslint-disable max-len */
import {tr, textOf, timeoutError, isTimeout} from './runtime-texts.mjs';
// MicroBlocks serial protocol for Unifiscratch (Web Serial).
//
// Boards that ship with the MicroBlocks firmware (Citilab ED1 and others)
// speak a small binary protocol over USB serial at 115200 baud:
//
//   short message   FA type id
//   long  message   FB type id sizeLo sizeHi body...
//
// Messages sent to the board end their body with the terminator byte FE,
// which is counted in the size. Messages from the board carry no terminator.
// Code runs on the board as "chunks": 16-bit bytecode words followed by string
// literals, stored with chunkCode16Msg and started with startChunkMsg. The
// board answers with taskDone, taskReturnedValue or taskError.
//
// This file is Unifiscratch's own implementation, written from the public
// protocol description and checked against the MicroBlocks virtual machine
// (https://bitbucket.org/john_maloney/smallvm, MPL-2.0). No MicroBlocks code
// is copied here; only protocol numbers and the instruction format are used.

export const MSG = Object.freeze({
    chunkCode: 1,
    deleteChunk: 2,
    startChunk: 3,
    stopChunk: 4,
    stopAll: 6,
    getVar: 7,
    setVar: 8,
    getChunkCRC: 11,
    getVersion: 12,
    taskStarted: 16,
    taskDone: 17,
    taskReturnedValue: 18,
    taskError: 19,
    outputValue: 20,
    varValue: 21,
    version: 22,
    chunkCRC: 23,
    clearGraph: 24,
    codeStoreFull: 25,
    ping: 26,
    broadcast: 27,
    chunkAttribute: 28,
    varName: 29,
    extended: 30,
    chunkCode16: 32,
    codeStoreUsed: 33,
    allCRCs: 39
});

const LAST_MSG = 39;
const MAX_BODY = 2048;
const MAX_TO_BOARD = 1000;

export const CHUNK_COMMAND = 1;
export const CHUNK_REPORTER = 2;

// Errors reported by taskErrorMsg (subset of the VM error table): [English, Spanish, Catalan].
const TASK_ERRORS = {
    1: ['unspecified error', 'error sin especificar', 'error sense especificar'],
    2: ['out of memory', 'memoria agotada', 'memòria esgotada'],
    3: ['an integer is needed', 'hace falta un número entero', 'cal un nombre enter'],
    4: ['a list is needed', 'hace falta una lista', 'cal una llista'],
    5: ['a boolean is needed', 'hace falta un booleano', 'cal un booleà'],
    9: ['index out of range', 'índice fuera de rango', 'índex fora de rang'],
    10: ['missing arguments', 'faltan argumentos', 'falten arguments'],
    12: ['unknown primitive', 'primitiva desconocida', 'primitiva desconeguda'],
    13: ['a variable is needed', 'hace falta una variable', 'cal una variable'],
    14: ['the operation is not supported by this board', 'la operación no es compatible con esta placa', 'l’operació no és compatible amb aquesta placa'],
    22: ['stack overflow', 'pila desbordada', 'pila desbordada'],
    26: ['a text is needed', 'hace falta un texto', 'cal un text']
};

export const shortMessage = (type, id = 0) => Uint8Array.from([0xFA, type & 0xFF, id & 0xFF]);

export const longMessage = (type, id, body) => {
    const bytes = Array.from(body);
    const size = bytes.length + 1; // terminator byte
    if (size > MAX_TO_BOARD) throw new Error(tr('Message too long for the board.', 'Mensaje demasiado largo para la placa.', 'Missatge massa llarg per a la placa.'));
    return Uint8Array.from([0xFB, type & 0xFF, id & 0xFF, size & 0xFF, (size >> 8) & 0xFF, ...bytes, 0xFE]);
};

const isKnownType = type => (type >= 1 && type <= LAST_MSG) || (type >= 200 && type <= 205);

// Splits the board's byte stream into messages. Bytes outside messages (ESP32
// boot log after a reset, line noise) are skipped.
export class MessageParser {
    constructor () {
        this.buffer = [];
    }

    push (chunk) {
        for (const byte of chunk) this.buffer.push(byte);
        const messages = [];
        let start = 0;
        const b = this.buffer;
        while (start < b.length) {
            const first = b[start];
            if (first !== 0xFA && first !== 0xFB) {
                start++;
                continue;
            }
            if (start + 1 < b.length && !isKnownType(b[start + 1])) {
                start++;
                continue;
            }
            if (first === 0xFA) {
                if (start + 3 > b.length) break;
                messages.push({type: b[start + 1], id: b[start + 2], data: []});
                start += 3;
                continue;
            }
            if (start + 5 > b.length) break;
            const size = b[start + 3] | (b[start + 4] << 8);
            if (size > MAX_BODY) {
                start++;
                continue;
            }
            if (start + 5 + size > b.length) break;
            messages.push({type: b[start + 1], id: b[start + 2], data: b.slice(start + 5, start + 5 + size)});
            start += 5 + size;
        }
        this.buffer = b.slice(start);
        if (this.buffer.length > 8192) this.buffer = [];
        return messages;
    }
}

const int32 = (data, at) => (data[at] | (data[at + 1] << 8) | (data[at + 2] << 16) | (data[at + 3] << 24));

const utf8 = bytes => new TextDecoder().decode(Uint8Array.from(bytes));

// Decodes a value sent by the board: 1 integer, 2 string, 3 boolean, 4 list, 5 bytearray.
export const decodeValue = data => {
    if (!data || data.length === 0) return '';
    const type = data[0];
    if (type === 1 && data.length >= 5) return int32(data, 1);
    if (type === 2) return utf8(data.slice(1));
    if (type === 3) return data[1] === 1;
    if (type === 4 && data.length >= 4) {
        const sent = data[3];
        const items = [];
        let i = 4;
        for (let n = 0; n < sent && i < data.length; n++) {
            const itemType = data[i++];
            if (itemType === 1) {
                items.push(int32(data, i));
                i += 4;
            } else if (itemType === 2) {
                const length = data[i++];
                items.push(utf8(data.slice(i, i + length)));
                i += length;
            } else if (itemType === 3) {
                items.push(data[i++] === 1);
            } else if (itemType === 4 || itemType === 5) {
                items.push(itemType === 4 ? [] : '');
                i += 3;
            } else {
                items.push('');
            }
        }
        return items;
    }
    if (type === 5 && data.length >= 4) return data.slice(4, 4 + data[3]);
    return '';
};

// Encodes a value for setVarMsg.
export const encodeValue = value => {
    if (typeof value === 'boolean') return [3, value ? 1 : 0];
    if (typeof value === 'number') {
        if (!Number.isInteger(value)) throw new Error(tr('The board only accepts integers.', 'La placa solo admite números enteros.', 'La placa només admet nombres enters.'));
        const n = value | 0;
        return [1, n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >>> 24) & 0xFF];
    }
    return [2, ...new TextEncoder().encode(String(value))];
};

// CRC-32 (IEEE), as used by the board to describe stored chunks.
const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
    }
    return table;
})();

export const crc32 = bytes => {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
};

// ---------- bytecode assembler ----------

const OPCODES = Object.freeze({
    halt: 0,
    pushImmediate: 2,
    pushLargeInteger: 3,
    pushHugeInteger: 4,
    pushLiteral: 5,
    pushGlobal: 6,
    storeGlobal: 7,
    initLocals: 9,
    pushLocal: 10,
    storeLocal: 11,
    pop: 19,
    jmp: 22,
    jmpTrue: 24,
    jmpFalse: 25,
    decrementAndJmp: 26,
    waitMicros: 32,
    waitMillis: 33,
    returnResult: 35,
    commandPrimitive: 36,
    reporterPrimitive: 37,
    add: 50,
    subtract: 51,
    multiply: 52,
    lessThan: 61,
    equal: 63,
    not: 67,
    i2cSet: 95,
    i2cGet: 96,
    codeEnd: 127
});

// Order of the VM's primitive sets (PrimitiveSetIndex).
const PRIM_SETS = Object.freeze({
    vars: 0,
    data: 1,
    misc: 2,
    io: 3,
    sensors: 4,
    serial: 5,
    display: 6,
    file: 7,
    net: 8,
    ble: 9,
    radio: 10,
    tft: 11
});

const TRUE_OBJ = 4;
const FALSE_OBJ = 0;

// Builds one code chunk. Every entry of `words` is one 16-bit word.
export class ChunkBuilder {
    constructor (localCount = 0) {
        this.words = [];
        this.op('initLocals', localCount);
    }

    op (name, arg = 0) {
        if (!(name in OPCODES)) throw new Error(tr(`Unknown instruction: ${name}`, `Instrucción desconocida: ${name}`, `Instrucció desconeguda: ${name}`));
        if (arg < -128 || arg > 127) throw new Error(tr('Instruction argument out of range.', 'Argumento de instrucción fuera de rango.', 'Argument d’instrucció fora de rang.'));
        this.words.push({op: name, arg});
        return this;
    }

    int (value) {
        const n = Math.trunc(Number(value));
        if (n >= -64 && n <= 63) {
            this.words.push({op: 'pushImmediate', raw: ((n & 127) << 1) | 1});
        } else if (n >= -4194304 && n <= 4194303) {
            this.words.push({op: 'pushLargeInteger', value: n}, {extra: true});
        } else {
            this.words.push({op: 'pushHugeInteger', value: n}, {extra: true}, {extra: true});
        }
        return this;
    }

    bool (value) {
        this.words.push({op: 'pushImmediate', raw: value ? TRUE_OBJ : FALSE_OBJ});
        return this;
    }

    str (text) {
        this.words.push({op: 'pushLiteral', literal: String(text)}, {extra: true});
        return this;
    }

    global (index) {
        return this.op('pushGlobal', index);
    }

    setGlobal (index) {
        return this.op('storeGlobal', index);
    }

    local (index) {
        return this.op('pushLocal', index);
    }

    setLocal (index) {
        return this.op('storeLocal', index);
    }

    // Calls a named primitive such as [sensors:touchRead]; arguments must be pushed first.
    prim (set, name, argCount, isCommand) {
        if (!(set in PRIM_SETS)) throw new Error(tr(`Unknown primitive set: ${set}`, `Conjunto de primitivas desconocido: ${set}`, `Conjunt de primitives desconegut: ${set}`));
        this.words.push({
            op: isCommand ? 'commandPrimitive' : 'reporterPrimitive',
            literal: name,
            primSet: PRIM_SETS[set],
            argCount
        }, {extra: true});
        return this;
    }

    // Emits a jump with its offset in words, using the long form when needed.
    jump (name, offset) {
        if (offset !== 0 && offset >= -128 && offset <= 127) {
            this.words.push({op: name, arg: offset});
        } else {
            this.words.push({op: name, arg: 0, long: offset < 0 ? offset - 1 : offset}, {extra: true});
        }
        return this;
    }

    // Measures the words produced by a body without keeping them.
    measure (body) {
        const start = this.words.length;
        body(this);
        const produced = this.words.splice(start);
        return produced;
    }

    // repeat <count already on the stack> { body }
    repeat (body) {
        const inner = this.measure(body);
        this.jump('jmp', inner.length);
        this.words.push(...inner);
        this.jump('decrementAndJmp', -(inner.length + 1));
        return this;
    }

    // if <condition already on the stack> { body }
    ifTrue (body) {
        const inner = this.measure(body);
        this.jump('jmpFalse', inner.length);
        this.words.push(...inner);
        return this;
    }

    ret () {
        return this.op('returnResult', 0);
    }

    // Returns the chunk body (without the chunk type byte).
    bytes () {
        const words = this.words.slice();
        words.push({op: 'codeEnd', arg: 0});
        if (words.length % 2 === 1) words.push({op: 'codeEnd', arg: 0});

        const literalOffsets = new Map();
        const literals = [];
        let next = words.length;
        words.forEach(word => {
            if (!('literal' in word) || literalOffsets.has(word.literal)) return;
            const encoded = new TextEncoder().encode(word.literal);
            literalOffsets.set(word.literal, next);
            literals.push(encoded);
            next += 2 * (1 + Math.floor((encoded.length + 4) / 4));
        });

        const out = [];
        words.forEach((word, index) => {
            if (word.extra) return;
            const code = OPCODES[word.op];
            if ('raw' in word) {
                out.push(code, word.raw & 0xFF);
            } else if ('value' in word && word.op === 'pushLargeInteger') {
                const n = word.value;
                out.push(code, ((n & 127) << 1) | 1, (n >> 7) & 0xFF, (n >> 15) & 0xFF);
            } else if ('value' in word) {
                const n = word.value;
                out.push(code, 0, ((n & 127) << 1) | 1, (n >> 7) & 0xFF, (n >> 15) & 0xFF, (n >> 23) & 0xFF);
            } else if ('literal' in word) {
                // Offset from the following word to the literal, in 16-bit words.
                const offset = literalOffsets.get(word.literal) - (index + 1);
                if (word.op === 'pushLiteral') {
                    out.push(code, 0, offset & 0xFF, (offset >> 8) & 0xFF);
                } else {
                    if (offset > 1023) throw new Error(tr('Program too long.', 'Programa demasiado largo.', 'Programa massa llarg.'));
                    const second = (word.primSet << 10) | offset;
                    out.push(code, word.argCount & 0xFF, second & 0xFF, (second >> 8) & 0xFF);
                }
            } else if ('long' in word) {
                out.push(code, 0, word.long & 0xFF, (word.long >> 8) & 0xFF);
            } else {
                out.push(code, word.arg & 0xFF);
            }
        });
        for (const encoded of literals) {
            const wordCount = Math.floor((encoded.length + 4) / 4);
            const header = (wordCount << 4) | 4; // string object
            out.push(header & 0xFF, (header >> 8) & 0xFF, (header >> 16) & 0xFF, (header >>> 24) & 0xFF);
            out.push(...encoded);
            for (let i = 0; i < 4 - (encoded.length % 4); i++) out.push(0);
        }
        while (out.length % 4 !== 0) out.push(0);
        return out;
    }
}

// ---------- transport ----------

const cancelled = () => new Error(tr('Operation cancelled because the device was stopped.', 'Operación cancelada por la parada del dispositivo.', 'Operació cancel·lada per l’aturada del dispositiu.'));
const noAnswer = () => timeoutError(tr('The board did not answer in time.', 'La placa no respondió a tiempo.', 'La placa no ha respost a temps.'));

export const parseVersion = text => {
    const match = /v?(\d+)\s+(.*)$/.exec(String(text).trim());
    if (!match) return {version: 0, board: String(text).trim()};
    return {version: Number(match[1]), board: match[2].trim()};
};

export class MicroBlocksTransport {
    constructor (label, {
        boardMatch = null,
        boardHint = '',
        chunks = {},
        onReady = null,
        stop = null,
        baudRate = 115200,
        timeout = 3000,
        connectTimeout = 8000,
        keepAlive = 1500
    } = {}) {
        this.label = label;
        this.boardMatch = boardMatch;
        this.boardHint = boardHint;
        this.chunks = chunks; // {name: {id, type, bytes}}
        this.onReady = onReady;
        this.stopHandler = stop;
        this.baudRate = baudRate;
        this.timeout = timeout;
        this.connectTimeout = connectTimeout;
        this.keepAlive = keepAlive;
        this.port = null;
        this.reader = null;
        this.ready = false;
        this.epoch = 0;
        this.writes = Promise.resolve();
        this.locks = new Map();
        this.waiters = new Set();
        this.sleepers = new Set();
        this.parser = new MessageParser();
        this.lastError = '';
        this.boardInfo = null;
        this.lastSeen = 0;
    }

    isConnected () {
        return Boolean(this.ready && this.port && this.port.writable);
    }

    async connect () {
        if (this.isConnected()) return;
        if (this.connecting || this.closing) throw new Error(tr('Connection busy.', 'Conexión ocupada.', 'Connexió ocupada.'));
        if (typeof navigator === 'undefined' || !navigator.serial) {
            throw new Error(tr('Web Serial is not available. Use Chrome or Edge on HTTPS or localhost.', 'Web Serial no está disponible. Usa Chrome o Edge en HTTPS o localhost.', 'Web Serial no està disponible. Fes servir Chrome o Edge en HTTPS o localhost.'));
        }
        this.connecting = true;
        const epoch = this.epoch;
        try {
            const selected = await navigator.serial.requestPort();
            if (epoch !== this.epoch) throw cancelled();
            await selected.open({baudRate: this.baudRate, bufferSize: 4096});
            this.port = selected;
            if (!selected.readable || !selected.writable) throw new Error(tr('USB port not available.', 'Puerto USB no disponible.', 'Port USB no disponible.'));
            this.parser = new MessageParser();
            this.reader = selected.readable.getReader();
            this.readTask = this.readLoop(this.reader);
            await this.handshake(epoch);
            await this.installChunks(epoch);
            this.ready = true;
            this.startKeepAlive();
            if (this.onReady) await this.onReady(this);
            this.lastError = '';
        } catch (error) {
            this.ready = false;
            this.lastError = `${this.label}: ${isTimeout(error) ?
                tr('the board does not answer. Check that it is on, that the USB cable carries data, ' +
                    'that it has the MicroBlocks firmware and that no other tab (for example MicroBlocks) ' +
                    'is using the port.',
                'la placa no responde. Comprueba que está encendida, que el cable USB transmite datos, ' +
                    'que tiene el firmware de MicroBlocks y que ninguna otra pestaña (por ejemplo MicroBlocks) ' +
                    'está usando el puerto.',
                'la placa no respon. Comprova que està encesa, que el cable USB transmet dades, ' +
                    'que té el firmware de MicroBlocks i que cap altra pestanya (per exemple MicroBlocks) ' +
                    'no està fent servir el port.') :
                error.message}`;
            await this.closePort();
            throw new Error(this.lastError);
        } finally {
            this.connecting = false;
        }
    }

    // Pings until the VM answers (an ESP32 may reboot when the port opens),
    // then checks the firmware version and the board type.
    async handshake (epoch) {
        const deadline = Date.now() + this.connectTimeout;
        let answered = false;
        while (!answered && Date.now() < deadline) {
            if (epoch !== this.epoch) throw cancelled();
            try {
                await this.request(shortMessage(MSG.ping), m => m.type === MSG.ping, 400);
                answered = true;
            } catch (error) {
                if (!isTimeout(error)) throw error;
            }
        }
        if (!answered) throw noAnswer();
        const reply = await this.request(shortMessage(MSG.getVersion), m => m.type === MSG.version);
        const info = parseVersion(decodeValue(reply.data));
        this.boardInfo = info;
        if (info.version < 300) {
            throw new Error(tr(
                `the MicroBlocks firmware is old (v${info.version}). ` +
                    'Update it from microblocks.fun: connect the board and use «update firmware».',
                `el firmware de MicroBlocks es antiguo (v${info.version}). ` +
                    'Actualízalo desde microblocks.fun: conecta la placa y usa «actualizar firmware».',
                `el firmware de MicroBlocks és antic (v${info.version}). ` +
                    'Actualitza’l des de microblocks.fun: connecta la placa i fes servir «actualitzar firmware».'));
        }
        if (this.boardMatch && !this.boardMatch.test(info.board)) {
            const expected = textOf(this.boardHint) || this.label;
            throw new Error(tr(
                `the connected board is «${info.board}», not ${expected}.`,
                `la placa conectada es «${info.board}», no ${expected}.`,
                `la placa connectada és «${info.board}», no ${expected}.`));
        }
        await this.write(shortMessage(MSG.stopAll));
    }

    // Stores the helper chunks only when the board does not have them yet,
    // so reconnecting does not rewrite the board's flash memory.
    async installChunks (epoch) {
        for (const chunk of Object.values(this.chunks)) {
            if (epoch !== this.epoch) throw cancelled();
            const body = Uint8Array.from(chunk.bytes);
            const wanted = crc32(body);
            let current = null;
            try {
                const reply = await this.request(shortMessage(MSG.getChunkCRC, chunk.id),
                    m => m.type === MSG.chunkCRC && m.id === chunk.id, 300);
                current = int32(reply.data, 0) >>> 0;
            } catch (error) {
                if (!isTimeout(error)) throw error;
            }
            if (current === wanted) continue;
            const reply = await this.request(longMessage(MSG.chunkCode16, chunk.id, [chunk.type, ...body]),
                m => m.type === MSG.chunkCRC && m.id === chunk.id, 3000);
            if ((int32(reply.data, 0) >>> 0) !== wanted) throw new Error(tr('the board did not store the helper program correctly.', 'la placa guardó mal el programa auxiliar.', 'la placa ha desat malament el programa auxiliar.'));
        }
    }

    startKeepAlive () {
        clearInterval(this.keepAliveTimer);
        this.lastSeen = Date.now();
        this.keepAliveTimer = setInterval(() => {
            if (!this.isConnected()) return;
            if (Date.now() - this.lastSeen > (this.keepAlive * 3) + 1000) {
                this.lastError = `${this.label}: ${tr('the board stopped answering.', 'la placa ha dejado de responder.', 'la placa ha deixat de respondre.')}`;
                this.closePort().catch(() => {});
                return;
            }
            this.write(shortMessage(MSG.ping)).catch(() => {});
        }, this.keepAlive);
    }

    async readLoop (reader) {
        try {
            while (this.reader === reader) {
                const {value, done} = await reader.read();
                if (done) break;
                this.lastSeen = Date.now();
                for (const message of this.parser.push(value)) this.handleMessage(message);
            }
            if (!this.closing) throw new Error(tr('The USB device has been disconnected.', 'El dispositivo USB se ha desconectado.', 'El dispositiu USB s’ha desconnectat.'));
        } catch (error) {
            if (!this.closing) {
                this.lastError = `${this.label}: ${error.message}`;
                Promise.resolve().then(() => this.closePort())
                    .catch(() => {});
            }
        } finally {
            reader.releaseLock();
        }
    }

    handleMessage (message) {
        for (const waiter of [...this.waiters]) {
            if (waiter.match(message)) waiter.resolve(message);
        }
    }

    // Writes one slice, failing if the USB driver stalls.
    static writeSlice (writer, slice) {
        let timer;
        return Promise.race([
            writer.write(slice),
            new Promise((resolve, reject) => {
                timer = setTimeout(() => {
                    writer.abort().catch(() => {});
                    reject(new Error(tr('Writing to USB did not finish in time.', 'La escritura USB no respondió a tiempo.', 'L’escriptura USB no ha respost a temps.')));
                }, 2000);
            })
        ]).finally(() => clearTimeout(timer));
    }

    write (bytes) {
        const operation = this.writes.then(async () => {
            if (!this.port || !this.port.writable) throw new Error(tr('Connect the device first.', 'Conecta el dispositivo primero.', 'Connecta el dispositiu primer.'));
            const writer = this.port.writable.getWriter();
            try {
                // Many boards have a 64-byte receive buffer: send in small slices.
                for (let i = 0; i < bytes.length; i += 63) {
                    await MicroBlocksTransport.writeSlice(writer, bytes.slice(i, i + 63));
                    if (bytes.length > 63) await new Promise(resolve => setTimeout(resolve, 3));
                }
            } finally {
                writer.releaseLock();
            }
        });
        this.writes = operation.catch(() => {});
        return operation;
    }

    // Waits for the first message that matches. Registered before writing so
    // fast answers are not lost.
    expect (match, timeout = this.timeout) {
        let waiter;
        const promise = new Promise((resolve, reject) => {
            const finish = (error, message) => {
                clearTimeout(waiter.timer);
                this.waiters.delete(waiter);
                if (error) reject(error);
                else resolve(message);
            };
            waiter = {
                match,
                resolve: message => finish(null, message),
                reject: error => finish(error)
            };
            waiter.timer = setTimeout(() => finish(noAnswer()), timeout);
            this.waiters.add(waiter);
        });
        return {promise, cancel: error => waiter.reject(error)};
    }

    async request (bytes, match, timeout = this.timeout) {
        const pending = this.expect(match, timeout);
        try {
            await this.write(bytes);
        } catch (error) {
            pending.cancel(error);
        }
        return pending.promise;
    }

    // Runs one chunk with the given global variables and resolves with its
    // result. Calls on the same chunk wait for each other; different chunks
    // (motors, sound, sensors) run at the same time on the board.
    run (name, globals = {}, {timeout = this.timeout} = {}) {
        if (!this.isConnected()) {
            return Promise.reject(new Error(tr('Connect the device with its connect button before running blocks.', 'Conecta explícitamente el dispositivo antes de ejecutar bloques.', 'Connecta explícitament el dispositiu abans d’executar blocs.')));
        }
        const chunk = this.chunks[name];
        if (!chunk) return Promise.reject(new Error(tr(`Unknown helper program: ${name}`, `Programa auxiliar desconocido: ${name}`, `Programa auxiliar desconegut: ${name}`)));
        const epoch = this.epoch;
        const previous = this.locks.get(chunk.id) || Promise.resolve();
        const operation = previous.then(async () => {
            if (epoch !== this.epoch) throw cancelled();
            try {
                return await this.runNow(chunk, globals, timeout, epoch);
            } catch (error) {
                if (epoch === this.epoch) this.lastError = `${this.label}: ${error.message}`;
                throw error;
            }
        });
        this.locks.set(chunk.id, operation.catch(() => {}));
        return operation;
    }

    async runNow (chunk, globals, timeout, epoch) {
        for (const [index, value] of Object.entries(globals)) {
            await this.write(longMessage(MSG.setVar, Number(index), encodeValue(value)));
        }
        const done = this.expect(m => m.id === chunk.id &&
            (m.type === MSG.taskDone || m.type === MSG.taskReturnedValue || m.type === MSG.taskError), timeout);
        this.running = this.running || new Set();
        this.running.add(done);
        try {
            await this.write(shortMessage(MSG.startChunk, chunk.id));
        } catch (error) {
            done.cancel(error);
        }
        let message;
        try {
            message = await done.promise;
        } finally {
            this.running.delete(done);
        }
        if (epoch !== this.epoch) throw cancelled();
        if (message.type === MSG.taskError) {
            const code = message.data[0];
            const detail = TASK_ERRORS[code] ? tr(...TASK_ERRORS[code]) : tr(`code ${code}`, `código ${code}`, `codi ${code}`);
            throw new Error(tr(`the board reported an error: ${detail}.`, `la placa dio un error: ${detail}.`, `la placa ha donat un error: ${detail}.`));
        }
        return message.type === MSG.taskReturnedValue ? decodeValue(message.data) : '';
    }

    // Waits on the computer side; a stop or disconnect ends the wait early.
    wait (ms) {
        const epoch = this.epoch;
        return new Promise((resolve, reject) => {
            const sleeper = {
                cancel: () => {
                    clearTimeout(sleeper.timer);
                    this.sleepers.delete(sleeper);
                    reject(cancelled());
                }
            };
            sleeper.timer = setTimeout(() => {
                this.sleepers.delete(sleeper);
                if (epoch === this.epoch) resolve();
                else reject(cancelled());
            }, Math.max(0, ms));
            this.sleepers.add(sleeper);
        });
    }

    cancelAll () {
        this.epoch++;
        for (const pending of [...(this.running || [])]) pending.cancel(cancelled());
        for (const sleeper of [...this.sleepers]) sleeper.cancel();
        this.locks.clear();
    }

    // Stops every task on the board, then runs the device's own stop chunk
    // (for example, to switch off motor coils that a stopped task left on).
    emergencyStop () {
        this.cancelAll();
        if (!this.port || !this.ready || this.closing) return Promise.resolve();
        return this.write(shortMessage(MSG.stopAll))
            .then(() => (this.stopHandler ? this.stopHandler(this) : null))
            .catch(error => {
                this.lastError = `${this.label}: ${error.message}`;
                throw error;
            });
    }

    async disconnect () {
        try {
            await this.emergencyStop();
        } finally {
            await this.closePort();
        }
    }

    async closePort () {
        if (this.closing) return this.closing;
        this.ready = false;
        clearInterval(this.keepAliveTimer);
        this.cancelAll();
        for (const waiter of [...this.waiters]) waiter.reject(new Error(tr('The device has been disconnected.', 'El dispositivo se ha desconectado.', 'El dispositiu s’ha desconnectat.')));
        const port = this.port;
        const reader = this.reader;
        this.port = null;
        this.reader = null;
        this.closing = Promise.resolve().then(async () => {
            if (reader) await reader.cancel().catch(() => {});
            if (this.readTask) await this.readTask;
            if (port) await port.close().catch(() => {});
        });
        try {
            await this.closing;
        } finally {
            this.closing = null;
        }
    }
}
