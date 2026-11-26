import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage, injectIntl} from 'react-intl';

import {SETUP_GUIDE_EVENT, guideFor, pickText} from '../../lib/libraries/extensions/setup-guides.mjs';
import styles from './setup-guide.css';

// Preparation window shared by every extension listed in setup-guides.mjs.
// Opened through a window event, so extension modules do not depend on React.

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

// Steps are plain text that may contain [text](url) links.
const renderText = text => {
    const parts = [];
    let last = 0;
    let match;
    LINK.lastIndex = 0;
    while ((match = LINK.exec(text))) { // eslint-disable-line no-cond-assign
        if (match.index > last) parts.push(text.slice(last, match.index));
        parts.push(
            <a
                href={match[2]}
                key={match.index}
                rel="noopener noreferrer"
                target="_blank"
            >
                {match[1]}
            </a>
        );
        last = match.index + match[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
};

const copyWithFallback = code => {
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
        return ok;
    };
    // Older copy method for browsers or embedded views that block the clipboard API.
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(code).then(() => true, fallback);
    }
    return Promise.resolve(fallback());
};

class SetupGuide extends React.PureComponent {
    constructor (props) {
        super(props);
        this.state = {id: null, copied: null};
        this.files = {};
        this.handleOpen = this.handleOpen.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleCopy = this.handleCopy.bind(this);
        this.handlePanelClick = this.handlePanelClick.bind(this);
    }

    componentDidMount () {
        window.addEventListener(SETUP_GUIDE_EVENT, this.handleOpen);
        window.addEventListener('keydown', this.handleKeyDown);
    }

    componentWillUnmount () {
        window.removeEventListener(SETUP_GUIDE_EVENT, this.handleOpen);
        window.removeEventListener('keydown', this.handleKeyDown);
    }

    handleOpen (event) {
        const id = event.detail && event.detail.id;
        const guide = guideFor(id);
        if (!guide) return;
        this.setState({id, copied: null});
        // Load copyable files now, so «Copy» can write them during the click itself.
        guide.actions.filter(action => action.type === 'copy' && !this.files[action.path]).forEach(action => {
            fetch(new URL(action.path, document.baseURI).href)
                .then(response => (response.ok ? response.text() : null))
                .then(code => {
                    this.files[action.path] = code;
                })
                .catch(() => {});
        });
    }

    handleClose () {
        this.setState({id: null});
    }

    handleKeyDown (event) {
        if (this.state.id && event.key === 'Escape') this.handleClose();
    }

    handleCopy (event) {
        const code = this.files[event.currentTarget.dataset.path];
        if (!code) {
            this.setState({copied: false});
            return;
        }
        copyWithFallback(code).then(copied => this.setState({copied}));
    }

    handlePanelClick (event) {
        event.stopPropagation();
    }

    renderAction (action, locale) {
        const label = pickText(action.label, locale);
        if (action.type === 'copy') {
            return (
                <button
                    className={styles.primary}
                    data-path={action.path}
                    key={label}
                    type="button"
                    onClick={this.handleCopy}
                >
                    {label}
                </button>
            );
        }
        if (action.type === 'download') {
            return (
                <a
                    className={styles.secondary}
                    download={action.file}
                    href={action.path}
                    key={label}
                >
                    {label}
                </a>
            );
        }
        return (
            <a
                className={styles.secondary}
                href={action.href}
                key={label}
                rel="noopener noreferrer"
                target="_blank"
            >
                {label}
            </a>
        );
    }

    render () {
        const guide = guideFor(this.state.id);
        if (!guide) return null;
        const locale = this.props.intl.locale;
        return (
            <div
                className={styles.overlay}
                onClick={this.handleClose}
            >
                <div
                    aria-labelledby="setup-guide-title"
                    aria-modal
                    className={styles.panel}
                    role="dialog"
                    onClick={this.handlePanelClick}
                >
                    <h2
                        className={styles.title}
                        id="setup-guide-title"
                    >
                        <FormattedMessage
                            defaultMessage="Prepare {name}"
                            id="unifiscratch.setupGuide.title"
                            values={{name: guide.name}}
                        />
                    </h2>
                    {guide.warning ? <p className={styles.warning}>{pickText(guide.warning, locale)}</p> : null}
                    <p className={styles.intro}>{pickText(guide.intro, locale)}</p>
                    <div className={styles.actions}>
                        {guide.actions.map(action => this.renderAction(action, locale))}
                    </div>
                    {this.state.copied === null ? null : (
                        <p className={this.state.copied ? styles.ok : styles.error}>
                            {this.state.copied ? (
                                <FormattedMessage
                                    defaultMessage="Copied. Now paste it where the guide says."
                                    id="unifiscratch.setupGuide.copied"
                                />
                            ) : (
                                <FormattedMessage
                                    defaultMessage="It could not be copied. Download the file instead."
                                    id="unifiscratch.setupGuide.copyFailed"
                                />
                            )}
                        </p>
                    )}
                    {guide.sections.map(section => (
                        <React.Fragment key={section.title[0]}>
                            <h3 className={styles.subtitle}>{pickText(section.title, locale)}</h3>
                            <ol className={styles.steps}>
                                {section.steps.map(step => (
                                    <li
                                        className={styles.step}
                                        key={step[0]}
                                    >
                                        {renderText(pickText(step, locale))}
                                    </li>
                                ))}
                            </ol>
                        </React.Fragment>
                    ))}
                    {guide.note ? <p className={styles.note}>{pickText(guide.note, locale)}</p> : null}
                    <button
                        className={styles.close}
                        type="button"
                        onClick={this.handleClose}
                    >
                        <FormattedMessage
                            defaultMessage="Understood"
                            id="unifiscratch.setupGuide.close"
                        />
                    </button>
                </div>
            </div>
        );
    }
}

SetupGuide.propTypes = {
    intl: PropTypes.shape({locale: PropTypes.string}).isRequired
};

export default injectIntl(SetupGuide);
