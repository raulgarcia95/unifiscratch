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
| micro:shield | Firmware MakeCode propio (Bluetooth/USB, PCA9685: motores DC, paso a paso, servos; pines, ultrasonidos, tira LED); protocolo y bloques probados con micro:bit simulada | Compilar el .hex en MakeCode; placa, motores y alimentación reales |
| Wappsto:bit | Adaptador propio (microbit-wappsto.mjs) y firmware MakeCode propio (firmware/wappsto-bit) que habla I2C 0x11 con la placa según el formato de wappsto/pxt-wappsto (MIT); transporte simulado probado | Compilar el .hex en MakeCode; placa real, cuenta Wappsto y WiFi |
| Keyestudio ESP32 | Perfil machine.Pin/PWM con lista de pines y salidas temporizadas | Modelo exacto, pinout y firmware |
| Arduino UNO | Original xcx-arduino con hash y exports comprobados | Firmata, transporte y hardware |
| ML2Scratch | Original fijado; bloques cargados | Entrenamiento e inferencia con cámara |
| Speech2Scratch | Original con adaptación de SpeechRecognition; bloques cargados | Reconocimiento real, idioma y permisos |
| PoseNet2Scratch | Original con protección ante vídeo nulo; bloques cargados | Inferencia con cámara |
| TM2Scratch, TMPose2Scratch, ImageClassifier2Scratch | Fuentes originales adaptadas; bloques cargados; estructura estimatePose corregida | Modelos, imagen/sonido y dispositivos reales |
| Handpose2Scratch, Facemesh2Scratch | Originales adaptados; bloques cargados y vídeo ausente protegido | Modelos, cámara, rendimiento y recuperación tras cambiar de proyecto |
| IA generativa, MediaPipe Image Embed, MediaPipe Hand, KNN, ChatGPT2Scratch | Cinco módulos curados con hash y exports comprobados | Servicios, credenciales cuando correspondan y pruebas funcionales |
| Dash (Wonder Workshop) | Nuevo adaptador Web Bluetooth (6 nov 2026); carga, bloques en es/ca/en, transporte simulado y SB3 probados | Robot real: conexión, avances, giros, luces, sonidos y sensores |
| ED1 (Citilab) | Rehecha el 26 nov 2026: habla el protocolo de MicroBlocks por Web Serial (firmware de fábrica, sin instalar nada); programas auxiliares en bytecode probados en la VM real de MicroBlocks v383 compilada para Linux con la ED1 simulada | Placa real: conexión, robot Fantàstic, sentido de giro, umbral táctil, pantalla |
| Face Sensing | Nueva implementación con MediaPipe Face Landmarker 0.10.14 (6 nov 2026); detección probada con una foto como cámara simulada | Cámara real, permisos y rendimiento en los ordenadores del centro |
| Edison V3 (Microbric) | Nuevo adaptador WebUSB con programa puente EdPy (6 nov 2026); el puente compila sin errores en el comprobador oficial de EdPy V3; transporte simulado probado | Robot real: cargar el puente, conexión, movimientos, parada con bandera roja y sensores |
| BlueBot | Implementado por Web Bluetooth (27/11/2026) | Sin probar con un robot real (ver más abajo) |
| EV3, BOOST, WeDo 2.0 y otras extensiones Scratch | Implementación heredada conservada | Validación física |

## Revisión del 6 de noviembre de 2026: extensiones «próximamente»

### Dash

