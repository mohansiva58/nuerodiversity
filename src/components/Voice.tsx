import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';

export const useSpeech = () => {
  const { i18n } = useTranslation();
  const { ttsEnabled } = useLanguage();
  const speechRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Preload voices
  if (typeof window !== 'undefined' && !speechRef.current) {
    speechRef.current = window.speechSynthesis;
    speechRef.current.getVoices();
  }

  const getLangCode = (lang: string) => {
    switch (lang) {
      case 'hi': return 'hi-IN';
      case 'te': return 'te-IN';
      case 'es': return 'es-ES';
      case 'fr': return 'fr-FR';
      default: return 'en-US';
    }
  };

  const speak = useCallback((text: string) => {
    if (!ttsEnabled) {
      return;
    }

    if (!speechRef.current) {
      speechRef.current = window.speechSynthesis;
    }

    // Cancel any ongoing speech (browser)
    speechRef.current.cancel();

    // Cancel any ongoing audio (fallback)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    const langCode = getLangCode(i18n.language);
    const shortLang = langCode.split('-')[0];

    // specific voice selection
    const voices = speechRef.current.getVoices();
    // Prioritize valid voice for the language
    const voice = voices.find(v => v.lang === langCode) ||
      voices.find(v => v.lang.startsWith(shortLang));

    // Use native speech if voice exists OR if it's English (usually defaults well)
    if (voice || shortLang === 'en') {
      utteranceRef.current = new SpeechSynthesisUtterance(text);
      utteranceRef.current.lang = langCode;
      utteranceRef.current.rate = 0.9;
      utteranceRef.current.pitch = 1;

      if (voice) {
        utteranceRef.current.voice = voice;
      }

      speechRef.current.speak(utteranceRef.current);
    } else {
      // Fallback: Google TTS for missing languages (e.g. Telugu)
      console.warn(`No native voice for ${langCode}, using Google TTS fallback.`);
      try {
        // Truncate text to avoid API limits (approx 200 chars)
        const safeText = text.length > 200 ? text.substring(0, 200) + '...' : text;

        // Use 'gtx' client which is more reliable for direct access
        const audio = new Audio(`https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=${shortLang}&dt=t&q=${encodeURIComponent(safeText)}`);
        audioRef.current = audio;
        audio.play().catch(err => console.error("Audio fallback error:", err));
      } catch (e) {
        console.error("Failed to init audio fallback", e);
      }
    }
  }, [i18n.language, ttsEnabled]);

  const stop = useCallback(() => {
    if (speechRef.current) {
      speechRef.current.cancel();
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    if (!ttsEnabled) {
      stop();
    }
  }, [ttsEnabled, stop]);

  return { speak, stop };
};