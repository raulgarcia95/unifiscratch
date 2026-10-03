// Build-time compatibility patches. Downloaded sources remain byte-identical to the lock.
// Fail on upstream changes so a refreshed module cannot silently skip a required fix.
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
    return source;
};
