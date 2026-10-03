import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {defineMessages, injectIntl, intlShape} from 'react-intl';

import log from '../lib/log.js';

import extensionLibraryContent from '../lib/libraries/extensions/index.jsx';
import initializeExtensions from '../lib/libraries/extensions/initialize';
import {localize} from '../lib/unifiscratch-l10n';

import LibraryComponent from '../components/library/library.jsx';
import extensionIcon from '../components/action-menu/icon--sprite.svg';

import {prompt, confirm, alert} from '../lib/async-modal.jsx';

const messages = defineMessages({
    extensionTitle: {
        defaultMessage: 'Choose an Extension',
        description: 'Heading for the extension library',
        id: 'gui.extensionLibrary.chooseAnExtension'
    },
    extensionUrl: {
        defaultMessage: 'Enter the URL of the extension',
        description: 'Prompt for unofficial extension url',
        id: 'gui.extensionLibrary.extensionUrl'
    },
    confirmReplacing: {
        defaultMessage: 'Do you want to replace extension\n\nextension name: {name}\nload from: {url}',
        description: 'Confirm for replacing of the extension',
        id: 'unifiscratch.confirmReplacingExtension'
    },
    couldNotLoadExtension: {
        defaultMessage: 'Could not load extension from: ',
        description: 'Error message when extension could not be loaded',
        id: 'unifiscratch.couldNotLoadExtension'
    },
    robotTag: {
        defaultMessage: 'Robots',
        description: 'Tag for robot extensions',
        id: 'unifiscratch.category.robots'
    },
    boardTag: {
        defaultMessage: 'Boards',
        description: 'Tag for board extensions',
        id: 'unifiscratch.category.boards'
    },
    aiTag: {
        defaultMessage: 'AI',
        description: 'Tag for AI extensions',
        id: 'unifiscratch.category.ai'
    },
    otherTag: {
        defaultMessage: 'Other',
        description: 'Tag for other extensions',
        id: 'unifiscratch.category.other'
    }
});

// Workaround to avoid official translation process.
const translations = {
    'ja': {
        'unifiscratch.confirmReplacingExtension': '拡張機能を置き換えますか?\n\n拡張機能名: {name}\n読み込み元: {url}',
        'unifiscratch.couldNotLoadExtension': '拡張機能をロードできませんでした: {url}',
        'unifiscratch.tag.ai': 'AI'
    },
    'ja-Hira': {
        'unifiscratch.confirmReplacingExtension': 'かくちょうきのうをおきかえますか?\n\nかくちょうきのうめい: {name}\nよみこみもと: {url}',
        'unifiscratch.couldNotLoadExtension': 'かくちょうきのうをロードできませんでした: {url}',
        'unifiscratch.tag.ai': 'AI'
    }
};

const robotExtensionIds = new Set([
    'ev3',
    'boost',
    'wedo2',
    'makeblockcodeyrocky',
    'makeblockmbot2',
    'bluebot',
    'dashrobot',
    'edisonv3',
    'smartcutebot'
]);

const boardExtensionIds = new Set([
    'microbitmore',
    'microshield',
    'wappstobit',
    'keyestudioesp32',
    'arduinouno',
    'ed1board',
    'gdxfor'
]);

const aiExtensionIds = new Set([
    'ml2scratch',
    'posenet2scratch',
    'speech2scratch',
    'gai',
    'mpimageembed',
    'xcxmphand',
    'tfknn',
    'tm2scratch',
    'tmpose2scratch',
    'imageclassifier2scratch',
    'ic2scratch',
    'handpose2scratch',
    'facemesh2scratch',
    'chatgpt2scratch',
    'facesensing'
]);

const extensionText = value => {
    if (typeof value === 'string') return value.toLowerCase();
    if (value && value.defaultMessage) return value.defaultMessage.toLowerCase();
    if (value && value.props && value.props.defaultMessage) return value.props.defaultMessage.toLowerCase();
    return '';
};

