# Licencias y créditos de Unifyscratch

Unifyscratch es un proyecto educativo gratuito y sin ánimo de lucro. Se distribuye con licencia [AGPL-3.0](LICENSE), **sin ninguna garantía**. Esta página reúne los proyectos de otras personas que incluye o usa, con su licencia. Cada fichero conserva además sus propios avisos de copyright.

*Unifyscratch is a free, non-commercial educational editor distributed under the AGPL-3.0, without any warranty. This page lists the third-party work it includes or uses, with its licence.*

## Marcas / Trademarks

Unifyscratch no es un producto oficial de Scratch ni está respaldado por la Scratch Foundation ni por el MIT. Scratch, el logotipo y el gato de Scratch son marcas del MIT (ver [TRADEMARK](TRADEMARK)).

LEGO®, SPIKE™, Powered UP, DUPLO® y LEGO® Super Mario™ son marcas de LEGO Group; micro:bit, de Micro:bit Educational Foundation; Makeblock, mBot y Codey Rocky, de Makeblock; Cutebot, de ELECFREAKS; Dash, de Wonder Workshop; Edison, de Microbric; Blue-Bot, de TTS Group; ED1, de Citilab; Keyestudio, de Keyestudio; wappsto:bit, de Seluxit; Arduino, de Arduino SA; ChatGPT, de OpenAI; Teachable Machine, MediaPipe y TensorFlow, de Google. Ninguno de sus propietarios patrocina, autoriza ni respalda este sitio. Los nombres se citan solo para indicar con qué productos es compatible cada extensión.

## Base del editor

