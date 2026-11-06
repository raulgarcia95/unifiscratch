/* eslint-disable max-len */
// Face Sensing for Unifiscratch.
//
// Independent implementation of the ideas of the Scratch Lab "Face Sensing"
// experiment: sprites can follow parts of the face, tilt with the head and
// grow with the face. It uses Google MediaPipe Face Landmarker (Apache-2.0),
// pinned to one version. MediaPipe runs on WebAssembly and does not share the
// TensorFlow.js globals that other AI extensions use. Images are analysed in
// the browser; nothing is uploaded, although the library and model are
// downloaded once.
//
// The model runs on the same 480x360 frame that Scratch shows on the stage, so
// keypoints are in stage pixels and already follow the mirror setting.
import {boundedNumber} from './micropython-transport.mjs';
import {makeIcon, msg} from './unifiscratch-extra-hardware.mjs';

const STAGE_WIDTH = 480;
const STAGE_HEIGHT = 360;
const FRAME_INTERVAL = 66;
const LOST_AFTER_MS = 600;
const MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Landmarks come normalised to 0..1; convert them to frame pixels.
export const landmarksToMesh = landmarks => landmarks.map(point => [point.x * STAGE_WIDTH, point.y * STAGE_HEIGHT]);

let landmarkerReady;
const loadLandmarker = () => {
    if (!landmarkerReady) {
        landmarkerReady = (async () => {
            const vision = await import(/* webpackIgnore: true */ `${MEDIAPIPE}/vision_bundle.mjs`);
            const files = await vision.FilesetResolver.forVisionTasks(`${MEDIAPIPE}/wasm`);
            const create = delegate => vision.FaceLandmarker.createFromOptions(files, {
                baseOptions: {modelAssetPath: FACE_MODEL, delegate},
                runningMode: 'VIDEO',
                numFaces: 1
            });
            try {
                return await create('GPU');
            } catch (error) {
                return create('CPU');
            }
        })();
        landmarkerReady.catch(() => {
            landmarkerReady = null;
        });
    }
    return landmarkerReady;
};

// FaceMesh (MediaPipe 468-point topology). "A" is the side the model calls
// right: the person's right in a normal camera image.
const KEYPOINTS = {
    nose: [1],
    forehead: [10],
    chin: [152],
    betweenEyes: [168],
    mouth: [13, 14],
    eyeA: [33, 133],
    eyeB: [263, 362],
    earA: [234],
    earB: [454]
};

const average = (mesh, indices) => {
    const points = indices.map(index => mesh[index]).filter(Boolean);
    if (points.length === 0) return null;
    return [
        points.reduce((sum, point) => sum + point[0], 0) / points.length,
        points.reduce((sum, point) => sum + point[1], 0) / points.length
    ];
};

export const toStage = ([x, y]) => ({
    x: Math.round(x - (STAGE_WIDTH / 2)),
    y: Math.round((STAGE_HEIGHT / 2) - y)
});

// A mirrored frame swaps the anatomical sides the model reports.
export const partIndices = (part, mirrored) => {
    const sides = {
        leftEye: mirrored ? 'eyeA' : 'eyeB',
        rightEye: mirrored ? 'eyeB' : 'eyeA',
        leftEar: mirrored ? 'earA' : 'earB',
        rightEar: mirrored ? 'earB' : 'earA'
    };
    return KEYPOINTS[sides[part] || part] || null;
};

export const facePart = (mesh, part, mirrored) => {
    const indices = partIndices(part, mirrored);
    const point = indices && average(mesh, indices);
    return point ? toStage(point) : null;
};

// Scratch direction: 90 when the head is upright, larger when it leans right on screen.
export const faceTilt = mesh => {
    const a = average(mesh, KEYPOINTS.eyeA);
    const b = average(mesh, KEYPOINTS.eyeB);
    if (!a || !b) return 90;
    const [left, right] = [toStage(a), toStage(b)].sort((p, q) => p.x - q.x);
    const angle = Math.atan2(right.y - left.y, right.x - left.x) * 180 / Math.PI;
    return Math.round(90 - angle);
};

