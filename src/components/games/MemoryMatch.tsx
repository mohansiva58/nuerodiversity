import React, { useState, useEffect } from 'react';
import { Brain, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CARDS = [
  '🌟', '🎨', '🎭', '🎪', '🎯', '🎲',
  '🌟', '🎨', '🎭', '🎪', '🎯', '🎲'
];

interface MemoryMatchProps {
  onGameComplete: (score: number) => void;
}

const MemoryMatch: React.FC<MemoryMatchProps> = ({ onGameComplete }) => {
  const { t } = useTranslation();
  const [cards, setCards] = useState([...CARDS].sort(() => Math.random() - 0.5));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [revealing, setRevealing] = useState(true);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);

  useEffect(() => {
    console.log("MemoryMatch initialized");
    setTimeout(() => setRevealing(false), 2000);
    setStartTime(Date.now());
  }, []);

  useEffect(() => {
    if (matched.length === cards.length && !gameCompleted) {
      setEndTime(Date.now());
      setGameCompleted(true);
      const finalScore = calculateFinalScore();
      console.log(`Game completed! Final Score: ${finalScore}`);
      onGameComplete(finalScore);
    }
  }, [matched, cards, gameCompleted, onGameComplete]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      if (cards[first] === cards[second]) {
        setMatched((prevMatched) => [...prevMatched, first, second]);
        setScore((prevScore) => prevScore + 1);
      }
      setTimeout(() => setFlipped([]), 1000);
      setSelected(null);
    }
  }, [flipped, cards]);

  const handleClick = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index) || revealing) return;

    if (selected === null) {
      setSelected(index);
      setFlipped([index]);
    } else {
      setFlipped([selected, index]);
    }
  };

  const resetGame = () => {
    setCards([...CARDS].sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
    setSelected(null);
    setScore(0);
    setRevealing(true);
    setStartTime(Date.now());
    setGameCompleted(false);
    setEndTime(null);
    setTimeout(() => setRevealing(false), 2000);
  };

  const calculateTimeTaken = () => {
    if (startTime && endTime) {
      return (endTime - startTime) / 1000;
    }
    return 0;
  };

  const calculateFinalScore = () => {
    const timeTaken = calculateTimeTaken();
    const baseScore = score * 10;
    const timeBonus = Math.max(0, 60 - timeTaken);
    const finalScore = Math.round(baseScore + timeBonus);
    console.log(`Score Calculation: Matches=${score}, Base=${baseScore}, TimeTaken=${timeTaken}, Bonus=${timeBonus}, Final=${finalScore}`);
    return finalScore;
  };

  const analyzePerformance = () => {
    const timeTaken = calculateTimeTaken();
    const speed = timeTaken < 30 ? 'fast' : timeTaken < 60 ? 'average' : 'slow';
    const finalScore = calculateFinalScore();

    // The string formatting in translation file handles newlines
    let analysisMsg = t('games.memoryMatch.analysis.stats', {
      time: timeTaken.toFixed(2),
      speed: speed,
      matches: score,
      finalScore: finalScore
    });

    if (score === 6) {
      return analysisMsg + t('games.memoryMatch.analysis.great');
    } else if (score >= 4) {
      return analysisMsg + t('games.memoryMatch.analysis.good');
    } else {
      return analysisMsg + t('games.memoryMatch.analysis.practice');
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">{t('games.memoryMatch.title')}</h3>
        <div className="flex gap-3">
          <Brain className="w-8 h-8 text-blue-500" />
          <button onClick={resetGame} className="p-2 bg-gray-300 rounded-full">
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => (
          <button
            key={index}
            className={`h-24 text-3xl rounded-lg transition-all duration-300 ${flipped.includes(index) || matched.includes(index) || revealing
                ? 'bg-blue-100'
                : 'bg-gray-200'
              }`}
            onClick={() => handleClick(index)}
            disabled={revealing}
          >
            {(flipped.includes(index) || matched.includes(index) || revealing) ? card : '?'}
          </button>
        ))}
      </div>
      <div className="text-center">
        <p className="text-gray-600">{t('games.memoryMatch.score', { score })}</p>
        {gameCompleted && (
          <div className="mt-4">
            <p className="text-green-600 font-bold">{t('games.memoryMatch.won')}</p>
            <pre className="mt-4 text-gray-700 whitespace-pre-wrap">{analyzePerformance()}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryMatch;