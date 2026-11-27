/* eslint-disable max-len */
// Spanish and Catalan texts for the original (third-party) extensions that do
// not have them: Microbit More, the champierre AI extensions, the yokobond
// extensions and Arduino. Their code is pinned or vendored, so instead of
// changing it, curated-class.mjs and stretch/index.js pass their getInfo()
// through translateOriginalInfo(): when the editor is in Spanish or Catalan,
// every English text found here is replaced. Texts already translated by the
// original (for example the LEGO ids in lego-bluetooth-texts.mjs) are not
// touched, and menu values never change, so saved projects keep working.
//
// Table: English text -> [Spanish, Catalan].
import {language} from './preInstall/runtime-texts.mjs';

const common = {
    'turn video [VIDEO_STATE]': ['[VIDEO_STATE] vídeo', '[VIDEO_STATE] el vídeo'],
    'set video transparency to [TRANSPARENCY]': ['fijar transparencia de vídeo a [TRANSPARENCY]', 'fixa la transparència del vídeo a [TRANSPARENCY]'],
    'off': ['apagar', 'apaga'],
    'on': ['encender', 'encén'],
    'on flipped': ['encender en espejo', 'encén en mirall'],
    'turn classification [CLASSIFICATION_STATE]': ['[CLASSIFICATION_STATE] clasificación', '[CLASSIFICATION_STATE] la classificació'],
    'Label once every [CLASSIFICATION_INTERVAL] seconds': ['etiquetar una vez cada [CLASSIFICATION_INTERVAL] segundos', 'etiqueta un cop cada [CLASSIFICATION_INTERVAL] segons'],
    'Classify once every [CLASSIFICATION_INTERVAL] seconds': ['clasificar una vez cada [CLASSIFICATION_INTERVAL] segundos', 'classifica un cop cada [CLASSIFICATION_INTERVAL] segons'],
    'set confidence threshold [CONFIDENCE_THRESHOLD]': ['fijar umbral de confianza [CONFIDENCE_THRESHOLD]', 'fixa el llindar de confiança [CONFIDENCE_THRESHOLD]'],
    'confidence threshold': ['umbral de confianza', 'llindar de confiança'],
    'switch webcam to [DEVICE]': ['cambiar la cámara a [DEVICE]', 'canvia la càmera a [DEVICE]'],
    'any': ['cualquiera', 'qualsevol'],
    'people count': ['número de personas', 'nombre de persones'],
    'set ratio to [RATIO]': ['fijar proporción a [RATIO]', 'fixa la proporció a [RATIO]'],
    'label': ['etiqueta', 'etiqueta']
};

const bodyParts = {
    'nose': ['nariz', 'nas'],
    'left eye': ['ojo izquierdo', 'ull esquerre'],
    'right eye': ['ojo derecho', 'ull dret'],
    'left ear': ['oreja izquierda', 'orella esquerra'],
    'right ear': ['oreja derecha', 'orella dreta'],
    'left shoulder': ['hombro izquierdo', 'espatlla esquerra'],
    'right shoulder': ['hombro derecho', 'espatlla dreta'],
    'left elbow': ['codo izquierdo', 'colze esquerre'],
    'right elbow': ['codo derecho', 'colze dret'],
    'left wrist': ['muñeca izquierda', 'canell esquerre'],
    'right wrist': ['muñeca derecha', 'canell dret'],
    'left hip': ['cadera izquierda', 'maluc esquerre'],
    'right hip': ['cadera derecha', 'maluc dret'],
    'left knee': ['rodilla izquierda', 'genoll esquerre'],
    'right knee': ['rodilla derecha', 'genoll dret'],
    'left ankle': ['tobillo izquierdo', 'turmell esquerre'],
    'right ankle': ['tobillo derecho', 'turmell dret']
};
const posenetParts = {};
Object.entries(bodyParts).forEach(([en, [es, ca]]) => {
    posenetParts[en] = [es, ca];
    posenetParts[`${en} x`] = [`${es} x`, `${ca} x`];
    posenetParts[`${en} y`] = [`${es} y`, `${ca} y`];
});

