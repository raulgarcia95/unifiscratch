import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

// Package the already verified editor, excluding debugging examples and source maps.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = path.join(root, 'build');
const output = path.join(root, '.publish', `pages-${Date.now()}`);
await fs.access(path.join(build, 'index.html'));
await fs.access(path.join(build, 'gui.js'));
await fs.mkdir(output, {recursive: true});
for (const item of await fs.readdir(build, {withFileTypes: true})) {
    if (item.name.endsWith('.map')) continue;
    if (/^(blocksonly|compatibilitytesting|player)\.js$/.test(item.name)) continue;
    if (/^(blocks-only|compatibility-testing|player)\.html$/.test(item.name)) continue;
    await fs.cp(path.join(build, item.name), path.join(output, item.name), {
        recursive: true,
        filter: source => !source.endsWith('.map')
    });
}
await fs.copyFile(path.join(root, 'LICENSE'), path.join(output, 'LICENSE'));
// Pages caches stable filenames. Change the entry URL whenever the editor changes.
const editorHash = createHash('sha256').update(await fs.readFile(path.join(output, 'gui.js')))
    .digest('hex').slice(0, 16);
const htmlPath = path.join(output, 'index.html');
const html = await fs.readFile(htmlPath, 'utf8');
if (!html.includes('src="gui.js"')) throw new Error('Editor script missing from index.html');
await fs.writeFile(htmlPath, html.replace('src="gui.js"', `src="gui.js?v=${editorHash}"`));
await fs.writeFile(path.join(output, '.nojekyll'), '');
await fs.writeFile(path.join(output, 'SOURCE.txt'),
    'Unifiscratch source and audit: https://github.com/raulgarcia95/unifiscratch\n' +
    'License: AGPL-3.0. Hardware validation remains pending; see docs/extensions-audit.md.\n');
console.log(output);
