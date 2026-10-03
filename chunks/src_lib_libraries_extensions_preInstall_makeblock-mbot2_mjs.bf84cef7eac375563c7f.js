"use strict";
(self["webpackChunkGUI"] = self["webpackChunkGUI"] || []).push([["src_lib_libraries_extensions_preInstall_makeblock-mbot2_mjs"],{

/***/ "./src/lib/libraries/extensions/preInstall/makeblock-mbot2.mjs":
/*!*********************************************************************!*\
  !*** ./src/lib/libraries/extensions/preInstall/makeblock-mbot2.mjs ***!
  \*********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   blockClass: () => (/* binding */ blockClass),
/* harmony export */   entry: () => (/* binding */ entry)
/* harmony export */ });
/* harmony import */ var _micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./micropython-transport.mjs */ "./src/lib/libraries/extensions/preInstall/micropython-transport.mjs");
/* harmony import */ var _makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./makeblock-serial.mjs */ "./src/lib/libraries/extensions/preInstall/makeblock-serial.mjs");


const EXTENSION_ID = 'makeblockMbot2';
const iconURL = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.makeSvgDataUri)({
  title: 'mBOT2',
  body: 'CYBERPI',
  kind: 'mbot2',
  color1: '#5b62d6',
  color2: '#22c55e'
});
const MBOT_SETUP = "try:\n    from cyberpi import mbot2 as _mbot\nexcept ImportError:\n    import mbot2";
const MBOT_STOP = "".concat(MBOT_SETUP, "\n_mbot.drive_power(0, 0)");
const cyberpiDriveCode = (left, right, seconds) => (0,_micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__.boundedMotion)(MBOT_SETUP, "_mbot.drive_power(".concat(left, ", ").concat(right, ")"), '_mbot.drive_power(0, 0)', seconds);
const blockClass = class MakeblockMbot2 {
  constructor(runtime) {
    this.runtime = runtime;
    this.transport = new _makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.MakeblockSerialTransport('mBot2', {
      probe: "".concat(MBOT_SETUP, "\nassert callable(_mbot.drive_power)"),
      stop: MBOT_STOP
    });
    (0,_micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__.bindSafetyEvents)(runtime, this.transport);
  }
  getInfo() {
    return {
      id: EXTENSION_ID,
      name: 'mBot2',
      color1: '#5b62d6',
      color2: '#484eb8',
      color3: '#343881',
      blocks: [{
        opcode: 'connect',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.connect', 'connect mBot2 by USB')
      }, {
        opcode: 'disconnect',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.disconnect', 'disconnect mBot2')
      }, {
        opcode: 'isConnected',
        blockType: 'Boolean',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.connected', 'mBot2 connected?')
      }, {
        opcode: 'connectionError',
        blockType: 'reporter',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('connectionError', 'last connection error')
      }, '---', {
        opcode: 'showText',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.showText', 'show text [TEXT] size [SIZE]'),
        arguments: {
          TEXT: {
            type: 'string',
            defaultValue: 'Hola'
          },
          SIZE: {
            type: 'number',
            defaultValue: 24
          }
        }
      }, {
        opcode: 'clearDisplay',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.clearDisplay', 'clear display')
      }, {
        opcode: 'setLed',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.setLed', 'CyberPi LED [COLOR]'),
        arguments: {
          COLOR: {
            type: 'color',
            defaultValue: '#00ff00'
          }
        }
      }, {
        opcode: 'playSound',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.playSound', 'play sound [SOUND]'),
        arguments: {
          SOUND: {
            type: 'string',
            menu: 'sounds',
            defaultValue: 'hello'
          }
        }
      }, '---', {
        opcode: 'drivePower',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.drivePower', 'motors left [LEFT] right [RIGHT] for [SECONDS] s'),
        arguments: {
          LEFT: {
            type: 'number',
            defaultValue: 50
          },
          RIGHT: {
            type: 'number',
            defaultValue: 50
          },
          SECONDS: {
            type: 'number',
            defaultValue: 1
          }
        }
      }, {
        opcode: 'stop',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.stop', 'stop mBot2')
      }],
      menus: {
        sounds: {
          acceptReporters: true,
          items: [{
            text: 'hello',
            value: 'hello'
          }, {
            text: 'hi',
            value: 'hi'
          }, {
            text: 'yeah',
            value: 'yeah'
          }, {
            text: 'switch',
            value: 'switch'
          }]
        }
      }
    };
  }
  connect() {
    return this.transport.connect();
  }
  disconnect() {
    return this.transport.disconnect();
  }
  isConnected() {
    return this.transport.isConnected();
  }
  connectionError() {
    return this.transport.lastError;
  }
  runPython() {
    throw new Error('La ejecución libre de Python está desactivada para este dispositivo.');
  }
  showText(args) {
    const size = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.SIZE, 12, 36);
    return this.transport.runPython("import cyberpi\ncyberpi.display.show_label(".concat((0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.toPythonString)(args.TEXT), ", ").concat(size, ", 0, 0)"));
  }
  clearDisplay() {
    return this.transport.runPython('import cyberpi\ncyberpi.display.clear()');
  }
  setLed(args) {
    const {
      r,
      g,
      b
    } = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.colorToRgb)(args.COLOR);
    return this.transport.runPython("import cyberpi\ntry:\n    cyberpi.led.on(".concat(r, ", ").concat(g, ", ").concat(b, ")\nexcept Exception:\n    cyberpi.led.show('").concat(r, " ").concat(g, " ").concat(b, " ").concat(r, " ").concat(g, " ").concat(b, " ").concat(r, " ").concat(g, " ").concat(b, " ").concat(r, " ").concat(g, " ").concat(b, " ").concat(r, " ").concat(g, " ").concat(b, "')"));
  }
  playSound(args) {
    return this.transport.runPython("import cyberpi\ncyberpi.audio.play(".concat((0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.toPythonString)(args.SOUND), ")"));
  }
  drivePower(args) {
    const left = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.LEFT, -100, 100);
    const right = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.RIGHT, -100, 100);
    const seconds = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.SECONDS, 0, 5);
    return this.transport.runPython(cyberpiDriveCode(left, right, seconds));
  }
  stop() {
    return this.transport.emergencyStop();
  }
};
blockClass.EXTENSION_ID = EXTENSION_ID;
const entry = {
  name: 'mBot2',
  extensionId: EXTENSION_ID,
  collaborator: 'Makeblock / Unifiscratch',
  iconURL,
  insetIconURL: iconURL,
  description: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('mbot2.description', 'Basic USB control using CyberPi/MicroPython.'),
  tags: ['device', 'hardware'],
  featured: true,
  disabled: false,
  category: 'robots',
  helpLink: 'https://geekdaxue.co/read/makeblock-help-center-en%40mcode/cyberpi-api-shields'
};


