// These tests check the Spanish messages: the extensions pick runtime texts in
// the editor language (runtime-texts.mjs), so set it as the editor would.
import {createRequire} from 'node:module';

createRequire(import.meta.url)('format-message').setup({locale: 'es'});