const fingers = [
    ['thumb', 'pulgar', 'polze'],
    ['index finger', 'índice', 'índex'],
    ['middle finger', 'dedo corazón', 'dit del mig'],
    ['ring finger', 'anular', 'anular'],
    ['little finger', 'meñique', 'dit petit']
];
const handLandmarks = {'wrist (1)': ['muñeca (1)', 'canell (1)']};
fingers.forEach(([en, es, ca], index) => {
    const base = 2 + (index * 4);
    if (index === 0) {
        handLandmarks['the base of thumb (2)'] = ['base del pulgar (2)', 'base del polze (2)'];
    } else {
        handLandmarks[`the 3rd joint of ${en} (${base})`] = [`3.ª articulación del ${es} (${base})`, `3a articulació del ${ca} (${base})`];
    }
    handLandmarks[`the 2nd joint of ${en} (${base + 1})`] = [`2.ª articulación del ${es} (${base + 1})`, `2a articulació del ${ca} (${base + 1})`];
    handLandmarks[`the 1st joint of ${en} (${base + 2})`] = [`1.ª articulación del ${es} (${base + 2})`, `1a articulació del ${ca} (${base + 2})`];
    handLandmarks[`${en} (${base + 3})`] = [`${es} (${base + 3})`, `${ca} (${base + 3})`];
});

