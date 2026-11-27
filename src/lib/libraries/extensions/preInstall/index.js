// Each module is imported on its own: one that fails to load (for example a
// network error while fetching its chunk) must not hide the others.
const importModules = [
    import('./makeblock-codey-rocky.mjs'),
    import('./makeblock-mbot2.mjs'),
    import('./unifiscratch-extra-hardware.mjs'),
    import('./microbit-cutebot.mjs'),
    import('./microbit-wappsto.mjs'),
    import('./microbit-microshield.mjs'),
    import('./microbit-sensor-kit.mjs'),
    import('./dash-robot.mjs'),
    import('./ed1-board.mjs'),
    import('./face-sensing.mjs'),
    import('./edison-v3.mjs'),
    import('./lego-spike-prime.mjs'),
    import('./bluebot.mjs'),
    import('../stretch/index.js')
].map(promise => promise.catch(error => {
    // eslint-disable-next-line no-console
    console.error('Unifyscratch: an extension module could not be loaded', error);
    return null;
}));

/**
 * Install extensions from local module files.
 * @returns {Promise} Resolves after local registration.
 * @param {ExtensionManager} extensionManager - Current extension manager in VM.
 */
export default function (extensionManager) {
    return Promise.all(importModules)
        .then(modules =>
            modules.forEach(module => {
                if (module) {
                    const extensionEntries = module.entries || [{entry: module.entry, blockClass: module.blockClass}];
                    extensionEntries.forEach(({entry, blockClass}) => {
                        if (!entry || !blockClass) return;
                        entry.category = entry.category || 'other';
                        const existing = extensionManager.extensionLibraryContent.findIndex(
                            item => item.extensionId === entry.extensionId
                        );
                        if (existing !== -1) extensionManager.extensionLibraryContent.splice(existing, 1);
                        extensionManager.addBultinExtension({...entry}, blockClass);
                    });
                }
            })
        );
}