- Fuente del protocolo: dos implementaciones comunitarias independientes que coinciden, [morseapi](https://github.com/IlyaSukhanov/morseapi) (Apache-2.0) y [dash](https://github.com/brentrager/dash) (MIT). Wonder Workshop no publica el protocolo. Solo se reutilizan datos del protocolo: UUID del servicio `af237777-…`, característica de órdenes `af230002-…`, sensores `af230006-…`/`af230003-…`, identificadores de orden y formato de bytes.
- Seguridad: los avances y giros usan la orden «move» de Dash, que lleva la duración dentro del paquete. El robot se para solo aunque se pierda el Bluetooth. Cada bloque dura como máximo 5 s y nunca se envía una marcha continua. La bandera roja, ocultar la página y cambiar de proyecto envían la parada y descartan las órdenes en cola. La conexión es explícita y no se reconecta sola.
- Un Dot (sin ruedas) se conecta, pero los bloques de movimiento lo rechazan.
- Pruebas: `test/hardware/new-devices.test.mjs` comprueba los bytes contra los ejemplos de morseapi, la cola, la parada, la pérdida de Bluetooth, la decodificación de sensores y el rechazo de valores no válidos. **No se ha probado con un Dash real.**

### ED1

**Revisión del 26 de noviembre de 2026.** La versión del 6 de noviembre exigía cambiar el firmware de la ED1 por MicroPython. Como la ED1 se vende con MicroBlocks y se programa en https://microblocks.fun/run/microblocks.html, la extensión no funcionaba con una placa de fábrica. Ahora habla el mismo protocolo serie que el editor de MicroBlocks.

- Protocolo (implementación propia en `preInstall/microblocks-transport.mjs`): USB serie a 115200 baudios; mensajes cortos `FA tipo id` y largos `FB tipo id tamLo tamHi cuerpo… FE` (hacia la placa el tamaño incluye el `FE`; desde la placa no hay terminador). Se usan ping (26), versión (12/22), CRC de bloque de código (11/23), guardar código (32), arrancar (3), parar todo (6), asignar variable (8) y las respuestas de tarea (16 a 19).
- Conexión robusta: tras abrir el puerto se repite el ping hasta 8 s (la ESP32 puede reiniciarse al abrirlo), se salta el texto de arranque de la ESP32, se comprueba que la VM es v300 o posterior y que la placa dice «Citilab ED1». Ping de mantenimiento cada 1,5 s; si la placa deja de responder o se desenchufa, la extensión se marca como desconectada.
- Ejecución: al conectar se guardan en la placa siete programas auxiliares pequeños (bloques 230 a 236: preparar expansor, motores, parar, tono, sensores, texto y borrar pantalla) generados con un ensamblador propio de bytecode MicroBlocks de 16 bits. Solo se escriben si su CRC no coincide, así que reconectar no vuelve a escribir la memoria flash. Los argumentos viajan en variables globales 116 a 127 (en RAM). Los motores, el sonido y los sensores pueden funcionar a la vez.
- Seguridad: la bandera roja, ocultar la página y desconectar envían «parar todo» y después apagan las bobinas del expansor (registro 0x09 o 0x14) y el zumbador. Si la placa se ha reiniciado, los programas vuelven a preparar el expansor antes de mover los motores. Movimientos limitados a 2400 pasos por bloque.
- Bloques: se conservan los de antes (mismos opcodes, los proyectos guardados siguen abriéndose) y se añaden mostrar texto, borrar pantalla, inclinación x/y/z y temperatura. Un solo viaje a la placa lee todos los sensores y se reutiliza 40 ms.
- Licencias: MicroBlocks es MPL-2.0. No se copia código suyo; solo se usan números del protocolo, el formato de instrucciones y datos de hardware (pines, registros, secuencia de pasos) de sus bibliotecas ED1.
- Pruebas: `test/hardware/ed1-microblocks.test.mjs` (placa simulada en JS: entramado, ensamblador, instalación única, bloques, parada, placas no válidas, pérdida del USB). Además, los programas auxiliares se ejecutaron en la VM real de MicroBlocks (versión de Linux compilada en la nube con la ED1 simulada): secuencia de pasos `99 C3 66 3C` para avanzar, apagado del expansor al terminar y al parar, tono, texto y lista de sensores correctos. Los CRC de esos programas quedan fijados en el test.
- Pendiente con la placa real: sentido de giro del Fantàstic, umbral táctil (16, el de MicroBlocks), pantalla y tiempos reales. Si se abre después el editor de MicroBlocks con la misma placa, puede mostrar esos siete programas auxiliares como guiones; se pueden borrar sin problema.

### Face Sensing

- Implementación propia inspirada en el experimento de Scratch Lab, sin copiar su código (Scratch Lab usa otra licencia). Usa MediaPipe Face Landmarker (Apache-2.0) con la versión fijada a 0.10.14 y el modelo `face_landmarker.task` de Google. Las imágenes se analizan en el navegador.
- Bloques: al detectar una cara, ¿cara detectada?, ir a (nariz, boca, ojos, orejas, frente, barbilla), apuntar según la inclinación, tamaño según la cara, coordenadas, vídeo y transparencia.
- Prueba: se sustituyó la cámara por un retrato de dominio público (pasaporte de F. Scott Fitzgerald, c. 1925, Wikimedia Commons). Se detectó la cara, las partes salieron en un orden anatómico coherente (frente > ojos > nariz > boca > barbilla), el modo espejo invirtió las posiciones y el objeto se movió a la nariz. **No se ha probado con una cámara real.**

### Fallo encontrado y corregido: TensorFlow compartido

Las extensiones de Stretch3 basadas en ML5 (FaceMesh2Scratch, HandPose2Scratch, Teachable Machine, Image Classifier) fallaban al analizar imágenes con `forwardFunc is not a function`. Causa: el módulo KNN carga al arrancar un TensorFlow.js moderno en `window._tfengine`, y el TensorFlow 1.7 de ML5 lo reutilizaba. Corrección en `stretch/runtime.js`: ML5 se carga con un motor propio, que queda instalado. Comprobado: FaceMesh de ML5 detecta la cara del retrato de prueba. Limitación: dos versiones de TensorFlow no pueden funcionar a la vez en la misma página. Si en una sesión se usa una extensión de Stretch3 y después KNN, KNN puede fallar hasta recargar la página. Por este motivo, Face Sensing usa MediaPipe, que no depende de TensorFlow.js.

Observación: los módulos originales MediaPipe Hand e Image Embed importan `@mediapipe/tasks-vision@latest`. Esa versión no está fijada y puede cambiar sin aviso.

### Edison V3: activado mediante programa puente

- Los programas de Edison V3 se compilan en los servidores de Microbric, así que Unifiscratch no puede generarlos. El lenguaje EdPy V3 sí incluye `Ed.ReadUSB()` y `Ed.WriteUSB()`. El firmware intercambia esos números por WebUSB (fabricante 0x16D0, producto 0x1207, paquetes de 8 bytes con cabecera 0x58). El formato procede del código JavaScript público de la app oficial edpyapp.com/v3.
- `static/extensions/edison/unfyscratch-puente-edison-v3.py` es un programa EdPy que se carga **una vez** con la app oficial. Recibe órdenes numeradas (número de orden × 4096 + orden × 256 + valor, siempre por debajo de 32768), las ejecuta y confirma cada una. Compila sin errores en el comprobador oficial de EdPy V3; como control, ese comprobador rechazó una versión con una función inexistente.
- Seguridad: cada movimiento lleva su distancia (máximo 30 cm) o su ángulo (máximo 360°), así que el robot se detiene solo. La bandera roja envía la orden de firmware STOP_USER_PROGRAM, borra la última orden y vuelve a arrancar el puente sin repetir órdenes antiguas. El botón cuadrado del robot y la desconexión USB obligan a reconectar explícitamente.
- Pendiente con el robot real: comprobar que STOP_USER_PROGRAM detiene los motores a mitad de un movimiento, la velocidad real con `SPEED_5` y que los giros se miden en grados.
- Guía de conexión (`src/components/edison-setup`): ventana con los pasos para programar el puente con EdPy V3 y conectarlo, con botones para copiar o descargar el programa y abrir EdPy. Se abre al añadir Edison V3, desde el enlace «Cómo conectar Edison» de la tarjeta y desde el bloque «cómo conectar Edison (ayuda)». La tarjeta también enlaza el archivo `.py`. Si el navegador bloquea el portapapeles, se usa el método clásico de copia; se comprobó en el editor que el texto quedaba copiado.

### BlueBot por Web Bluetooth

TTS no publica el protocolo. El 27 de noviembre de 2026 se encontraron dos proyectos públicos independientes que lo usan del mismo modo: la interfaz Blue-Bot de Vittascience (Web Bluetooth; licencia con Commons Clause) y `vilarion/bluebot-python` (Bluetooth serie, GPL-3.0). De ellos solo se toman los datos de interoperabilidad, sin copiar código:

- Nombre anunciado que empieza por `BlueBot`; servicio GATT `0xFFF0`, escritura en `0xFFF2`, notificaciones en `0xFFF1`.
- Trama: `AA`, longitud (bytes desde el tipo hasta el final de los datos), `81`, `11`, tecla, suma de control (la suma desde la longitud hasta la suma de control es múltiplo de 256).
- Teclas: `01` GO, `02` borrar, `03` pausa, `04` adelante, `05` atrás, `06`/`07` izquierda/derecha 90°, `08`/`09` 45°, `0A`/`0B` 135°.

El robot no avisa al terminar un movimiento: los bloques esperan una duración estimada (3 s por paso por defecto, ajustable con «un paso dura … s»; 1 s por cada 45° de giro). Tampoco hay orden de parada: la señal roja cancela los pasos pendientes, pero el paso empezado se termina. Pendiente de probar con un Blue-Bot real.

### Proyecto SB3 de ida y vuelta

`docs/examples/robots-roundtrip.sb3` contiene bloques de Microbit More, LEGO Powered UP, Codey Rocky, Dash, ED1 y Face Sensing, con argumentos distintos de los predeterminados y un reportero encajado. Se guardó desde el editor y se abrió en una sesión limpia, sin abrir antes la biblioteca de extensiones. Resultado: las seis extensiones se cargaron, no hubo opcodes desconocidos y se conservaron todos los argumentos y conexiones. `test/hardware/roundtrip.test.mjs` comprueba que el archivo sigue coincidiendo con las extensiones locales.

Para reproducirlo: `npm start`, abrir el editor, Archivo > Cargar desde tu ordenador y elegir `docs/examples/robots-roundtrip.sb3`. Deben verse dos programas: «al hacer clic en la bandera» con diez bloques y «al detectar una cara» → «reproducir sonido perro».

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

`npm run test:hardware`: 45 pruebas aprobadas (6 nov 2026; antes, 27). Cubren metadatos de solo lectura, hashes/exports, opcodes de diez módulos físicos originales, parada LEGO con periférico simulado, REPL fragmentado, errores, pérdida USB, límites, cancelación y cámara ausente. No emulan la electrónica ni el firmware completo.

Compilación de desarrollo sin errores, con cinco avisos de dependencias dinámicas de xcx-gai. ESLint se aplica a los archivos propios modificados, excluyendo las fuentes originales de terceros.

La suite histórica Jest completa no está verde: 19 suites pasan y 25 fallan en este entorno por dependencias incompletas (`intl-messageformat/lib/main`, distribución Node de scratch-vm), además de un test antiguo de locale. No es una validación satisfactoria del proyecto completo. Se restauraron util-deprecate 1.0.2 y jsdom 9.12.0 desde tarballs verificados contra el package-lock existente.

Validación física pendiente por dispositivo: registrar modelo y firmware, conectar sin carga mecánica, ordenar movimiento breve a baja potencia, pulsar detener, interrumpir USB/Bluetooth y comprobar que no se reanudan órdenes antiguas. Verificar sensores y guardado/reapertura de un SB3 antes de marcarlo aprobado.
