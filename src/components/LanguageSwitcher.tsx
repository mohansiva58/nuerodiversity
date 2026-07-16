import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n/config';
import './LanguageSwitcher.css';

interface LanguageSwitcherProps {
    variant?: 'dropdown' | 'inline' | 'compact';
    showFlags?: boolean;
    showNativeNames?: boolean;
    className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
    variant = 'dropdown',
    showFlags = true,
    showNativeNames = true,
    className = '',
}) => {
    const { currentLanguage, changeLanguage, isTranslating } = useLanguage();
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLanguageChange = async (language: SupportedLanguage) => {
        try {
            await changeLanguage(language);
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to change language:', error);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent, language: SupportedLanguage) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleLanguageChange(language);
        }
    };

    // Dropdown variant
    if (variant === 'dropdown') {
        return (
            <div
                ref={dropdownRef}
                className={`language-switcher language-switcher--dropdown ${className}`}
            >
                <button
                    className="language-switcher__trigger"
                    onClick={() => setIsOpen(!isOpen)}
                    aria-label={t('language.changeLanguage')}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    disabled={isTranslating}
                >
                    {showFlags && (
                        <span className="language-switcher__flag" aria-hidden="true">
                            {SUPPORTED_LANGUAGES[currentLanguage].flag}
                        </span>
                    )}
                    <span className="language-switcher__name">
                        {showNativeNames
                            ? SUPPORTED_LANGUAGES[currentLanguage].nativeName
                            : SUPPORTED_LANGUAGES[currentLanguage].name}
                    </span>
                    <svg
                        className={`language-switcher__icon ${isOpen ? 'language-switcher__icon--open' : ''}`}
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                {isOpen && (
                    <ul
                        className="language-switcher__menu"
                        role="listbox"
                        aria-label={t('language.selectLanguage')}
                    >
                        {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                            <li
                                key={code}
                                className={`language-switcher__option ${currentLanguage === code ? 'language-switcher__option--active' : ''
                                    }`}
                                role="option"
                                aria-selected={currentLanguage === code}
                                tabIndex={0}
                                onClick={() => handleLanguageChange(code as SupportedLanguage)}
                                onKeyDown={(e) => handleKeyDown(e, code as SupportedLanguage)}
                            >
                                {showFlags && (
                                    <span className="language-switcher__flag" aria-hidden="true">
                                        {lang.flag}
                                    </span>
                                )}
                                <span className="language-switcher__name">
                                    {showNativeNames ? lang.nativeName : lang.name}
                                </span>
                                {currentLanguage === code && (
                                    <svg
                                        className="language-switcher__check"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 16 16"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M13 4L6 11L3 8"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {isTranslating && (
                    <div className="language-switcher__loading" aria-live="polite">
                        <span className="language-switcher__spinner" aria-hidden="true"></span>
                        <span className="sr-only">{t('language.translating')}</span>
                    </div>
                )}
            </div>
        );
    }

    // Inline variant
    if (variant === 'inline') {
        return (
            <div className={`language-switcher language-switcher--inline ${className}`}>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                    <button
                        key={code}
                        className={`language-switcher__button ${currentLanguage === code ? 'language-switcher__button--active' : ''
                            }`}
                        onClick={() => handleLanguageChange(code as SupportedLanguage)}
                        aria-label={`${t('language.changeLanguage')}: ${lang.name}`}
                        aria-pressed={currentLanguage === code}
                        disabled={isTranslating}
                    >
                        {showFlags && (
                            <span className="language-switcher__flag" aria-hidden="true">
                                {lang.flag}
                            </span>
                        )}
                        <span className="language-switcher__code">{code.toUpperCase()}</span>
                    </button>
                ))}
            </div>
        );
    }

    // Compact variant (flags only)
    return (
        <div className={`language-switcher language-switcher--compact ${className}`}>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                <button
                    key={code}
                    className={`language-switcher__flag-button ${currentLanguage === code ? 'language-switcher__flag-button--active' : ''
                        }`}
                    onClick={() => handleLanguageChange(code as SupportedLanguage)}
                    aria-label={`${t('language.changeLanguage')}: ${lang.name}`}
                    aria-pressed={currentLanguage === code}
                    disabled={isTranslating}
                    title={lang.nativeName}
                >
                    {lang.flag}
                </button>
            ))}
        </div>
    );
};

export default LanguageSwitcher;
