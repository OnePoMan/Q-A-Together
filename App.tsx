import React, { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, BookHeart, Heart, LayoutGrid, Layers, Play, Settings, Shuffle, Sparkles } from 'lucide-react';
import { fetchQuestions, getOfflineQuestions } from './services/questionService';
import { Button } from './components/Button';
import { LoadingDeck } from './components/LoadingDeck';
import { OfflineBanner } from './components/OfflineBanner';
import { PlayStage } from './components/PlayStage';
import { QuestionCard } from './components/QuestionCard';
import { SettingsDialog } from './components/SettingsDialog';
import { Toast } from './components/Toast';
import { VibePicker } from './components/VibePicker';
import { VIBE_STYLES } from './components/vibeMeta';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useTheme } from './hooks/useTheme';
import { readJson } from './lib/storage';
import { DEFAULT_VIBE, getVibe, isVibeId, normalizeQuestion, type Question, type VibeId } from './shared/vibes';
import type { PlayLayout, View } from './types';
import { tapMedium, tapShort } from './utils/haptics';

interface Deck {
  vibe: VibeId;
  questions: Question[];
  index: number;
  label?: string;
}

const MAX_HISTORY = 600;
const MAX_ANSWERED = 1500;

/** v1 stored favorites as plain strings under qa-favorites. */
const loadSaved = (): Question[] => {
  const legacy = readJson<unknown>('qa-favorites', null);
  return Array.isArray(legacy)
    ? legacy.filter((t): t is string => typeof t === 'string').map(text => ({ text, category: '' }))
    : [];
};

const trimRecord = <T,>(record: Record<string, T>, max: number): Record<string, T> => {
  const entries = Object.entries(record);
  return entries.length > max ? Object.fromEntries(entries.slice(-max)) : record;
};

