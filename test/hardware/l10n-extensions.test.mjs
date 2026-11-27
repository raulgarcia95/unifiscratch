import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {tr, textOf} from '../../src/lib/libraries/extensions/preInstall/runtime-texts.mjs';
import {
    translateOriginalInfo, originalTexts, commonOriginalTexts
} from '../../src/lib/libraries/extensions/original-texts.mjs';

const require = createRequire(import.meta.url);
const formatMessage = require('format-message');
const placeholders = text => (text.match(/\[[A-Z0-9_]+\]/g) || []).sort().join(',');

// unifiscratch-l10n.js is bundled by webpack as ESM with a .js name: load a copy as .mjs.
const loadMessages = async () => {
    const root = path.resolve('src/lib');
    const source = fs.readFileSync(path.join(root, 'unifiscratch-l10n.js'), 'utf8')
        .replace(/from '\.\/libraries/g, `from '${pathToFileURL(path.join(root, 'libraries')).href}`);
    const copy = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'l10n-')), 'l10n.mjs');
    fs.writeFileSync(copy, source);
    const {mergeUnifiscratchMessages} = await import(pathToFileURL(copy).href);
    return mergeUnifiscratchMessages({en: {}, es: {}, ca: {}});
};

const modules = [
    'makeblock-codey-rocky', 'makeblock-mbot2', 'unifiscratch-extra-hardware', 'microbit-cutebot',
    'microbit-wappsto', 'microbit-microshield', 'microbit-sensor-kit', 'dash-robot', 'ed1-board',
    'face-sensing', 'edison-v3', 'lego-spike-prime', 'bluebot'
];

test('every block, menu and text default of our extensions has Spanish and Catalan', async () => {
    globalThis.window = globalThis.window || {dispatchEvent () {}, addEventListener () {}, removeEventListener () {}};
    const messages = await loadMessages();
    const missing = [];
    const check = (where, value) => {
        if (!value || typeof value !== 'object' || !value.id) return;
        for (const language of ['es', 'ca']) {
            const text = messages[language][value.id];
            if (!text) missing.push(`${where} ${value.id} (${language})`);
            else assert.equal(placeholders(text), placeholders(value.default), `${value.id} ${language}`);
        }
    };
    for (const name of modules) {
        const module = await import(`../../src/lib/libraries/extensions/preInstall/${name}.mjs`);
        const entries = module.entries || [{entry: module.entry, blockClass: module.blockClass}];
        for (const {entry, blockClass} of entries) {
            const runtime = new EventEmitter();
            runtime.setMaxListeners(50);
            const info = new blockClass(runtime).getInfo();
            const id = entry.extensionId;
            check(id, entry.description);
            check(id, info.name);
            for (const block of info.blocks) {
                if (typeof block !== 'object') continue;
                check(`${id}.${block.opcode}`, block.text);
                Object.values(block.arguments || {}).forEach(arg => check(`${id}.${block.opcode}`, arg.defaultValue));
            }
            for (const [menuName, menu] of Object.entries(info.menus || {})) {
                const items = Array.isArray(menu) ? menu : menu.items;
                if (Array.isArray(items)) items.forEach(item => check(`${id} menu ${menuName}`, item.text));
            }
        }
    }
    assert.deepEqual(missing, []);
});

test('messages built while running follow the language chosen in the editor', async () => {
    const {pinNumber} = await import('../../src/lib/libraries/extensions/preInstall/microbit-sensor-kit.mjs');
    const expected = {
        en: 'Pin not allowed: 9. Use P0, P1.',
        es: 'Pin no permitido: 9. Usa P0, P1.',
        ca: 'Pin no permès: 9. Fes servir P0, P1.',
        fr: 'Pin not allowed: 9. Use P0, P1.',
        'es-419': 'Pin no permitido: 9. Usa P0, P1.'
    };
    for (const [locale, message] of Object.entries(expected)) {
        formatMessage.setup({locale});
        assert.throws(() => pinNumber(9, ['0', '1']), {message}, locale);
    }
    const lazy = () => tr('Connect', 'Conecta', 'Connecta');
    formatMessage.setup({locale: 'ca'});
    assert.equal(textOf(lazy), 'Connecta');
    formatMessage.setup({locale: 'es'});
    assert.equal(textOf(lazy), 'Conecta');
    assert.equal(textOf('fixed'), 'fixed');
});

test('original extensions get Spanish and Catalan texts without changing menu values', () => {
    const info = {
        id: 'microbitMore',
        name: 'MicroBit More',
        blocks: [
            {opcode: 'whenConnectionChanged', text: 'when micro:bit [STATE]',
                arguments: {STATE: {type: 'string', menu: 'connectionStateMenu', defaultValue: 'connected'}}},
            {opcode: 'displayText', text: 'display text [TEXT] delay [DELAY] ms',
                arguments: {TEXT: {type: 'string', defaultValue: 'Hello!'}}},
            {opcode: 'unknown', text: {id: 'x.unknown', default: 'not in the table'}}
        ],
        menus: {
            connectionStateMenu: {acceptReporters: false, items: [{text: 'connected', value: 'connected'}, 'disconnected']},
            dynamic: 'getLabels'
        }
    };
    formatMessage.setup({locale: 'es'});
    const es = translateOriginalInfo(info, 'microbitMore');
    assert.equal(es.blocks[0].text, 'cuando la micro:bit esté [STATE]');
    assert.equal(es.blocks[0].arguments.STATE.defaultValue, 'connected');
    assert.equal(es.blocks[1].arguments.TEXT.defaultValue, '¡Hola!');
    assert.deepEqual(es.blocks[2].text, {id: 'x.unknown', default: 'not in the table'});
    assert.deepEqual(es.menus.connectionStateMenu.items,
        [{text: 'conectada', value: 'connected'}, {text: 'desconectada', value: 'disconnected'}]);
    assert.equal(es.menus.dynamic, 'getLabels');
    formatMessage.setup({locale: 'ca'});
    assert.equal(translateOriginalInfo(info, 'microbitMore').blocks[0].text, 'quan la micro:bit estigui [STATE]');
    formatMessage.setup({locale: 'en'});
    assert.equal(translateOriginalInfo(info, 'microbitMore'), info);
    formatMessage.setup({locale: 'es'});
    // LEGO and other originals with their own Spanish are left alone.
    assert.equal(translateOriginalInfo(info, 'legoble'), info);
});

test('every original text keeps its fields in Spanish and Catalan', () => {
    for (const table of [commonOriginalTexts, ...Object.values(originalTexts)]) {
        for (const [english, texts] of Object.entries(table)) {
            assert.equal(texts.length, 2, english);
            texts.forEach(text => assert.equal(placeholders(text), placeholders(english), english));
        }
    }
});