export const faceSize = mesh => {
    const a = average(mesh, KEYPOINTS.earA);
    const b = average(mesh, KEYPOINTS.earB);
    if (!a || !b) return 0;
    return Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]));
};

const id = 'faceSensing';
const name = 'Face Sensing';
const icon = {title: 'FACE', body: 'SENSING', kind: 'face', color1: '#7c3aed', color2: '#facc15', color3: '#4c1d95'};
const t = (key, text) => msg(`${id}.${key}`, text);

const blockClass = class FaceSensing {
    constructor (runtime) {
        this.runtime = runtime;
        this.mesh = null;
        this.lastSeen = 0;
        this.lastError = '';
        this.running = false;
        if (runtime && runtime.on) {
            runtime.on('RUNTIME_DISPOSED', () => this.halt());
        }
    }

    get video () {
        return this.runtime && this.runtime.ioDevices && this.runtime.ioDevices.video;
    }

    getInfo () {
        return {
            id,
            name,
            color1: icon.color1,
            color2: icon.color2,
            color3: icon.color3,
            blocks: [
                {opcode: 'whenFaceDetected', blockType: 'hat', isEdgeActivated: true, text: t('whenDetected', 'when a face is detected')},
                {opcode: 'faceDetected', blockType: 'Boolean', text: t('detected', 'face detected?')},
                '---',
                {
                    opcode: 'goToPart',
                    blockType: 'command',
                    text: t('goToPart', 'go to [PART]'),
                    arguments: {PART: {type: 'string', menu: 'parts', defaultValue: 'nose'}}
                },
                {opcode: 'pointInTiltDirection', blockType: 'command', text: t('pointTilt', 'point in direction of face tilt')},
                {opcode: 'setSizeToFace', blockType: 'command', text: t('setSize', 'set size to face size')},
                '---',
                {
                    opcode: 'partPosition',
                    blockType: 'reporter',
                    text: t('partPosition', '[COORDINATE] of [PART]'),
                    arguments: {
                        COORDINATE: {type: 'string', menu: 'coordinates', defaultValue: 'x'},
                        PART: {type: 'string', menu: 'parts', defaultValue: 'nose'}
                    }
                },
                {opcode: 'tilt', blockType: 'reporter', text: t('tilt', 'face tilt')},
                {opcode: 'size', blockType: 'reporter', text: t('size', 'face size')},
                '---',
                {
                    opcode: 'videoToggle',
                    blockType: 'command',
                    text: t('video', 'turn video [STATE]'),
                    arguments: {STATE: {type: 'string', menu: 'videoState', defaultValue: 'on'}}
                },
                {
                    opcode: 'setVideoTransparency',
                    blockType: 'command',
                    text: t('transparency', 'set video transparency to [TRANSPARENCY]'),
                    arguments: {TRANSPARENCY: {type: 'number', defaultValue: 50}}
                },
                {opcode: 'status', blockType: 'reporter', text: t('status', 'face sensing status'), disableMonitor: true}
            ],
            menus: {
                parts: {acceptReporters: true,
                    items: [
                        {text: t('nose', 'nose'), value: 'nose'},
                        {text: t('mouth', 'mouth'), value: 'mouth'},
                        {text: t('leftEye', 'left eye'), value: 'leftEye'},
                        {text: t('rightEye', 'right eye'), value: 'rightEye'},
                        {text: t('betweenEyes', 'between eyes'), value: 'betweenEyes'},
                        {text: t('leftEar', 'left ear'), value: 'leftEar'},
                        {text: t('rightEar', 'right ear'), value: 'rightEar'},
                        {text: t('forehead', 'top of head'), value: 'forehead'},
                        {text: t('chin', 'chin'), value: 'chin'}
                    ]},
                coordinates: {acceptReporters: false, items: ['x', 'y']},
                videoState: {acceptReporters: true,
                    items: [
                        {text: t('off', 'off'), value: 'off'},
                        {text: t('on', 'on'), value: 'on'},
                        {text: t('flipped', 'on flipped'), value: 'on-flipped'}
                    ]}
            }
        };
    }

    mirrored () {
        return !this.video || this.video.mirror !== false;
    }

    // Starts the camera and the model the first time any block needs them.
    start (retry = false) {
        if (this.starting) return this.starting;
        // After a failure (no camera, permission denied) do not ask again on
        // every frame; the "turn video" block retries explicitly.
        if (this.failed && !retry) return Promise.resolve();
        this.failed = false;
        const video = this.video;
        if (!video) {
            this.lastError = 'Cámara no disponible en este entorno.';
            return Promise.resolve();
        }
        if (typeof video.mirror !== 'boolean') video.mirror = true;
        this.running = true;
        this.lastError = 'Cargando el modelo de caras...';
        this.starting = Promise.all([loadLandmarker(), video.enableVideo()])
            .then(([model]) => {
                this.model = model;
                this.lastError = '';
                this.loop();
            })
            .catch(error => {
                this.lastError = `Face Sensing: ${error && error.message ? error.message : error}`;
                this.running = false;
                this.starting = null;
                this.failed = true;
            });
        return this.starting;
    }

    loop () {
        if (!this.running || !this.model) return;
        const next = () => {
            if (this.running) this.timer = setTimeout(() => this.loop(), FRAME_INTERVAL);
        };
        const frame = this.video && this.video.getFrame({format: 'canvas', dimensions: [STAGE_WIDTH, STAGE_HEIGHT]});
        if (!frame) {
            next();
            return;
        }
        try {
            // Timestamps must increase for MediaPipe's VIDEO mode.
            this.timestamp = Math.max((this.timestamp || 0) + 1, Math.round(performance.now()));
            const result = this.model.detectForVideo(frame, this.timestamp);
            const face = result && result.faceLandmarks && result.faceLandmarks[0];
            if (face && face.length >= 468) {
                this.mesh = landmarksToMesh(face);
                this.lastSeen = Date.now();
            }
        } catch (error) {
            this.lastError = `Face Sensing: ${error.message}`;
        }
        next();
    }

    halt () {
        this.running = false;
        clearTimeout(this.timer);
        this.mesh = null;
        this.starting = null;
    }

    detected () {
        this.start();
        return Boolean(this.mesh && Date.now() - this.lastSeen < LOST_AFTER_MS);
    }

    whenFaceDetected () {
        return this.detected();
    }

    faceDetected () {
        return this.detected();
    }

    goToPart (args, util) {
        if (!this.detected()) return;
        const point = facePart(this.mesh, args.PART, this.mirrored());
        if (point && util && util.target) util.target.setXY(point.x, point.y);
    }

    pointInTiltDirection (args, util) {
        if (!this.detected()) return;
        if (util && util.target) util.target.setDirection(faceTilt(this.mesh));
    }

    setSizeToFace (args, util) {
        if (!this.detected()) return;
        if (util && util.target) util.target.setSize(faceSize(this.mesh));
    }

    partPosition (args) {
        if (!this.detected()) return '';
        const point = facePart(this.mesh, args.PART, this.mirrored());
        if (!point) return '';
        return args.COORDINATE === 'y' ? point.y : point.x;
    }

    tilt () {
        return this.detected() ? faceTilt(this.mesh) : 90;
    }

    size () {
        return this.detected() ? faceSize(this.mesh) : 0;
    }

    videoToggle (args) {
        const video = this.video;
        if (!video) return;
        if (args.STATE === 'off') {
            this.halt();
            video.disableVideo();
            return;
        }
        video.mirror = args.STATE !== 'on-flipped';
        if (!this.running) this.starting = null;
        return this.start(true);
    }

    setVideoTransparency (args) {
        if (this.video) this.video.setPreviewGhost(boundedNumber(args.TRANSPARENCY, 0, 100));
    }

    status () {
        return this.lastError;
    }
};
blockClass.EXTENSION_ID = id;

const iconURL = makeIcon(icon);
const entry = {
    name,
    extensionId: id,
    collaborator: 'Unifiscratch (MediaPipe)',
    iconURL,
    insetIconURL: iconURL,
    description: msg('faceSensing.description', 'Sprites follow the nose, eyes or mouth, tilt with your head and grow with your face. Uses the camera; images stay in the browser.'),
    tags: ['ai', 'image'],
    featured: true,
    disabled: false,
    category: 'ai',
    helpLink: 'https://lab.scratch.mit.edu/face/'
};

export {entry, blockClass};
