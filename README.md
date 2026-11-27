# Unifiscratch

Unifiscratch es un editor de programación por bloques para el aula que reúne en un solo sitio extensiones de robots, placas e inteligencia artificial. Interfaz en español, catalán e inglés.

- Editor publicado: https://raulgarcia95.github.io/unifiscratch/
- Contacto: el creador de Unifiscratch (ver la ventana de bienvenida del editor).

## Origen y licencia

Unifiscratch es una **versión modificada** de [scratch-gui](https://github.com/scratchfoundation/scratch-gui) de la Scratch Foundation, a través de [Xcratch](https://github.com/xcratch/xcratch) de Koji Yokokawa. Se modificó a partir de 2026 para añadir la biblioteca de extensiones curada, extensiones propias de robots y placas, guías de conexión y traducciones; el historial de cambios está en este repositorio.

Se distribuye con licencia [AGPL-3.0](LICENSE), sin ninguna garantía. Los créditos y licencias de cada componente de terceros están en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Unifiscratch no es un producto oficial de Scratch ni está respaldado por la Scratch Foundation ni por el MIT (ver [TRADEMARK](TRADEMARK)). LEGO, micro:bit, Makeblock y los demás nombres de robots y placas son marcas de sus propietarios, que no patrocinan ni respaldan este proyecto; se citan solo para indicar compatibilidad.

## Desarrollo

Requiere Git y Node.js.

```bash
npm ci
npm start          # editor en http://localhost:8601/
npm run test:hardware
```

- Cómo funcionan las extensiones: [docs/unifiscratch.md](docs/unifiscratch.md)
- Estado de cada extensión: [docs/extensions-audit.md](docs/extensions-audit.md)
- Cómo se publica el sitio: [docs/publication.md](docs/publication.md)
