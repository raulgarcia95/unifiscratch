import {translateOriginalInfo, statusText} from './original-texts.mjs';

// Original modules may expose getter-only static metadata. Adapt with a subclass
// instead of mutating those classes (Micro:bit More does this for EXTENSION_ID).
export const curatedClass = (entry, Original) => class extends Original {
    getInfo () {
        const info = translateOriginalInfo(super.getInfo(), entry.extensionId);
        return {...info,
            blocks: [...info.blocks, {
                opcode: 'unifiStatus',
                blockType: 'reporter',
                text: statusText,
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
