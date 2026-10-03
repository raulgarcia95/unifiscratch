(self["webpackChunkGUI"] = self["webpackChunkGUI"] || []).push([["src_lib_libraries_extensions_stretch_index_js"],{

/***/ "./src/lib/libraries/extensions/stretch/index.js":
/*!*******************************************************!*\
  !*** ./src/lib/libraries/extensions/stretch/index.js ***!
  \*******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   entries: () => (/* binding */ entries)
/* harmony export */ });
/* harmony import */ var _vendor_tm2scratch__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./vendor/tm2scratch */ "./src/lib/libraries/extensions/stretch/vendor/tm2scratch.js");
/* harmony import */ var _vendor_tm2scratch__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_vendor_tm2scratch__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _vendor_tmpose2scratch__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./vendor/tmpose2scratch */ "./src/lib/libraries/extensions/stretch/vendor/tmpose2scratch.js");
/* harmony import */ var _vendor_tmpose2scratch__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_vendor_tmpose2scratch__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _vendor_ic2scratch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./vendor/ic2scratch */ "./src/lib/libraries/extensions/stretch/vendor/ic2scratch.js");
/* harmony import */ var _vendor_ic2scratch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_vendor_ic2scratch__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _vendor_handpose2scratch__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./vendor/handpose2scratch */ "./src/lib/libraries/extensions/stretch/vendor/handpose2scratch.js");
/* harmony import */ var _vendor_handpose2scratch__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_vendor_handpose2scratch__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _vendor_facemesh2scratch__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./vendor/facemesh2scratch */ "./src/lib/libraries/extensions/stretch/vendor/facemesh2scratch.js");
/* harmony import */ var _vendor_facemesh2scratch__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_vendor_facemesh2scratch__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _preInstall_unifiscratch_extra_hardware_mjs__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../preInstall/unifiscratch-extra-hardware.mjs */ "./src/lib/libraries/extensions/preInstall/unifiscratch-extra-hardware.mjs");
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == typeof i ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != typeof t || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != typeof i) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }






const originals = {
  tm2scratch: (_vendor_tm2scratch__WEBPACK_IMPORTED_MODULE_0___default()),
  tmpose2scratch: (_vendor_tmpose2scratch__WEBPACK_IMPORTED_MODULE_1___default()),
  ic2scratch: (_vendor_ic2scratch__WEBPACK_IMPORTED_MODULE_2___default()),
  handpose2scratch: (_vendor_handpose2scratch__WEBPACK_IMPORTED_MODULE_3___default()),
  facemesh2scratch: (_vendor_facemesh2scratch__WEBPACK_IMPORTED_MODULE_4___default())
};
const entries = Object.entries(originals).map(_ref => {
  let [id, Original] = _ref;
  class Extension extends Original {
    getInfo() {
      const info = super.getInfo();
      return _objectSpread(_objectSpread({}, info), {}, {
        blocks: [...info.blocks, {
          opcode: 'unifiStatus',
          blockType: 'reporter',
          text: 'estado de extensión',
          disableMonitor: true
        }]
      });
    }
    unifiStatus() {
      return this.lastError || '';
    }
    constructor(runtime) {
      var _this;
      super(runtime);
      _this = this;
      const dispose = () => {
        this.disposed = true;
        clearInterval(this.timer);
        clearInterval(this.poseTimer);
        if (this.soundClassifier && this.soundClassifier.stop) this.soundClassifier.stop();
        [this.handpose, this.facemesh].forEach(model => {
          if (model && model.removeAllListeners) model.removeAllListeners('predict');
        });
        this.landmarks = [];
        this.faces = [];
        this.results = [];
        this.imageProbableLabels = [];
        this.poseProbableLabels = [];
      };
      runtime.on('RUNTIME_DISPOSED', dispose);
      this.getInfo().blocks.filter(block => block.blockType === 'command' && block.opcode).forEach(block => {
        const original = this[block.opcode];
        if (typeof original !== 'function') return;
        this[block.opcode] = function () {
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          return _this.dependenciesReady.then(() => {
            _this.disposed = false;
            return original.apply(_this, args);
          });
        };
      });
    }
  }
  Extension.EXTENSION_ID = id;
  const metadata = _preInstall_unifiscratch_extra_hardware_mjs__WEBPACK_IMPORTED_MODULE_5__.entries.find(item => item.entry.extensionId === id).entry;
  return {
    entry: _objectSpread(_objectSpread({}, metadata), {}, {
      disabled: false,
      collaborator: 'champierre / adaptación Unifiscratch',
      description: 'Extensión original de Stretch3 adaptada a Unifiscratch. ' + 'Requiere cámara e Internet para modelos.',
      helpLink: "https://github.com/champierre/".concat(id)
    }),
    blockClass: Extension
  };
});

/***/ }),

/***/ "./src/lib/libraries/extensions/stretch/runtime.js":
/*!*********************************************************!*\
  !*** ./src/lib/libraries/extensions/stretch/runtime.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   librariesReady: () => (/* binding */ librariesReady),
/* harmony export */   ml5: () => (/* binding */ ml5),
/* harmony export */   tmPose: () => (/* binding */ tmPose)
/* harmony export */ });
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
let ready;
let ml5Library;
let poseLibrary;
const loadScript = file => new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.src = new URL("static/extensions/stretch/".concat(file), document.baseURI).href;
  const timer = setTimeout(() => {
    script.remove();
    reject(new Error("Tiempo de espera al cargar ".concat(file)));
  }, 30000);
  script.onload = () => {
    clearTimeout(timer);
    resolve();
  };
  script.onerror = () => {
    clearTimeout(timer);
    script.remove();
    reject(new Error("No se pudo cargar ".concat(file)));
  };
  document.head.appendChild(script);
});
const librariesReady = () => {
  if (!ready) {
    ready = _asyncToGenerator(function* () {
      yield loadScript('ml5.min.js');
      ml5Library = window.ml5;
      const previousTf = window.tf;
      try {
        yield loadScript('tf.min.js');
        yield loadScript('pose.min.js');
        poseLibrary = window.tmPose;
      } finally {
        window.tf = previousTf;
      }
      if (!ml5Library || !poseLibrary) throw new Error('Bibliotecas de IA incompletas.');
    })();
  }
  return ready;
};

// The original extensions expect these names. Keep the captured library objects
// even if another extension subsequently loads a different global version.
const ml5 = new Proxy({}, {
  get: (target, key) => {
    if (!ml5Library) throw new Error('ML5 todavía no está listo.');
    const value = ml5Library[key];
    return typeof value === 'function' ? value.bind(ml5Library) : value;
  }
});
const tmPose = new Proxy({}, {
  get: (target, key) => {
    if (!poseLibrary) throw new Error('Teachable Machine Pose todavía no está listo.');
    const value = poseLibrary[key];
    return typeof value === 'function' ? value.bind(poseLibrary) : value;
  }
});

/***/ }),

/***/ "./src/lib/libraries/extensions/stretch/vendor/facemesh2scratch.js":
/*!*************************************************************************!*\
  !*** ./src/lib/libraries/extensions/stretch/vendor/facemesh2scratch.js ***!
  \*************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
  ml5,
  tmPose,
  librariesReady
} = __webpack_require__(/*! ../runtime */ "./src/lib/libraries/extensions/stretch/runtime.js");
/* Adapted for Unifiscratch; provenance and original hash: ../upstream.json. */
const ArgumentType = __webpack_require__(/*! unifiscratch-vm/extension-support/argument-type */ "./node_modules/scratch-vm/src/extension-support/argument-type.js");
const BlockType = __webpack_require__(/*! unifiscratch-vm/extension-support/block-type */ "./node_modules/scratch-vm/src/extension-support/block-type.js");
const Cast = __webpack_require__(/*! unifiscratch-vm/util/cast */ "./node_modules/scratch-vm/src/util/cast.js");
const formatMessage = __webpack_require__(/*! format-message */ "./node_modules/format-message/index.js");
const blockIconURI = 'data:image/png;base64,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';
const Message = {
  getX: {
    'ja': '[PERSON_NUMBER] 人目の [KEYPOINT] 番目の部位のx座標',
    'ja-Hira': '[PERSON_NUMBER] にんめの [KEYPOINT] ばんめのぶいのxざひょう',
    'en': 'x of person no: [PERSON_NUMBER] , keypoint no: [KEYPOINT]'
  },
  getY: {
    'ja': '[PERSON_NUMBER] 人目の [KEYPOINT] 番目の部位のy座標',
    'ja-Hira': '[PERSON_NUMBER] にんめの [KEYPOINT] ばんめのぶいのyざひょう',
    'en': 'y of person no: [PERSON_NUMBER] , keypoint no: [KEYPOINT]'
  },
  peopleCount: {
    'ja': '人数',
    'ja-Hira': 'にんずう',
    'en': 'people count'
  },
  videoToggle: {
    'ja': 'ビデオを [VIDEO_STATE] にする',
    'ja-Hira': 'ビデオを [VIDEO_STATE] にする',
    'en': 'turn video [VIDEO_STATE]'
  },
  setRatio: {
    'ja': '倍率を [RATIO] にする',
    'ja-Hira': 'ばいりつを [RATIO] にする',
    'en': 'set ratio to [RATIO]'
  },
  setInterval: {
    'ja': '認識を [INTERVAL] 秒ごとに行う',
    'ja-Hira': 'にんしきを [INTERVAL] びょうごとにおこなう',
    'en': 'Label once every [INTERVAL] seconds'
  },
  on: {
    'ja': '入',
    'ja-Hira': 'いり',
    'en': 'on'
  },
  off: {
    'ja': '切',
    'ja-Hira': 'きり',
    'en': 'off'
  },
  video_on_flipped: {
    'ja': '左右反転',
    'ja-Hira': 'さゆうはんてん',
    'en': 'on flipped'
  },
  please_wait: {
    'ja': '準備に時間がかかります。少しの間、操作ができなくなりますがお待ち下さい。',
    'ja-Hira': 'じゅんびにじかんがかかります。すこしのあいだ、そうさができなくなりますがおまちください。',
    'en': 'Setup takes a while. The browser will get stuck, but please wait.'
  }
};
const AvailableLocales = ['en', 'ja', 'ja-Hira'];
class Scratch3Facemesh2ScratchBlocks {
  get PERSON_NUMBER_MENU() {
    let person_number_menu = [];
    for (let i = 1; i <= 10; i++) {
      person_number_menu.push({
        text: String(i),
        value: String(i)
      });
    }
    return person_number_menu;
  }
  get KEYPOINT_MENU() {
    let keypoint_menu = [];
    for (let i = 1; i <= 468; i++) {
      keypoint_menu.push({
        text: String(i),
        value: String(i)
      });
    }
    return keypoint_menu;
  }
  get VIDEO_MENU() {
    return [{
      text: Message.off[this._locale],
      value: 'off'
    }, {
      text: Message.on[this._locale],
      value: 'on'
    }, {
      text: Message.video_on_flipped[this._locale],
      value: 'on-flipped'
    }];
  }
  get INTERVAL_MENU() {
    return [{
      text: '0.1',
      value: '0.1'
    }, {
      text: '0.2',
      value: '0.2'
    }, {
      text: '0.5',
      value: '0.5'
    }, {
      text: '1.0',
      value: '1.0'
    }];
  }
  get RATIO_MENU() {
    return [{
      text: '0.5',
      value: '0.5'
    }, {
      text: '0.75',
      value: '0.75'
    }, {
      text: '1',
      value: '1'
    }, {
      text: '1.5',
      value: '1.5'
    }, {
      text: '2.0',
      value: '2.0'
    }];
  }
  constructor(runtime) {
    this.runtime = runtime;
    this.dependenciesReady = librariesReady();
    this.dependenciesReady.catch(error => {
      this.lastError = error.message;
    });
    this.faces = [];
    this.ratio = 0.75;
    this.detectFace = () => {
      // We should reuse the video element created by videoProvider instead of creating a new video element
      // This is because iOS or iPad does not allow camera attached to two video elements
      this.video = this.runtime.ioDevices.video.provider.video;
      if (!this.video) {
        this.lastError = "Camera unavailable";
        return;
      }
      if (this.disposed) return;
      this.facemesh = ml5.facemesh(this.video, function () {
        console.log("Model loaded!");
      });
      this.facemesh.on('predict', faces => {
        if (this.disposed) return;
        if (faces.length < this.faces.length) {
          this.faces.splice(faces.length);
        }
        faces.forEach((face, index) => {
          this.faces[index] = {
            keypoints: face.scaledMesh
          };
        });
      });
    };
    this.dependenciesReady.then(() => this.disposed ? undefined : this.runtime.ioDevices.video.enableVideo()).then(this.detectFace).catch(error => {
      this.lastError = error.message;
    });
  }
  getInfo() {
    this._locale = this.setLocale();
    return {
      id: 'facemesh2scratch',
      name: 'Facemesh2Scratch',
      blockIconURI: blockIconURI,
      blocks: [{
        opcode: 'getX',
        blockType: BlockType.REPORTER,
        text: Message.getX[this._locale],
        arguments: {
          PERSON_NUMBER: {
            type: ArgumentType.STRING,
            menu: 'personNumberMenu',
            defaultValue: '1'
          },
          KEYPOINT: {
            type: ArgumentType.STRING,
            menu: 'keypointMenu',
            defaultValue: '1'
          }
        }
      }, {
        opcode: 'getY',
        blockType: BlockType.REPORTER,
        text: Message.getY[this._locale],
        arguments: {
          PERSON_NUMBER: {
            type: ArgumentType.STRING,
            menu: 'personNumberMenu',
            defaultValue: '1'
          },
          KEYPOINT: {
            type: ArgumentType.STRING,
            menu: 'keypointMenu',
            defaultValue: '1'
          }
        }
      }, {
        opcode: 'getPeopleCount',
        blockType: BlockType.REPORTER,
        text: Message.peopleCount[this._locale]
      }, {
        opcode: 'videoToggle',
        blockType: BlockType.COMMAND,
        text: Message.videoToggle[this._locale],
        arguments: {
          VIDEO_STATE: {
            type: ArgumentType.STRING,
            menu: 'videoMenu',
            defaultValue: 'off'
          }
        }
      }, {
        opcode: 'setVideoTransparency',
        text: formatMessage({
          id: 'videoSensing.setVideoTransparency',
          default: 'set video transparency to [TRANSPARENCY]',
          description: 'Controls transparency of the video preview layer'
        }),
        arguments: {
          TRANSPARENCY: {
            type: ArgumentType.NUMBER,
            defaultValue: 50
          }
        }
      }, {
        opcode: 'setRatio',
        blockType: BlockType.COMMAND,
        text: Message.setRatio[this._locale],
        arguments: {
          RATIO: {
            type: ArgumentType.STRING,
            menu: 'ratioMenu',
            defaultValue: '0.75'
          }
        }
      }],
      menus: {
        personNumberMenu: {
          acceptReporters: true,
          items: this.PERSON_NUMBER_MENU
        },
        keypointMenu: {
          acceptReporters: true,
          items: this.KEYPOINT_MENU
        },
        videoMenu: {
          acceptReporters: true,
          items: this.VIDEO_MENU
        },
        ratioMenu: {
          acceptReporters: true,
          items: this.RATIO_MENU
        },
        intervalMenu: {
          acceptReporters: true,
          items: this.INTERVAL_MENU
        }
      }
    };
  }
  getX(args) {
    let personNumber = parseInt(args.PERSON_NUMBER, 10) - 1;
    let keypoint = parseInt(args.KEYPOINT, 10) - 1;
    if (this.faces[personNumber].keypoints && this.faces[personNumber].keypoints[keypoint]) {
      if (this.runtime.ioDevices.video.mirror === false) {
        return -1 * (240 - this.faces[personNumber].keypoints[keypoint][0] * this.ratio);
      } else {
        return 240 - this.faces[personNumber].keypoints[keypoint][0] * this.ratio;
      }
    } else {
      return "";
    }
  }
  getY(args) {
    let personNumber = parseInt(args.PERSON_NUMBER, 10) - 1;
    let keypoint = parseInt(args.KEYPOINT, 10) - 1;
    if (this.faces[personNumber].keypoints && this.faces[personNumber].keypoints[keypoint]) {
      return 180 - this.faces[personNumber].keypoints[keypoint][1] * this.ratio;
    } else {
      return "";
    }
  }
  getPeopleCount() {
    return this.faces.length;
  }
  videoToggle(args) {
    let state = args.VIDEO_STATE;
    if (state === 'off') {
      this.runtime.ioDevices.video.disableVideo();
      this.facemesh.video = null; // Stop the model prediction if video is off
    } else {
      this.facemesh.removeAllListeners('predict');
      this.dependenciesReady.then(() => this.disposed ? undefined : this.runtime.ioDevices.video.enableVideo()).then(this.detectFace).catch(error => {
        this.lastError = error.message;
      });
      this.runtime.ioDevices.video.mirror = state === "on";
    }
  }

