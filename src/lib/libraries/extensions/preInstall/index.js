const importModules = [
    import('./makeblock-codey-rocky.mjs'),
    import('./makeblock-mbot2.mjs'),
    import('./unifiscratch-extra-hardware.mjs'),
    import('../stretch/index.js')
];

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
