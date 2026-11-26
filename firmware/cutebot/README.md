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

## Protocolo

Una orden por línea (`\n`). Ver la cabecera de `main.ts`.
Sensores cada 100 ms: `D distancia_cm linea_izq linea_der botonA botonB`.
Si no llega nada en 1,5 s, o se corta el Bluetooth, los motores se paran.
