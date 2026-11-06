import React from 'react';
import {FormattedMessage} from 'react-intl';

import styles from './edison-setup.css';

// Opened by the Edison V3 extension (library selection and help block) through
// a window event, so the extension module does not depend on React.
// Texts: src/lib/unifiscratch-l10n.js (unifiscratch.edisonSetup.*).
export const EDISON_HELP_EVENT = 'unifiscratch-edison-help';
export const EDISON_BRIDGE_PATH = 'static/extensions/edison/unfyscratch-puente-edison-v3.py';
const EDPY_URL = 'https://www.edpyapp.com/v3/';

class EdisonSetup extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {visible: false, copied: null};
        this.handleOpen = this.handleOpen.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleCopy = this.handleCopy.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    componentDidMount () {
        window.addEventListener(EDISON_HELP_EVENT, this.handleOpen);
        window.addEventListener('keydown', this.handleKeyDown);
    }

    componentWillUnmount () {
        window.removeEventListener(EDISON_HELP_EVENT, this.handleOpen);
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    handleOpen () {
        this.setState({visible: true, copied: null});
        // Load the program now, so «Copy» can write it during the click itself.
        if (!this.bridgeCode) {
            fetch(new URL(EDISON_BRIDGE_PATH, document.baseURI).href)
                .then(response => (response.ok ? response.text() : null))
                .then(code => {
                    this.bridgeCode = code;
                })
                .catch(() => {});
        }
    }

    handleClose () {
        this.setState({visible: false});
    }

    handleKeyDown (event) {
        if (this.state.visible && event.key === 'Escape') this.handleClose();
    }

    handleCopy () {
        const code = this.bridgeCode;
        if (!code) {
            this.setState({copied: false});
            return;
        }
        // Older copy method for browsers or embedded views that block the clipboard API.
        const fallback = () => {
            const area = document.createElement('textarea');
            area.value = code;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.opacity = '0';
            document.body.appendChild(area);
            area.select();
            let ok = false;
            try {
                ok = document.execCommand('copy');
            } catch (error) {
                ok = false;
            }
            document.body.removeChild(area);
            this.setState({copied: ok});
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code)
                .then(() => this.setState({copied: true}))
                .catch(fallback);
        } else {
            fallback();
        }
    }

    render () {
        if (!this.state.visible) return null;
        const link = (href, children) => (
            <a
                href={href}
                rel="noopener noreferrer"
                target="_blank"
            >
                {children}
            </a>
        );
        return (
            <div
                className={styles.overlay}
                onClick={this.handleClose}
            >
                <div
                    aria-labelledby="edison-setup-title"
                    aria-modal
                    className={styles.panel}
                    role="dialog"
                    onClick={event => event.stopPropagation()} // eslint-disable-line react/jsx-no-bind
                >
                    <h2
                        className={styles.title}
                        id="edison-setup-title"
                    >
                        <FormattedMessage
                            defaultMessage="Connect Edison V3 to Unfyscratch"
                            id="unifiscratch.edisonSetup.title"
                        />
                    </h2>
                    <p className={styles.intro}>
                        <FormattedMessage
                            defaultMessage={'Edison needs a small bridge program. You only load it once; ' +
                                'it stays on the robot until you load another program.'}
                            id="unifiscratch.edisonSetup.intro"
                        />
                    </p>
                    <div className={styles.actions}>
                        <button
                            className={styles.primary}
                            type="button"
                            onClick={this.handleCopy}
                        >
                            <FormattedMessage
                                defaultMessage="Copy bridge program"
                                id="unifiscratch.edisonSetup.copy"
                            />
                        </button>
                        <a
                            className={styles.secondary}
                            download="unfyscratch-puente-edison-v3.py"
                            href={EDISON_BRIDGE_PATH}
                        >
                            <FormattedMessage
                                defaultMessage="Download bridge program"
                                id="unifiscratch.edisonSetup.download"
                            />
                        </a>
                        <a
                            className={styles.secondary}
                            href={EDPY_URL}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <FormattedMessage
                                defaultMessage="Open EdPy V3"
                                id="unifiscratch.edisonSetup.openEdpy"
                            />
                        </a>
                    </div>
                    {this.state.copied === null ? null : (
                        <p className={this.state.copied ? styles.ok : styles.error}>
                            {this.state.copied ? (
                                <FormattedMessage
                                    defaultMessage="Copied. Now paste it into EdPy V3."
                                    id="unifiscratch.edisonSetup.copied"
                                />
                            ) : (
                                <FormattedMessage
                                    defaultMessage="It could not be copied. Use «Download bridge program» instead."
                                    id="unifiscratch.edisonSetup.copyFailed"
                                />
                            )}
                        </p>
                    )}
                    <h3 className={styles.subtitle}>
                        <FormattedMessage
                            defaultMessage="1. Program Edison (only the first time)"
                            id="unifiscratch.edisonSetup.programTitle"
                        />
                    </h3>
                    <ol className={styles.steps}>
                        <li className={styles.step}>
                            <FormattedMessage
                                defaultMessage="Press «Copy bridge program» (or download it)."
                                id="unifiscratch.edisonSetup.step1"
                            />
                        </li>
                        <li className={styles.step}>
                            <FormattedMessage
                                defaultMessage={'Open {edpy}, delete all the code in the editor and paste ' +
                                    'the bridge program.'}
                                id="unifiscratch.edisonSetup.step2"
                                values={{edpy: link(EDPY_URL, 'EdPy V3')}}
                            />
                        </li>
                        <li className={styles.step}>
                            <FormattedMessage
                                defaultMessage="Switch Edison on and connect it to the computer with the USB cable."
                                id="unifiscratch.edisonSetup.step3"
                            />
                        </li>
                        <li className={styles.step}>
                            <FormattedMessage
                                defaultMessage={'Press «Program Edison», then «Connect Edison» and choose ' +
                                    'Edison V3 in the browser window. Press «Download program» and wait until ' +
                                    'it finishes.'}
                                id="unifiscratch.edisonSetup.step4"
                            />
                        </li>
                        <li className={styles.step}>
                            <FormattedMessage
                                defaultMessage="Close the EdPy tab: only one page at a time can use Edison."
                                id="unifiscratch.edisonSetup.step5"
                            />
                        </li>
                    </ol>
                    <h3 className={styles.subtitle}>
                        <FormattedMessage
                            defaultMessage="2. Use it in Unfyscratch (every time)"
                            id="unifiscratch.edisonSetup.useTitle"
                        />
                    </h3>
                    <ol className={styles.steps}>
                        <li className={styles.step}>
                            <FormattedMessage
                                defaultMessage="Connect Edison by USB and switch it on. Use Chrome or Edge."
                                id="unifiscratch.edisonSetup.step6"
                            />
                        </li>
                        <li className={styles.step}>
                            <FormattedMessage
                                defaultMessage={'Click the block «connect Edison V3 by USB» and choose Edison in ' +
                                    'the browser window. Edison beeps when it is ready.'}
                                id="unifiscratch.edisonSetup.step7"
                            />
                        </li>
                        <li className={styles.step}>
                            <FormattedMessage
                                defaultMessage={'Try it on a table: each block moves at most 30 cm or 360°. The ' +
                                    'red flag stops Edison. If you press the square button on the robot, connect ' +
                                    'again.'}
                                id="unifiscratch.edisonSetup.step8"
                            />
                        </li>
                    </ol>
                    <p className={styles.note}>
                        <FormattedMessage
                            defaultMessage={'If Edison does not answer, load the bridge program again with EdPy ' +
                                'and check the «last connection error» block.'}
                            id="unifiscratch.edisonSetup.trouble"
                        />
                    </p>
                    <button
                        className={styles.close}
                        type="button"
                        onClick={this.handleClose}
                    >
                        <FormattedMessage
                            defaultMessage="Understood"
                            id="unifiscratch.edisonSetup.close"
                        />
                    </button>
                </div>
            </div>
        );
    }
}

export const openEdisonSetup = () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EDISON_HELP_EVENT));
};

export default EdisonSetup;
