/* eslint-disable max-len */
// One Bluetooth/USB link per Scratch runtime to a micro:bit running the
// Unifiscratch micro:shield firmware (firmware/microshield). The micro:shield
// extension and the "Sensores y actuadores" extension both use it, so the
// board is connected once and either extension's blocks work.
import {MicrobitUartTransport} from './microbit-uart-transport.mjs';
import {bindSafetyEvents} from './micropython-transport.mjs';
import {tr} from './runtime-texts.mjs';

const links = new WeakMap();

const createLink = runtime => {
    const lineListeners = new Set();
    const connectListeners = new Set();
    const transport = new MicrobitUartTransport('micro:shield', {
        expect: 'MS',
        noReply: () => tr('The micro:bit does not answer: load the Unifiscratch firmware for micro:shield (see the guide).', 'La micro:bit no responde: carga el firmware de Unifiscratch para micro:shield (ver la guía).', 'La micro:bit no respon: carrega el firmware d’Unifiscratch per a micro:shield (mira la guia).'),
        notConnected: () => tr('Connect the micro:shield (Bluetooth or USB) before using the blocks.', 'Conecta la micro:shield (Bluetooth o USB) antes de usar los bloques.', 'Connecta la micro:shield (Bluetooth o USB) abans de fer servir els blocs.'),
        onLine: line => lineListeners.forEach(listener => listener(line))
    });
    const open = transport.open.bind(transport);
    // Every new connection means fresh firmware state: tell the extensions.
    transport.open = async (kind, setup) => {
        const epoch = transport.epoch;
        await open(kind, setup);
        if (transport.epoch !== epoch) connectListeners.forEach(listener => listener());
    };
    transport.addLineListener = listener => lineListeners.add(listener);
    transport.addConnectListener = listener => connectListeners.add(listener);
    bindSafetyEvents(runtime, transport);
    return transport;
};

// Without a runtime (tests, getInfo only) every caller gets its own link.
export const getShieldLink = runtime => {
    if (!runtime || typeof runtime !== 'object') return createLink(runtime);
    if (!links.has(runtime)) links.set(runtime, createLink(runtime));
    return links.get(runtime);
};
