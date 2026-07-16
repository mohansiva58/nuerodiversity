/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MemoryMatch from "../components/games/MemoryMatch";
import WordPuzzle from "../components/games/WordPuzzle";
import SpeedReading from "../components/games/SpeedReading";
import PatternRecognition from "../components/games/PatternRecognition";
import EmotionMatching from "../components/games/EmotionMatching";
import FocusTrainer from "../components/games/FocusTrainer";
import ScoopedGame from "../components/games/ScoopedGame";
import HandDrawGame from "../components/games/HandDrawGame";
import WordBuilder from "../components/games/WordBuilder";
import FocusTap from "../components/games/FocusTap";
import StopGo from "../components/games/StopGo";
import EmotionMatch from "../components/games/EmotionMatch";
import PatternCompleter from "../components/games/PatternCompleter";
import RhymeMatch from "../components/games/RhymeMatch";
import MyDailyRoutine from "../components/games/MyDailyRoutine";
import AuditoryGuessing from "../components/games/AuditoryGuessing";
import SocialInteraction from "../components/games/SocialInteraction";
import TaskSorter from "../components/games/TaskSorter";
import { Gamepad2, X, Play, Star, Trophy, Home, User, LogIn, LogOut, Settings, Zap, Target, Award, Medal, Crown, Sparkles, TrendingUp, Clock, Users, Flame } from "lucide-react";
import { SpeechText } from "../components/speach";
import { useTranslation } from 'react-i18next';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore";
import { useAuth } from "./AuthContext";

interface Game {
  id: string;
  title: string;
  component: React.FC<{ onGameComplete: (score: number) => void }>;
  logo: string;
  description: string;
  rating: number;
  category: string;
}

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  score: number;
  gameId: string;
  timestamp: string;
}

interface UserAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  gameId?: string;
}

const GamesPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [hoveredGame, setHoveredGame] = useState<string | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [playerCount, setPlayerCount] = useState<number>(0);
  const [totalAchievements, setTotalAchievements] = useState<number>(0);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const { user, logout } = useAuth();
  const db = getFirestore();
  const hasSubmittedScoreRef = useRef(false);

  const games: Game[] = [
    // { id: "scooped", title: "SCOOP'D", component: ScoopedGame, logo: "https://cdn-icons-png.flaticon.com/512/3176/3176366.png", description: "Catch falling letters with your bucket in this fast-paced game!", rating: 4.9, category: "skill" },
    { id: "handdraw", title: "Hand Draw Tracer", component: HandDrawGame, logo: "https://cdn-icons-png.flaticon.com/512/2921/2921222.png", description: "Practice letter tracing by following the dotted lines!", rating: 4.8, category: "skill" },
    { id: "memory", title: "Memory Match", component: MemoryMatch, logo: "https://cdn-icons-png.flaticon.com/512/808/808439.png", description: "Test your memory with this fun card-matching game!", rating: 4.5, category: "memory" },
    { id: "word", title: "Word Puzzle", component: WordPuzzle, logo: "https://cdn-icons-png.flaticon.com/512/2491/2491935.png", description: "Solve challenging word puzzles to boost vocabulary.", rating: 4.2, category: "puzzle" },
    { id: "speed", title: "Speed Reading", component: SpeedReading, logo: "https://cdn-icons-png.flaticon.com/512/2933/2933245.png", description: "Improve your reading speed and comprehension.", rating: 4.7, category: "brain" },
    { id: "pattern", title: "Pattern Master", component: PatternRecognition, logo: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png", description: "Spot the patterns in this brain-teasing challenge.", rating: 4.3, category: "logic" },
    { id: "emotion", title: "Emotion Recognition", component: EmotionMatching, logo: "https://cdn-icons-png.flaticon.com/512/1906/1906429.png", description: "Identify emotions from facial expressions.", rating: 4.6, category: "social" },
    { id: "focus", title: "Focus Trainer", component: FocusTrainer, logo: "https://cdn-icons-png.flaticon.com/512/2936/2936886.png", description: "Enhance your concentration with this trainer.", rating: 4.4, category: "brain" },
    { id: "emotion_match", title: "Emotion Match", component: EmotionMatch, logo: "https://cdn-icons-png.flaticon.com/512/3237/3237472.png", description: "Match the scenario with the correct emotion.", rating: 4.7, category: "social" },
    { id: "word_builder", title: "Word Builder", component: WordBuilder, logo: "https://cdn-icons-png.flaticon.com/512/10419/10419089.png", description: "Build words from jumbled letters in this fun spelling challenge.", rating: 4.6, category: "puzzle" },
    { id: "focus_tap", title: "Focus Tap", component: FocusTap, logo: "https://cdn-icons-png.flaticon.com/512/2548/2548590.png", description: "Tap the target as quickly as possible to improve your reaction time.", rating: 4.5, category: "skill" },
    { id: "stop_go", title: "Stop & Go", component: StopGo, logo: "https://cdn-icons-png.flaticon.com/512/5664/5664402.png", description: "Train your impulse control by clicking only on the green light.", rating: 4.8, category: "brain" },
    { id: "pattern_completer", title: "Pattern Completer", component: PatternCompleter, logo: "https://cdn-icons-png.flaticon.com/512/8706/8706346.png", description: "Fill in the missing piece of the pattern.", rating: 4.4, category: "logic" },
    { id: "rhyme_match", title: "Rhyme Match", component: RhymeMatch, logo: "https://cdn-icons-png.flaticon.com/512/3412/3412862.png", description: "Find the words that rhyme in this auditory training game.", rating: 4.2, category: "memory" },
    { id: "daily_routine", title: "My Daily Routine", component: MyDailyRoutine, logo: "https://cdn-icons-png.flaticon.com/512/4762/4762311.png", description: "Organize daily activities in the correct order.", rating: 4.9, category: "social" },
    { id: "auditory_guessing", title: "Auditory Guessing", component: AuditoryGuessing, logo: "https://cdn-icons-png.flaticon.com/512/2368/2368403.png", description: "Listen to the sounds and guess what they are.", rating: 4.1, category: "brain" },
    { id: "social_interaction", title: "Social Interaction", component: SocialInteraction, logo: "https://cdn-icons-png.flaticon.com/512/1946/1946429.png", description: "Practice appropriate responses to social situations.", rating: 4.3, category: "social" },
    { id: "task_sorter", title: "Task Sorter", component: TaskSorter, logo: "https://cdn-icons-png.flaticon.com/512/8367/8367500.png", description: "Sort tasks into categories.", rating: 4.5, category: "logic" },
  ];

  const categories = [
    { id: "all", name: t('games.categories.all') },
    { id: "memory", name: t('games.categories.memory') },
    { id: "puzzle", name: t('games.categories.puzzle') },
    { id: "brain", name: t('games.categories.brain') },
    { id: "logic", name: t('games.categories.logic') },
    { id: "skill", name: t('games.categories.skill') },
    { id: "social", name: t('games.categories.social') },
  ];

  const filteredGames = activeCategory === "all"
    ? games
    : games.filter(game => game.category === activeCategory);

  const selectedGame = games.find((game) => game.id === activeGame);

  useEffect(() => {
    hasSubmittedScoreRef.current = false;
  }, [activeGame]);

  // Fetch real-time stats (players, achievements)
  useEffect(() => {
    const fetchRealTimeStats = async () => {
      try {
        setIsLoadingStats(true);

        // Fetch users who have actually played games (have leaderboard entries)
        const leaderboardCollection = collection(db, "leaderboard");
        const leaderboardSnapshot = await getDocs(leaderboardCollection);

        // Count unique players who have played games
        const uniquePlayerIds = new Set();
        leaderboardSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.userId) {
            uniquePlayerIds.add(data.userId);
          }
        });

        setPlayerCount(uniquePlayerIds.size);
        setTotalAchievements(leaderboardSnapshot.size);

        console.log(`Fetched ${uniquePlayerIds.size} active players and ${leaderboardSnapshot.size} total game records`);
      } catch (error) {
        console.error("Error fetching real-time stats:", error);
        // Only use fallback if there's actually an error, set to 0 if no data
        setPlayerCount(0);
        setTotalAchievements(0);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchRealTimeStats();
  }, [db]);

  // Fetch user-specific achievements
  useEffect(() => {
    if (!user) return;

    const fetchUserAchievements = async () => {
      try {
        // Get user's game scores
        const userScoresQuery = query(
          collection(db, "leaderboard"),
          where("userId", "==", user.uid)
        );
        const userScoresSnapshot = await getDocs(userScoresQuery);
        const userScores = userScoresSnapshot.docs.map(doc => doc.data());

        // Generate achievements based on user's performance
        const achievements: UserAchievement[] = [];

        if (userScores.length > 0) {
          achievements.push({
            id: "first_game",
            title: "First Steps",
            description: "Played your first brain training game",
            icon: "🎮",
            unlockedAt: new Date(userScores[0].timestamp?.toDate() || new Date())
          });
        }

        if (userScores.length >= 5) {
          achievements.push({
            id: "dedicated_player",
            title: "Dedicated Player",
            description: "Completed 5 different games",
            icon: "🏆",
            unlockedAt: new Date()
          });
        }

        const highScores = userScores.filter(score => score.score > 80);
        if (highScores.length > 0) {
          achievements.push({
            id: "high_scorer",
            title: "High Scorer",
            description: "Achieved a score above 80",
            icon: "⭐",
            unlockedAt: new Date()
          });
        }

        const recentGames = userScores.filter(score => {
          const scoreDate = score.timestamp?.toDate() || new Date();
          const daysDiff = (new Date().getTime() - scoreDate.getTime()) / (1000 * 3600 * 24);
          return daysDiff <= 7;
        });

        if (recentGames.length >= 3) {
          achievements.push({
            id: "weekly_warrior",
            title: "Weekly Warrior",
            description: "Played 3 games this week",
            icon: "🔥",
            unlockedAt: new Date()
          });
        }

        setUserAchievements(achievements);
      } catch (error) {
        console.error("Error fetching user achievements:", error);
        setUserAchievements([]);
      }
    };

    fetchUserAchievements();
  }, [user, db]);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        let q;
        if (activeGame) {
          q = query(
            collection(db, "leaderboard"),
            where("gameId", "==", activeGame),
            orderBy("score", "desc"),
            limit(10)
          );
        } else {
          q = query(
            collection(db, "leaderboard"),
            orderBy("score", "desc"),
            limit(10)
          );
        }

        const querySnapshot = await getDocs(q);
        const leaderboardData = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            userId: data.userId,
            displayName: data.displayName || "Anonymous",
            score: data.score,
            gameId: data.gameId,
            timestamp: data.timestamp instanceof Timestamp
              ? data.timestamp.toDate().toLocaleString()
              : new Date(data.timestamp).toLocaleString(),
          } as LeaderboardEntry;
        });

        setLeaderboard(leaderboardData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
        setLeaderboard([]);
      }
    };

    fetchLeaderboard();
  }, [db, activeGame]);

  const handleGameComplete = async (score: number) => {
    if (hasSubmittedScoreRef.current) {
      return;
    }

    if (!user) {
      alert("Please log in to submit your score!");
      return;
    }
    if (!activeGame) {
      console.error("No active game selected");
      alert("No game selected!");
      return;
    }

    hasSubmittedScoreRef.current = true;

    try {
      const docRef = await addDoc(collection(db, "leaderboard"), {
        userId: user.uid,
        displayName: user.displayName || "Anonymous",
        score,
        gameId: activeGame,
        timestamp: Timestamp.fromDate(new Date()),
      });

      // Refetch leaderboard
      const q = query(
        collection(db, "leaderboard"),
        where("gameId", "==", activeGame),
        orderBy("score", "desc"),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      const leaderboardData = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          userId: data.userId,
          displayName: data.displayName,
          score: data.score,
          gameId: data.gameId,
          timestamp: data.timestamp instanceof Timestamp
            ? data.timestamp.toDate().toLocaleString()
            : new Date(data.timestamp).toLocaleString(),
        } as LeaderboardEntry;
      });
      setLeaderboard(leaderboardData);
    } catch (error) {
      hasSubmittedScoreRef.current = false;
      console.error("Error submitting score:", error);
      alert(`Failed to submit score: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-10">
        <motion.div
          animate={{
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-10 left-10 w-32 h-32 border-4 border-gray-400 rounded-full"
        />
        <motion.div
          animate={{
            rotate: -360,
            scale: [1, 0.8, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-20 right-20 w-24 h-24 border-4 border-gray-600 rounded-full"
        />
        <motion.div
          animate={{
            y: [-10, 10, -10],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-20 left-20 w-16 h-16 bg-black rounded-lg"
        />
        <motion.div
          animate={{
            x: [-10, 10, -10],
            rotate: [0, -180, -360],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-40 right-40 w-20 h-20 bg-gray-800 rounded-full"
        />
      </div>

      {/* Hero section with white theme */}
      <div className="relative z-10 bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center mb-4"
            >
              <div className="relative">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-2xl">
                  <Gamepad2 className="w-8 h-8 text-white" />
                </div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center"
                >
                  <Sparkles className="w-3 h-3 text-white" />
                </motion.div>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-4xl md:text-5xl font-bold mb-4 text-black"
            >
              <SpeechText>{t('games.hero.title')}</SpeechText>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-lg md:text-xl text-gray-600 mb-6 leading-relaxed"
            >
              <SpeechText>
                {t('games.hero.subtitle')}
              </SpeechText>
            </motion.p>

            {/* Stats Bar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-wrap justify-center gap-4 mb-6"
            >
              <div className="bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-black">{games.length}</p>
                    <p className="text-gray-600 text-xs">{t('games.stats.brainGames')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-black">
                      {isLoadingStats ? "..." : playerCount.toLocaleString()}
                    </p>
                    <p className="text-gray-600 text-xs">{t('games.stats.activePlayers')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-300 rounded-xl px-4 py-3 shadow-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-black">
                      {isLoadingStats ? "..." : totalAchievements}
                    </p>
                    <p className="text-gray-600 text-xs">{t('games.stats.gameRecords')}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="flex flex-col sm:flex-row gap-3 justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-black text-white rounded-xl font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <SpeechText>{t('games.buttons.startJourney')}</SpeechText>
                  </div>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowLeaderboard(true)}
                  className="px-6 py-3 bg-white text-black rounded-xl font-semibold text-base border border-gray-300 hover:bg-gray-50 transition-all duration-300"
                >
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4" />
                    <SpeechText>{t('games.buttons.viewLeaderboard')}</SpeechText>
                  </div>
                </motion.button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Game categories with white theme */}


      {/* Main game grid with white theme */}
      <main className="container mx-auto px-4 pb-12 flex-1 bg-gray-50">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center pt-8"
        >
          <p className="text-gray-600 text-lg">
            <SpeechText>{filteredGames.length} {t('games.gamesAvailable')}</SpeechText>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredGames.map((game, index) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              onHoverStart={() => setHoveredGame(game.id)}
              onHoverEnd={() => setHoveredGame(null)}
              className="relative bg-white rounded-2xl overflow-hidden cursor-pointer group border border-gray-200 hover:border-black transition-all duration-300 shadow-lg hover:shadow-xl"
              whileHover={{ y: -8, scale: 1.02 }}
            >
              {/* Glow effect on hover */}
              <motion.div
                className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
              />

              {/* Game image */}
              <div className="relative h-48 bg-gray-50 overflow-hidden">
                <motion.img
                  src={game.logo}
                  alt={`${game.title} Logo`}
                  className="w-full h-full object-contain p-6 transition-transform duration-300 group-hover:scale-110"
                  whileHover={{ rotate: 5 }}
                />

                {/* Floating rating badge */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  whileHover={{ scale: 1, opacity: 1 }}
                  className="absolute top-4 right-4 bg-black rounded-full px-3 py-2 flex items-center text-white text-sm font-bold shadow-xl"
                >
                  <Star className="w-4 h-4 fill-current mr-1" />
                  {game.rating}
                </motion.div>

                {/* Difficulty indicator */}
                <div className="absolute top-4 left-4 flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className={`w-2 h-2 rounded-full ${i < Math.floor(game.rating / 2)
                        ? 'bg-black'
                        : 'bg-gray-300'
                        }`}
                    />
                  ))}
                </div>

                {/* Animated sparkles */}
                <motion.div
                  animate={{
                    rotate: 360,
                    scale: [1, 1.2, 1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute bottom-4 left-4 text-black opacity-70"
                >
                  <Sparkles className="w-5 h-5" />
                </motion.div>
              </div>

              {/* Enhanced card content */}
              <div className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-xl font-bold text-black group-hover:text-gray-700 transition-colors duration-300">
                    <SpeechText>{game.title}</SpeechText>
                  </h3>
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className="text-black"
                  >
                    <Zap className="w-5 h-5" />
                  </motion.div>
                </div>

                <p className="text-gray-600 text-sm mb-4 leading-relaxed">
                  <SpeechText>{game.description}</SpeechText>
                </p>

                <div className="flex justify-between items-center">
                  <motion.span
                    whileHover={{ scale: 1.05 }}
                    className="text-xs px-3 py-2 bg-gray-100 rounded-full text-black border border-gray-200"
                  >
                    {categories.find(c => c.id === game.category)?.name}
                  </motion.span>

                  <motion.button
                    whileHover={{ scale: 1.1, rotateY: 10 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveGame(game.id)}
                    className="px-6 py-3 bg-black text-white rounded-xl text-sm font-bold flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <Play className="w-4 h-4" />
                    <span>{t('games.buttons.play')}</span>
                  </motion.button>
                </div>

                {/* Progress bar */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-600">{t('games.yourProgress')}</span>
                    <span className="text-xs text-black font-bold">{t('games.level')} {Math.floor(Math.random() * 10) + 1}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.random() * 100}%` }}
                      transition={{ duration: 1, delay: index * 0.1 }}
                      className="bg-black h-2 rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Hover overlay with additional info */}
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-6 pointer-events-none"
              >
                <div className="flex items-center space-x-4 text-white">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{t('games.gameDetails.duration')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm">+{Math.floor(Math.random() * 50) + 10} XP</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Achievement showcase */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-12 bg-white rounded-2xl p-6 border border-gray-200 shadow-lg"
          >
            <h3 className="text-2xl font-bold text-black mb-4 flex items-center">
              <Trophy className="w-6 h-6 mr-3 text-black" />
              <SpeechText>{t('games.achievements.title')}</SpeechText>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userAchievements.length > 0 ? (
                userAchievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ scale: 0.8, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200 hover:border-black transition-all duration-300"
                    title={`Unlocked: ${achievement.unlockedAt.toLocaleDateString()}`}
                  >
                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-white text-lg">{achievement.icon}</span>
                    </div>
                    <p className="text-black text-sm font-semibold">{achievement.title}</p>
                    <p className="text-gray-600 text-xs mt-1">{achievement.description}</p>
                  </motion.div>
                ))
              ) : (
                <div className="col-span-full text-center py-8">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600">{t('games.achievements.noAchievements')}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Enhanced Game modal with black/white theme */}
      <AnimatePresence>
        {activeGame && selectedGame && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative overflow-hidden border border-gray-200"
            >
              {/* Close button */}
              <div className="absolute top-6 right-6 z-20">
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setActiveGame(null)}
                  className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 text-black transition-colors border border-gray-300"
                >
                  <X className="w-6 h-6" />
                </motion.button>
              </div>

              <div className="p-8 relative z-10">
                {/* Enhanced game header */}
                <div className="flex flex-col lg:flex-row items-start space-y-6 lg:space-y-0 lg:space-x-8 mb-8">
                  <motion.div
                    initial={{ scale: 0.8, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative"
                  >
                    <div className="w-32 h-32 rounded-2xl bg-gray-100 flex items-center justify-center p-4 border-4 border-gray-300 shadow-2xl">
                      <img src={selectedGame.logo} alt={selectedGame.title} className="w-full h-full object-contain" />
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-2 -right-2 w-8 h-8 bg-black rounded-full flex items-center justify-center"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                    </motion.div>
                  </motion.div>

                  <div className="flex-1">
                    <motion.h2
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="text-4xl font-bold text-black mb-3"
                    >
                      <SpeechText>{selectedGame.title}</SpeechText>
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="text-gray-600 mb-4 text-lg leading-relaxed"
                    >
                      <SpeechText>{selectedGame.description}</SpeechText>
                    </motion.p>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                      className="flex flex-wrap items-center gap-4"
                    >
                      <div className="flex items-center bg-black text-white px-4 py-2 rounded-full font-bold">
                        <Star className="w-5 h-5 fill-current mr-2" />
                        <span>{selectedGame.rating}/5.0</span>
                      </div>

                      <div className="bg-gray-100 text-black px-4 py-2 rounded-full border border-gray-300">
                        <span className="font-semibold">
                          {categories.find(c => c.id === selectedGame.category)?.name}
                        </span>
                      </div>

                      <div className="bg-gray-100 text-black px-4 py-2 rounded-full border border-gray-300 flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>5-10 min</span>
                      </div>

                      <div className="bg-gray-800 text-white px-4 py-2 rounded-full font-bold flex items-center">
                        <Zap className="w-4 h-4 mr-2" />
                        <span>+{Math.floor(Math.random() * 50) + 20} XP</span>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Enhanced game container */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="bg-gray-50 p-6 rounded-2xl border border-gray-200 max-h-[60vh] overflow-y-auto relative"
                >
                  {/* Decorative elements */}
                  <div className="absolute top-4 left-4 flex space-x-2">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }}
                        className="w-3 h-3 bg-black rounded-full"
                      />
                    ))}
                  </div>

                  <div className="bg-white rounded-xl p-1 border border-gray-200">
                    {React.createElement(selectedGame.component, { onGameComplete: handleGameComplete })}
                  </div>
                </motion.div>

                {/* Enhanced action buttons */}
                {user && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                    className="mt-6 flex flex-wrap gap-4 justify-center"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowLeaderboard(true)}
                      className="px-6 py-3 bg-gray-100 text-black rounded-xl font-semibold flex items-center space-x-2 border border-gray-300 hover:bg-gray-200 transition-all"
                    >
                      <Medal className="w-5 h-5" />
                      <span>View Rankings</span>
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Leaderboard modal with black/white theme */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.8, y: 50, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.8, y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden border border-gray-200"
            >
              <div className="p-6 relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <motion.h3
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-2xl font-bold text-black flex items-center"
                  >
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mr-3">
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <SpeechText>
                      {activeGame
                        ? `${games.find(g => g.id === activeGame)?.title} Rankings`
                        : "Global Champions"}
                    </SpeechText>
                  </motion.h3>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowLeaderboard(false)}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-black transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                  {leaderboard.length > 0 ? (
                    leaderboard.map((entry, index) => (
                      <motion.div
                        key={`${entry.userId}-${entry.gameId}-${entry.timestamp}`}
                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.3 }}
                        className={`relative flex items-center p-4 rounded-xl transition-all duration-300 ${user && entry.userId === user.uid
                          ? 'bg-gray-100 border border-black scale-105'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                          }`}
                      >
                        {/* Position indicator */}
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 360 }}
                          transition={{ duration: 0.5 }}
                          className={`w-12 h-12 flex items-center justify-center rounded-full mr-4 font-bold text-lg ${index === 0
                            ? 'bg-black text-white'
                            : index === 1
                              ? 'bg-gray-600 text-white'
                              : index === 2
                                ? 'bg-gray-800 text-white'
                                : 'bg-gray-200 text-black'
                            }`}
                        >
                          {index < 3 ? (
                            index === 0 ? <Crown className="w-6 h-6" /> :
                              index === 1 ? <Medal className="w-6 h-6" /> :
                                <Award className="w-6 h-6" />
                          ) : (
                            index + 1
                          )}
                        </motion.div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-black font-bold truncate">
                              {entry.displayName}
                            </p>
                            {user && entry.userId === user.uid && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="bg-black text-white text-xs px-2 py-1 rounded-full font-bold"
                              >
                                YOU
                              </motion.span>
                            )}
                          </div>
                          <p className="text-gray-600 text-sm truncate flex items-center">
                            <Gamepad2 className="w-3 h-3 mr-1" />
                            {games.find(g => g.id === entry.gameId)?.title || "Unknown Game"}
                          </p>
                        </div>

                        <div className="text-right ml-3">
                          <motion.p
                            whileHover={{ scale: 1.1 }}
                            className="text-black font-bold text-xl"
                          >
                            {entry.score}
                          </motion.p>
                          <p className="text-gray-500 text-xs flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Rank-specific effects */}
                        {index < 3 && (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute -top-1 -right-1"
                          >
                            <Sparkles className="w-4 h-4 text-black" />
                          </motion.div>
                        )}
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-8 text-center"
                    >
                      <div className="w-20 h-20 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trophy className="w-10 h-10 text-black" />
                      </div>
                      <p className="text-black text-lg font-semibold mb-2">No Champions Yet!</p>
                      <p className="text-gray-600">Be the first to claim victory and start the leaderboard!</p>
                    </motion.div>
                  )}
                </div>

                {/* Call to action */}
                {leaderboard.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 pt-4 border-t border-gray-200"
                  >
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowLeaderboard(false)}
                      className="w-full px-6 py-3 bg-black text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all"
                    >
                      <SpeechText>Challenge the Champions!</SpeechText>
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
};

export default GamesPage;