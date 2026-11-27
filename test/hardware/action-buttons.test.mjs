import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {
    ACTION_BUTTON_CLASS, actionButtonKey, actionButtonsOf, markActionButtons
} from '../../src/lib/libraries/extensions/preInstall/action-buttons.mjs';
import {guideFor} from '../../src/lib/libraries/extensions/setup-guides.mjs';

const modules = ['dash-robot', 'ed1-board', 'edison-v3', 'makeblock-codey-rocky', 'makeblock-mbot2',
    'microbit-cutebot', 'microbit-microshield', 'microbit-sensor-kit', 'microbit-wappsto', 'lego-spike-prime',
    'bluebot'];
const CONNECT_OR_HELP = /^(connect|connectUsb|connectBluetooth|showHelp)$/;

test('connection and help entries are buttons, with a hidden block for old projects', async () => {
    for (const name of modules) {
        const {blockClass} = await import(`../../src/lib/libraries/extensions/preInstall/${name}.mjs`);
        const info = new blockClass(new EventEmitter()).getInfo();
        const blocks = info.blocks.filter(block => typeof block === 'object');
        const buttons = actionButtonsOf({id: info.id, blocks: blocks.map(block => ({info: block}))});
        assert.ok(buttons.length > 0, `${name} has no connection button`);
        if (guideFor(info.id)) {
            assert.ok(buttons.some(({opcode}) => opcode === 'showHelp'), `${name} has a guide but no help button`);
        }
        buttons.forEach(({opcode}) => {
            assert.equal(typeof blockClass.prototype[opcode], 'function', `${name}.${opcode}`);
            const hidden = blocks.find(block => block.opcode === opcode);
            assert.equal(hidden && hidden.hideFromPalette, true, `${name}.${opcode} hidden block`);
        });
        blocks.filter(block => CONNECT_OR_HELP.test(block.opcode || ''))
            .forEach(block => assert.equal(block.hideFromPalette, true, `${name}.${block.opcode} is still a block`));
    }
});

test('toolbox XML gets one callback key per extension and the button colour class', () => {
    const [marked] = markActionButtons([{
        id: 'microbitCutebot',
        xml: '<category><button text="connect" callbackKey="unifiscratchAction:connectUsb"></button>' +
            '<button text="Make a Variable" callbackKey="MAKE_A_VARIABLE"></button></category>'
    }]);
    assert.ok(marked.xml.includes(
        `callbackKey="${actionButtonKey('microbitCutebot', 'connectUsb')}" web-class="${ACTION_BUTTON_CLASS}"`));
    assert.ok(marked.xml.includes('callbackKey="MAKE_A_VARIABLE"></button>'));
});
