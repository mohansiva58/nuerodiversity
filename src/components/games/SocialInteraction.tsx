import React from 'react';

const SocialInteraction: React.FC<{ onGameComplete: (score: number) => void }> = ({ onGameComplete }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-green-50 rounded-2xl shadow-lg">
            <h2 className="text-3xl font-bold text-green-700 mb-4">Social Interaction Practice</h2>
            <p className="text-lg text-gray-700 text-center mb-6">Practice appropriate responses to social situations! (Coming Soon)</p>
            <button
                onClick={() => onGameComplete(50)}
                className="px-6 py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition"
            >
                Complete Demo
            </button>
        </div>
    );
};

export default SocialInteraction;
