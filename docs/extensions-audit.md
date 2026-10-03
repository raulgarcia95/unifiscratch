# Auditoría de extensiones de Unifiscratch

Revisión de software: 2 de octubre de 2026. No se han conectado robots, placas, cámara ni micrófono físicos. «Carga verificada» significa registro de bloques y apertura en el editor, no funcionamiento comprobado del dispositivo.

## Arranque

Microbit More declara `EXTENSION_ID` mediante un getter sin setter. Asignar metadatos a la clase original provocaba una excepción al iniciar. `curated-class.mjs` adapta los metadatos mediante una subclase. Hay una prueba de regresión. El gestor registra las extensiones antes de deserializar proyectos y aísla los módulos que no se pueden importar.

## Inventario

| Extensión | Integración y comprobación | Pendiente |
|---|---|---|
| Microbit More | Original, hash fijado, opcodes, carga y diálogo comprobados | Firmware, sensores y pines físicos; la parada original solo detiene el tono |
| SPIKE Essential, LEGO BLE Device, Powered UP, CONTROL+, DUPLO Train | Cinco originales Bricklife; carga, diálogo y evento de parada probados | Hubs, motores, sensores y firmware físicos |
| Powered UP Remote | Original Bricklife; carga y diálogo comprobados | Botones del mando 88010 |
| LEGO Mario, Luigi, Peach | Tres originales Bricklife; carga, diálogos y opcodes probados | Sensores de las figuras |
| Codey Rocky, mBot2 | Adaptadores locales revisados; carga y transporte simulado probados | Firmware con REPL y API codey/rocky o cyberpi/mbot2 |
| Smart Cutebot | Adaptador local revisado; carga y comandos acotados probados | Micro:bit, biblioteca Cutebot y cableado |
| Micro:Shield, Wappsto:Bit | Perfiles micro:bit con API pinN y salidas temporizadas | Pinout y hardware; no cubren todas las funciones de estas placas |
| Keyestudio ESP32 | Perfil machine.Pin/PWM con lista de pines y salidas temporizadas | Modelo exacto, pinout y firmware |
| Arduino UNO | Original xcx-arduino con hash y exports comprobados | Firmata, transporte y hardware |
| ML2Scratch | Original fijado; bloques cargados | Entrenamiento e inferencia con cámara |
| Speech2Scratch | Original con adaptación de SpeechRecognition; bloques cargados | Reconocimiento real, idioma y permisos |
| PoseNet2Scratch | Original con protección ante vídeo nulo; bloques cargados | Inferencia con cámara |
| TM2Scratch, TMPose2Scratch, ImageClassifier2Scratch | Fuentes originales adaptadas; bloques cargados; estructura estimatePose corregida | Modelos, imagen/sonido y dispositivos reales |
| Handpose2Scratch, Facemesh2Scratch | Originales adaptados; bloques cargados y vídeo ausente protegido | Modelos, cámara, rendimiento y recuperación tras cambiar de proyecto |
| IA generativa, MediaPipe Image Embed, MediaPipe Hand, KNN, ChatGPT2Scratch | Cinco módulos curados con hash y exports comprobados | Servicios, credenciales cuando correspondan y pruebas funcionales |
| Edison V3, BlueBot, Dash, ED1, Face Sensing | Tarjetas informativas desactivadas | No hay controlador operativo en este proyecto |
| EV3, BOOST, WeDo 2.0 y otras extensiones Scratch | Implementación heredada conservada | Validación física |

## Protecciones locales de MicroPython

- Conexión explícita, sin reconexión ni reenvío automático de órdenes después de perder el puerto.
- Comprobación de REPL y funciones de firmware antes de declarar la conexión disponible.
- Lectura de respuestas completas, errores de firmware, tiempos de espera y cola recuperable.
- Parada prioritaria que invalida órdenes pendientes. Parada al detener el proyecto, ocultar la página y cambiar de proyecto; los listeners se conservan si la VM reutiliza las extensiones.
- Movimientos y salidas de hasta cinco segundos por bloque con `finally` en la placa. Un bucle puede solicitar nuevos movimientos: el límite es por orden, no por proyecto.
- Validación de números y pines. Python libre se elimina de la paleta y se rechaza también desde proyectos antiguos.
- Reporteros de último error en las conexiones y estado de extensión en las adaptaciones de IA.

Estas protecciones no constituyen una parada de emergencia certificada. Un firmware bloqueado puede impedir parar. LEGO conserva el comportamiento original: detener envía la parada, pero perder Bluetooth puede impedir entregarla. No se ha añadido un watchdog a los hubs. Una prueba simulada no comprueba la parada física.

## Procedencia

Las 19 URLs están en `scripts/preload-rules.json`; `scripts/preload-lock.json` fija SHA-256. La descarga valida HTTPS, HTTP y sintaxis sin ejecutar el módulo. `npm run preload` rechaza código diferente; `npm run preload:update` renueva deliberadamente el registro y requiere revisión del código.

Las cinco fuentes de Stretch3, sus licencias y commits están en `src/lib/libraries/extensions/stretch/vendor` y `upstream.json`. Las bibliotecas ML tienen URLs y hashes en `static/extensions/stretch/manifest.json` y licencias adjuntas. Los parches de PoseNet y Speech se aplican durante la compilación mediante `scripts/extension-compat-loader.cjs`, sin alterar los originales descargados. Fallan si cambia el fragmento esperado.

Los hashes no fijan todos los modelos, CDNs ni servicios externos utilizados por las extensiones. El cargador manual por URL sigue habilitado y no queda cubierto por la lista curada.

Fuentes de API: [MicroPython REPL](https://docs.micropython.org/en/latest/reference/repl.html), [Rocky](https://makeblock-micropython-api.readthedocs.io/en/latest/codey%26rocky/rocky/motion.html), [micro:bit](https://microbit-micropython.readthedocs.io/en/v2-docs/pin.html), [ESP32](https://docs.micropython.org/en/latest/esp32/quickref.html), [Cutebot](https://wiki.elecfreaks.com/microbit/microbit-smart-car/microbit-samrt-cutebot/cutebot-python/), [Bricklife](https://github.com/bricklife/scratch-gui), [Stretch3](https://stretch3.champierre.com/).

## Validación

`npm run test:hardware`: 27 pruebas aprobadas. Cubren metadatos de solo lectura, hashes/exports, opcodes de diez módulos físicos originales, parada LEGO con periférico simulado, REPL fragmentado, errores, pérdida USB, límites, cancelación y cámara ausente. No emulan la electrónica ni el firmware completo.

Compilación de desarrollo sin errores, con cinco avisos de dependencias dinámicas de xcx-gai. ESLint se aplica a los archivos propios modificados, excluyendo las fuentes originales de terceros.

La suite histórica Jest completa no está verde: 19 suites pasan y 25 fallan en este entorno por dependencias incompletas (`intl-messageformat/lib/main`, distribución Node de scratch-vm), además de un test antiguo de locale. No es una validación satisfactoria del proyecto completo. Se restauraron util-deprecate 1.0.2 y jsdom 9.12.0 desde tarballs verificados contra el package-lock existente.

Validación física pendiente por dispositivo: registrar modelo y firmware, conectar sin carga mecánica, ordenar movimiento breve a baja potencia, pulsar detener, interrumpir USB/Bluetooth y comprobar que no se reanudan órdenes antiguas. Verificar sensores y guardado/reapertura de un SB3 antes de marcarlo aprobado.
