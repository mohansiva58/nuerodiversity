import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Quiz = () => {
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const games = [
    {
      id: 'pattern',
      title: 'Pattern Recognition',
      description: 'Improve your visual memory by matching patterns',
      difficulty: 'Easy'
    },
    {
      id: 'sequence',
      title: 'Number Sequence',
      description: 'Enhance working memory with number patterns',
      difficulty: 'Medium'
    },
    {
      id: 'word',
      title: 'Word Association',
      description: 'Build vocabulary and language skills',
      difficulty: 'Medium'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Cognitive Training Games</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map((game) => (
          <motion.div
            key={game.id}
            whileHover={{ scale: 1.02 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{game.title}</h3>
            <p className="text-gray-600 mb-4">{game.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Difficulty: {game.difficulty}</span>
              <button
                onClick={() => setCurrentGame(game.id)}
                className="btn-soft"
              >
                Play Now
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Game Area */}
      {currentGame && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">
              {games.find(g => g.id === currentGame)?.title}
            </h2>
            <span className="text-gray-600">Score: {score}</span>
          </div>
          <div className="min-h-[300px] flex items-center justify-center">
            {/* Game content would go here */}
            <p className="text-gray-600">Game content loading...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Quiz;