# Firmware de Unifiscratch para micro:bit + Wappsto:bit

Programa MakeCode (licencia MIT, código propio) que deja la micro:bit
escuchando órdenes de Unifiscratch por **Bluetooth** (servicio UART) y por
**USB** (puerto serie a 115200), con el mismo protocolo de texto, y que habla
con la placa **Wappsto:bit** por I2C (dirección 0x11) para enviar y recibir
datos de la nube Wappsto.

El formato de las tramas I2C sigue la extensión oficial de MakeCode
[wappsto/pxt-wappsto](https://github.com/wappsto/pxt-wappsto) (licencia MIT,
© 2020 Wappsto). No se copia su código: aquí está reimplementado.

## Cómo generar el .hex (una sola vez)

1. Abre https://makecode.microbit.org y crea un proyecto nuevo.
2. Pasa a la vista **JavaScript** y, en el explorador de archivos, abre
   `pxt.json` (botón «Explorer» > rueda > «Edit settings as text»).
   Sustituye su contenido por el `pxt.json` de esta carpeta.
3. Sustituye el contenido de `main.ts` por el `main.ts` de esta carpeta.
4. Comprueba en «Project settings» que esté marcada
   «No Pairing Required: Anyone can connect via Bluetooth».
5. Pulsa **Download** y guarda el archivo como `unifiscratch-wappsto-bit.hex`
   en `static/extensions/wappsto-bit/`.

## Uso

- La Wappsto:bit se alimenta por su propio microUSB (no por la micro:bit) y
  debe estar dada de alta en la app Wappsto con su WiFi configurada.
- La micro:bit muestra una «W» al arrancar. Unifiscratch se conecta por
  Bluetooth o con un cable USB conectado a la propia micro:bit.

## Protocolo

Una orden por línea (`\n`). Ver la cabecera de `main.ts`.
Sensores cada 100 ms: `D botonA botonB temperatura luz ax ay az`.
Estado de Wappsto cada segundo: `E online señal latitud longitud`.
Valores que llegan de Wappsto: `W id texto`.
