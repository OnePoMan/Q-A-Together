// Every card should ask for exactly one open-ended answer. "How do you adapt and
// what songs would you sing?" asks two things; "Which song would you sing most?"
// asks one. A setup sentence before the question is fine.

const WH = 'what|why|how|which|who|whom|whose|where|when';
const AUX = 'would|do|does|did|is|are|was|were|will|can|could|should|have|has';
const SUBJ = 'you|we|i|it|they|he|she|that|this';

const SECOND_ASK_PATTERNS: RegExp[] = [
  // "... and what are the songs", ", and why?"
  new RegExp(`\\b(and|also|plus|then|but)\\s+(${WH})\\b`, 'i'),
  // "... and would you ...", "or do you ..."
  new RegExp(`\\b(and|also|plus|then|but|or)\\s+(${AUX})\\s+(${SUBJ})\\b`, 'i'),
  // Trailing instructions that demand a second answer.
  /\b(and|then)\s+(explain|describe|tell|defend|justify|share|name|walk)\b/i,
  /\b(explain|defend|justify) (it|why|your (answer|choice|pick))\b/i,
];

export interface SingleAskResult {
  ok: boolean;
  reason?: string;
}

export function checkSingleAsk(text: string): SingleAskResult {
  const trimmed = text.trim();
  const questionMarks = (trimmed.match(/\?/g) ?? []).length;

  if (questionMarks > 1) return { ok: false, reason: 'more than one question mark' };
  if (questionMarks === 1 && !/\?["'”’)]*$/.test(trimmed)) {
    return { ok: false, reason: 'text continues after the question' };
  }
  for (const pattern of SECOND_ASK_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) return { ok: false, reason: `second ask: "${match[0]}"` };
  }
  return { ok: true };
}

export const isSingleAsk = (text: string): boolean => checkSingleAsk(text).ok;
