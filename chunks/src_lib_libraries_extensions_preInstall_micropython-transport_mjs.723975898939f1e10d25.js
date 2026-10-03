"use strict";
(self["webpackChunkGUI"] = self["webpackChunkGUI"] || []).push([["src_lib_libraries_extensions_preInstall_micropython-transport_mjs"],{

/***/ "./src/lib/libraries/extensions/preInstall/micropython-transport.mjs":
/*!***************************************************************************!*\
  !*** ./src/lib/libraries/extensions/preInstall/micropython-transport.mjs ***!
  \***************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MicroPythonTransport: () => (/* binding */ MicroPythonTransport),
/* harmony export */   bindSafetyEvents: () => (/* binding */ bindSafetyEvents),
/* harmony export */   boundedMotion: () => (/* binding */ boundedMotion),
/* harmony export */   boundedNumber: () => (/* binding */ boundedNumber)
/* harmony export */ });
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
// Raw REPL: a command completes only after stdout, stderr and the prompt arrive.
// Opening a serial port is not evidence that the selected firmware is compatible.
const cancelled = () => new Error('Operación cancelada por la parada del dispositivo.');
const boundedNumber = (value, min, max) => {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error('El valor debe ser un número finito.');
  return Math.min(max, Math.max(min, number));
};
const boundedMotion = (setup, movement, stop, seconds) => {
  const duration = boundedNumber(seconds, 0, 5);
  if (duration === 0) return "".concat(setup, "\n").concat(stop);
  // The finally runs on the board, including KeyboardInterrupt and USB loss.
  return "".concat(setup, "\ntry:\n    ").concat(movement, "\n    __import__('time').sleep(").concat(duration, ")\nfinally:\n    ").concat(stop);
};
class MicroPythonTransport {
  constructor(label) {
    let {
      probe = '',
      stop = '',
      baudRate = 115200,
      timeout = 8000
    } = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
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
  isConnected() {
    return Boolean(this.ready && this.port && this.port.writable);
  }
  connect() {
    var _this = this;
    return _asyncToGenerator(function* () {
      if (_this.isConnected()) return;
      if (_this.connecting || _this.stopping || _this.closing) throw new Error('Conexión ocupada.');
      if (typeof navigator === 'undefined' || !navigator.serial) {
        throw new Error('Web Serial no está disponible. Usa Chrome o Edge en HTTPS o localhost.');
      }
      _this.connecting = true;
      const epoch = _this.epoch;
      let selected;
      try {
        selected = yield navigator.serial.requestPort();
        if (epoch !== _this.epoch) throw cancelled();
        yield selected.open({
          baudRate: _this.baudRate
        });
        _this.port = selected;
        if (epoch !== _this.epoch) throw cancelled();
        if (!selected.readable || !selected.writable) throw new Error('Puerto USB no disponible.');
        _this.reader = selected.readable.getReader();
        _this.readTask = _this.readLoop(_this.reader);
        yield _this.enterRaw();
        yield _this.execute(_this.probe || 'pass');
        if (_this.stopCode) yield _this.execute(_this.stopCode);
        if (epoch !== _this.epoch) throw cancelled();
        _this.ready = true;
        _this.lastError = '';
      } catch (error) {
        _this.lastError = "".concat(_this.label, ": ").concat(error.message);
        yield _this.closePort();
        throw new Error(_this.lastError);
      } finally {
        _this.connecting = false;
      }
    })();
  }
  readLoop(reader) {
    var _this2 = this;
    return _asyncToGenerator(function* () {
      const decoder = new TextDecoder();
      try {
        while (_this2.reader === reader) {
          const {
            value,
            done
          } = yield reader.read();
          if (done) break;
          _this2.buffer += decoder.decode(value, {
            stream: true
          });
          if (_this2.buffer.length > 65536) throw new Error('Respuesta del dispositivo demasiado larga.');
          if (_this2.waiter) _this2.waiter.check();
        }
        if (!_this2.closing) throw new Error('El dispositivo USB se ha desconectado.');
      } catch (error) {
        if (!_this2.closing) {
          _this2.ready = false;
          _this2.epoch++;
          _this2.lastError = error.message;
          _this2.rejectWait(error);
          // Do not await our own readTask while releasing the port.
          Promise.resolve().then(() => _this2.closePort()).catch(() => {});
        }
      } finally {
        reader.releaseLock();
      }
    })();
  }
  rejectWait(error) {
    if (this.waiter) this.waiter.reject(error);
  }
  waitFor(marker) {
    let timeout = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.timeout;
    return new Promise((resolve, reject) => {
      let timer; // eslint-disable-line prefer-const
      const finish = (error, result) => {
        clearTimeout(timer);
        this.waiter = null;
        if (error) reject(error);else resolve(result);
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
  write(text) {
    var _this3 = this;
    return _asyncToGenerator(function* () {
      if (!_this3.port || !_this3.port.writable) throw new Error('Conecta el dispositivo primero.');
      const writer = _this3.port.writable.getWriter();
      let timer;
      try {
        yield Promise.race([writer.write(new TextEncoder().encode(text)), new Promise((resolve, reject) => {
          timer = setTimeout(() => {
            writer.abort().catch(() => {});
            reject(new Error('La escritura USB no respondió a tiempo.'));
          }, _this3.timeout);
        })]);
      } finally {
        clearTimeout(timer);
        writer.releaseLock();
      }
    })();
  }
  enterRaw() {
    var _this4 = this;
    return _asyncToGenerator(function* () {
      _this4.buffer = '';
      // Ctrl-B leaves any previous raw session; Ctrl-A returns a fresh banner.
      yield _this4.write('\x03\x03\x02\x01');
      yield _this4.waitFor('raw REPL; CTRL-B to exit\r\n>');
    })();
  }
  execute(source) {
    var _this5 = this;
    return _asyncToGenerator(function* () {
      const epoch = _this5.epoch;
      _this5.buffer = '';
      yield _this5.write("".concat(source, "\x04"));
      if (epoch !== _this5.epoch) throw cancelled();
      const response = yield _this5.waitFor('\x04>');
      if (!response.startsWith('OK') || !response.includes('\x04')) {
        throw new Error('Respuesta raw REPL no válida.');
      }
      const separator = response.indexOf('\x04');
      const stderr = response.slice(separator + 1).trim();
      if (stderr) throw new Error("Error del firmware: ".concat(stderr));
      return response.slice(2, separator);
    })();
  }
  runPython(source) {
    var _this6 = this;
    if (!this.isConnected() || this.stopping || this.closing) {
      return Promise.reject(new Error('Conecta explícitamente el dispositivo antes de ejecutar bloques.'));
    }
    const epoch = this.epoch;
    const operation = this.queue.then(/*#__PURE__*/_asyncToGenerator(function* () {
      if (epoch !== _this6.epoch) throw cancelled();
      try {
        return yield _this6.execute(source);
      } catch (error) {
        if (epoch === _this6.epoch) {
          _this6.lastError = error.message;
          // Invalidate pending commands before attempting recovery.
          _this6.epoch++;
          _this6.ready = false;
          try {
            yield _this6.enterRaw();
            if (_this6.stopCode) yield _this6.execute(_this6.stopCode);
          } finally {
            yield _this6.closePort();
          }
        }
        throw error;
      }
    }));
    this.queue = operation.catch(() => {});
    return operation;
  }
  emergencyStop() {
    var _this7 = this;
    if (this.stopping) return this.stopping;
    this.epoch++;
    this.rejectWait(cancelled());
    if (!this.port || this.connecting || this.closing) return Promise.resolve();
    this.stopping = this.queue.then(/*#__PURE__*/_asyncToGenerator(function* () {
      try {
        yield _this7.enterRaw();
        if (_this7.stopCode) yield _this7.execute(_this7.stopCode);
      } catch (error) {
        _this7.lastError = error.message;
        yield _this7.closePort();
        throw error;
      }
    })).finally(() => {
      this.stopping = null;
    });
    this.queue = this.stopping.catch(() => {});
    return this.stopping;
  }
  disconnect() {
    var _this8 = this;
    return _asyncToGenerator(function* () {
      try {
        yield _this8.emergencyStop();
      } finally {
        yield _this8.closePort();
      }
    })();
  }
  closePort() {
    var _this9 = this;
    return _asyncToGenerator(function* () {
      if (_this9.closing) return _this9.closing;
      _this9.ready = false;
      _this9.epoch++;
      _this9.rejectWait(cancelled());
      const port = _this9.port;
      const reader = _this9.reader;
      _this9.port = null;
      _this9.reader = null;
      _this9.closing = Promise.resolve().then(/*#__PURE__*/_asyncToGenerator(function* () {
        if (reader) yield reader.cancel().catch(() => {});
        if (_this9.readTask) yield _this9.readTask;
        if (port) yield port.close().catch(() => {});
      }));
      try {
        yield _this9.closing;
      } finally {
        _this9.closing = null;
      }
    })();
  }
}
const bindSafetyEvents = (runtime, transport) => {
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

/***/ })

}]);
//# sourceMappingURL=src_lib_libraries_extensions_preInstall_micropython-transport_mjs.723975898939f1e10d25.js.map