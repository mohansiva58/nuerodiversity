import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import './SoundToggle.css';

interface SoundToggleProps {
    variant?: 'icon' | 'button';
    className?: string;
}

export const SoundToggle: React.FC<SoundToggleProps> = ({
    variant = 'icon',
    className = ''
}) => {
    const { ttsEnabled, toggleTTS } = useLanguage();

    const handleToggle = () => {
        toggleTTS();

        // Announce the change
        const message = ttsEnabled ? 'Sound disabled' : 'Sound enabled';
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', 'polite');
        announcement.className = 'sr-only';
        announcement.textContent = message;
        document.body.appendChild(announcement);
        setTimeout(() => document.body.removeChild(announcement), 1000);
    };

    if (variant === 'button') {
        return (
            <button
                onClick={handleToggle}
                className={`sound-toggle sound-toggle--button ${ttsEnabled ? 'sound-toggle--active' : ''} ${className}`}
                aria-label={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
                aria-pressed={ttsEnabled}
                title={ttsEnabled ? 'Sound On' : 'Sound Off'}
            >
                {ttsEnabled ? (
                    <>
                        <Volume2 className="sound-toggle__icon" />
                        <span className="sound-toggle__text">Sound On</span>
                    </>
                ) : (
                    <>
                        <VolumeX className="sound-toggle__icon" />
                        <span className="sound-toggle__text">Sound Off</span>
                    </>
                )}
            </button>
        );
    }

    return (
        <button
            onClick={handleToggle}
            className={`sound-toggle sound-toggle--icon ${ttsEnabled ? 'sound-toggle--active' : ''} ${className}`}
            aria-label={ttsEnabled ? 'Disable text-to-speech' : 'Enable text-to-speech'}
            aria-pressed={ttsEnabled}
            title={ttsEnabled ? 'Sound On' : 'Sound Off'}
        >
            {ttsEnabled ? (
                <Volume2 className="sound-toggle__icon" />
            ) : (
                <VolumeX className="sound-toggle__icon" />
            )}
        </button>
    );
};

export default SoundToggle;
