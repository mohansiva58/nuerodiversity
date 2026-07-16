import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface FocusTrainerProps {
  onGameComplete: (score: number) => void;
}

const FocusTrainer: React.FC<FocusTrainerProps> = ({ onGameComplete }) => {
  const { t } = useTranslation();
  const [number, setNumber] = useState(Math.floor(Math.random() * 100));
  const [userInput, setUserInput] = useState('');
  const [message, setMessage] = useState('');
  const [timer, setTimer] = useState(5);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    if (parseInt(userInput) === number) {
      setMessage(t('games.focusTrainer.correct'));
      setScore((prev) => prev + 1);
    } else {
      setMessage(t('games.focusTrainer.incorrect'));
    }
    setUserInput('');
    setNumber(Math.floor(Math.random() * 100));
    setTimer(5);
  };

  const submitScore = () => {
    const normalizedScore = Math.max(0, Math.min(100, score * 10));
    onGameComplete(normalizedScore);
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-bold mb-4">{t('games.focusTrainer.title')}</h2>
      <p>{t('games.focusTrainer.memorize')} <strong className="text-blue-600">{number}</strong></p>
      <p className="text-gray-600">{t('games.focusTrainer.timer', { seconds: timer })}</p>
      <p className="mt-2 font-semibold">{t('games.common.scoreLabel', { score })}</p>
      {timer === 0 && (
        <>
          <input
            type="number"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="border p-2 rounded w-full mt-4"
            placeholder={t('games.focusTrainer.inputPlaceholder')}
          />
          <button onClick={handleSubmit} className="mt-2 p-2 bg-blue-500 text-white rounded">{t('games.focusTrainer.submit')}</button>
          <p className="mt-2">{message}</p>
        </>
      )}
      <div className="mt-4 flex gap-3">
        <button onClick={submitScore} className="flex-1 rounded bg-emerald-600 p-2 text-white font-semibold hover:bg-emerald-700 transition-colors">
          {t('games.common.submitScore')}
        </button>
        <button onClick={() => setScore(0)} className="flex-1 rounded bg-gray-200 p-2 font-semibold hover:bg-gray-300 transition-colors">
          {t('games.common.resetScore')}
        </button>
      </div>
    </div>
  );
};

export default FocusTrainer;
