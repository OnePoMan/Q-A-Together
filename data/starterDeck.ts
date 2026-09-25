import type { Question, VibeId } from '../shared/vibes';

// Hand-written questions bundled with the app. Used on first run offline, when
// the API is unavailable, and to top up cached questions.
const q = (category: string, text: string): Question => ({ category, text });

const DECK: Record<Exclude<VibeId, 'mix'>, Question[]> = {
  playful: [
    q('Absurd Hypothetical', 'A raccoon has been elected mayor of our town. What is its first policy, and are we voting to re-elect?'),
    q('Tiny Chaos', 'Every door you open now plays a random sound effect. Which sound would ruin you fastest?'),
    q('Petty Hill', 'What is the correct way to load a dishwasher, and why is everyone else wrong?'),
    q('Useless Superpower', 'You can make any sandwich exactly 3% better. How do you turn this into a business?'),
    q('Master Plan', 'You have to sneak a live goose into a fancy gala without anyone noticing. Walk me through the plan.'),
    q('Alternate Us', 'We are a cozy detective duo in a small seaside town. What is our signature case?'),
    q('Guilty Pleasure', 'Which song would you be mortified to have blast from your phone on a silent train, and do you secretly love it?'),
    q('Tiny Chaos', 'You have to replace every "hello" for a week with a different greeting. What are your first three?'),
    q('Absurd Hypothetical', 'Our home gets a theme song that plays whenever we walk in. Hum it.'),
    q('Petty Hill', 'Which everyday object has the worst design, and how would you fix it in one sentence?'),
    q('Alternate Us', 'We are the hosts of a very low-budget cooking show. What is it called and what goes wrong in episode one?'),
    q('Useless Superpower', 'You can talk to houseplants, but they only gossip. Which plant has the best tea?'),
  ],
  'big-ideas': [
    q('Thought Experiment', 'You can remove one invention from history and replace it with anything you like. What is the swap?'),
    q('Would You Choose', 'You can know the exact date of every good thing that will happen to you. Do you want the list?'),
    q('Classification Debate', 'Is cereal a soup? Give me the one rule that settles it.'),
    q('Human Nature', 'What is a skill everyone should learn in school that nobody actually teaches?'),
    q('Alternate Lives', 'In a parallel universe you picked a completely different career at 18. What are you doing there, and are you happy?'),
    q('Worldbuilding', 'You get to invent one new public holiday. What is it called, and how does everyone celebrate?'),
    q('Sci-Fi', 'A machine can record one of your dreams as a movie. Which dream do you screen first?'),
    q('Thought Experiment', 'If every person got one guaranteed "yes" in their lifetime, when would you use yours?'),
    q('Human Nature', 'What is a small, harmless lie that society runs on?'),
    q('Worldbuilding', 'We are founding a tiny town of 100 people. What are its three unusual laws?'),
    q('Sci-Fi', 'You can send a 10-word text to yourself ten years ago. What does it say?'),
    q('Classification Debate', 'What makes something a "breakfast food," and what food deserves to be promoted to one?'),
  ],
  us: [
    q('Our Story', 'What is a small moment from our early days that you still think about?'),
    q('Guess My Answer', 'Guess my answer: what is my ideal lazy Sunday, hour by hour?'),
    q('Appreciation', 'What is something I am good at that I probably do not give myself enough credit for?'),
    q('Someday', 'If we could take one wildly impractical trip together with no budget, where are we going?'),
    q('How We Work', 'What is our most underrated skill as a team?'),
    q('Rituals', 'What is a tiny tradition we should start this year?'),
    q('Firsts & Favorites', 'What is the best meal we have ever shared, and what made it so good?'),
    q('Guess My Answer', 'Guess my answer: what would I order at a diner at 2am?'),
    q('Appreciation', 'What is a tiny, ordinary thing I do that you secretly love?'),
    q('Our Story', 'If our story so far were a movie, what genre is it and who plays us?'),
    q('Someday', 'What is one skill you would love for us to learn together?'),
    q('How We Work', 'When we disagree about something small, who usually caves first, and is that fair?'),
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
    q('Everyday Trade-off', 'Would you rather always be 10 minutes early or always be exactly on time but sprinting?'),
    q('Sci-Fi Choice', 'Would you rather read minds for one hour a year or be invisible for one minute a day?'),
    q('Food & Travel', 'Would you rather travel only by train or only by boat for the rest of your life?'),
    q('Couple Edition', 'Would we rather share one brain for a day or swap bodies for a day?'),
  ],
  quickfire: [
    q('Rank It', 'Rank these breakfast foods: pancakes, bagels, omelettes, cereal, leftover pizza.'),
    q('This or That', 'Mountains or ocean? Defend it in ten words or fewer.'),
    q('Name Three', 'Name three smells that instantly take you back to childhood.'),
    q('Finish the Sentence', 'Finish the sentence: The most overrated thing about vacations is...'),
    q('Superlative', 'What is the most useless thing you know by heart?'),
    q('Instant Verdict', 'Pineapple on pizza: yes or no? You have five seconds.'),
    q('Speed Round', 'You get one song that plays every time you enter a room. Go.'),
    q('Rank It', 'Rank by how much you would panic: lost wallet, dead phone, spider on your shoulder, surprise speech.'),
    q('Name Three', 'Name three things that are better at night.'),
    q('This or That', 'Road trip playlist or road trip podcast? Pick one and defend it.'),
    q('Superlative', 'What is the best snack to have on a long drive, and what is the worst?'),
    q('Finish the Sentence', 'Finish the sentence: I would be a surprisingly good contestant on a show about...'),
  ],
};

export function getStarterQuestions(vibe: VibeId): Question[] {
  if (vibe !== 'mix') return DECK[vibe];
  return Object.values(DECK).flat();
}
