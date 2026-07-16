import React from 'react';
import { useSpeech } from './Voice';

interface SpeechTextProps {
  children: React.ReactNode;
  className?: string;
}

export const SpeechText: React.FC<SpeechTextProps> = ({ children, className = '' }) => {
  const { speak, stop } = useSpeech();
  

  const handleMouseEnter = (e: React.MouseEvent<HTMLSpanElement>) => {
    const text = e.currentTarget.textContent;
    if (text) {
      speak(text);
    }
  };

  const handleMouseLeave = () => {
    stop();
  };

  return (
    <span
      className={`cursor-pointer hover:text-blue-600 transition-colors ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </span>
  );
};