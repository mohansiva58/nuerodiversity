import React, { useState, useEffect } from 'react';
import { RefreshCcw, Volume2, Star } from 'lucide-react';

const EMOTIONS = [
    { face: '😊', label: 'Happy', description: 'Smiling, feeling good', color: 'bg-yellow-100 border-yellow-400' },
    { face: '😢', label: 'Sad', description: 'Crying, feeling down', color: 'bg-blue-100 border-blue-400' },
    { face: '😠', label: 'Angry', description: 'Frowning, feeling upset', color: 'bg-red-100 border-red-400' },
    { face: '😨', label: 'Scared', description: 'Eyes wide, feeling afraid', color: 'bg-purple-100 border-purple-400' },
    { face: '😴', label: 'Tired', description: 'Eyes closed, feeling sleepy', color: 'bg-gray-100 border-gray-400' },
    { face: '🤩', label: 'Excited', description: 'Stars in eyes, feeling thrilled', color: 'bg-pink-100 border-pink-400' },
    { face: '😕', label: 'Confused', description: 'Frowning sideways, unsure', color: 'bg-orange-100 border-orange-400' },
    { face: '🥰', label: 'Loved', description: 'Hearts, feeling cared for', color: 'bg-rose-100 border-rose-400' },
];

function shuffleArray<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

interface Challenge {
    face: string;
    correctLabel: string;
    description: string;
    options: string[];
}

interface EmotionMatchProps {
    onGameComplete?: (score: number) => void;
}

