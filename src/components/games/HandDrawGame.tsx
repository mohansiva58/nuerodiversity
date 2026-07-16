import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RefreshCcw, X, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HandDrawGameProps {
  onGameComplete: (score: number) => void;
}

interface Point {
  x: number;
  y: number;
}

interface TraceAttempt {
  letter: string;
  trace: Point[];
  accuracy: number;
  timestamp: number;
}

const HandDrawGame: React.FC<HandDrawGameProps> = ({ onGameComplete }) => {
  const { t } = useTranslation();
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'paused' | 'gameOver'>('waiting');
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [tracedPath, setTracedPath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [attempts, setAttempts] = useState<TraceAttempt[]>([]);
  const [gameWidth, setGameWidth] = useState(1000);
  const [gameHeight, setGameHeight] = useState(700);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  const letters = React.useMemo(() => ['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e'], []);

  const referencePoints = React.useMemo((): Record<string, Point[]> => ({
    // Capital Letters - Centered and properly sized
    'A': [
      // Left leg
      { x: 200, y: 500 }, { x: 250, y: 500 }, { x: 300, y: 300 }, { x: 350, y: 100 },
      // Right leg  
      { x: 450, y: 100 }, { x: 500, y: 300 }, { x: 550, y: 500 }, { x: 600, y: 500 },
      // Crossbar
      { x: 300, y: 300 }, { x: 500, y: 300 }
    ],
    'B': [
      // Vertical stem
      { x: 200, y: 500 }, { x: 200, y: 100 },
      // Top curve
      { x: 200, y: 100 }, { x: 350, y: 100 }, { x: 350, y: 200 }, { x: 200, y: 200 },
      // Bottom curve
      { x: 200, y: 200 }, { x: 380, y: 200 }, { x: 380, y: 400 }, { x: 200, y: 400 },
      // Close bottom
      { x: 200, y: 400 }, { x: 200, y: 500 }
    ],
    'C': [
      // Open curve
      { x: 500, y: 100 }, { x: 350, y: 100 }, { x: 250, y: 200 }, { x: 250, y: 400 }, { x: 350, y: 500 }, { x: 500, y: 500 }
    ],
    'D': [
      // Vertical stem
      { x: 200, y: 500 }, { x: 200, y: 100 },
      // Curve
      { x: 200, y: 100 }, { x: 400, y: 100 }, { x: 500, y: 200 }, { x: 500, y: 400 }, { x: 400, y: 500 }, { x: 200, y: 500 }
    ],
    'E': [
      // Vertical stem
      { x: 200, y: 500 }, { x: 200, y: 100 },
      // Top bar
      { x: 200, y: 100 }, { x: 450, y: 100 },
      // Middle bar
      { x: 200, y: 300 }, { x: 380, y: 300 },
      // Bottom bar
      { x: 200, y: 500 }, { x: 450, y: 500 }
    ],
    // Lowercase Letters - Positioned in middle area
    'a': [
      // Oval shape
      { x: 350, y: 400 }, { x: 300, y: 350 }, { x: 350, y: 300 }, { x: 400, y: 350 }, { x: 350, y: 400 },
      // Tail
      { x: 400, y: 350 }, { x: 450, y: 300 }
    ],
    'b': [
      // Vertical stem
      { x: 280, y: 500 }, { x: 280, y: 300 },
      // Curve
      { x: 280, y: 300 }, { x: 330, y: 300 }, { x: 380, y: 350 }, { x: 330, y: 400 }, { x: 280, y: 400 }
    ],
    'c': [
      // Open curve
      { x: 420, y: 300 }, { x: 350, y: 300 }, { x: 300, y: 350 }, { x: 350, y: 400 }, { x: 420, y: 400 }
    ],
    'd': [
      // Vertical stem
      { x: 420, y: 500 }, { x: 420, y: 300 },
      // Curve
      { x: 420, y: 300 }, { x: 370, y: 300 }, { x: 320, y: 350 }, { x: 370, y: 400 }, { x: 420, y: 400 }
    ],
    'e': [
      // Oval with crossbar
      { x: 420, y: 400 }, { x: 320, y: 400 }, { x: 320, y: 350 }, { x: 420, y: 350 }, { x: 420, y: 400 },
      // Crossbar
      { x: 320, y: 375 }, { x: 420, y: 375 }
    ]
  }), []);

  // Set responsive game dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Balanced sizing - large practice area but ensuring letters are always visible
      if (width <= 480) {
        // Mobile phones - good practice area while keeping letters visible
        const size = Math.min(width * 0.98, height * 0.75, 450);
        setGameWidth(size);
        setGameHeight(size * 1.2); // Reduced from 1.4 to 1.2
      } else if (width <= 768) {
        // Tablets - balanced approach
        const size = Math.min(width * 0.95, height * 0.8, 700);
        setGameWidth(size);
        setGameHeight(size * 1.3); // Reduced from 1.5 to 1.3
      } else if (width <= 1024) {
        // Small laptops - good practice space with visible letters
        const baseSize = Math.min(width * 0.85, height * 0.85, 800);
        setGameWidth(baseSize);
        setGameHeight(baseSize * 1.4); // Reduced from 1.6 to 1.4
      } else {
        // Large screens - large practice area but not excessive
        const baseSize = Math.min(width * 0.7, height * 0.85, 900);
        setGameWidth(baseSize);
        setGameHeight(baseSize * 1.4); // Reduced from 1.7 to 1.4
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Scale reference points to canvas size
  const scalePoint = useCallback((point: Point): Point => {
    // Base coordinate system is 600x600 for letter design
    const baseWidth = 600;
    const baseHeight = 600;

    // Calculate scale to fit the canvas while maintaining aspect ratio
    const scaleX = gameWidth / baseWidth;

    // Use a scale that ensures letters fit properly in the available space
    // Reserve space at the top and leave plenty of room for practicing
    const availableLetterHeight = gameHeight * 0.4; // Use 40% of canvas height for letters
    const letterScale = Math.min(scaleX * 0.7, availableLetterHeight / baseHeight);

    // Center the scaled coordinates horizontally
    const scaledWidth = baseWidth * letterScale;
    const offsetX = (gameWidth - scaledWidth) / 2;

    // Position letters with proper padding from top and ensure they're visible
    const topPadding = 40; // Fixed padding from top
    const offsetY = topPadding;

    return {
      x: point.x * letterScale + offsetX,
      y: point.y * letterScale + offsetY
    };
  }, [gameWidth, gameHeight]);

  // Calculate accuracy
  const calculateAccuracy = useCallback((trace: Point[], letter: string): number => {
    if (trace.length === 0 || !referencePoints[letter]) return 0;

    const ref = referencePoints[letter].map(scalePoint);
    let totalDistance = 0;
    let count = 0;

    for (const tracePoint of trace) {
      let minDistance = Infinity;
      for (const refPoint of ref) {
        const distance = Math.sqrt(
          Math.pow(tracePoint.x - refPoint.x, 2) +
          Math.pow(tracePoint.y - refPoint.y, 2)
        );
        minDistance = Math.min(minDistance, distance);
      }
      totalDistance += minDistance;
      count++;
    }

    if (count === 0) return 0;
    const avgDistance = totalDistance / count;
    const accuracy = Math.max(0, 100 - (avgDistance / 5));
    return Math.round(accuracy * 10) / 10;
  }, [scalePoint, referencePoints]);

  // Draw on canvas
  const drawOnCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate responsive line widths and point sizes based on canvas size
    const baseSize = Math.min(gameWidth, gameHeight);
    const lineWidth = Math.max(3, baseSize / 120); // Increased minimum
    const tracedLineWidth = Math.max(4, baseSize / 100); // Thicker traced lines
    const pointSize = Math.max(4, baseSize / 80); // Larger points
    const startPointSize = Math.max(8, baseSize / 60); // Much larger start point

    // Clear canvas
    ctx.clearRect(0, 0, gameWidth, gameHeight);

    // Draw reference path
    const currentLetter = letters[currentLetterIndex];
    if (referencePoints[currentLetter]) {
      const ref = referencePoints[currentLetter].map(scalePoint);

      // Draw reference lines with more visible dashed pattern
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = lineWidth;
      const dashLength = Math.max(8, baseSize / 80);
      const gapLength = Math.max(4, baseSize / 150);
      ctx.setLineDash([dashLength, gapLength]);
      ctx.beginPath();

      for (let i = 1; i < ref.length; i++) {
        if (i === 1) ctx.moveTo(ref[0].x, ref[0].y);
        ctx.lineTo(ref[i].x, ref[i].y);
      }
      ctx.stroke();

      // Draw reference points with better visibility
      ctx.fillStyle = '#3b82f6';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);

      ref.forEach((point, index) => {
        ctx.beginPath();
        const radius = index === 0 ? startPointSize : pointSize;
        ctx.arc(point.x, point.y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke(); // Add white outline for better visibility

        // Add number label for start point
        if (index === 0) {
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(12, baseSize / 40)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('START', point.x, point.y);
          ctx.fillStyle = '#3b82f6'; // Reset color
        }
      });
    }

    // Draw traced path with better visibility
    if (tracedPath.length > 1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = tracedLineWidth;
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tracedPath[0].x, tracedPath[0].y);

      for (let i = 1; i < tracedPath.length; i++) {
        ctx.lineTo(tracedPath[i].x, tracedPath[i].y);
      }
      ctx.stroke();
    }
  }, [gameWidth, gameHeight, currentLetterIndex, tracedPath, scalePoint, letters, referencePoints]);

  // Update canvas when tracedPath changes
  useEffect(() => {
    drawOnCanvas();
  }, [drawOnCanvas]);

  // Update accuracy in real-time
  useEffect(() => {
    if (tracedPath.length > 0) {
      const currentAccuracy = calculateAccuracy(tracedPath, letters[currentLetterIndex]);
      setAccuracy(currentAccuracy);
    }
  }, [tracedPath, currentLetterIndex, calculateAccuracy, letters]);

  // Mouse/touch handlers
  const getPointFromEvent = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    // Account for device pixel ratio for better accuracy on high-DPI screens
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing') return;

    // Only prevent default for touch events, not mouse events
    if ('touches' in e) {
      e.preventDefault();
    }
    setIsDrawing(true);
    const point = getPointFromEvent(e);
    setTracedPath([point]);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || gameState !== 'playing') return;

    // Only prevent default for touch events, not mouse events
    if ('touches' in e) {
      e.preventDefault();
    }
    const point = getPointFromEvent(e);
    setTracedPath(prev => [...prev, point]);
  };

  const handleEnd = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'touches' in e) {
      e.preventDefault();
    }
    setIsDrawing(false);
  };

  // Game controls
  const startGame = () => {
    setGameState('playing');
    setCurrentLetterIndex(0);
    setTracedPath([]);
    setAccuracy(0);
    setAttempts([]);
  };

  const nextLetter = () => {
    // Save current attempt
    if (tracedPath.length > 0) {
      const attempt: TraceAttempt = {
        letter: letters[currentLetterIndex],
        trace: [...tracedPath],
        accuracy,
        timestamp: Date.now()
      };
      setAttempts(prev => [...prev, attempt]);
    }

    if (currentLetterIndex >= letters.length - 1) {
      // Game complete
      const totalScore = attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length;
      setGameState('gameOver');
      setTimeout(() => onGameComplete(Math.round(totalScore)), 1000);
    } else {
      setCurrentLetterIndex(prev => prev + 1);
      setTracedPath([]);
      setAccuracy(0);
    }
  };

  const resetGame = () => {
    setGameState('waiting');
    setCurrentLetterIndex(0);
    setTracedPath([]);
    setAccuracy(0);
    setAttempts([]);
  };

  const exitGame = useCallback(() => {
    const totalScore = attempts.length > 0
      ? attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length
      : 0;
    onGameComplete(Math.round(totalScore));
  }, [attempts, onGameComplete]);

  // Handle escape key and setup touch event listeners
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitGame();
      }
    };

    // Setup touch event listeners with proper passive settings
    const canvas = canvasRef.current;
    if (canvas) {
      const touchStartHandler = (e: TouchEvent) => {
        if (gameState === 'playing') {
          e.preventDefault();
          const touch = e.touches[0];
          const rect = canvas.getBoundingClientRect();
          const point = {
            x: (touch.clientX - rect.left) * (canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (canvas.height / rect.height)
          };

          setIsDrawing(true);
          setTracedPath([point]);
        }
      };

      const touchMoveHandler = (e: TouchEvent) => {
        if (gameState === 'playing' && isDrawing) {
          e.preventDefault();
          const touch = e.touches[0];
          const rect = canvas.getBoundingClientRect();
          const point = {
            x: (touch.clientX - rect.left) * (canvas.width / rect.width),
            y: (touch.clientY - rect.top) * (canvas.height / rect.height)
          };
          setTracedPath(prev => [...prev, point]);
        }
      };

      const touchEndHandler = (e: TouchEvent) => {
        if (gameState === 'playing') {
          e.preventDefault();
          setIsDrawing(false);
        }
      };

      // Add non-passive touch event listeners
      canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
      canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
      canvas.addEventListener('touchend', touchEndHandler, { passive: false });

      window.addEventListener('keydown', handleKeyPress);

      return () => {
        canvas.removeEventListener('touchstart', touchStartHandler);
        canvas.removeEventListener('touchmove', touchMoveHandler);
        canvas.removeEventListener('touchend', touchEndHandler);
        window.removeEventListener('keydown', handleKeyPress);
      };
    } else {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [exitGame, gameState, isDrawing]);

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 to-indigo-900 h-screen w-screen fixed inset-0 z-50 overflow-hidden">
      {/* Close Button */}
      <button
        onClick={exitGame}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 z-10 transition-colors"
        title={t('games.handDraw.exit')}
      >
        <X size={20} className="sm:w-6 sm:h-6" />
      </button>

      <div className="mb-2 sm:mb-4 px-4">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white text-center mb-1 sm:mb-2">{t('games.handDraw.title')}</h2>
        <p className="text-white text-center opacity-80 text-sm sm:text-base">
          {t('games.handDraw.instruction')}
        </p>
      </div>

      {/* Game Stats */}
      <div className="flex gap-3 sm:gap-6 mb-2 sm:mb-4 text-white px-4">
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold">{letters[currentLetterIndex]}</div>
          <div className="text-xs sm:text-sm opacity-80">{t('games.handDraw.currentLetter')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold text-green-400">{accuracy.toFixed(1)}%</div>
          <div className="text-xs sm:text-sm opacity-80">{t('games.handDraw.accuracy')}</div>
        </div>
        <div className="text-center">
          <div className="text-xl sm:text-2xl font-bold text-blue-400">{currentLetterIndex + 1}/{letters.length}</div>
          <div className="text-xs sm:text-sm opacity-80">{t('games.handDraw.progress')}</div>
        </div>
      </div>

      {/* Game Area */}
      <div
        ref={gameAreaRef}
        className="relative border-2 sm:border-4 border-white/30 rounded-lg overflow-hidden mx-2 sm:mx-0"
        style={{ width: gameWidth, height: gameHeight }}
      >
        {/* Canvas for drawing */}
        <canvas
          ref={canvasRef}
          width={gameWidth}
          height={gameHeight}
          className="absolute inset-0 bg-white cursor-crosshair touch-none"
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          style={{
            touchAction: 'none',
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none'
          }}
        />

        {/* Game State Overlays */}
        {gameState === 'waiting' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h3 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-4">{t('games.handDraw.readyTitle')}</h3>
              <p className="mb-2 sm:mb-4 text-sm sm:text-base">{t('games.handDraw.instruction')}</p>
              <button
                onClick={startGame}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-white flex items-center gap-2 mx-auto text-sm sm:text-base"
              >
                <Play size={16} className="sm:w-5 sm:h-5" />
                {t('games.handDraw.startTracing')}
              </button>
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center text-white px-4">
              <h3 className="text-2xl sm:text-3xl font-bold mb-2 text-green-400">{t('games.handDraw.complete')}</h3>
              <p className="text-lg sm:text-xl mb-2 sm:mb-4">
                {t('games.handDraw.averageAccuracy', {
                  accuracy: attempts.length > 0
                    ? (attempts.reduce((sum, attempt) => sum + attempt.accuracy, 0) / attempts.length).toFixed(1)
                    : 0
                })}
              </p>
              <button
                onClick={resetGame}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold text-white flex items-center gap-2 mx-auto text-sm sm:text-base"
              >
                <RefreshCcw size={16} className="sm:w-5 sm:h-5" />
                {t('games.handDraw.practiceAgain')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game Controls */}
      {gameState === 'playing' && (
        <div className="mt-2 sm:mt-4 flex gap-2 sm:gap-4 px-4">
          <button
            onClick={() => setTracedPath([])}
            className="px-3 sm:px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg font-bold text-white flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <RefreshCcw size={14} className="sm:w-4 sm:h-4" />
            {t('games.handDraw.clear')}
          </button>
          <button
            onClick={nextLetter}
            className="px-3 sm:px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold text-white flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <SkipForward size={14} className="sm:w-4 sm:h-4" />
            {t('games.handDraw.nextLetter')}
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-3 sm:mt-6 max-w-sm sm:max-w-md text-center text-white/80 text-xs sm:text-sm px-4">
        <p className="mb-1 sm:mb-2">
          {t('games.handDraw.guide')}
        </p>
        <p className="text-xs text-white/60 hidden sm:block">
          {t('games.handDraw.exit')}
        </p>
        <p className="text-xs text-white/60 sm:hidden">
          {t('games.handDraw.exitMobile')}
        </p>
      </div>
    </div>
  );
};

export default HandDrawGame;
