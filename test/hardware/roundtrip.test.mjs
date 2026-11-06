import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {blockClass as Dash} from '../../src/lib/libraries/extensions/preInstall/dash-robot.mjs';
import {blockClass as Ed1} from '../../src/lib/libraries/extensions/preInstall/ed1-board.mjs';
import {blockClass as Face} from '../../src/lib/libraries/extensions/preInstall/face-sensing.mjs';
import {blockClass as Codey} from '../../src/lib/libraries/extensions/preInstall/makeblock-codey-rocky.mjs';

const JSZip = createRequire(import.meta.url)('jszip');
const SB3 = new URL('../../docs/examples/robots-roundtrip.sb3', import.meta.url);

// docs/examples/robots-roundtrip.sb3 was saved by the editor and reopened in a
// clean session (see docs/extensions-audit.md). This test keeps it consistent
// with the local extensions: every opcode and menu value must still exist.
test('example SB3 keeps its blocks, arguments and connections', async () => {
    const zip = await JSZip.loadAsync(await readFile(SB3));
    const project = JSON.parse(await zip.file('project.json').async('string'));
    assert.deepEqual(project.extensions,
        ['microbitMore', 'poweredup', 'makeblockCodeyRocky', 'dashRobot', 'faceSensing', 'ed1Board']);
    const blocks = project.targets.find(target => !target.isStage).blocks;
    const byOpcode = opcode => Object.values(blocks).find(block => block.opcode === opcode);
    const menuValue = (block, input) => Object.values(blocks[block.inputs[input][1]].fields)[0][0];

    const chain = [];
    for (let block = byOpcode('event_whenflagclicked'); block; block = blocks[block.next]) chain.push(block.opcode);
    assert.deepEqual(chain, [
        'event_whenflagclicked', 'microbitMore_displayText', 'poweredup_motorPWM', 'makeblockCodeyRocky_showText',
        'makeblockCodeyRocky_move', 'dashRobot_move', 'dashRobot_setLight', 'dashRobot_turn',
        'ed1Board_robotTurn', 'ed1Board_playTone', 'faceSensing_goToPart'
    ]);
    assert.equal(blocks[byOpcode('faceSensing_whenFaceDetected').next].opcode, 'dashRobot_playSound');
    assert.equal(menuValue(byOpcode('dashRobot_move'), 'SPEED'), 'fast');
    assert.equal(menuValue(byOpcode('ed1Board_robotTurn'), 'SIDE'), 'left');
    assert.equal(blocks[byOpcode('dashRobot_turn').inputs.DEGREES[1]].opcode, 'faceSensing_size');

    // Each local opcode and menu value in the file is still declared by its extension.
    const infos = [new Dash(), new Ed1(), new Face(null), new Codey()].map(extension => extension.getInfo());
    Object.values(blocks).forEach(block => {
        const info = infos.find(item => block.opcode.startsWith(`${item.id}_`));
        if (!info) return;
        const name = block.opcode.slice(info.id.length + 1);
        if (name.startsWith('menu_')) {
            const menu = info.menus[name.slice(5)];
            const values = menu.items.map(item => (typeof item === 'string' ? item : item.value));
            Object.values(block.fields).forEach(([value]) => assert.ok(values.includes(value), `${block.opcode}=${value}`));
        } else {
            assert.ok(info.blocks.some(item => item.opcode === name), block.opcode);
        }
    });
});