  /**
   * A scratch command block handle that configures the video preview's
   * transparency from passed arguments.
   * @param {object} args - the block arguments
   * @param {number} args.TRANSPARENCY - the transparency to set the video
   *   preview to
   */
  setVideoTransparency(args) {
    const transparency = Cast.toNumber(args.TRANSPARENCY);
    this.globalVideoTransparency = transparency;
    this.runtime.ioDevices.video.setPreviewGhost(transparency);
  }
  setRatio(args) {
    this.ratio = parseFloat(args.RATIO);
  }
  setLocale() {
    let locale = formatMessage.setup().locale;
    if (AvailableLocales.includes(locale)) {
      return locale;
    } else {
      return 'en';
    }
  }
}
module.exports = Scratch3Facemesh2ScratchBlocks;

/***/ }),

/***/ "./src/lib/libraries/extensions/stretch/vendor/handpose2scratch.js":
/*!*************************************************************************!*\
  !*** ./src/lib/libraries/extensions/stretch/vendor/handpose2scratch.js ***!
  \*************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
  ml5,
  tmPose,
  librariesReady
} = __webpack_require__(/*! ../runtime */ "./src/lib/libraries/extensions/stretch/runtime.js");
/* Adapted for Unifiscratch; provenance and original hash: ../upstream.json. */
const ArgumentType = __webpack_require__(/*! unifiscratch-vm/extension-support/argument-type */ "./node_modules/scratch-vm/src/extension-support/argument-type.js");
const BlockType = __webpack_require__(/*! unifiscratch-vm/extension-support/block-type */ "./node_modules/scratch-vm/src/extension-support/block-type.js");
const Cast = __webpack_require__(/*! unifiscratch-vm/util/cast */ "./node_modules/scratch-vm/src/util/cast.js");
const formatMessage = __webpack_require__(/*! format-message */ "./node_modules/format-message/index.js");
const blockIconURI = 'data:image/png;base64,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';
const Message = {
  getX: {
    'ja': '[LANDMARK] のx座標',
    'ja-Hira': '[LANDMARK] のxざひょう',
    'en': 'x of [LANDMARK]',
    'fr': 'x de [LANDMARK]'
  },
  getY: {
    'ja': '[LANDMARK] のy座標',
    'ja-Hira': '[LANDMARK] のyざひょう',
    'en': 'y of [LANDMARK]',
    'fr': 'y de [LANDMARK]'
  },
  getZ: {
    'ja': '[LANDMARK] のz座標',
    'ja-Hira': '[LANDMARK] のzざひょう',
    'en': 'z of [LANDMARK]',
    'fr': 'z de [LANDMARK]'
  },
  videoToggle: {
    'ja': 'ビデオを [VIDEO_STATE] にする',
    'ja-Hira': 'ビデオを [VIDEO_STATE] にする',
    'en': 'turn video [VIDEO_STATE]',
    'fr': 'mettre la vidéo [VIDEO_STATE]'
  },
  setRatio: {
    'ja': '倍率を [RATIO] にする',
    'ja-Hira': 'ばいりつを [RATIO] にする',
    'en': 'set ratio to [RATIO]',
    'fr': 'définir le ratio à [RATIO]'
  },
  setInterval: {
    'ja': '認識を [INTERVAL] 秒ごとに行う',
    'ja-Hira': 'にんしきを [INTERVAL] びょうごとにおこなう',
    'en': 'Label once every [INTERVAL] seconds',
    'fr': 'étiqueter toutes les [INTERVAL] secondes'
  },
  on: {
    'ja': '入',
    'ja-Hira': 'いり',
    'en': 'on',
    'fr': 'activé'
  },
  off: {
    'ja': '切',
    'ja-Hira': 'きり',
    'en': 'off',
    'fr': 'désactivé'
  },
  video_on_flipped: {
    'ja': '左右反転',
    'ja-Hira': 'さゆうはんてん',
    'en': 'on flipped',
    'fr': 'vidéo inversée'
  },
  please_wait: {
    'ja': '準備に時間がかかります。少しの間、操作ができなくなりますがお待ち下さい。',
    'ja-Hira': 'じゅんびにじかんがかかります。すこしのあいだ、そうさができなくなりますがおまちください。',
    'en': 'Setup takes a while. The browser will get stuck, but please wait.',
    'fr': 'La configuration prend un certain temps. Le navigateur peut sembler figé, veuillez patienter.'
  },
  landmarks: [{
    'ja': '手首',
    'ja-Hira': 'てくび',
    'en': 'wrist',
    'fr': 'poignet'
  }, {
    'ja': '親指の根元',
    'ja-Hira': 'おやゆびのねもと',
    'en': 'the base of thumb',
    'fr': 'base du pouce'
  }, {
    'ja': '親指の第2関節',
    'ja-Hira': 'おやゆびのだい2かんせつ',
    'en': 'the 2nd joint of thumb',
    'fr': '2ᵉ articulation du pouce'
  }, {
    'ja': '親指の第1関節',
    'ja-Hira': 'おやゆびのだい1かんせつ',
    'en': 'the 1st joint of thumb',
    'fr': '1ʳᵉ articulation du pouce'
  }, {
    'ja': '親指の先端',
    'ja-Hira': 'おやゆびのさき',
    'en': 'thumb',
    'fr': 'bout du pouce'
  }, {
    'ja': '人差し指の第3関節',
    'ja-Hira': 'ひとさしゆびのだい3かんせつ',
    'en': 'the 3rd joint of index finger',
    'fr': '3ᵉ articulation de l’index'
  }, {
    'ja': '人差し指の第2関節',
    'ja-Hira': 'ひとさしゆびのだい2かんせつ',
    'en': 'the 2nd joint of index finger',
    'fr': '2ᵉ articulation de l’index'
  }, {
    'ja': '人差し指の第1関節',
    'ja-Hira': 'ひとさしゆびのだい1かんせつ',
    'en': 'the 1st joint of index finger',
    'fr': '1ʳᵉ articulation de l’index'
  }, {
    'ja': '人差し指の先端',
    'ja-Hira': 'ひとさしゆびのせんたん',
    'en': 'index finger',
    'fr': 'bout de l’index'
  }, {
    'ja': '中指の第3関節',
    'ja-Hira': 'なかゆびのだい3かんせつ',
    'en': 'the 3rd joint of middle finger',
    'fr': '3ᵉ articulation du majeur'
  }, {
    'ja': '中指の第2関節',
    'ja-Hira': 'なかゆびのだい2かんせつ',
    'en': 'the 2nd joint of middle finger',
    'fr': '2ᵉ articulation du majeur'
  }, {
    'ja': '中指の第1関節',
    'ja-Hira': 'なかゆびのだい1かんせつ',
    'en': 'the 1st joint of middle finger',
    'fr': '1ʳᵉ articulation du majeur'
  }, {
    'ja': '中指の先端',
    'ja-Hira': 'なかゆびのせんたん',
    'en': 'middle finger',
    'fr': 'bout du majeur'
  }, {
    'ja': '薬指の第3関節',
    'ja-Hira': 'くすりゆびのだい3かんせつ',
    'en': 'the 3rd joint of ring finger',
    'fr': '3ᵉ articulation de l’annulaire'
  }, {
    'ja': '薬指の第2関節',
    'ja-Hira': 'くすりゆびのだい2かんせつ',
    'en': 'the 2nd joint of ring finger',
    'fr': '2ᵉ articulation de l’annulaire'
  }, {
    'ja': '薬指の第1関節',
    'ja-Hira': 'くすりゆびのだい1かんせつ',
    'en': 'the 1st joint of ring finger',
    'fr': '1ʳᵉ articulation de l’annulaire'
  }, {
    'ja': '薬指の先端',
    'ja-Hira': 'くすりゆびのせんたん',
    'en': 'ring finger',
    'fr': 'bout de l’annulaire'
  }, {
    'ja': '小指の第3関節',
    'ja-Hira': 'こゆびのだい3かんせつ',
    'en': 'the 3rd joint of little finger',
    'fr': '3ᵉ articulation de l’auriculaire'
  }, {
    'ja': '小指の第2関節',
    'ja-Hira': 'こゆびのだい2かんせつ',
    'en': 'the 2nd joint of little finger',
    'fr': '2ᵉ articulation de l’auriculaire'
  }, {
    'ja': '小指の第1関節',
    'ja-Hira': 'こゆびのだい1かんせつ',
    'en': 'the 1st joint of little finger',
    'fr': '1ʳᵉ articulation de l’auriculaire'
  }, {
    'ja': '小指の先端',
    'ja-Hira': 'こゆびのせんたん',
    'en': 'little finger',
    'fr': 'bout de l’auriculaire'
  }]
};
const AvailableLocales = ['en', 'ja', 'ja-Hira', 'fr'];
class Scratch3Handpose2ScratchBlocks {
  get LANDMARK_MENU() {
    const landmark_menu = [];
    for (let i = 1; i <= 21; i++) {
      landmark_menu.push({
        text: "".concat(Message.landmarks[i - 1][this._locale], " (").concat(i, ")"),
        value: String(i)
      });
    }
    return landmark_menu;
  }
  get VIDEO_MENU() {
    return [{
      text: Message.off[this._locale],
      value: 'off'
    }, {
      text: Message.on[this._locale],
      value: 'on'
    }, {
      text: Message.video_on_flipped[this._locale],
      value: 'on-flipped'
    }];
  }
  get INTERVAL_MENU() {
    return [{
      text: '0.1',
      value: '0.1'
    }, {
      text: '0.2',
      value: '0.2'
    }, {
      text: '0.5',
      value: '0.5'
    }, {
      text: '1.0',
      value: '1.0'
    }];
  }
  get RATIO_MENU() {
    return [{
      text: '0.5',
      value: '0.5'
    }, {
      text: '0.75',
      value: '0.75'
    }, {
      text: '1',
      value: '1'
    }, {
      text: '1.5',
      value: '1.5'
    }, {
      text: '2.0',
      value: '2.0'
    }];
  }
  constructor(runtime) {
    this.runtime = runtime;
    this.dependenciesReady = librariesReady();
    this.dependenciesReady.catch(error => {
      this.lastError = error.message;
    });
    this.landmarks = [];
    this.ratio = 0.75;
    this.detectHand = () => {
      this.video = this.runtime.ioDevices.video.provider.video;
      if (!this.video) {
        this.lastError = 'Camera unavailable';
        return;
      }
      if (this.disposed) return;
      const handpose = this.handpose = ml5.handpose(this.video, function () {
        console.log("Model loaded!");
      });
      handpose.on('predict', hands => {
        if (this.disposed) return;
        if (!hands.length) this.landmarks = [];
        hands.forEach(hand => {
          this.landmarks = hand.landmarks;
        });
      });
    };
    this.dependenciesReady.then(() => this.disposed ? undefined : this.runtime.ioDevices.video.enableVideo()).then(this.detectHand).catch(error => {
      this.lastError = error.message;
    });
  }
  getInfo() {
    this._locale = this.setLocale();
    return {
      id: 'handpose2scratch',
      name: 'Handpose2Scratch',
      blockIconURI: blockIconURI,
      blocks: [{
        opcode: 'getX',
        blockType: BlockType.REPORTER,
        text: Message.getX[this._locale],
        arguments: {
          LANDMARK: {
            type: ArgumentType.STRING,
            menu: 'landmark',
            defaultValue: '1'
          }
        }
      }, {
        opcode: 'getY',
        blockType: BlockType.REPORTER,
        text: Message.getY[this._locale],
        arguments: {
          LANDMARK: {
            type: ArgumentType.STRING,
            menu: 'landmark',
            defaultValue: '1'
          }
        }
      }, {
        opcode: 'getZ',
        blockType: BlockType.REPORTER,
        text: Message.getZ[this._locale],
        arguments: {
          LANDMARK: {
            type: ArgumentType.STRING,
            menu: 'landmark',
            defaultValue: '1'
          }
        }
      }, {
        opcode: 'videoToggle',
        blockType: BlockType.COMMAND,
        text: Message.videoToggle[this._locale],
        arguments: {
          VIDEO_STATE: {
            type: ArgumentType.STRING,
            menu: 'videoMenu',
            defaultValue: 'off'
          }
        }
      }, {
        opcode: 'setVideoTransparency',
        text: formatMessage({
          id: 'videoSensing.setVideoTransparency',
          default: 'set video transparency to [TRANSPARENCY]',
          description: 'Controls transparency of the video preview layer'
        }),
        arguments: {
          TRANSPARENCY: {
            type: ArgumentType.NUMBER,
            defaultValue: 50
          }
        }
      }, {
        opcode: 'setRatio',
        blockType: BlockType.COMMAND,
        text: Message.setRatio[this._locale],
        arguments: {
          RATIO: {
            type: ArgumentType.STRING,
            menu: 'ratioMenu',
            defaultValue: '0.75'
          }
        }
      }],
      menus: {
        landmark: {
          acceptReporters: true,
          items: this.LANDMARK_MENU
        },
        videoMenu: {
          acceptReporters: true,
          items: this.VIDEO_MENU
        },
        ratioMenu: {
          acceptReporters: true,
          items: this.RATIO_MENU
        },
        intervalMenu: {
          acceptReporters: true,
          items: this.INTERVAL_MENU
        }
      }
    };
  }
  getX(args) {
    let landmark = parseInt(args.LANDMARK, 10) - 1;
    if (this.landmarks[landmark]) {
      if (this.runtime.ioDevices.video.mirror === false) {
        return -1 * (240 - this.landmarks[landmark][0] * this.ratio);
      } else {
        return 240 - this.landmarks[landmark][0] * this.ratio;
      }
    } else {
      return "";
    }
  }
  getY(args) {
    let landmark = parseInt(args.LANDMARK, 10) - 1;
    if (this.landmarks[landmark]) {
      return 180 - this.landmarks[landmark][1] * this.ratio;
    } else {
      return "";
    }
  }
  getZ(args) {
    let landmark = parseInt(args.LANDMARK, 10) - 1;
    if (this.landmarks[landmark]) {
      return this.landmarks[landmark][2];
    } else {
      return "";
    }
  }
  videoToggle(args) {
    let state = args.VIDEO_STATE;
    if (state === 'off') {
      this.runtime.ioDevices.video.disableVideo();
    } else {
      this.dependenciesReady.then(() => this.disposed ? undefined : this.runtime.ioDevices.video.enableVideo()).then(this.detectHand).catch(error => {
        this.lastError = error.message;
      });
      this.runtime.ioDevices.video.mirror = state === "on";
    }
  }

