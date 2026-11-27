# Firmware de Unifiscratch para Cutebot

Programa MakeCode (licencia MIT, código propio) que deja la micro:bit del
Cutebot escuchando órdenes de Unifiscratch por **Bluetooth** (servicio UART)
y por **USB** (puerto serie a 115200), con el mismo protocolo de texto.

## Cómo generar el .hex (una sola vez)

1. Abre https://makecode.microbit.org y crea un proyecto nuevo.
2. Pasa a la vista **JavaScript** y, en el explorador de archivos, abre
   `pxt.json` (botón «Explorer» > rueda > «Edit settings as text»).
   Sustituye su contenido por el `pxt.json` de esta carpeta.
3. Sustituye el contenido de `main.ts` por el `main.ts` de esta carpeta.
4. Comprueba en «Project settings» que esté marcada
   «No Pairing Required: Anyone can connect via Bluetooth».
5. Pulsa **Download** y guarda el archivo como `unifiscratch-cutebot.hex`.

Ese .hex vale para micro:bit V1 y V2.

### Sin navegador (pxt CLI)

En una carpeta de trabajo fuera del repositorio:
`npm install pxt pxt-microbit` y `npx pxt target microbit`. Copia ahí esta
carpeta y, dentro de ella, `npx pxt install` y `npx pxt build`. El .hex
universal (V1 y V2) queda en `built/binary.hex`; las piezas en C++ las compila
el servicio en la nube de MakeCode. Así se generaron los .hex publicados
(pxt-microbit 9.1.2, 26-11-2026).
## Protocolo

Una orden por línea (`\n`). Ver la cabecera de `main.ts`.
Sensores cada 100 ms:
`D distancia_cm linea_izq linea_der botonA botonB logo temp luz ax ay az sonido brujula`
(logo y sonido solo en micro:bit V2; brújula y micrófono se activan con `Q 1`
y `Q 2` cuando un bloque los pide). Los gestos llegan como `G n`.
La versión 2 del firmware responde `CB2 1` o `CB2 2` (V1 o V2) a `?`;
la extensión avisa si la micro:bit tiene el firmware antiguo (`CB1`).
Si no llega nada en 1,5 s, o se corta el Bluetooth, los motores se paran.
