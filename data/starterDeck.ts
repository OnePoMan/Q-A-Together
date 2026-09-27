import type { Question, VibeId } from '../shared/vibes';

// Hand-written questions bundled with the app. Used on first run offline, when
// the API is unavailable or the daily AI budget is spent, and to top up decks.
// Every card asks exactly one thing (enforced by tests/decks.test.ts).
const q = (category: string, text: string): Question => ({ category, text });

const DECK: Record<Exclude<VibeId, 'mix'>, Question[]> = {
  playful: [
    q('Absurd Hypothetical', 'A raccoon has been elected mayor of our town. What is its first official policy?'),
    q('Tiny Chaos', 'Every door you open now plays a random sound effect. Which sound would ruin you fastest?'),
    q('Petty Hill', 'What is the one correct way to load a dishwasher?'),
    q('Useless Superpower', 'You can make any sandwich exactly 3% better. How do you turn this into a business?'),
    q('Master Plan', 'You have to sneak a live goose into a fancy gala. What is the plan?'),
    q('Alternate Us', 'We are a cozy detective duo in a small seaside town. What is our signature case?'),
    q('Guilty Pleasure', 'Which song would you be mortified to have blast from your phone on a silent train?'),
    q('Tiny Chaos', 'For one week you have to greet everyone with a different phrase instead of "hello." What is your go-to?'),
    q('Absurd Hypothetical', 'Our home gets a theme song that plays whenever we walk in. What does it sound like?'),
    q('Petty Hill', 'Which everyday object has the worst design?'),
    q('Alternate Us', 'We host a very low-budget cooking show. What is it called?'),
    q('Useless Superpower', 'You can talk to houseplants, but they only gossip. Which plant has the best tea?'),
  ],
  'big-ideas': [
    q('Thought Experiment', 'You can remove one invention from history and replace it with anything you like. What is the swap?'),
    q('Would You Choose', 'Would you want a list of the exact dates every good thing will happen to you?'),
    q('Classification Debate', 'What is the one rule that decides whether something counts as soup?'),
    q('Human Nature', 'What is a skill everyone should learn in school that nobody actually teaches?'),
    q('Alternate Lives', 'In a parallel universe you picked a completely different career at 18. What are you doing there?'),
    q('Worldbuilding', 'You get to invent one new public holiday. How does everyone celebrate it?'),
    q('Sci-Fi', 'A machine can turn one of your dreams into a movie. Which dream gets screened first?'),
    q('Thought Experiment', 'Every person gets one guaranteed "yes" in their lifetime. When would you use yours?'),
    q('Human Nature', 'What is a small, harmless lie that society runs on?'),
    q('Worldbuilding', 'We are founding a tiny town of 100 people. What is its strangest law?'),
    q('Sci-Fi', 'You can send a 10-word text to yourself ten years ago. What does it say?'),
    q('Classification Debate', 'Which food deserves to be promoted to official breakfast food?'),
  ],
  us: [
    q('Our Story', 'What is a small moment from our early days that you still think about?'),
    q('Guess My Answer', 'Guess my answer: what is my ideal lazy Sunday, hour by hour?'),
    q('Appreciation', 'What is something I am good at that I probably do not give myself enough credit for?'),
    q('Someday', 'If we could take one wildly impractical trip together with no budget, where are we going?'),
    q('How We Work', 'What is our most underrated skill as a team?'),
    q('Rituals', 'What is a tiny tradition we should start this year?'),
    q('Firsts & Favorites', 'What is the best meal we have ever shared?'),
    q('Guess My Answer', 'Guess my answer: what would I order at a diner at 2am?'),
    q('Appreciation', 'What is a tiny, ordinary thing I do that you secretly love?'),
    q('Our Story', 'If our story so far were a movie, what genre would it be?'),
    q('Someday', 'What is one skill you would love for us to learn together?'),
    q('How We Work', 'When we disagree about something small, who usually caves first?'),
  ],
  deep: [
    q('Values', 'What is something you would never compromise on, no matter the cost?'),
    q('Growth', 'What is a lesson you had to learn more than once?'),
    q('Inner World', 'What is something that makes you feel truly understood?'),
    q('Us, Honestly', 'What is something about how we love each other that you hope never changes?'),
    q('Roots', 'Which small habit of yours do you think came straight from how you grew up?'),
    q('Meaning', 'What would make you feel your life had been well spent?'),
    q('Vulnerability', 'What is something you wish you were braver about?'),
    q('Growth', 'Which version of yourself are you most proud of becoming?'),
    q('Inner World', 'What does a truly good day feel like to you?'),
    q('Us, Honestly', 'When do you feel closest to me?'),
    q('Values', 'What is a belief you held strongly five years ago that you have quietly let go of?'),
    q('Vulnerability', 'What is something you find hard to ask for, even from me?'),
  ],
  wyr: [
    q('Everyday Trade-off', 'Would you rather never do laundry again or never do dishes again?'),
    q('Absurd Trade-off', 'Would you rather have to sing everything you say or dance everywhere you walk?'),
    q('Sci-Fi Choice', 'Would you rather pause time for 10 minutes a day or rewind 10 seconds whenever you want?'),
    q('Food & Travel', 'Would you rather eat only your favorite meal forever or never eat the same meal twice?'),
    q('Social Scenario', 'Would you rather accidentally reply-all once a month or have your search history shown on a billboard for one hour a year?'),
    q('Life Path', 'Would you rather live in a tiny house on a gorgeous beach or a mansion in the middle of nowhere?'),
    q('Couple Edition', 'Would we rather win a free vacation every year or have a personal chef one day a week?'),
    q('Absurd Trade-off', 'Would you rather have a rewind button for conversations or a mute button for other people?'),
    q('Everyday Trade-off', 'Would you rather always be 10 minutes early or always arrive exactly on time but sprinting?'),
    q('Sci-Fi Choice', 'Would you rather read minds for one hour a year or be invisible for one minute a day?'),
    q('Food & Travel', 'Would you rather travel only by train or only by boat for the rest of your life?'),
    q('Couple Edition', 'Would we rather share one brain for a day or swap bodies for a day?'),
  ],
  quickfire: [
    q('Rank It', 'Rank these breakfast foods: pancakes, bagels, omelettes, cereal, leftover pizza.'),
    q('This or That', 'Mountains or ocean?'),
    q('Name Three', 'Name three smells that instantly take you back to childhood.'),
    q('Finish the Sentence', 'Finish the sentence: The most overrated thing about vacations is...'),
    q('Superlative', 'What is the most useless thing you know by heart?'),
    q('Instant Verdict', 'Pineapple on pizza: guilty or innocent?'),
    q('Speed Round', 'You get one song that plays every time you enter a room. Which song?'),
    q('Rank It', 'Rank by panic level: lost wallet, dead phone, spider on your shoulder, surprise speech.'),
    q('Name Three', 'Name three things that are better at night.'),
    q('This or That', 'Road trip playlist or road trip podcast?'),
    q('Superlative', 'What is the best snack to have on a long drive?'),
    q('Finish the Sentence', 'Finish the sentence: I would be a surprisingly good contestant on a show about...'),
  ],
  // Flirty and suggestive. The explicit cards live in spicyDeck.ts and load only after the 18+ check.
  spicy: [
    q('Flirt', 'What is the most distracting thing I do without realizing it?'),
    q('Chemistry', 'When did you first realize you were attracted to me?'),
    q('Tease', 'If you could plan our perfect night in with no interruptions, what is the first thing on the schedule?'),
    q('Desire', 'What outfit of mine is your secret weakness?'),
    q('Spicy Would You Rather', 'Would you rather get a slow dance in the kitchen or a surprise kiss in public?'),
    q('Romance', 'What is the most romantic setting you can imagine for a kiss?'),
    q('Confession', 'What is a thought about me you have had at a completely inappropriate time?'),
    q('Flirt', 'What is a compliment from me that you still replay in your head?'),
    q('Chemistry', 'What is the smallest thing I do that instantly gets your attention?'),
    q('Tease', 'Which song would you pick to set the mood for tonight?'),
    q('Romance', 'Where would you most like to be kissed right now?'),
    q('Desire', 'What is one thing you want more of from me this week?'),
  ],
};

export function getStarterQuestions(vibe: VibeId): Question[] {
  if (vibe !== 'mix') return DECK[vibe];
  return Object.entries(DECK)
    .filter(([id]) => id !== 'spicy')
    .flatMap(([, questions]) => questions);
}

export const ALL_STARTER_QUESTIONS = Object.values(DECK).flat();
