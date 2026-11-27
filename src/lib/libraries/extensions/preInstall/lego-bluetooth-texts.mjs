/* eslint-disable max-len */
// Spanish and Catalan block texts for the LEGO Bluetooth extensions by bricklife
// (SPIKE Essential, Powered UP, CONTROL+, DUPLO Train, Mario, Luigi, Peach,
// Powered UP Remote, LEGO BLE Device). Those originals are pinned by hash and
// only ship English, Italian and Japanese; they read their texts through the
// editor's shared formatMessage, so adding these ids to the locale messages
// translates them. Values are [English, Spanish, Catalan]; English must match
// the original so the default language stays unchanged.
export const legoBluetoothTexts = {
    // Shared blocks (legobluetooth.*)
    'legobluetooth.motorPWM': ['[PORT] start motor at [POWER] % power', '[PORT] encender motor al [POWER] % de potencia', '[PORT] engega el motor al [POWER] % de potència'],
    'legobluetooth.motorStop': ['[PORT] stop motor', '[PORT] parar motor', '[PORT] atura el motor'],
    'legobluetooth.motorRunFor': ['[PORT] run [DIRECTION] for [VALUE] [UNIT]', '[PORT] girar [DIRECTION] durante [VALUE] [UNIT]', '[PORT] gira [DIRECTION] durant [VALUE] [UNIT]'],
    'legobluetooth.motorGoDirectionToPosition': ['[PORT] go [DIRECTION] to position [POSITION]', '[PORT] ir [DIRECTION] a la posición [POSITION]', '[PORT] ves [DIRECTION] a la posició [POSITION]'],
    'legobluetooth.motorStart': ['[PORT] start motor [DIRECTION]', '[PORT] encender motor [DIRECTION]', '[PORT] engega el motor [DIRECTION]'],
    'legobluetooth.motorSetSpeed': ['[PORT] set speed to [SPEED] %', '[PORT] fijar velocidad a [SPEED] %', '[PORT] fixa la velocitat a [SPEED] %'],
    'legobluetooth.getRelativePosition': ['[PORT] relative position', '[PORT] posición relativa', '[PORT] posició relativa'],
    'legobluetooth.getPosition': ['[PORT] position', '[PORT] posición', '[PORT] posició'],
    'legobluetooth.motorResetRelativePosition': ['[PORT] reset relative position to [RELATIVE_POSITION]', '[PORT] reiniciar posición relativa a [RELATIVE_POSITION]', '[PORT] reinicia la posició relativa a [RELATIVE_POSITION]'],
    'legobluetooth.displayImageFor': ['turn on [MATRIX] for [DURATION] seconds', 'encender [MATRIX] durante [DURATION] segundos', 'encén [MATRIX] durant [DURATION] segons'],
    'legobluetooth.displayImage': ['turn on [MATRIX]', 'encender [MATRIX]', 'encén [MATRIX]'],
    'legobluetooth.displayText': ['write [TEXT]', 'escribir [TEXT]', 'escriu [TEXT]'],
    'legobluetooth.displayClear': ['turn off pixels', 'apagar píxeles', 'apaga els píxels'],
    'legobluetooth.displaySetBrightness': ['set pixel brightness to [BRIGHTNESS] %', 'fijar brillo de píxeles a [BRIGHTNESS] %', 'fixa la brillantor dels píxels a [BRIGHTNESS] %'],
    'legobluetooth.displaySetPixel': ['set pixel at [X] , [Y] to [BRIGHTNESS] %', 'fijar píxel en [X] , [Y] a [BRIGHTNESS] %', 'fixa el píxel a [X] , [Y] a [BRIGHTNESS] %'],
    'legobluetooth.centerButtonLights': ['set center button light to [COLOR]', 'fijar luz del botón central a [COLOR]', 'fixa el llum del botó central a [COLOR]'],
    'legobluetooth.ultrasonicLightUp': ['[PORT] light up [LIGHT0] [LIGHT1] [LIGHT2] [LIGHT3]', '[PORT] iluminar [LIGHT0] [LIGHT1] [LIGHT2] [LIGHT3]', '[PORT] il·lumina [LIGHT0] [LIGHT1] [LIGHT2] [LIGHT3]'],
    'legobluetooth.getColor': ['[PORT] color', '[PORT] color', '[PORT] color'],
    'legobluetooth.getDistance': ['[PORT] distance', '[PORT] distancia', '[PORT] distància'],
    'legobluetooth.getForce': ['[PORT] force', '[PORT] fuerza', '[PORT] força'],
    'legobluetooth.getTilt': ['[PORT] tilt [XY]', '[PORT] inclinación [XY]', '[PORT] inclinació [XY]'],
    'legobluetooth.setHubLEDColor': ['set hub LED color to [COLOR]', 'fijar color del LED del hub a [COLOR]', 'fixa el color del LED del hub a [COLOR]'],
    'legobluetooth.getHubTilt': ['hub tilt [XYZ]', 'inclinación del hub [XYZ]', 'inclinació del hub [XYZ]'],
    'legobluetooth.getAngle': ['[AXIS] angle', 'ángulo [AXIS]', 'angle [AXIS]'],
    'legobluetooth.getName': ['name', 'nombre', 'nom'],
    'legobluetooth.getFirmwareVersion': ['firmware version', 'versión del firmware', 'versió del firmware'],
    'legobluetooth.getBatteryLevel': ['battery level', 'nivel de batería', 'nivell de bateria'],
    'legobluetooth.rotations': ['rotations', 'rotaciones', 'rotacions'],
    'legobluetooth.degrees': ['degrees', 'grados', 'graus'],
    'legobluetooth.seconds': ['seconds', 'segundos', 'segons'],
    'legobluetooth.shortestPath': ['shortest', 'más corto', 'més curt'],
    'legobluetooth.clockwise': ['clockwise', 'sentido horario', 'sentit horari'],
    'legobluetooth.counterclockwise': ['counterclockwise', 'sentido antihorario', 'sentit antihorari'],
    'legobluetooth.black': ['(0) Black', '(0) Negro', '(0) Negre'],
    'legobluetooth.pink': ['(1) Pink', '(1) Rosa', '(1) Rosa'],
    'legobluetooth.purple': ['(2) Purple', '(2) Morado', '(2) Lila'],
    'legobluetooth.blue': ['(3) Blue', '(3) Azul', '(3) Blau'],
    'legobluetooth.lightBlue': ['(4) Light blue', '(4) Azul claro', '(4) Blau clar'],
    'legobluetooth.lightGreen': ['(5) Light green', '(5) Verde claro', '(5) Verd clar'],
    'legobluetooth.green': ['(6) Green', '(6) Verde', '(6) Verd'],
    'legobluetooth.yellow': ['(7) Yellow', '(7) Amarillo', '(7) Groc'],
    'legobluetooth.orange': ['(8) Orange', '(8) Naranja', '(8) Taronja'],
    'legobluetooth.red': ['(9) Red', '(9) Rojo', '(9) Vermell'],
    'legobluetooth.white': ['(10) White', '(10) Blanco', '(10) Blanc'],
    'legobluetooth.noColor': ['(-1) No color', '(-1) Sin color', '(-1) Sense color'],
    'legobluetooth.pitch': ['pitch', 'cabeceo', 'capcineig'],
    'legobluetooth.roll': ['roll', 'balanceo', 'balanceig'],
    'legobluetooth.yaw': ['yaw', 'guiñada', 'guinyada'],

    // DUPLO Train
    'duplotrain.motorPWM': ['run [DIRECTION] at [POWER] % power', 'avanzar [DIRECTION] al [POWER] % de potencia', 'avança [DIRECTION] al [POWER] % de potència'],
    'duplotrain.motorStop': ['stop', 'parar', 'atura'],
    'duplotrain.playSound': ['play [SOUND] sound', 'tocar sonido [SOUND]', 'toca el so [SOUND]'],
    'duplotrain.setHubLEDColor': ['set light color to [COLOR]', 'fijar color de la luz a [COLOR]', 'fixa el color del llum a [COLOR]'],
    'duplotrain.whenColor': ['when passing over [SENSOR_COLOR] action block', 'al pasar sobre la pieza de acción [SENSOR_COLOR]', 'quan passi sobre la peça d’acció [SENSOR_COLOR]'],
    'duplotrain.isColor': ['ground color is [SENSOR_COLOR] ?', '¿el color del suelo es [SENSOR_COLOR]?', 'el color del terra és [SENSOR_COLOR]?'],
    'duplotrain.getColor': ['ground color', 'color del suelo', 'color del terra'],
    'duplotrain.getDrivingDistance': ['driving distance', 'distancia recorrida', 'distància recorreguda'],
    'duplotrain.brake': ['brake', 'freno', 'fre'],
    'duplotrain.departure': ['departure', 'salida', 'sortida'],
    'duplotrain.refill': ['refill', 'repostar', 'recàrrega'],
    'duplotrain.horn': ['horn', 'bocina', 'botzina'],
    'duplotrain.steam': ['steam', 'vapor', 'vapor'],
    'duplotrain.blue': ['Blue', 'Azul', 'Blau'],
    'duplotrain.lightGreen': ['Green', 'Verde', 'Verd'],
    'duplotrain.yellow': ['Yellow', 'Amarillo', 'Groc'],
    'duplotrain.red': ['Red', 'Rojo', 'Vermell'],
    'duplotrain.white': ['White', 'Blanco', 'Blanc'],

    // LEGO Mario, Luigi and Peach
    'legomario.whenBarcode': ['when barcode is [BARCODE]', 'cuando el código de barras sea [BARCODE]', 'quan el codi de barres sigui [BARCODE]'],
    'legomario.whenAnyBarcode': ['when any barcode is found', 'cuando se encuentre cualquier código de barras', 'quan es trobi qualsevol codi de barres'],
    'legomario.getBarcode': ['barcode', 'código de barras', 'codi de barres'],
    'legomario.whenColor': ['when color is [SENSOR_COLOR]', 'cuando el color sea [SENSOR_COLOR]', 'quan el color sigui [SENSOR_COLOR]'],
    'legomario.isColor': ['color is [SENSOR_COLOR] ?', '¿el color es [SENSOR_COLOR]?', 'el color és [SENSOR_COLOR]?'],
    'legomario.getColor': ['color', 'color', 'color'],
    'legomario.whenPants': ['when pants is [PANTS]', 'cuando el pantalón sea [PANTS]', 'quan el pantaló sigui [PANTS]'],
    'legomario.isPants': ['pants is [PANTS] ?', '¿el pantalón es [PANTS]?', 'el pantaló és [PANTS]?'],
    'legomario.getPants': ['pants', 'pantalón', 'pantaló'],
    'legomario.setVolume': ['set volume to [VOLUME] %', 'fijar volumen a [VOLUME] %', 'fixa el volum a [VOLUME] %'],
    'legomario.white': ['(19) White', '(19) Blanco', '(19) Blanc'],
    'legomario.red': ['(21) Red', '(21) Rojo', '(21) Vermell'],
    'legomario.blue': ['(23) Blue', '(23) Azul', '(23) Blau'],
    'legomario.yellow': ['(24) Yellow', '(24) Amarillo', '(24) Groc'],
    'legomario.black': ['(26) Black', '(26) Negro', '(26) Negre'],
    'legomario.green': ['(37) Green', '(37) Verde', '(37) Verd'],
    'legomario.brown': ['(106) Brown', '(106) Marrón', '(106) Marró'],
    'legomario.purple': ['(268) Purple', '(268) Morado', '(268) Lila'],
    'legomario.nougatBrown': ['(312) Nougat Brown', '(312) Marrón turrón', '(312) Marró torró'],
    'legomario.cyan': ['(322) Cyan', '(322) Cian', '(322) Cian'],
    'legomario.pants.none': ['(0) None', '(0) Ninguno', '(0) Cap'],
    'legomario.pants.bee': ['(3) Bee', '(3) Abeja', '(3) Abella'],
    'legomario.pants.luigi': ['(5) Luigi', '(5) Luigi', '(5) Luigi'],
    'legomario.pants.frog': ['(6) Frog', '(6) Rana', '(6) Granota'],
    'legomario.pants.tanooki': ['(10) Tanooki', '(10) Tanuki', '(10) Tanuki'],
    'legomario.pants.propeller': ['(12) Propeller', '(12) Hélice', '(12) Hèlix'],
    'legomario.pants.cat': ['(17) Cat', '(17) Gato', '(17) Gat'],
    'legomario.pants.fire': ['(18) Fire', '(18) Fuego', '(18) Foc'],
    'legomario.pants.penguin': ['(20) Penguin', '(20) Pingüino', '(20) Pingüí'],
    'legomario.pants.peach': ['(24) Peach', '(24) Peach', '(24) Peach'],
    'legomario.pants.mario': ['(33) Mario', '(33) Mario', '(33) Mario'],
    'legomario.pants.builder': ['(34) Builder', '(34) Constructor', '(34) Constructor'],
    'legomario.pants.ice': ['(35) Ice', '(35) Hielo', '(35) Gel'],

    // Powered UP Remote
    'legoremote.whenButton': ['[PORT] when [BUTTON] button pressed', '[PORT] al pulsar el botón [BUTTON]', '[PORT] quan es premi el botó [BUTTON]'],
    'legoremote.isButton': ['[PORT] [BUTTON] button pressed?', '[PORT] ¿botón [BUTTON] pulsado?', '[PORT] botó [BUTTON] premut?'],
    'legoremote.getButtonA': ['button A', 'botón A', 'botó A'],
    'legoremote.getButtonB': ['button B', 'botón B', 'botó B'],
    'legoremote.setHubLEDColor': ['set LED color to [COLOR]', 'fijar color del LED a [COLOR]', 'fixa el color del LED a [COLOR]'],
    'legoremote.button.plus': ['plus', 'más', 'més'],
    'legoremote.button.minus': ['minus', 'menos', 'menys'],
    'legoremote.button.stop': ['red', 'rojo', 'vermell'],
    'legoremote.button.any': ['any', 'cualquiera', 'qualsevol']
};

// Messages for one language, keyed by the originals' own ids.
export const legoBluetoothMessages = language => {
    const index = {es: 1, ca: 2}[language] || 0;
    const messages = {};
    Object.keys(legoBluetoothTexts).forEach(id => {
        messages[id] = legoBluetoothTexts[id][index];
    });
    return messages;
};
