/**
 * Question quality check.
 *
 *   npm run eval                 # lint bundled decks only (free, no API calls)
 *   npm run eval -- --vibe deep  # also generate one AI batch for a vibe (uses 1 request)
 *   npm run eval -- --vibe all   # one batch per vibe (uses 8 requests!)
 *
 * The free Gemini tier allows ~20 requests a day for the whole project, shared
 * with the live site, so run AI checks sparingly. Needs GEMINI_API_KEY in
 * .env.local or the environment.
 */
import { ALL_STARTER_QUESTIONS } from '../data/starterDeck';
import { SPICY_EXPLICIT } from '../data/spicyDeck';
import { buildPrompt, ALL_EXAMPLES } from '../server/prompt';
import { generateRaw } from '../server/gemini';
import { checkSingleAsk } from '../shared/singleAsk';
import { BANK_EXTRA, BATCH_SIZE, MAX_QUESTION_LENGTH, VIBES, isVibeId, normalizeQuestion, type VibeId } from '../shared/vibes';

const CLICHES = [
  /desert island/i,
  /dead or alive/i,
  /\bfly or (be )?invisib/i,
  /zombie apocalypse/i,
  /favou?rite (colou?r|food|movie)\b/i,
  /where do you see yourself/i,
  /superpower would you (want|choose|have)/i,
];

interface Report {
  total: number;
  problems: string[];
}

function lint(texts: string[]): Report {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const text of texts) {
    const single = checkSingleAsk(text);
    if (!single.ok) problems.push(`two asks (${single.reason}): ${text}`);
    if (text.length > MAX_QUESTION_LENGTH) problems.push(`too long (${text.length}): ${text}`);
    if (text.length < 12) problems.push(`too short: ${text}`);
    const cliche = CLICHES.find(re => re.test(text));
    if (cliche) problems.push(`cliche ${cliche}: ${text}`);
    const key = normalizeQuestion(text);
    if (seen.has(key)) problems.push(`duplicate: ${text}`);
    seen.set(key, text);
  }
  return { total: texts.length, problems };
}

function printReport(title: string, report: Report, extra: string[] = []) {
  const ok = report.problems.length === 0;
  console.log(`\n${ok ? 'PASS' : 'WARN'}  ${title}: ${report.total} questions, ${report.problems.length} problems`);
  for (const line of extra) console.log(`      ${line}`);
  for (const p of report.problems) console.log(`      - ${p}`);
}

async function evalVibe(vibe: VibeId, apiKey: string) {
  const count = BATCH_SIZE + BANK_EXTRA;
  const { system, user, categories } = buildPrompt(vibe, [], count);
  const started = Date.now();
  const { data, model } = await generateRaw({ apiKey, system, prompt: user, categories });
  const items = Array.isArray(data) ? (data as { text?: unknown; category?: unknown }[]) : [];
  const texts = items.map(i => (typeof i?.text === 'string' ? i.text : '')).filter(Boolean);

  const byCategory = new Map<string, number>();
  for (const i of items) byCategory.set(String(i?.category), (byCategory.get(String(i?.category)) ?? 0) + 1);
  const startsIf = texts.filter(t => /^if\b/i.test(t)).length;
  const startsWyr = texts.filter(t => /^would you rather\b/i.test(t)).length;

  printReport(`AI batch: ${vibe} (${model}, ${((Date.now() - started) / 1000).toFixed(1)}s)`, lint(texts), [
    `asked for ${count}, got ${texts.length}`,
    `starts with "If": ${startsIf}, "Would you rather": ${startsWyr}`,
    `categories: ${[...byCategory.entries()].map(([k, v]) => `${k}=${v}`).join(', ')}`,
  ]);
  console.log('      sample:');
  for (const t of texts.slice(0, 5)) console.log(`        * ${t}`);
}

async function main() {
  printReport('Bundled starter deck', lint(ALL_STARTER_QUESTIONS.map(q => q.text)));
  printReport('Bundled 18+ deck', lint(SPICY_EXPLICIT.map(q => q.text)));
  printReport('Prompt examples', lint(ALL_EXAMPLES));

  const flag = process.argv.indexOf('--vibe');
  if (flag === -1) {
    console.log('\nNo AI batches requested. Add --vibe <id> or --vibe all to test generation.');
    return;
  }
  const arg = process.argv[flag + 1];
  const vibes: VibeId[] = arg === 'all' ? VIBES.map(v => v.id) : isVibeId(arg) ? [arg] : [];
  if (vibes.length === 0) {
    console.error(`Unknown vibe "${arg}". Use one of: ${VIBES.map(v => v.id).join(', ')}, all`);
    process.exit(1);
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set (put it in .env.local).');
    process.exit(1);
  }
  for (const vibe of vibes) {
    try {
      await evalVibe(vibe, apiKey);
    } catch (error) {
      console.log(`\nFAIL  AI batch: ${vibe}: ${error instanceof Error ? error.message : error}`);
    }
  }
}

main();
