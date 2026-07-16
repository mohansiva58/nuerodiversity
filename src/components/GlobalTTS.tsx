import React, { useEffect } from 'react';
import { useSpeech } from './Voice';

const GlobalTTS: React.FC = () => {
    const { speak, stop } = useSpeech();

    useEffect(() => {
        let hoverTimer: NodeJS.Timeout;

        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // List of tags to trigger TTS
            const validTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'LI', 'A', 'BUTTON', 'LABEL', 'TD', 'TH'];

            if (validTags.includes(target.tagName) && target.innerText && target.innerText.trim().length > 0) {
                // Debounce to prevent immediate speaking on quick movements
                clearTimeout(hoverTimer);
                hoverTimer = setTimeout(() => {
                    // Check if user is still hovering over the same element
                    speak(target.innerText.trim());
                }, 500); // 500ms delay
            }
        };

        const handleMouseOut = () => {
            clearTimeout(hoverTimer);
            stop();
        };

        document.body.addEventListener('mouseover', handleMouseOver);
        document.body.addEventListener('mouseout', handleMouseOut);

        return () => {
            document.body.removeEventListener('mouseover', handleMouseOver);
            document.body.removeEventListener('mouseout', handleMouseOut);
            clearTimeout(hoverTimer);
        };
    }, [speak, stop]);

    return null; // This component doesn't render anything
};

export default GlobalTTS;
