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

export const librariesReady = () => {
    if (!ready) {
        ready = (async () => {
            await loadScript('ml5.min.js');
            ml5Library = window.ml5;
            const previousTf = window.tf;
            try {
                await loadScript('tf.min.js');
                await loadScript('pose.min.js');
                poseLibrary = window.tmPose;
            } finally {
                window.tf = previousTf;
            }
            if (!ml5Library || !poseLibrary) throw new Error('Bibliotecas de IA incompletas.');
        })();
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
