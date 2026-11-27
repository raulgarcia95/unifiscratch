// Texts that the extensions build while they run (errors, "last connection
// error", warnings). Block texts go through the locale messages instead
// (unifiscratch-l10n.js); these are picked when the text is created, in the
// language the editor has at that moment: Spanish, Catalan or, for any other
// language, English.
import formatMessage from 'format-message';

export const language = () => {
    try {
        return String(formatMessage.setup().locale || 'en').split('-')[0].toLowerCase();
    } catch (error) {
        return 'en';
    }
};

/**
 * @param {string} en - English text, also used for languages other than es/ca.
 * @param {string} es - Spanish text.
 * @param {string} ca - Catalan text.
 * @returns {string} The text in the editor's language.
 */
export const tr = (en, es, ca) => {
    const current = language();
    if (current === 'es') return es;
    if (current === 'ca') return ca;
    return en;
};

// Options may hold a text or a function that returns it (so it is translated
// when it is shown, not when the extension was loaded).
export const textOf = value => (typeof value === 'function' ? value() : value);

// A timeout error: code lets callers recognise it in any language.
export const timeoutError = text => Object.assign(new Error(text), {code: 'timeout'});
export const isTimeout = error => Boolean(error && error.code === 'timeout');

// Default value of a text input, translated like the block texts
// (ids unifiscratch.extensions.default.<key> in unifiscratch-l10n.js).
export const defaultText = (key, en) => ({
    id: `unifiscratch.extensions.default.${key}`,
    default: en,
    description: `Unifyscratch default input text: ${key}`
});
