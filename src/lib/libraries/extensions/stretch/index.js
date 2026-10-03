import TM from './vendor/tm2scratch';
import TMPose from './vendor/tmpose2scratch';
import ImageClassifier from './vendor/ic2scratch';
import Handpose from './vendor/handpose2scratch';
import Facemesh from './vendor/facemesh2scratch';
import {entries as localEntries} from '../preInstall/unifiscratch-extra-hardware.mjs';

const originals = {tm2scratch: TM,
    tmpose2scratch: TMPose,
    ic2scratch: ImageClassifier,
    handpose2scratch: Handpose,
    facemesh2scratch: Facemesh};

export const entries = Object.entries(originals).map(([id, Original]) => {
    class Extension extends Original {
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
        constructor (runtime) {
            super(runtime);
            const dispose = () => {
                this.disposed = true;
                clearInterval(this.timer);
                clearInterval(this.poseTimer);
                if (this.soundClassifier && this.soundClassifier.stop) this.soundClassifier.stop();
                [this.handpose, this.facemesh].forEach(model => {
                    if (model && model.removeAllListeners) model.removeAllListeners('predict');
                });
                this.landmarks = [];
                this.faces = [];
                this.results = [];
                this.imageProbableLabels = [];
                this.poseProbableLabels = [];
            };
            runtime.on('RUNTIME_DISPOSED', dispose);
            this.getInfo().blocks.filter(block => block.blockType === 'command' && block.opcode)
                .forEach(block => {
                    const original = this[block.opcode];
                    if (typeof original !== 'function') return;
                    this[block.opcode] = (...args) => this.dependenciesReady.then(() => {
                        this.disposed = false;
                        return original.apply(this, args);
                    });
                });
        }
    }
    Extension.EXTENSION_ID = id;
    const metadata = localEntries.find(item => item.entry.extensionId === id).entry;
    return {
        entry: {
            ...metadata,
            disabled: false,
            collaborator: 'champierre / adaptación Unifiscratch',
            description: 'Extensión original de Stretch3 adaptada a Unifiscratch. ' +
                'Requiere cámara e Internet para modelos.',
            helpLink: `https://github.com/champierre/${id}`
        },
        blockClass: Extension
    };
});
