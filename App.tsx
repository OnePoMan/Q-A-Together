import React, { useState, useCallback } from 'react';
import { generateQuestions } from './services/geminiService';
import { Button } from './components/Button';
import { QuestionCard } from './components/QuestionCard';
import { Sparkles, RefreshCw, ArrowLeft, BookHeart } from 'lucide-react';

const App: React.FC = () => {
  const [currentQuestions, setCurrentQuestions] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'generate' | 'favorites'>('generate');

  const handleGenerate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // We pass the entire history to avoid repeats
      const newQuestions = await generateQuestions(history);
      
      setCurrentQuestions(newQuestions);
      setHistory(prev => [...prev, ...newQuestions]);
      setHasStarted(true);
      setViewMode('generate');
      
      // Scroll to top of questions list on mobile
      if (window.innerWidth < 768) {
        const questionsElement = document.getElementById('questions-grid');
        if (questionsElement) {
          questionsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }

    } catch (err) {
      setError("Oops! We couldn't think of any questions right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [history]);

  const toggleFavorite = (question: string) => {
    setFavorites(prev => {
      if (prev.includes(question)) {
        return prev.filter(q => q !== question);
      } else {
        return [...prev, question];
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-indigo-50/30 flex flex-col">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-rose-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 cursor-pointer" 
            onClick={() => setViewMode('generate')}
          >
            <span className="text-xl font-serif font-semibold text-slate-800">Q&A Together</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode(viewMode === 'favorites' ? 'generate' : 'favorites')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all text-sm font-medium ${
                viewMode === 'favorites' 
                  ? 'bg-rose-100 text-rose-700' 
                  : 'text-slate-600 hover:bg-rose-50'
              }`}
            >
              <BookHeart className={`w-4 h-4 ${viewMode === 'favorites' ? 'fill-rose-700' : ''}`} />
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

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {viewMode === 'generate' ? (
          <>
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto mb-16">
              <div className="inline-flex items-center justify-center p-2 bg-rose-100 rounded-full mb-6">
                <Sparkles className="w-4 h-4 text-rose-600 mr-2" />
                <span className="text-xs font-bold text-rose-700 tracking-wide uppercase">AI-Powered Conversation Starters</span>
              </div>
              
              <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-semibold text-slate-900 mb-6 leading-tight whitespace-nowrap">
                Welcome to Q&A Together!
              </h1>
              
              <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
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
                <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
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
                    onToggleFavorite={() => toggleFavorite(q)}
                  />
                ))}
              </div>
            )}

            {/* Empty State (Before start) */}
            {!hasStarted && !isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40 pointer-events-none grayscale blur-[1px] select-none">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="h-48 bg-white rounded-2xl border border-slate-200 p-8 flex flex-col justify-between">
                     <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                     <div className="space-y-3">
                       <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                       <div className="h-4 bg-slate-200 rounded w-1/2"></div>
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
                 <h2 className="text-3xl font-serif font-semibold text-slate-900 mb-2">Your Collection</h2>
                 <p className="text-slate-600">Questions you've saved for later.</p>
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
                     onToggleFavorite={() => toggleFavorite(q)}
                   />
                 ))}
               </div>
             ) : (
               <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                 <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-50 rounded-full mb-4">
                   <BookHeart className="w-8 h-8 text-slate-300" />
                 </div>
                 <h3 className="text-lg font-medium text-slate-900 mb-1">No favorites yet</h3>
                 <p className="text-slate-500 max-w-xs mx-auto mb-6">
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

      <footer className="py-8 border-t border-slate-100 bg-white text-center">
        <p className="text-slate-400 text-sm">
          Built with Gemini 2.5 Flash & React
        </p>
      </footer>

      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation-name: fade-in-up;
          animation-duration: 0.6s;
          animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
        
        @keyframes heart-bounce {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1.1); }
        }
        .animate-heart-bounce {
          animation: heart-bounce 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>
    </div>
  );
};

export default App;