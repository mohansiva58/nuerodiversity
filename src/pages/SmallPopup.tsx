import React from 'react';
import { motion } from 'framer-motion';

interface SmallPopupProps {
  message: string;
  onClose: () => void;
}

const SmallPopup: React.FC<SmallPopupProps> = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <motion.div
        className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 max-w-sm w-full text-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-gray-800 mb-4">{message}</p>
        <button
          onClick={onClose}
          className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors"
        >
          OK
        </button>
      </motion.div>
    </div>
  );
};

export default SmallPopup;