const categoryForExtension = extension => {
    if (['robots', 'boards', 'ai', 'other'].includes(extension.category)) {
        return extension.category;
    }
    const id = String(extension.extensionId || '').toLowerCase();
    const url = String(extension.extensionURL || '').toLowerCase();
    const name = extensionText(extension.name);

    if (robotExtensionIds.has(id) ||
            url.includes('bricklife.com/scratch-gui/') ||
            name.includes('lego') ||
            name.includes('powered up') ||
            name.includes('control+') ||
            name.includes('duplo') ||
            name.includes('spike')) {
        return 'robots';
    }
    if (boardExtensionIds.has(id) ||
            url.includes('microbit-more') ||
            url.includes('xcx-arduino') ||
            name.includes('micro:bit more') ||
            name.includes('microbit more') ||
            name.includes('arduino') ||
            name.includes('go direct force')) {
        return 'boards';
    }
    if (aiExtensionIds.has(id) ||
            url.includes('ml2scratch') ||
            url.includes('posenet2scratch') ||
            url.includes('speech2scratch') ||
            url.includes('xcx-gai') ||
            url.includes('mp-image-embed') ||
            url.includes('xcx-mp-hand') ||
            url.includes('xcx-tf-knn') ||
            url.includes('tm2scratch') ||
            url.includes('tmpose2scratch') ||
            url.includes('imageclassifier2scratch') ||
            url.includes('chatgpt2scratch') ||
            id.includes('ic2scratch') ||
            id.includes('handpose2scratch') ||
            id.includes('facemesh2scratch') ||
            name.includes('face sensing')) {
        return 'ai';
    }
    return 'other';
};

const categoryMessages = {
    robots: messages.robotTag,
    boards: messages.boardTag,
    ai: messages.aiTag,
    other: messages.otherTag
};

