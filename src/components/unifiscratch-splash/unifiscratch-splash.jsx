import React from 'react';
import {FormattedMessage} from 'react-intl';

import {
    UNIFISCRATCH_CONTACT_EMAIL,
    UNIFISCRATCH_CONTACT_NAME,
    UNIFISCRATCH_SPLASH_YEAR
} from '../../lib/unifiscratch-l10n';

import styles from './unifiscratch-splash.css';

class UnifiscratchSplash extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {
            visible: true
        };
        this.handleClose = this.handleClose.bind(this);
    }

    handleClose () {
        this.setState({visible: false});
    }

    render () {
        if (!this.state.visible) return null;

        return (
            <div className={styles.overlay}>
                <div
                    aria-modal
                    className={styles.panel}
                    role="dialog"
                >
                    <h1 className={styles.title}>
                        <FormattedMessage
                            defaultMessage="Welcome to Unifiscratch"
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
                                'This environment has been created using freely distributed resources available ' +
                                'on the ' +
                                'internet. For questions, suggestions or claims, contact the creator of Unifiscratch.'
                            }
                            id="unifiscratch.splash.disclaimer"
                        />
                    </p>
                    <a
                        className={styles.author}
                        href={`mailto:${UNIFISCRATCH_CONTACT_EMAIL}`}
                    >
                        {`${UNIFISCRATCH_CONTACT_NAME} - ${UNIFISCRATCH_SPLASH_YEAR}`}
                    </a>
                    <p className={styles.disclaimer}>
                        <a
                            href="https://github.com/sarundalf64/unifiscratch"
                            rel="noopener noreferrer"
                            target="_blank"
                        >
                            {'Código fuente y estado de las extensiones (AGPL-3.0)'}
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

export default UnifiscratchSplash;
