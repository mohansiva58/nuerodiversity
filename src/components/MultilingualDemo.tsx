import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { TranslatedText } from '../components/TranslatedText';
import { useTTS } from '../hooks/useTranslation';
import './MultilingualDemo.css';

/**
 * Multilingual System Demo Component
 * Demonstrates all features of the multilingual system
 */
export const MultilingualDemo: React.FC = () => {
    const { t } = useTranslation(); // For static translations
    const {
        currentLanguage,
        autoTranslateEnabled,
        toggleAutoTranslate,
        ttsEnabled,
        toggleTTS,
        clearTranslationCache,
    } = useLanguage();

    const { speak, stop, isSpeaking } = useTTS();

    const [dynamicContent] = useState(
        "This is dynamic content that will be automatically translated when you switch languages. " +
        "It demonstrates the power of the multilingual system with zero-lag switching and intelligent caching."
    );

    const handleSpeak = () => {
        if (isSpeaking) {
            stop();
        } else {
            speak(dynamicContent);
        }
    };

    return (
        <div className="multilingual-demo">
            {/* Header */}
            <header className="demo-header">
                <h1>{t('language.selectLanguage')}</h1>
                <LanguageSwitcher variant="dropdown" />
            </header>

            {/* Controls */}
            <section className="demo-controls">
                <h2>{t('settings')}</h2>

                <div className="control-group">
                    <label className="control-label">
                        <input
                            type="checkbox"
                            checked={autoTranslateEnabled}
                            onChange={toggleAutoTranslate}
                            aria-label={t('language.autoTranslate')}
                        />
                        <span>{t('language.autoTranslate')}</span>
                    </label>

                    <label className="control-label">
                        <input
                            type="checkbox"
                            checked={ttsEnabled}
                            onChange={toggleTTS}
                            aria-label="Enable Text-to-Speech"
                        />
                        <span>Enable Text-to-Speech</span>
                    </label>
                </div>

                <button
                    onClick={clearTranslationCache}
                    className="btn btn-secondary"
                >
                    Clear Translation Cache
                </button>
            </section>

            {/* Static Content Demo */}
            <section className="demo-section">
                <h2>Static UI Labels (i18next)</h2>
                <p className="demo-description">
                    These labels switch instantly with zero API calls:
                </p>

                <div className="static-demo">
                    <button className="btn btn-primary">{t('buttons.submit')}</button>
                    <button className="btn btn-secondary">{t('buttons.cancel')}</button>
                    <button className="btn btn-success">{t('buttons.save')}</button>
                    <button className="btn btn-danger">{t('buttons.delete')}</button>
                </div>

                <div className="nav-demo">
                    <nav>
                        <a href="#home">{t('nav.home')}</a>
                        <a href="#learning">{t('nav.learning')}</a>
                        <a href="#games">{t('nav.games')}</a>
                        <a href="#community">{t('nav.community')}</a>
                    </nav>
                </div>
            </section>

            {/* Dynamic Content Demo */}
            <section className="demo-section">
                <h2>Dynamic Content (Auto-Translation)</h2>
                <p className="demo-description">
                    This content is translated via API with intelligent caching:
                </p>

                <div className="dynamic-demo">
                    <TranslatedText
                        text={dynamicContent}
                        sourceLang="en"
                        as="p"
                        className="translated-content"
                        showSkeleton={true}
                    />

                    <button
                        onClick={handleSpeak}
                        className="btn btn-tts"
                        disabled={!ttsEnabled}
                        aria-label={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                    >
                        {isSpeaking ? '⏸️ Stop' : '🔊 Read Aloud'}
                    </button>
                </div>
            </section>

            {/* Language Switcher Variants */}
            <section className="demo-section">
                <h2>Language Switcher Variants</h2>

                <div className="switcher-variants">
                    <div className="variant-item">
                        <h3>Dropdown</h3>
                        <LanguageSwitcher variant="dropdown" />
                    </div>

                    <div className="variant-item">
                        <h3>Inline</h3>
                        <LanguageSwitcher variant="inline" />
                    </div>

                    <div className="variant-item">
                        <h3>Compact</h3>
                        <LanguageSwitcher variant="compact" />
                    </div>
                </div>
            </section>

            {/* Status */}
            <section className="demo-status">
                <h3>System Status</h3>
                <dl className="status-list">
                    <dt>Current Language:</dt>
                    <dd>{currentLanguage.toUpperCase()}</dd>

                    <dt>Auto-Translate:</dt>
                    <dd>{autoTranslateEnabled ? '✅ Enabled' : '❌ Disabled'}</dd>

                    <dt>Text-to-Speech:</dt>
                    <dd>{ttsEnabled ? '✅ Enabled' : '❌ Disabled'}</dd>

                    <dt>TTS Status:</dt>
                    <dd>{isSpeaking ? '🔊 Speaking' : '⏸️ Idle'}</dd>
                </dl>
            </section>

            {/* Accessibility Info */}
            <section className="demo-section">
                <h2>♿ Accessibility Features</h2>
                <ul className="feature-list">
                    <li>✅ Full keyboard navigation support</li>
                    <li>✅ ARIA labels and live regions</li>
                    <li>✅ Screen reader announcements</li>
                    <li>✅ High contrast mode support</li>
                    <li>✅ Reduced motion preferences</li>
                    <li>✅ Focus management</li>
                    <li>✅ Locale-locked TTS voices</li>
                    <li>✅ Phonetic pronunciation corrections</li>
                </ul>
            </section>
        </div>
    );
};

export default MultilingualDemo;