const knownExtensionCards = {
    en: {
        ml2scratch: {name: 'ML2Scratch', description: 'Use machine learning models from Scratch blocks.'},
        posenet2scratch: {name: 'PoseNet2Scratch', description: 'Recognize body poses with the camera.'},
        speech2scratch: {name: 'Speech2Scratch', description: 'Recognize speech and use it in projects.'},
        gai: {name: 'Generative AI', description: 'Use generative AI services from blocks.'},
        mpimageembed: {name: 'Image Embedding', description: 'Create and compare image embeddings with AI.'},
        xcxmphand: {name: 'Hand Sensing', description: 'Detect hands and gestures with the camera.'},
        tfknn: {name: 'KNN Classifier', description: 'Train a simple TensorFlow KNN classifier.'},
        tm2scratch: {name: 'Teachable Machine', description: 'Use Teachable Machine models in Scratch.'},
        tmpose2scratch: {name: 'Teachable Machine Pose', description: 'Use Teachable Machine pose models.'},
        imageclassifier2scratch: {name: 'Image Classifier', description: 'Classify images from the camera.'},
        ic2scratch: {name: 'Image Classifier', description: 'Classify images from the camera.'},
        handpose2scratch: {name: 'HandPose2Scratch', description: 'Detect hand poses from the camera.'},
        facemesh2scratch: {name: 'FaceMesh2Scratch', description: 'Detect face landmarks from the camera.'},
        chatgpt2scratch: {name: 'ChatGPT2Scratch', description: 'Use ChatGPT from Scratch blocks.'},
        xcxarduino: {name: 'Arduino UNO', description: 'Control Arduino UNO with the public Arduino extension.'},
        facesensing: {name: 'Face Sensing', description: 'AI card for face sensing integration.'},
        microbitmore: {
            name: 'Microbit More',
            description: 'Use more micro:bit sensors, buttons and Bluetooth features.'
        },
        spikeessential: {name: 'LEGO SPIKE Essential', description: 'Control LEGO SPIKE Essential hubs and creations.'},
        legoble: {name: 'LEGO BLE Device', description: 'Connect LEGO Bluetooth hubs and devices.'},
        poweredup: {name: 'LEGO Powered UP', description: 'Control LEGO Powered UP motors and sensors.'},
        legoremote: {name: 'LEGO Powered UP Remote', description: 'Use the LEGO remote control in projects.'},
        controlplus: {name: 'LEGO Technic CONTROL+', description: 'Control Technic CONTROL+ hubs and motors.'},
        duplotrain: {name: 'LEGO DUPLO Train', description: 'Control the DUPLO train from Scratch blocks.'},
        legomario: {name: 'LEGO Mario', description: 'Use LEGO Mario events and sensors.'},
        legoluigi: {name: 'LEGO Luigi', description: 'Use LEGO Luigi events and sensors.'},
        legopeach: {name: 'LEGO Peach', description: 'Use LEGO Peach events and sensors.'}
    },
    es: {
        ml2scratch: {name: 'ML2Scratch', description: 'Usa modelos de aprendizaje automático desde bloques.'},
        posenet2scratch: {name: 'PoseNet2Scratch', description: 'Reconoce posturas del cuerpo con la cámara.'},
        speech2scratch: {name: 'Speech2Scratch', description: 'Reconoce voz y úsala en tus proyectos.'},
        gai: {name: 'IA generativa', description: 'Usa servicios de IA generativa desde bloques.'},
        mpimageembed: {name: 'Incrustación de imágenes', description: 'Crea y compara vectores de imágenes con IA.'},
        xcxmphand: {name: 'Detección de manos', description: 'Detecta manos y gestos con la cámara.'},
        tfknn: {name: 'Clasificador KNN', description: 'Entrena un clasificador KNN sencillo con TensorFlow.'},
        tm2scratch: {name: 'Teachable Machine', description: 'Usa modelos de Teachable Machine en Scratch.'},
        tmpose2scratch: {name: 'Teachable Machine Pose', description: 'Usa modelos de posturas de Teachable Machine.'},
        imageclassifier2scratch: {
            name: 'Clasificador de imágenes',
            description: 'Clasifica imágenes captadas por la cámara.'
        },
        ic2scratch: {name: 'Clasificador de imágenes', description: 'Clasifica imágenes captadas por la cámara.'},
        handpose2scratch: {name: 'HandPose2Scratch', description: 'Detecta posturas de la mano con la cámara.'},
        facemesh2scratch: {name: 'FaceMesh2Scratch', description: 'Detecta puntos de referencia de la cara.'},
        chatgpt2scratch: {name: 'ChatGPT2Scratch', description: 'Usa ChatGPT desde bloques de Scratch.'},
        xcxarduino: {name: 'Arduino UNO', description: 'Controla Arduino UNO con la extensión pública de Arduino.'},
        facesensing: {name: 'Face Sensing', description: 'Tarjeta IA para integrar detección de caras.'},
        microbitmore: {
            name: 'Microbit More',
            description: 'Usa más sensores, botones y funciones Bluetooth de micro:bit.'
        },
        spikeessential: {name: 'LEGO SPIKE Essential', description: 'Controla hubs y creaciones LEGO SPIKE Essential.'},
        legoble: {name: 'LEGO BLE Device', description: 'Conecta hubs y dispositivos LEGO por Bluetooth.'},
        poweredup: {name: 'LEGO Powered UP', description: 'Controla motores y sensores LEGO Powered UP.'},
        legoremote: {name: 'LEGO Powered UP Remote', description: 'Usa el mando LEGO en tus proyectos.'},
        controlplus: {name: 'LEGO Technic CONTROL+', description: 'Controla hubs y motores Technic CONTROL+.'},
        duplotrain: {name: 'LEGO DUPLO Train', description: 'Controla el tren DUPLO desde bloques Scratch.'},
        legomario: {name: 'LEGO Mario', description: 'Usa eventos y sensores de LEGO Mario.'},
        legoluigi: {name: 'LEGO Luigi', description: 'Usa eventos y sensores de LEGO Luigi.'},
        legopeach: {name: 'LEGO Peach', description: 'Usa eventos y sensores de LEGO Peach.'}
    },
    ca: {
        ml2scratch: {name: 'ML2Scratch', description: 'Fes servir models d’aprenentatge automàtic des de blocs.'},
        posenet2scratch: {name: 'PoseNet2Scratch', description: 'Reconeix postures del cos amb la càmera.'},
        speech2scratch: {name: 'Speech2Scratch', description: 'Reconeix veu i fes-la servir als projectes.'},
        gai: {name: 'IA generativa', description: 'Fes servir serveis d’IA generativa des de blocs.'},
        mpimageembed: {name: 'Incrustació d’imatges', description: 'Crea i compara vectors d’imatges amb IA.'},
        xcxmphand: {name: 'Detecció de mans', description: 'Detecta mans i gestos amb la càmera.'},
        tfknn: {name: 'Classificador KNN', description: 'Entrena un classificador KNN senzill amb TensorFlow.'},
        tm2scratch: {name: 'Teachable Machine', description: 'Fes servir models de Teachable Machine a Scratch.'},
        tmpose2scratch: {
            name: 'Teachable Machine Pose',
            description: 'Fes servir models de postures de Teachable Machine.'
        },
        imageclassifier2scratch: {
            name: 'Classificador d’imatges',
            description: 'Classifica imatges captades per la càmera.'
        },
        ic2scratch: {name: 'Classificador d’imatges', description: 'Classifica imatges captades per la càmera.'},
        handpose2scratch: {name: 'HandPose2Scratch', description: 'Detecta postures de la mà amb la càmera.'},
        facemesh2scratch: {name: 'FaceMesh2Scratch', description: 'Detecta punts de referència de la cara.'},
        chatgpt2scratch: {name: 'ChatGPT2Scratch', description: 'Fes servir ChatGPT des de blocs de Scratch.'},
        xcxarduino: {name: 'Arduino UNO', description: 'Controla Arduino UNO amb l’extensió pública d’Arduino.'},
        facesensing: {name: 'Face Sensing', description: 'Targeta IA per integrar detecció de cares.'},
        microbitmore: {
            name: 'Microbit More',
            description: 'Fes servir més sensors, botons i funcions Bluetooth de micro:bit.'
        },
        spikeessential: {name: 'LEGO SPIKE Essential', description: 'Controla hubs i creacions LEGO SPIKE Essential.'},
        legoble: {name: 'LEGO BLE Device', description: 'Connecta hubs i dispositius LEGO per Bluetooth.'},
        poweredup: {name: 'LEGO Powered UP', description: 'Controla motors i sensors LEGO Powered UP.'},
        legoremote: {name: 'LEGO Powered UP Remote', description: 'Fes servir el comandament LEGO als projectes.'},
        controlplus: {name: 'LEGO Technic CONTROL+', description: 'Controla hubs i motors Technic CONTROL+.'},
        duplotrain: {name: 'LEGO DUPLO Train', description: 'Controla el tren DUPLO des de blocs Scratch.'},
        legomario: {name: 'LEGO Mario', description: 'Fes servir esdeveniments i sensors de LEGO Mario.'},
        legoluigi: {name: 'LEGO Luigi', description: 'Fes servir esdeveniments i sensors de LEGO Luigi.'},
        legopeach: {name: 'LEGO Peach', description: 'Fes servir esdeveniments i sensors de LEGO Peach.'}
    }
};

