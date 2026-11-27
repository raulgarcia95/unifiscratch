import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {legoBluetoothTexts, legoBluetoothMessages} from '../../src/lib/libraries/extensions/preInstall/lego-bluetooth-texts.mjs';

const require = createRequire(import.meta.url);
const placeholders = text => (text.match(/\[[A-Z0-9_]+\]/g) || []).sort().join(',');

test('every LEGO text has English, Spanish and Catalan with the same fields', () => {
    for (const [id, texts] of Object.entries(legoBluetoothTexts)) {
        assert.equal(texts.length, 3, id);
        texts.forEach(text => assert.ok(typeof text === 'string' && text.trim(), id));
        assert.equal(placeholders(texts[1]), placeholders(texts[0]), `${id} es`);
        assert.equal(placeholders(texts[2]), placeholders(texts[0]), `${id} ca`);
    }
    assert.equal(legoBluetoothMessages('es')['legobluetooth.motorStop'], '[PORT] parar motor');
    assert.equal(legoBluetoothMessages('ca')['legobluetooth.motorStop'], '[PORT] atura el motor');
    assert.equal(legoBluetoothMessages('fr')['legobluetooth.motorStop'], '[PORT] stop motor');
});

// Same steps as the editor: vm.setLocale() installs the locale messages, then each
// extension's getInfo() adds its own en/it/ja tables to the shared formatMessage.
test('the originals pick the Spanish or Catalan text after a language change', () => {
    const formatMessage = require('format-message').namespace();
    const original = {id: 'legobluetooth.motorPWM', default: '[PORT] start motor at [POWER] % power'};
    const addOriginalTables = () => {
        const setup = formatMessage.setup();
        ['en', 'it', 'ja'].forEach(locale => {
            setup.translations[locale] = Object.assign(setup.translations[locale] || {}, {
                [original.id]: locale === 'ja' ? '[PORT] モーターを [POWER] %のパワーで回す' : original.default
            });
        });
    };
    for (const [locale, expected] of [
        ['es', '[PORT] encender motor al [POWER] % de potencia'],
        ['ca', '[PORT] engega el motor al [POWER] % de potència'],
        ['en', original.default]
    ]) {
        formatMessage.setup({locale, translations: {[locale]: legoBluetoothMessages(locale)}, missingTranslation: 'ignore'});
        addOriginalTables();
        assert.equal(formatMessage(original, {PORT: '[PORT]', POWER: '[POWER]'}), expected, locale);
    }
});

// Only where the pinned originals were downloaded (npm run preload).
const preloadDir = path.resolve('preload');
const originals = fs.existsSync(preloadDir) ?
    fs.readdirSync(preloadDir).filter(name => name.includes('bricklife')) : [];

test('the texts cover every id of the LEGO originals, with their English', {skip: originals.length === 0}, () => {
    for (const dir of originals) {
        const source = fs.readFileSync(path.join(preloadDir, dir, 'extension.mjs'), 'utf8');
        const english = {};
        for (const table of source.matchAll(/'en'\s*:\s*\{([\s\S]*?)\n\s*\}/g)) {
            for (const [, id, text] of table[1].matchAll(/'([\w.]+)'\s*:\s*'((?:[^'\\]|\\.)*)'/g)) {
                english[id] = text;
            }
        }
        for (const [id, text] of Object.entries(english)) {
            if (id.startsWith('gui.extension.')) continue; // library card texts, translated elsewhere
            assert.ok(legoBluetoothTexts[id], `${dir}: ${id} is not translated`);
            assert.equal(legoBluetoothTexts[id][0], text, `${dir}: ${id} English differs`);
        }
    }
});