  /**
   * A scratch command block handle that configures the video preview's
   * transparency from passed arguments.
   * @param {object} args - the block arguments
   * @param {number} args.TRANSPARENCY - the transparency to set the video
   *   preview to
   */
  setVideoTransparency(args) {
    const transparency = Cast.toNumber(args.TRANSPARENCY);
    this.globalVideoTransparency = transparency;
    this.runtime.ioDevices.video.setPreviewGhost(transparency);
  }
  setRatio(args) {
    this.ratio = parseFloat(args.RATIO);
  }
  setLocale() {
    let locale = formatMessage.setup().locale;
    if (AvailableLocales.includes(locale)) {
      return locale;
    } else {
      return 'en';
    }
  }
}
module.exports = Scratch3Handpose2ScratchBlocks;

/***/ }),

/***/ "./src/lib/libraries/extensions/stretch/vendor/ic2scratch.js":
/*!*******************************************************************!*\
  !*** ./src/lib/libraries/extensions/stretch/vendor/ic2scratch.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
  ml5,
  tmPose,
  librariesReady
} = __webpack_require__(/*! ../runtime */ "./src/lib/libraries/extensions/stretch/runtime.js");
/* Adapted for Unifiscratch; provenance and original hash: ../upstream.json. */
const ArgumentType = __webpack_require__(/*! unifiscratch-vm/extension-support/argument-type */ "./node_modules/scratch-vm/src/extension-support/argument-type.js");
const BlockType = __webpack_require__(/*! unifiscratch-vm/extension-support/block-type */ "./node_modules/scratch-vm/src/extension-support/block-type.js");
const Cast = __webpack_require__(/*! unifiscratch-vm/util/cast */ "./node_modules/scratch-vm/src/util/cast.js");
const log = __webpack_require__(/*! unifiscratch-vm/util/log */ "./node_modules/scratch-vm/src/util/log.js");
const formatMessage = __webpack_require__(/*! format-message */ "./node_modules/format-message/index.js");
const HAT_TIMEOUT = 100;
const blockIconURI = 'data:image/png;base64,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';
const Message = {
  when_received_block: {
    'ja': '認識の候補を受け取ったとき',
    'ja-Hira': 'にんしきのこうほをうけとったとき',
    'en': 'when received classification candidates',
    'zh-cn': '收到分类结果时'
  },
  result1: {
    'ja': '候補1',
    'ja-Hira': 'こうほ1',
    'en': 'candidate1',
    'zh-cn': '结果1'
  },
  result2: {
    'ja': '候補2',
    'ja-Hira': 'こうほ2',
    'en': 'candidate2',
    'zh-cn': '结果2'
  },
  result3: {
    'ja': '候補3',
    'ja-Hira': 'こうほ3',
    'en': 'candidate3',
    'zh-cn': '结果3'
  },
  confidence1: {
    'ja': '確信度1',
    'ja-Hira': 'かくしんど1',
    'en': 'confidence1',
    'zh-cn': '置信度1'
  },
  confidence2: {
    'ja': '確信度2',
    'ja-Hira': 'かくしんど2',
    'en': 'confidence2',
    'zh-cn': '置信度2'
  },
  confidence3: {
    'ja': '確信度3',
    'ja-Hira': 'かくしんど3',
    'en': 'confidence3',
    'zh-cn': '置信度3'
  },
  toggle_classification: {
    'ja': '画像認識を[CLASSIFICATION_STATE]にする',
    'ja-Hira': 'がぞうにんしきを[CLASSIFICATION_STATE]にする',
    'en': 'turn classification [CLASSIFICATION_STATE]',
    'zh-cn': '[CLASSIFICATION_STATE]分类'
  },
  set_classification_interval: {
    'ja': '画像認識を[CLASSIFICATION_INTERVAL]秒間に1回行う',
    'ja-Hira': 'がぞうにんしきを[CLASSIFICATION_INTERVAL]びょうかんに1かいおこなう',
    'en': 'Classify once every [CLASSIFICATION_INTERVAL] seconds',
    'zh-cn': '每隔[CLASSIFICATION_INTERVAL]秒标记一次'
  },
  video_toggle: {
    'ja': 'ビデオを[VIDEO_STATE]にする',
    'ja-Hira': 'ビデオを[VIDEO_STATE]にする',
    'en': 'turn video [VIDEO_STATE]',
    'zh-cn': '[VIDEO_STATE]摄像头'
  },
  on: {
    'ja': '入',
    'ja-Hira': 'いり',
    'en': 'on',
    'zh-cn': '开启'
  },
  off: {
    'ja': '切',
    'ja-Hira': 'きり',
    'en': 'off',
    'zh-cn': '关闭'
  },
  video_on_flipped: {
    'ja': '左右反転',
    'ja-Hira': 'さゆうはんてん',
    'en': 'on flipped',
    'zh-cn': '镜像开启'
  }
};
const AvailableLocales = ['en', 'ja', 'ja-Hira', 'zh-cn'];
class Scratch3ImageClassifierBlocks {
  constructor(runtime) {
    this.runtime = runtime;
    this.dependenciesReady = librariesReady();
    this.dependenciesReady.catch(error => {
      this.lastError = error.message;
    });
    this.when_received = false;
    this.results = [];
    this.locale = this.setLocale();
    this.blockClickedAt = null;
    this.interval = 1000;
    this.detect = () => {
      this.video = this.runtime.ioDevices.video.provider.video;
      this.classifier = ml5.imageClassifier('MobileNet', () => {
        if (this.disposed) return;
        console.log('Model Loaded!');
        this.timer = setInterval(() => {
          this.classify();
        }, this.interval);
      });
    };
    this.dependenciesReady.then(() => this.disposed ? undefined : this.runtime.ioDevices.video.enableVideo()).then(this.detect).catch(error => {
      this.lastError = error.message;
    });
  }
  getInfo() {
    this.locale = this.setLocale();
    return {
      id: 'ic2scratch',
      name: 'ImageClassifier2Scratch',
      blockIconURI: blockIconURI,
      blocks: [{
        opcode: 'getResult1',
        text: Message.result1[this.locale],
        blockType: BlockType.REPORTER
      }, {
        opcode: 'getResult2',
        text: Message.result2[this.locale],
        blockType: BlockType.REPORTER
      }, {
        opcode: 'getResult3',
        text: Message.result3[this.locale],
        blockType: BlockType.REPORTER
      }, {
        opcode: 'getConfidence1',
        text: Message.confidence1[this.locale],
        blockType: BlockType.REPORTER
      }, {
        opcode: 'getConfidence2',
        text: Message.confidence2[this.locale],
        blockType: BlockType.REPORTER
      }, {
        opcode: 'getConfidence3',
        text: Message.confidence3[this.locale],
        blockType: BlockType.REPORTER
      }, {
        opcode: 'whenReceived',
        text: Message.when_received_block[this.locale],
        blockType: BlockType.HAT
      }, {
        opcode: 'toggleClassification',
        text: Message.toggle_classification[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          CLASSIFICATION_STATE: {
            type: ArgumentType.STRING,
            menu: 'classification_menu',
            defaultValue: 'off'
          }
        }
      }, {
        opcode: 'setClassificationInterval',
        text: Message.set_classification_interval[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          CLASSIFICATION_INTERVAL: {
            type: ArgumentType.STRING,
            menu: 'classification_interval_menu',
            defaultValue: '1'
          }
        }
      }, {
        opcode: 'videoToggle',
        text: Message.video_toggle[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          VIDEO_STATE: {
            type: ArgumentType.STRING,
            menu: 'video_menu',
            defaultValue: 'off'
          }
        }
      }, {
        opcode: 'setVideoTransparency',
        text: formatMessage({
          id: 'videoSensing.setVideoTransparency',
          default: 'set video transparency to [TRANSPARENCY]',
          description: 'Controls transparency of the video preview layer'
        }),
        arguments: {
          TRANSPARENCY: {
            type: ArgumentType.NUMBER,
            defaultValue: 50
          }
        }
      }],
      menus: {
        video_menu: this.getVideoMenu(),
        classification_interval_menu: this.getClassificationIntervalMenu(),
        classification_menu: this.getClassificationMenu()
      }
    };
  }
  getResult1() {
    return this.results[0]['label'];
  }
  getResult2() {
    return this.results[1]['label'];
  }
  getResult3() {
    return this.results[2]['label'];
  }
  getConfidence1() {
    return this.results[0]['confidence'];
  }
  getConfidence2() {
    return this.results[1]['confidence'];
  }
  getConfidence3() {
    return this.results[2]['confidence'];
  }
  whenReceived(args) {
    if (this.when_received) {
      setTimeout(() => {
        this.when_received = false;
      }, HAT_TIMEOUT);
      return true;
    }
    return false;
  }
  toggleClassification(args) {
    if (this.actionRepeated()) {
      return;
    }
    ;
    let state = args.CLASSIFICATION_STATE;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    if (state === 'on') {
      this.timer = setInterval(() => {
        this.classify();
      }, this.interval);
    }
  }
  setClassificationInterval(args) {
    if (this.actionRepeated()) {
      return;
    }
    ;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.interval = args.CLASSIFICATION_INTERVAL * 1000;
    this.timer = setInterval(() => {
      this.classify();
    }, this.interval);
  }
  videoToggle(args) {
    if (this.actionRepeated()) {
      return;
    }
    ;
    let state = args.VIDEO_STATE;
    if (state === 'off') {
      this.runtime.ioDevices.video.disableVideo();
    } else {
      this.dependenciesReady.then(() => this.disposed ? undefined : this.runtime.ioDevices.video.enableVideo()).then(this.detect).catch(error => {
        this.lastError = error.message;
      });
      this.runtime.ioDevices.video.mirror = state === "on";
    }
  }

