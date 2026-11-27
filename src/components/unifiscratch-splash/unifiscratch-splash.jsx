import React from 'react';
import {FormattedMessage, injectIntl, intlShape} from 'react-intl';

import {pickText} from '../../lib/libraries/extensions/setup-guides.mjs';
import {creditSections, externalServices} from './credits.mjs';

import {
    UNIFISCRATCH_CONTACT_EMAIL,
    UNIFISCRATCH_CONTACT_NAME,
    UNIFISCRATCH_SPLASH_YEAR
} from '../../lib/unifiscratch-l10n';

import styles from './unifiscratch-splash.css';

const UNIFISCRATCH_SOURCE_URL = 'https://github.com/raulgarcia95/unifyscratch';
const UNIFISCRATCH_NOTICES_URL = `${UNIFISCRATCH_SOURCE_URL}/blob/main/THIRD_PARTY_NOTICES.md`;
const OPEN_EVENT = 'unifiscratch:open-about';

// The menu bar's About button reopens this panel, so the notices stay reachable.
const openUnifiscratchAbout = () => {
    window.dispatchEvent(new Event(OPEN_EVENT));
};

class UnifiscratchSplash extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {
            visible: true,
            credits: false
        };
        this.handleClose = this.handleClose.bind(this);
        this.handleOpen = this.handleOpen.bind(this);
        this.handleShowCredits = this.handleShowCredits.bind(this);
        this.handleHideCredits = this.handleHideCredits.bind(this);
    }

    componentDidMount () {
        window.addEventListener(OPEN_EVENT, this.handleOpen);
    }

    componentWillUnmount () {
        window.removeEventListener(OPEN_EVENT, this.handleOpen);
    }

    handleOpen () {
        this.setState({visible: true, credits: false});
    }

    handleClose () {
        this.setState({visible: false});
    }

    handleShowCredits (event) {
        if (event) event.preventDefault();
        this.setState({credits: true});
    }

    handleHideCredits () {
        this.setState({credits: false});
    }

    renderCredits () {
        const locale = this.props.intl.locale;
        return (
            <div className={styles.overlay}>
                <div
                    aria-modal
                    className={`${styles.panel} ${styles.creditsPanel}`}
                    role="dialog"
                >
                    <h1 className={styles.title}>
                        <FormattedMessage
                            defaultMessage="Licences and credits"
                            id="unifiscratch.splash.credits"
                        />
                    </h1>
                    <p className={styles.legal}>
                        <FormattedMessage
                            defaultMessage={
                                'Unifyscratch is distributed under the AGPL-3.0 licence, without any warranty. ' +
                                'It includes or uses the work of the people below, under their licences. ' +
                                'Thank you!'
                            }
                            id="unifiscratch.credits.intro"
                        />
                    </p>
                    {creditSections.map(section => (
                        <section key={section.id}>
                            <h2 className={styles.creditsHeading}>{pickText(section.title, locale)}</h2>
                            <ul className={styles.creditsList}>
                                {section.items.map(item => {
                                    const name = pickText(item.name, locale);
                                    return (
                                        <li key={name}>
                                            {item.href ? (
                                                <a
                                                    href={item.href}
                                                    rel="noopener noreferrer"
                                                    target="_blank"
                                                >
                                                    {name}
                                                </a>
                                            ) : <strong>{name}</strong>}
                                            {` · ${item.author} · ${pickText(item.license, locale)}`}
                                            {item.note ? <div className={styles.creditsNote}>
                                                {pickText(item.note, locale)}
                                            </div> : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                    <h2 className={styles.creditsHeading}>
                        <FormattedMessage
                            defaultMessage="Data sent outside the browser"
                            id="unifiscratch.credits.privacyTitle"
                        />
                    </h2>
                    <ul className={styles.creditsList}>
                        {externalServices.map(text => <li key={text[0]}>{pickText(text, locale)}</li>)}
                    </ul>
                    <p className={styles.legal}>
                        <FormattedMessage
                            defaultMessage={
                                'With underage students, use the extensions that send data only with your ' +
                                'school’s authorisation, and do not save API keys in shared projects.'
                            }
                            id="unifiscratch.credits.minors"
                        />
                    </p>
                    <h2 className={styles.creditsHeading}>
                        <FormattedMessage
                            defaultMessage="Trademarks"
                            id="unifiscratch.credits.trademarksTitle"
                        />
                    </h2>
                    <p className={styles.legal}>
                        <FormattedMessage
                            defaultMessage={
                                'Scratch, LEGO, SPIKE, micro:bit, Makeblock, mBot, Codey Rocky and the other robot ' +
                                'and board names are trademarks of their owners, who do not sponsor or endorse ' +
                                'this site. They are mentioned only to show compatibility. The robot extensions ' +
                                'are original code and include no manufacturer software.'
                            }
                            id="unifiscratch.splash.trademarks"
                        />
                    </p>
                    <p className={styles.links}>
                        <a
                            href={UNIFISCRATCH_NOTICES_URL}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <FormattedMessage
                                defaultMessage="Full list with every licence"
                                id="unifiscratch.credits.full"
                            />
                        </a>
                        {' · '}
                        <a
                            href={UNIFISCRATCH_SOURCE_URL}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <FormattedMessage
                                defaultMessage="Source code (AGPL-3.0)"
                                id="unifiscratch.splash.source"
                            />
                        </a>
                    </p>
                    <div>
                        <button
                            className={styles.button}
                            type="button"
                            onClick={this.handleHideCredits}
                        >
                            <FormattedMessage
                                defaultMessage="Back"
                                id="unifiscratch.credits.back"
                            />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    render () {
        if (!this.state.visible) return null;
        if (this.state.credits) return this.renderCredits();

        return (
            <div className={styles.overlay}>
                <div
                    aria-modal
                    className={styles.panel}
                    role="dialog"
                >
                    <h1 className={styles.title}>
                        <FormattedMessage
                            defaultMessage="Welcome to Unifyscratch"
                            id="unifiscratch.splash.title"
                        />
                    </h1>
                    <p className={styles.body}>
                        <FormattedMessage
                            defaultMessage={
                                'The extensions for the different robots and boards are in the Add Extension menu.'
                            }
                            id="unifiscratch.splash.body"
                        />
                    </p>
                    <p className={styles.disclaimer}>
                        <FormattedMessage
                            defaultMessage={
                                'Unifyscratch is a free, non-commercial educational project based on Scratch ' +
                                '(Scratch Foundation) that uses open-source extensions by other authors, ' +
                                'under their licences. It is not an official Scratch product and is not ' +
                                'endorsed by the Scratch Foundation or MIT.'
                            }
                            id="unifiscratch.splash.disclaimer"
                        />
                    </p>
                    <p className={styles.legal}>
                        <FormattedMessage
                            defaultMessage={
                                'Scratch, LEGO, SPIKE, micro:bit, Makeblock, mBot, Codey Rocky and the other robot ' +
                                'and board names are trademarks of their owners, who do not sponsor or endorse ' +
                                'this site. They are mentioned only to show compatibility. The robot extensions ' +
                                'are original code and include no manufacturer software.'
                            }
                            id="unifiscratch.splash.trademarks"
                        />
                    </p>
                    <p className={styles.legal}>
                        <FormattedMessage
                            defaultMessage={
                                'Projects stay on your computer and camera extensions analyse images in the ' +
                                'browser. ChatGPT, generative AI and speech recognition send data to OpenAI or ' +
                                'Google: with underage students, use them only with your school’s authorisation.'
                            }
                            id="unifiscratch.splash.privacy"
                        />
                    </p>
                    <p className={styles.legal}>
                        <FormattedMessage
                            defaultMessage={
                                'Distributed under the AGPL-3.0 licence, without any warranty. For questions, ' +
                                'suggestions or claims, contact the creator of Unifyscratch.'
                            }
                            id="unifiscratch.splash.license"
                        />
                    </p>
                    <a
                        className={styles.author}
                        href={`mailto:${UNIFISCRATCH_CONTACT_EMAIL}`}
                    >
                        {`${UNIFISCRATCH_CONTACT_NAME} - ${UNIFISCRATCH_SPLASH_YEAR}`}
                    </a>
                    <p className={styles.links}>
                        <a
                            href={UNIFISCRATCH_SOURCE_URL}
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            <FormattedMessage
                                defaultMessage="Source code (AGPL-3.0)"
                                id="unifiscratch.splash.source"
                            />
                        </a>
                        {' · '}
                        <a
                            href={UNIFISCRATCH_NOTICES_URL}
                            onClick={this.handleShowCredits}
                        >
                            <FormattedMessage
                                defaultMessage="Licences and credits"
                                id="unifiscratch.splash.credits"
                            />
                        </a>
                    </p>
                    <div>
                        <button
                            className={styles.button}
                            type="button"
                            onClick={this.handleClose}
                        >
                            <FormattedMessage
                                defaultMessage="Start"
                                id="unifiscratch.splash.close"
                            />
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}

UnifiscratchSplash.propTypes = {
    intl: intlShape.isRequired
};

export {openUnifiscratchAbout};
export default injectIntl(UnifiscratchSplash);
