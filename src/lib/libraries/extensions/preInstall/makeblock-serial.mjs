import {boundedNumber} from './micropython-transport.mjs';
import {MakeblockF3Transport as MakeblockSerialTransport, pyArgs} from './makeblock-f3-transport.mjs';

const clamp = boundedNumber;

const toPythonString = value => JSON.stringify(String(value));

const msg = (id, defaultText) => ({
    id: `unifiscratch.extensions.${id}`,
    default: defaultText,
    defaultMessage: defaultText,
    description: `Unifiscratch hardware extension text: ${id}`
});

const colorToRgb = color => {
    const hex = String(color || '#000000')
        .replace('#', '')
        .trim();
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        return {r: 0, g: 0, b: 0};
    }
    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16)
    };
};


export {
    MakeblockSerialTransport,
    clamp,
    colorToRgb,
    msg,
    pyArgs,
    toPythonString
};
