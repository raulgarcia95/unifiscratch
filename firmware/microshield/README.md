# Firmware de Unifiscratch para micro:shield

Programa MakeCode (licencia MIT) que deja la micro:bit montada en la
**micro:shield** de Make&Learn escuchando órdenes de Unifiscratch por
**Bluetooth** (servicio UART) y por **USB** (puerto serie a 115200), con el
mismo protocolo de texto que el firmware del Cutebot.

El mapa de canales del PCA9685, la fórmula de los servos y las fases de los
motores paso a paso se han tomado de
[MakeAndLearn/pxt-microshield](https://github.com/MakeAndLearn/pxt-microshield)
(MIT, Copyright (c) 2019 MakeAndLearn). El resto es código propio.

## Qué controla

| Salida | Canales PCA9685 (0x40) |
|---|---|
| Motores DC M1–M4 | 0-1, 2-3, 4-5, 6-7 |
| Paso a paso STEP1 / STEP2 | 0-3 (= M1+M2) / 4-7 (= M3+M4) |
| Servos S0–S7 | 8–15 (pulso 0,6–2,4 ms a 50 Hz) |

Además: pines libres de la micro:bit 0, 1, 2, 8, 12, 13, 14, 15 y 16
(lectura/escritura digital, PWM; lectura analógica en 0, 1 y 2), sensor de
ultrasonidos (pines a elegir), tira de LEDs NeoPixel (hasta 64), botones A/B,
pantalla LED y sonido.

## Cómo generar el .hex (una sola vez)

1. Abre https://makecode.microbit.org y crea un proyecto nuevo.
2. Pasa a la vista **JavaScript** y, en el explorador de archivos, abre
   `pxt.json` (botón «Explorer» > rueda > «Edit settings as text»).
   Sustituye su contenido por el `pxt.json` de esta carpeta.
3. Sustituye el contenido de `main.ts` por el `main.ts` de esta carpeta.
4. Comprueba en «Project settings» que esté marcada
   «No Pairing Required: Anyone can connect via Bluetooth».
5. Pulsa **Download** y guarda el archivo como `unifiscratch-microshield.hex`
   en `static/extensions/microshield/`.

Ese .hex vale para micro:bit V1 y V2.

## Protocolo

Una orden por línea (`\n`). Ver la cabecera de `main.ts`.
Cada 100 ms: `D distancia_cm botonA botonB` y, si se vigila algún pin,
`E pin:valor pin:valor ...`.
Si no llega nada en 1,5 s, o se corta el Bluetooth, motores y paso a paso se paran.
