/* eslint-disable max-len */
// Third-party credits shown inside the editor (About > Licences and credits).
// Keep in step with THIRD_PARTY_NOTICES.md. Notes are [English, Spanish, Catalan].

const gh = path => `https://github.com/${path}`;

export const creditSections = [
    {
        id: 'base',
        title: ['Editor base', 'Base del editor', 'Base de l’editor'],
        items: [
            {name: 'Scratch GUI, Scratch VM, Paint, Render, Audio, L10n, Storage…', author: 'Scratch Foundation / MIT', license: 'AGPL-3.0', href: gh('scratchfoundation/scratch-gui')},
            {name: 'Scratch Blocks', author: 'Scratch Foundation / MIT', license: 'Apache-2.0', href: gh('scratchfoundation/scratch-blocks')},
            {name: 'Xcratch', author: 'Koji Yokokawa', license: 'MIT', href: gh('xcratch/xcratch')},
            {name: 'Xcratch VM', author: 'Koji Yokokawa, Scratch Foundation', license: 'AGPL-3.0', href: gh('xcratch/scratch-vm')},
            {name: ['Sprite, backdrop and sound library', 'Biblioteca de objetos, fondos y sonidos', 'Biblioteca d’objectes, fons i sons'], author: 'Scratch Foundation', license: ['Loaded from Scratch’s servers', 'Se carga desde los servidores de Scratch', 'Es carrega des dels servidors de Scratch']}
        ]
    },
    {
        id: 'extensions',
        title: ['Extensions by other authors', 'Extensiones de otros autores', 'Extensions d’altres autors'],
        items: [
            {name: 'Microbit More', author: 'Koji Yokokawa', license: 'MIT', href: gh('microbit-more/mbit-more-v2')},
            {name: 'SPIKE Essential, LEGO BLE, Powered UP, Remote, CONTROL+, DUPLO Train, Mario, Luigi, Peach', author: 'bricklife (Shinichiro Oba)', license: 'BSD-3-Clause', href: gh('bricklife/scratch-gui')},
            {name: 'ML2Scratch, PoseNet2Scratch, Speech2Scratch', author: 'Junya Ishihara (champierre)', license: 'AGPL-3.0', href: gh('champierre')},
            {name: 'TM2Scratch, TMPose2Scratch, ImageClassifier2Scratch, Handpose2Scratch, Facemesh2Scratch (Stretch3)', author: 'Junya Ishihara (champierre)', license: 'AGPL-3.0', href: gh('champierre')},
            {name: 'ChatGPT2Scratch', author: 'ichiroc, champierre', license: 'MIT', href: gh('champierre/chatgpt2scratch')},
            {name: ['Generative AI (xcx-gai)', 'IA generativa (xcx-gai)', 'IA generativa (xcx-gai)'], author: 'Koji Yokokawa', license: 'AGPL-3.0', href: gh('yokobond/xcx-gai')},
            {name: 'MediaPipe Hand, MediaPipe Image Embed, KNN Classifier, Arduino', author: 'Koji Yokokawa', license: ['the author’s repositories do not declare a licence; used unmodified as published by the author (only the MediaPipe version is pinned)', 'sus repositorios no declaran licencia; se usan tal como las publica el autor (solo se fija la versión de MediaPipe)', 'els seus repositoris no declaren llicència; es fan servir tal com les publica l’autor (només es fixa la versió de MediaPipe)'], href: gh('yokobond')}
        ]
    },
    {
        id: 'ai',
        title: ['AI libraries and models', 'Bibliotecas y modelos de IA', 'Biblioteques i models d’IA'],
        items: [
            {name: 'MediaPipe Tasks Vision', author: 'Google', license: 'Apache-2.0', href: gh('google-ai-edge/mediapipe')},
            {name: 'TensorFlow.js, Teachable Machine', author: 'Google', license: 'Apache-2.0', href: gh('tensorflow/tfjs')},
            {name: 'ml5.js', author: 'ml5.js', license: ['ml5 licence (older contributions: MIT)', 'Licencia ml5 (aportaciones antiguas: MIT)', 'Llicència ml5 (aportacions antigues: MIT)'], href: gh('ml5js/ml5-library')}
        ]
    },
    {
        id: 'own',
        title: ['Unifyscratch’s own extensions and firmware', 'Extensiones y firmwares propios', 'Extensions i firmwares propis'],
        items: [
            {name: 'mBot2, Codey Rocky, Smart Cutebot, micro:shield, wappsto:bit, ED1, Sensores y actuadores, Dash, Edison V3, LEGO SPIKE Prime, BlueBot, Keyestudio ESP32, Face Sensing', author: 'Unifyscratch', license: 'AGPL-3.0', note: ['Original code with no manufacturer software. Only the technical data of each protocol is used, for interoperability.', 'Código propio, sin software de los fabricantes. Solo se usan los datos técnicos de cada protocolo, para la interoperabilidad.', 'Codi propi, sense programari dels fabricants. Només es fan servir les dades tècniques de cada protocol, per a la interoperabilitat.']},
            {name: ['micro:bit programs (.hex)', 'Programas de micro:bit (.hex)', 'Programes de micro:bit (.hex)'], author: 'Unifyscratch, Microsoft MakeCode', license: 'MIT'},
            {name: 'Pybricks (LEGO SPIKE Prime)', author: 'The Pybricks Authors', license: ['MIT, installed by the user', 'MIT, lo instala el usuario', 'MIT, l’instal·la l’usuari'], href: gh('pybricks')}
        ]
    }
];

// Services that receive data from the browser. Used by the privacy list.
export const externalServices = [
    ['ChatGPT2Scratch: the text goes to OpenAI with the user’s API key.', 'ChatGPT2Scratch: el texto se envía a OpenAI con la clave de API de quien la usa.', 'ChatGPT2Scratch: el text s’envia a OpenAI amb la clau d’API de qui la fa servir.'],
    ['Generative AI: texts, images and sounds go to the chosen AI service (Google Gemini, OpenAI or Anthropic).', 'IA generativa: textos, imágenes y sonidos se envían al servicio de IA elegido (Google Gemini, OpenAI o Anthropic).', 'IA generativa: textos, imatges i sons s’envien al servei d’IA triat (Google Gemini, OpenAI o Anthropic).'],
    ['Speech2Scratch: in Chrome and Edge the audio is transcribed on Google or Microsoft servers.', 'Speech2Scratch: en Chrome y Edge el audio se transcribe en servidores de Google o Microsoft.', 'Speech2Scratch: a Chrome i Edge l’àudio es transcriu a servidors de Google o Microsoft.'],
    ['Text to Speech and Translate (Scratch): they use Scratch Foundation servers.', 'Texto a voz y Traducir (de Scratch): usan servidores de la Scratch Foundation.', 'Text a veu i Tradueix (de Scratch): fan servir servidors de la Scratch Foundation.'],
    ['AI models are downloaded from Google, jsDelivr or unpkg; camera images are analysed in the browser.', 'Los modelos de IA se descargan de Google, jsDelivr o unpkg; la imagen de la cámara se analiza en el navegador.', 'Els models d’IA es descarreguen de Google, jsDelivr o unpkg; la imatge de la càmera s’analitza al navegador.']
];