  /**
   * A scratch command block handle that configures the video preview's
   * transparency from passed arguments.
   * @param {object} args - the block arguments
   * @param {number} args.TRANSPARENCY - the transparency to set the video
   *   preview to
   */
  setVideoTransparency(args) {
    const transparency = Cast.toNumber(args.TRANSPARENCY);
    this.globalVideoTransparency = transparency;
    this.runtime.ioDevices.video.setPreviewGhost(transparency);
  }
  classify() {
    if (this.disposed || !this.classifier || !this.video) return;
    this.classifier.classify(this.video, (err, results) => {
      if (err) {
        console.error(err);
      } else {
        this.when_received = true;
        this.results = results;
      }
    });
  }
  actionRepeated() {
    let currentTime = Date.now();
    if (this.blockClickedAt && this.blockClickedAt + 250 > currentTime) {
      console.log('Please do not repeat trigerring this block.');
      this.blockClickedAt = currentTime;
      return true;
    } else {
      this.blockClickedAt = currentTime;
      return false;
    }
  }
  getVideoMenu() {
    return [{
      text: Message.off[this.locale],
      value: 'off'
    }, {
      text: Message.on[this.locale],
      value: 'on'
    }, {
      text: Message.video_on_flipped[this.locale],
      value: 'on-flipped'
    }];
  }
  getClassificationIntervalMenu() {
    return [{
      text: '5',
      value: '5'
    }, {
      text: '2',
      value: '2'
    }, {
      text: '1',
      value: '1'
    }, {
      text: '0.5',
      value: '0.5'
    }];
  }
  getClassificationMenu() {
    return [{
      text: Message.off[this.locale],
      value: 'off'
    }, {
      text: Message.on[this.locale],
      value: 'on'
    }];
  }
  setLocale() {
    let locale = formatMessage.setup().locale;
    if (AvailableLocales.includes(locale)) {
      return locale;
    } else {
      return 'en';
    }
  }
}
module.exports = Scratch3ImageClassifierBlocks;

/***/ }),

