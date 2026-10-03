// Raw REPL: a command completes only after stdout, stderr and the prompt arrive.
// Opening a serial port is not evidence that the selected firmware is compatible.
const cancelled = () => new Error('Operación cancelada por la parada del dispositivo.');

export const boundedNumber = (value, min, max) => {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error('El valor debe ser un número finito.');
    return Math.min(max, Math.max(min, number));
};

export const boundedMotion = (setup, movement, stop, seconds) => {
    const duration = boundedNumber(seconds, 0, 5);
    if (duration === 0) return `${setup}\n${stop}`;
    // The finally runs on the board, including KeyboardInterrupt and USB loss.
    return `${setup}\ntry:\n    ${movement}\n    __import__('time').sleep(${duration})\nfinally:\n    ${stop}`;
};

export class MicroPythonTransport {
    constructor (label, {probe = '', stop = '', baudRate = 115200, timeout = 8000} = {}) {
        this.label = label;
        this.probe = probe;
        this.stopCode = stop;
        this.baudRate = baudRate;
        this.timeout = timeout;
        this.port = null;
        this.ready = false;
        this.epoch = 0;
        this.queue = Promise.resolve();
        this.buffer = '';
        this.waiter = null;
        this.lastError = '';
    }

    isConnected () {
        return Boolean(this.ready && this.port && this.port.writable);
    }

    async connect () {
        if (this.isConnected()) return;
        if (this.connecting || this.stopping || this.closing) throw new Error('Conexión ocupada.');
        if (typeof navigator === 'undefined' || !navigator.serial) {
            throw new Error('Web Serial no está disponible. Usa Chrome o Edge en HTTPS o localhost.');
        }
        this.connecting = true;
        const epoch = this.epoch;
        let selected;
        try {
            selected = await navigator.serial.requestPort();
            if (epoch !== this.epoch) throw cancelled();
            await selected.open({baudRate: this.baudRate});
            this.port = selected;
            if (epoch !== this.epoch) throw cancelled();
            if (!selected.readable || !selected.writable) throw new Error('Puerto USB no disponible.');
            this.reader = selected.readable.getReader();
            this.readTask = this.readLoop(this.reader);
            await this.enterRaw();
            await this.execute(this.probe || 'pass');
            if (this.stopCode) await this.execute(this.stopCode);
            if (epoch !== this.epoch) throw cancelled();
            this.ready = true;
            this.lastError = '';
        } catch (error) {
            this.lastError = `${this.label}: ${error.message}`;
            await this.closePort();
            throw new Error(this.lastError);
        } finally {
            this.connecting = false;
        }
    }

    async readLoop (reader) {
        const decoder = new TextDecoder();
        try {
            while (this.reader === reader) {
                const {value, done} = await reader.read();
                if (done) break;
                this.buffer += decoder.decode(value, {stream: true});
                if (this.buffer.length > 65536) throw new Error('Respuesta del dispositivo demasiado larga.');
                if (this.waiter) this.waiter.check();
            }
            if (!this.closing) throw new Error('El dispositivo USB se ha desconectado.');
        } catch (error) {
            if (!this.closing) {
                this.ready = false;
                this.epoch++;
                this.lastError = error.message;
                this.rejectWait(error);
                // Do not await our own readTask while releasing the port.
                Promise.resolve().then(() => this.closePort())
                    .catch(() => {});
            }
        } finally {
            reader.releaseLock();
        }
    }

    rejectWait (error) {
        if (this.waiter) this.waiter.reject(error);
    }

    waitFor (marker, timeout = this.timeout) {
        return new Promise((resolve, reject) => {
            let timer; // eslint-disable-line prefer-const
            const finish = (error, result) => {
                clearTimeout(timer);
                this.waiter = null;
                if (error) reject(error);
                else resolve(result);
            };
            timer = setTimeout(() => finish(new Error('El firmware no respondió a tiempo.')), timeout);
            this.waiter = {
                reject: error => finish(error),
                check: () => {
                    const index = this.buffer.indexOf(marker);
                    if (index < 0) return;
                    const result = this.buffer.slice(0, index);
                    this.buffer = this.buffer.slice(index + marker.length);
                    finish(null, result);
                }
            };
            this.waiter.check();
        });
    }

