import React, { useState, useEffect } from 'react';
import { RefreshCcw, Volume2, CheckCircle, Star } from 'lucide-react';

const WORD_CHALLENGES = [
    { word: 'CAT', hint: '🐱', clue: 'A furry pet that meows' },
    { word: 'DOG', hint: '🐶', clue: 'A loyal pet that barks' },
    { word: 'SUN', hint: '☀️', clue: 'It shines bright in the sky' },
    { word: 'FISH', hint: '🐟', clue: 'It swims in water' },
    { word: 'BIRD', hint: '🐦', clue: 'It has wings and can fly' },
    { word: 'FROG', hint: '🐸', clue: 'It jumps and lives near water' },
    { word: 'STAR', hint: '⭐', clue: 'It twinkles in the night sky' },
    { word: 'TREE', hint: '🌳', clue: 'It has leaves and a trunk' },
    { word: 'CAKE', hint: '🎂', clue: 'A sweet birthday treat' },
    { word: 'SHIP', hint: '🚢', clue: 'It sails on the ocean' },
];

function shuffleArray<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

function getDistractorLetters(word: string): string[] {
    const extras = 'BCDEFGHJKLMNPQRSTVWXYZ'.split('').filter(l => !word.includes(l));
    return shuffleArray(extras).slice(0, 4);
}

interface WordBuilderProps {
    onGameComplete?: (score: number) => void;
}

