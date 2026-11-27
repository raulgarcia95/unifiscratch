/* eslint-disable max-len */
// Preparation guides for extensions that cannot be used just by adding them:
// they need a bridge program, a firmware or a helper application.
//
// The table lives outside the extension modules so it also covers the curated
// originals (LEGO, Microbit More, Arduino), whose code is pinned by hash.
// Texts are [English, Spanish, Catalan]. Steps may contain [text](url) links.

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
const MICROBIT_MORE_HEX = 'https://github.com/microbit-more/pxt-mbit-more-v2/releases/download/0.2.5/microbit-mbit-more-v2-0_2_5.hex';
const CUTEBOT_HEX_FILE = 'unifiscratch-cutebot.hex';
const CUTEBOT_HEX_PATH = `static/extensions/cutebot/${CUTEBOT_HEX_FILE}`;
const WAPPSTO_HEX_FILE = 'unifiscratch-wappsto-bit.hex';
const WAPPSTO_HEX_PATH = `static/extensions/wappsto-bit/${WAPPSTO_HEX_FILE}`;
const WAPPSTO_SETUP_URL = 'https://bit.wappsto.com/setup';
const MICROSHIELD_HEX_FILE = 'unifiscratch-microshield.hex';
const MICROSHIELD_HEX_PATH = `static/extensions/microshield/${MICROSHIELD_HEX_FILE}`;
const ESP32_FIRMWARE_URL = 'https://micropython.org/download/ESP32_GENERIC/';
const ESP_FLASHER_URL = 'https://espressif.github.io/esptool-js/';
const MICROBLOCKS_URL = 'https://microblocks.fun/run/microblocks.html';
const ARDUINO_IDE_URL = 'https://www.arduino.cc/en/software';
const MBLOCK_URL = 'https://mblock.cc/';
const PYBRICKS_CODE_URL = 'https://code.pybricks.com/';
const KEYESTUDIO_URL = 'https://docs.keyestudio.com/projects/KS0809/en/latest/docs/ESP32/Software_Tutorial.html';

const FIRST_TIME = ['1. Prepare it (only the first time)', '1. Prepararlo (solo la primera vez)', '1. Preparar-lo (només la primera vegada)'];
const EVERY_TIME = ['2. Use it in Unfyscratch (every time)', '2. Usarlo en Unfyscratch (cada vez)', '2. Fer-lo servir a Unfyscratch (cada vegada)'];
const CLOSE_TAB = ['Close that tab or program: only one application at a time can use the USB port.', 'Cierra esa pestaña o programa: solo una aplicación a la vez puede usar el puerto USB.', 'Tanca aquesta pestanya o programa: només una aplicació alhora pot fer servir el port USB.'];
const CHROME_USB = ['Connect it by USB and use Chrome or Edge.', 'Conéctalo por USB y usa Chrome o Edge.', 'Connecta’l per USB i fes servir Chrome o Edge.'];
const LAST_ERROR = ['If it does not connect, look at the «last connection error» block.', 'Si no conecta, mira el bloque «último error de conexión».', 'Si no connecta, mira el bloc «últim error de connexió».'];
const connectBlock = (en, es, ca) => [`Press the button «${en}» and choose the device in the browser window.`, `Pulsa el botón «${es}» y elige el dispositivo en la ventana del navegador.`, `Prem el botó «${ca}» i tria el dispositiu a la finestra del navegador.`];

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
// ---------- Web Bluetooth: LEGO BLE hubs, WeDo 2.0, Force and Acceleration ----------
// Chrome and Edge connect to these directly. Scratch Link is only a fallback
// (used when it is running, needed in browsers without Web Bluetooth), so the
// guide does not open by itself when the extension is added.
const webBluetoothGuide = (name, turnOn) => ({
    name,
    openOnAdd: false,
    intro: [`${name} connects by Bluetooth directly from Chrome or Edge: there is nothing to install.`, `${name} se conecta por Bluetooth directamente desde Chrome o Edge: no hay que instalar nada.`, `${name} es connecta per Bluetooth directament des de Chrome o Edge: no cal instal·lar res.`],
    actions: [],
    cardLinks: [{opensGuide: true, text: ['Bluetooth from Chrome or Edge (no installation)', 'Bluetooth desde Chrome o Edge (sin instalar nada)', 'Bluetooth des de Chrome o Edge (sense instal·lar res)']}],
    sections: [
        {title: ['1. Prepare it', '1. Prepararlo', '1. Preparar-lo'],
            steps: [
                ['Use Chrome or Edge and turn on the computer’s Bluetooth.', 'Usa Chrome o Edge y activa el Bluetooth del ordenador.', 'Fes servir Chrome o Edge i activa el Bluetooth de l’ordinador.']
            ]},
        {title: EVERY_TIME,
            steps: [
                turnOn,
                ['Press the orange warning button next to the extension’s name in the block palette.', 'Pulsa el botón naranja de aviso junto al nombre de la extensión en la paleta de bloques.', 'Prem el botó taronja d’avís al costat del nom de l’extensió a la paleta de blocs.'],
                ['Choose the device in the browser window and press «Pair». Then press «Connect» in Unfyscratch.', 'Elige el dispositivo en la ventana del navegador y pulsa «Emparejar». Después pulsa «Conectar» en Unfyscratch.', 'Tria el dispositiu a la finestra del navegador i prem «Emparellar». Després prem «Connecta» a Unfyscratch.']
            ]}
    ],
    note: ['Scratch Link is not needed. It is only used if it is already open on the computer, or in browsers without Web Bluetooth, such as Firefox or Safari.', 'No hace falta Scratch Link. Solo se usa si ya está abierto en el ordenador, o en navegadores sin Bluetooth web, como Firefox o Safari.', 'No cal Scratch Link. Només es fa servir si ja és obert a l’ordinador, o en navegadors sense Bluetooth web, com Firefox o Safari.']
});
const PRESS_HUB = ['Switch on the hub and press its button so that its light blinks.', 'Enciende el hub y pulsa su botón para que la luz parpadee.', 'Encén el hub i prem el botó perquè la llum parpellegi.'];
const SWITCH_ON = ['Switch on the device and keep it close to the computer.', 'Enciende el dispositivo y mantenlo cerca del ordenador.', 'Encén el dispositiu i mantén-lo a prop de l’ordinador.'];

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

