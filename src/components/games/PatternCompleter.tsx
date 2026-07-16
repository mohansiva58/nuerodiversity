import React, { useState, useEffect } from 'react';
import { RefreshCcw, Star, CheckCircle } from 'lucide-react';

const PATTERNS = [
    { sequence: ['🔴', '🔵', '🔴', '🔵', '?'], answer: '🔴', options: ['🔴', '🔵', '🟡', '🟢'] },
    { sequence: ['⭐', '⭐', '🌙', '⭐', '⭐', '?'], answer: '🌙', options: ['⭐', '🌙', '☀️', '🌟'] },
    { sequence: ['🐶', '🐱', '🐶', '🐱', '?'], answer: '🐶', options: ['🐭', '🐶', '🐱', '🐸'] },
    { sequence: ['🔺', '🔺', '🔺', '🟦', '🔺', '🔺', '🔺', '?'], answer: '🟦', options: ['🔺', '🟦', '🟡', '🔴'] },
    { sequence: ['1️⃣', '2️⃣', '3️⃣', '1️⃣', '2️⃣', '?'], answer: '3️⃣', options: ['1️⃣', '2️⃣', '3️⃣', '4️⃣'] },
    { sequence: ['🍎', '🍊', '🍋', '🍎', '🍊', '?'], answer: '🍋', options: ['🍎', '🍊', '🍋', '🍇'] },
    { sequence: ['⬜', '⬛', '⬜', '⬛', '⬜', '?'], answer: '⬛', options: ['⬜', '⬛', '🟥', '🟦'] },
    { sequence: ['🌸', '🌿', '🌸', '🌸', '🌿', '🌸', '🌸', '?'], answer: '🌿', options: ['🌸', '🌿', '🌻', '🍀'] },
    { sequence: ['🚗', '🚗', '🚌', '🚗', '🚗', '?'], answer: '🚌', options: ['🚗', '🚌', '🚲', '✈️'] },
    { sequence: ['🟡', '🟡', '🟡', '🔴', '🟡', '🟡', '🟡', '?'], answer: '🔴', options: ['🟡', '🔴', '🔵', '🟢'] },
];

function shuffleArray<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

interface PatternCompleterProps {
    onGameComplete?: (score: number) => void;
}

const PatternCompleter: React.FC<PatternCompleterProps> = ({ onGameComplete }) => {
    const [challenges, setChallenges] = useState(shuffleArray([...PATTERNS]));
    const [index, setIndex] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [streak, setStreak] = useState(0);
    const [bestStreak, setBestStreak] = useState(0);

    const challenge = challenges[index];

    const handleSelect = (option: string) => {
        if (status !== 'playing') return;
        setSelected(option);
        if (option === challenge.answer) {
            setStatus('correct');
            const newScore = score + 10 + streak * 2; // Streak bonus!
            setScore(newScore);
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > bestStreak) setBestStreak(newStreak);
            setTimeout(() => {
                const next = index + 1;
                if (next >= challenges.length) {
                    setCompleted(true);
                    onGameComplete?.(newScore);
                } else {
                    setIndex(next);
                    setSelected(null);
                    setStatus('playing');
                }
            }, 1200);
        } else {
            setStatus('wrong');
            setStreak(0);
            setTimeout(() => {
                setSelected(null);
                setStatus('playing');
            }, 900);
        }
    };

    const resetGame = () => {
        setChallenges(shuffleArray([...PATTERNS]));
        setIndex(0);
        setScore(0);
        setSelected(null);
        setStatus('playing');
        setCompleted(false);
        setStreak(0);
    };

    if (completed) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-violet-50 rounded-2xl shadow-lg text-center max-w-lg mx-auto">
                <div className="text-6xl mb-4">🔷</div>
                <h2 className="text-3xl font-bold text-violet-700 mb-2">Pattern Master!</h2>
                <p className="text-lg text-gray-600 mb-2">All patterns completed!</p>
                <p className="text-2xl font-bold text-green-600 mb-1">Score: {score}</p>
                <p className="text-sm text-purple-600 mb-6">Best Streak: {bestStreak} 🔥</p>
                <button onClick={resetGame} className="px-6 py-3 bg-violet-500 text-white rounded-xl font-bold text-lg hover:bg-violet-600 transition">
                    Play Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-b from-violet-50 to-purple-50 rounded-2xl shadow-lg max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-2xl font-bold text-violet-700">Pattern Completer</h3>
                    <p className="text-sm text-gray-500">Pattern {index + 1} of {challenges.length}</p>
                </div>
                <div className="flex items-center gap-2">
                    {streak >= 2 && (
                        <div className="bg-orange-100 px-2 py-1 rounded-full text-xs font-bold text-orange-600">
                            🔥 {streak} streak!
                        </div>
                    )}
                    <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-yellow-700">{score}</span>
                    </div>
                    <button onClick={resetGame} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                        <RefreshCcw className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <p className="text-center text-gray-600 font-medium mb-5">What comes next in the pattern? 🔍</p>

            {/* Pattern display */}
            <div className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-violet-100">
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {challenge.sequence.map((item, i) => (
                        <div
                            key={i}
                            className={`flex items-center justify-center w-14 h-14 rounded-xl text-3xl
                ${item === '?'
                                    ? 'bg-violet-100 border-2 border-dashed border-violet-400 text-violet-400 font-bold'
                                    : 'bg-gray-50 border border-gray-200'
                                } shadow-sm`}
                        >
                            {item === '?' ? (
                                selected && status === 'correct' ? challenge.answer : '?'
                            ) : item}
                        </div>
                    ))}
                </div>
            </div>

            {/* Status */}
            <div className="text-center h-7 mb-4">
                {status === 'correct' && (
                    <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                        <CheckCircle className="w-5 h-5" /> {streak > 1 ? `${streak}x Streak! 🔥` : 'Correct! ✨'}
                    </div>
                )}
                {status === 'wrong' && <p className="text-red-500 font-semibold">❌ Look at the pattern again!</p>}
            </div>

            {/* Options */}
            <div className="grid grid-cols-4 gap-3 mb-4">
                {challenge.options.map(option => {
                    let btnStyle = 'bg-white border-gray-200 hover:border-violet-400 hover:bg-violet-50';
                    if (selected === option && status === 'correct') btnStyle = 'bg-green-100 border-green-500 scale-105';
                    else if (selected === option && status === 'wrong') btnStyle = 'bg-red-100 border-red-400';
                    else if (selected !== option && status === 'correct' && option === challenge.answer) btnStyle = 'bg-green-100 border-green-500';

                    return (
                        <button
                            key={option}
                            onClick={() => handleSelect(option)}
                            className={`flex items-center justify-center h-16 text-3xl rounded-xl border-2 transition-all duration-200 shadow-sm ${btnStyle}`}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>

            {/* Progress */}
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
                <div
                    className="h-2 bg-violet-500 rounded-full transition-all duration-500"
                    style={{ width: `${(index / challenges.length) * 100}%` }}
                />
            </div>
        </div>
    );
};

export default PatternCompleter;