const WordBuilder: React.FC<WordBuilderProps> = ({ onGameComplete }) => {
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [letterPool, setLetterPool] = useState<{ letter: string; id: number }[]>([]);
    const [placed, setPlaced] = useState<(string | null)[]>([]);
    const [score, setScore] = useState(0);
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [completed, setCompleted] = useState(false);
    const [shake, setShake] = useState(false);
    const [stars, setStars] = useState<number[]>([]);

    const challenge = WORD_CHALLENGES[challengeIndex];

    useEffect(() => {
        initChallenge();
    }, [challengeIndex]);

    const initChallenge = () => {
        const word = WORD_CHALLENGES[challengeIndex].word;
        const distractors = getDistractorLetters(word);
        const allLetters = shuffleArray([...word.split(''), ...distractors]).map((letter, i) => ({
            letter,
            id: i,
        }));
        setLetterPool(allLetters);
        setPlaced(Array(word.length).fill(null));
        setFeedback('idle');
    };

    const speakWord = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text.toLowerCase());
            utterance.rate = 0.8;
            window.speechSynthesis.speak(utterance);
        }
    };

    const handleLetterClick = (id: number, letter: string) => {
        if (feedback !== 'idle') return;
        const emptyIndex = placed.indexOf(null);
        if (emptyIndex === -1) return;
        const newPlaced = [...placed];
        newPlaced[emptyIndex] = `${id}:${letter}`;
        setPlaced(newPlaced);
        setLetterPool(prev => prev.filter(l => l.id !== id));
    };

    const handleRemovePlaced = (index: number) => {
        if (feedback !== 'idle') return;
        const val = placed[index];
        if (!val) return;
        const [idStr, letter] = val.split(':');
        setLetterPool(prev => [...prev, { letter, id: parseInt(idStr) }]);
        const newPlaced = [...placed];
        newPlaced[index] = null;
        setPlaced(newPlaced);
    };

    const handleCheck = () => {
        const formed = placed.map(p => (p ? p.split(':')[1] : '')).join('');
        if (formed === challenge.word) {
            setFeedback('correct');
            const newScore = score + 1;
            setScore(newScore);
            setStars(prev => [...prev, challengeIndex]);
            speakWord(challenge.word);
            setTimeout(() => {
                if (challengeIndex + 1 >= WORD_CHALLENGES.length) {
                    setCompleted(true);
                    onGameComplete?.(newScore * 10);
                } else {
                    setChallengeIndex(i => i + 1);
                }
            }, 1500);
        } else {
            setFeedback('wrong');
            setShake(true);
            setTimeout(() => {
                setShake(false);
                setFeedback('idle');
            }, 1000);
        }
    };

    const resetGame = () => {
        setChallengeIndex(0);
        setScore(0);
        setCompleted(false);
        setStars([]);
        setFeedback('idle');
    };

    const allFilled = placed.every(p => p !== null);

    if (completed) {
        return (
            <div className="p-8 bg-white rounded-2xl shadow-lg text-center max-w-md mx-auto">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-bold text-yellow-500 mb-2">Amazing Job!</h2>
                <p className="text-gray-600 text-lg mb-2">You completed all words!</p>
                <p className="text-2xl font-bold text-blue-600 mb-6">
                    Score: {score} / {WORD_CHALLENGES.length}
                </p>
                <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {WORD_CHALLENGES.map((_, i) => (
                        <span key={i} className={stars.includes(i) ? 'text-yellow-400 text-2xl' : 'text-gray-300 text-2xl'}>
                            ⭐
                        </span>
                    ))}
                </div>
                <button
                    onClick={resetGame}
                    className="px-6 py-3 bg-blue-500 text-white rounded-full text-lg font-semibold hover:bg-blue-600 transition-all flex items-center gap-2 mx-auto"
                >
                    <RefreshCcw className="w-5 h-5" /> Play Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-2xl shadow-lg max-w-md mx-auto select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-blue-700">Word Builder</h3>
                <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="font-bold text-gray-700">{score}</span>
                    <button
                        onClick={resetGame}
                        className="ml-2 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                    >
                        <RefreshCcw className="w-4 h-4 text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="flex gap-1 mb-5">
                {WORD_CHALLENGES.map((_, i) => (
                    <div
                        key={i}
                        className={`h-2 flex-1 rounded-full transition-all ${i < challengeIndex
                                ? 'bg-green-400'
                                : i === challengeIndex
                                    ? 'bg-blue-400'
                                    : 'bg-gray-200'
                            }`}
                    />
                ))}
            </div>

            {/* Hint */}
            <div className="text-center mb-6">
                <div className="text-7xl mb-2">{challenge.hint}</div>
                <p className="text-gray-500 text-base italic">{challenge.clue}</p>
                <button
                    onClick={() => speakWord(challenge.clue)}
                    className="mt-2 inline-flex items-center gap-1 text-blue-500 text-sm hover:text-blue-700 transition"
                >
                    <Volume2 className="w-4 h-4" /> Hear the clue
                </button>
            </div>

            {/* Answer Slots */}
            <div className={`flex justify-center gap-3 mb-4 ${shake ? 'animate-bounce' : ''}`}>
                {placed.map((val, i) => {
                    const letter = val ? val.split(':')[1] : null;
                    return (
                        <button
                            key={i}
                            onClick={() => handleRemovePlaced(i)}
                            className={`w-14 h-14 rounded-xl border-2 text-2xl font-bold flex items-center justify-center transition-all
                ${feedback === 'correct'
                                    ? 'border-green-400 bg-green-50 text-green-600'
                                    : feedback === 'wrong'
                                        ? 'border-red-400 bg-red-50 text-red-500'
                                        : letter
                                            ? 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-red-50 hover:border-red-300 cursor-pointer'
                                            : 'border-dashed border-gray-300 bg-gray-50 cursor-default'
                                }`}
                            style={{ fontFamily: "'Comic Sans MS', 'Chalkboard SE', cursive" }}
                        >
                            {letter || ''}
                        </button>
                    );
                })}
            </div>

            {/* Feedback Messages */}
            <div className="h-8 flex items-center justify-center mb-4">
                {feedback === 'correct' && (
                    <div className="flex items-center gap-2 text-green-500 font-bold text-lg">
                        <CheckCircle className="w-5 h-5" /> Correct! Great job! 🎉
                    </div>
                )}
                {feedback === 'wrong' && (
                    <div className="text-red-400 font-bold text-lg">Try again! You can do it! 💪</div>
                )}
            </div>

            {/* Letter Pool */}
            <div className="flex flex-wrap justify-center gap-3 mb-6 min-h-[60px]">
                {letterPool.map(({ letter, id }) => (
                    <button
                        key={id}
                        onClick={() => handleLetterClick(id, letter)}
                        className="w-12 h-12 rounded-xl bg-yellow-100 border-2 border-yellow-300 text-xl font-bold text-yellow-800 hover:bg-yellow-200 hover:scale-110 active:scale-95 transition-all shadow-sm"
                        style={{ fontFamily: "'Comic Sans MS', 'Chalkboard SE', cursive" }}
                    >
                        {letter}
                    </button>
                ))}
            </div>

            {/* Check Button */}
            <button
                onClick={handleCheck}
                disabled={!allFilled || feedback !== 'idle'}
                className={`w-full py-3 rounded-full text-white font-bold text-lg transition-all
          ${allFilled && feedback === 'idle'
                        ? 'bg-blue-500 hover:bg-blue-600 active:scale-95 shadow-md'
                        : 'bg-gray-300 cursor-not-allowed'
                    }`}
            >
                Check My Answer ✅
            </button>

            {/* Word count */}
            <p className="text-center text-gray-400 text-sm mt-3">
                Word {challengeIndex + 1} of {WORD_CHALLENGES.length}
            </p>
        </div>
    );
};

export default WordBuilder;



