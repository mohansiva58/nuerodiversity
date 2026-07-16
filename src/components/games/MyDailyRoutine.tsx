import React, { useState, useEffect } from 'react';
import { RefreshCcw, Star, CheckCircle, Volume2 } from 'lucide-react';

interface RoutineActivity {
    id: number;
    label: string;
    emoji: string;
    time: string;
    correctOrder: number;
    description: string;
}

const ROUTINES: { title: string; emoji: string; activities: RoutineActivity[] }[] = [
    {
        title: 'Morning Routine',
        emoji: '🌅',
        activities: [
            { id: 1, label: 'Wake up', emoji: '⏰', time: '7:00 AM', correctOrder: 1, description: 'Open your eyes and stretch' },
            { id: 2, label: 'Use toilet', emoji: '🚽', time: '7:05 AM', correctOrder: 2, description: 'Go to the bathroom' },
            { id: 3, label: 'Wash face', emoji: '🚿', time: '7:10 AM', correctOrder: 3, description: 'Splash water on your face' },
            { id: 4, label: 'Brush teeth', emoji: '🪥', time: '7:15 AM', correctOrder: 4, description: 'Brush for 2 minutes' },
            { id: 5, label: 'Get dressed', emoji: '👕', time: '7:20 AM', correctOrder: 5, description: 'Put on clean clothes' },
            { id: 6, label: 'Eat breakfast', emoji: '🍳', time: '7:30 AM', correctOrder: 6, description: 'Have a healthy meal' },
        ],
    },
    {
        title: 'School Day',
        emoji: '📚',
        activities: [
            { id: 7, label: 'Pack school bag', emoji: '🎒', time: '8:00 AM', correctOrder: 1, description: 'Put books and lunch inside' },
            { id: 8, label: 'Travel to school', emoji: '🚌', time: '8:15 AM', correctOrder: 2, description: 'Take the bus or walk' },
            { id: 9, label: 'Attend classes', emoji: '📖', time: '9:00 AM', correctOrder: 3, description: 'Listen and learn' },
            { id: 10, label: 'Eat lunch', emoji: '🥪', time: '12:00 PM', correctOrder: 4, description: 'Take a break and eat' },
            { id: 11, label: 'More classes', emoji: '✏️', time: '1:00 PM', correctOrder: 5, description: 'Continue studying' },
            { id: 12, label: 'Go home', emoji: '🏠', time: '3:00 PM', correctOrder: 6, description: 'Head back home' },
        ],
    },
    {
        title: 'Bedtime Routine',
        emoji: '🌙',
        activities: [
            { id: 13, label: 'Finish homework', emoji: '📝', time: '5:00 PM', correctOrder: 1, description: 'Complete all tasks' },
            { id: 14, label: 'Have dinner', emoji: '🍽️', time: '6:30 PM', correctOrder: 2, description: 'Eat with family' },
            { id: 15, label: 'Take a bath', emoji: '🛁', time: '7:30 PM', correctOrder: 3, description: 'Clean up for bed' },
            { id: 16, label: 'Put on PJs', emoji: '🩳', time: '8:00 PM', correctOrder: 4, description: 'Wear comfortable clothes' },
            { id: 17, label: 'Read a book', emoji: '📚', time: '8:15 PM', correctOrder: 5, description: 'Relax before sleep' },
            { id: 18, label: 'Go to sleep', emoji: '😴', time: '8:30 PM', correctOrder: 6, description: 'Close your eyes and rest' },
        ],
    },
];

function shuffleArray<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

interface MyDailyRoutineProps {
    onGameComplete?: (score: number) => void;
}

