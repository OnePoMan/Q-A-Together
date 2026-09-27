import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookHeart, BookOpen, Heart, LayoutGrid, Layers, Play, Settings, Shuffle, Sparkles, Users } from 'lucide-react';
import { buildDeck } from './services/questionService';
import { AgeGateDialog } from './components/AgeGateDialog';
import { CooldownNotice } from './components/CooldownNotice';
import { JournalDialog } from './components/JournalDialog';
import { MemoriesView } from './components/MemoriesView';
import { MoveBanner } from './components/MoveBanner';
import { IMPORTED_FLAG } from './lib/transfer';
import { ShareDialog } from './components/ShareDialog';
import { Button } from './components/Button';
import { LoadingDeck } from './components/LoadingDeck';
import { OfflineBanner } from './components/OfflineBanner';
import { PlayStage } from './components/PlayStage';
import { QuestionCard } from './components/QuestionCard';
import { RoomDialog } from './components/RoomDialog';
import { SettingsDialog } from './components/SettingsDialog';
import { Toast } from './components/Toast';
import { VibePicker } from './components/VibePicker';
import { VIBE_STYLES } from './components/vibeMeta';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { useRoom, type RoomDeck } from './hooks/useRoom';
import { useTheme } from './hooks/useTheme';
import { useDisplayMode } from './hooks/useDisplayMode';
import { useWakeLock } from './hooks/useWakeLock';
import { MAX_JOURNAL_ENTRIES, hasAnswers, type Journal } from './lib/journal';
import { APP_NAME, APP_URL } from './shared/brand';
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
const MAX_HISTORY_PER_VIBE = 150;
const MAX_LOCAL_HISTORY = 200;
const MAX_DISLIKED = 100;
const MAX_ANSWERED = 1500;

