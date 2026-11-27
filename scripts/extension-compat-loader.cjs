// Build-time compatibility patches. Downloaded sources remain byte-identical to the lock.
// Fail on upstream changes so a refreshed module cannot silently skip a required fix.
// Version that @latest resolved to on 2026-11-27 (published 2026-11-11).
const MEDIAPIPE_TASKS_VISION = '1.2.3';
function replaceOnce(source, before, after) {
    if (source.split(before).length !== 2) throw new Error(`Compatibility patch mismatch: ${before}`);
    return source.replace(before, after);
}
module.exports = function (source) {
    if (this.resourcePath.includes('posenet2scratch')) {
        source = replaceOnce(source, '_this.video.width = 480;',
            "if (!_this.video) { _this.lastError = 'Camera unavailable'; return; }\n    _this.video.width = 480;");
        source = replaceOnce(source, 'this.runtime.ioDevices.video.enableVideo().then(detectPose);',
            'this.runtime.ioDevices.video.enableVideo().then(detectPose).catch(function (error) { _this.lastError = error.message; });');
    }
    if (this.resourcePath.includes('speech2scratch')) {
        source = replaceOnce(source, 'var SpeechRecognition = webkitSpeechRecognition || SpeechRecognition;',
            "var SpeechRecognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;\n    if (!SpeechRecognition) throw new Error('Speech recognition unavailable in this browser');");
    }
    if (this.resourcePath.includes('xcx-mp-hand') || this.resourcePath.includes('xcx-mp-image-embed')) {
        // Pin MediaPipe instead of @latest so a new upstream release cannot break the extension overnight.
        source = replaceOnce(source, "@mediapipe/tasks-vision@latest'", `@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION}'`);
        source = replaceOnce(source, "@mediapipe/tasks-vision@latest/wasm'", `@mediapipe/tasks-vision@${MEDIAPIPE_TASKS_VISION}/wasm'`);
    }
    return source;
};
module.exports.MEDIAPIPE_TASKS_VISION = MEDIAPIPE_TASKS_VISION;
