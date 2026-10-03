import extensionLibraryContent from './index.jsx';
import preInstallExtensions from './preInstall/index.js';
import {curatedClass} from './curated-class.mjs';

const initialized = new WeakMap();
let modules;

export const loadCuratedModules = () => {
    if (!modules) {
        modules = Promise.resolve().then(() => {
            const manifestContext = require.context('../../../../preload', false, /preload\.json$/);
            const manifest = manifestContext('./preload.json');
            const context = require.context('../../../../preload', true, /\/(entry|extension)\.mjs$/, 'lazy');
            return Promise.all(manifest.map(async record => {
                try {
                    const extensionKey = `./${record.path}`;
                    const entryKey = extensionKey.replace(/extension\.mjs$/, 'entry.mjs');
                    const extensionModule = await context(extensionKey);
                    const entryModule = context.keys().includes(entryKey) ? await context(entryKey) : extensionModule;
                    const entry = {...entryModule.entry, extensionURL: record.url};
                    const blockClass = extensionModule.blockClass;
                    if (!entry.extensionId || typeof blockClass !== 'function') {
                        throw new Error(`Extensión incompleta: ${record.url}`);
                    }
                    return {entry, blockClass};
                } catch (error) {
                    // A browser-specific API or an unavailable AI CDN must not
                    // prevent the robot extensions and the editor from loading.
                    const name = record.url.split('/').pop()
                        .replace(/\.mjs$/, '');
                    return {entry: {name,
                        extensionId: name,
                        extensionURL: record.url,
                        disabled: true,
                        description: `No disponible: ${error.message}`},
                    blockClass: null};
                }
            }));
        });
    }
    return modules;
};

// Register before loading an SB3, rather than waiting for the library to be opened.
// Builtin classes are resolved locally by both ID and original URL in Xcratch.
/**
 * Register local classes before project deserialization.
 * @param {object} manager Extension manager.
 * @returns {Promise} Resolves after all curated classes are registered.
 */
export default function initializeExtensions (manager) {
    if (!initialized.has(manager)) {
        const ready = (async () => {
            manager.extensionLibraryContent = extensionLibraryContent;
            await preInstallExtensions(manager);
            const curated = await loadCuratedModules();
            curated.forEach(({entry, blockClass}) => {
                if (!blockClass) {
                    extensionLibraryContent.push(entry);
                    return;
                }
                const index = extensionLibraryContent.findIndex(item => item.extensionId === entry.extensionId);
                if (index !== -1) extensionLibraryContent.splice(index, 1);
                manager.addBultinExtension({...entry}, curatedClass(entry, blockClass));
            });
        })();
        initialized.set(manager, ready);
    }
    return initialized.get(manager);
}
