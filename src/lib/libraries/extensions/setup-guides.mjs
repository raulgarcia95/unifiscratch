/* eslint-disable max-len */
// Preparation guides for extensions that cannot be used just by adding them:
// they need a bridge program, a firmware or a helper application.
//
// The table lives outside the extension modules so it also covers the curated
// originals (LEGO, Microbit More, Arduino), whose code is pinned by hash.
// Texts are [English, Spanish, Catalan]. Steps may contain [text](url) links.
//
// status 'unconfirmed': community tools reach this firmware with another
// protocol, so the guide warns that the connection may fail.

export const SETUP_GUIDE_EVENT = 'unifiscratch-setup-guide';

export const openSetupGuide = id => {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent(SETUP_GUIDE_EVENT, {detail: {id}}));
    }
};

export const pickText = (text, locale) => {
    if (!Array.isArray(text)) return text;
    const language = String(locale || 'en').split('-')[0];
    return text[{es: 1, ca: 2}[language] || 0];
};

const EDPY_URL = 'https://www.edpyapp.com/v3/';
const BRIDGE_FILE = 'unfyscratch-puente-edison-v3.py';
const BRIDGE_PATH = `static/extensions/edison/${BRIDGE_FILE}`;
const SCRATCH_LINK_URL = 'https://scratch.mit.edu/download/scratch-link';
const MICROBIT_PYTHON_URL = 'https://python.microbit.org/';
const MICROBIT_MORE_HEX = 'https://github.com/microbit-more/pxt-mbit-more-v2/releases/download/0.2.5/microbit-mbit-more-v2-0_2_5.hex';
const CUTEBOT_HEX_FILE = 'unifiscratch-cutebot.hex';
const CUTEBOT_HEX_PATH = `static/extensions/cutebot/${CUTEBOT_HEX_FILE}`;
const MICROSHIELD_HEX_FILE = 'unifiscratch-microshield.hex';
const MICROSHIELD_HEX_PATH = `static/extensions/microshield/${MICROSHIELD_HEX_FILE}`;
const ESP32_FIRMWARE_URL = 'https://micropython.org/download/ESP32_GENERIC/';
const ESP_FLASHER_URL = 'https://espressif.github.io/esptool-js/';
const MICROBLOCKS_URL = 'https://microblocks.fun/run/microblocks.html';
const ARDUINO_IDE_URL = 'https://www.arduino.cc/en/software';
const MBLOCK_URL = 'https://mblock.cc/';
const KEYESTUDIO_URL = 'https://docs.keyestudio.com/projects/KS0809/en/latest/docs/ESP32/Software_Tutorial.html';

const FIRST_TIME = ['1. Prepare it (only the first time)', '1. Prepararlo (solo la primera vez)', '1. Preparar-lo (només la primera vegada)'];
const EVERY_TIME = ['2. Use it in Unfyscratch (every time)', '2. Usarlo en Unfyscratch (cada vez)', '2. Fer-lo servir a Unfyscratch (cada vegada)'];
const CLOSE_TAB = ['Close that tab or program: only one application at a time can use the USB port.', 'Cierra esa pestaña o programa: solo una aplicación a la vez puede usar el puerto USB.', 'Tanca aquesta pestanya o programa: només una aplicació alhora pot fer servir el port USB.'];
const CHROME_USB = ['Connect it by USB and use Chrome or Edge.', 'Conéctalo por USB y usa Chrome o Edge.', 'Connecta’l per USB i fes servir Chrome o Edge.'];
const NOT_TESTED = ['This guide has not yet been tested with the physical device. Try it without load, on a table.', 'Esta guía aún no se ha probado con el dispositivo físico. Pruébalo sin carga, sobre una mesa.', 'Aquesta guia encara no s’ha provat amb el dispositiu físic. Prova’l sense càrrega, sobre una taula.'];
const LAST_ERROR = ['If it does not connect, look at the «last connection error» block.', 'Si no conecta, mira el bloque «último error de conexión».', 'Si no connecta, mira el bloc «últim error de connexió».'];
const connectBlock = (en, es, ca) => [`Click the block «${en}» and choose the device in the browser window.`, `Haz clic en el bloque «${es}» y elige el dispositivo en la ventana del navegador.`, `Fes clic al bloc «${ca}» i tria el dispositiu a la finestra del navegador.`];

const guideLink = ['How to prepare it', 'Cómo prepararlo', 'Com preparar-lo'];