/***/ "./src/lib/libraries/extensions/stretch/vendor/tm2scratch.js":
/*!*******************************************************************!*\
  !*** ./src/lib/libraries/extensions/stretch/vendor/tm2scratch.js ***!
  \*******************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
  ml5,
  tmPose,
  librariesReady
} = __webpack_require__(/*! ../runtime */ "./src/lib/libraries/extensions/stretch/runtime.js");
/* Adapted for Unifiscratch; provenance and original hash: ../upstream.json. */
const ArgumentType = __webpack_require__(/*! unifiscratch-vm/extension-support/argument-type */ "./node_modules/scratch-vm/src/extension-support/argument-type.js");
const BlockType = __webpack_require__(/*! unifiscratch-vm/extension-support/block-type */ "./node_modules/scratch-vm/src/extension-support/block-type.js");
const Cast = __webpack_require__(/*! unifiscratch-vm/util/cast */ "./node_modules/scratch-vm/src/util/cast.js");
const MathUtil = __webpack_require__(/*! unifiscratch-vm/util/math-util */ "./node_modules/scratch-vm/src/util/math-util.js");
const log = __webpack_require__(/*! unifiscratch-vm/util/log */ "./node_modules/scratch-vm/src/util/log.js");
const formatMessage = __webpack_require__(/*! format-message */ "./node_modules/format-message/index.js");
const blockIconURI = 'data:image/png;base64,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';
const Message = {
  image_classification_model_url: {
    'ja': '画像分類モデルURL[URL]',
    'ja-Hira': 'がぞうぶんるいモデル[URL]',
    'en': 'image classification model URL [URL]',
    'ko': '이미지 분류 모델 URL [URL]',
    'zh-tw': '影像分類模型網址[URL]',
    'de': 'Bildklassifikationsmodell-URL [URL]'
  },
  image_classification_sample_model_url: {
    'ja': 'https://teachablemachine.withgoogle.com/models/0rX_3hoH/',
    'ja-Hira': 'https://teachablemachine.withgoogle.com/models/0rX_3hoH/',
    'en': 'https://teachablemachine.withgoogle.com/models/0rX_3hoH/',
    'ko': 'https://teachablemachine.withgoogle.com/models/0rX_3hoH/',
    'zh-tw': 'https://teachablemachine.withgoogle.com/models/0rX_3hoH/',
    'de': 'https://teachablemachine.withgoogle.com/models/0rX_3hoH/'
  },
  sound_classification_model_url: {
    'ja': '音声分類モデルURL[URL]',
    'ja-Hira': 'おんせいぶんるいモデル[URL]',
    'en': 'sound classification model URL [URL]',
    'ko': '소리 분류 모델 URL [URL]',
    'zh-tw': '聲音分類模型網址[URL]',
    'de': 'Audioklassifikationsmodell-URL [URL]'
  },
  sound_classification_sample_model_url: {
    'ja': 'https://teachablemachine.withgoogle.com/models/xP0spGSB/',
    'ja-Hira': 'https://teachablemachine.withgoogle.com/models/xP0spGSB/',
    'en': 'https://teachablemachine.withgoogle.com/models/xP0spGSB/',
    'ko': 'https://teachablemachine.withgoogle.com/models/xP0spGSB/',
    'zh-tw': 'https://teachablemachine.withgoogle.com/models/xP0spGSB/',
    'de': 'https://teachablemachine.withgoogle.com/models/xP0spGSB/'
  },
  classify_image: {
    'ja': '画像を分類する',
    'ja-Hira': 'がぞうをぶんるいする',
    'en': 'classify image',
    'ko': '이미지 분류하기',
    'zh-tw': '影像分類',
    'de': 'Bild klassifizieren'
  },
  image_label: {
    'ja': '画像ラベル',
    'ja-Hira': 'がぞうラベル',
    'en': 'image label',
    'ko': '이미지 라벨',
    'zh-tw': '影像標籤',
    'de': 'Bildklasse'
  },
  sound_label: {
    'ja': '音声ラベル',
    'ja-Hira': 'おんせいラベル',
    'en': 'sound label',
    'ko': '소리 라벨',
    'zh-tw': '聲音標籤',
    'de': 'Audioklasse'
  },
  when_received_block: {
    'ja': '画像ラベル[LABEL]を受け取ったとき',
    'ja-Hira': 'がぞうラベル[LABEL]をうけとったとき',
    'en': 'when received image label:[LABEL]',
    'ko': '[LABEL] 이미지 라벨을 받았을 때:',
    'zh-cn': '接收到类别[LABEL]时',
    'zh-tw': '接收到影像標籤:[LABEL]時',
    'de': 'Wenn ich die Bildklasse [LABEL] erkenne'
  },
  is_image_label_detected: {
    'ja': '[LABEL]の画像が見つかった',
    'ja-Hira': '[LABEL]のがぞうがみつかった',
    'en': 'image [LABEL] detected',
    'ko': '[LABEL] 이미지가 감지됨',
    'zh-tw': '影像[LABEL]被偵測？',
    'de': 'Bildklasse [LABEL] erkannt'
  },
  is_sound_label_detected: {
    'ja': '[LABEL]の音声が聞こえた',
    'ja-Hira': '[LABEL]のおんせいがきこえた',
    'en': 'sound [LABEL] detected',
    'ko': '[LABEL] 소리가 감지됨',
    'zh-tw': '聲音[LABEL]被偵測？',
    'de': 'Audioklasse [LABEL] erkannt'
  },
  image_label_confidence: {
    'ja': '画像ラベル[LABEL]の確度',
    'ja-Hira': 'がぞうラベル[LABEL]のかくど',
    'en': 'confidence of image [LABEL]',
    'ko': '[LABEL] 이미지 신뢰도',
    'zh-tw': '影像置信度[LABEL]',
    'de': 'Konfidenz der Bildklasse [LABEL]'
  },
  sound_label_confidence: {
    'ja': '音声ラベル[LABEL]の確度',
    'ja-Hira': 'おんせいラベル[LABEL]のかくど',
    'en': 'confidence of sound [LABEL]',
    'ko': '[LABEL] 소리 신뢰도',
    'zh-tw': '聲音置信度[LABEL]',
    'de': 'Konfidenz der Audioklasse [LABEL]'
  },
  when_received_sound_label_block: {
    'ja': '音声ラベル[LABEL]を受け取ったとき',
    'ja-Hira': '音声ラベル[LABEL]をうけとったとき',
    'en': 'when received sound label:[LABEL]',
    'zh-cn': '接收到声音类别[LABEL]时',
    'ko': '[LABEL] 소리 라벨을 받았을 때:',
    'zh-tw': '接收到聲音標籤[LABEL]時',
    'de': 'Wenn ich die Soundklasse [LABEL] erkenne'
  },
  label_block: {
    'ja': 'ラベル',
    'ja-Hira': 'ラベル',
    'en': 'label',
    'zh-cn': '标签',
    'ko': '라벨',
    'zh-tw': '標籤',
    'de': 'Klasse'
  },
  any: {
    'ja': 'のどれか',
    'ja-Hira': 'のどれか',
    'en': 'any',
    'zh-cn': '任何',
    'ko': '어떤',
    'zh-tw': '任何',
    'de': 'irgendeine'
  },
  any_without_of: {
    'ja': 'どれか',
    'ja-Hira': 'どれか',
    'en': 'any',
    'ko': '어떤',
    'zh-cn': '任何',
    'zh-tw': '任何',
    'de': 'irgendeine'
  },
  all: {
    'ja': 'の全て',
    'ja-Hira': 'のすべて',
    'en': 'all',
    'ko': '모든',
    'zh-cn': '所有',
    'zh-tw': '全部',
    'de': 'Alle'
  },
  toggle_classification: {
    'ja': 'ラベル付けを[CLASSIFICATION_STATE]にする',
    'ja-Hira': 'ラベルづけを[CLASSIFICATION_STATE]にする',
    'en': 'turn classification [CLASSIFICATION_STATE]',
    'ko': '라벨 분류 [CLASSIFICATION_STATE]',
    'zh-cn': '[CLASSIFICATION_STATE]分类',
    'zh-tw': '[CLASSIFICATION_STATE]分類',
    'de': 'Klassifizierung umschalten: [CLASSIFICATION_STATE]'
  },
  set_confidence_threshold: {
    'ja': '確度のしきい値を[CONFIDENCE_THRESHOLD]にする',
    'ja-Hira': 'かくどのしきいちを[CONFIDENCE_THRESHOLD]にする',
    'en': 'set confidence threshold [CONFIDENCE_THRESHOLD]',
    'ko': '신뢰도 기준 설정 [CONFIDENCE_THRESHOLD]',
    'zh-tw': '設定置信度閾值[CONFIDENCE_THRESHOLD]',
    'de': 'Setze die Konfidenzschwelle auf [CONFIDENCE_THRESHOLD]'
  },
  get_confidence_threshold: {
    'ja': '確度のしきい値',
    'ja-Hira': 'かくどのしきいち',
    'en': 'confidence threshold',
    'ko': '신뢰도 기준',
    'zh-tw': '置信度閾值',
    'de': 'Konfidenzschwelle'
  },
  set_classification_interval: {
    'ja': 'ラベル付けを[CLASSIFICATION_INTERVAL]秒間に1回行う',
    'ja-Hira': 'ラベルづけを[CLASSIFICATION_INTERVAL]びょうかんに1かいおこなう',
    'en': 'Label once every [CLASSIFICATION_INTERVAL] seconds',
    'zh-cn': '每隔[CLASSIFICATION_INTERVAL]秒标记一次',
    'ko': '매 [CLASSIFICATION_INTERVAL]초마다 라벨 분류하기',
    'zh-tw': '每隔[CLASSIFICATION_INTERVAL]秒標記一次',
    'de': 'Klassifiziere alle [CLASSIFICATION_INTERVAL] Sekunden'
  },
  video_toggle: {
    'ja': 'ビデオを[VIDEO_STATE]にする',
    'ja-Hira': 'ビデオを[VIDEO_STATE]にする',
    'en': 'turn video [VIDEO_STATE]',
    'zh-cn': '[VIDEO_STATE]摄像头',
    'ko': '비디오 화면 [VIDEO_STATE]',
    'zh-tw': '視訊設為[VIDEO_STATE]',
    'de': 'Video umschalten: [VIDEO_STATE]'
  },
  on: {
    'ja': '入',
    'ja-Hira': 'いり',
    'en': 'on',
    'ko': '켜기',
    'zh-cn': '开启',
    'zh-tw': '開啟',
    'de': 'an'
  },
  off: {
    'ja': '切',
    'ja-Hira': 'きり',
    'en': 'off',
    'ko': '멈추기',
    'zh-cn': '关闭',
    'zh-tw': '關閉',
    'de': 'aus'
  },
  video_on_flipped: {
    'ja': '左右反転',
    'ja-Hira': 'さゆうはんてん',
    'en': 'on flipped',
    'ko': '좌우 뒤집기',
    'zh-cn': '镜像开启',
    'zh-tw': '翻轉',
    'de': 'an (gespiegelt)'
  },
  switch_webcam: {
    'ja': 'カメラを[DEVICE]に切り替える',
    'ja-Hira': 'カメラを[DEVICE]にきりかえる',
    'en': 'switch webcam to [DEVICE]',
    'zh-cn': '网络摄像头切换到[DEVICE]',
    'zh-tw': '網路攝影機切換到[DEVICE]',
    'de': 'Wechsle Webcam zu [DEVICE]'
  }
};
const AvailableLocales = ['en', 'ja', 'ja-Hira', 'ko', 'zh-cn', 'zh-tw', 'de'];
class Scratch3TM2ScratchBlocks {
  constructor(runtime) {
    this.runtime = runtime;
    this.dependenciesReady = librariesReady();
    this.dependenciesReady.catch(error => {
      this.lastError = error.message;
    });
    this.locale = this.setLocale();
    this.interval = 1000;
    this.minInterval = 100;
    this.dependenciesReady.then(() => this.runtime.ioDevices.video.enableVideo()).then(() => {
      if (!this.disposed) this.video = this.runtime.ioDevices.video.provider.video;
    }).catch(error => {
      this.lastError = error.message;
    });
    this.timer = setInterval(() => {
      Promise.resolve(this.classifyVideoImage()).catch(error => {
        this.lastError = error.message;
      });
    }, this.minInterval);
    this.imageModelUrl = null;
    this.imageMetadata = null;
    this.imageClassifier = null;
    this.initImageProbableLabels();
    this.confidenceThreshold = 0.5;
    this.soundModelUrl = null;
    this.soundMetadata = null;
    this.soundClassifier = null;
    this.soundClassifierEnabled = false;
    this.initSoundProbableLabels();
    this.dependenciesReady.then(() => this.disposed ? undefined : this.runtime.ioDevices.video.enableVideo());
    this.devices = [{
      text: 'default',
      value: ''
    }];
    try {
      navigator.mediaDevices.enumerateDevices().then(media => {
        for (const device of media) {
          if (device.kind === 'videoinput') {
            this.devices.push({
              text: device.label,
              value: device.deviceId
            });
          }
        }
      });
    } catch (_unused) {
      console.error('failed to load media devices!');
    }
  }

  /**
   * Initialize the result of image classification.
   */
  initImageProbableLabels() {
    this.imageProbableLabels = [];
  }
  initSoundProbableLabels() {
    this.soundProbableLabels = [];
  }
  getInfo() {
    this.locale = this.setLocale();
    return {
      id: 'tm2scratch',
      name: 'TM2Scratch',
      blockIconURI: blockIconURI,
      blocks: [{
        opcode: 'whenReceived',
        text: Message.when_received_block[this.locale],
        blockType: BlockType.HAT,
        arguments: {
          LABEL: {
            type: ArgumentType.STRING,
            menu: 'received_menu',
            defaultValue: Message.any[this.locale]
          }
        }
      }, {
        opcode: 'isImageLabelDetected',
        text: Message.is_image_label_detected[this.locale],
        blockType: BlockType.BOOLEAN,
        arguments: {
          LABEL: {
            type: ArgumentType.STRING,
            menu: 'image_labels_menu',
            defaultValue: Message.any_without_of[this.locale]
          }
        }
      }, {
        opcode: 'imageLabelConfidence',
        text: Message.image_label_confidence[this.locale],
        blockType: BlockType.REPORTER,
        disableMonitor: true,
        arguments: {
          LABEL: {
            type: ArgumentType.STRING,
            menu: 'image_labels_without_any_menu',
            defaultValue: ''
          }
        }
      }, {
        opcode: 'setImageClassificationModelURL',
        text: Message.image_classification_model_url[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          URL: {
            type: ArgumentType.STRING,
            defaultValue: Message.image_classification_sample_model_url[this.locale]
          }
        }
      }, {
        opcode: 'classifyVideoImageBlock',
        text: Message.classify_image[this.locale],
        blockType: BlockType.COMMAND
      }, {
        opcode: 'getImageLabel',
        text: Message.image_label[this.locale],
        blockType: BlockType.REPORTER
      }, '---', {
        opcode: 'whenReceivedSoundLabel',
        text: Message.when_received_sound_label_block[this.locale],
        blockType: BlockType.HAT,
        arguments: {
          LABEL: {
            type: ArgumentType.STRING,
            menu: 'received_sound_label_menu',
            defaultValue: Message.any[this.locale]
          }
        }
      }, {
        opcode: 'isSoundLabelDetected',
        text: Message.is_sound_label_detected[this.locale],
        blockType: BlockType.BOOLEAN,
        arguments: {
          LABEL: {
            type: ArgumentType.STRING,
            menu: 'sound_labels_menu',
            defaultValue: Message.any_without_of[this.locale]
          }
        }
      }, {
        opcode: 'soundLabelConfidence',
        text: Message.sound_label_confidence[this.locale],
        blockType: BlockType.REPORTER,
        disableMonitor: true,
        arguments: {
          LABEL: {
            type: ArgumentType.STRING,
            menu: 'sound_labels_without_any_menu',
            defaultValue: ''
          }
        }
      }, {
        opcode: 'setSoundClassificationModelURL',
        text: Message.sound_classification_model_url[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          URL: {
            type: ArgumentType.STRING,
            defaultValue: Message.sound_classification_sample_model_url[this.locale]
          }
        }
      }, {
        opcode: 'getSoundLabel',
        text: Message.sound_label[this.locale],
        blockType: BlockType.REPORTER
      }, '---', {
        opcode: 'toggleClassification',
        text: Message.toggle_classification[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          CLASSIFICATION_STATE: {
            type: ArgumentType.STRING,
            menu: 'classification_menu',
            defaultValue: 'off'
          }
        }
      }, {
        opcode: 'setClassificationInterval',
        text: Message.set_classification_interval[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          CLASSIFICATION_INTERVAL: {
            type: ArgumentType.STRING,
            menu: 'classification_interval_menu',
            defaultValue: '1'
          }
        }
      }, {
        opcode: 'setConfidenceThreshold',
        text: Message.set_confidence_threshold[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          CONFIDENCE_THRESHOLD: {
            type: ArgumentType.NUMBER,
            defaultValue: 0.5
          }
        }
      }, {
        opcode: 'getConfidenceThreshold',
        text: Message.get_confidence_threshold[this.locale],
        blockType: BlockType.REPORTER,
        disableMonitor: true
      }, {
        opcode: 'videoToggle',
        text: Message.video_toggle[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          VIDEO_STATE: {
            type: ArgumentType.STRING,
            menu: 'video_menu',
            defaultValue: 'off'
          }
        }
      }, {
        opcode: 'switchCamera',
        blockType: BlockType.COMMAND,
        text: Message.switch_webcam[this.locale],
        arguments: {
          DEVICE: {
            type: ArgumentType.STRING,
            defaultValue: '',
            menu: 'mediadevices'
          }
        }
      }],
      menus: {
        received_menu: {
          acceptReporters: true,
          items: 'getLabelsMenu'
        },
        image_labels_menu: {
          acceptReporters: true,
          items: 'getLabelsWithAnyWithoutOfMenu'
        },
        image_labels_without_any_menu: {
          acceptReporters: true,
          items: 'getLabelsWithoutAnyMenu'
        },
        received_sound_label_menu: {
          acceptReporters: true,
          items: 'getSoundLabelsWithoutBackgroundMenu'
        },
        sound_labels_menu: {
          acceptReporters: true,
          items: 'getSoundLabelsWithoutBackgroundWithAnyWithoutOfMenu'
        },
        sound_labels_without_any_menu: {
          acceptReporters: true,
          items: 'getSoundLabelsWithoutAnyMenu'
        },
        video_menu: this.getVideoMenu(),
        classification_interval_menu: this.getClassificationIntervalMenu(),
        classification_menu: this.getClassificationMenu(),
        mediadevices: {
          acceptReporters: true,
          items: 'getDevices'
        }
      }
    };
  }