const texts = {
    microbitMore: {
        'when micro:bit [STATE]': ['cuando la micro:bit esté [STATE]', 'quan la micro:bit estigui [STATE]'],
        'connected': ['conectada', 'connectada'],
        'disconnected': ['desconectada', 'desconnectada'],
        'when button [NAME] is [EVENT]': ['cuando el botón [NAME] esté [EVENT]', 'quan el botó [NAME] estigui [EVENT]'],
        'button [NAME] pressed?': ['¿botón [NAME] pulsado?', 'botó [NAME] premut?'],
        'when pin [NAME] is [EVENT]': ['cuando el pin [NAME] esté [EVENT]', 'quan el pin [NAME] estigui [EVENT]'],
        'pin [NAME] is touched?': ['¿pin [NAME] tocado?', 'pin [NAME] tocat?'],
        'when [GESTURE]': ['cuando [GESTURE]', 'quan [GESTURE]'],
        'display pattern [MATRIX] ': ['mostrar patrón [MATRIX] ', 'mostra el patró [MATRIX] '],
        'display pattern [MATRIX]': ['mostrar patrón [MATRIX]', 'mostra el patró [MATRIX]'],
        'display text [TEXT] delay [DELAY] ms': ['mostrar texto [TEXT] con pausa [DELAY] ms', 'mostra el text [TEXT] amb pausa [DELAY] ms'],
        'Hello!': ['¡Hola!', 'Hola!'],
        'clear display': ['borrar pantalla', 'esborra la pantalla'],
        'light intensity': ['intensidad de luz', 'intensitat de llum'],
        'temperature': ['temperatura', 'temperatura'],
        'angle with the North': ['ángulo con el norte', 'angle amb el nord'],
        'pitch': ['cabeceo', 'capcineig'],
        'roll': ['balanceo', 'balanceig'],
        'sound level': ['nivel de sonido', 'nivell de so'],
        'magnetic force': ['fuerza magnética', 'força magnètica'],
        'absolute': ['absoluta', 'absoluta'],
        'acceleration [AXIS]': ['aceleración [AXIS]', 'acceleració [AXIS]'],
        'analog value of pin [PIN]': ['valor analógico del pin [PIN]', 'valor analògic del pin [PIN]'],
        'set pin [PIN] to input [MODE]': ['poner pin [PIN] como entrada [MODE]', 'posa el pin [PIN] com a entrada [MODE]'],
        '[PIN] pin is high?': ['¿pin [PIN] en alto?', 'pin [PIN] en alt?'],
        'set [PIN] Digital [LEVEL]': ['poner [PIN] digital a [LEVEL]', 'posa [PIN] digital a [LEVEL]'],
        'set [PIN] analog [LEVEL] %': ['poner [PIN] analógico a [LEVEL] %', 'posa [PIN] analògic a [LEVEL] %'],
        'set [PIN] Servo [ANGLE]': ['poner servo [PIN] a [ANGLE]', 'posa el servo [PIN] a [ANGLE]'],
        'play tone [FREQ] Hz volume [VOL] %': ['tocar tono [FREQ] Hz volumen [VOL] %', 'toca el to [FREQ] Hz volum [VOL] %'],
        'stop tone': ['parar tono', 'atura el to'],
        'listen [EVENT_TYPE] event on [PIN]': ['escuchar evento [EVENT_TYPE] en [PIN]', 'escolta l’esdeveniment [EVENT_TYPE] a [PIN]'],
        'when catch [EVENT] at pin [PIN]': ['cuando se detecte [EVENT] en el pin [PIN]', 'quan es detecti [EVENT] al pin [PIN]'],
        'value of [EVENT] at [PIN]': ['valor de [EVENT] en [PIN]', 'valor de [EVENT] a [PIN]'],
        'when data with label [LABEL] received from micro:bit': ['al recibir datos con etiqueta [LABEL] de la micro:bit', 'quan es rebin dades amb l’etiqueta [LABEL] de la micro:bit'],
        'data of label [LABEL]': ['datos de la etiqueta [LABEL]', 'dades de l’etiqueta [LABEL]'],
        'send data [DATA] with label [LABEL] to micro:bit': ['enviar datos [DATA] con etiqueta [LABEL] a la micro:bit', 'envia les dades [DATA] amb l’etiqueta [LABEL] a la micro:bit'],
        'data': ['datos', 'dades'],
        'down': ['pulsado', 'premut'],
        'up': ['soltado', 'deixat anar'],
        'click': ['clic', 'clic'],
        'touched': ['tocado', 'tocat'],
        'released': ['soltado', 'deixat anar'],
        'tapped': ['tocado una vez', 'tocat un cop'],
        'titl up': ['inclinada hacia arriba', 'inclinada cap amunt'],
        'titl down': ['inclinada hacia abajo', 'inclinada cap avall'],
        'titl left': ['inclinada a la izquierda', 'inclinada a l’esquerra'],
        'titl right': ['inclinada a la derecha', 'inclinada a la dreta'],
        'face up': ['boca arriba', 'cap per amunt'],
        'face down': ['boca abajo', 'cap per avall'],
        'freefall': ['en caída libre', 'en caiguda lliure'],
        'shake': ['agitada', 'sacsejada'],
        'Low': ['bajo', 'baix'],
        'High': ['alto', 'alt'],
        'pull none': ['sin resistencia', 'sense resistència'],
        'pull up': ['resistencia a positivo', 'resistència a positiu'],
        'pull down': ['resistencia a negativo', 'resistència a negatiu'],
        'none': ['ninguno', 'cap'],
        'pulse': ['pulso', 'pols'],
        'edge': ['flanco', 'flanc'],
        'low pulse': ['pulso bajo', 'pols baix'],
        'high pulse': ['pulso alto', 'pols alt'],
        'fall': ['bajada', 'baixada'],
        'rise': ['subida', 'pujada']
    },
    xcxArduino: {
        'Set D[PIN] input bias [BIAS]': ['poner entrada D[PIN] con resistencia [BIAS]', 'posa l’entrada D[PIN] amb resistència [BIAS]'],
        'Set D[PIN] to [LEVEL]': ['poner D[PIN] a [LEVEL]', 'posa D[PIN] a [LEVEL]'],
        'PWM [PIN] set duty cycle [LEVEL]%': ['PWM [PIN] fijar ciclo de trabajo [LEVEL]%', 'PWM [PIN] fixa el cicle de treball [LEVEL]%'],
        'Servo [PIN] turn [ANGLE] degrees': ['servo [PIN] girar [ANGLE] grados', 'servo [PIN] gira [ANGLE] graus']
    },
    chatgpt2scratch: {
        '[TEXT] Answer': ['respuesta a [TEXT]', 'resposta a [TEXT]'],
        'How can I get better at Scratch?': ['¿Cómo puedo mejorar en Scratch?', 'Com puc millorar a Scratch?'],
        'Clear message logs': ['borrar historial de mensajes', 'esborra l’historial de missatges'],
        'Set max tokens [NUMBER]': ['fijar máximo de tokens [NUMBER]', 'fixa el màxim de tokens [NUMBER]'],
        'Set temperature (0-2) [NUMBER]': ['fijar temperatura (0-2) [NUMBER]', 'fixa la temperatura (0-2) [NUMBER]'],
        'Set timeout [NUMBER]': ['fijar tiempo de espera [NUMBER]', 'fixa el temps d’espera [NUMBER]'],
        'Set the system prompt [TEXT]': ['fijar instrucciones del sistema [TEXT]', 'fixa les instruccions del sistema [TEXT]'],
        'You are a helpful assistant in the Scratch programming language.': ['Eres un asistente útil del lenguaje de programación Scratch.', 'Ets un assistent útil del llenguatge de programació Scratch.'],
        'Set API key': ['configurar clave de API', 'configura la clau d’API']
    },
    tfknn: {
        'add example [DATA] with label [LABEL]': ['añadir ejemplo [DATA] con etiqueta [LABEL]', 'afegeix l’exemple [DATA] amb l’etiqueta [LABEL]'],
        'label 1': ['etiqueta 1', 'etiqueta 1'],
        'clear examples for [LABEL]': ['borrar ejemplos de [LABEL]', 'esborra els exemples de [LABEL]'],
        'size of an example': ['tamaño de un ejemplo', 'mida d’un exemple'],
        'KNN data from [LIST_NAME]': ['datos KNN de [LIST_NAME]', 'dades KNN de [LIST_NAME]'],
        'load dataset from [LIST_NAME]': ['cargar datos de [LIST_NAME]', 'carrega les dades de [LIST_NAME]'],
        'KNN Dataset': ['Datos KNN', 'Dades KNN'],
        'predict [DATA] with [K] nearest neighbors': ['predecir [DATA] con [K] vecinos más cercanos', 'prediu [DATA] amb [K] veïns més propers'],
        'confidence of [LABEL]': ['confianza de [LABEL]', 'confiança de [LABEL]'],
        'label at [INDEX]': ['etiqueta en la posición [INDEX]', 'etiqueta a la posició [INDEX]'],
        'size of labels': ['número de etiquetas', 'nombre d’etiquetes'],
        'size of example for [LABEL]': ['número de ejemplos de [LABEL]', 'nombre d’exemples de [LABEL]']
    },
    ml2scratch: {
        'train label 1': ['entrenar etiqueta 1', 'entrena l’etiqueta 1'],
        'train label 2': ['entrenar etiqueta 2', 'entrena l’etiqueta 2'],
        'train label 3': ['entrenar etiqueta 3', 'entrena l’etiqueta 3'],
        'train label [LABEL]': ['entrenar etiqueta [LABEL]', 'entrena l’etiqueta [LABEL]'],
        'when received label:[LABEL]': ['al recibir la etiqueta: [LABEL]', 'quan es rebi l’etiqueta: [LABEL]'],
        'counts of label 1': ['ejemplos de la etiqueta 1', 'exemples de l’etiqueta 1'],
        'counts of label 2': ['ejemplos de la etiqueta 2', 'exemples de l’etiqueta 2'],
        'counts of label 3': ['ejemplos de la etiqueta 3', 'exemples de l’etiqueta 3'],
        'counts of label 4': ['ejemplos de la etiqueta 4', 'exemples de l’etiqueta 4'],
        'counts of label 5': ['ejemplos de la etiqueta 5', 'exemples de l’etiqueta 5'],
        'counts of label 6': ['ejemplos de la etiqueta 6', 'exemples de l’etiqueta 6'],
        'counts of label 7': ['ejemplos de la etiqueta 7', 'exemples de l’etiqueta 7'],
        'counts of label 8': ['ejemplos de la etiqueta 8', 'exemples de l’etiqueta 8'],
        'counts of label 9': ['ejemplos de la etiqueta 9', 'exemples de l’etiqueta 9'],
        'counts of label 10': ['ejemplos de la etiqueta 10', 'exemples de l’etiqueta 10'],
        'counts of label [LABEL]': ['ejemplos de la etiqueta [LABEL]', 'exemples de l’etiqueta [LABEL]'],
        'reset label:[LABEL]': ['reiniciar etiqueta: [LABEL]', 'reinicia l’etiqueta: [LABEL]'],
        'all': ['todas', 'totes'],
        'download learning data': ['descargar datos de aprendizaje', 'descarrega les dades d’aprenentatge'],
        'upload learning data': ['subir datos de aprendizaje', 'puja les dades d’aprenentatge'],
        'Learn/Classify [INPUT] image': ['aprender/clasificar imagen de [INPUT]', 'aprèn/classifica la imatge de [INPUT]'],
        'webcam': ['cámara', 'càmera'],
        'stage': ['escenario', 'escenari']
    },
    posenet2scratch: {
        '[PART] x of person no. [PERSON_NUMBER]': ['x de [PART] de la persona n.º [PERSON_NUMBER]', 'x de [PART] de la persona núm. [PERSON_NUMBER]'],
        '[PART] y of person no. [PERSON_NUMBER]': ['y de [PART] de la persona n.º [PERSON_NUMBER]', 'y de [PART] de la persona núm. [PERSON_NUMBER]'],
        ...posenetParts
    },
    tm2scratch: {
        'when received image label:[LABEL]': ['al recibir la etiqueta de imagen: [LABEL]', 'quan es rebi l’etiqueta d’imatge: [LABEL]'],
        'image [LABEL] detected': ['¿imagen [LABEL] detectada?', 'imatge [LABEL] detectada?'],
        'confidence of image [LABEL]': ['confianza de la imagen [LABEL]', 'confiança de la imatge [LABEL]'],
        'image classification model URL [URL]': ['URL del modelo de imágenes [URL]', 'URL del model d’imatges [URL]'],
        'classify image': ['clasificar imagen', 'classifica la imatge'],
        'image label': ['etiqueta de imagen', 'etiqueta d’imatge'],
        'when received sound label:[LABEL]': ['al recibir la etiqueta de sonido: [LABEL]', 'quan es rebi l’etiqueta de so: [LABEL]'],
        'sound [LABEL] detected': ['¿sonido [LABEL] detectado?', 'so [LABEL] detectat?'],
        'confidence of sound [LABEL]': ['confianza del sonido [LABEL]', 'confiança del so [LABEL]'],
        'sound classification model URL [URL]': ['URL del modelo de sonidos [URL]', 'URL del model de sons [URL]'],
        'sound label': ['etiqueta de sonido', 'etiqueta de so']
    },
    tmpose2scratch: {
        'when received pose label:[LABEL]': ['al recibir la etiqueta de postura: [LABEL]', 'quan es rebi l’etiqueta de postura: [LABEL]'],
        'pose [LABEL] detected': ['¿postura [LABEL] detectada?', 'postura [LABEL] detectada?'],
        'confidence of pose [LABEL]': ['confianza de la postura [LABEL]', 'confiança de la postura [LABEL]'],
        'pose classification model URL [URL]': ['URL del modelo de posturas [URL]', 'URL del model de postures [URL]'],
        'estimate pose': ['estimar postura', 'estima la postura'],
        'pose label': ['etiqueta de postura', 'etiqueta de postura']
    },
    ic2scratch: {
        'candidate1': ['candidato 1', 'candidat 1'],
        'candidate2': ['candidato 2', 'candidat 2'],
        'candidate3': ['candidato 3', 'candidat 3'],
        'confidence1': ['confianza 1', 'confiança 1'],
        'confidence2': ['confianza 2', 'confiança 2'],
        'confidence3': ['confianza 3', 'confiança 3'],
        'when received classification candidates': ['al recibir candidatos de clasificación', 'quan es rebin candidats de classificació']
    },
    handpose2scratch: {
        'x of [LANDMARK]': ['x de [LANDMARK]', 'x de [LANDMARK]'],
        'y of [LANDMARK]': ['y de [LANDMARK]', 'y de [LANDMARK]'],
        'z of [LANDMARK]': ['z de [LANDMARK]', 'z de [LANDMARK]'],
        ...handLandmarks
    },
    facemesh2scratch: {
        'x of person no: [PERSON_NUMBER] , keypoint no: [KEYPOINT]': ['x de la persona n.º [PERSON_NUMBER], punto n.º [KEYPOINT]', 'x de la persona núm. [PERSON_NUMBER], punt núm. [KEYPOINT]'],
        'y of person no: [PERSON_NUMBER] , keypoint no: [KEYPOINT]': ['y de la persona n.º [PERSON_NUMBER], punto n.º [KEYPOINT]', 'y de la persona núm. [PERSON_NUMBER], punt núm. [KEYPOINT]']
    },
    xcxMPHand: {
        'Hand Detection': ['Detección de manos', 'Detecció de mans'],
        'detect hand in costume [COSTUME]': ['detectar mano en el disfraz [COSTUME]', 'detecta la mà al vestit [COSTUME]'],
        'detect hand on stage': ['detectar mano en el escenario', 'detecta la mà a l’escenari'],
        'flipped': ['en espejo', 'en mirall'],
        'mirrored': ['reflejada', 'reflectida'],
        'get model path': ['ruta del modelo', 'ruta del model'],
        'set model path to [PATH]': ['fijar ruta del modelo a [PATH]', 'fixa la ruta del model a [PATH]'],
        'hand detection interval time': ['intervalo de detección de manos', 'interval de detecció de mans'],
        'set hand detection interval time to [TIME] ms': ['fijar intervalo de detección de manos a [TIME] ms', 'fixa l’interval de detecció de mans a [TIME] ms'],
        'handedness of hand #[HAND_NUMBER]': ['lateralidad de la mano n.º [HAND_NUMBER]', 'lateralitat de la mà núm. [HAND_NUMBER]'],
        'is hand detecting': ['¿detectando manos?', 'detectant mans?'],
        'number of hands to detect': ['número de manos a detectar', 'nombre de mans a detectar'],
        'set number of hands to detect to [NUM]': ['fijar número de manos a detectar a [NUM]', 'fixa el nombre de mans a detectar a [NUM]'],
        'number of hands': ['número de manos', 'nombre de mans'],
        'x of [LANDMARK] of hand #[HAND_NUMBER]': ['x de [LANDMARK] de la mano n.º [HAND_NUMBER]', 'x de [LANDMARK] de la mà núm. [HAND_NUMBER]'],
        'y of [LANDMARK] of hand #[HAND_NUMBER]': ['y de [LANDMARK] de la mano n.º [HAND_NUMBER]', 'y de [LANDMARK] de la mà núm. [HAND_NUMBER]'],
        'z of [LANDMARK] of hand #[HAND_NUMBER]': ['z de [LANDMARK] de la mano n.º [HAND_NUMBER]', 'z de [LANDMARK] de la mà núm. [HAND_NUMBER]'],
        'relative x of [LANDMARK] of hand #[HAND_NUMBER]': ['x relativa de [LANDMARK] de la mano n.º [HAND_NUMBER]', 'x relativa de [LANDMARK] de la mà núm. [HAND_NUMBER]'],
        'relative y of [LANDMARK] of hand #[HAND_NUMBER]': ['y relativa de [LANDMARK] de la mano n.º [HAND_NUMBER]', 'y relativa de [LANDMARK] de la mà núm. [HAND_NUMBER]'],
        'relative z of [LANDMARK] of hand #[HAND_NUMBER]': ['z relativa de [LANDMARK] de la mano n.º [HAND_NUMBER]', 'z relativa de [LANDMARK] de la mà núm. [HAND_NUMBER]'],
        'set camera [DIRECTION]': ['fijar cámara [DIRECTION]', 'fixa la càmera [DIRECTION]'],
        'start hand detection on camera': ['empezar detección de manos con la cámara', 'comença la detecció de mans amb la càmera'],
        'stop hand detection': ['parar detección de manos', 'atura la detecció de mans'],
        'wrist(0)': ['muñeca (0)', 'canell (0)'],
        'thumb CMC(1)': ['pulgar CMC (1)', 'polze CMC (1)'],
        'thumb MCP(2)': ['pulgar MCP (2)', 'polze MCP (2)'],
        'thumb IP(3)': ['pulgar IP (3)', 'polze IP (3)'],
        'thumb tip(4)': ['punta del pulgar (4)', 'punta del polze (4)'],
        'index finger MCP(5)': ['índice MCP (5)', 'índex MCP (5)'],
        'index finger PIP(6)': ['índice PIP (6)', 'índex PIP (6)'],
        'index finger DIP(7)': ['índice DIP (7)', 'índex DIP (7)'],
        'index finger tip(8)': ['punta del índice (8)', 'punta de l’índex (8)'],
        'middle finger MCP(9)': ['corazón MCP (9)', 'dit del mig MCP (9)'],
        'middle finger PIP(10)': ['corazón PIP (10)', 'dit del mig PIP (10)'],
        'middle finger DIP(11)': ['corazón DIP (11)', 'dit del mig DIP (11)'],
        'middle finger tip(12)': ['punta del corazón (12)', 'punta del dit del mig (12)'],
        'ring finger MCP(13)': ['anular MCP (13)', 'anular MCP (13)'],
        'ring finger PIP(14)': ['anular PIP (14)', 'anular PIP (14)'],
        'ring finger DIP(15)': ['anular DIP (15)', 'anular DIP (15)'],
        'ring finger tip(16)': ['punta del anular (16)', 'punta de l’anular (16)'],
        'pinky finger MCP(17)': ['meñique MCP (17)', 'dit petit MCP (17)'],
        'pinky finger PIP(18)': ['meñique PIP (18)', 'dit petit PIP (18)'],
        'pinky finger DIP(19)': ['meñique DIP (19)', 'dit petit DIP (19)'],
        'pinky finger tip(20)': ['punta del meñique (20)', 'punta del dit petit (20)']
    },
    mpImageEmbed: {
        'Image Embedding': ['Vectores de imágenes', 'Vectors d’imatges'],
        'cosine similarity of [VECTOR1] and [VECTOR2]': ['similitud del coseno entre [VECTOR1] y [VECTOR2]', 'similitud del cosinus entre [VECTOR1] i [VECTOR2]'],
        'embeddings for [IMAGE]': ['vectores (embedding) de [IMAGE]', 'vectors (embedding) de [IMAGE]'],
        'get model path': ['ruta del modelo', 'ruta del model'],
        'set model path to [PATH]': ['fijar ruta del modelo a [PATH]', 'fixa la ruta del model a [PATH]']
    },
    gai: {
        'chat [PROMPT]': ['conversar [PROMPT]', 'conversa [PROMPT]'],
        'Hello AI!': ['¡Hola, IA!', 'Hola, IA!'],
        'chat history': ['historial de la conversación', 'historial de la conversa'],
        'start chat with history [HISTORY]': ['empezar conversación con historial [HISTORY]', 'comença la conversa amb l’historial [HISTORY]'],
        'generate [PROMPT]': ['generar [PROMPT]', 'genera [PROMPT]'],
        'What is AI?': ['¿Qué es la IA?', 'Què és la IA?'],
        'when response received': ['al recibir la respuesta', 'quan es rebi la resposta'],
        'response text': ['texto de la respuesta', 'text de la resposta'],
        'response #[CANDIDATE_INDEX] safety rating [HARM_CATEGORY]': ['valoración de seguridad [HARM_CATEGORY] de la respuesta n.º [CANDIDATE_INDEX]', 'valoració de seguretat [HARM_CATEGORY] de la resposta núm. [CANDIDATE_INDEX]'],
        'when partial response received': ['al recibir una respuesta parcial', 'quan es rebi una resposta parcial'],
        'partial response text': ['texto de la respuesta parcial', 'text de la resposta parcial'],
        'generated file data at [INDEX]': ['datos del archivo generado n.º [INDEX]', 'dades del fitxer generat núm. [INDEX]'],
        'generated file media type at [INDEX]': ['tipo del archivo generado n.º [INDEX]', 'tipus del fitxer generat núm. [INDEX]'],
        'max generated file count': ['número de archivos generados', 'nombre de fitxers generats'],
        'costume data [COSTUME]': ['datos del disfraz [COSTUME]', 'dades del vestit [COSTUME]'],
        'backdrop data [BACKDROP]': ['datos del fondo [BACKDROP]', 'dades del fons [BACKDROP]'],
        'snapshot data': ['datos de la foto', 'dades de la foto'],
        'sound data [SOUND]': ['datos del sonido [SOUND]', 'dades del so [SOUND]'],
        'start listening': ['empezar a escuchar', 'comença a escoltar'],
        'stop listening': ['dejar de escuchar', 'deixa d’escoltar'],
        'listened data': ['datos escuchados', 'dades escoltades'],
        'set [HARM_CATEGORY] to [BLOCK_THRESHOLD]': ['fijar [HARM_CATEGORY] a [BLOCK_THRESHOLD]', 'fixa [HARM_CATEGORY] a [BLOCK_THRESHOLD]'],
        'set generation [CONFIG] to [VALUE]': ['fijar [CONFIG] de generación a [VALUE]', 'fixa [CONFIG] de generació a [VALUE]'],
        'generation [CONFIG]': ['[CONFIG] de generación', '[CONFIG] de generació'],
        'set function calling mode [MODE]': ['fijar modo de llamada a funciones [MODE]', 'fixa el mode de crida a funcions [MODE]'],
        'return [RESULT] to AI': ['devolver [RESULT] a la IA', 'retorna [RESULT] a la IA'],
        'use model [MODEL_ID]': ['usar modelo [MODEL_ID]', 'fes servir el model [MODEL_ID]'],
        'model': ['modelo', 'model'],
        'model ID at [MODEL_INDEX]': ['ID del modelo n.º [MODEL_INDEX]', 'ID del model núm. [MODEL_INDEX]'],
        'max model number': ['número de modelos', 'nombre de models'],
        'use model [MODEL_ID] for generative': ['usar modelo [MODEL_ID] para generar', 'fes servir el model [MODEL_ID] per generar'],
        'generative model': ['modelo generativo', 'model generatiu'],
        'generative model ID at [MODEL_INDEX]': ['ID del modelo generativo n.º [MODEL_INDEX]', 'ID del model generatiu núm. [MODEL_INDEX]'],
        'max generative model number': ['número de modelos generativos', 'nombre de models generatius'],
        'download browser LLM model [MODEL_ID] as [MODEL_TYPE]': ['descargar modelo LLM del navegador [MODEL_ID] como [MODEL_TYPE]', 'descarrega el model LLM del navegador [MODEL_ID] com a [MODEL_TYPE]'],
        'generative': ['generativo', 'generatiu'],
        'cancel browser LLM model download': ['cancelar descarga del modelo LLM del navegador', 'cancel·la la descàrrega del model LLM del navegador'],
        'clear cache for model at [MODEL_INDEX]': ['borrar caché del modelo n.º [MODEL_INDEX]', 'esborra la memòria cau del model núm. [MODEL_INDEX]'],
        'get [PATH] from JSON [JSON]': ['obtener [PATH] del JSON [JSON]', 'obtén [PATH] del JSON [JSON]'],
        'item [INDEX] of JSON array [JSON]': ['elemento [INDEX] de la lista JSON [JSON]', 'element [INDEX] de la llista JSON [JSON]'],
        'length of JSON array [JSON]': ['longitud de la lista JSON [JSON]', 'longitud de la llista JSON [JSON]'],
        'embedding for [CONTENT]': ['vector (embedding) de [CONTENT]', 'vector (embedding) de [CONTENT]'],
        'cat': ['gato', 'gat'],
        '[METRIC] of [VECTOR_A] and [VECTOR_B]': ['[METRIC] entre [VECTOR_A] y [VECTOR_B]', '[METRIC] entre [VECTOR_A] i [VECTOR_B]'],
        'use model [MODEL_ID] for embedding': ['usar modelo [MODEL_ID] para vectores', 'fes servir el model [MODEL_ID] per a vectors'],
        'embedding model': ['modelo de vectores', 'model de vectors'],
        'embedding model ID at [MODEL_INDEX]': ['ID del modelo de vectores n.º [MODEL_INDEX]', 'ID del model de vectors núm. [MODEL_INDEX]'],
        'max embedding model number': ['número de modelos de vectores', 'nombre de models de vectors'],
        'ask API key with message [MESSAGE]': ['pedir clave de API con el mensaje [MESSAGE]', 'demana la clau d’API amb el missatge [MESSAGE]'],
        'Please enter API key': ['Escribe la clave de API', 'Escriu la clau d’API'],
        'API key': ['clave de API', 'clau d’API'],
        'set API key to [KEY]': ['fijar clave de API a [KEY]', 'fixa la clau d’API a [KEY]'],
        'set base URL to [URL]': ['fijar URL base a [URL]', 'fixa l’URL base a [URL]'],
        'base URL': ['URL base', 'URL base'],
        'set API to [API]': ['usar la API [API]', 'fes servir l’API [API]'],
        'DEPRECATED': ['OBSOLETO', 'OBSOLET'],
        'Temperature': ['Temperatura', 'Temperatura'],
        'Max output tokens': ['Máximo de tokens de salida', 'Màxim de tokens de sortida'],
        'Stop sequences': ['Secuencias de parada', 'Seqüències d’aturada'],
        'System Instruction': ['Instrucciones del sistema', 'Instruccions del sistema'],
        'Response Schema': ['Esquema de respuesta', 'Esquema de resposta'],
        'Auto': ['Automático', 'Automàtic'],
        'Required': ['Obligatorio', 'Obligatori'],
        'None': ['Ninguno', 'Cap'],
        'Dot product': ['Producto escalar', 'Producte escalar'],
        'Cosine distance': ['Distancia del coseno', 'Distància del cosinus'],
        'Euclidean distance': ['Distancia euclidiana', 'Distància euclidiana'],
        'Browser LLM': ['LLM del navegador', 'LLM del navegador'],
        'text generation': ['generación de texto', 'generació de text'],
        'embedding': ['vectores (embedding)', 'vectors (embedding)']
    }
};

