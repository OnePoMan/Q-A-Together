import React, { useState, useCallback } from 'react';
import { generateQuestions, getCachedQuestions } from './services/geminiService';
import { Button } from './components/Button';
import { QuestionCard } from './components/QuestionCard';
import { OfflineBanner } from './components/OfflineBanner';
import { Toast } from './components/Toast';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useDarkMode } from './hooks/useDarkMode';
import { tapMedium, tapShort, tapDouble } from './utils/haptics';
import { Sparkles, RefreshCw, ArrowLeft, BookHeart, Moon, Sun } from 'lucide-react';

const App: React.FC = () => {
  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  const [history, setHistory] = useLocalStorage<string[]>('qa-history', []);
  const [favorites, setFavorites] = useLocalStorage<string[]>('qa-favorites', []);
  const [answeredMap, setAnsweredMap] = useLocalStorage<Record<string, boolean>>('qa-answered', {});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'generate' | 'favorites'>('generate');
  const [toast, setToast] = useState<string | null>(null);

  const isOnline = useOnlineStatus();
  const [isDark, toggleDark] = useDarkMode();

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    tapMedium();
    try {
      let newQuestions: string[];
      if (isOnline) {
        newQuestions = await generateQuestions(history);
      } else {
        newQuestions = getCachedQuestions(20, currentQuestions);
        if (newQuestions.length === 0) {
          setError("You're offline and no cached questions are available. Go online to generate new ones.");
          setIsLoading(false);
          return;
        }
      }

      setCurrentQuestions(newQuestions);
      setHistory(prev => [...prev, ...newQuestions]);
      setHasStarted(true);
      setViewMode('generate');

      if (window.innerWidth < 768) {
        const questionsElement = document.getElementById('questions-grid');
        if (questionsElement) {
          questionsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } catch (err) {
      // Fallback to cache on network error
      const cached = getCachedQuestions(20, currentQuestions);
      if (cached.length > 0) {
        setCurrentQuestions(cached);
        setHasStarted(true);
        setViewMode('generate');
      } else {
        const detail = err instanceof Error ? err.message : '';
        setError(`Couldn't generate questions. ${detail || 'Check your connection and try again.'}`);
      }
    } finally {
      setIsLoading(false);
    }
  }, [history, isOnline, currentQuestions, setHistory]);

  const toggleFavorite = (question: string) => {
    tapDouble();
    setFavorites(prev => {
      if (prev.includes(question)) {
        return prev.filter(q => q !== question);
      } else {
        return [...prev, question];
      }
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex flex-col transition-colors duration-300 pb-[env(safe-area-inset-bottom)]">

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-rose-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => setViewMode('generate')}
          >
            <span className="text-xl font-serif font-semibold text-slate-800 dark:text-slate-100">Q&A Together</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDarkToggle}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'favorites' ? 'generate' : 'favorites')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${
                viewMode === 'favorites'
                  ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-slate-800'
              }`}
            >
              <BookHeart className={`w-4 h-4 ${viewMode === 'favorites' ? 'fill-rose-700 dark:fill-rose-300' : ''}`} />
              <span>Favorites</span>
              {favorites.length > 0 && (
                <span className="ml-1 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
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

        {viewMode === 'generate' ? (
          <>
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center justify-center p-2 bg-rose-100 dark:bg-rose-900/40 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-rose-600 dark:text-rose-400 mr-2" />
                <span className="text-xs font-bold text-rose-700 dark:text-rose-300 tracking-wide uppercase">AI-Powered Conversation Starters</span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-semibold text-slate-900 dark:text-slate-100 mb-6 leading-tight">
                Welcome to Q&A Together!
              </h1>

              <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                Generate 20 unique, fun, and thought-provoking questions instantly.
                No repeats, just pure connection. Perfect for date nights or long drives.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  onClick={handleGenerate}
                  isLoading={isLoading}
                  className="w-full sm:w-auto shadow-rose-200 hover:shadow-rose-300"
                >
                  {hasStarted ? (
                    <>
                      <RefreshCw className={`w-5 h-5 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                      Generate Next 20
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Start Asking
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Questions Grid */}
            {currentQuestions.length > 0 && (
              <div id="questions-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                {currentQuestions.map((q, idx) => (
                  <QuestionCard
                    key={`${q}-${idx}`}
                    text={q}
                    index={idx}
                    isFavorite={favorites.includes(q)}
                    isAnswered={!!answeredMap[q]}
                    onToggleFavorite={() => toggleFavorite(q)}
                    onToggleAnswered={() => toggleAnswered(q)}
                    onShare={() => handleShare(q)}
                  />
                ))}
              </div>
            )}

            {/* Empty State (Before start) */}
            {!hasStarted && !isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40 pointer-events-none grayscale blur-[1px] select-none">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="h-48 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 flex flex-col justify-between">
                     <div className="w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full"></div>
                     <div className="space-y-3">
                       <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4"></div>
                       <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-1/2"></div>
                     </div>
                   </div>
                 ))}
              </div>
            )}
          </>
        ) : (
          // Favorites View
          <div className="max-w-7xl mx-auto">
             <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
               <div>
                 <h2 className="text-3xl font-serif font-semibold text-slate-900 dark:text-slate-100 mb-2">Your Collection</h2>
                 <p className="text-slate-600 dark:text-slate-400">Questions you've saved for later.</p>
               </div>
               <Button
                 variant="secondary"
                 onClick={() => setViewMode('generate')}
                 className="self-start sm:self-center"
               >
                 <ArrowLeft className="w-4 h-4 mr-2" />
                 Back to Questions
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
               <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
                 <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full mb-4">
                   <BookHeart className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">No favorites yet</h3>
                 <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mb-6">
                   Heart questions you love to save them to your personal collection.
                 </p>
                 <Button variant="primary" onClick={() => setViewMode('generate')}>
                   Discover Questions
                 </Button>
               </div>
             )}
          </div>
        )}

      </main>

      <footer className="py-8 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 text-center transition-colors duration-300">
        <p className="text-slate-400 dark:text-slate-500 text-sm">
          Built with Gemini 2.5 Flash & React
        </p>
      </footer>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;