// ---------- Scratch Link: LEGO, EV3, BOOST, WeDo 2.0, Force and Acceleration ----------
const SCRATCH_LINK_LABEL = ['Download Scratch Link', 'Descargar Scratch Link', 'Descarregar Scratch Link'];
const scratchLinkGuide = (name, turnOn) => ({
    name,
    intro: [`${name} connects through Scratch Link, a small free application that must be running on the computer.`, `${name} se conecta mediante Scratch Link, una pequeña aplicación gratuita que debe estar en marcha en el ordenador.`, `${name} es connecta amb Scratch Link, una petita aplicació gratuïta que ha d’estar en marxa a l’ordinador.`],
    actions: [{type: 'link', href: SCRATCH_LINK_URL, label: SCRATCH_LINK_LABEL}],
    cardLinks: [{href: SCRATCH_LINK_URL, text: ['Scratch Link (required)', 'Scratch Link (necesario)', 'Scratch Link (necessari)']}],
    sections: [
        {title: FIRST_TIME,
            steps: [
                [`Download and install [Scratch Link](${SCRATCH_LINK_URL}) (Windows or macOS).`, `Descarga e instala [Scratch Link](${SCRATCH_LINK_URL}) (Windows o macOS).`, `Descarrega i instal·la [Scratch Link](${SCRATCH_LINK_URL}) (Windows o macOS).`]
            ]},
        {title: EVERY_TIME,
            steps: [
                ['Open Scratch Link (its icon appears next to the clock) and turn on the computer’s Bluetooth.', 'Abre Scratch Link (su icono aparece junto al reloj) y activa el Bluetooth del ordenador.', 'Obre Scratch Link (la seva icona apareix al costat del rellotge) i activa el Bluetooth de l’ordinador.'],
                turnOn,
                ['Press the orange warning button next to the extension’s name in the block palette, then «Connect».', 'Pulsa el botón naranja de aviso junto al nombre de la extensión en la paleta de bloques y después «Conectar».', 'Prem el botó taronja d’avís al costat del nom de l’extensió a la paleta de blocs i després «Connecta».']
            ]}
    ],
    note: ['Scratch Link does not exist for every system: on Chromebooks and Linux these robots cannot connect.', 'Scratch Link no existe para todos los sistemas: en Chromebook y Linux estos robots no pueden conectarse.', 'Scratch Link no existeix per a tots els sistemes: a Chromebook i Linux aquests robots no es poden connectar.']
});
const PRESS_HUB = ['Switch on the hub and press its button so that its light blinks.', 'Enciende el hub y pulsa su botón para que la luz parpadee.', 'Encén el hub i prem el botó perquè la llum parpellegi.'];
const SWITCH_ON = ['Switch on the device and keep it close to the computer.', 'Enciende el dispositivo y mantenlo cerca del ordenador.', 'Encén el dispositiu i mantén-lo a prop de l’ordinador.'];

// ---------- MicroPython on micro:bit ----------
const microbitFirmwareSteps = [
    [`Connect the micro:bit by USB and open the [Python editor](${MICROBIT_PYTHON_URL}).`, `Conecta la micro:bit por USB y abre el [editor de Python](${MICROBIT_PYTHON_URL}).`, `Connecta la micro:bit per USB i obre l’[editor de Python](${MICROBIT_PYTHON_URL}).`],
    ['Press «Send to micro:bit» and choose the board. This loads MicroPython onto it.', 'Pulsa «Send to micro:bit» y elige la placa. Así se carga MicroPython en ella.', 'Prem «Send to micro:bit» i tria la placa. Així s’hi carrega MicroPython.'],
    CLOSE_TAB
];
const microbitGuide = name => ({
    name,
    intro: [`${name} uses a micro:bit with MicroPython. Loading it replaces the program the micro:bit had.`, `${name} usa una micro:bit con MicroPython. Al cargarlo se sustituye el programa que tuviera la micro:bit.`, `${name} fa servir una micro:bit amb MicroPython. En carregar-lo se substitueix el programa que tingués la micro:bit.`],
    actions: [{type: 'link', href: MICROBIT_PYTHON_URL, label: ['Open Python editor', 'Abrir editor de Python', 'Obrir l’editor de Python']}],
    cardLinks: [{href: MICROBIT_PYTHON_URL, text: ['MicroPython for micro:bit', 'MicroPython para micro:bit', 'MicroPython per a micro:bit']}],
    sections: [
        {title: FIRST_TIME, steps: microbitFirmwareSteps},
        {title: EVERY_TIME,
            steps: [
                CHROME_USB,
                connectBlock('connect by USB', 'conectar por USB', 'connecta per USB'),
                ['The blocks can use pins 0, 1 and 2, for at most 5 seconds per block.', 'Los bloques pueden usar los pines 0, 1 y 2, durante 5 segundos como máximo por bloque.', 'Els blocs poden fer servir els pins 0, 1 i 2, durant 5 segons com a màxim per bloc.']
            ]}
    ],
    note: [`${NOT_TESTED[0]} ${LAST_ERROR[0]}`, `${NOT_TESTED[1]} ${LAST_ERROR[1]}`, `${NOT_TESTED[2]} ${LAST_ERROR[2]}`]
});