const lookup = (table, value, index) => {
    const text = value && typeof value === 'object' ? (value.default || value.defaultMessage) : value;
    if (typeof text !== 'string') return value;
    const own = Object.prototype.hasOwnProperty;
    if (own.call(table, text)) return table[text][index];
    if (own.call(common, text)) return common[text][index];
    return value;
};

const translateMenu = (menu, table, index) => {
    const items = Array.isArray(menu) ? menu : menu && menu.items;
    if (!Array.isArray(items)) return menu;
    const translated = items.map(item => {
        if (typeof item === 'string') {
            const text = lookup(table, item, index);
            return text === item ? item : {text, value: item};
        }
        if (item && typeof item === 'object' && 'text' in item) {
            return {...item, text: lookup(table, item.text, index)};
        }
        return item;
    });
    return Array.isArray(menu) ? translated : {...menu, items: translated};
};

/**
 * Translate an original extension's getInfo() result to Spanish or Catalan.
 * @param {object} info - getInfo() of the original extension.
 * @param {string} extensionId - Its id (key of the texts table).
 * @returns {object} The same info, translated where a text is known.
 */
export const translateOriginalInfo = (info, extensionId) => {
    const index = {es: 0, ca: 1}[language()];
    if (typeof index === 'undefined' || !info) return info;
    if (!Object.prototype.hasOwnProperty.call(texts, extensionId)) return info;
    const table = texts[extensionId];
    const blocks = (info.blocks || []).map(block => {
        if (!block || typeof block !== 'object') return block;
        const copy = {...block, text: lookup(table, block.text, index)};
        if (block.arguments) {
            copy.arguments = {};
            Object.entries(block.arguments).forEach(([name, arg]) => {
                const translatable = arg && !arg.menu && (typeof arg.defaultValue === 'string' ||
                    (arg.defaultValue && typeof arg.defaultValue === 'object'));
                copy.arguments[name] = translatable ?
                    {...arg, defaultValue: lookup(table, arg.defaultValue, index)} : arg;
            });
        }
        return copy;
    });
    const menus = {};
    Object.entries(info.menus || {}).forEach(([name, menu]) => {
        menus[name] = translateMenu(menu, table, index);
    });
    return {...info, name: lookup(table, info.name, index), blocks, menus};
};

// Text of the "extension status" reporter that Unifyscratch adds to every original.
export const statusText = {
    id: 'unifiscratch.extensions.extensionStatus',
    default: 'extension status',
    description: 'Unifyscratch: status reporter added to original extensions'
};

export const originalTexts = texts;
export const commonOriginalTexts = common;
