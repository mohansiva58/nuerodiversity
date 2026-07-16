import React, { useState, useEffect } from 'react';
import { RefreshCcw, Volume2, Star } from 'lucide-react';

const RHYME_PAIRS = [
    { word: 'CAT', rhyme: 'HAT', emoji1: '🐱', emoji2: '🎩' },
    { word: 'DOG', rhyme: 'LOG', emoji1: '🐶', emoji2: '🪵' },
    { word: 'CAKE', rhyme: 'LAKE', emoji1: '🎂', emoji2: '🏞️' },
    { word: 'STAR', rhyme: 'CAR', emoji1: '⭐', emoji2: '🚗' },
    { word: 'FROG', rhyme: 'FOG', emoji1: '🐸', emoji2: '🌫️' },
    { word: 'BALL', rhyme: 'WALL', emoji1: '⚽', emoji2: '🧱' },
    { word: 'BELL', rhyme: 'WELL', emoji1: '🔔', emoji2: '🪣' },
    { word: 'FISH', rhyme: 'DISH', emoji1: '🐟', emoji2: '🍽️' },
];

function shuffleArray<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

interface Card {
    id: number;
    word: string;
    emoji: string;
    pairId: number;
}

interface RhymeMatchProps {
    onGameComplete?: (score: number) => void;
}

const RhymeMatch: React.FC<RhymeMatchProps> = ({ onGameComplete }) => {
    const [cards, setCards] = useState<Card[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [matched, setMatched] = useState<number[]>([]);
    const [score, setScore] = useState(0);
    const [wrong, setWrong] = useState<number[]>([]);
    const [completed, setCompleted] = useState(false);
    const [attempts, setAttempts] = useState(0);

    const initGame = () => {
        const chosen = shuffleArray(RHYME_PAIRS).slice(0, 5);
        const flat: Card[] = [];
        chosen.forEach((pair, idx) => {
            flat.push({ id: idx * 2, word: pair.word, emoji: pair.emoji1, pairId: idx });
            flat.push({ id: idx * 2 + 1, word: pair.rhyme, emoji: pair.emoji2, pairId: idx });
        });
        setCards(shuffleArray(flat));
        setSelected([]);
        setMatched([]);
        setWrong([]);
        setScore(0);
        setAttempts(0);
        setCompleted(false);
    };

    useEffect(() => { initGame(); }, []);

    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            const u = new SpeechSynthesisUtterance(text);
            u.rate = 0.8;
            window.speechSynthesis.speak(u);
        }
    };

    const handleCardClick = (card: Card) => {
        if (
            selected.length === 2 ||
            matched.includes(card.id) ||
            selected.includes(card.id) ||
            wrong.length > 0
        ) return;

        speak(card.word);
        const newSelected = [...selected, card.id];
        setSelected(newSelected);

        if (newSelected.length === 2) {
            setAttempts(a => a + 1);
            const [id1, id2] = newSelected;
            const card1 = cards.find(c => c.id === id1)!;
            const card2 = cards.find(c => c.id === id2)!;

            if (card1.pairId === card2.pairId) {
                // Correct rhyme pair
                const newMatched = [...matched, id1, id2];
                setMatched(newMatched);
                setScore(s => s + 10);
                setSelected([]);
                speak('Great rhyme!');
                if (newMatched.length === cards.length) {
                    setTimeout(() => {
                        setCompleted(true);
                        onGameComplete?.(score + 10);
                    }, 800);
                }
            } else {
                setWrong([id1, id2]);
                setTimeout(() => {
                    setWrong([]);
                    setSelected([]);
                }, 900);
            }
        }
    };

    const getCardState = (card: Card) => {
        if (matched.includes(card.id)) return 'matched';
        if (wrong.includes(card.id)) return 'wrong';
        if (selected.includes(card.id)) return 'selected';
        return 'idle';
    };

    const cardStyle: Record<string, string> = {
        matched: 'bg-green-100 border-green-400 text-green-800 scale-95',
        wrong: 'bg-red-100 border-red-400 text-red-700 animate-pulse',
        selected: 'bg-purple-200 border-purple-500 text-purple-800 scale-105',
        idle: 'bg-white border-gray-300 text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:scale-105',
    };

    if (completed) {
        const accuracy = Math.round((cards.length / 2 / attempts) * 100);
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-green-50 rounded-2xl shadow-lg text-center">
                <div className="text-6xl mb-4">🎵</div>
                <h2 className="text-3xl font-bold text-green-700 mb-2">Rhyme Master!</h2>
                <p className="text-lg text-gray-600 mb-1">Score: <span className="font-bold text-green-600">{score}</span></p>
                <p className="text-lg text-gray-600 mb-6">Accuracy: <span className="font-bold text-blue-600">{accuracy}%</span></p>
                <button onClick={initGame} className="px-6 py-3 bg-green-400 text-white rounded-xl font-bold text-lg hover:bg-green-500 transition">
                    Play Again
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gradient-to-b from-green-50 to-teal-50 rounded-2xl shadow-lg max-w-lg mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-2xl font-bold text-teal-700">Rhyme Match</h3>
                    <p className="text-sm text-gray-500">Match words that rhyme!</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-yellow-100 px-3 py-1 rounded-full">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-yellow-700">{score}</span>
                    </div>
                    <button onClick={initGame} className="p-2 bg-gray-200 rounded-full hover:bg-gray-300 transition">
                        <RefreshCcw className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="text-center mb-4">
                <p className="text-gray-500 text-sm">Tap a word to hear it, then tap its rhyming pair 🎵</p>
                <button onClick={() => speak('Tap a card to hear the word, then find the word it rhymes with')} className="mt-1 p-1 rounded-full bg-teal-100 hover:bg-teal-200 transition">
                    <Volume2 className="w-4 h-4 text-teal-600" />
                </button>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                {cards.map(card => (
                    <button
                        key={card.id}
                        onClick={() => handleCardClick(card)}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200 shadow-sm ${cardStyle[getCardState(card)]}`}
                    >
                        <span className="text-4xl mb-1">{card.emoji}</span>
                        <span className="text-xl font-bold tracking-widest">{card.word}</span>
                        {matched.includes(card.id) && <span className="text-xs text-green-600 mt-1">✓ Matched!</span>}
                    </button>
                ))}
            </div>

            {/* Progress */}
            <div className="text-center text-sm text-gray-500 mb-2">
                {matched.length / 2} / {cards.length / 2} pairs found
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
                <div
                    className="h-2 bg-teal-500 rounded-full transition-all duration-500"
                    style={{ width: `${(matched.length / cards.length) * 100}%` }}
                />
            </div>
        </div>
    );
};

export default RhymeMatch;

