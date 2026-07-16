import React, { useState, useEffect, useRef } from 'react';
import { RefreshCcw, Star } from 'lucide-react';

const TOTAL_ROUNDS = 15;
const MIN_DELAY = 800;
const MAX_DELAY = 3000;

interface StopGoProps {
    onGameComplete?: (score: number) => void;
}

type Signal = 'go' | 'stop' | 'wait';

const StopGo: React.FC<StopGoProps> = ({ onGameComplete }) => {
    const [phase, setPhase] = useState<'intro' | 'playing' | 'done'>('intro');
    const [signal, setSignal] = useState<Signal>('wait');
    const [score, setScore] = useState(0);
    const [round, setRound] = useState(0);
    const [feedback, setFeedback] = useState<string>('');
    const [feedbackColor, setFeedbackColor] = useState('');
    const [reactionTimes, setReactionTimes] = useState<number[]>([]);
    const [errors, setErrors] = useState(0);
    const signalTime = useRef<number>(0);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isWaiting = useRef(false);

    const showFeedback = (msg: string, color: string) => {
        setFeedback(msg);
        setFeedbackColor(color);
        setTimeout(() => setFeedback(''), 800);
    };

    const nextRound = (currentRound: number, currentScore: number) => {
        if (currentRound >= TOTAL_ROUNDS) {
            setPhase('done');
            onGameComplete?.(currentScore);
            return;
        }

        setSignal('wait');
        isWaiting.current = true;

        const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
        const isGo = Math.random() > 0.35; // 65% GO, 35% STOP

        timeoutRef.current = setTimeout(() => {
            isWaiting.current = false;
            signalTime.current = Date.now();
            setSignal(isGo ? 'go' : 'stop');
            setRound(currentRound + 1);

            // Auto-advance if no tap on STOP
            if (!isGo) {
                timeoutRef.current = setTimeout(() => {
                    showFeedback('✅ Good restraint!', 'text-green-600');
                    setScore(s => {
                        const ns = s + 5;
                        nextRound(currentRound + 1, ns);
                        return ns;
                    });
                }, 2000);
            }
        }, delay);
    };

    const handleTap = () => {
        if (phase !== 'playing') return;

        if (signal === 'wait') {
            // Tapped too early
            showFeedback('⏳ Too early! Wait for the signal', 'text-orange-500');
            setErrors(e => e + 1);
            return;
        }

        if (signal === 'stop') {
            clearTimeout(timeoutRef.current!);
            showFeedback('🛑 Stop means STOP!', 'text-red-600');
            setErrors(e => e + 1);
            nextRound(round, score);
            return;
        }

        if (signal === 'go') {
            clearTimeout(timeoutRef.current!);
            const rt = Date.now() - signalTime.current;
            setReactionTimes(prev => [...prev, rt]);
            const pts = rt < 500 ? 15 : rt < 1000 ? 10 : 5;
            setScore(s => {
                const ns = s + pts;
                showFeedback(`⚡ ${rt}ms — +${pts}pts!`, 'text-green-600');
                nextRound(round, ns);
                return ns;
            });
        }
    };

    const startGame = () => {
        setScore(0);
        setRound(0);
        setErrors(0);
        setReactionTimes([]);
        setSignal('wait');
        setPhase('playing');
        nextRound(0, 0);
    };

    useEffect(() => {
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, []);

    const avgRT = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;

    const bgColor =
        signal === 'go' ? 'bg-green-400' :
            signal === 'stop' ? 'bg-red-500' :
                'bg-gray-300';

    const signalText =
        signal === 'go' ? '🟢 GO!' :
            signal === 'stop' ? '🔴 STOP!' :
                '⚪ Wait...';

    if (phase === 'intro') {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-green-50 to-red-50 rounded-2xl shadow-lg text-center max-w-lg mx-auto">
                <div className="text-6xl mb-4">🚦</div>
                <h3 className="text-3xl font-bold text-gray-700 mb-3">Stop & Go</h3>
                <p className="text-gray-600 mb-6 text-lg">Tap when you see <span className="text-green-600 font-bold">GREEN</span>, but <span className="text-red-600 font-bold">freeze</span> on RED! Trains impulse control.</p>
                <div className="flex gap-6 mb-6">
                    <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow">
                        <div className="text-5xl mb-1">🟢</div>
                        <p className="text-sm font-semibold text-green-700">TAP fast!</p>
                    </div>
                    <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow">
                        <div className="text-5xl mb-1">🔴</div>
                        <p className="text-sm font-semibold text-red-700">DON'T tap!</p>
                    </div>
                </div>
                <button onClick={startGame} className="px-8 py-4 bg-green-500 text-white font-bold text-xl rounded-2xl hover:bg-green-600 transition shadow-lg">
                    Start! 🚀
                </button>
            </div>
        );
    }

    if (phase === 'done') {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-2xl shadow-lg text-center max-w-lg mx-auto">
                <div className="text-6xl mb-4">🏁</div>
                <h2 className="text-3xl font-bold text-gray-700 mb-4">Finished!</h2>
                <div className="grid grid-cols-3 gap-4 mb-6 w-full">
                    <div className="bg-white p-3 rounded-xl shadow">
                        <p className="text-xs text-gray-400">Score</p>
                        <p className="text-2xl font-bold text-indigo-600">{score}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow">
                        <p className="text-xs text-gray-400">Avg Reaction</p>
                        <p className="text-2xl font-bold text-green-600">{avgRT}ms</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl shadow">
                        <p className="text-xs text-gray-400">Errors</p>
                        <p className="text-2xl font-bold text-red-500">{errors}</p>
                    </div>
                </div>
                <p className="text-gray-500 mb-6">
                    {errors === 0 ? '🌟 Perfect impulse control!' : errors <= 3 ? '👍 Great self-control!' : '💪 Keep practicing!'}
                </p>
                <button onClick={() => setPhase('intro')} className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold text-lg hover:bg-green-600 transition">
                    Play Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-b from-green-50 to-red-50 rounded-2xl shadow-lg max-w-lg mx-auto select-none">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-700">Stop & Go</h3>
                    <p className="text-xs text-gray-400">Round {round}/{TOTAL_ROUNDS}</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold text-yellow-700">{score}</span>
                </div>
            </div>

            {/* Progress */}
            <div className="h-2 bg-gray-200 rounded-full mb-6">
                <div className="h-2 bg-indigo-400 rounded-full transition-all duration-300" style={{ width: `${(round / TOTAL_ROUNDS) * 100}%` }} />
            </div>

            {/* Signal */}
            <button
                onClick={handleTap}
                className={`w-full h-56 rounded-3xl flex flex-col items-center justify-center text-white font-bold text-4xl transition-all duration-200 shadow-xl active:scale-95 ${bgColor}`}
            >
                <div className="text-7xl mb-3">{signal === 'go' ? '🟢' : signal === 'stop' ? '🔴' : '⚪'}</div>
                <div>{signalText}</div>
                {signal === 'wait' && <p className="text-base font-normal text-gray-500 mt-2">Get ready...</p>}
            </button>

            {/* Feedback */}
            <div className={`text-center mt-4 h-7 font-bold text-lg ${feedbackColor}`}>
                {feedback}
            </div>

            {/* Stats */}
            <div className="flex justify-between text-sm text-gray-500 mt-2">
                <span>✅ Hits: {reactionTimes.length}</span>
                <span>❌ Errors: {errors}</span>
                {avgRT > 0 && <span>⚡ Avg: {avgRT}ms</span>}
            </div>
        </div>
    );
};

export default StopGo;