    async write (text) {
        if (!this.port || !this.port.writable) throw new Error('Conecta el dispositivo primero.');
        const writer = this.port.writable.getWriter();
        let timer;
        try {
            await Promise.race([
                writer.write(new TextEncoder().encode(text)),
                new Promise((resolve, reject) => {
                    timer = setTimeout(() => {
                        writer.abort().catch(() => {});
                        reject(new Error('La escritura USB no respondió a tiempo.'));
                    }, this.timeout);
                })
            ]);
        } finally {
            clearTimeout(timer);
            writer.releaseLock();
        }
    }

    async enterRaw () {
        this.buffer = '';
        // Ctrl-B leaves any previous raw session; Ctrl-A returns a fresh banner.
        await this.write('\x03\x03\x02\x01');
        await this.waitFor('raw REPL; CTRL-B to exit\r\n>');
    }

    async execute (source) {
        const epoch = this.epoch;
        this.buffer = '';
        await this.write(`${source}\x04`);
        if (epoch !== this.epoch) throw cancelled();
        const response = await this.waitFor('\x04>');
        if (!response.startsWith('OK') || !response.includes('\x04')) {
            throw new Error('Respuesta raw REPL no válida.');
        }
        const separator = response.indexOf('\x04');
        const stderr = response.slice(separator + 1).trim();
        if (stderr) throw new Error(`Error del firmware: ${stderr}`);
        return response.slice(2, separator);
    }

    runPython (source) {
        if (!this.isConnected() || this.stopping || this.closing) {
            return Promise.reject(new Error('Conecta explícitamente el dispositivo antes de ejecutar bloques.'));
        }
        const epoch = this.epoch;
        const operation = this.queue.then(async () => {
            if (epoch !== this.epoch) throw cancelled();
            try {
                return await this.execute(source);
            } catch (error) {
                if (epoch === this.epoch) {
                    this.lastError = error.message;
                    // Invalidate pending commands before attempting recovery.
                    this.epoch++;
                    this.ready = false;
                    try {
                        await this.enterRaw();
                        if (this.stopCode) await this.execute(this.stopCode);
                    } finally {
                        await this.closePort();
                    }
                }
                throw error;
            }
        });
        this.queue = operation.catch(() => {});
        return operation;
    }

    emergencyStop () {
        if (this.stopping) return this.stopping;
        this.epoch++;
        this.rejectWait(cancelled());
        if (!this.port || this.connecting || this.closing) return Promise.resolve();
        this.stopping = this.queue.then(async () => {
            try {
                await this.enterRaw();
                if (this.stopCode) await this.execute(this.stopCode);
            } catch (error) {
                this.lastError = error.message;
                await this.closePort();
                throw error;
            }
        }).finally(() => {
            this.stopping = null;
        });
        this.queue = this.stopping.catch(() => {});
        return this.stopping;
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
        this.epoch++;
        this.rejectWait(cancelled());
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

export const bindSafetyEvents = (runtime, transport) => {
    const stop = () => transport.emergencyStop().catch(error => {
        transport.lastError = error.message;
    });
    const hidden = () => {
        if (document.hidden) stop();
    };
    const dispose = () => {
        // Scratch emits this when replacing a project, but keeps extension
        // instances alive. Retain the stop handler for the next connection.
        transport.disconnect().catch(error => {
            transport.lastError = error.message;
        });
    };
    if (runtime) {
        runtime.on('PROJECT_STOP_ALL', stop);
        runtime.on('RUNTIME_DISPOSED', dispose);
    }
    if (typeof window !== 'undefined') window.addEventListener('pagehide', stop);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', hidden);
};
