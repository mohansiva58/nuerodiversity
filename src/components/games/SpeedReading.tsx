import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SpeedReadingProps {
  onGameComplete: (score: number) => void;
}

const texts = [
  {
    title: "The Journey",
    content: "The sun rose slowly over the horizon, painting the sky in brilliant shades of orange and pink. Birds began their morning songs, creating a peaceful melody that echoed through the valley."
  },
  {
    title: "The Discovery",
    content: "Deep in the ancient forest, scientists discovered a new species of flower that glowed in the light. Its petals emitted a soft blue light that illuminated the surrounding area."
  }
];

const SpeedReading: React.FC<SpeedReadingProps> = ({ onGameComplete }) => {
  const { t } = useTranslation();
  const [currentText, setCurrentText] = useState(texts[0]);
  const [showingText, setShowingText] = useState(false);
  const [timer, setTimer] = useState(0);
  const [started, setStarted] = useState(false);
  const [wpm, setWpm] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const [finalAnalysis, setFinalAnalysis] = useState<string | null>(null);

  useEffect(() => {
    let interval: number;
    if (showingText && started) {
      interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 0.1);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [showingText, started]);

  const startReading = () => {
    setShowingText(true);
    setStarted(true);
    setTimer(0);
  };

  const finishReading = () => {
    setShowingText(false);
    const minutes = timer / 60;
    const words = currentText.content.split(' ').length;
    const calculatedWpm = Math.round(words / minutes);
    setWpm(calculatedWpm);

    const normalizedScore = Math.max(0, Math.min(100, Math.round((calculatedWpm / 300) * 100)));
    onGameComplete(normalizedScore);

    // Analyze the performance based on WPM and time
    analyzePerformance(calculatedWpm, minutes);

    // Optionally, move to the next text after finishing the current one.
    const nextTextIndex = (textIndex + 1) % texts.length;
    setTextIndex(nextTextIndex);
    setCurrentText(texts[nextTextIndex]);
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.round(timeInSeconds % 60);
    return `${minutes} min ${seconds} sec`;
  };

  const analyzePerformance = (calculatedWpm: number, minutes: number) => {
    let analysis = '';
    if (calculatedWpm > 250) {
      analysis = t('games.speedReading.analysis.fast');
    } else if (calculatedWpm >= 150) {
      analysis = t('games.speedReading.analysis.average');
    } else if (calculatedWpm >= 50) {
      analysis = t('games.speedReading.analysis.slow');
    } else {
      analysis = t('games.speedReading.analysis.verySlow');
    }

    setFinalAnalysis(`
      ${t('games.speedReading.reportTime', { time: formatTime(timer) })}
      ${t('games.speedReading.reportWpm', { wpm: calculatedWpm })}
      **Analysis**: ${analysis}
    `);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">{t('games.speedReading.title')}</h3>
        <Timer className="w-8 h-8 text-blue-500" />
      </div>
      <div className="mb-6">
        <h4 className="text-xl font-semibold mb-4">{currentText.title}</h4>
        {showingText ? (
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-lg leading-relaxed">{currentText.content}</p>
          </div>
        ) : (
          <div className="text-center">
            {wpm > 0 && (
              <div>
                <p className="text-lg">{t('games.speedReading.readingTime', { time: formatTime(timer) })}</p>
              </div>
            )}
            {!wpm && <p className="text-xl mb-4">{t('games.speedReading.clickToStart')}</p>}
          </div>
        )}
      </div>
      {showingText && (
        <div className="text-center mb-4">
          <p className="text-lg">{t('games.speedReading.time', { time: formatTime(timer) })}</p>
        </div>
      )}
      <button
        onClick={showingText ? finishReading : startReading}
        className="w-full p-3 rounded-lg bg-blue-500 text-white font-semibold"
      >
        {showingText ? t('games.speedReading.finishedReading') : t('games.speedReading.startReading')}
      </button>

      {finalAnalysis && (
        <div className="mt-6 bg-gray-100 p-6 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-600">{t('games.speedReading.reportTitle')}</h3>
          <div className="mt-4">
            <p className="text-lg font-medium">📊 {t('games.speedReading.reportTime', { time: formatTime(timer) })}</p>
            <p className="text-lg font-medium">📝 {t('games.speedReading.reportWpm', { wpm: wpm })}</p>
            <p className="mt-4 text-lg">{finalAnalysis.split('**Analysis**:')[1]}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeedReading;
