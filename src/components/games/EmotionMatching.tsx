import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface EmotionMatchingProps {
  onGameComplete: (score: number) => void;
}

const EmotionMatching: React.FC<EmotionMatchingProps> = ({ onGameComplete }) => {
  const { t } = useTranslation();

  const emotions = [
    { emoji: '😊', label: t('games.emotionMatching.emotions.Happy') },
    { emoji: '😢', label: t('games.emotionMatching.emotions.Sad') },
    { emoji: '😡', label: t('games.emotionMatching.emotions.Angry') },
    { emoji: '😨', label: t('games.emotionMatching.emotions.Scared') }
  ];

  const [targetEmotion, setTargetEmotion] = useState<{ emoji: string; label: string } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [score, setScore] = useState(0);

  const submitScore = () => {
    const normalizedScore = Math.max(0, Math.min(100, score * 10));
    onGameComplete(normalizedScore);
  };

  // Generate a random emotion at the start
  useEffect(() => {
    generateRandomEmotion();
  }, [t]);

  const generateRandomEmotion = () => {
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    setTargetEmotion(randomEmotion);
    setSelected(null);
    setMessage('');
  };

  const handleSelect = (label: string) => {
    if (targetEmotion && label === targetEmotion.label) {
      setMessage(t('games.emotionMatching.correct'));
      setScore(score + 1);
    } else {
      setMessage(t('games.emotionMatching.incorrect'));
    }
    setSelected(label);
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-lg w-96 text-center">
      <h2 className="text-xl font-bold mb-4">{t('games.emotionMatching.title')}</h2>
      {targetEmotion && (
        <>
          <p className="text-lg font-medium mb-2">{t('games.emotionMatching.question')}</p>
          <p className="text-5xl">{targetEmotion.emoji}</p>

          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {emotions.map(({ emoji, label }) => (
              <button
                key={label}
                onClick={() => handleSelect(label)}
                className={`p-3 px-4 text-lg font-medium rounded-lg transition-all ${selected === label
                    ? label === targetEmotion.label
                      ? 'bg-green-400 text-white'
                      : 'bg-red-400 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                  }`}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          <p className="mt-4 font-bold text-lg">{message}</p>
          <p className="mt-2 text-gray-600">{t('games.emotionMatching.score', { score })}</p>

          <button
            onClick={generateRandomEmotion}
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-all"
          >
            {t('games.emotionMatching.newEmotion')}
          </button>

          <div className="mt-3 flex gap-3">
            <button
              onClick={submitScore}
              className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-700 transition-colors"
            >
              {t('games.common.submitScore')}
            </button>
            <button
              onClick={() => setScore(0)}
              className="flex-1 rounded-lg bg-gray-200 px-4 py-2 font-semibold hover:bg-gray-300 transition-colors"
            >
              {t('games.common.resetScore')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EmotionMatching;
