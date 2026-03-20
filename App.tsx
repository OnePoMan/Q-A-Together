import React, { useState, useCallback, useEffect } from 'react';
import { generateQuestions, getCachedQuestions } from './services/geminiService';
import { Button } from './components/Button';
import { QuestionCard } from './components/QuestionCard';
import { CardDeck } from './components/CardDeck';
import { MoodSelector } from './components/MoodSelector';
import { MusicToggle } from './components/MusicToggle';
import { RoomManager } from './components/RoomManager';
import { OfflineBanner } from './components/OfflineBanner';
import { Toast } from './components/Toast';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useDarkMode } from './hooks/useDarkMode';
import { useBackgroundMusic } from './hooks/useBackgroundMusic';
import { useRoom } from './hooks/useRoom';
import { tapMedium, tapShort, tapDouble } from './utils/haptics';
import type { Mood, Topic } from './types';
import { Sparkles, RefreshCw, ArrowLeft, BookHeart, Moon, Sun, Users, X } from 'lucide-react';

type ViewMode = 'landing' | 'mood-select' | 'deck' | 'favorites';

const App: React.FC = () => {
  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  const [history, setHistory] = useLocalStorage<string[]>('qa-history', []);
  const [favorites, setFavorites] = useLocalStorage<string[]>('qa-favorites', []);
  const [answeredMap, setAnsweredMap] = useLocalStorage<Record<string, boolean>>('qa-answered', {});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('landing');
  const [toast, setToast] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRoomManager, setShowRoomManager] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const isOnline = useOnlineStatus();
  const [isDark, toggleDark] = useDarkMode();
  const music = useBackgroundMusic('/ambient-loop.mp3');
  const roomHook = useRoom();

  // Handle room code from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode) {
      roomHook.joinRoom(roomCode).then((data) => {
        if (data) {
          setCurrentQuestions(data.questions);
          setCurrentIndex(data.currentIndex);
          setViewMode('deck');
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        }
      });
    }
  }, []);

  // Sync room index
  useEffect(() => {
    if (roomHook.room && roomHook.isConnected) {
      setCurrentIndex(roomHook.room.currentIndex);
    }
  }, [roomHook.room?.currentIndex]);

  const handleStartClick = () => {
    tapMedium();
    setViewMode('mood-select');
  };

  const handleGenerate = useCallback(async (mood: Mood, topics: Topic[]) => {
    setIsLoading(true);
    setError(null);
    tapMedium();
    try {
      let newQuestions: string[];
      if (isOnline) {
        newQuestions = await generateQuestions(history, mood, topics);
      } else {
        newQuestions = getCachedQuestions(20, currentQuestions);
        if (newQuestions.length === 0) {
          setError("You're offline and no cached questions are available.");
          setIsLoading(false);
          return;
        }
      }

      setCurrentQuestions(newQuestions);
      setHistory(prev => [...prev, ...newQuestions]);
      setCurrentIndex(0);
      setViewMode('deck');
    } catch (err) {
      const cached = getCachedQuestions(20, currentQuestions);
      if (cached.length > 0) {
        setCurrentQuestions(cached);
        setCurrentIndex(0);
        setViewMode('deck');
      } else {
        const detail = err instanceof Error ? err.message : '';
        setError(`Couldn't generate questions. ${detail || 'Check your connection and try again.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [history, isOnline, currentQuestions, setHistory]);

  const handleIndexChange = (index: number) => {
    setCurrentIndex(index);
    if (roomHook.isConnected) {
      roomHook.updateIndex(index);
    }
  };

  const toggleFavorite = (question: string) => {
    tapDouble();
    setFavorites(prev =>
      prev.includes(question)
        ? prev.filter(q => q !== question)
        : [...prev, question]
    );
  };

  const toggleAnswered = (question: string) => {
    setAnsweredMap(prev => ({
      ...prev,
      [question]: !prev[question],
    }));
  };

  const handleShare = async (question: string) => {
    tapShort();
    const shareData = { title: 'Q&A Together', text: question };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(question);
        setToast('Copied to clipboard!');
      }
    } catch {
      // User cancelled share or clipboard failed
    }
  };

  const handleDarkToggle = () => {
    tapShort();
    toggleDark();
  };

  const handleCreateRoom = async () => {
    if (currentQuestions.length === 0) {
      setToast('Generate questions first, then create a room');
      return;
    }
    setIsCreatingRoom(true);
    await roomHook.createRoom(currentQuestions, 'random', []);
    setIsCreatingRoom(false);
  };

  const handleJoinRoom = async (code: string) => {
    const data = await roomHook.joinRoom(code);
    if (data) {
      setCurrentQuestions(data.questions);
      setCurrentIndex(data.currentIndex);
      setViewMode('deck');
      setShowRoomManager(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 via-orange-50/30 to-yellow-50/20 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 flex flex-col transition-colors duration-300 pb-[env(safe-area-inset-bottom)]">

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-amber-50/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-amber-200/50 dark:border-stone-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => {
              if (viewMode === 'favorites') setViewMode(currentQuestions.length > 0 ? 'deck' : 'landing');
            }}
          >
            <span className="text-xl font-serif font-semibold text-stone-800 dark:text-stone-100">Q&A Together</span>
          </div>
          <div className="flex items-center space-x-1">
            {/* Room indicator */}
            {roomHook.isConnected && roomHook.room && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-mono font-bold mr-1">
                <Users className="w-3 h-3" />
                {roomHook.room.code}
                <button onClick={roomHook.leaveRoom} className="ml-1 hover:text-red-500 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            <MusicToggle isPlaying={music.isPlaying} onToggle={music.toggle} />

            <button
              onClick={handleDarkToggle}
              className="p-2 rounded-full text-stone-500 dark:text-stone-400 hover:bg-amber-50 dark:hover:bg-stone-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setViewMode(viewMode === 'favorites' ? (currentQuestions.length > 0 ? 'deck' : 'landing') : 'favorites')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${
                viewMode === 'favorites'
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-amber-50 dark:hover:bg-stone-800'
              }`}
            >
              <BookHeart className={`w-4 h-4 ${viewMode === 'favorites' ? 'fill-amber-700 dark:fill-amber-300' : ''}`} />
              <span>Favorites</span>
              {favorites.length > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {favorites.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isOnline && <OfflineBanner />}

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* ===== LANDING PAGE ===== */}
        {viewMode === 'landing' && (
          <div className="text-center max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
            {/* Ambient glow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <div className="w-96 h-96 rounded-full bg-amber-200/30 dark:bg-amber-800/10 blur-3xl animate-gentle-glow" />
            </div>

            <h1 className="relative text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-semibold text-stone-800 dark:text-stone-100 mb-4 leading-tight">
              Q&A Together
            </h1>

            <p className="relative text-lg sm:text-xl font-card italic text-amber-700/70 dark:text-amber-400/60 mb-12">
              Spark something real.
            </p>

            <div className="relative flex flex-col sm:flex-row items-center gap-4">
              <Button onClick={handleStartClick} className="w-full sm:w-auto">
                <Sparkles className="w-5 h-5 mr-2" />
                Start
              </Button>
              <button
                onClick={() => setShowRoomManager(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-stone-500 dark:text-stone-400 hover:bg-white/60 dark:hover:bg-stone-800/60 transition-all border border-stone-200/50 dark:border-stone-700/50"
              >
                <Users className="w-4 h-4" />
                Play Together
              </button>
            </div>

            {error && (
              <div className="relative mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>
        )}

        {/* ===== MOOD SELECTOR ===== */}
        {viewMode === 'mood-select' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <MoodSelector onGenerate={handleGenerate} isLoading={isLoading} />
            <button
              onClick={() => setViewMode('landing')}
              className="mt-6 text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {/* ===== CARD DECK ===== */}
        {viewMode === 'deck' && currentQuestions.length > 0 && (
          <div className="flex flex-col items-center">
            {/* Compact top bar */}
            <div className="w-full max-w-lg mx-auto flex items-center justify-between mb-8">
              <button
                onClick={() => setViewMode('mood-select')}
                className="inline-flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                New deck
              </button>
              {!roomHook.isConnected && (
                <button
                  onClick={() => setShowRoomManager(true)}
                  className="inline-flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
                >
                  <Users className="w-4 h-4" />
                  Share
                </button>
              )}
            </div>

            <CardDeck
              questions={currentQuestions}
              favorites={favorites}
              answeredMap={answeredMap}
              onToggleFavorite={toggleFavorite}
              onToggleAnswered={toggleAnswered}
              onShare={handleShare}
              currentIndex={currentIndex}
              onIndexChange={handleIndexChange}
            />
          </div>
        )}

        {/* ===== FAVORITES VIEW ===== */}
        {viewMode === 'favorites' && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-3xl font-serif font-semibold text-stone-800 dark:text-stone-100 mb-2">Your Collection</h2>
                <p className="text-stone-500 dark:text-stone-400">Questions you've saved for later.</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => setViewMode(currentQuestions.length > 0 ? 'deck' : 'landing')}
                className="self-start sm:self-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>

            {favorites.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {favorites.map((q, idx) => (
                  <QuestionCard
                    key={`fav-${q}`}
                    text={q}
                    index={idx}
                    isFavorite={true}
                    isAnswered={!!answeredMap[q]}
                    onToggleFavorite={() => toggleFavorite(q)}
                    onToggleAnswered={() => toggleAnswered(q)}
                    onShare={() => handleShare(q)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white dark:bg-stone-800 rounded-3xl border border-amber-100 dark:border-stone-700 border-dashed">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-50 dark:bg-stone-700 rounded-full mb-4">
                  <BookHeart className="w-8 h-8 text-stone-300 dark:text-stone-500" />
                </div>
                <h3 className="text-lg font-medium text-stone-800 dark:text-stone-100 mb-1">No favorites yet</h3>
                <p className="text-stone-500 dark:text-stone-400 max-w-xs mx-auto mb-6">
                  Heart questions you love to save them here.
                </p>
                <Button variant="primary" onClick={() => setViewMode(currentQuestions.length > 0 ? 'deck' : 'landing')}>
                  Discover Questions
                </Button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-8 border-t border-amber-100 dark:border-stone-700 bg-amber-50/50 dark:bg-stone-900 text-center transition-colors duration-300">
        <p className="text-stone-400 dark:text-stone-500 text-sm">
          Built with Gemini 3 Flash & React
        </p>
      </footer>

      {/* Room Manager Modal */}
      {showRoomManager && (
        <RoomManager
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          isCreating={isCreatingRoom}
          roomCode={roomHook.room?.code || null}
          roomError={roomHook.error}
          onClose={() => setShowRoomManager(false)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;
