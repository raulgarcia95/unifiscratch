let ready;
let ml5Library;
let poseLibrary;

const loadScript = file => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL(`static/extensions/stretch/${file}`, document.baseURI).href;
    const timer = setTimeout(() => {
        script.remove();
        reject(new Error(`Tiempo de espera al cargar ${file}`));
    }, 30000);
    script.onload = () => {
        clearTimeout(timer);
        resolve();
    };
    script.onerror = () => {
        clearTimeout(timer);
        script.remove();
        reject(new Error(`No se pudo cargar ${file}`));
    };
    document.head.appendChild(script);
});

// TensorFlow.js keeps its engine and kernel registry in window._tfengine and
// window._tfGlobals, reuses whatever it finds there and reads the engine from
// that global every time a tensor is read. Other curated modules (for example
// xcx-tf-knn) load a much newer TensorFlow at start-up, and ML5's TensorFlow
// 1.7 then fails with "forwardFunc is not a function" or "reading 'backend'".
// Two TensorFlow versions cannot work at the same time in one page, so the
// Stretch3 libraries get a fresh engine that stays installed once they load.
// Modules built on a newer TensorFlow (KNN) may fail afterwards in the same
// session; reloading the page restores them.
const withOwnTensorFlow = async load => {
    const hadTf = Object.prototype.hasOwnProperty.call(window, 'tf');
    const previousTf = window.tf;
    delete window._tfengine;
    delete window._tfGlobals;
    try {
        await load();
    } finally {
        if (hadTf) window.tf = previousTf; // eslint-disable-line require-atomic-updates
        else delete window.tf;
    }
};

export const librariesReady = () => {
    if (!ready) {
        ready = withOwnTensorFlow(async () => {
            await loadScript('ml5.min.js');
            ml5Library = window.ml5;
            await loadScript('tf.min.js');
            await loadScript('pose.min.js');
            poseLibrary = window.tmPose;
            if (!ml5Library || !poseLibrary) throw new Error('Bibliotecas de IA incompletas.');
        });
    }
    return ready;
};

// The original extensions expect these names. Keep the captured library objects
// even if another extension subsequently loads a different global version.
export const ml5 = new Proxy({}, {get: (target, key) => {
    if (!ml5Library) throw new Error('ML5 todavía no está listo.');
    const value = ml5Library[key];
    return typeof value === 'function' ? value.bind(ml5Library) : value;
}});
export const tmPose = new Proxy({}, {get: (target, key) => {
    if (!poseLibrary) throw new Error('Teachable Machine Pose todavía no está listo.');
    const value = poseLibrary[key];
    return typeof value === 'function' ? value.bind(poseLibrary) : value;
}});
