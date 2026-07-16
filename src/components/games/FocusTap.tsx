import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCcw, Star, Target } from 'lucide-react';

const SHAPES = ['⭐', '🔵', '🔺', '🟩', '🟡'];
const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const TOTAL_ROUNDS = 15;

interface FocusTapProps {
    onGameComplete?: (score: number) => void;
}

interface FallingItem {
    id: number;
    emoji: string;
    isTarget: boolean;
    x: number;
    speed: number;
}

const FocusTap: React.FC<FocusTapProps> = ({ onGameComplete }) => {
    const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
    const [targetEmoji, setTargetEmoji] = useState('⭐');
    const [items, setItems] = useState<FallingItem[]>([]);
    const [score, setScore] = useState(0);
    const [misses, setMisses] = useState(0);
    const [round, setRound] = useState(0);
    const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const idRef = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const chooseTarget = () => SHAPES[Math.floor(Math.random() * SHAPES.length)];

    const startGame = () => {
        const target = chooseTarget();
        setTargetEmoji(target);
        setScore(0);
        setMisses(0);
        setRound(0);
        setItems([]);
        setTimeLeft(30);
        setPhase('playing');
    };

    const showFeedback = (text: string, color: string) => {
        setFeedback({ text, color });
        setTimeout(() => setFeedback(null), 600);
    };

    const spawnItem = useCallback((target: string) => {
        const isTarget = Math.random() < 0.4;
        const emoji = isTarget
            ? target
            : SHAPES.filter(s => s !== target)[Math.floor(Math.random() * (SHAPES.length - 1))];
        const newItem: FallingItem = {
            id: idRef.current++,
            emoji,
            isTarget,
            x: Math.random() * 80 + 5,
            speed: 2 + Math.random() * 2,
        };
        setItems(prev => [...prev, newItem]);
        // Auto remove after fall
        setTimeout(() => {
            setItems(prev => prev.filter(i => i.id !== newItem.id));
        }, 3000);
    }, []);

    useEffect(() => {
        if (phase !== 'playing') return;

        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) {
                    clearInterval(timerRef.current!);
                    clearInterval(spawnRef.current!);
                    setPhase('done');
                    onGameComplete?.(score);
                    return 0;
                }
                return t - 1;
            });
        }, 1000);

        spawnRef.current = setInterval(() => {
            spawnItem(targetEmoji);
        }, 900);

        return () => {
            clearInterval(timerRef.current!);
            clearInterval(spawnRef.current!);
        };
    }, [phase, targetEmoji, spawnItem]);

    const handleTap = (item: FallingItem) => {
        setItems(prev => prev.filter(i => i.id !== item.id));
        if (item.isTarget) {
            setScore(s => s + 10);
            setRound(r => r + 1);
            showFeedback('✅ Great!', 'text-green-600');
        } else {
            setMisses(m => m + 1);
            showFeedback('❌ Wrong!', 'text-red-500');
        }
    };

    if (phase === 'intro') {
        const target = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-indigo-50 rounded-2xl shadow-lg text-center max-w-lg mx-auto">
                <Target className="w-12 h-12 text-indigo-500 mb-3" />
                <h3 className="text-3xl font-bold text-indigo-700 mb-2">Focus Tap</h3>
                <p className="text-gray-600 mb-6 text-lg">Tap only the <strong>target shape</strong> — ignore the rest! Trains your focus & impulse control.</p>
                <div className="bg-white p-4 rounded-2xl shadow mb-6">
                    <p className="text-gray-500 mb-2 text-sm">Your target will look like this:</p>
                    <div className="text-7xl">{targetEmoji}</div>
                </div>
                <p className="text-gray-400 text-sm mb-4">You have 30 seconds. Tap fast! ⚡</p>
                <button onClick={startGame} className="px-8 py-4 bg-indigo-500 text-white font-bold text-xl rounded-2xl hover:bg-indigo-600 transition shadow-lg">
                    Start! 🚀
                </button>
            </div>
        );
    }

    if (phase === 'done') {
        const accuracy = round + misses > 0 ? Math.round((round / (round + misses)) * 100) : 0;
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-indigo-50 rounded-2xl shadow-lg text-center max-w-lg mx-auto">
                <div className="text-6xl mb-4">🎯</div>
                <h2 className="text-3xl font-bold text-indigo-700 mb-3">Time's Up!</h2>
                <div className="grid grid-cols-3 gap-4 mb-6 w-full">
                    <div className="bg-white p-3 rounded-xl shadow">
                        <p className="text-xs text-gray-400">Score</p>
                        <p className="text-2xl font-bold text-indigo-600">{score}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow">
                        <p className="text-xs text-gray-400">Accuracy</p>
                        <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow">
                        <p className="text-xs text-gray-400">Misses</p>
                        <p className="text-2xl font-bold text-red-500">{misses}</p>
                    </div>
                </div>
                <p className="text-gray-500 mb-4">
                    {accuracy >= 80 ? '🌟 Excellent focus!' : accuracy >= 60 ? '👍 Good effort!' : '💪 Keep practicing!'}
                </p>
                <button onClick={() => setPhase('intro')} className="px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold text-lg hover:bg-indigo-600 transition">
                    Play Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 bg-gradient-to-b from-blue-50 to-indigo-50 rounded-2xl shadow-lg max-w-lg mx-auto select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-xl font-bold text-indigo-700">Focus Tap</h3>
                    <p className="text-xs text-gray-400">Tap only the target!</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-full">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-yellow-700 text-sm">{score}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full font-bold text-sm ${timeLeft <= 10 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                        ⏱ {timeLeft}s
                    </div>
                </div>
            </div>

            {/* Target reminder */}
            <div className="flex items-center justify-center gap-3 bg-white rounded-xl p-3 mb-3 shadow-sm">
                <p className="text-gray-500 text-sm font-medium">Tap this →</p>
                <div className="text-4xl">{targetEmoji}</div>
                <p className="text-gray-400 text-xs">Ignore others!</p>
            </div>

            {/* Feedback */}
            {feedback && (
                <div className={`text-center text-lg font-bold mb-1 ${feedback.color}`}>
                    {feedback.text}
                </div>
            )}

            {/* Game area */}
            <div className="relative h-72 bg-white rounded-2xl overflow-hidden border border-indigo-100 shadow-inner">
                {items.map(item => (
                    <button
                        key={item.id}
                        onClick={() => handleTap(item)}
                        className="absolute text-4xl transition-none hover:scale-110 active:scale-95"
                        style={{
                            left: `${item.x}%`,
                            animation: `fall ${item.speed}s linear forwards`,
                        }}
                    >
                        {item.emoji}
                    </button>
                ))}
                {items.length === 0 && (
                    <div className="flex items-center justify-center h-full text-gray-300 text-sm">
                        Get ready...
                    </div>
                )}
            </div>

            {/* Stats bar */}
            <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                <span>✅ Hits: {round}</span>
                <span>❌ Misses: {misses}</span>
            </div>

            <style>{`
        @keyframes fall {
          from { top: -60px; }
          to { top: 110%; }
        }
      `}</style>
        </div>
    );
};

export default FocusTap;