  /**
   * Detect change of the selected image label is the most probable one or not.
   * @param {object} args - The block's arguments.
   * @property {string} LABEL - The label to detect.
   * @return {boolean} - Whether the label is most probable or not.
   */
  whenReceived(args) {
    const label = this.getImageLabel();
    if (args.LABEL === Message.any[this.locale]) {
      return label !== '';
    }
    return label === args.LABEL;
  }

  /**
   * Detect change of the selected sound label is the most probable one or not.
   * @param {object} args - The block's arguments.
   * @property {string} LABEL - The label to detect.
   * @return {boolean} - Whether the label is most probable or not.
   */
  whenReceivedSoundLabel(args) {
    if (!this.soundClassifierEnabled) {
      return;
    }
    const label = this.getSoundLabel();
    if (args.LABEL === Message.any[this.locale]) {
      return label !== '';
    }
    return label === args.LABEL;
  }

  /**
   * Return whether the most probable image label is the selected one or not.
   * @param {object} args - The block's arguments.
   * @property {string} LABEL - The label to detect.
   * @return {boolean} - Whether the label is most probable or not.
   */
  isImageLabelDetected(args) {
    const label = this.getImageLabel();
    if (args.LABEL === Message.any[this.locale]) {
      return label !== '';
    }
    return label === args.LABEL;
  }

  /**
   * Return whether the most probable sound label is the selected one or not.
   * @param {object} args - The block's arguments.
   * @property {string} LABEL - The label to detect.
   * @return {boolean} - Whether the label is most probable or not.
   */
  isSoundLabelDetected(args) {
    const label = this.getSoundLabel();
    if (args.LABEL === Message.any[this.locale]) {
      return label !== '';
    }
    return label === args.LABEL;
  }

  /**
   * Return confidence of the image label.
   * @param {object} args - The block's arguments.
   * @property {string} LABEL - Selected label.
   * @return {number} - Confidence of the label.
   */
  imageLabelConfidence(args) {
    if (args.LABEL === '') {
      return 0;
    }
    const entry = this.imageProbableLabels.find(element => element.label === args.LABEL);
    return entry ? entry.confidence : 0;
  }

  /**
   * Return confidence of the sound label.
   * @param {object} args - The block's arguments.
   * @property {string} LABEL - Selected label.
   * @return {number} - Confidence of the label.
   */
  soundLabelConfidence(args) {
    if (!this.soundProbableLabels || this.soundProbableLabels.length === 0) return 0;
    if (args.LABEL === '') {
      return 0;
    }
    const entry = this.soundProbableLabels.find(element => element.label === args.LABEL);
    return entry ? entry.confidence : 0;
  }

  /**
   * Set a model for image classification from URL.
   * @param {object} args - the block's arguments.
   * @property {string} URL - URL of model to be loaded.
   * @return {Promise} - A Promise that resolve after loaded.
   */
  setImageClassificationModelURL(args) {
    return this.loadImageClassificationModelFromURL(args.URL);
  }

  /**
   * Set a model for sound classification from URL.
   * @param {object} args - the block's arguments.
   * @property {string} URL - URL of model to be loaded.
   * @return {Promise} - A Promise that resolve after loaded.
   */
  setSoundClassificationModelURL(args) {
    return this.loadSoundClassificationModelFromURL(args.URL);
  }

  /**
   * Load a model from URL for image classification.
   * @param {string} url - URL of model to be loaded.
   * @return {Promise} - A Promise that resolves after loaded.
   */
  loadImageClassificationModelFromURL(url) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().getTime();
      fetch("".concat(url, "metadata.json?").concat(timestamp)).then(res => {
        if (!res.ok) throw new Error("HTTP ".concat(res.status));
        return res.json();
      }).then(metadata => {
        if (url === this.imageModelUrl && new Date(metadata.timeStamp).getTime() === new Date(this.imageMetadata.timeStamp).getTime()) {
          log.info("image model already loaded: ".concat(url));
          resolve();
        } else {
          ml5.imageClassifier("".concat(url, "model.json?").concat(timestamp)).then(classifier => {
            this.imageModelUrl = url;
            this.imageMetadata = metadata;
            this.imageClassifier = classifier;
            this.initImageProbableLabels();
            log.info("image model loaded from: ".concat(url));
          }).catch(error => {
            this.lastError = error.message;
            reject(error);
          }).finally(() => resolve());
        }
      }).catch(error => {
        this.lastError = error.message;
        reject(error);
      });
    });
  }

  /**
   * Load a model from URL for sound classification.
   * @param {string} url - URL of model to be loaded.
   * @return {Promise} - A Promise that resolves after loaded.
   */
  loadSoundClassificationModelFromURL(url) {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().getTime();
      fetch("".concat(url, "metadata.json?").concat(timestamp)).then(res => {
        if (!res.ok) throw new Error("HTTP ".concat(res.status));
        return res.json();
      }).then(metadata => {
        if (url === this.soundModelUrl && new Date(metadata.timeStamp).getTime() === new Date(this.soundMetadata.timeStamp).getTime()) {
          log.info("sound model already loaded: ".concat(url));
          resolve();
        } else {
          ml5.soundClassifier("".concat(url, "model.json")).then(classifier => {
            this.soundModelUrl = url;
            this.soundMetadata = metadata;
            this.soundClassifier = classifier;
            this.initSoundProbableLabels();
            this.soundClassifierEnabled = true;
            this.classifySound();
            log.info("sound model loaded from: ".concat(url));
          }).catch(error => {
            this.lastError = error.message;
            reject(error);
          }).finally(() => resolve());
        }
      }).catch(error => {
        this.lastError = error.message;
        reject(error);
      });
    });
  }

  /**
   * Return menu items to detect label in the image.
   * @return {Array} - Menu items with 'any'.
   */
  getLabelsMenu() {
    let items = [Message.any[this.locale]];
    if (!this.imageMetadata) return items;
    items = items.concat(this.imageMetadata.labels);
    return items;
  }

  /**
   * Return menu items to detect label in the image.
   * @return {Array} - Menu items with 'any without of'.
   */
  getLabelsWithAnyWithoutOfMenu() {
    let items = [Message.any_without_of[this.locale]];
    if (!this.imageMetadata) return items;
    items = items.concat(this.imageMetadata.labels);
    return items;
  }

  /**
   * Return menu items to detect label in the image.
   * @return {Array} - Menu items with 'any'.
   */
  getSoundLabelsMenu() {
    let items = [Message.any[this.locale]];
    if (!this.soundMetadata) return items;
    items = items.concat(this.soundMetadata.wordLabels);
    return items;
  }

  /**
   * Return menu itmes to get properties of the image label.
   * @return {Array} - Menu items with ''.
   */
  getLabelsWithoutAnyMenu() {
    let items = [''];
    if (this.imageMetadata) {
      items = items.concat(this.imageMetadata.labels);
    }
    return items;
  }

  /**
   * Return menu itmes to get properties of the sound label.
   * @return {Array} - Menu items with ''.
   */
  getSoundLabelsWithoutAnyMenu() {
    if (this.soundMetadata) {
      return this.soundMetadata.wordLabels;
    } else {
      return [''];
    }
  }

  /**
   * Return menu itmes to get properties of the sound label.
   * @return {Array} - Menu items without '_background_noise_'.
   */
  getSoundLabelsWithoutBackgroundMenu() {
    let items = [Message.any[this.locale]];
    if (!this.soundMetadata) return items;
    let arr = this.soundMetadata.wordLabels;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== '_background_noise_') {
        items.push(arr[i]);
      }
    }
    return items;
  }

  /**
   * Return menu itmes to get properties of the sound label.
   * @return {Array} - Menu items without '_background_noise_' and with 'any without of'.
   */
  getSoundLabelsWithoutBackgroundWithAnyWithoutOfMenu() {
    let items = [Message.any_without_of[this.locale]];
    if (!this.soundMetadata) return items;
    let arr = this.soundMetadata.wordLabels;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] !== '_background_noise_') {
        items.push(arr[i]);
      }
    }
    return items;
  }

  /**
   * Pick a probability which has highest confidence.
   * @param {Array} probabilities - An Array of probabilities.
   * @property {number} probabilities.confidence - Probability of the label.
   * @return {object} - One of the highest confidence probability.
   */
  getMostProbableOne(probabilities) {
    if (probabilities.length === 0) return null;
    let mostOne = probabilities[0];
    probabilities.forEach(clss => {
      if (clss.confidence > mostOne.confidence) {
        mostOne = clss;
      }
    });
    return mostOne;
  }

  /**
   * Classify image from the video input.
   * Call stack will wait until the previous classification was done.
   *
   * @param {object} _args - the block's arguments.
   * @param {object} util - utility object provided by the runtime.
   * @return {Promise} - a Promise that resolves after classification.
   */
  classifyVideoImageBlock(_args, util) {
    if (this._isImageClassifying) {
      if (util) util.yield();
      return;
    }
    return new Promise(resolve => {
      this.classifyImage(this.video).then(result => {
        resolve(JSON.stringify(result));
      });
    });
  }

  /**
   * Classyfy image from input data source.
   *
   * @param {HTMLImageElement | ImageData | HTMLCanvasElement | HTMLVideoElement} input
   *  - Data source for classification.
   * @return {Promise} - A Promise that resolves the result of classification.
   *  The result will be empty when the imageClassifier was not set.
   */
  classifyImage(input) {
    if (!this.imageMetadata || !this.imageClassifier) {
      this._isImageClassifying = false;
      return Promise.resolve([]);
    }
    this._isImageClassifying = true;
    return this.imageClassifier.classify(input).then(result => {
      this.imageProbableLabels = result.slice();
      this.imageProbableLabelsUpdated = true;
      return result;
    }).finally(() => {
      setTimeout(() => {
        // Initialize probabilities to reset whenReceived blocks.
        this.initImageProbableLabels();
        this._isImageClassifying = false;
      }, this.interval);
    });
  }

  /**
   * Classify sound.
   */
  classifySound() {
    this.soundClassifier.classify((err, result) => {
      if (this.soundClassifierEnabled && result) {
        this.soundProbableLabels = result.slice();
        setTimeout(() => {
          // Initialize probabilities to reset whenReceivedSoundLabel blocks.
          this.initSoundProbableLabels();
        }, this.interval);
      }
      if (err) {
        console.error(err);
      }
    });
  }

  /**
   * Get the most probable label in the image.
   * Retrun the last classification result or '' when the first classification was not done.
   * @return {string} label
  */
  getImageLabel() {
    if (!this.imageProbableLabels || this.imageProbableLabels.length === 0) return '';
    const mostOne = this.getMostProbableOne(this.imageProbableLabels);
    return mostOne.confidence >= this.confidenceThreshold ? mostOne.label : '';
  }

  /**
   * Get the most probable label in the sound.
   * Retrun the last classification result or '' when the first classification was not done.
   * @return {string} label
  */
  getSoundLabel() {
    if (!this.soundProbableLabels || this.soundProbableLabels.length === 0) return '';
    const mostOne = this.getMostProbableOne(this.soundProbableLabels);
    return mostOne.confidence >= this.confidenceThreshold ? mostOne.label : '';
  }

  /**
   * Set confidence threshold which should be over for detected label.
   * @param {object} args - the block's arguments.
   * @property {number} CONFIDENCE_THRESHOLD - Value of confidence threshold.
   */
  setConfidenceThreshold(args) {
    let threshold = Cast.toNumber(args.CONFIDENCE_THRESHOLD);
    threshold = MathUtil.clamp(threshold, 0, 1);
    this.confidenceThreshold = threshold;
  }

  /**
   * Get confidence threshold which should be over for detected label.
   * @param {object} args - the block's arguments.
   * @return {number} - Value of confidence threshold.
   */
  getConfidenceThreshold() {
    return this.confidenceThreshold;
  }

  /**
   * Set state of the continuous classification.
   * @param {object} args - the block's arguments.
   * @property {string} CLASSIFICATION_STATE - State to be ['on'|'off'].
   */
  toggleClassification(args) {
    const state = args.CLASSIFICATION_STATE;
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.soundClassifierEnabled = false;
    if (state === 'on') {
      this.timer = setInterval(() => {
        Promise.resolve(this.classifyVideoImage()).catch(error => {
          this.lastError = error.message;
        });
      }, this.minInterval);
      this.soundClassifierEnabled = true;
    }
  }

  /**
   * Set interval time of the continuous classification.
   * @param {object} args - the block's arguments.
   * @property {number} CLASSIFICATION_INTERVAL - Interval time (seconds).
   */
  setClassificationInterval(args) {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.interval = args.CLASSIFICATION_INTERVAL * 1000;
    this.timer = setInterval(() => {
      Promise.resolve(this.classifyVideoImage()).catch(error => {
        this.lastError = error.message;
      });
    }, this.minInterval);
  }

  /**
   * Show video image on the stage or not.
   * @param {object} args - the block's arguments.
   * @property {string} VIDEO_STATE - Show or not ['on'|'off'].
   */
  videoToggle(args) {
    const state = args.VIDEO_STATE;
    if (state === 'off') {
      this.runtime.ioDevices.video.disableVideo();
    } else {
      this.dependenciesReady.then(() => this.disposed ? undefined : this.runtime.ioDevices.video.enableVideo());
      this.runtime.ioDevices.video.mirror = state === 'on';
    }
  }

  /**
   * Classify video image.
   * @return {Promise} - A Promise that resolves the result of classification.
   *  The result will be empty when another classification was under going.
   */
  classifyVideoImage() {
    if (this.disposed || !this.video) return;
    if (this._isImageClassifying) return Promise.resolve([]);
    return this.classifyImage(this.video);
  }

  /**
   * Return menu for video showing state.
   * @return {Array} - Menu items.
   */
  getVideoMenu() {
    return [{
      text: Message.off[this.locale],
      value: 'off'
    }, {
      text: Message.on[this.locale],
      value: 'on'
    }, {
      text: Message.video_on_flipped[this.locale],
      value: 'on-flipped'
    }];
  }

  /**
   * Return menu for classification interval setting.
   * @return {object} - Menu.
   */
  getClassificationIntervalMenu() {
    return {
      acceptReporters: true,
      items: [{
        text: '1',
        value: '1'
      }, {
        text: '0.5',
        value: '0.5'
      }, {
        text: '0.2',
        value: '0.2'
      }, {
        text: '0.1',
        value: '0.1'
      }]
    };
  }

  /**
   * Return menu for continuous classification state.
   * @return {Array} - Menu items.
   */
  getClassificationMenu() {
    return [{
      text: Message.off[this.locale],
      value: 'off'
    }, {
      text: Message.on[this.locale],
      value: 'on'
    }];
  }

  /**
   * Get locale for message text.
   * @return {string} - Locale of this editor.
   */
  setLocale() {
    const locale = formatMessage.setup().locale;
    if (AvailableLocales.includes(locale)) {
      return locale;
    }
    return 'en';
  }
  switchCamera(args) {
    if (args.DEVICE !== '') {
      if (this.runtime.ioDevices.video.provider._track !== null) {
        this.runtime.ioDevices.video.provider._track.stop();
        const deviceId = args.DEVICE;
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            deviceId
          }
        }).then(stream => {
          try {
            this.runtime.ioDevices.video.provider._video.srcObject = stream;
          } catch (error) {
            this.runtime.ioDevices.video.provider._video.src = window.URL.createObjectURL(stream);
          }
          // Needed for Safari/Firefox, Chrome auto-plays.
          this.runtime.ioDevices.video.provider._video.play();
          this.runtime.ioDevices.video.provider._track = stream.getTracks()[0];
        });
      }
    }
  }
  getDevices() {
    return this.devices;
  }
  getBasename(url) {
    url = url.replace(/\/+$/, '');
    return url.split('/').pop();
  }
}
module.exports = Scratch3TM2ScratchBlocks;