const MyDailyRoutine: React.FC<MyDailyRoutineProps> = ({ onGameComplete }) => {
    const [routineIndex, setRoutineIndex] = useState(0);
    const [activities, setActivities] = useState<RoutineActivity[]>([]);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [showTimeHints, setShowTimeHints] = useState(false);

    const routine = ROUTINES[routineIndex];

    const initRoutine = (index: number) => {
        setActivities(shuffleArray([...ROUTINES[index].activities]));
        setStatus('playing');
        setSelectedId(null);
        setShowTimeHints(false);
    };

    useEffect(() => { initRoutine(0); }, []);

    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.8;
            window.speechSynthesis.speak(u);
        }
    };

    const handleTap = (activity: RoutineActivity) => {
        if (status !== 'playing') return;
        if (selectedId === null) {
            setSelectedId(activity.id);
            speak(activity.label + '. ' + activity.description);
        } else if (selectedId === activity.id) {
            setSelectedId(null);
        } else {
            setActivities(prev => {
                const arr = [...prev];
                const fromIdx = arr.findIndex(a => a.id === selectedId);
                const toIdx = arr.findIndex(a => a.id === activity.id);
                [arr[fromIdx], arr[toIdx]] = [arr[toIdx], arr[fromIdx]];
                return arr;
            });
            setSelectedId(null);
        }
    };

    const checkOrder = () => {
        const correct = activities.every((a, i) => a.correctOrder === i + 1);
        if (correct) {
            setStatus('correct');
            const newScore = score + 15;
            setScore(newScore);
            speak('Amazing! You know the perfect routine!');
            setTimeout(() => {
                const next = routineIndex + 1;
                if (next >= ROUTINES.length) {
                    setCompleted(true);
                    onGameComplete?.(newScore);
                } else {
                    setRoutineIndex(next);
                    initRoutine(next);
                }
            }, 2000);
        } else {
            setStatus('wrong');
            speak('Not quite. Look at the times for hints!');
            setTimeout(() => setStatus('playing'), 1000);
        }
    };

    const moveUp = (idx: number) => {
        if (idx === 0 || status !== 'playing') return;
        setActivities(prev => {
            const arr = [...prev];
            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
            return arr;
        });
    };

    const moveDown = (idx: number) => {
        if (idx === activities.length - 1 || status !== 'playing') return;
        setActivities(prev => {
            const arr = [...prev];
            [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
            return arr;
        });
    };

    const resetGame = () => {
        setRoutineIndex(0);
        setScore(0);
        setCompleted(false);
        initRoutine(0);
    };

    if (completed) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-teal-50 rounded-2xl shadow-lg text-center max-w-lg mx-auto">
                <div className="text-6xl mb-4">📅</div>
                <h2 className="text-3xl font-bold text-teal-700 mb-2">Routine Rockstar!</h2>
                <p className="text-lg text-gray-600 mb-4">You organized all daily routines!</p>
                <p className="text-2xl font-bold text-green-600 mb-6">Final Score: {score}</p>
                <button onClick={resetGame} className="px-6 py-3 bg-teal-400 text-white rounded-xl font-bold text-lg hover:bg-teal-500 transition">
                    Play Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-b from-teal-50 to-cyan-50 rounded-2xl shadow-lg max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-2xl font-bold text-teal-700">My Daily Routine</h3>
                    <p className="text-sm text-gray-500">Routine {routineIndex + 1} of {ROUTINES.length}</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-yellow-700">{score}</span>
                    </div>
                    <button onClick={resetGame} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                        <RefreshCcw className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Routine title */}
            <div className="text-center mb-4">
                <div className="text-5xl mb-1">{routine.emoji}</div>
                <h4 className="text-xl font-bold text-teal-800">{routine.title}</h4>
                <p className="text-gray-500 text-sm">Tap two cards to swap them, or use ↑↓ arrows</p>
                <div className="flex justify-center gap-2 mt-2">
                    <button
                        onClick={() => speak(`Arrange the ${routine.title} activities in the correct order`)}
                        className="p-1 bg-teal-100 rounded-full hover:bg-teal-200 transition"
                    >
                        <Volume2 className="w-4 h-4 text-teal-600" />
                    </button>
                    <button
                        onClick={() => setShowTimeHints(!showTimeHints)}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition font-medium"
                    >
                        {showTimeHints ? '⏰ Hide times' : '💡 Show times'}
                    </button>
                </div>
            </div>

            {/* Activities list */}
            <div className="space-y-2 mb-4">
                {activities.map((activity, idx) => (
                    <div
                        key={activity.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer
              ${selectedId === activity.id
                                ? 'border-teal-500 bg-teal-100 scale-105 shadow-md'
                                : status === 'correct'
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50'}`}
                        onClick={() => handleTap(activity)}
                    >
                        <span className="text-gray-400 font-bold text-sm w-4">{idx + 1}.</span>
                        <span className="text-3xl">{activity.emoji}</span>
                        <div className="flex-1">
                            <p className="font-semibold text-gray-700 text-sm">{activity.label}</p>
                            {showTimeHints && (
                                <p className="text-xs text-teal-600 font-medium">{activity.time}</p>
                            )}
                            <p className="text-xs text-gray-400">{activity.description}</p>
                        </div>
                        {status === 'correct' && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                        <div className="flex flex-col gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); moveUp(idx); }}
                                className="w-6 h-6 bg-gray-100 rounded hover:bg-gray-200 text-gray-500 text-xs flex items-center justify-center"
                                disabled={idx === 0}
                            >▲</button>
                            <button
                                onClick={(e) => { e.stopPropagation(); moveDown(idx); }}
                                className="w-6 h-6 bg-gray-100 rounded hover:bg-gray-200 text-gray-500 text-xs flex items-center justify-center"
                                disabled={idx === activities.length - 1}
                            >▼</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Status */}
            <div className="text-center h-7 mb-3">
                {status === 'correct' && <p className="text-green-600 font-bold">✅ Perfect routine!</p>}
                {status === 'wrong' && <p className="text-red-500 font-semibold">❌ Not quite — try the time hints! 💡</p>}
            </div>

            {/* Check button */}
            <button
                onClick={checkOrder}
                disabled={status !== 'playing'}
                className="w-full py-3 bg-teal-500 text-white font-bold text-lg rounded-xl hover:bg-teal-600 disabled:opacity-40 transition shadow"
            >
                ✅ Check My Routine
            </button>

            {/* Progress */}
            <div className="mt-4 h-2 bg-gray-200 rounded-full">
                <div
                    className="h-2 bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${(routineIndex / ROUTINES.length) * 100}%` }}
                />
            </div>
        </div>
    );
};

export default MyDailyRoutine;