const appendUnique = (list: readonly string[], texts: readonly string[], max: number) => {
  const seen = new Set(list.map(normalizeQuestion));
  const fresh = texts.filter(t => !seen.has(normalizeQuestion(t)));
  return [...list, ...fresh].slice(-max);
};

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
  const [historyByVibe, setHistoryByVibe] = useLocalStorage<Partial<Record<VibeId, string[]>>>('qa-history-vibe', {});
  // 18+ hand-written cards: tracked separately and never sent to the server.
  const [localHistory, setLocalHistory] = useLocalStorage<string[]>('qa-history-local', []);
  const [disliked, setDisliked] = useLocalStorage<Question[]>('qa-disliked', []);
  const [adultOk, setAdultOk] = useLocalStorage<boolean>('qa-adult-ok', false);
  const [journal, setJournal] = useLocalStorage<Journal>('qa-journal', {});
  const [cooldownUntil, setCooldownUntil] = useLocalStorage<number | null>('qa-cooldown-until', null);
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
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [roomOpen, setRoomOpen] = useState(false);
  const [journalTarget, setJournalTarget] = useState<Question | null>(null);
  const [shareTarget, setShareTarget] = useState<Question | null>(null);

  const isOnline = useOnlineStatus();
  const { preference: theme, setPreference: setTheme } = useTheme();
  const { preference: display, setPreference: setDisplay, isPhone, isPortrait } = useDisplayMode();
  const install = useInstallPrompt();

  const savedKeys = useMemo(() => new Set(saved.map(q => normalizeQuestion(q.text))), [saved]);
  const isSaved = useCallback((q: Question) => savedKeys.has(normalizeQuestion(q.text)), [savedKeys]);
  const clearToast = useCallback(() => setToast(null), []);

  const room = useRoom(
    (remote: RoomDeck) => {
      setDeck(remote);
      setView('play');
    },
    message => setToast(message),
  );

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

      const { questions, notice, retryAt } = await buildDeck(nextVibe, {
        isOnline,
        cooldownUntil,
        history,
        historyByVibe,
        localHistory,
        saved,
        disliked,
      });

      if (questions.length === 0) {
        setError(notice ?? 'No questions available right now. Try again when you are online.');
        setView('home');
      } else {
        const next = { vibe: nextVibe, questions, index: 0 };
        setDeck(next);
        const shared = questions.filter(q => !q.local).map(q => q.text);
        setHistory(prev => appendUnique(prev, shared, MAX_HISTORY));
        setHistoryByVibe(prev => ({ ...prev, [nextVibe]: appendUnique(prev[nextVibe] ?? [], shared, MAX_HISTORY_PER_VIBE) }));
        setLocalHistory(prev =>
          appendUnique(
            prev,
            questions.filter(q => q.local).map(q => q.text),
            MAX_LOCAL_HISTORY,
          ),
        );
        if (room.code) room.pushDeck(next);
        // A rate-limit notice is shown with a live countdown instead of a toast.
        if (retryAt) setCooldownUntil(retryAt);
        else if (notice) setToast(notice);
      }
      setIsLoading(false);
    },
    [vibe, isLoading, isOnline, cooldownUntil, setCooldownUntil, history, historyByVibe, localHistory, saved, disliked, room, setDeck, setHistory, setHistoryByVibe, setLocalHistory],
  );

  const setDeckIndex = (index: number) => {
    setDeck(prev => (prev ? { ...prev, index } : prev));
    if (room.code) room.pushIndex(index);
  };

  const chooseVibe = (next: VibeId) => {
    if (getVibe(next).adult && !adultOk) {
      setAgeGateOpen(true);
      return;
    }
    setVibe(next);
  };

  const dislike = (q: Question) => {
    setDisliked(prev => [...prev.filter(d => d.text !== q.text), q].slice(-MAX_DISLIKED));
    setToast('Got it. Fewer like that.');
  };

  // Join a room from an invite link (?room=CODE), then tidy the URL.
  const joinedFromLink = useRef(false);
  useEffect(() => {
    if (joinedFromLink.current) return;
    joinedFromLink.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (!code) return;
    window.history.replaceState(null, '', window.location.pathname);
    room
      .join(code)
      .then(() => setToast('Joined the room'))
      .catch(err => setToast(err instanceof Error ? err.message : "Couldn't join that room"));
  }, [room]);

  const shareInvite = async (url: string) => {
    const text = `Join me on ${APP_NAME}`;
    try {
      if (navigator.share) await navigator.share({ title: APP_NAME, text, url });
      else {
        await navigator.clipboard.writeText(url);
        setToast('Invite link copied');
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') setToast("Couldn't share the link");
    }
  };

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

  const share = (q: Question) => {
    tapShort();
    setShareTarget(q);
  };

  const shareText = async (q: Question) => {
    const url = APP_URL;
    const text = `"${q.text}"\n\nFrom ${APP_NAME}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: APP_NAME, text, url });
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
    const next = { vibe: 'mix' as const, questions: shuffled, index: 0, label: 'Saved' };
    setDeck(next);
    if (room.code) room.pushDeck(next);
    setLayout('card');
    setView('play');
  };

  const saveJournal = (q: Question, answers: [string, string]) => {
    setJournal(prev => {
      const next = { ...prev, [q.text]: { question: { text: q.text, category: q.category }, answers, updatedAt: Date.now() } };
      const keys = Object.keys(next);
      return keys.length > MAX_JOURNAL_ENTRIES ? Object.fromEntries(Object.entries(next).slice(-MAX_JOURNAL_ENTRIES)) : next;
    });
    setToast('Saved to Memories');
  };
  const deleteJournal = (q: Question) => {
    setJournal(prev => {
      const next = { ...prev };
      delete next[q.text];
      return next;
    });
    setToast('Memory deleted');
  };
  const hasJournal = useCallback((q: Question) => hasAnswers(journal[q.text]), [journal]);
  const clearCooldown = useCallback(() => setCooldownUntil(null), [setCooldownUntil]);
  const activeCooldown = cooldownUntil && cooldownUntil > Date.now() ? cooldownUntil : null;

  useWakeLock(view === 'play' && !!validDeck);

  // Phone layout for the card view: the page becomes exactly one screen tall,
  // the card stretches to fill it and the controls sit at the bottom. Sideways
  // phones are too short for that, so they scroll like the classic layout.
  const immersive = isPhone && isPortrait && view === 'play' && layout === 'card';

  // Confirm a data move from the old address (see lib/transfer.ts).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(IMPORTED_FLAG)) {
        sessionStorage.removeItem(IMPORTED_FLAG);
        setToast('Your saved questions and memories moved over');
      }
    } catch {
      // storage unavailable
    }
  }, []);

  const deckAnsweredCount = validDeck ? validDeck.questions.filter(q => answered[q.text]).length : 0;

  return (
    <div className={`${immersive ? 'h-dvh overflow-hidden' : 'min-h-dvh'} flex flex-col bg-radial-[ellipse_at_top] from-rose-100/70 via-rose-50/40 to-slate-50 dark:from-rose-950/30 dark:via-slate-950 dark:to-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg dark:focus:bg-slate-800"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-50 border-b border-rose-100/60 dark:border-slate-800/80 bg-white/75 dark:bg-slate-950/75 backdrop-blur-lg pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 phone:h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setView('home')}
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <span className="inline-flex h-8 w-8 phone:h-7 phone:w-7 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/30">
              <Heart className="h-4 w-4 fill-white" aria-hidden />
            </span>
            <span className="flex flex-col text-left leading-none">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-500">Q&amp;A with</span>
              <span className="whitespace-nowrap font-serif text-lg sm:text-xl phone:text-base max-[360px]:text-sm font-semibold">Ethan &amp; Brianna</span>
            </span>
          </button>

          <nav className="flex items-center gap-1" aria-label="Main">
            {room.code && (
              <button
                type="button"
                onClick={() => setRoomOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-bold tracking-wider text-emerald-700 dark:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                aria-label={`In room ${room.code}. Open room options`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden />
                {room.code}
              </button>
            )}
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
              <span className="hidden sm:inline">Saved</span>
              {saved.length > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white tabular-nums">
                  {saved.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setView(view === 'memories' ? (validDeck ? 'play' : 'home') : 'memories')}
              aria-current={view === 'memories' ? 'page' : undefined}
              aria-label="Memories"
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                view === 'memories'
                  ? 'bg-rose-100 dark:bg-rose-500/15 text-rose-700 dark:text-rose-200'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-slate-800'
              }`}
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Memories</span>
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

      <MoveBanner />
      {!isOnline && <OfflineBanner />}

      <main
        id="main"
        className={`mx-auto w-full max-w-6xl phone:max-w-lg flex-grow px-4 sm:px-6 phone:px-4 pt-8 sm:pt-12 phone:pt-4 ${
          immersive ? 'flex min-h-0 flex-col pb-[calc(0.75rem+env(safe-area-inset-bottom))]' : 'pb-[calc(3rem+env(safe-area-inset-bottom))]'
        }`}
      >
        {view === 'home' && (
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 phone:mb-5 text-center animate-fade-in-up">
              <span className="mb-5 phone:hidden inline-flex items-center gap-1.5 rounded-full bg-rose-100/80 dark:bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Conversation starters for two
              </span>
              <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl phone:text-[1.8rem] font-semibold leading-[1.1] text-balance">
                Ask better questions, <em className="text-rose-500">together.</em>
              </h1>
              <p className="mx-auto mt-5 phone:mt-2 max-w-lg text-base sm:text-lg phone:text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                Pick a vibe and get 20 fresh questions for date nights, walks and long drives. No repeats.
              </p>
            </div>

            {deckInProgress && (
              <button
                type="button"
                onClick={() => setView('play')}
                className="mb-6 phone:mb-4 flex w-full items-center gap-4 phone:gap-3 phone:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/60 p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 animate-fade-in-up"
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

            <h2 className="mb-3 phone:mb-2 font-sans text-sm font-semibold text-slate-700 dark:text-slate-300">Choose a vibe</h2>
            <VibePicker value={vibe} onChange={chooseVibe} adultUnlocked={adultOk} compact={isPhone} />

            {error && (
              <div role="alert" className="mt-6 rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {activeCooldown && (
              <div className="mt-6">
                <CooldownNotice until={activeCooldown} onDone={clearCooldown} />
              </div>
            )}

            <div
              className={
                isPhone
                  ? 'sticky bottom-0 z-10 -mx-4 mt-3 bg-linear-to-t from-slate-50 via-slate-50/90 to-transparent px-4 pt-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:from-slate-950 dark:via-slate-950/90'
                  : 'sticky bottom-0 z-10 -mx-4 mt-6 bg-linear-to-t from-slate-50 via-slate-50/90 to-transparent px-4 pt-6 pb-[calc(1rem+env(safe-area-inset-bottom))] dark:from-slate-950 dark:via-slate-950/90 sm:static sm:mx-0 sm:bg-none sm:p-0 sm:pt-2'
              }
            >
              <Button size="lg" onClick={() => deal()} isLoading={isLoading} className="w-full">
                {!isLoading && <Sparkles className="h-5 w-5" aria-hidden />}
                Deal 20 {getVibe(vibe).label} questions
              </Button>
              {!room.code && (
                <button
                  type="button"
                  onClick={() => setRoomOpen(true)}
                  className="mt-3 w-full rounded-full py-2 text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                >
                  Partner has a room code? Join their room
                </button>
              )}
            </div>
          </div>
        )}

        {view === 'play' && (
          <div className={immersive ? 'flex min-h-0 flex-1 flex-col' : ''}>
            <div className="mx-auto mb-6 phone:mb-3 flex w-full max-w-xl items-center justify-between gap-2">
              <Button variant="ghost" onClick={() => setView('home')} className="px-3! -ml-3" aria-label="Back to vibes">
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span className="phone:hidden">Vibes</span>
                {validDeck && (
                  <span className="hidden phone:inline max-w-[8rem] truncate">{validDeck.label ?? getVibe(validDeck.vibe).label}</span>
                )}
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
                  onClick={() => setRoomOpen(true)}
                  className={`px-3! ${room.code ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                  aria-label={room.code ? 'Room options' : 'Play on two phones'}
                  title={room.code ? 'Room options' : 'Play on two phones'}
                >
                  <Users className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">{room.code ? 'Room' : 'Together'}</span>
                </Button>
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

            {activeCooldown && !isLoading && <CooldownNotice until={activeCooldown} onDone={clearCooldown} />}

            {isLoading || !validDeck ? (
              isLoading ? (
                <LoadingDeck fill={immersive} />
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
                onIndexChange={setDeckIndex}
                onAnswered={q => setAnsweredFor(q, true)}
                onToggleSaved={toggleSaved}
                onDislike={dislike}
                onShare={share}
                onDealMore={() => deal(validDeck.label ? vibe : validDeck.vibe)}
                onChangeVibe={() => setView('home')}
                onEditNames={() => setSettingsOpen(true)}
                onOpenJournal={setJournalTarget}
                hasJournal={hasJournal}
                fill={immersive}
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
                      onOpenJournal={() => setJournalTarget(q)}
                      hasJournal={hasJournal(q)}
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
                    onOpenJournal={() => setJournalTarget(q)}
                    hasJournal={hasJournal(q)}
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
        {view === 'memories' && (
          <MemoriesView
            journal={journal}
            names={names}
            onEdit={entry => setJournalTarget(entry.question)}
            onFindQuestions={() => setView(validDeck ? 'play' : 'home')}
          />
        )}
      </main>

      <footer className="phone:hidden border-t border-slate-200/60 dark:border-slate-800/80 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-center text-xs text-slate-400 dark:text-slate-500">
        Made for Ethan &amp; Brianna · Questions by Google Gemini
      </footer>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        names={names}
        onNamesChange={setNames}
        theme={theme}
        onThemeChange={setTheme}
        display={display}
        onDisplayChange={setDisplay}
        historyCount={history.length}
        savedCount={saved.length}
        onResetHistory={() => {
          setHistory([]);
          setHistoryByVibe({});
          setLocalHistory([]);
          setToast('Seen questions reset');
        }}
        onClearSaved={() => {
          setSaved([]);
          setToast('Saved questions cleared');
        }}
        onInstall={install}
        adultUnlocked={adultOk}
        onLockAdult={() => {
          setAdultOk(false);
          if (vibe === 'spicy') setVibe(DEFAULT_VIBE);
          setToast('Spicy is locked');
        }}
      />

      <JournalDialog
        question={journalTarget}
        entry={journalTarget ? journal[journalTarget.text] : undefined}
        names={names}
        onSave={saveJournal}
        onDelete={deleteJournal}
        onClose={() => setJournalTarget(null)}
      />

      <ShareDialog
        question={shareTarget}
        vibe={validDeck?.vibe ?? vibe}
        onClose={() => setShareTarget(null)}
        onShareText={shareText}
        onToast={setToast}
      />

      <AgeGateDialog
        open={ageGateOpen}
        onClose={() => setAgeGateOpen(false)}
        onConfirm={() => {
          setAdultOk(true);
          setVibe('spicy');
          setAgeGateOpen(false);
        }}
      />

      <RoomDialog
        open={roomOpen}
        onClose={() => setRoomOpen(false)}
        code={room.code}
        busy={room.busy}
        canCreate={!!validDeck}
        onCreate={async () => {
          if (!validDeck) return;
          try {
            await room.create({ vibe: validDeck.vibe, questions: validDeck.questions, index: Math.min(validDeck.index, validDeck.questions.length), label: validDeck.label });
            setView('play');
          } catch (err) {
            setToast(err instanceof Error ? err.message : "Couldn't start a room");
          }
        }}
        onJoin={async code => {
          try {
            await room.join(code);
            setRoomOpen(false);
            setToast('Joined the room');
          } catch (err) {
            setToast(err instanceof Error ? err.message : "Couldn't join that room");
          }
        }}
        onLeave={() => {
          room.leave();
          setToast('Left the room');
        }}
        onShare={shareInvite}
      />

      <Toast message={toast} onClose={clearToast} />
    </div>
  );
};

export default App;