// ---------- MicroPython on ESP32 ----------
const esp32FirmwareSteps = [
    [`Download the latest stable .bin file from [MicroPython for ESP32](${ESP32_FIRMWARE_URL}).`, `Descarga el último archivo .bin estable de [MicroPython para ESP32](${ESP32_FIRMWARE_URL}).`, `Descarrega l’últim fitxer .bin estable de [MicroPython per a ESP32](${ESP32_FIRMWARE_URL}).`],
    [`Connect the board by USB, open the [ESP flasher](${ESP_FLASHER_URL}) in Chrome or Edge and press «Connect».`, `Conecta la placa por USB, abre el [programador ESP](${ESP_FLASHER_URL}) en Chrome o Edge y pulsa «Connect».`, `Connecta la placa per USB, obre el [programador ESP](${ESP_FLASHER_URL}) a Chrome o Edge i prem «Connect».`],
    ['Press «Erase Flash». Then choose the .bin file, write 0x1000 as the address and press «Program».', 'Pulsa «Erase Flash». Después elige el archivo .bin, escribe 0x1000 como dirección y pulsa «Program».', 'Prem «Erase Flash». Després tria el fitxer .bin, escriu 0x1000 com a adreça i prem «Program».'],
    CLOSE_TAB
];
const esp32Actions = [
    {type: 'link', href: ESP32_FIRMWARE_URL, label: ['MicroPython firmware', 'Firmware MicroPython', 'Firmware MicroPython']},
    {type: 'link', href: ESP_FLASHER_URL, label: ['Open ESP flasher', 'Abrir programador ESP', 'Obrir el programador ESP']}
];

// ---------- Makeblock: live-mode protocol, not yet tested on real robots ----------
const makeblockGuide = (name, en, es, ca) => ({
    name,
    status: 'unconfirmed',
    warning: [`Not yet tested on a real ${name}. This extension uses the Makeblock live mode over USB, the same one mBlock uses. Close mBlock and mLink first so the USB port is free.`, `Aún sin probar con un ${name} real. Esta extensión usa el modo en vivo de Makeblock por USB, el mismo que usa mBlock. Cierra antes mBlock y mLink para que el puerto USB quede libre.`, `Encara sense provar amb un ${name} real. Aquesta extensió fa servir el mode en directe de Makeblock per USB, el mateix que fa servir mBlock. Tanca abans mBlock i mLink perquè el port USB quedi lliure.`],
    intro: [`${name} needs up-to-date firmware from Makeblock.`, `${name} necesita el firmware de Makeblock actualizado.`, `${name} necessita el firmware de Makeblock actualitzat.`],
    actions: [{type: 'link', href: MBLOCK_URL, label: ['Open mBlock', 'Abrir mBlock', 'Obrir mBlock']}],
    cardLinks: [{href: MBLOCK_URL, text: ['mBlock (firmware update)', 'mBlock (actualizar firmware)', 'mBlock (actualitzar el firmware)']}],
    sections: [
        {title: FIRST_TIME,
            steps: [
                [`Connect the robot by USB and update its firmware with [mBlock](${MBLOCK_URL}).`, `Conecta el robot por USB y actualiza su firmware con [mBlock](${MBLOCK_URL}).`, `Connecta el robot per USB i actualitza’n el firmware amb [mBlock](${MBLOCK_URL}).`],
                CLOSE_TAB
            ]},
        {title: EVERY_TIME, steps: [CHROME_USB, connectBlock(en, es, ca)]}
    ],
    note: [`${NOT_TESTED[0]} ${LAST_ERROR[0]}`, `${NOT_TESTED[1]} ${LAST_ERROR[1]}`, `${NOT_TESTED[2]} ${LAST_ERROR[2]}`]
});

