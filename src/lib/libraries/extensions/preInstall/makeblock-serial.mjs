import {MicroPythonTransport as MakeblockSerialTransport, boundedNumber} from './micropython-transport.mjs';

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

const makeSvgDataUri = ({title, body, color1, color2, kind = 'face'}) => {
    const art = kind === 'mbot2' ? `
<ellipse cx="160" cy="158" rx="94" ry="24" fill="#26304a" opacity=".25"/>
<rect x="85" y="88" width="150" height="70" rx="24" fill="#eef2ff" stroke="#2d328f" stroke-width="8"/>
<rect x="118" y="59" width="84" height="48" rx="16" fill="#ffffff" stroke="${color2}" stroke-width="7"/>
<circle cx="116" cy="155" r="27" fill="#1f2937"/><circle cx="204" cy="155" r="27" fill="#1f2937"/>
<circle cx="116" cy="155" r="12" fill="${color2}"/><circle cx="204" cy="155" r="12" fill="${color2}"/>
<circle cx="145" cy="83" r="6" fill="${color1}"/><circle cx="175" cy="83" r="6" fill="${color1}"/>
<path d="M132 118h56" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>` : kind === 'codey' ? `
<ellipse cx="162" cy="162" rx="88" ry="22" fill="#26304a" opacity=".22"/>
<rect x="72" y="70" width="122" height="92" rx="30" fill="#eefcff" stroke="#097b96" stroke-width="8"/>
<rect x="190" y="106" width="58" height="54" rx="19" fill="#ffffff" stroke="#097b96" stroke-width="8"/>
<circle cx="110" cy="108" r="9" fill="${color1}"/><circle cx="154" cy="108" r="9" fill="${color1}"/>
<path d="M113 136c16 12 38 12 54 0" fill="none" stroke="${color1}" stroke-width="8" stroke-linecap="round"/>
<circle cx="205" cy="165" r="18" fill="#1f2937"/><circle cx="235" cy="165" r="18" fill="#1f2937"/>
<path d="M224 80l21-18" stroke="${color2}" stroke-width="7" stroke-linecap="round"/>` : `
<rect x="48" y="72" width="160" height="96" rx="28" fill="#fff"/>
<circle cx="93" cy="116" r="11" fill="${color1}"/>
<circle cx="163" cy="116" r="11" fill="${color1}"/>
<path d="M99 144c19 16 45 16 64 0" fill="none" stroke="${color1}" stroke-width="10" stroke-linecap="round"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">
<rect width="320" height="240" rx="24" fill="${color1}"/>
<circle cx="245" cy="63" r="42" fill="${color2}" opacity=".92"/>
${art}
<text x="160" y="204" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="31"
 font-weight="700" fill="#fff">${title}</text>
<text x="160" y="229" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="17"
 font-weight="700" fill="#fff" opacity=".9">${body}</text>
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};


export {
    MakeblockSerialTransport,
    clamp,
    colorToRgb,
    makeSvgDataUri,
    msg,
    toPythonString
};
