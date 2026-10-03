import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {parse} from '@babel/parser';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = path.join(root, 'scripts/preload-lock.json');
const preloadPath = path.join(root, 'preload');
export const digest = bytes => createHash('sha256').update(bytes)
    .digest('hex');
export const urlPath = url => encodeURIComponent(url).replace(/\./g, '%2E');

export const moduleExports = source => {
    const ast = parse(source, {sourceType: 'module'});
    const names = new Set();
    for (const node of ast.program.body) {
        if (node.type !== 'ExportNamedDeclaration') continue;
        for (const specifier of node.specifiers || []) names.add(specifier.exported.name);
        for (const declaration of node.declaration?.declarations || []) names.add(declaration.id.name);
        if (node.declaration?.id) names.add(node.declaration.id.name);
    }
    return names;
};

export const fetchModule = async url => {
    if (new URL(url).protocol !== 'https:') throw new Error(`HTTPS obligatorio: ${url}`);
    const response = await fetch(url, {signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    if (new URL(response.url).protocol !== 'https:') throw new Error('Redirección insegura');
    const source = await response.text();
    moduleExports(source); // Syntax validation without executing downloaded code.
    return source;
};

export const preload = async ({update = false, refresh = false} = {}) => {
    const {approved} = JSON.parse(await fs.readFile(path.join(root, 'scripts/preload-rules.json'), 'utf8'));
    const lock = await fs.readFile(lockPath, 'utf8').then(JSON.parse)
        .catch(() => ({extensions: []}));
    const records = [];
    for (const url of approved) {
        const previous = lock.extensions.find(item => item.url === url);
        if (!previous && !update) throw new Error(`Falta revisión y hash: ${url}. Usa npm run preload:update.`);
        if (!update && !refresh) {
            const cached = await Promise.all(previous.files.map(file => {
                const local = path.join(preloadPath, urlPath(url), file.name);
                return fs.readFile(local).then(bytes => digest(bytes) === file.sha256)
                    .catch(() => false);
            }));
            if (cached.every(Boolean)) {
                records.push(previous); continue;
            }
        }
        const source = await fetchModule(url);
        const exports = moduleExports(source);
        if (!exports.has('entry')) throw new Error(`No exporta entry: ${url}`);
        const files = [];
        if (exports.has('blockClass')) {
            files.push({name: 'extension.mjs', url, source});
        } else {
            const match = source.match(/extensionURL\s*:\s*['"]([^'"]+)['"]/);
            if (!match) throw new Error(`No declara extensionURL: ${url}`);
            const moduleUrl = new URL(match[1], url).href;
            const moduleSource = await fetchModule(moduleUrl);
            if (!moduleExports(moduleSource).has('blockClass')) throw new Error(`No exporta blockClass: ${moduleUrl}`);
            files.push({name: 'entry.mjs', url, source}, {name: 'extension.mjs', url: moduleUrl, source: moduleSource});
        }
        for (const file of files) {
            file.sha256 = digest(file.source);
            if (!update && !previous.files.some(old =>
                old.name === file.name && old.url === file.url && old.sha256 === file.sha256)) {
                throw new Error(`El módulo ha cambiado; requiere revisión: ${file.url}`);
            }
        }
        records.push({url, files});
        console.log(`Verificado: ${url}`);
    }
    // No cached module is replaced until every download and hash has passed.
    const manifest = [];
    for (const record of records) {
        const directory = path.join(preloadPath, urlPath(record.url));
        await fs.mkdir(directory, {recursive: true});
        for (const file of record.files) {
            if (typeof file.source !== 'undefined') await fs.writeFile(path.join(directory, file.name), file.source);
        }
        // An old split entry must not turn an integrated module into a split one.
        if (!record.files.some(file => file.name === 'entry.mjs')) {
            await fs.rm(path.join(directory, 'entry.mjs'), {force: true});
        }
        manifest.push({url: record.url, path: `${urlPath(record.url)}/extension.mjs`});
    }
    await fs.writeFile(path.join(preloadPath, 'preload.json'), JSON.stringify(manifest, null, 2));
    if (update) {
        const extensions = records.map(record => ({
            url: record.url,
            files: record.files.map(file => ({name: file.name, url: file.url, sha256: file.sha256}))
        }));
        await fs.writeFile(lockPath, `${JSON.stringify({version: 1, extensions}, null, 2)}\n`);
    }
    console.log(`${records.length} extensiones verificadas.`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    preload({update: process.argv.includes('--update-lock'), refresh: process.argv.includes('--refresh')})
        .catch(error => {
            console.error(error.message); process.exitCode = 1;
        });
}
