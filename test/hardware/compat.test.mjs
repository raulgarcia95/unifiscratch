import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const patch = createRequire(import.meta.url)('../../scripts/extension-compat-loader.cjs');
const manifest = JSON.parse(await fs.readFile('preload/preload.json', 'utf8'));
async function source(name) {
    const record = manifest.find(item => item.url.includes(`/${name}/`));
    return patch.call({resourcePath: name}, await fs.readFile(`preload/${record.path}`, 'utf8'));
}
test('PoseNet handles a missing camera before touching its video element', async () => {
    const adapted = await source('posenet2scratch');
    const start = adapted.indexOf('var detectPose = function detectPose() {');
    const end = adapted.indexOf('this.runtime.ioDevices.video.enableVideo().then(detectPose)', start);
    assert.ok(start > 0 && end > start);
    const context = {_this: {runtime: {ioDevices: {video: {provider: {video: null}}}}}};
    vm.runInNewContext(`${adapted.slice(start, end)}; detectPose();`, context);
    assert.equal(context._this.lastError, 'Camera unavailable');
    assert.equal(context._this.poseNet, undefined);
});
test('Speech recognition resolves both browser API names and fails clearly when absent', async () => {
    const adapted = await source('speech2scratch');
    const start = adapted.indexOf('var SpeechRecognition = globalThis.SpeechRecognition');
    const end = adapted.indexOf("throw new Error('Speech recognition unavailable in this browser');", start) +
        "throw new Error('Speech recognition unavailable in this browser');".length;
    assert.ok(start > 0);
    const declaration = adapted.slice(start, end);
    assert.throws(() => vm.runInNewContext(declaration, {}), /Speech recognition unavailable/);
    for (const name of ['SpeechRecognition', 'webkitSpeechRecognition']) {
        const API = function () {};
        const context = {[name]: API};
        vm.runInNewContext(declaration, context);
        assert.equal(context.SpeechRecognition, API);
    }
});
test('compatibility patches refuse unexpected upstream revisions', () => {
    assert.throws(() => patch.call({resourcePath: 'posenet2scratch'}, 'changed'), /patch mismatch/);
});
test('local ML dependencies match the recorded hashes', async () => {
    const {createHash} = await import('node:crypto');
    const records = JSON.parse(await fs.readFile('static/extensions/stretch/manifest.json', 'utf8'));
    for (const record of records) {
        const bytes = await fs.readFile(`static/extensions/stretch/${record.name}`);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256);
    }
});
