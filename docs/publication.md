# Publicación en GitHub Pages

Repositorio propio: https://github.com/raulgarcia95/unifiscratch

Dirección pública: https://raulgarcia95.github.io/unifiscratch/

Se publica el editor compilado en la rama `gh-pages`, con GitHub Pages configurado para servir la raíz de esa rama. La rama `main` conserva el código fuente y las licencias.

Para preparar una actualización, verificar `npm run preload` y `npm run test:hardware`, compilar el editor y comprobar su arranque. `node scripts/prepare-pages.mjs` crea un directorio nuevo bajo `.publish` con el editor, recursos, licencias y enlace a fuentes, excluyendo ejemplos de depuración y mapas de código. Publicar ese directorio con la dependencia `gh-pages` al repositorio propio; nunca al remoto de Xcratch.

Notas de la publicación del 6 de noviembre de 2026:

- Compilar con `NODE_ENV=production` y `NODE_OPTIONS=--max-old-space-size=8192`. Sin ese límite, webpack agota la memoria de Node. La compilación de producción ocupa mucho menos que la de desarrollo publicada antes: `gui.js` pasa de unas 400 000 líneas a 18 MB minificados.
- En este PC, la herramienta `gh-pages` falla porque la ruta del usuario contiene «ú». Publicar con git directamente: `git worktree add --detach ../unifiscratch-pages unifiscratch/gh-pages`, sustituir el contenido por el directorio de `.publish`, hacer commit y `git push unifiscratch HEAD:refs/heads/gh-pages`, sin forzar.
- Antes de publicar se guardó una copia de `main` y `gh-pages` en `backups/unifiscratch-backup-2026-11-06.zip` (no se sube a GitHub).

Notas de la publicación del 26 de noviembre de 2026:

- `npm run preload` se detiene porque el módulo publicado de Microbit More ha cambiado y requiere revisión. Se compiló con la copia en caché de `preload/` de la publicación anterior (sin aceptar el cambio) y con `npx webpack` en lugar de `npm run build`, que ejecuta el preload. `src/generated` y `static/microbit` también vienen de esa copia.
- Los .hex de micro:bit se generan con la CLI de pxt (ver los README de `firmware/`).

GitHub Pages proporciona HTTPS. El control USB/Bluetooth sigue requiriendo un navegador compatible y que el usuario conceda acceso al dispositivo desde el ordenador que utilice la web. No permite controlar desde fuera un robot conectado a otro ordenador.
