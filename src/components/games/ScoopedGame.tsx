import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RefreshCcw, Pause, X, Camera, CameraOff } from 'lucide-react';
import bucketImage from './bucket.png';
import { useTranslation } from 'react-i18next';
// import { useHandTracking, getHandPosition } from '../../utils/handTracking';

interface ScoopedGameProps {
  onGameComplete: (score: number) => void;
}

interface FallingObject {
  id: number;
  x: number;
  y: number;
  letter: string;
}

const ScoopedGame: React.FC<ScoopedGameProps> = ({ onGameComplete }) => {
  const { t } = useTranslation();
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'paused' | 'gameOver'>('waiting');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [currentLetter, setCurrentLetter] = useState('A');
  const [bucketX, setBucketX] = useState(320); // Center of 640px width
  const [fallingObjects, setFallingObjects] = useState<FallingObject[]>([]);
  const [gameSpeed, setGameSpeed] = useState(2);
  const [objectIdCounter, setObjectIdCounter] = useState(0);
  const [gameWidth, setGameWidth] = useState(1000);
  const [gameHeight, setGameHeight] = useState(700);
  const [handTrackingEnabled, setHandTrackingEnabled] = useState(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastObjectTime = useRef<number>(0);

  // Hand tracking
  const {
    videoRef,
    canvasRef,
    hands,
    isInitialized,
    isLoading,
    error: handTrackingError,
    initializeCamera,
    cleanup
  } = useHandTracking();

  const BUCKET_WIDTH = 100;
  const BUCKET_HEIGHT = 80;
  const OBJECT_SIZE = 35;

  // Set responsive game dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setGameWidth(Math.min(window.innerWidth * 0.9, 1000));
      setGameHeight(Math.min(window.innerHeight * 0.8, 700));
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Generate random letter
  const getRandomLetter = useCallback(() => {
    return String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }, []);

  // Initialize game
  const initializeGame = useCallback(() => {
    setScore(0);
    setLives(3);
    setCurrentLetter(getRandomLetter());
    setBucketX(gameWidth / 2);
    setFallingObjects([]);
    setGameSpeed(2);
    setObjectIdCounter(0);
    lastObjectTime.current = 0;
  }, [getRandomLetter, gameWidth]);

  // Start game
  const startGame = useCallback(() => {
    initializeGame();
    setGameState('playing');
  }, [initializeGame]);

  // Hand tracking for bucket control
  useEffect(() => {
    if (handTrackingEnabled && hands.length > 0 && gameState === 'playing') {
      const hand = hands[0];
      const handPos = getHandPosition(hand.landmarks);

      // Convert normalized coordinates to game coordinates
      const handX = handPos.x * gameWidth;
      const clampedX = Math.max(BUCKET_WIDTH / 2, Math.min(gameWidth - BUCKET_WIDTH / 2, handX));
      setBucketX(clampedX);
    }
  }, [hands, handTrackingEnabled, gameState, gameWidth]);

  // Toggle camera tracking
  const toggleHandTracking = useCallback(async () => {
    if (handTrackingEnabled) {
      cleanup();
      setHandTrackingEnabled(false);
    } else {
      await initializeCamera();
      setHandTrackingEnabled(true);
    }
  }, [handTrackingEnabled, cleanup, initializeCamera]);

  // Mouse move handler for bucket control
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (gameState !== 'playing' || handTrackingEnabled) return;

    const rect = gameAreaRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const clampedX = Math.max(BUCKET_WIDTH / 2, Math.min(gameWidth - BUCKET_WIDTH / 2, mouseX));
      setBucketX(clampedX);
    }
  }, [gameState, gameWidth, handTrackingEnabled]);

  // Game loop
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    const currentTime = Date.now();

    // Spawn new falling objects
    if (currentTime - lastObjectTime.current > 1500) { // Every 1.5 seconds
      setFallingObjects(prev => [...prev, {
        id: objectIdCounter,
        x: Math.random() * (gameWidth - OBJECT_SIZE),
        y: -OBJECT_SIZE,
        letter: getRandomLetter()
      }]);
      setObjectIdCounter(prev => prev + 1);
      lastObjectTime.current = currentTime;
    }

    // Update falling objects
    setFallingObjects(prev => {
      return prev.map(obj => ({
        ...obj,
        y: obj.y + gameSpeed
      })).filter(obj => {
        // Remove objects that are off screen
        if (obj.y > gameHeight + OBJECT_SIZE) {
          return false;
        }

        // Check collision with bucket
        const objectCenterX = obj.x + OBJECT_SIZE / 2;
        const objectBottom = obj.y + OBJECT_SIZE;
        const bucketTop = gameHeight - 50 - BUCKET_HEIGHT;
        const bucketBottom = gameHeight - 50;
        const bucketLeft = bucketX - BUCKET_WIDTH / 2;
        const bucketRight = bucketX + BUCKET_WIDTH / 2;

        if (objectBottom >= bucketTop &&
          objectBottom <= bucketBottom &&
          objectCenterX >= bucketLeft &&
          objectCenterX <= bucketRight) {

          if (obj.letter === currentLetter) {
            // Correct catch
            setScore(prev => prev + 10);
            setCurrentLetter(getRandomLetter());
            // Increase speed slightly
            setGameSpeed(prev => Math.min(prev + 0.1, 8));
          } else {
            // Wrong catch
            setLives(prev => prev - 1);
          }
          return false; // Remove the object
        }

        return true; // Keep the object
      });
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, gameSpeed, objectIdCounter, bucketX, currentLetter, getRandomLetter, gameWidth, gameHeight]);

  // Start game loop
  useEffect(() => {
    if (gameState === 'playing') {
      animationRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, gameLoop]);

  // Check game over
  useEffect(() => {
    if (lives <= 0 && gameState === 'playing') {
      setGameState('gameOver');
      const finalScore = score;
      setTimeout(() => onGameComplete(finalScore), 1000);
    }
  }, [lives, gameState, score, onGameComplete]);

  const pauseGame = () => {
    setGameState('paused');
  };

  const resumeGame = () => {
    setGameState('playing');
  };

  const resetGame = () => {
    initializeGame();
    setGameState('waiting');
  };

  const exitGame = useCallback(() => {
    onGameComplete(score);
  }, [score, onGameComplete]);

  // Handle escape key to exit game
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitGame();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [exitGame]);

  return (
    <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-purple-900 h-screen w-screen fixed inset-0 z-50">
      {/* Close Button */}
      <button
        onClick={exitGame}
        className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 z-10 transition-colors"
        title={t('games.scooped.exit')}
      >
        <X size={24} />
      </button>

      <div className="mb-4">
        <h2 className="text-3xl font-bold text-white text-center mb-2">{t('games.scooped.title')}</h2>
        <p className="text-white text-center opacity-80">
          {t('games.scooped.instruction')}
        </p>
      </div>

      {/* Game Stats */}
      <div className="flex gap-6 mb-4 text-white">
        <div className="text-center">
          <div className="text-2xl font-bold">{score}</div>
          <div className="text-sm opacity-80">{t('games.scooped.score')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{'❤️'.repeat(lives)}</div>
          <div className="text-sm opacity-80">{t('games.scooped.lives')}</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-400">{currentLetter}</div>
          <div className="text-sm opacity-80">{t('games.scooped.target')}</div>
        </div>
      </div>

      {/* Game Area */}
      <div
        ref={gameAreaRef}
        className="relative border-4 border-white/30 rounded-lg overflow-hidden cursor-crosshair"
        style={{ width: gameWidth, height: gameHeight }}
        onMouseMove={handleMouseMove}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400 to-blue-600" />

        {/* Ground line */}
        <div
          className="absolute w-full h-1 bg-green-500 shadow-lg"
          style={{ bottom: '40px' }}
        />

        {/* Falling Objects */}
        {fallingObjects.map(obj => (
          <div
            key={obj.id}
            className="absolute bg-white rounded-full flex items-center justify-center font-bold text-black shadow-lg border-2 border-gray-300"
            style={{
              left: obj.x,
              top: obj.y,
              width: OBJECT_SIZE,
              height: OBJECT_SIZE,
              fontSize: '20px',
              zIndex: 5
            }}
          >
            {obj.letter}
          </div>
        ))}

        {/* Bucket */}
        <div
          className="absolute flex items-center justify-center"
          style={{
            left: `${(bucketX / gameWidth) * 100}%`,
            bottom: '50px',
            width: BUCKET_WIDTH,
            height: BUCKET_HEIGHT,
            zIndex: 10,
            transform: 'translateX(-50%)'
          }}
        >
          <img
            src={bucketImage}
            alt="Bucket"
            className="w-full h-full object-contain"
            style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }}
          />
          <div
            className="absolute text-2xl font-bold text-yellow-900 pointer-events-none"
            style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              top: '30%'
            }}
          >
            {currentLetter}
          </div>
        </div>

        {/* Bucket shadow/base for better visibility */}
        <div
          className="absolute bg-black opacity-20"
          style={{
            left: `${(bucketX / gameWidth) * 100}%`,
            bottom: '40px',
            width: BUCKET_WIDTH - 20,
            height: 6,
            borderRadius: '50%',
            transform: 'translateX(-50%)'
          }}
        />

        {/* Game State Overlays */}
        {gameState === 'waiting' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <h3 className="text-2xl font-bold mb-4">{t('games.scooped.readyTitle')}</h3>
              <p className="mb-4">
                {handTrackingEnabled
                  ? t('games.scooped.controlsHand')
                  : t('games.scooped.controlsMouse')
                }
              </p>

              {/* Camera Controls */}
              <div className="mb-6">
                <button
                  onClick={toggleHandTracking}
                  disabled={isLoading}
                  className={`px-4 py-2 mr-2 rounded-lg font-bold flex items-center gap-2 mx-auto mb-4 ${handTrackingEnabled
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                    } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : handTrackingEnabled ? (
                    <CameraOff size={16} />
                  ) : (
                    <Camera size={16} />
                  )}
                  {isLoading
                    ? t('games.scooped.cameraLoading')
                    : handTrackingEnabled
                      ? t('games.scooped.disableHand')
                      : t('games.scooped.enableHand')
                  }
                </button>

                {handTrackingError && (
                  <p className="text-red-400 text-sm mb-2">{handTrackingError}</p>
                )}
              </div>

              <button
                onClick={startGame}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-white flex items-center gap-2 mx-auto"
              >
                <Play size={20} />
                {t('games.scooped.startGame')}
              </button>
            </div>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="text-center text-white">
              <h3 className="text-2xl font-bold mb-4">{t('games.scooped.paused')}</h3>
              <button
                onClick={resumeGame}
                className="px-6 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-bold text-white flex items-center gap-2 mx-auto"
              >
                <Play size={20} />
                {t('games.scooped.resume')}
              </button>
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <div className="text-center text-white">
              <h3 className="text-3xl font-bold mb-2 text-red-400">{t('games.scooped.gameOver')}</h3>
              <p className="text-xl mb-4">{t('games.scooped.finalScore', { score })}</p>
              <button
                onClick={resetGame}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg font-bold text-white flex items-center gap-2 mx-auto"
              >
                <RefreshCcw size={20} />
                {t('games.scooped.playAgain')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Game Controls */}
      {gameState === 'playing' && (
        <div className="mt-4 flex gap-4">
          <button
            onClick={pauseGame}
            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg font-bold text-white flex items-center gap-2"
          >
            <Pause size={16} />
            {t('games.scooped.pause')}
          </button>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg font-bold text-white flex items-center gap-2"
          >
            <RefreshCcw size={16} />
            {t('games.scooped.reset')}
          </button>
          <button
            onClick={toggleHandTracking}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-bold flex items-center gap-2 ${handTrackingEnabled
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : handTrackingEnabled ? (
              <CameraOff size={16} />
            ) : (
              <Camera size={16} />
            )}
            {handTrackingEnabled ? t('games.scooped.disableCamera') : t('games.scooped.enableCamera')}
          </button>
        </div>
      )}

      {/* Camera Feed */}
      <div className="mt-4 relative">
        <div className={`bg-black rounded-lg overflow-hidden w-48 h-36 mx-auto relative ${handTrackingEnabled && isInitialized ? 'block' : 'hidden'
          }`}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover transform -scale-x-100"
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full transform -scale-x-100"
            width={640}
            height={480}
          />
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            Hands: {hands.length}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 max-w-md text-center text-white/80 text-sm">
        <p className="mb-2">
          {handTrackingEnabled
            ? t('games.scooped.guideHand')
            : t('games.scooped.guideMouse')
          }
        </p>
        <p className="text-xs text-white/60">
          {t('games.scooped.exit')}
        </p>
      </div>
    </div>
  );
};

export default ScoopedGame;