const guides = {
    edisonV3: {
        name: 'Edison V3',
        intro: ['Edison needs a small bridge program. You only load it once; it stays on the robot until you load another program.', 'Edison necesita un pequeño programa puente. Solo hay que cargarlo una vez: se queda en el robot hasta que cargues otro programa.', 'Edison necessita un petit programa pont. Només cal carregar-lo una vegada: es queda al robot fins que en carreguis un altre.'],
        actions: [
            {type: 'copy', path: BRIDGE_PATH, label: ['Copy bridge program', 'Copiar programa puente', 'Copiar el programa pont']},
            {type: 'download', path: BRIDGE_PATH, file: BRIDGE_FILE, label: ['Download bridge program', 'Descargar programa puente', 'Descarregar el programa pont']},
            {type: 'link', href: EDPY_URL, label: ['Open EdPy V3', 'Abrir EdPy V3', 'Obrir EdPy V3']}
        ],
        cardLinks: [{href: BRIDGE_PATH, download: BRIDGE_FILE, text: ['Edison bridge program (.py)', 'Programa puente para Edison (.py)', 'Programa pont per a Edison (.py)']}],
        sections: [
            {title: FIRST_TIME,
                steps: [
                    ['Press «Copy bridge program» (or download it).', 'Pulsa «Copiar programa puente» (o descárgalo).', 'Prem «Copiar el programa pont» (o descarrega’l).'],
                    [`Open [EdPy V3](${EDPY_URL}), delete all the code in the editor and paste the bridge program.`, `Abre [EdPy V3](${EDPY_URL}), borra todo el código del editor y pega el programa puente.`, `Obre [EdPy V3](${EDPY_URL}), esborra tot el codi de l’editor i enganxa el programa pont.`],
                    ['Switch Edison on and connect it to the computer with the USB cable.', 'Enciende el Edison y conéctalo al ordenador con el cable USB.', 'Encén l’Edison i connecta’l a l’ordinador amb el cable USB.'],
                    ['Press «Program Edison», then «Connect Edison» and choose Edison V3 in the browser window. Press «Download program» and wait until it finishes.', 'Pulsa «Program Edison», después «Connect Edison» y elige Edison V3 en la ventana del navegador. Pulsa «Download program» y espera a que termine.', 'Prem «Program Edison», després «Connect Edison» i tria Edison V3 a la finestra del navegador. Prem «Download program» i espera que acabi.'],
                    ['Close the EdPy tab: only one page at a time can use Edison.', 'Cierra la pestaña de EdPy: solo una página a la vez puede usar el Edison.', 'Tanca la pestanya d’EdPy: només una pàgina alhora pot fer servir l’Edison.']
                ]},
            {title: EVERY_TIME,
                steps: [
                    ['Connect Edison by USB and switch it on. Use Chrome or Edge.', 'Conecta el Edison por USB y enciéndelo. Usa Chrome o Edge.', 'Connecta l’Edison per USB i encén-lo. Fes servir Chrome o Edge.'],
                    ['Click the block «connect Edison V3 by USB» and choose Edison in the browser window. Edison beeps when it is ready.', 'Haz clic en el bloque «conectar Edison V3 por USB» y elige el Edison en la ventana del navegador. El Edison pita cuando está listo.', 'Fes clic al bloc «connecta Edison V3 per USB» i tria l’Edison a la finestra del navegador. L’Edison xiula quan està a punt.'],
                    ['Try it on a table: each block moves at most 30 cm or 360°. The red flag stops Edison. If you press the square button on the robot, connect again.', 'Pruébalo sobre una mesa: cada bloque mueve como máximo 30 cm o 360°. La bandera roja detiene el Edison. Si pulsas el botón cuadrado del robot, vuelve a conectar.', 'Prova’l sobre una taula: cada bloc mou com a màxim 30 cm o 360°. La bandera vermella atura l’Edison. Si prems el botó quadrat del robot, torna a connectar.']
                ]}
        ],
        note: ['If Edison does not answer, load the bridge program again with EdPy and check the «last connection error» block.', 'Si el Edison no responde, vuelve a cargar el programa puente con EdPy y mira el bloque «último error de conexión».', 'Si l’Edison no respon, torna a carregar el programa pont amb EdPy i mira el bloc «últim error de connexió».']
    },
    ed1Board: {
        name: 'ED1',
        warning: ['The ED1 comes with MicroBlocks. This extension needs MicroPython, which replaces it. You can go back to MicroBlocks later from its editor.', 'La ED1 viene con MicroBlocks. Esta extensión necesita MicroPython, que lo sustituye. Más adelante puedes volver a MicroBlocks desde su editor.', 'L’ED1 ve amb MicroBlocks. Aquesta extensió necessita MicroPython, que el substitueix. Més endavant pots tornar a MicroBlocks des del seu editor.'],
        intro: ['The ED1 needs MicroPython firmware for ESP32. You only load it once.', 'La ED1 necesita el firmware MicroPython para ESP32. Solo hay que cargarlo una vez.', 'L’ED1 necessita el firmware MicroPython per a ESP32. Només cal carregar-lo una vegada.'],
        actions: [...esp32Actions, {type: 'link', href: MICROBLOCKS_URL, label: ['Open MicroBlocks', 'Abrir MicroBlocks', 'Obrir MicroBlocks']}],
        cardLinks: [{href: ESP32_FIRMWARE_URL, text: ['MicroPython firmware for ED1', 'Firmware MicroPython para ED1', 'Firmware MicroPython per a ED1']}],
        sections: [
            {title: FIRST_TIME, steps: esp32FirmwareSteps},
            {title: EVERY_TIME,
                steps: [
                    CHROME_USB,
                    [...connectBlock('connect ED1 by USB', 'conectar ED1 por USB', 'connecta ED1 per USB')].map((text, index) => `${text} ${['Do not touch the touch buttons while it connects.', 'No toques los botones táctiles mientras conecta.', 'No toquis els botons tàctils mentre connecta.'][index]}`),
                    ['Each motor or tone block lasts at most 5 seconds. The red flag stops the motors.', 'Cada bloque de motor o de tono dura 5 segundos como máximo. La bandera roja detiene los motores.', 'Cada bloc de motor o de to dura 5 segons com a màxim. La bandera vermella atura els motors.']
                ]}
        ],
        note: [`${NOT_TESTED[0]} ${LAST_ERROR[0]}`, `${NOT_TESTED[1]} ${LAST_ERROR[1]}`, `${NOT_TESTED[2]} ${LAST_ERROR[2]}`]
    },
    keyestudioEsp32: {
        name: 'Keyestudio ESP32',
        intro: ['This board needs MicroPython firmware for ESP32. You only load it once.', 'Esta placa necesita el firmware MicroPython para ESP32. Solo hay que cargarlo una vez.', 'Aquesta placa necessita el firmware MicroPython per a ESP32. Només cal carregar-lo una vegada.'],
        actions: [...esp32Actions, {type: 'link', href: KEYESTUDIO_URL, label: ['Keyestudio guide', 'Guía de Keyestudio', 'Guia de Keyestudio']}],
        cardLinks: [{href: ESP32_FIRMWARE_URL, text: ['MicroPython firmware for ESP32', 'Firmware MicroPython para ESP32', 'Firmware MicroPython per a ESP32']}],
        sections: [
            {title: FIRST_TIME, steps: esp32FirmwareSteps},
            {title: EVERY_TIME,
                steps: [
                    CHROME_USB,
                    connectBlock('connect by USB', 'conectar por USB', 'connecta per USB'),
                    ['Allowed pins: 2, 4, 13, 14, 25, 26, 27, 32 and 33. Each block lasts at most 5 seconds.', 'Pines permitidos: 2, 4, 13, 14, 25, 26, 27, 32 y 33. Cada bloque dura 5 segundos como máximo.', 'Pins permesos: 2, 4, 13, 14, 25, 26, 27, 32 i 33. Cada bloc dura 5 segons com a màxim.']
                ]}
        ],
        note: [`${NOT_TESTED[0]} ${LAST_ERROR[0]}`, `${NOT_TESTED[1]} ${LAST_ERROR[1]}`, `${NOT_TESTED[2]} ${LAST_ERROR[2]}`]
    },
    microShield: {
        name: 'micro:shield',
        warning: ['micro:shield needs the Unifiscratch program on its micro:bit. Loading it replaces the program the micro:bit had; you can load another one later.', 'La micro:shield necesita el programa de Unifiscratch en su micro:bit. Al cargarlo se sustituye el programa que tuviera la micro:bit; más adelante puedes cargar otro.', 'La micro:shield necessita el programa d’Unifiscratch a la seva micro:bit. En carregar-lo se substitueix el programa que tingués la micro:bit; més endavant en pots carregar un altre.'],
        intro: ['The program (.hex) lets Unifiscratch control the board and its motors, servos and sensors by Bluetooth or by USB. You only load it once.', 'El programa (.hex) permite que Unifiscratch controle la placa y sus motores, servos y sensores por Bluetooth o por USB. Solo hay que cargarlo una vez.', 'El programa (.hex) permet que Unifiscratch controli la placa i els seus motors, servos i sensors per Bluetooth o per USB. Només cal carregar-lo una vegada.'],
        actions: [{type: 'download', path: MICROSHIELD_HEX_PATH, file: MICROSHIELD_HEX_FILE, label: ['Download micro:bit program (.hex)', 'Descargar programa para micro:bit (.hex)', 'Descarregar el programa per a micro:bit (.hex)']}],
        cardLinks: [{href: MICROSHIELD_HEX_PATH, download: MICROSHIELD_HEX_FILE, text: ['micro:shield program for micro:bit (.hex)', 'Programa de micro:shield para micro:bit (.hex)', 'Programa de micro:shield per a micro:bit (.hex)']}],
        sections: [
            {title: FIRST_TIME,
                steps: [
                    ['Press «Download micro:bit program (.hex)».', 'Pulsa «Descargar programa para micro:bit (.hex)».', 'Prem «Descarregar el programa per a micro:bit (.hex)».'],
                    ['Connect the micro:bit to the computer by USB. It appears as a drive called MICROBIT.', 'Conecta la micro:bit al ordenador por USB. Aparece como una unidad llamada MICROBIT.', 'Connecta la micro:bit a l’ordinador per USB. Apareix com una unitat anomenada MICROBIT.'],
                    ['Copy the .hex file to the MICROBIT drive and wait until the light stops blinking. The display shows an «S» when it is ready.', 'Copia el archivo .hex en la unidad MICROBIT y espera a que la luz deje de parpadear. La pantalla muestra una «S» cuando está lista.', 'Copia el fitxer .hex a la unitat MICROBIT i espera que la llum deixi de parpellejar. La pantalla mostra una «S» quan està a punt.']
                ]},
            {title: EVERY_TIME,
                steps: [
                    ['Fit the micro:bit on the micro:shield and power the board (motors and servos need its own power supply). Use Chrome or Edge with the computer’s Bluetooth turned on.', 'Coloca la micro:bit en la micro:shield y alimenta la placa (motores y servos necesitan su propia alimentación). Usa Chrome o Edge con el Bluetooth del ordenador activado.', 'Col·loca la micro:bit a la micro:shield i alimenta la placa (motors i servos necessiten la seva pròpia alimentació). Fes servir Chrome o Edge amb el Bluetooth de l’ordinador activat.'],
                    ['Click the block «connect micro:shield by Bluetooth» and choose «BBC micro:bit» in the browser window. A tick appears on the display.', 'Haz clic en el bloque «conectar micro:shield por Bluetooth» y elige «BBC micro:bit» en la ventana del navegador. En la pantalla aparece un tic.', 'Fes clic al bloc «connecta micro:shield per Bluetooth» i tria «BBC micro:bit» a la finestra del navegador. A la pantalla apareix un tic.'],
                    ['Without Bluetooth, connect the micro:bit with the USB cable and use «connect micro:shield by USB» instead.', 'Sin Bluetooth, conecta la micro:bit con el cable USB y usa «conectar micro:shield por USB».', 'Sense Bluetooth, connecta la micro:bit amb el cable USB i fes servir «connecta micro:shield per USB».'],
                    ['Steppers use the same outputs as the DC motors: STEP1 = M1+M2 and STEP2 = M3+M4. The red flag stops every motor; if the connection is lost, they stop by themselves.', 'Los motores paso a paso usan las mismas salidas que los motores DC: STEP1 = M1+M2 y STEP2 = M3+M4. La bandera roja detiene todos los motores; si se pierde la conexión, se paran solos.', 'Els motors pas a pas fan servir les mateixes sortides que els motors DC: STEP1 = M1+M2 i STEP2 = M3+M4. La bandera vermella atura tots els motors; si es perd la connexió, s’aturen sols.']
                ]}
        ],
        note: [`${NOT_TESTED[0]} ${LAST_ERROR[0]}`, `${NOT_TESTED[1]} ${LAST_ERROR[1]}`, `${NOT_TESTED[2]} ${LAST_ERROR[2]}`]
    },
    wappstoBit: microbitGuide('Wappsto:Bit'),
    smartCutebot: {
        name: 'Cutebot',
        warning: ['Cutebot needs the Unifiscratch program on its micro:bit. Loading it replaces the program the micro:bit had; you can load another one later.', 'El Cutebot necesita el programa de Unifiscratch en su micro:bit. Al cargarlo se sustituye el programa que tuviera la micro:bit; más adelante puedes cargar otro.', 'El Cutebot necessita el programa d’Unifiscratch a la seva micro:bit. En carregar-lo se substitueix el programa que tingués la micro:bit; més endavant en pots carregar un altre.'],
        intro: ['The program (.hex) lets Unifiscratch control the robot by Bluetooth or by USB. You only load it once.', 'El programa (.hex) permite que Unifiscratch controle el robot por Bluetooth o por USB. Solo hay que cargarlo una vez.', 'El programa (.hex) permet que Unifiscratch controli el robot per Bluetooth o per USB. Només cal carregar-lo una vegada.'],
        actions: [{type: 'download', path: CUTEBOT_HEX_PATH, file: CUTEBOT_HEX_FILE, label: ['Download micro:bit program (.hex)', 'Descargar programa para micro:bit (.hex)', 'Descarregar el programa per a micro:bit (.hex)']}],
        cardLinks: [{href: CUTEBOT_HEX_PATH, download: CUTEBOT_HEX_FILE, text: ['Cutebot program for micro:bit (.hex)', 'Programa del Cutebot para micro:bit (.hex)', 'Programa del Cutebot per a micro:bit (.hex)']}],
        sections: [
            {title: FIRST_TIME,
                steps: [
                    ['Press «Download micro:bit program (.hex)».', 'Pulsa «Descargar programa para micro:bit (.hex)».', 'Prem «Descarregar el programa per a micro:bit (.hex)».'],
                    ['Connect the micro:bit to the computer by USB. It appears as a drive called MICROBIT.', 'Conecta la micro:bit al ordenador por USB. Aparece como una unidad llamada MICROBIT.', 'Connecta la micro:bit a l’ordinador per USB. Apareix com una unitat anomenada MICROBIT.'],
                    ['Copy the .hex file to the MICROBIT drive and wait until the light stops blinking. The display shows a «C» when it is ready.', 'Copia el archivo .hex en la unidad MICROBIT y espera a que la luz deje de parpadear. La pantalla muestra una «C» cuando está lista.', 'Copia el fitxer .hex a la unitat MICROBIT i espera que la llum deixi de parpellejar. La pantalla mostra una «C» quan està a punt.']
                ]},
            {title: EVERY_TIME,
                steps: [
                    ['Fit the micro:bit on the Cutebot and switch the robot on. Use Chrome or Edge with the computer’s Bluetooth turned on.', 'Coloca la micro:bit en el Cutebot y enciende el robot. Usa Chrome o Edge con el Bluetooth del ordenador activado.', 'Col·loca la micro:bit al Cutebot i encén el robot. Fes servir Chrome o Edge amb el Bluetooth de l’ordinador activat.'],
                    ['Click the block «connect Cutebot by Bluetooth» and choose «BBC micro:bit» in the browser window. A tick appears on the display.', 'Haz clic en el bloque «conectar Cutebot por Bluetooth» y elige «BBC micro:bit» en la ventana del navegador. En la pantalla aparece un tic.', 'Fes clic al bloc «connecta Cutebot per Bluetooth» i tria «BBC micro:bit» a la finestra del navegador. A la pantalla apareix un tic.'],
                    ['Without Bluetooth, connect the micro:bit with the USB cable and use «connect Cutebot by USB» instead.', 'Sin Bluetooth, conecta la micro:bit con el cable USB y usa «conectar Cutebot por USB».', 'Sense Bluetooth, connecta la micro:bit amb el cable USB i fes servir «connecta Cutebot per USB».'],
                    ['The red flag stops the robot. If the connection is lost, the motors stop by themselves.', 'La bandera roja detiene el robot. Si se pierde la conexión, los motores se paran solos.', 'La bandera vermella atura el robot. Si es perd la connexió, els motors s’aturen sols.']
                ]}
        ],
        note: [`${NOT_TESTED[0]} ${LAST_ERROR[0]}`, `${NOT_TESTED[1]} ${LAST_ERROR[1]}`, `${NOT_TESTED[2]} ${LAST_ERROR[2]}`]
    },
    makeblockCodeyRocky: makeblockGuide('Codey Rocky', 'connect Codey Rocky by USB', 'conectar Codey Rocky por USB', 'connecta Codey Rocky per USB'),
    makeblockMbot2: makeblockGuide('mBot2', 'connect mBot2 by USB', 'conectar mBot2 por USB', 'connecta mBot2 per USB'),
    xcxArduino: {
        name: 'Arduino UNO',
        intro: ['The Arduino needs the StandardFirmata program, which comes with the Arduino IDE. You only load it once.', 'El Arduino necesita el programa StandardFirmata, que viene con el Arduino IDE. Solo hay que cargarlo una vez.', 'L’Arduino necessita el programa StandardFirmata, que ve amb l’Arduino IDE. Només cal carregar-lo una vegada.'],
        actions: [{type: 'link', href: ARDUINO_IDE_URL, label: ['Download Arduino IDE', 'Descargar Arduino IDE', 'Descarregar l’Arduino IDE']}],
        cardLinks: [{href: ARDUINO_IDE_URL, text: ['Arduino IDE (StandardFirmata)', 'Arduino IDE (StandardFirmata)', 'Arduino IDE (StandardFirmata)']}],
        sections: [
            {title: FIRST_TIME,
                steps: [
                    [`Install the [Arduino IDE](${ARDUINO_IDE_URL}) and connect the Arduino by USB.`, `Instala el [Arduino IDE](${ARDUINO_IDE_URL}) y conecta el Arduino por USB.`, `Instal·la l’[Arduino IDE](${ARDUINO_IDE_URL}) i connecta l’Arduino per USB.`],
                    ['Open File > Examples > Firmata > StandardFirmata, choose your board and port, and press Upload.', 'Abre Archivo > Ejemplos > Firmata > StandardFirmata, elige la placa y el puerto y pulsa Subir.', 'Obre Fitxer > Exemples > Firmata > StandardFirmata, tria la placa i el port i prem Puja.'],
                    CLOSE_TAB
                ]},
            {title: EVERY_TIME,
                steps: [
                    CHROME_USB,
                    ['Press the orange warning button next to the extension’s name in the block palette and choose the port.', 'Pulsa el botón naranja de aviso junto al nombre de la extensión en la paleta de bloques y elige el puerto.', 'Prem el botó taronja d’avís al costat del nom de l’extensió a la paleta de blocs i tria el port.']
                ]}
        ],
        note: ['The ultrasonic sensor block needs PingFirmata instead of StandardFirmata. This guide has not yet been tested with a physical board.', 'El bloque del sensor de ultrasonidos necesita PingFirmata en lugar de StandardFirmata. Esta guía aún no se ha probado con una placa física.', 'El bloc del sensor d’ultrasons necessita PingFirmata en lloc de StandardFirmata. Aquesta guia encara no s’ha provat amb una placa física.']
    },
    microbitMore: {
        name: 'Microbit More',
        intro: ['The micro:bit needs the Microbit More program. You only load it once.', 'La micro:bit necesita el programa de Microbit More. Solo hay que cargarlo una vez.', 'La micro:bit necessita el programa de Microbit More. Només cal carregar-lo una vegada.'],
        actions: [{type: 'link', href: MICROBIT_MORE_HEX, label: ['Download micro:bit program (.hex)', 'Descargar programa para micro:bit (.hex)', 'Descarregar el programa per a micro:bit (.hex)']}],
        cardLinks: [{href: MICROBIT_MORE_HEX, text: ['micro:bit program (.hex)', 'Programa para micro:bit (.hex)', 'Programa per a micro:bit (.hex)']}],
        sections: [
            {title: FIRST_TIME,
                steps: [
                    ['Download the .hex program and connect the micro:bit by USB. It appears as a drive called MICROBIT.', 'Descarga el programa .hex y conecta la micro:bit por USB. Aparece como una unidad llamada MICROBIT.', 'Descarrega el programa .hex i connecta la micro:bit per USB. Apareix com una unitat anomenada MICROBIT.'],
                    ['Copy the .hex file to the MICROBIT drive and wait until the board’s light stops blinking.', 'Copia el archivo .hex en la unidad MICROBIT y espera a que la luz de la placa deje de parpadear.', 'Copia el fitxer .hex a la unitat MICROBIT i espera que la llum de la placa deixi de parpellejar.']
                ]},
            {title: EVERY_TIME,
                steps: [
                    ['Power the micro:bit and use Chrome or Edge, which connect directly by Bluetooth. Other browsers need Scratch Link.', 'Alimenta la micro:bit y usa Chrome o Edge, que conectan directamente por Bluetooth. Otros navegadores necesitan Scratch Link.', 'Alimenta la micro:bit i fes servir Chrome o Edge, que connecten directament per Bluetooth. Altres navegadors necessiten Scratch Link.'],
                    ['Press the orange warning button next to the extension’s name in the block palette and choose your micro:bit.', 'Pulsa el botón naranja de aviso junto al nombre de la extensión en la paleta de bloques y elige tu micro:bit.', 'Prem el botó taronja d’avís al costat del nom de l’extensió a la paleta de blocs i tria la teva micro:bit.']
                ]}
        ]
    },
    spikeessential: scratchLinkGuide('LEGO SPIKE Essential', PRESS_HUB),
    legoble: scratchLinkGuide('LEGO BLE Device', PRESS_HUB),
    poweredup: scratchLinkGuide('LEGO Powered UP', PRESS_HUB),
    legoremote: scratchLinkGuide('LEGO Powered UP Remote', ['Press the green button on the remote so that its light blinks.', 'Pulsa el botón verde del mando para que la luz parpadee.', 'Prem el botó verd del comandament perquè la llum parpellegi.']),
    controlplus: scratchLinkGuide('LEGO Technic CONTROL+', PRESS_HUB),
    duplotrain: scratchLinkGuide('LEGO DUPLO Train', ['Push the train forward so that it switches on and its light blinks.', 'Empuja el tren hacia delante para que se encienda y su luz parpadee.', 'Empeny el tren endavant perquè s’encengui i la seva llum parpellegi.']),
    legomario: scratchLinkGuide('LEGO Mario', ['Switch on the figure and press its Bluetooth button.', 'Enciende la figura y pulsa su botón de Bluetooth.', 'Encén la figura i prem el botó de Bluetooth.']),
    legoluigi: scratchLinkGuide('LEGO Luigi', ['Switch on the figure and press its Bluetooth button.', 'Enciende la figura y pulsa su botón de Bluetooth.', 'Encén la figura i prem el botó de Bluetooth.']),
    legopeach: scratchLinkGuide('LEGO Peach', ['Switch on the figure and press its Bluetooth button.', 'Enciende la figura y pulsa su botón de Bluetooth.', 'Encén la figura i prem el botó de Bluetooth.']),
    ev3: scratchLinkGuide('LEGO EV3', ['Switch on the EV3 and pair it with the computer in the system’s Bluetooth settings.', 'Enciende el EV3 y emparéjalo con el ordenador en los ajustes de Bluetooth del sistema.', 'Encén l’EV3 i aparella’l amb l’ordinador a la configuració de Bluetooth del sistema.']),
    boost: scratchLinkGuide('LEGO BOOST', PRESS_HUB),
    wedo2: scratchLinkGuide('LEGO WeDo 2.0', PRESS_HUB),
    gdxfor: scratchLinkGuide('Go Direct Force & Acceleration', SWITCH_ON)
};

export const guideFor = id => (Object.prototype.hasOwnProperty.call(guides, id) ? guides[id] : null);
export const guideIds = () => Object.keys(guides);

// Links for the library card: what the extension needs, plus the guide itself.
export const cardLinksFor = (id, locale) => {
    const guide = guideFor(id);
    if (!guide) return [];
    return [
        ...guide.cardLinks.map(link => ({...link, text: pickText(link.text, locale)})),
        {guideId: id, text: pickText(guideLink, locale)}
    ];
};
