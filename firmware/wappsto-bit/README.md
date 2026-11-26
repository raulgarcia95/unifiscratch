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

Ese .hex vale para micro:bit V1 y V2.

En la micro:bit V1, con Bluetooth, este programa no cabía en la memoria flash.
Por eso `pxt.json` quita los servicios Bluetooth que Unifiscratch no usa
(DFU, eventos, información del dispositivo, Eddystone, flasheo parcial y modo
de emparejamiento: con «No Pairing Required» no hace falta) y deja solo el UART.
Si se añade código y vuelve a salir «program too big», hay que recortar código.
### Sin navegador (pxt CLI)

En una carpeta de trabajo fuera del repositorio:
`npm install pxt pxt-microbit` y `npx pxt target microbit`. Copia ahí esta
carpeta y, dentro de ella, `npx pxt install` y `npx pxt build`. El .hex
universal (V1 y V2) queda en `built/binary.hex`; las piezas en C++ las compila
el servicio en la nube de MakeCode. Así se generaron los .hex publicados
(pxt-microbit 9.1.2, 26-11-2026).
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
