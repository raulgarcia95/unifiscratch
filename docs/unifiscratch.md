# Unifiscratch

Unifiscratch es un editor Scratch personalizado para reunir extensiones educativas de robotica, placas e IA en una sola aplicacion. La base ya incluye:

- Un cargador manual de extensiones `.mjs` en la biblioteca de extensiones.
- Un sistema de predescarga desde `scripts/preload-rules.json`.
- Un punto de preinstalacion local en `src/lib/libraries/extensions/preInstall/index.js`.

## Ruta recomendada para unificar extensiones

1. Crear una lista curada de extensiones en `scripts/preload-rules.json`.
2. Ejecutar `npm run preload` para descargar las extensiones aprobadas en `preload/`.
3. Ejecutar `npm start` y abrir `http://localhost:8601/`.
4. Revisar la biblioteca de extensiones: las tarjetas aparecen agrupadas como Robots, Placas, IA u Otras.

## Formato de extensiones compatibles

El preloader acepta dos formatos:

- Extension integrada: un `.mjs` que exporta `entry` y `blockClass`.
- Extension separada: un `entry.mjs` que exporta `entry` y declara `extensionURL`, mas un segundo modulo con `blockClass`.

Ejemplo de `scripts/preload-rules.json`:

```json
{
    "approved": [
        "https://example.org/my-extension.mjs"
    ]
}
```

## Estado de la revisión

Consulta el [informe de extensiones](extensions-audit.md) para conocer qué está implementado, qué se ha probado y qué requiere validación física.

Los 19 módulos remotos se comprueban contra `scripts/preload-lock.json`. `npm run preload` rechaza cambios inesperados; `npm run preload:update` renueva los hashes deliberadamente y debe acompañarse de revisión y pruebas. Las cinco adaptaciones de Stretch3 incluyen fuentes y licencias locales.

Ejecuta `npm run test:hardware` para las pruebas de transporte, contratos y compatibilidad. Los adaptadores locales de MicroPython limitan cada movimiento o salida a cinco segundos y rechazan Python libre. Esto no garantiza la parada de un dispositivo con firmware bloqueado ni cubre la pérdida de Bluetooth en los módulos LEGO originales.

Edison, BlueBot, Dash, ED1 y Face Sensing permanecen como tarjetas informativas desactivadas. El cargador manual por URL sigue habilitado; ese código no está cubierto por la lista curada.

La vista de revisión en `http://127.0.0.1:8610/` sirve el directorio `build`. Para el servidor de desarrollo normal, usa la dirección que muestre `npm start`.
