import React, { useState, useEffect } from 'react';
import { Puzzle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WordPuzzleProps {
  onGameComplete: (score: number) => void;
}

const words = [
  { word: 'LEARN', hint: 'To gain knowledge' },
  { word: 'READ', hint: 'To look at and comprehend text' },
  { word: 'WRITE', hint: 'To form letters and words' },
  { word: 'FOCUS', hint: 'To concentrate attention' },
  { word: 'CREATE', hint: 'To bring something into existence' },
  { word: 'IMAGINE', hint: 'To form a mental image or concept' },
  { word: 'GROW', hint: 'To increase in size or development' },
  { word: 'EXPLORE', hint: 'To search for new things or places' },
  { word: 'DISCOVER', hint: 'To find something new' },
  { word: 'INNOVATE', hint: 'To introduce new ideas or methods' },
];

const WordPuzzle: React.FC<WordPuzzleProps> = ({ onGameComplete }) => {
  const { t } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [scrambled, setScrambled] = useState<string>('');
  const [guess, setGuess] = useState<string>('');
  const [answers, setAnswers] = useState<any[]>([]); // Store answers
  const [wrongAnswers, setWrongAnswers] = useState<any[]>([]); // Store wrong answers
  const [startTime, setStartTime] = useState<number | null>(null); // Track start time
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0); // Track score
  const [isLoading, setIsLoading] = useState<boolean>(false); // Track if it's loading a new question
  const [hasSubmittedScore, setHasSubmittedScore] = useState<boolean>(false);

  useEffect(() => {
    if (gameOver && !hasSubmittedScore) {
      const normalizedScore = Math.round((score / 5) * 100);
      onGameComplete(normalizedScore);
      setHasSubmittedScore(true);
    }
  }, [gameOver, hasSubmittedScore, onGameComplete, score]);

  const scrambleWord = (word: string): string => {
    return word.split('').sort(() => Math.random() - 0.5).join('');
  };

  const generateQuestion = () => {
    const wordObj = words[Math.floor(Math.random() * words.length)];
    setCurrentQuestion({ type: 'word', word: wordObj.word, hint: wordObj.hint });
    setScrambled(scrambleWord(wordObj.word));
  };

  useEffect(() => {
    if (questionCount === 0) {
      setStartTime(Date.now());
      generateQuestion();
    }
  }, [questionCount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    const normalizedGuess = guess.trim();

    if (!normalizedGuess) return; // Skip if empty answer

    const isCorrect = normalizedGuess.toUpperCase() === currentQuestion.word.toUpperCase();

    // Collect answers and wrong answers
    setAnswers(prev => [...prev, { question: currentQuestion, answer: normalizedGuess, isCorrect }]);

    if (isCorrect) {
      setScore(prev => prev + 1); // Increment score for correct answers
    } else {
      setWrongAnswers(prev => [...prev, { question: currentQuestion, answer: normalizedGuess }]);
    }

    // Wait for a brief moment before moving to the next question
    setTimeout(() => {
      setQuestionCount(prev => prev + 1);
      setIsLoading(false);
      if (questionCount + 1 < 5) {
        generateQuestion(); // Continue to next question
      } else {
        setGameOver(true); // End game after 5 questions
      }
    }, 1000); // Wait 1 second before proceeding

    setGuess(''); // Clear the input after each submission
  };

  const analyzePerformance = () => {
    if (startTime === null) return '';

    const totalTime = Date.now() - startTime;
    const timePerQuestion = totalTime / 5;
    const speed = timePerQuestion < 30000 ? 'fast' : timePerQuestion < 60000 ? 'average' : 'slow';
    const speedLabel = t(`games.wordPuzzle.analysis.speed.${speed}`);

    const neurodivergenceAnalysis = score <= 2
      ? t('games.wordPuzzle.analysis.neurodivergent')
      : t('games.wordPuzzle.analysis.normal');

    const summary = t('games.wordPuzzle.analysis.summary', {
      totalTime: (totalTime / 1000).toFixed(1),
      avgTime: Math.round(timePerQuestion / 1000),
      score,
      speed: speedLabel,
    });

    return `${summary}\n\n${neurodivergenceAnalysis}`;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg max-w-md mx-auto">
      {!gameOver ? (
        <>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">{t('games.wordPuzzle.title')}</h3>
            <Puzzle className="w-8 h-8 text-blue-500" />
          </div>
          <div className="text-center mb-6">
            {currentQuestion && currentQuestion.type === 'word' ? (
              <>
                <p className="text-3xl font-bold mb-4">{scrambled}</p>
                <p className="text-gray-600">{t('games.wordPuzzle.hint', { hint: currentQuestion.hint })}</p>
              </>
            ) : null}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder={t('games.wordPuzzle.placeholder')}
            />
            <button
              type="submit"
              className="w-full p-3 rounded-lg bg-blue-500 text-white font-semibold"
              disabled={isLoading} // Disable the button while loading
            >
              {t('games.wordPuzzle.submit')}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center">
          <h3 className="text-2xl font-bold">{t('games.wordPuzzle.gameOver')}</h3>
          <p className="text-gray-600 mb-4">{t('games.wordPuzzle.completed')}</p>
          <p className="text-xl font-bold">{t('games.wordPuzzle.finalResults')}</p>
          <pre className="mt-4 text-gray-700">{analyzePerformance()}</pre>

          <h4 className="mt-6 font-bold">{t('games.wordPuzzle.wrongAnswers')}</h4>
          {wrongAnswers.length > 0 ? (
            <ul className="mt-4">
              {wrongAnswers.map((item, index) => (
                <li key={index}>
                  <p>{t('games.wordPuzzle.word', { word: item.question.word })}</p>
                  <p>{t('games.wordPuzzle.yourAnswer', { answer: item.answer })}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>{t('games.wordPuzzle.noWrongAnswers')}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WordPuzzle;
