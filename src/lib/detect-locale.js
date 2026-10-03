/**
 * @fileoverview
 * Utility function to detect locale from the browser setting or paramenter on the URL.
 */

import queryString from 'query-string';

/**
 * look for language setting in the browser. Check against supported locales.
 * If there's a parameter in the URL, override the browser setting
 * @param {Array.string} supportedLocales An array of supported locale codes.
 * @return {string} the preferred locale
 */
const detectLocale = supportedLocales => {
    let locale = 'en'; // default
    const browserLocales = (window.navigator.languages || [
        window.navigator.userLanguage || window.navigator.language
    ]).filter(Boolean);

    // try to set locale from browserLocales in system preference order
    for (let i = 0; i < browserLocales.length; i++) {
        let browserLocale = browserLocales[i].toLowerCase();
        if (supportedLocales.includes(browserLocale)) {
            locale = browserLocale;
            break;
        }
        browserLocale = browserLocale.split('-')[0];
        if (supportedLocales.includes(browserLocale)) {
            locale = browserLocale;
            break;
        }
    }

    const queryParams = queryString.parse(location.search);
    // Flatten potential arrays and remove falsy values
    const potentialLocales = [].concat(queryParams.locale, queryParams.lang).filter(l => l);
    if (!potentialLocales.length) {
        return locale;
    }

    const urlLocale = potentialLocales[0].toLowerCase();
    if (supportedLocales.includes(urlLocale)) {
        return urlLocale;
    }

    return locale;
};

export {
    detectLocale
};
