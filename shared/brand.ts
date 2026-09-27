// App naming, in one place. The web address is qa-with-ethan-and-brianna.vercel.app.
export const APP_NAME = 'Q&A With Ethan & Brianna';
/** Home-screen label: iOS and Android truncate after roughly 12 characters. */
export const APP_SHORT_NAME = 'Q&A E&B';
export const APP_URL = 'https://qa-with-ethan-and-brianna.vercel.app';

export const DEFAULT_NAMES: readonly [string, string] = ['Ethan', 'Brianna'];

/** Player names with the defaults filled in for blanks. */
export const displayNames = (names: readonly [string, string]): [string, string] => [
  names[0].trim() || DEFAULT_NAMES[0],
  names[1].trim() || DEFAULT_NAMES[1],
];

/** The app's previous address. Data saved there can be moved with the banner in MoveBanner. */
export const OLD_HOSTNAME = 'q-a-together.vercel.app';