/***/ }),

/***/ "./src/lib/libraries/extensions/preInstall/makeblock-serial.mjs":
/*!**********************************************************************!*\
  !*** ./src/lib/libraries/extensions/preInstall/makeblock-serial.mjs ***!
  \**********************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   MakeblockSerialTransport: () => (/* reexport safe */ _micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__.MicroPythonTransport),
/* harmony export */   clamp: () => (/* binding */ clamp),
/* harmony export */   colorToRgb: () => (/* binding */ colorToRgb),
/* harmony export */   makeSvgDataUri: () => (/* binding */ makeSvgDataUri),
/* harmony export */   msg: () => (/* binding */ msg),
/* harmony export */   toPythonString: () => (/* binding */ toPythonString)
/* harmony export */ });
/* harmony import */ var _micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./micropython-transport.mjs */ "./src/lib/libraries/extensions/preInstall/micropython-transport.mjs");

const clamp = _micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__.boundedNumber;
const toPythonString = value => JSON.stringify(String(value));
const msg = (id, defaultText) => ({
  id: "unifiscratch.extensions.".concat(id),
  default: defaultText,
  defaultMessage: defaultText,
  description: "Unifiscratch hardware extension text: ".concat(id)
});
const colorToRgb = color => {
  const hex = String(color || '#000000').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      r: 0,
      g: 0,
      b: 0
    };
  }
  return {
    r: parseInt(hex.slice(0, 2), 16),
    g: parseInt(hex.slice(2, 4), 16),
    b: parseInt(hex.slice(4, 6), 16)
  };
};
const makeSvgDataUri = _ref => {
  let {
    title,
    body,
    color1,
    color2,
    kind = 'face'
  } = _ref;
  const art = kind === 'mbot2' ? "\n<ellipse cx=\"160\" cy=\"158\" rx=\"94\" ry=\"24\" fill=\"#26304a\" opacity=\".25\"/>\n<rect x=\"85\" y=\"88\" width=\"150\" height=\"70\" rx=\"24\" fill=\"#eef2ff\" stroke=\"#2d328f\" stroke-width=\"8\"/>\n<rect x=\"118\" y=\"59\" width=\"84\" height=\"48\" rx=\"16\" fill=\"#ffffff\" stroke=\"".concat(color2, "\" stroke-width=\"7\"/>\n<circle cx=\"116\" cy=\"155\" r=\"27\" fill=\"#1f2937\"/><circle cx=\"204\" cy=\"155\" r=\"27\" fill=\"#1f2937\"/>\n<circle cx=\"116\" cy=\"155\" r=\"12\" fill=\"").concat(color2, "\"/><circle cx=\"204\" cy=\"155\" r=\"12\" fill=\"").concat(color2, "\"/>\n<circle cx=\"145\" cy=\"83\" r=\"6\" fill=\"").concat(color1, "\"/><circle cx=\"175\" cy=\"83\" r=\"6\" fill=\"").concat(color1, "\"/>\n<path d=\"M132 118h56\" stroke=\"").concat(color1, "\" stroke-width=\"8\" stroke-linecap=\"round\"/>") : kind === 'codey' ? "\n<ellipse cx=\"162\" cy=\"162\" rx=\"88\" ry=\"22\" fill=\"#26304a\" opacity=\".22\"/>\n<rect x=\"72\" y=\"70\" width=\"122\" height=\"92\" rx=\"30\" fill=\"#eefcff\" stroke=\"#097b96\" stroke-width=\"8\"/>\n<rect x=\"190\" y=\"106\" width=\"58\" height=\"54\" rx=\"19\" fill=\"#ffffff\" stroke=\"#097b96\" stroke-width=\"8\"/>\n<circle cx=\"110\" cy=\"108\" r=\"9\" fill=\"".concat(color1, "\"/><circle cx=\"154\" cy=\"108\" r=\"9\" fill=\"").concat(color1, "\"/>\n<path d=\"M113 136c16 12 38 12 54 0\" fill=\"none\" stroke=\"").concat(color1, "\" stroke-width=\"8\" stroke-linecap=\"round\"/>\n<circle cx=\"205\" cy=\"165\" r=\"18\" fill=\"#1f2937\"/><circle cx=\"235\" cy=\"165\" r=\"18\" fill=\"#1f2937\"/>\n<path d=\"M224 80l21-18\" stroke=\"").concat(color2, "\" stroke-width=\"7\" stroke-linecap=\"round\"/>") : "\n<rect x=\"48\" y=\"72\" width=\"160\" height=\"96\" rx=\"28\" fill=\"#fff\"/>\n<circle cx=\"93\" cy=\"116\" r=\"11\" fill=\"".concat(color1, "\"/>\n<circle cx=\"163\" cy=\"116\" r=\"11\" fill=\"").concat(color1, "\"/>\n<path d=\"M99 144c19 16 45 16 64 0\" fill=\"none\" stroke=\"").concat(color1, "\" stroke-width=\"10\" stroke-linecap=\"round\"/>");
  const svg = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"320\" height=\"240\" viewBox=\"0 0 320 240\">\n<rect width=\"320\" height=\"240\" rx=\"24\" fill=\"".concat(color1, "\"/>\n<circle cx=\"245\" cy=\"63\" r=\"42\" fill=\"").concat(color2, "\" opacity=\".92\"/>\n").concat(art, "\n<text x=\"160\" y=\"204\" text-anchor=\"middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"31\"\n font-weight=\"700\" fill=\"#fff\">").concat(title, "</text>\n<text x=\"160\" y=\"229\" text-anchor=\"middle\" font-family=\"Arial, Helvetica, sans-serif\" font-size=\"17\"\n font-weight=\"700\" fill=\"#fff\" opacity=\".9\">").concat(body, "</text>\n</svg>");
  return "data:image/svg+xml;utf8,".concat(encodeURIComponent(svg));
};


/***/ })

}]);
//# sourceMappingURL=src_lib_libraries_extensions_preInstall_makeblock-mbot2_mjs.bf84cef7eac375563c7f.js.map