const knownExtensionCardKey = extension => {
    const id = String(extension.extensionId || '').toLowerCase();
    const url = String(extension.extensionURL || '').toLowerCase();
    const name = extensionText(extension.name);
    if (id.includes('microbitmore') || url.includes('microbit-more')) return 'microbitmore';
    if (url.includes('spikeessential')) return 'spikeessential';
    if (url.includes('legoble')) return 'legoble';
    if (url.includes('poweredup')) return 'poweredup';
    if (url.includes('legoremote')) return 'legoremote';
    if (url.includes('controlplus')) return 'controlplus';
    if (url.includes('duplotrain')) return 'duplotrain';
    if (url.includes('legomario')) return 'legomario';
    if (url.includes('legoluigi')) return 'legoluigi';
    if (url.includes('legopeach')) return 'legopeach';
    if (id.includes('gai') || url.includes('xcx-gai')) return 'gai';
    if (id.includes('mpimageembed') || url.includes('mp-image-embed')) return 'mpimageembed';
    if (id === 'xcxmphand' || url.includes('xcx-mp-hand')) return 'xcxmphand';
    if (id.includes('tfknn') || url.includes('xcx-tf-knn')) return 'tfknn';
    if (id.includes('tmpose') || url.includes('tmpose2scratch')) return 'tmpose2scratch';
    if (id.includes('tm2scratch') || url.includes('tm2scratch')) return 'tm2scratch';
    if (id.includes('imageclassifier') || url.includes('imageclassifier2scratch')) return 'imageclassifier2scratch';
    if (id.includes('ic2scratch')) return 'ic2scratch';
    if (id.includes('handpose')) return 'handpose2scratch';
    if (id.includes('facemesh')) return 'facemesh2scratch';
    if (id.includes('chatgpt') || url.includes('chatgpt2scratch')) return 'chatgpt2scratch';
    if (id.includes('ml2scratch') || url.includes('ml2scratch')) return 'ml2scratch';
    if (id.includes('posenet') || url.includes('posenet2scratch')) return 'posenet2scratch';
    if (id === 'speech2scratch' || url.includes('speech2scratch')) return 'speech2scratch';
    if (id.includes('arduino') || url.includes('xcx-arduino') || name.includes('arduino')) return 'xcxarduino';
    if (id.includes('facesensing') || name.includes('face sensing')) return 'facesensing';
    return null;
};

const localizeKnownExtensionCard = (intl, extension, field, fallback) => {
    if (extension.disabled || (field === 'description' && !extension.extensionURL)) {
        return localize(intl, fallback);
    }
    const key = knownExtensionCardKey(extension);
    const locale = intl.locale || 'en';
    const language = locale.split('-')[0];
    const value = knownExtensionCards[locale]?.[key]?.[field] ||
        knownExtensionCards[language]?.[key]?.[field] ||
        knownExtensionCards.en[key]?.[field];
    return value || localize(intl, fallback);
};

