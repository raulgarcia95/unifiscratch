// Original modules may expose getter-only static metadata. Adapt with a subclass
// instead of mutating those classes (Micro:bit More does this for EXTENSION_ID).
export const curatedClass = (entry, Original) => class extends Original {
    getInfo () {
        const info = super.getInfo();
        return {...info,
            blocks: [...info.blocks, {
                opcode: 'unifiStatus',
                blockType: 'reporter',
                text: 'estado de extensión',
                disableMonitor: true
            }]};
    }
    unifiStatus () {
        return this.lastError || '';
    }
    static get EXTENSION_ID () {
        return entry.extensionId;
    }
    static get extensionURL () {
        return entry.extensionURL;
    }
};