/***/ }),

/***/ "./src/lib/libraries/extensions/stretch/vendor/tmpose2scratch.js":
/*!***********************************************************************!*\
  !*** ./src/lib/libraries/extensions/stretch/vendor/tmpose2scratch.js ***!
  \***********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
  ml5,
  tmPose,
  librariesReady
} = __webpack_require__(/*! ../runtime */ "./src/lib/libraries/extensions/stretch/runtime.js");
/* Adapted for Unifiscratch; provenance and original hash: ../upstream.json. */
const ArgumentType = __webpack_require__(/*! unifiscratch-vm/extension-support/argument-type */ "./node_modules/scratch-vm/src/extension-support/argument-type.js");
const BlockType = __webpack_require__(/*! unifiscratch-vm/extension-support/block-type */ "./node_modules/scratch-vm/src/extension-support/block-type.js");
const Cast = __webpack_require__(/*! unifiscratch-vm/util/cast */ "./node_modules/scratch-vm/src/util/cast.js");
const MathUtil = __webpack_require__(/*! unifiscratch-vm/util/math-util */ "./node_modules/scratch-vm/src/util/math-util.js");
const log = __webpack_require__(/*! unifiscratch-vm/util/log */ "./node_modules/scratch-vm/src/util/log.js");
const formatMessage = __webpack_require__(/*! format-message */ "./node_modules/format-message/index.js");
// eslint-disable-next-line max-len
const blockIconURI = 'data:image/png;base64,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';
const Message = {
  pose_classification_model_url: {
    'ja': 'ポーズ分類モデルURL[URL]',
    'ja-Hira': 'ポーズぶんるいモデル[URL]',
    'en': 'pose classification model URL [URL]',
    'ko': '포즈 인식 모델 URL [URL]'
  },
  pose_classification_sample_model_url: {
    'ja': 'https://teachablemachine.withgoogle.com/models/aqQcgCOtq/',
    'ja-Hira': 'https://teachablemachine.withgoogle.com/models/aqQcgCOtq/',
    'en': ' ',
    'ko': ' '
  },
  classify_pose: {
    'ja': 'ポーズを推定する',
    'ja-Hira': 'ポーズをすいていする',
    'en': 'estimate pose',
    'ko': '포즈 인식하기'
  },
  pose_label: {
    'ja': 'ポーズラベル',
    'ja-Hira': 'ポーズラベル',
    'en': 'pose label',
    'ko': '포즈 라벨'
  },
  is_pose_label_detected: {
    'ja': '[LABEL]のポーズになった',
    'ja-Hira': '[LABEL]のポーズになった',
    'en': 'pose [LABEL] detected',
    'ko': '[LABEL] 포즈가 인식됨'
  },
  pose_label_confidence: {
    'ja': 'ポーズラベル[LABEL]の確度',
    'ja-Hira': 'ポーズラベル[LABEL]のかくど',
    'en': 'confidence of pose [LABEL]',
    'ko': '[LABEL] 포즈의 신뢰도'
  },
  when_received_pose_label_block: {
    'ja': 'ポーズラベル[LABEL]を受け取ったとき',
    'ja-Hira': 'ポーズラベル[LABEL]をうけとったとき',
    'en': 'when received pose label:[LABEL]',
    'ko': '[LABEL] 포즈 라벨을 받았을 때:'
  },
  label_block: {
    'ja': 'ラベル',
    'ja-Hira': 'ラベル',
    'en': 'label',
    'ko': '라벨',
    'zh-cn': '标签'
  },
  any: {
    'ja': 'のどれか',
    'ja-Hira': 'のどれか',
    'en': 'any',
    'ko': '어떤',
    'zh-cn': '任何'
  },
  any_without_of: {
    'ja': 'どれか',
    'ja-Hira': 'どれか',
    'en': 'any',
    'ko': '어떤',
    'zh-cn': '任何'
  },
  all: {
    'ja': 'の全て',
    'ja-Hira': 'のすべて',
    'en': 'all',
    'ko': '모든',
    'zh-cn': '所有'
  },
  toggle_classification: {
    'ja': 'ラベル付けを[CLASSIFICATION_STATE]にする',
    'ja-Hira': 'ラベルづけを[CLASSIFICATION_STATE]にする',
    'en': 'turn classification [CLASSIFICATION_STATE]',
    'ko': '라벨 분류 [CLASSIFICATION_STATE]',
    'zh-cn': '[CLASSIFICATION_STATE]分类'
  },
  set_confidence_threshold: {
    'ja': '確度のしきい値を[CONFIDENCE_THRESHOLD]にする',
    'ja-Hira': 'かくどのしきいちを[CONFIDENCE_THRESHOLD]にする',
    'en': 'set confidence threshold [CONFIDENCE_THRESHOLD]',
    'ko': '신뢰도 기준 설정 [CONFIDENCE_THRESHOLD]'
  },
  get_confidence_threshold: {
    'ja': '確度のしきい値',
    'ja-Hira': 'かくどのしきいち',
    'en': 'confidence threshold',
    'ko': '신뢰도 기준'
  },
  set_classification_interval: {
    'ja': 'ラベル付けを[CLASSIFICATION_INTERVAL]秒間に1回行う',
    'ja-Hira': 'ラベルづけを[CLASSIFICATION_INTERVAL]びょうかんに1かいおこなう',
    'en': 'Label once every [CLASSIFICATION_INTERVAL] seconds',
    'ko': '신뢰도 기준 설정 [CONFIDENCE_THRESHOLD]',
    'zh-cn': '每隔[CLASSIFICATION_INTERVAL]秒标记一次'
  },
  video_toggle: {
    'ja': 'ビデオを[VIDEO_STATE]にする',
    'ja-Hira': 'ビデオを[VIDEO_STATE]にする',
    'en': 'turn video [VIDEO_STATE]',
    'ko': '비디오 화면 [VIDEO_STATE]',
    'zh-cn': '[VIDEO_STATE]摄像头'
  },
  on: {
    'ja': '入',
    'ja-Hira': 'いり',
    'en': 'on',
    'ko': '켜기',
    'zh-cn': '开启'
  },
  off: {
    'ja': '切',
    'ja-Hira': 'きり',
    'en': 'off',
    'ko': '멈추기',
    'zh-cn': '关闭'
  },
  video_on_flipped: {
    'ja': '左右反転',
    'ja-Hira': 'さゆうはんてん',
    'en': 'on flipped',
    'ko': '좌우 뒤집기',
    'zh-cn': '镜像开启'
  }
};
const AvailableLocales = ['en', 'ja', 'ja-Hira', 'ko', 'zh-cn'];
class Scratch3TMPose2ScratchBlocks {
  constructor(runtime) {
    this.runtime = runtime;
    this.dependenciesReady = librariesReady();
    this.dependenciesReady.catch(error => {
      this.lastError = error.message;
    });
    this.locale = this.setLocale();
    this.interval = 1000;
    this.minInterval = 100;
    this.poseTimer = setInterval(() => {
      Promise.resolve(this.classifyPoseInVideo()).catch(error => {
        this.lastError = error.message;
      });
    }, this.minInterval);
    this.poseModelUrl = null;
    this.poseMetadata = null;
    this.poseModel = null;
    this.initPoseProbableLabels();
    this.confidenceThreshold = 0.5;
    this.dependenciesReady.then(() => this.disposed ? undefined : this.runtime.ioDevices.video.enableVideo());
    this.runtime.ioDevices.video.mirror = true;
  }