const App: React.FC = () => {
  const [storedVibe, setVibe] = useLocalStorage<VibeId>('qa-vibe', DEFAULT_VIBE);
  const vibe = isVibeId(storedVibe) ? storedVibe : DEFAULT_VIBE;
  const [history, setHistory] = useLocalStorage<string[]>('qa-history', []);
  const [saved, setSaved] = useLocalStorage<Question[]>('qa-saved', loadSaved);
  const [answered, setAnswered] = useLocalStorage<Record<string, boolean>>('qa-answered', {});
  const [deck, setDeck] = useLocalStorage<Deck | null>('qa-deck', null);
  const [names, setNames] = useLocalStorage<[string, string]>('qa-names', ['', '']);
  const [layout, setLayout] = useLocalStorage<PlayLayout>('qa-layout', 'card');

  const [view, setView] = useState<View>('home');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isOnline = useOnlineStatus();
  const { preference: theme, setPreference: setTheme } = useTheme();
  const install = useInstallPrompt();

  const savedKeys = useMemo(() => new Set(saved.map(q => normalizeQuestion(q.text))), [saved]);
  const isSaved = useCallback((q: Question) => savedKeys.has(normalizeQuestion(q.text)), [savedKeys]);
  const clearToast = useCallback(() => setToast(null), []);

  const validDeck = deck && isVibeId(deck.vibe) && Array.isArray(deck.questions) && deck.questions.length > 0 ? deck : null;
  const deckInProgress = validDeck && validDeck.index < validDeck.questions.length ? validDeck : null;

  const deal = useCallback(
    async (nextVibe: VibeId = vibe) => {
      if (isLoading) return;
      setIsLoading(true);
      setError(null);
      setView('play');
      tapMedium();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      let questions: Question[] = [];
      let note: string | null = null;
      if (isOnline) {
        try {
          questions = await fetchQuestions(nextVibe, history);
        } catch (err) {
          questions = getOfflineQuestions(nextVibe, history);
          const reason = err instanceof Error ? err.message : "Couldn't reach the AI.";
          note = questions.length ? `${reason} Dealt from saved and built-in questions instead.` : reason;
        }
      } else {
        questions = getOfflineQuestions(nextVibe, history);
      }

      if (questions.length === 0) {
        setError(note ?? 'No questions available right now. Try again when you are online.');
        setView('home');
      } else {
        setDeck({ vibe: nextVibe, questions, index: 0 });
        setHistory(prev => {
          const seen = new Set(prev.map(normalizeQuestion));
          const fresh = questions.map(q => q.text).filter(t => !seen.has(normalizeQuestion(t)));
          return [...prev, ...fresh].slice(-MAX_HISTORY);
        });
        if (note) setToast(note);
      }
      setIsLoading(false);
    },
    [vibe, isLoading, isOnline, history, setDeck, setHistory],
  );

  const toggleSaved = (q: Question) => {
    const key = normalizeQuestion(q.text);
    const removing = savedKeys.has(key);
    setSaved(prev => (removing ? prev.filter(s => normalizeQuestion(s.text) !== key) : [...prev, q]));
    setToast(removing ? 'Removed from saved' : 'Saved');
  };

  const setAnsweredFor = (q: Question, value: boolean) =>
    setAnswered(prev => {
      if (!!prev[q.text] === value) return prev;
      const next = { ...prev };
      if (value) next[q.text] = true;
      else delete next[q.text];
      return trimRecord(next, MAX_ANSWERED);
    });

  const share = async (q: Question) => {
    tapShort();
    const url = window.location.origin;
    const text = `"${q.text}"\n\nFrom Q&A Together`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Q&A Together', text, url });
      } else {
        await navigator.clipboard.writeText(`${text}: ${url}`);
        setToast('Copied to clipboard');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') setToast("Couldn't share that one");
    }
  };

  const playSaved = () => {
    const shuffled = [...saved].sort(() => Math.random() - 0.5);
    setDeck({ vibe: 'mix', questions: shuffled, index: 0, label: 'Saved' });
    setLayout('card');
    setView('play');
  };

  const deckAnsweredCount = validDeck ? validDeck.questions.filter(q => answered[q.text]).length : 0;

  return (
    <div className="min-h-dvh flex flex-col bg-radial-[ellipse_at_top] from-rose-100/70 via-rose-50/40 to-slate-50 dark:from-rose-950/30 dark:via-slate-950 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg dark:focus:bg-slate-800"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-rose-100/60 dark:border-slate-800/80 bg-white/75 dark:bg-slate-950/75 backdrop-blur-lg pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setView('home')}
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30">
              <Heart className="h-4 w-4 fill-white" aria-hidden />
            </span>
            <span className="font-serif text-xl font-semibold">Q&amp;A Together</span>
          </button>

          <nav className="flex items-center gap-1" aria-label="Main">
            <button
              type="button"
              onClick={() => setView(view === 'saved' ? (validDeck ? 'play' : 'home') : 'saved')}
              aria-current={view === 'saved' ? 'page' : undefined}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                view === 'saved'
                  ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-800'
              }`}
            >
              <BookHeart className="h-4 w-4" aria-hidden />
              <span>Saved</span>
              {saved.length > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums">
                  {saved.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                tapShort();
                setSettingsOpen(true);
              }}
              aria-label="Settings"
              className="rounded-full p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Settings className="h-5 w-5" aria-hidden />
            </button>
          </nav>
        </div>
      </header>

      {!isOnline && <OfflineBanner />}

      <main id="main" className="mx-auto w-full max-w-6xl flex-grow px-4 sm:px-6 pt-8 sm:pt-12 pb-[calc(3rem+env(safe-area-inset-bottom))]">
        {view === 'home' && (
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center animate-fade-in-up">
              <span className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-rose-100/80 dark:bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Conversation starters for two
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold leading-[1.1] text-balance">
                Ask better questions, <em className="text-rose-500">together.</em>
              </h1>
              <p className="mx-auto mt-5 max-w-lg text-base sm:text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                Pick a vibe and get 20 fresh questions for date nights, walks and long drives. No repeats.
              </p>
            </div>

            {deckInProgress && (
              <button
                type="button"
                onClick={() => setView('play')}
                className="mb-6 flex w-full items-center gap-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 animate-fade-in-up"
              >
                <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${VIBE_STYLES[deckInProgress.vibe].tile}`}>
                  <Play className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold">Pick up where you left off</span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    {deckInProgress.label ?? getVibe(deckInProgress.vibe).label} · question {deckInProgress.index + 1} of{' '}
                    {deckInProgress.questions.length}
                  </span>
                </span>
              </button>
            )}

            <h2 className="mb-3 font-sans text-sm font-semibold text-slate-700 dark:text-slate-300">Choose a vibe</h2>
            <VibePicker value={vibe} onChange={setVibe} />

            {error && (
              <div role="alert" className="mt-6 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            <div className="sticky bottom-0 z-10 -mx-4 mt-6 bg-linear-to-t from-slate-50 via-slate-50/90 to-transparent px-4 pt-6 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:from-slate-950 dark:via-slate-950/90 sm:static sm:mx-0 sm:bg-none sm:p-0 sm:pt-2">
              <Button size="lg" onClick={() => deal()} isLoading={isLoading} className="w-full">
                {!isLoading && <Sparkles className="h-5 w-5" aria-hidden />}
                Deal 20 {getVibe(vibe).label} questions
              </Button>
            </div>
          </div>
        )}

        {view === 'play' && (
          <div>
            <div className="mx-auto mb-6 flex max-w-xl items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setView('home')} className="px-3! -ml-3">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Vibes
              </Button>
              <div className="flex items-center gap-1">
                <div role="radiogroup" aria-label="Layout" className="flex rounded-full bg-slate-100 dark:bg-slate-800 p-1">
                  {(
                    [
                      ['card', Layers, 'One at a time'],
                      ['list', LayoutGrid, 'All questions'],
                    ] as const
                  ).map(([id, Icon, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={layout === id}
                      aria-label={label}
                      title={label}
                      onClick={() => setLayout(id)}
                      className={`rounded-full p-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                        layout === id ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </button>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => deal(validDeck?.label ? vibe : validDeck?.vibe ?? vibe)}
                  disabled={isLoading}
                  className="px-3!"
                  aria-label="Deal a new deck"
                  title="Deal a new deck"
                >
                  <Shuffle className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">New deck</span>
                </Button>
              </div>
            </div>

            {isLoading || !validDeck ? (
              isLoading ? (
                <LoadingDeck />
              ) : (
                <div className="text-center">
                  <Button size="lg" onClick={() => deal()}>
                    <Sparkles className="h-5 w-5" aria-hidden />
                    Deal questions
                  </Button>
                </div>
              )
            ) : layout === 'card' ? (
              <PlayStage
                questions={validDeck.questions}
                index={Math.min(validDeck.index, validDeck.questions.length)}
                vibe={validDeck.vibe}
                names={names}
                isSaved={isSaved}
                answeredCount={deckAnsweredCount}
                isLoading={isLoading}
                onIndexChange={index => setDeck(prev => (prev ? { ...prev, index } : prev))}
                onAnswered={q => setAnsweredFor(q, true)}
                onToggleSaved={toggleSaved}
                onShare={share}
                onDealMore={() => deal(validDeck.label ? vibe : validDeck.vibe)}
                onChangeVibe={() => setView('home')}
                onEditNames={() => setSettingsOpen(true)}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {validDeck.questions.map((q, i) => (
                    <QuestionCard
                      key={`${i}-${q.text}`}
                      question={q}
                      index={i}
                      isSaved={isSaved(q)}
                      isAnswered={!!answered[q.text]}
                      onToggleSaved={() => toggleSaved(q)}
                      onToggleAnswered={() => setAnsweredFor(q, !answered[q.text])}
                      onShare={() => share(q)}
                    />
                  ))}
                </div>
                <div className="mt-10 text-center">
                  <Button size="lg" onClick={() => deal(validDeck.label ? vibe : validDeck.vibe)} isLoading={isLoading}>
                    {!isLoading && <Sparkles className="h-5 w-5" aria-hidden />}
                    Deal 20 more
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {view === 'saved' && (
          <div>
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="font-serif text-3xl sm:text-4xl font-semibold">Saved questions</h1>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  {saved.length ? `${saved.length} favorite${saved.length === 1 ? '' : 's'} to come back to.` : 'Your favorites will live here.'}
                </p>
              </div>
              {saved.length > 0 && (
                <Button onClick={playSaved} className="self-start sm:self-auto">
                  <Play className="h-4 w-4" aria-hidden />
                  Play these
                </Button>
              )}
            </div>

            {saved.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...saved].reverse().map((q, i) => (
                  <QuestionCard
                    key={q.text}
                    question={q}
                    index={i}
                    isSaved
                    isAnswered={!!answered[q.text]}
                    onToggleSaved={() => toggleSaved(q)}
                    onToggleAnswered={() => setAnsweredFor(q, !answered[q.text])}
                    onShare={() => share(q)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 px-6 py-16 text-center">
                <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/10">
                  <Heart className="h-7 w-7 text-rose-300 dark:text-rose-400/60" aria-hidden />
                </span>
                <h2 className="mb-1 text-lg font-semibold">Nothing saved yet</h2>
                <p className="mx-auto mb-6 max-w-xs text-slate-500 dark:text-slate-400">
                  Tap the heart on any question to keep it for another night.
                </p>
                <Button onClick={() => setView(validDeck ? 'play' : 'home')}>Find questions</Button>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200/60 dark:border-slate-800/80 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center text-xs text-slate-400 dark:text-slate-500">
        Made for curious couples · Questions by Google Gemini
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        names={names}
        onNamesChange={setNames}
        theme={theme}
        onThemeChange={setTheme}
        historyCount={history.length}
        savedCount={saved.length}
        onResetHistory={() => {
          setHistory([]);
          setToast('Seen questions reset');
        }}
        onClearSaved={() => {
          setSaved([]);
          setToast('Saved questions cleared');
        }}
        onInstall={install}
      />

      <Toast message={toast} onClose={clearToast} />
    </div>
  );
};

export default App;
