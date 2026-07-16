import React, { useState, useEffect } from 'react';
import { RefreshCcw, Star, CheckCircle } from 'lucide-react';

interface Task {
    id: number;
    label: string;
    emoji: string;
    correctOrder: number;
}

const TASK_SETS: Task[][] = [
    [
        { id: 1, label: 'Wake up', emoji: '⏰', correctOrder: 1 },
        { id: 2, label: 'Brush teeth', emoji: '🪥', correctOrder: 2 },
        { id: 3, label: 'Have breakfast', emoji: '🍳', correctOrder: 3 },
        { id: 4, label: 'Go to school', emoji: '🏫', correctOrder: 4 },
    ],
    [
        { id: 5, label: 'Plant seed', emoji: '🌱', correctOrder: 1 },
        { id: 6, label: 'Water plant', emoji: '💧', correctOrder: 2 },
        { id: 7, label: 'Wait for growth', emoji: '🌿', correctOrder: 3 },
        { id: 8, label: 'Pick flower', emoji: '🌸', correctOrder: 4 },
    ],
    [
        { id: 9, label: 'Get ingredients', emoji: '🛒', correctOrder: 1 },
        { id: 10, label: 'Mix the batter', emoji: '🥣', correctOrder: 2 },
        { id: 11, label: 'Bake the cake', emoji: '🔥', correctOrder: 3 },
        { id: 12, label: 'Eat the cake', emoji: '🎂', correctOrder: 4 },
    ],
    [
        { id: 13, label: 'Open book', emoji: '📖', correctOrder: 1 },
        { id: 14, label: 'Read chapter', emoji: '📝', correctOrder: 2 },
        { id: 15, label: 'Take notes', emoji: '✏️', correctOrder: 3 },
        { id: 16, label: 'Close & review', emoji: '✅', correctOrder: 4 },
    ],
    [
        { id: 17, label: 'Fill tub', emoji: '🛁', correctOrder: 1 },
        { id: 18, label: 'Wash body', emoji: '🧼', correctOrder: 2 },
        { id: 19, label: 'Rinse off', emoji: '🚿', correctOrder: 3 },
        { id: 20, label: 'Dry with towel', emoji: '🛁', correctOrder: 4 },
    ],
];

function shuffleArray<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

interface TaskSorterProps {
    onGameComplete?: (score: number) => void;
}