class ExtensionLibrary extends React.PureComponent {
    constructor (props) {
        super(props);
        extensionLibraryContent.forEach(extension => {
            if (extension.setFormatMessage) {
                extension.setFormatMessage(this.props.intl.formatMessage);
            }
            if (extension.translationMap) {
                Object.assign(
                    this.props.intl.messages,
                    extension.translationMap[this.props.intl.locale]
                );
            }
        });
        bindAll(this, [
            'handleItemSelect'
        ]);
        
        // Workaround to avoid official translation process.
        Object.assign(
            this.props.intl.messages,
            translations[this.props.intl.locale]
        );
    }

    componentDidMount () {
        this.mounted = true;
        initializeExtensions(this.props.vm.extensionManager).then(() => {
            if (this.mounted) this.forceUpdate();
        })
            .catch(error => {
                log.error(error);
                alert({message: error.message});
            });
    }

    componentWillUnmount () {
        this.mounted = false;
    }

    async handleItemSelect (item) {
        if (item.disabled) {
            return;
        }
        let id = item.extensionId;
        const url = item.extensionURL ? item.extensionURL : id;
        if (id) {
            if (this.props.vm.extensionManager.isExtensionLoaded(id)) {
                this.props.onCategorySelected(id);
                return Promise.resolve();
            }
            
            try {
                await initializeExtensions(this.props.vm.extensionManager);
                await this.props.vm.extensionManager.loadExtensionURL(id);
                if (!this.props.vm.extensionManager.isExtensionLoaded(id)) {
                    throw new Error(`No se ha podido cargar la extensión ${id}.`);
                }
                this.props.onCategorySelected(id);
            } catch (error) {
                log.error(error);
                await alert({message: error.message});
            }
            return;
        }
        let inputUrl = url;
        return prompt(
            {
                message: this.props.intl.formatMessage(messages.extensionUrl),
                valueType: 'url',
                initialValue: 'https://microbit-more.github.io/dist/microbitMore.mjs'
            })
            .then(userInput => {
                inputUrl = userInput;
                return this.props.vm.extensionManager.fetchExtension(userInput);
            })
            .then(({entry, blockClass}) => {
                id = entry.extensionId;
                const existingEntry = extensionLibraryContent.find(libEntry => libEntry.extensionId === id);
                if (existingEntry) {
                    return confirm(
                        {
                            message: this.props.intl.formatMessage(
                                messages.confirmReplacing,
                                {
                                    name: existingEntry.name.props ?
                                        this.props.intl.formatMessage(existingEntry.name.props) :
                                        existingEntry.name,
                                    url: blockClass.extensionURL
                                }
                            )
                        })
                        .then(doReplace => {
                            if (doReplace) {
                                this.props.vm.extensionManager.registerExtensionBlock(entry, blockClass);
                                this.props.onCategorySelected(id);
                            }
                        });
                }
                this.props.vm.extensionManager.registerExtensionBlock(entry, blockClass);
                this.props.onCategorySelected(id);
            })
            .catch(error => {
                log.info(`Error on load extension class from ${inputUrl}:\n${error.stack}\n`);
                alert({
                    message: this.props.intl.formatMessage(
                        messages.couldNotLoadExtension,
                        {url: inputUrl}
                    )
                });
                return;
            });
        
    }
    render () {
        const extensionLibraryThumbnailData = extensionLibraryContent.map(extension => ({
            rawURL: extension.iconURL || extensionIcon,
            ...extension,
            category: categoryForExtension(extension),
            name: localizeKnownExtensionCard(this.props.intl, extension, 'name', extension.name),
            description: localizeKnownExtensionCard(this.props.intl, extension, 'description', extension.description)
        }));
        const visibleCategories = ['robots', 'boards', 'ai', 'other']
            .filter(category => extensionLibraryThumbnailData.some(item => item.category === category));
        return (
            <LibraryComponent
                data={extensionLibraryThumbnailData}
                filterable
                id="extensionLibrary"
                title={this.props.intl.formatMessage(messages.extensionTitle)}
                visible={this.props.visible}
                onItemSelected={this.handleItemSelect}
                onRequestClose={this.props.onRequestClose}
                withCategories
                tags={visibleCategories.map(category => ({
                    tag: category,
                    intlLabel: categoryMessages[category]
                }))}
            />
        );
    }
}

ExtensionLibrary.propTypes = {
    intl: intlShape.isRequired,
    onCategorySelected: PropTypes.func,
    onRequestClose: PropTypes.func,
    visible: PropTypes.bool,
    vm: PropTypes.instanceOf(VM).isRequired // eslint-disable-line react/no-unused-prop-types
};

export default injectIntl(ExtensionLibrary);
