import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {curatedClass} from '../../src/lib/libraries/extensions/curated-class.mjs';
import {digest, moduleExports} from '../../scripts/preload.mjs';

globalThis.self = globalThis;
globalThis.window = globalThis;
globalThis.document = {body: {addEventListener () {}, removeEventListener () {}}};

const lock = JSON.parse(await fs.readFile('scripts/preload-lock.json', 'utf8'));
const manifest = JSON.parse(await fs.readFile('preload/preload.json', 'utf8'));
const formatMessage = createRequire(import.meta.url)('format-message');

test('every curated module matches its reviewed hash and has real ES module exports', async () => {
    assert.equal(manifest.length, lock.extensions.length);
    for (const record of lock.extensions) {
        const manifestEntry = manifest.find(item => item.url === record.url);
        assert.ok(manifestEntry, record.url);
        for (const file of record.files) {
            const local = `preload/${manifestEntry.path.replace('extension.mjs', file.name)}`;
            const bytes = await fs.readFile(local);
            assert.equal(digest(bytes), file.sha256, local);
            const exports = moduleExports(bytes.toString());
            assert.ok(exports.has(file.name === 'entry.mjs' ? 'entry' : 'blockClass'), local);
        }
    }
});

test('read-only upstream metadata can be adapted without mutating the original class', () => {
    class Original { static get EXTENSION_ID () { return 'original'; } }
    const Adapted = curatedClass({extensionId: 'local', extensionURL: 'https://example.org/test.mjs'}, Original);
    assert.equal(Original.EXTENSION_ID, 'original');
    assert.equal(Adapted.EXTENSION_ID, 'local');
    assert.equal(Adapted.extensionURL, 'https://example.org/test.mjs');
    assert.ok(new Adapted() instanceof Original);
});

for (const record of manifest.filter(item => /bricklife|microbit-more/.test(item.url))) {
    test(`original hardware module registers all block methods: ${record.url.split('/').pop()}`, async () => {
        const module = await import(pathToFileURL(`preload/${record.path}`));
        const entry = {...module.entry, extensionURL: record.url};
        const Adapted = curatedClass(entry, module.blockClass);
        const runtime = new EventEmitter();
        runtime.registerPeripheralExtension = () => {};
        runtime.ioDevices = {};
        runtime.formatMessage = formatMessage;
        runtime.getFormatMessage = () => formatMessage;
        const instance = new Adapted(runtime);
        const info = instance.getInfo();
        assert.equal(info.id, entry.extensionId);
        assert.equal(Adapted.EXTENSION_ID, info.id);
        assert.equal(Adapted.extensionURL, record.url);
        const opcodes = info.blocks.filter(block => block.opcode && block.blockType !== 'button');
        assert.ok(opcodes.length > 0);
        for (const block of opcodes) assert.equal(typeof instance[block.opcode], 'function', block.opcode);
        if (record.url.includes('bricklife')) {
            const peripheral = instance._peripheral;
            assert.ok(peripheral);
            let stops = 0;
            peripheral.isConnected = () => true;
            peripheral.stopAllMotors = () => { stops++; };
            runtime.emit('PROJECT_STOP_ALL');
            assert.equal(stops, 1, 'upstream runtime stop must reach motor stopping');
        }
    });
}