  /**
   * Initialize the result of pose estimation.
   */
  initPoseProbableLabels() {
    this.poseProbableLabels = [];
  }
  getInfo() {
    this.locale = this.setLocale();
    return {
      id: 'tmpose2scratch',
      name: 'TMPose2Scratch',
      blockIconURI: blockIconURI,
      blocks: [{
        opcode: 'whenPoseLabelReceived',
        text: Message.when_received_pose_label_block[this.locale],
        blockType: BlockType.HAT,
        arguments: {
          LABEL: {
            type: ArgumentType.STRING,
            menu: 'received_pose_label_menu',
            defaultValue: Message.any[this.locale]
          }
        }
      }, {
        opcode: 'isPoseLabelDetected',
        text: Message.is_pose_label_detected[this.locale],
        blockType: BlockType.BOOLEAN,
        arguments: {
          LABEL: {
            type: ArgumentType.STRING,
            menu: 'pose_labels_menu',
            defaultValue: Message.any_without_of[this.locale]
          }
        }
      }, {
        opcode: 'poseLabelConfidence',
        text: Message.pose_label_confidence[this.locale],
        blockType: BlockType.REPORTER,
        disableMonitor: true,
        arguments: {
          LABEL: {
            type: ArgumentType.STRING,
            menu: 'pose_labels_without_any_menu',
            defaultValue: ''
          }
        }
      }, {
        opcode: 'setPoseClassificationModelURL',
        text: Message.pose_classification_model_url[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          URL: {
            type: ArgumentType.STRING,
            defaultValue: Message.pose_classification_sample_model_url[this.locale]
          }
        }
      }, {
        opcode: 'classifyVideoPoseBlock',
        text: Message.classify_pose[this.locale],
        blockType: BlockType.COMMAND
      }, {
        opcode: 'getPoseLabel',
        text: Message.pose_label[this.locale],
        blockType: BlockType.REPORTER
      }, '---', {
        opcode: 'toggleClassification',
        text: Message.toggle_classification[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          CLASSIFICATION_STATE: {
            type: ArgumentType.STRING,
            menu: 'classification_menu',
            defaultValue: 'off'
          }
        }
      }, {
        opcode: 'setClassificationInterval',
        text: Message.set_classification_interval[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          CLASSIFICATION_INTERVAL: {
            type: ArgumentType.STRING,
            menu: 'classification_interval_menu',
            defaultValue: '1'
          }
        }
      }, {
        opcode: 'setConfidenceThreshold',
        text: Message.set_confidence_threshold[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          CONFIDENCE_THRESHOLD: {
            type: ArgumentType.NUMBER,
            defaultValue: 0.5
          }
        }
      }, {
        opcode: 'getConfidenceThreshold',
        text: Message.get_confidence_threshold[this.locale],
        blockType: BlockType.REPORTER,
        disableMonitor: true
      }, {
        opcode: 'videoToggle',
        text: Message.video_toggle[this.locale],
        blockType: BlockType.COMMAND,
        arguments: {
          VIDEO_STATE: {
            type: ArgumentType.STRING,
            menu: 'video_menu',
            defaultValue: 'off'
          }
        }
      }],
      menus: {
        received_pose_label_menu: {
          acceptReporters: true,
          items: 'getPoseLabelsMenu'
        },
        pose_labels_menu: {
          acceptReporters: true,
          items: 'getPoseLabelsWithAnyWithoutOfMenu'
        },
        pose_labels_without_any_menu: {
          acceptReporters: true,
          items: 'getPoseLabelsWithoutAnyMenu'
        },
        video_menu: this.getVideoMenu(),
        classification_interval_menu: this.getClassificationIntervalMenu(),
        classification_menu: this.getClassificationMenu()
      }
    };
  }

  /**
   * Return whether the most probable label of pose is the selected one.
   * @param {object} args - The block's arguments.
   * @property {string} LABEL - The label to detect.
   * @return {boolean} - Whether the label is most probable or not.
   */
  whenPoseLabelReceived(args) {
    const label = this.getPoseLabel();
    if (args.LABEL === Message.any[this.locale]) {
      return label !== '';
    }
    return label === args.LABEL;
  }

  /**
   * Return whether the most probable pose label is the selected one or not.
   * @param {object} args - The block's arguments.
   * @property {string} LABEL - The label to detect.
   * @return {boolean} - Whether the label is most probable or not.
   */
  isPoseLabelDetected(args) {
    const label = this.getPoseLabel();
    if (args.LABEL === Message.any[this.locale]) {
      return label !== '';
    }
    return label === args.LABEL;
  }

  /**
   * Return confidence of the pose label.
   * @param {object} args - The block's arguments.
   * @property {string} LABEL - Selected label.
   * @return {number} - Confidence of the label.
   */
  poseLabelConfidence(args) {
    if (args.LABEL === '') {
      return 0;
    }
    const entry = this.poseProbableLabels.find(element => element.className === args.LABEL);
    return entry ? entry.probability : 0;
  }

  /**
   * Set a model for pose classification from URL.
   * @param {object} args - the block's arguments.
   * @property {string} URL - URL of model to be loaded.
   * @return {Promise} - A Promise that resolve after loaded.
   */
  setPoseClassificationModelURL(args) {
    return this.loadPoseClassificationModelFromURL(args.URL);
  }

  /**
   * Load a model from URL for pose classification.
   * @param {string} url - URL of model to be loaded.
   * @return {Promise} - A Promise that resolves after loaded.
   */
  loadPoseClassificationModelFromURL(url) {
    return new Promise((resolve, reject) => {
      fetch("".concat(url, "metadata.json")).then(res => {
        if (!res.ok) throw new Error("HTTP ".concat(res.status));
        return res.json();
      }).then(metadata => {
        if (url === this.poseModelUrl && new Date(metadata.timeStamp).getTime() === new Date(this.poseMetadata.timeStamp).getTime()) {
          log.info("pose model already loaded: ".concat(url));
          resolve();
        } else {
          const modelURL = "".concat(url, "model.json");
          const metadataURL = "".concat(url, "metadata.json");

          // eslint-disable-next-line no-undef
          tmPose.load(modelURL, metadataURL).then(poseModel => {
            this.poseModel = poseModel;
            this.poseMetadata = metadata;
            log.info("pose model loaded from: ".concat(url));
          }).catch(error => {
            this.lastError = error.message;
            reject(error);
          }).finally(() => resolve());
        }
      }).catch(error => {
        this.lastError = error.message;
        reject(error);
      });
    });
  }

  /**
   * Return menu items to detect the pose label.
   * @return {Array} - Menu items with 'any'.
   */
  getPoseLabelsMenu() {
    let items = [Message.any[this.locale]];
    if (!this.poseMetadata) return items;
    items = items.concat(this.poseMetadata.labels);
    return items;
  }

  /**
   * Return menu items to detect the pose label.
   * @return {Array} - Menu items with 'any without of'.
   */
  getPoseLabelsWithAnyWithoutOfMenu() {
    let items = [Message.any_without_of[this.locale]];
    if (!this.poseMetadata) return items;
    items = items.concat(this.poseMetadata.labels);
    return items;
  }

  /**
   * Return menu itmes to get properties of the pose label.
   * @return {Array} - Menu items with ''.
   */
  getPoseLabelsWithoutAnyMenu() {
    let items = [''];
    if (this.poseMetadata) {
      items = items.concat(this.poseMetadata.labels);
    }
    return items;
  }

  /**
   * Classify pose from the video input.
   * Call stack will wait until the previous classification was done.
   *
   * @param {object} _args - the block's arguments.
   * @param {object} util - utility object provided by the runtime.
   * @return {Promise} - a Promise that resolves after classification.
   */
  classifyVideoPoseBlock(_args, util) {
    if (this._isPoseClassifying) {
      if (util) util.yield();
      return;
    }
    return new Promise(resolve => {
      this.classifyPoseInVideo().then(result => {
        resolve(JSON.stringify(result));
      });
    });
  }

  /**
   * Classyfy pose from input data source.
   *
   * @param {HTMLImageElement | ImageData | HTMLCanvasElement | HTMLVideoElement} input
   *  - Data source for classification.
   * @param {boolean} isMirror - Input is morror mode or not.
   * @return {Promise} - A Promise that resolves the result of classification.
   *  The result will be empty when the poseModel was not set.
   */
  classifyPose(input, isMirror) {
    if (!this.poseMetadata || !this.poseModel) {
      this._isPoseClassifying = false;
      return Promise.resolve([]);
    }
    this._isPoseClassifying = true;
    return this.poseModel.estimatePose(input, isMirror).then(estimated => {
      this.poseKeypoints = estimated.pose ? estimated.pose.keypoints : [];
      this.poseScore = estimated.pose ? estimated.pose.score : 0;
      return this.poseModel.predict(estimated.posenetOutput);
    }).then(prediction => {
      this.poseProbableLabels = prediction;
      return prediction;
    }).finally(() => {
      setTimeout(() => {
        // Initialize probabilities to reset whenReceived blocks.
        this.initPoseProbableLabels();
        this._isPoseClassifying = false;
      }, this.interval);
    });
  }
  getPoseLabel() {
    if (!this.poseProbableLabels || this.poseProbableLabels.length === 0) return '';
    const mostOne = this.poseProbableLabels.reduce((prev, cur) => prev.probability < cur.probability ? cur : prev);
    return mostOne.probability >= this.confidenceThreshold ? mostOne.className : '';
  }

  /**
   * Set confidence threshold which should be over for detected label.
   * @param {object} args - the block's arguments.
   * @property {number} CONFIDENCE_THRESHOLD - Value of confidence threshold.
   */
  setConfidenceThreshold(args) {
    let threshold = Cast.toNumber(args.CONFIDENCE_THRESHOLD);
    threshold = MathUtil.clamp(threshold, 0, 1);
    this.confidenceThreshold = threshold;
  }

  /**
   * Get confidence threshold which should be over for detected label.
   * @param {object} args - the block's arguments.
   * @return {number} - Value of confidence threshold.
   */
  getConfidenceThreshold() {
    return this.confidenceThreshold;
  }

  /**
   * Set state of the continuous classification.
   * @param {object} args - the block's arguments.
   * @property {string} CLASSIFICATION_STATE - State to be ['on'|'off'].
   */
  toggleClassification(args) {
    const state = args.CLASSIFICATION_STATE;
    if (this.poseTimer) {
      clearTimeout(this.poseTimer);
    }
    if (state === 'on') {
      this.poseTimer = setInterval(() => {
        Promise.resolve(this.classifyPoseInVideo()).catch(error => {
          this.lastError = error.message;
        });
      }, this.minInterval);
    }
  }

  /**
   * Set interval time of the continuous pose classification.
   * @param {object} args - the block's arguments.
   * @property {number} CLASSIFICATION_INTERVAL - Interval time (seconds).
   */
  setClassificationInterval(args) {
    if (this.poseTimer) {
      clearTimeout(this.poseTimer);
    }
    this.interval = args.CLASSIFICATION_INTERVAL * 1000;
    this.poseTimer = setInterval(() => {
      Promise.resolve(this.classifyPoseInVideo()).catch(error => {
        this.lastError = error.message;
      });
    }, this.minInterval);
  }

  /**
   * Show video image on the stage or not.
   * @param {object} args - the block's arguments.
   * @property {string} VIDEO_STATE - Show or not ['on'|'off'].
   */
  videoToggle(args) {
    const state = args.VIDEO_STATE;
    if (state === 'off') {
      this.runtime.ioDevices.video.setPreviewGhost(100);
    } else {
      this.runtime.ioDevices.video.setPreviewGhost(0);
      this.runtime.ioDevices.video.mirror = state === 'on';
    }
  }

  /**
   * Classify pose in video.
   * @return {Promise} - A Promise that resolves the result of classification.
   *  The result will be empty when another classification was under going.
   */
  classifyPoseInVideo() {
    if (this.disposed) return;
    if (this._isPoseClassifying) return Promise.resolve([]);
    return this.classifyPose(this.runtime.ioDevices.video.getFrame({
      mirror: true
    }), true);
  }

  /**
   * Return menu for video showing state.
   * @return {Array} - Menu items.
   */
  getVideoMenu() {
    return [{
      text: Message.off[this.locale],
      value: 'off'
    }, {
      text: Message.on[this.locale],
      value: 'on'
    }, {
      text: Message.video_on_flipped[this.locale],
      value: 'on-flipped'
    }];
  }

  /**
   * Return menu for classification interval setting.
   * @return {object} - Menu.
   */
  getClassificationIntervalMenu() {
    return {
      acceptReporters: true,
      items: [{
        text: '1',
        value: '1'
      }, {
        text: '0.5',
        value: '0.5'
      }, {
        text: '0.2',
        value: '0.2'
      }, {
        text: '0.1',
        value: '0.1'
      }]
    };
  }

  /**
   * Return menu for continuous classification state.
   * @return {Array} - Menu items.
   */
  getClassificationMenu() {
    return [{
      text: Message.off[this.locale],
      value: 'off'
    }, {
      text: Message.on[this.locale],
      value: 'on'
    }];
  }

  /**
   * Get locale for message text.
   * @return {string} - Locale of this editor.
   */
  setLocale() {
    const locale = formatMessage.setup().locale;
    if (AvailableLocales.includes(locale)) {
      return locale;
    }
    return 'en';
  }
}
module.exports = Scratch3TMPose2ScratchBlocks;

/***/ })

}]);
//# sourceMappingURL=src_lib_libraries_extensions_stretch_index_js.0ee9f36afe299fcfacf8.js.map