// ---------- Makeblock: live-mode protocol (USB or Bluetooth) ----------
const makeblockGuide = (name, usb, bluetooth) => ({
    name,
    warning: [`This extension uses the Makeblock live mode by USB or Bluetooth, the same one mBlock uses. Close mBlock and mLink first so the robot is free.`, `Esta extensión usa el modo en vivo de Makeblock por USB o Bluetooth, el mismo que usa mBlock. Cierra antes mBlock y mLink para que el robot quede libre.`, `Aquesta extensió fa servir el mode en directe de Makeblock per USB o Bluetooth, el mateix que fa servir mBlock. Tanca abans mBlock i mLink perquè el robot quedi lliure.`],
    intro: [`${name} needs up-to-date firmware from Makeblock. It connects by USB cable or by Bluetooth.`, `${name} necesita el firmware de Makeblock actualizado. Se conecta por cable USB o por Bluetooth.`, `${name} necessita el firmware de Makeblock actualitzat. Es connecta per cable USB o per Bluetooth.`],
    actions: [{type: 'link', href: MBLOCK_URL, label: ['Open mBlock', 'Abrir mBlock', 'Obrir mBlock']}],
    cardLinks: [{href: MBLOCK_URL, text: ['mBlock (firmware update)', 'mBlock (actualizar firmware)', 'mBlock (actualitzar el firmware)']}],
    sections: [
        {title: FIRST_TIME,
            steps: [
                [`Connect the robot by USB and update its firmware with [mBlock](${MBLOCK_URL}).`, `Conecta el robot por USB y actualiza su firmware con [mBlock](${MBLOCK_URL}).`, `Connecta el robot per USB i actualitza’n el firmware amb [mBlock](${MBLOCK_URL}).`],
                CLOSE_TAB
            ]},
        {title: EVERY_TIME,
            steps: [
                ['By USB: connect the cable, switch the robot on and use Chrome or Edge.', 'Por USB: conecta el cable, enciende el robot y usa Chrome o Edge.', 'Per USB: connecta el cable, encén el robot i fes servir Chrome o Edge.'],
                connectBlock(...usb),
                ['By Bluetooth: switch the robot on, keep it close and turn on the computer’s Bluetooth. Use Chrome or Edge.', 'Por Bluetooth: enciende el robot, tenlo cerca y activa el Bluetooth del ordenador. Usa Chrome o Edge.', 'Per Bluetooth: encén el robot, tingues-lo a prop i activa el Bluetooth de l’ordinador. Fes servir Chrome o Edge.'],
                connectBlock(...bluetooth)
            ]}
    ],
    note: [`The computer needs its own Bluetooth (the Makeblock USB Bluetooth dongle is not used). ${LAST_ERROR[0]}`, `El ordenador necesita Bluetooth propio (no se usa la llave Bluetooth USB de Makeblock). ${LAST_ERROR[1]}`, `L’ordinador necessita Bluetooth propi (no es fa servir la clau Bluetooth USB de Makeblock). ${LAST_ERROR[2]}`]
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
                    ['Press the button «connect Edison V3 by USB» and choose Edison in the browser window. Edison beeps when it is ready.', 'Pulsa el botón «conectar Edison V3 por USB» y elige el Edison en la ventana del navegador. El Edison pita cuando está listo.', 'Prem el botó «connecta Edison V3 per USB» i tria l’Edison a la finestra del navegador. L’Edison xiula quan està a punt.'],
                    ['Try it on a table: each block moves at most 30 cm or 360°. The red flag stops Edison. If you press the square button on the robot, connect again.', 'Pruébalo sobre una mesa: cada bloque mueve como máximo 30 cm o 360°. La bandera roja detiene el Edison. Si pulsas el botón cuadrado del robot, vuelve a conectar.', 'Prova’l sobre una taula: cada bloc mou com a màxim 30 cm o 360°. La bandera vermella atura l’Edison. Si prems el botó quadrat del robot, torna a connectar.']
                ]}
        ],
        note: ['If Edison does not answer, load the bridge program again with EdPy and check the «last connection error» block.', 'Si el Edison no responde, vuelve a cargar el programa puente con EdPy y mira el bloque «último error de conexión».', 'Si l’Edison no respon, torna a carregar el programa pont amb EdPy i mira el bloc «últim error de connexió».']
    },
    ed1Board: {
        name: 'ED1',
        intro: ['The ED1 works with the MicroBlocks firmware it comes with. You do not need to install anything else.', 'La ED1 funciona con el firmware MicroBlocks que trae de fábrica. No hace falta instalar nada más.', 'L’ED1 funciona amb el firmware MicroBlocks que porta de fàbrica. No cal instal·lar res més.'],
        actions: [{type: 'link', href: MICROBLOCKS_URL, label: ['Open MicroBlocks', 'Abrir MicroBlocks', 'Obrir MicroBlocks']}],
        cardLinks: [{href: MICROBLOCKS_URL, text: ['MicroBlocks (firmware update)', 'MicroBlocks (actualizar firmware)', 'MicroBlocks (actualitzar el firmware)']}],
        sections: [
            {title: FIRST_TIME,
                steps: [
                    ['Only if the ED1 has another firmware (for example MicroPython) or a very old one: open MicroBlocks, connect the board and use «update firmware on board» in the gear menu.', 'Solo si la ED1 tiene otro firmware (por ejemplo MicroPython) o uno muy antiguo: abre MicroBlocks, conecta la placa y usa «actualizar firmware de la placa» en el menú del engranaje.', 'Només si l’ED1 té un altre firmware (per exemple MicroPython) o un de molt antic: obre MicroBlocks, connecta la placa i fes servir «actualitza el firmware de la placa» al menú de l’engranatge.'],
                    CLOSE_TAB
                ]},
            {title: EVERY_TIME,
                steps: [
                    CHROME_USB,
                    connectBlock('connect ED1 by USB', 'conectar ED1 por USB', 'connecta ED1 per USB'),
                    ['The first time, Unfyscratch saves a few small helper programs on the ED1; it takes a few seconds. The red flag stops the motors and the sound.', 'La primera vez, Unfyscratch guarda en la ED1 unos pequeños programas de ayuda; tarda unos segundos. La bandera roja detiene los motores y el sonido.', 'La primera vegada, Unfyscratch desa a l’ED1 uns petits programes d’ajuda; triga uns segons. La bandera vermella atura els motors i el so.']
                ]}
        ],
        note: LAST_ERROR
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
        note: LAST_ERROR
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
                    ['Press the button «connect micro:shield by Bluetooth» and choose «BBC micro:bit» in the browser window. A tick appears on the display.', 'Pulsa el botón «conectar micro:shield por Bluetooth» y elige «BBC micro:bit» en la ventana del navegador. En la pantalla aparece un tic.', 'Prem el botó «connecta micro:shield per Bluetooth» i tria «BBC micro:bit» a la finestra del navegador. A la pantalla apareix un tic.'],
                    ['Without Bluetooth, connect the micro:bit with the USB cable and use «connect micro:shield by USB» instead.', 'Sin Bluetooth, conecta la micro:bit con el cable USB y usa «conectar micro:shield por USB».', 'Sense Bluetooth, connecta la micro:bit amb el cable USB i fes servir «connecta micro:shield per USB».'],
                    ['Steppers use the same outputs as the DC motors: STEP1 = M1+M2 and STEP2 = M3+M4. The red flag stops every motor; if the connection is lost, they stop by themselves.', 'Los motores paso a paso usan las mismas salidas que los motores DC: STEP1 = M1+M2 y STEP2 = M3+M4. La bandera roja detiene todos los motores; si se pierde la conexión, se paran solos.', 'Els motors pas a pas fan servir les mateixes sortides que els motors DC: STEP1 = M1+M2 i STEP2 = M3+M4. La bandera vermella atura tots els motors; si es perd la connexió, s’aturen sols.']
                ]}
        ],
        note: LAST_ERROR
    },
    wappstoBit: {
        name: 'Wappsto:bit',
        warning: ['The micro:bit needs the Unifiscratch program for Wappsto:bit. Loading it replaces the program the micro:bit had; you can load another one later.', 'La micro:bit necesita el programa de Unifiscratch para Wappsto:bit. Al cargarlo se sustituye el programa que tuviera la micro:bit; más adelante puedes cargar otro.', 'La micro:bit necessita el programa d’Unifiscratch per a Wappsto:bit. En carregar-lo se substitueix el programa que tingués la micro:bit; més endavant en pots carregar un altre.'],
        intro: ['With this program Unifiscratch controls the micro:bit by Bluetooth or USB, and the micro:bit sends and receives Wappsto cloud data through the Wappsto:bit board.', 'Con este programa Unifiscratch controla la micro:bit por Bluetooth o USB, y la micro:bit envía y recibe datos de la nube Wappsto a través de la placa Wappsto:bit.', 'Amb aquest programa Unifiscratch controla la micro:bit per Bluetooth o USB, i la micro:bit envia i rep dades del núvol Wappsto a través de la placa Wappsto:bit.'],
        actions: [
            {type: 'download', path: WAPPSTO_HEX_PATH, file: WAPPSTO_HEX_FILE, label: ['Download micro:bit program (.hex)', 'Descargar programa para micro:bit (.hex)', 'Descarregar el programa per a micro:bit (.hex)']},
            {type: 'link', href: WAPPSTO_SETUP_URL, label: ['Wappsto:bit setup', 'Configurar la Wappsto:bit', 'Configurar la Wappsto:bit']}
        ],
        cardLinks: [{href: WAPPSTO_HEX_PATH, download: WAPPSTO_HEX_FILE, text: ['Wappsto:bit program for micro:bit (.hex)', 'Programa de Wappsto:bit para micro:bit (.hex)', 'Programa de Wappsto:bit per a micro:bit (.hex)']}],
        sections: [
            {title: FIRST_TIME,
                steps: [
                    [`Create a Wappsto account in the Wappsto app or at [wappsto.com](https://wappsto.com), add the Wappsto:bit with the (+) button and follow the app to set up its WiFi ([guide](${WAPPSTO_SETUP_URL})).`, `Crea una cuenta de Wappsto en la app Wappsto o en [wappsto.com](https://wappsto.com), añade la Wappsto:bit con el botón (+) y sigue la app para configurar su WiFi ([guía](${WAPPSTO_SETUP_URL})).`, `Crea un compte de Wappsto a l’app Wappsto o a [wappsto.com](https://wappsto.com), afegeix la Wappsto:bit amb el botó (+) i segueix l’app per configurar-ne la WiFi ([guia](${WAPPSTO_SETUP_URL})).`],
                    ['Press «Download micro:bit program (.hex)», connect the micro:bit by USB and copy the file to the MICROBIT drive. The display shows a «W» when it is ready.', 'Pulsa «Descargar programa para micro:bit (.hex)», conecta la micro:bit por USB y copia el archivo en la unidad MICROBIT. La pantalla muestra una «W» cuando está lista.', 'Prem «Descarregar el programa per a micro:bit (.hex)», connecta la micro:bit per USB i copia el fitxer a la unitat MICROBIT. La pantalla mostra una «W» quan està a punt.']
                ]},
            {title: EVERY_TIME,
                steps: [
                    ['With everything switched off, insert the micro:bit in the Wappsto:bit (LEDs and buttons facing out) and power the board through its own micro USB, never through the micro:bit.', 'Con todo apagado, inserta la micro:bit en la Wappsto:bit (LEDs y botones hacia fuera) y alimenta la placa por su propio micro USB, nunca a través de la micro:bit.', 'Amb tot apagat, insereix la micro:bit a la Wappsto:bit (LEDs i botons cap enfora) i alimenta la placa pel seu propi micro USB, mai a través de la micro:bit.'],
                    ['Click «connect micro:bit by Bluetooth» and choose «BBC micro:bit» (Chrome or Edge). Without Bluetooth, connect a USB cable to the micro:bit itself and use «connect micro:bit by USB».', 'Haz clic en «conectar micro:bit por Bluetooth» y elige «BBC micro:bit» (Chrome o Edge). Sin Bluetooth, conecta un cable USB a la propia micro:bit y usa «conectar micro:bit por USB».', 'Fes clic a «connecta micro:bit per Bluetooth» i tria «BBC micro:bit» (Chrome o Edge). Sense Bluetooth, connecta un cable USB a la mateixa micro:bit i fes servir «connecta micro:bit per USB».'],
                    ['Use «set up Wappsto number value» to create values, and «send number» to publish them. The block «Wappsto:bit online?» says when the board has reached the cloud; settings given before are sent when it connects.', 'Usa «configurar valor numérico de Wappsto» para crear valores y «enviar número» para publicarlos. El bloque «¿Wappsto:bit en línea?» indica cuándo la placa ha llegado a la nube; lo configurado antes se envía al conectarse.', 'Fes servir «configura el valor numèric de Wappsto» per crear valors i «envia el número» per publicar-los. El bloc «Wappsto:bit en línia?» indica quan la placa ha arribat al núvol; el que s’hagi configurat abans s’envia en connectar-se.'],
                    ['In the Wappsto dashboard add a dashboard (template «Wappsto:bit» or blank): the values appear under IoT devices.', 'En el panel de Wappsto añade un dashboard (plantilla «Wappsto:bit» o en blanco): los valores aparecen en «IoT Devices».', 'Al tauler de Wappsto afegeix un dashboard (plantilla «Wappsto:bit» o en blanc): els valors apareixen a «IoT Devices».']
                ]}
        ],
        note: [`The free Wappsto plan allows 1,000,000 data points a month: send with «if changed» or with waits. ${LAST_ERROR[0]}`, `El plan gratuito de Wappsto permite 1.000.000 de datos al mes: envía con «si cambia» o con esperas. ${LAST_ERROR[1]}`, `El pla gratuït de Wappsto permet 1.000.000 de dades al mes: envia amb «si canvia» o amb esperes. ${LAST_ERROR[2]}`]
    },
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
                    ['Press the button «connect Cutebot by Bluetooth» and choose «BBC micro:bit» in the browser window. A tick appears on the display.', 'Pulsa el botón «conectar Cutebot por Bluetooth» y elige «BBC micro:bit» en la ventana del navegador. En la pantalla aparece un tic.', 'Prem el botó «connecta Cutebot per Bluetooth» i tria «BBC micro:bit» a la finestra del navegador. A la pantalla apareix un tic.'],
                    ['Without Bluetooth, connect the micro:bit with the USB cable and use «connect Cutebot by USB» instead.', 'Sin Bluetooth, conecta la micro:bit con el cable USB y usa «conectar Cutebot por USB».', 'Sense Bluetooth, connecta la micro:bit amb el cable USB i fes servir «connecta Cutebot per USB».'],
                    ['The red flag stops the robot. If the connection is lost, the motors stop by themselves.', 'La bandera roja detiene el robot. Si se pierde la conexión, los motores se paran solos.', 'La bandera vermella atura el robot. Si es perd la connexió, els motors s’aturen sols.']
                ]}
        ],
        note: LAST_ERROR
    },
    legoSpikePrime: {
        name: 'LEGO SPIKE Prime',
        warning: ['SPIKE Prime needs the free Pybricks firmware on the hub. Installing it replaces the LEGO firmware; Pybricks Code can put the LEGO firmware back at any time (Tools menu, «Restore official LEGO firmware»).', 'SPIKE Prime necesita el firmware gratuito Pybricks en el hub. Al instalarlo se sustituye el firmware de LEGO; Pybricks Code puede volver a poner el de LEGO cuando quieras (menú Herramientas, «Restore official LEGO firmware»).', 'SPIKE Prime necessita el firmware gratuït Pybricks al hub. En instal·lar-lo se substitueix el firmware de LEGO; Pybricks Code pot tornar a posar el de LEGO quan vulguis (menú Eines, «Restore official LEGO firmware»).'],
        intro: ['With Pybricks the hub connects to Unifiscratch by Bluetooth, with no cable and no extra program. You only install it once per hub.', 'Con Pybricks el hub se conecta a Unifiscratch por Bluetooth, sin cable ni programas extra. Solo hay que instalarlo una vez en cada hub.', 'Amb Pybricks el hub es connecta a Unifiscratch per Bluetooth, sense cable ni programes extra. Només cal instal·lar-lo una vegada a cada hub.'],
        actions: [{type: 'link', href: PYBRICKS_CODE_URL, label: ['Open Pybricks Code', 'Abrir Pybricks Code', 'Obrir Pybricks Code']}],
        cardLinks: [{href: PYBRICKS_CODE_URL, text: ['Pybricks Code (install the firmware)', 'Pybricks Code (instalar el firmware)', 'Pybricks Code (instal·lar el firmware)']}],
        sections: [
            {title: FIRST_TIME,
                steps: [
                    ['Press «Open Pybricks Code» (Chrome or Edge). In its Tools menu choose «Install Pybricks Firmware».', 'Pulsa «Abrir Pybricks Code» (Chrome o Edge). En su menú Herramientas (Tools) elige «Install Pybricks Firmware».', 'Prem «Obrir Pybricks Code» (Chrome o Edge). Al seu menú Eines (Tools) tria «Install Pybricks Firmware».'],
                    ['Choose SPIKE Prime, accept the licences and give the hub a name if you like (it helps to tell the hubs of a class apart). Then follow the video on screen: connect the hub by USB in update mode (the light blinks red, green and blue), choose it in the browser window and wait for the progress bar to finish. If Windows asks for an extra driver, follow the instructions shown.', 'Elige SPIKE Prime, acepta las licencias y, si quieres, ponle un nombre al hub (ayuda a distinguir los hubs de la clase). Después sigue el vídeo de la pantalla: conecta el hub por USB en modo actualización (la luz parpadea en rojo, verde y azul), elígelo en la ventana del navegador y espera a que acabe la barra de progreso. Si Windows pide un controlador extra, sigue las instrucciones que aparecen.', 'Tria SPIKE Prime, accepta les llicències i, si vols, posa-li un nom al hub (ajuda a distingir els hubs de la classe). Després segueix el vídeo de la pantalla: connecta el hub per USB en mode actualització (la llum parpelleja en vermell, verd i blau), tria’l a la finestra del navegador i espera que acabi la barra de progrés. Si Windows demana un controlador extra, segueix les instruccions que apareixen.'],
                    ['Repeat it on each hub, then close Pybricks Code. To go back to the LEGO firmware: Pybricks Code, Tools menu, «Restore official LEGO firmware».', 'Repítelo en cada hub y luego cierra Pybricks Code. Para volver al firmware de LEGO: Pybricks Code, menú Herramientas, «Restore official LEGO firmware».', 'Repeteix-ho a cada hub i després tanca Pybricks Code. Per tornar al firmware de LEGO: Pybricks Code, menú Eines, «Restore official LEGO firmware».']
                ]},
            {title: EVERY_TIME,
                steps: [
                    ['Switch the hub on with the centre button. Use Chrome or Edge with the computer’s Bluetooth turned on, and close Pybricks Code if it is open: only one application can be connected.', 'Enciende el hub con el botón central. Usa Chrome o Edge con el Bluetooth del ordenador activado y cierra Pybricks Code si está abierto: solo una aplicación puede estar conectada.', 'Encén el hub amb el botó central. Fes servir Chrome o Edge amb el Bluetooth de l’ordinador activat i tanca Pybricks Code si és obert: només una aplicació pot estar connectada.'],
                    ['Press the button «connect SPIKE Prime by Bluetooth» and choose «Pybricks Hub» (or the name you gave it) in the browser window.', 'Pulsa el botón «conectar SPIKE Prime por Bluetooth» y elige «Pybricks Hub» (o el nombre que le hayas dado) en la ventana del navegador.', 'Prem el botó «connecta SPIKE Prime per Bluetooth» i tria «Pybricks Hub» (o el nom que li hagis posat) a la finestra del navegador.'],
                    ['Plug motors and sensors into ports A to F and choose the same port in the blocks.', 'Conecta motores y sensores en los puertos A a F y elige el mismo puerto en los bloques.', 'Connecta motors i sensors als ports A a F i tria el mateix port als blocs.'],
                    ['The red stop sign stops the motors. The Bluetooth button of the hub also stops them; the next block starts again by itself.', 'La señal roja de parar detiene los motores. El botón Bluetooth del hub también los para; el siguiente bloque vuelve a arrancar solo.', 'El senyal vermell d’aturar atura els motors. El botó Bluetooth del hub també els atura; el següent bloc torna a arrencar sol.']
                ]}
        ],
        note: LAST_ERROR
    },
    blueBot: {
        name: 'BlueBot',
        openOnAdd: false,
        intro: ['BlueBot connects by Bluetooth directly from Chrome or Edge: there is nothing to install on the robot or on the computer.', 'BlueBot se conecta por Bluetooth directamente desde Chrome o Edge: no hay que instalar nada ni en el robot ni en el ordenador.', 'BlueBot es connecta per Bluetooth directament des de Chrome o Edge: no cal instal·lar res ni al robot ni a l’ordinador.'],
        actions: [],
        cardLinks: [{opensGuide: true, text: ['Bluetooth from Chrome or Edge (no installation)', 'Bluetooth desde Chrome o Edge (sin instalar nada)', 'Bluetooth des de Chrome o Edge (sense instal·lar res)']}],
        sections: [
            {title: ['1. Prepare it', '1. Prepararlo', '1. Preparar-lo'],
                steps: [
                    ['Charge the robot with its USB cable. Turn it on with the switch underneath.', 'Carga el robot con su cable USB. Enciéndelo con el interruptor de la parte de abajo.', 'Carrega el robot amb el seu cable USB. Encén-lo amb l’interruptor de la part de sota.'],
                    ['Close the Blue-Bot app on tablets and computers nearby: the robot only accepts one Bluetooth connection at a time.', 'Cierra la app Blue-Bot en las tabletas y ordenadores cercanos: el robot solo acepta una conexión Bluetooth a la vez.', 'Tanca l’app Blue-Bot a les tauletes i ordinadors propers: el robot només accepta una connexió Bluetooth alhora.']
                ]},
            {title: EVERY_TIME,
                steps: [
                    ['Use Chrome or Edge with the computer’s Bluetooth turned on.', 'Usa Chrome o Edge con el Bluetooth del ordenador activado.', 'Fes servir Chrome o Edge amb el Bluetooth de l’ordinador activat.'],
                    ['Press the button «connect BlueBot by Bluetooth» and choose your robot («BlueBot…») in the browser window.', 'Pulsa el botón «conectar BlueBot por Bluetooth» y elige tu robot («BlueBot…») en la ventana del navegador.', 'Prem el botó «connecta BlueBot per Bluetooth» i tria el teu robot («BlueBot…») a la finestra del navegador.'],
                    ['Each step moves 15 cm and turns are of 45, 90 or 135 degrees. The blocks wait while the robot moves; if your robot is faster or slower, change it with «one step lasts … s».', 'Cada paso avanza 15 cm y los giros son de 45, 90 o 135 grados. Los bloques esperan mientras el robot se mueve; si tu robot va más rápido o más lento, cámbialo con «un paso dura … s».', 'Cada pas avança 15 cm i els girs són de 45, 90 o 135 graus. Els blocs esperen mentre el robot es mou; si el teu robot va més ràpid o més lent, canvia-ho amb «un pas dura … s».'],
                    ['The red stop sign stops the blocks that remain, but the step the robot has already started finishes.', 'La señal roja de parar detiene los bloques que faltan, pero el paso que el robot ya ha empezado se termina.', 'El senyal vermell d’aturar atura els blocs que falten, però el pas que el robot ja ha començat s’acaba.']
                ]}
        ],
        note: LAST_ERROR
    },
    makeblockCodeyRocky: makeblockGuide('Codey Rocky',
        ['connect Codey Rocky by USB', 'conectar Codey Rocky por USB', 'connecta Codey Rocky per USB'],
        ['connect Codey Rocky by Bluetooth', 'conectar Codey Rocky por Bluetooth', 'connecta Codey Rocky per Bluetooth']),
    makeblockMbot2: makeblockGuide('mBot2',
        ['connect mBot2 by USB', 'conectar mBot2 por USB', 'connecta mBot2 per USB'],
        ['connect mBot2 by Bluetooth', 'conectar mBot2 por Bluetooth', 'connecta mBot2 per Bluetooth']),
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
        note: ['The ultrasonic sensor block needs PingFirmata instead of StandardFirmata.', 'El bloque del sensor de ultrasonidos necesita PingFirmata en lugar de StandardFirmata.', 'El bloc del sensor d’ultrasons necessita PingFirmata en lloc de StandardFirmata.']
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
    spikeessential: webBluetoothGuide('LEGO SPIKE Essential', PRESS_HUB),
    legoble: webBluetoothGuide('LEGO BLE Device', PRESS_HUB),
    poweredup: webBluetoothGuide('LEGO Powered UP', PRESS_HUB),
    legoremote: webBluetoothGuide('LEGO Powered UP Remote', ['Press the green button on the remote so that its light blinks.', 'Pulsa el botón verde del mando para que la luz parpadee.', 'Prem el botó verd del comandament perquè la llum parpellegi.']),
    controlplus: webBluetoothGuide('LEGO Technic CONTROL+', PRESS_HUB),
    duplotrain: webBluetoothGuide('LEGO DUPLO Train', ['Push the train forward so that it switches on and its light blinks.', 'Empuja el tren hacia delante para que se encienda y su luz parpadee.', 'Empeny el tren endavant perquè s’encengui i la seva llum parpellegi.']),
    legomario: webBluetoothGuide('LEGO Mario', ['Switch on the figure and press its Bluetooth button.', 'Enciende la figura y pulsa su botón de Bluetooth.', 'Encén la figura i prem el botó de Bluetooth.']),
    legoluigi: webBluetoothGuide('LEGO Luigi', ['Switch on the figure and press its Bluetooth button.', 'Enciende la figura y pulsa su botón de Bluetooth.', 'Encén la figura i prem el botó de Bluetooth.']),
    legopeach: webBluetoothGuide('LEGO Peach', ['Switch on the figure and press its Bluetooth button.', 'Enciende la figura y pulsa su botón de Bluetooth.', 'Encén la figura i prem el botó de Bluetooth.']),
    ev3: scratchLinkGuide('LEGO EV3', ['Switch on the EV3 and pair it with the computer in the system’s Bluetooth settings.', 'Enciende el EV3 y emparéjalo con el ordenador en los ajustes de Bluetooth del sistema.', 'Encén l’EV3 i aparella’l amb l’ordinador a la configuració de Bluetooth del sistema.']),
    boost: webBluetoothGuide('LEGO BOOST', PRESS_HUB),
    wedo2: webBluetoothGuide('LEGO WeDo 2.0', PRESS_HUB),
    gdxfor: webBluetoothGuide('Go Direct Force & Acceleration', SWITCH_ON)
};

export const guideFor = id => (Object.prototype.hasOwnProperty.call(guides, id) ? guides[id] : null);
export const guideIds = () => Object.keys(guides);
// Guides open by themselves when the extension is added, unless nothing needs preparing.
export const guideOpensOnAdd = id => {
    const guide = guideFor(id);
    return !!guide && guide.openOnAdd !== false;
};

// Links for the library card: what the extension needs, plus the guide itself.
export const cardLinksFor = (id, locale) => {
    const guide = guideFor(id);
    if (!guide) return [];
    return [
        ...guide.cardLinks.map(({opensGuide, ...link}) => ({
            ...link,
            ...(opensGuide ? {guideId: id} : {}),
            text: pickText(link.text, locale)
        })),
        {guideId: id, text: pickText(guideLink, locale)}
    ];
};
