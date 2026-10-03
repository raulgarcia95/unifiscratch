"use strict";
(self["webpackChunkGUI"] = self["webpackChunkGUI"] || []).push([["src_lib_libraries_extensions_preInstall_makeblock-codey-rocky_mjs"],{

/***/ "./src/lib/libraries/extensions/preInstall/makeblock-codey-rocky.mjs":
/*!***************************************************************************!*\
  !*** ./src/lib/libraries/extensions/preInstall/makeblock-codey-rocky.mjs ***!
  \***************************************************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   blockClass: () => (/* binding */ blockClass),
/* harmony export */   entry: () => (/* binding */ entry)
/* harmony export */ });
/* harmony import */ var _micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./micropython-transport.mjs */ "./src/lib/libraries/extensions/preInstall/micropython-transport.mjs");
/* harmony import */ var _makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./makeblock-serial.mjs */ "./src/lib/libraries/extensions/preInstall/makeblock-serial.mjs");


const EXTENSION_ID = 'makeblockCodeyRocky';
const iconURL = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.makeSvgDataUri)({
  title: 'CODEY',
  body: 'ROCKY',
  kind: 'codey',
  color1: '#12a3c7',
  color2: '#f2c94c'
});
const blockClass = class MakeblockCodeyRocky {
  constructor(runtime) {
    this.runtime = runtime;
    this.transport = new _makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.MakeblockSerialTransport('Codey Rocky', {
      probe: 'import codey\nimport rocky\nassert callable(rocky.drive) and callable(rocky.stop)',
      stop: 'import rocky\nrocky.stop()'
    });
    (0,_micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__.bindSafetyEvents)(runtime, this.transport);
  }
  getInfo() {
    return {
      id: EXTENSION_ID,
      name: 'Codey Rocky',
      color1: '#12a3c7',
      color2: '#0b86a4',
      color3: '#086177',
      blocks: [{
        opcode: 'connect',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.connect', 'connect Codey Rocky by USB')
      }, {
        opcode: 'disconnect',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.disconnect', 'disconnect Codey Rocky')
      }, {
        opcode: 'isConnected',
        blockType: 'Boolean',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.connected', 'Codey Rocky connected?')
      }, {
        opcode: 'connectionError',
        blockType: 'reporter',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('connectionError', 'last connection error')
      }, '---', {
        opcode: 'showText',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.showText', 'show text [TEXT]'),
        arguments: {
          TEXT: {
            type: 'string',
            defaultValue: 'Hola'
          }
        }
      }, {
        opcode: 'clearDisplay',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.clearDisplay', 'clear display')
      }, {
        opcode: 'setLed',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.setLed', 'RGB LED [COLOR]'),
        arguments: {
          COLOR: {
            type: 'color',
            defaultValue: '#ff0000'
          }
        }
      }, {
        opcode: 'playNote',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.playNote', 'play note [NOTE] for [BEATS] beats'),
        arguments: {
          NOTE: {
            type: 'note',
            defaultValue: 60
          },
          BEATS: {
            type: 'number',
            defaultValue: 1
          }
        }
      }, '---', {
        opcode: 'move',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.move', 'move [DIRECTION] power [POWER] for [SECONDS] s'),
        arguments: {
          DIRECTION: {
            type: 'string',
            menu: 'directions',
            defaultValue: 'forward'
          },
          POWER: {
            type: 'number',
            defaultValue: 50
          },
          SECONDS: {
            type: 'number',
            defaultValue: 1
          }
        }
      }, {
        opcode: 'drive',
        blockType: 'command',
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.drive', 'left wheel [LEFT] right [RIGHT] for [SECONDS] s'),
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
        text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.stop', 'stop Rocky')
      }],
      menus: {
        directions: {
          acceptReporters: true,
          items: [{
            text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.forward', 'forward'),
            value: 'forward'
          }, {
            text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.backward', 'backward'),
            value: 'backward'
          }, {
            text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.left', 'left'),
            value: 'left'
          }, {
            text: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.right', 'right'),
            value: 'right'
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
    return this.transport.runPython("import codey\ncodey.display.show(".concat((0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.toPythonString)(args.TEXT), ")"));
  }
  clearDisplay() {
    return this.transport.runPython('import codey\ncodey.display.clear()');
  }
  setLed(args) {
    const {
      r,
      g,
      b
    } = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.colorToRgb)(args.COLOR);
    return this.transport.runPython("import codey\ncodey.led.show(".concat(r, ", ").concat(g, ", ").concat(b, ")"));
  }
  playNote(args) {
    const note = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.NOTE, 48, 72);
    const beats = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.BEATS, 0, 16);
    return this.transport.runPython("import codey\ncodey.speaker.play_note(".concat(note, ", ").concat(beats, ")"));
  }
  move(args) {
    const methods = {
      forward: 'forward',
      backward: 'backward',
      left: 'turn_left',
      right: 'turn_right'
    };
    const method = Object.prototype.hasOwnProperty.call(methods, args.DIRECTION) && methods[args.DIRECTION];
    if (!method) throw new Error('Dirección no válida.');
    const power = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.POWER, -100, 100);
    const seconds = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.SECONDS, 0, 5);
    return this.transport.runPython((0,_micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__.boundedMotion)('import rocky', "rocky.".concat(method, "(").concat(power, ")"), 'rocky.stop()', seconds));
  }
  drive(args) {
    const left = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.LEFT, -100, 100);
    const right = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.RIGHT, -100, 100);
    const seconds = (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.clamp)(args.SECONDS, 0, 5);
    return this.transport.runPython((0,_micropython_transport_mjs__WEBPACK_IMPORTED_MODULE_0__.boundedMotion)('import rocky', "rocky.drive(".concat(left, ", ").concat(right, ")"), 'rocky.stop()', seconds));
  }
  stop() {
    return this.transport.emergencyStop();
  }
};
blockClass.EXTENSION_ID = EXTENSION_ID;
const entry = {
  name: 'Codey Rocky',
  extensionId: EXTENSION_ID,
  collaborator: 'Makeblock / Unifiscratch',
  iconURL,
  insetIconURL: iconURL,
  description: (0,_makeblock_serial_mjs__WEBPACK_IMPORTED_MODULE_1__.msg)('codey.description', 'Basic USB control using MicroPython.'),
  tags: ['device', 'hardware'],
  featured: true,
  disabled: false,
  category: 'robots',
  helpLink: 'https://makeblock-micropython-api.readthedocs.io/en/latest/codey%26rocky/'
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
//# sourceMappingURL=src_lib_libraries_extensions_preInstall_makeblock-codey-rocky_mjs.297517fdf8b3b108eff7.js.map