const EmotionMatch: React.FC<EmotionMatchProps> = ({ onGameComplete }) => {
    const [challengeIndex, setChallengeIndex] = useState(0);
    const [challenges, setChallenges] = useState<Challenge[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [score, setScore] = useState(0);
    const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');
    const [completed, setCompleted] = useState(false);
    const [showHint, setShowHint] = useState(false);

    const buildChallenges = () => {
        const shuffled = shuffleArray(EMOTIONS).slice(0, 8);
        return shuffled.map(e => {
            const wrongOptions = EMOTIONS
                .filter(x => x.label !== e.label)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(x => x.label);
            return {
                face: e.face,
                correctLabel: e.label,
                description: e.description,
                options: shuffleArray([e.label, ...wrongOptions]),
            };
        });
    };

    useEffect(() => {
        const c = buildChallenges();
        setChallenges(c);
    }, []);

    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.8;
            window.speechSynthesis.speak(u);
        }
    };

    const handleSelect = (option: string) => {
        if (status !== 'playing') return;
        setSelected(option);
        const challenge = challenges[challengeIndex];
        if (option === challenge.correctLabel) {
            setStatus('correct');
            const newScore = score + 10;
            setScore(newScore);
            speak(`That's right! This is ${challenge.correctLabel}. ${challenge.description}`);
            setTimeout(() => {
                const next = challengeIndex + 1;
                if (next >= challenges.length) {
                    setCompleted(true);
                    onGameComplete?.(newScore);
                } else {
                    setChallengeIndex(next);
                    setSelected(null);
                    setStatus('playing');
                    setShowHint(false);
                }
            }, 1800);
        } else {
            setStatus('wrong');
            speak('Not quite. Try again!');
            setTimeout(() => {
                setSelected(null);
                setStatus('playing');
            }, 1000);
        }
    };

    const resetGame = () => {
        const c = buildChallenges();
        setChallenges(c);
        setChallengeIndex(0);
        setScore(0);
        setSelected(null);
        setStatus('playing');
        setCompleted(false);
        setShowHint(false);
    };

    if (completed) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-pink-50 rounded-2xl shadow-lg text-center max-w-lg mx-auto">
                <div className="text-6xl mb-4">🥰</div>
                <h2 className="text-3xl font-bold text-pink-700 mb-2">Emotion Expert!</h2>
                <p className="text-lg text-gray-600 mb-4">You recognized all the feelings!</p>
                <p className="text-2xl font-bold text-green-600 mb-6">Final Score: {score}</p>
                <button onClick={resetGame} className="px-6 py-3 bg-pink-400 text-white rounded-xl font-bold text-lg hover:bg-pink-500 transition">
                    Play Again
                </button>
            </div>
        );
    }

    if (challenges.length === 0) return null;

    const challenge = challenges[challengeIndex];
    const correctEmotion = EMOTIONS.find(e => e.label === challenge.correctLabel);

    return (
        <div className="p-6 bg-gradient-to-b from-pink-50 to-rose-50 rounded-2xl shadow-lg max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-2xl font-bold text-rose-700">Emotion Match</h3>
                    <p className="text-sm text-gray-500">Question {challengeIndex + 1} of {challenges.length}</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-yellow-700">{score}</span>
                    </div>
                    <button onClick={resetGame} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                        <RefreshCcw className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Face display */}
            <div className="text-center mb-6">
                <div
                    className={`inline-block text-9xl mb-2 cursor-pointer hover:scale-110 transition`}
                    onClick={() => speak(`How does this face look? What emotion is this?`)}
                >
                    {challenge.face}
                </div>
                <div className="flex justify-center">
                    <button
                        onClick={() => speak(`How does this face look? What emotion is this?`)}
                        className="p-2 bg-rose-100 rounded-full hover:bg-rose-200 transition"
                    >
                        <Volume2 className="w-4 h-4 text-rose-600" />
                    </button>
                </div>
                <p className="text-gray-600 font-medium mt-2">How does this face feel?</p>
            </div>

            {/* Hint */}
            {showHint && correctEmotion && (
                <div className={`mb-4 p-3 rounded-xl border-2 text-center ${correctEmotion.color}`}>
                    <p className="text-sm text-gray-600">💡 Hint: {challenge.description}</p>
                </div>
            )}

            {/* Options */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {challenge.options.map(option => {
                    const emoji = EMOTIONS.find(e => e.label === option)?.face;
                    const isSelected = selected === option;
                    const isCorrect = option === challenge.correctLabel;

                    let btnStyle = 'bg-white border-gray-200 hover:border-rose-400 hover:bg-rose-50 text-gray-700';
                    if (isSelected && status === 'correct') btnStyle = 'bg-green-100 border-green-500 text-green-800';
                    else if (isSelected && status === 'wrong') btnStyle = 'bg-red-100 border-red-400 text-red-700';
                    else if (!isSelected && status === 'correct' && isCorrect) btnStyle = 'bg-green-100 border-green-500 text-green-800';

                    return (
                        <button
                            key={option}
                            onClick={() => handleSelect(option)}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 font-semibold text-left transition-all duration-200 shadow-sm ${btnStyle}`}
                        >
                            <span className="text-2xl">{emoji}</span>
                            <span className="text-base">{option}</span>
                        </button>
                    );
                })}
            </div>

            {/* Status */}
            <div className="text-center h-7 mb-3">
                {status === 'correct' && <p className="text-green-600 font-bold">✅ That's right! Great job!</p>}
                {status === 'wrong' && <p className="text-red-500 font-semibold">❌ Try again! Look carefully 👀</p>}
            </div>

            {/* Hint button */}
            {!showHint && status === 'playing' && (
                <button
                    onClick={() => { setShowHint(true); speak(challenge.description); }}
                    className="w-full py-2 bg-blue-100 text-blue-700 font-semibold rounded-xl hover:bg-blue-200 transition text-sm"
                >
                    💡 Give me a hint
                </button>
            )}

            {/* Progress */}
            <div className="mt-4 h-2 bg-gray-200 rounded-full">
                <div
                    className="h-2 bg-rose-400 rounded-full transition-all duration-500"
                    style={{ width: `${(challengeIndex / challenges.length) * 100}%` }}
                />
            </div>
        </div>
    );
};

export default EmotionMatch;