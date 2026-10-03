# Publicación en GitHub Pages

Repositorio propio: https://github.com/sarundalf64/unifiscratch

Dirección prevista: https://sarundalf64.github.io/unifiscratch/

Se publica el editor compilado en la rama `gh-pages`, con GitHub Pages configurado para servir la raíz de esa rama. La rama `main` conserva el código fuente y las licencias. Esta publicación es una versión en pruebas; no cambia las limitaciones del informe de extensiones.

Para preparar una actualización, verificar `npm run preload` y `npm run test:hardware`, compilar el editor y comprobar su arranque. `node scripts/prepare-pages.mjs` crea un directorio nuevo bajo `.publish` con el editor, recursos, licencias y enlace a fuentes, excluyendo ejemplos de depuración y mapas de código. Publicar ese directorio con la dependencia `gh-pages` al repositorio propio; nunca al remoto de Xcratch.

GitHub Pages proporciona HTTPS. El control USB/Bluetooth sigue requiriendo un navegador compatible y que el usuario conceda acceso al dispositivo desde el ordenador que utilice la web. No permite controlar desde fuera un robot conectado a otro ordenador.
