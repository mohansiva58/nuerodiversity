import React, { useState } from 'react';

const AuditoryGuessing: React.FC<{ onGameComplete: (score: number) => void }> = ({ onGameComplete }) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 bg-blue-50 rounded-2xl shadow-lg">
            <h2 className="text-3xl font-bold text-blue-700 mb-4">Auditory Guessing</h2>
            <p className="text-lg text-gray-700 text-center mb-6">Listen to the sounds and guess what they are! (Coming Soon)</p>
            <button
                onClick={() => onGameComplete(50)}
                className="px-6 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition"
            >
                Complete Demo
            </button>
        </div>
    );
};

export default AuditoryGuessing;