const TaskSorter: React.FC<TaskSorterProps> = ({ onGameComplete }) => {
    const [setIndex, setSetIndex] = useState(0);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [dragging, setDragging] = useState<number | null>(null);
    const [status, setStatus] = useState<'playing' | 'correct' | 'wrong'>('playing');
    const [score, setScore] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const initSet = (index: number) => {
        setTasks(shuffleArray([...TASK_SETS[index]]));
        setStatus('playing');
        setDragging(null);
    };

    useEffect(() => { initSet(0); }, []);

    const handleDragStart = (id: number) => setDragging(id);
    const handleDragOver = (e: React.DragEvent, targetId: number) => {
        e.preventDefault();
        if (dragging === null || dragging === targetId) return;
        setTasks(prev => {
            const arr = [...prev];
            const fromIdx = arr.findIndex(t => t.id === dragging);
            const toIdx = arr.findIndex(t => t.id === targetId);
            const [removed] = arr.splice(fromIdx, 1);
            arr.splice(toIdx, 0, removed);
            return arr;
        });
    };
    const handleDrop = () => setDragging(null);

    // Mobile tap-to-move
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const handleMobileTap = (id: number) => {
        if (status !== 'playing') return;
        if (selectedId === null) {
            setSelectedId(id);
        } else if (selectedId === id) {
            setSelectedId(null);
        } else {
            setTasks(prev => {
                const arr = [...prev];
                const fromIdx = arr.findIndex(t => t.id === selectedId);
                const toIdx = arr.findIndex(t => t.id === id);
                const [removed] = arr.splice(fromIdx, 1);
                arr.splice(toIdx, 0, removed);
                return arr;
            });
            setSelectedId(null);
        }
    };

    const checkOrder = () => {
        setAttempts(a => a + 1);
        const correct = tasks.every((t, i) => t.correctOrder === i + 1);
        if (correct) {
            setStatus('correct');
            const newScore = score + 10;
            setScore(newScore);
            setTimeout(() => {
                const next = setIndex + 1;
                if (next >= TASK_SETS.length) {
                    setCompleted(true);
                    onGameComplete?.(newScore);
                } else {
                    setSetIndex(next);
                    initSet(next);
                }
            }, 1500);
        } else {
            setStatus('wrong');
            setTimeout(() => setStatus('playing'), 1000);
        }
    };

    const resetGame = () => {
        setSetIndex(0);
        setScore(0);
        setCompleted(false);
        setAttempts(0);
        initSet(0);
    };

    if (completed) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded-2xl shadow-lg text-center max-w-lg mx-auto">
                <div className="text-6xl mb-4">📋</div>
                <h2 className="text-3xl font-bold text-blue-700 mb-2">Planning Pro!</h2>
                <p className="text-lg text-gray-600 mb-4">You sorted all task lists!</p>
                <p className="text-2xl font-bold text-green-600 mb-6">Final Score: {score}</p>
                <button onClick={resetGame} className="px-6 py-3 bg-blue-400 text-white rounded-xl font-bold text-lg hover:bg-blue-500 transition">
                    Play Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-b from-blue-50 to-cyan-50 rounded-2xl shadow-lg max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-2xl font-bold text-blue-700">Task Sorter</h3>
                    <p className="text-sm text-gray-500">List {setIndex + 1} of {TASK_SETS.length}</p>
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

            <div className="text-center mb-4">
                <p className="text-gray-600 font-medium">Put these steps in the <strong>correct order</strong> 📋</p>
                <p className="text-gray-400 text-xs mt-1">Drag to reorder — or tap two items to swap them</p>
            </div>

            {/* Task list */}
            <div className="space-y-3 mb-5">
                {tasks.map((task, idx) => (
                    <div
                        key={task.id}
                        draggable
                        onDragStart={() => handleDragStart(task.id)}
                        onDragOver={e => handleDragOver(e, task.id)}
                        onDrop={handleDrop}
                        onClick={() => handleMobileTap(task.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-grab active:cursor-grabbing transition-all duration-200 shadow-sm
              ${selectedId === task.id ? 'border-blue-500 bg-blue-100 scale-105' :
                                status === 'correct' ? 'border-green-400 bg-green-50' :
                                    status === 'wrong' ? 'border-red-300 bg-red-50' :
                                        'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'}`}
                    >
                        <span className="text-gray-400 font-bold text-sm w-5">{idx + 1}.</span>
                        <span className="text-3xl">{task.emoji}</span>
                        <span className="text-base font-semibold text-gray-700 flex-1">{task.label}</span>
                        {status === 'correct' && <CheckCircle className="w-5 h-5 text-green-500" />}
                        <span className="text-gray-300 text-xs">⠿⠿</span>
                    </div>
                ))}
            </div>

            {/* Status */}
            <div className="text-center h-6 mb-3">
                {status === 'correct' && <p className="text-green-600 font-bold">✅ Perfect order!</p>}
                {status === 'wrong' && <p className="text-red-500 font-semibold">❌ Not quite — try again!</p>}
            </div>

            {/* Check button */}
            <button
                onClick={checkOrder}
                disabled={status !== 'playing'}
                className="w-full py-3 bg-blue-500 text-white font-bold text-lg rounded-xl hover:bg-blue-600 disabled:opacity-40 transition shadow"
            >
                ✅ Check Order
            </button>

            {/* Progress */}
            <div className="mt-4 h-2 bg-gray-200 rounded-full">
                <div
                    className="h-2 bg-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${(setIndex / TASK_SETS.length) * 100}%` }}
                />
            </div>
        </div>
    );
};

export default TaskSorter;