| Proyecto | Autor | Licencia |
| --- | --- | --- |
| [scratch-gui](https://github.com/scratchfoundation/scratch-gui), [scratch-vm](https://github.com/scratchfoundation/scratch-vm), scratch-paint, scratch-render, scratch-audio, scratch-l10n, scratch-storage, scratch-svg-renderer, scratch-parser, scratch-sb1-converter | Scratch Foundation / MIT | AGPL-3.0 |
| [scratch-blocks](https://github.com/scratchfoundation/scratch-blocks), scratch-render-fonts | Scratch Foundation / MIT (fuentes: sus autores) | Apache-2.0 (fuentes: SIL OFL) |
| [Xcratch](https://github.com/xcratch/xcratch) | Koji Yokokawa | MIT |
| [xcratch/scratch-vm](https://github.com/xcratch/scratch-vm) | Koji Yokokawa, Scratch Foundation | AGPL-3.0 |
| Biblioteca de objetos, fondos y sonidos | Scratch Foundation | Se carga desde los servidores de Scratch |

Las demás dependencias de npm (unas 1.150) tienen licencias MIT, ISC, BSD, Apache-2.0, CC0 o similares. Sus avisos se publican junto al editor en los ficheros `*.LICENSE.txt`.

## Extensiones de terceros

Se usan sin modificar, descargadas de su web oficial y fijadas por huella SHA-256 en [`scripts/preload-lock.json`](scripts/preload-lock.json), salvo donde se indica.

| Extensión | Autor | Licencia | Código fuente |
| --- | --- | --- | --- |
| Microbit More | Koji Yokokawa | MIT | [microbit-more/mbit-more-v2](https://github.com/microbit-more/mbit-more-v2) |
| SPIKE Essential, LEGO BLE, Powered UP, Powered UP Remote, CONTROL+, DUPLO Train, LEGO Mario, Luigi y Peach | bricklife (Shinichiro Oba) | BSD-3-Clause | [bricklife/scratch-gui](https://github.com/bricklife/scratch-gui). Las imágenes de LEGO BLE, Remote, CONTROL+, Peach y SPIKE Essential son dibujos propios (sus originales están vacíos) |
| ML2Scratch, PoseNet2Scratch, Speech2Scratch | Junya Ishihara (champierre) | AGPL-3.0 | [champierre](https://github.com/champierre) (`ml2scratch`, `posenet2scratch`, `speech2scratch`); PoseNet y Speech llevan un pequeño parche de compatibilidad en [`scripts/extension-compat-loader.cjs`](scripts/extension-compat-loader.cjs) |
| TM2Scratch, TMPose2Scratch, ImageClassifier2Scratch, Handpose2Scratch, Facemesh2Scratch (Stretch3) | Junya Ishihara (champierre) | AGPL-3.0 | Adaptadas en [`src/lib/libraries/extensions/stretch/vendor`](src/lib/libraries/extensions/stretch/vendor), con su licencia y commit de origen en `upstream.json`. Sus imágenes de tarjeta, de los repositorios originales, están en [`ai-images`](src/lib/libraries/extensions/ai-images) |
| Imagen de la tarjeta Face Sensing | Scratch Foundation (scratch-gui) | AGPL-3.0 | [`ai-images/faceSensing.png`](src/lib/libraries/extensions/ai-images) |
| ChatGPT2Scratch | ichiroc, champierre | MIT | [champierre/chatgpt2scratch](https://github.com/champierre/chatgpt2scratch) |
| IA generativa (xcx-gai) | Koji Yokokawa | AGPL-3.0 | [yokobond/xcx-gai](https://github.com/yokobond/xcx-gai) |
| MediaPipe Hand, MediaPipe Image Embed, KNN, Arduino | Koji Yokokawa | Sus repositorios no declaran licencia (comprobado el 27-11-2026: sin fichero LICENSE, sin campo `license` en `package.json` ni cabeceras). Se usan tal como las publica el autor para Xcratch; si el autor lo pide, se retirarán | [yokobond](https://github.com/yokobond) (`xcx-mp-hand`, `xcx-mp-image-embed`, `xcx-tf-knn`, `xcx-arduino`); Mano e Imagen cargan una versión fija de MediaPipe (ver [`scripts/extension-compat-loader.cjs`](scripts/extension-compat-loader.cjs)) |

## Bibliotecas y modelos de IA

| Componente | Autor | Licencia |
| --- | --- | --- |
| ml5.js (versión de Stretch3) | ml5.js | [Licencia ml5](static/extensions/stretch/ml5.LICENSE) (aportaciones antiguas: MIT) |
| TensorFlow.js 1.3.1 | Google | [Apache-2.0](static/extensions/stretch/tensorflow.LICENSE) |
| Teachable Machine Pose 0.8.6 | Google | [Apache-2.0](static/extensions/stretch/pose.LICENSE) |
| MediaPipe Tasks Vision 0.10.14 (Face Sensing) y 1.2.3 (Mano, Imagen), con sus modelos | Google | Apache-2.0 |

Los modelos se descargan de servidores de Google, jsDelivr o unpkg cuando se usa la extensión. La imagen de la cámara se analiza en el propio navegador.

## Extensiones y firmwares propios

mBot2, Codey Rocky, Smart Cutebot, micro:shield, wappsto:bit, ED1, Sensores y actuadores, Dash, Edison V3, LEGO SPIKE Prime, BlueBot, Keyestudio ESP32 y Face Sensing son código propio de Unifyscratch (AGPL-3.0). No incluyen código de los fabricantes. Para comunicarse con cada robot solo se usan datos técnicos de su protocolo (identificadores, códigos de orden y formato de los mensajes), con fines de interoperabilidad. Las fuentes de esos datos están en [`docs/extensions-audit.md`](docs/extensions-audit.md).

Los firmwares de micro:bit de [`firmware/`](firmware) son propios (MIT). Se compilan con Microsoft MakeCode, cuyo runtime (pxt-microbit, CODAL) tiene licencia MIT. La extensión de SPIKE Prime usa el firmware libre [Pybricks](https://github.com/pybricks) (MIT), que el usuario instala desde code.pybricks.com.

## Servicios externos

Algunas extensiones envían datos fuera del navegador:

- ChatGPT2Scratch envía el texto a OpenAI con la clave de API de quien la usa.
- IA generativa envía a Google Gemini los textos e imágenes que se le pasan.
- Speech2Scratch usa el reconocimiento de voz del navegador. En Chrome, el audio se procesa en servidores de Google.
- Texto a voz y Traducir, de Scratch, usan servidores de la Scratch Foundation.

Con alumnado menor de edad, usa estas extensiones solo con autorización del centro. No escribas claves de API en proyectos que se vayan a compartir.
