import type { ContentPage } from './types';

/**
 * Informational counterpart to `/`.
 *
 * Deliberately does NOT target "free typing test" — `/` owns that query and has
 * every internal link pointing at it. Two pages chasing one term split the
 * authority and Google picks one anyway. This page takes the explainer intent
 * ("what is a typing test", "how is WPM calculated") and funnels to the app.
 */
export const typingTestPage: ContentPage = {
  path: '/typing-test',
  title: 'What Is a Typing Test? WPM Explained | tactiletype',
  description:
    'How a typing test works: what WPM and accuracy actually measure, how raw and net speed differ, and how to read your result instead of just chasing the number.',
  h1: 'What a typing test actually measures',
  intro:
    'A typing test measures how fast and how accurately you can copy text you have never seen before. Speed is reported in words per minute (WPM), where one "word" is a fixed five characters, and accuracy is the share of characters you got right on the first attempt. A one-minute test is enough to place you within a few WPM of your true speed. [Take one now](/) — no account, no install.',
  updated: '2026-08-07',
  sections: [
    {
      id: 'how-it-works',
      heading: 'How a typing test works',
      blocks: [
        {
          kind: 'p',
          text: 'Every test follows the same shape. You are shown a passage, a timer starts on your first keystroke, and you copy the text as it scrolls. When the timer runs out — or you finish the passage — the test compares what you typed against what you were shown, character by character.',
        },
        {
          kind: 'p',
          text: 'That comparison is the whole game. It produces two numbers that mean very different things, and reading only the first one is the most common mistake typists make.',
        },
        {
          kind: 'steps',
          items: [
            {
              title: 'The timer starts when you do',
              text: 'Not when the page loads. Reading the passage first costs you nothing, so take the half second to look at it.',
            },
            {
              title: 'Every character is checked',
              text: 'Not every word. A single wrong letter in a long word does not void the whole word — it costs you exactly one character.',
            },
            {
              title: 'Speed and accuracy are scored separately',
              text: 'Then combined. This is why two people with identical WPM can have very different real-world output.',
            },
          ],
        },
      ],
    },
    {
      id: 'wpm',
      heading: 'What WPM means',
      blocks: [
        {
          kind: 'p',
          text: 'WPM stands for words per minute, but it does not count words. It counts characters and divides by five, because real words vary wildly in length and counting them directly would make "a an the" worth as much as "extraordinary circumstances". The five-character convention — including the space after each word — has been the standard since mechanical typewriter tests, and it is what makes results comparable across sites and decades.',
        },
        {
          kind: 'stat',
          items: [
            { value: '5 characters', label: 'equal one "word", spaces included' },
            {
              value: '~52 WPM',
              label: 'average across 168,000 people in the largest public study',
            },
            { value: '95%+', label: 'accuracy worth aiming for before chasing speed' },
          ],
        },
        {
          kind: 'p',
          text: 'The 52 WPM figure comes from a 2018 Aalto University and University of Cambridge study of 136 million keystrokes — the broadest public dataset on typing that exists. It is a useful anchor, but it skews toward people who volunteered for a typing study. Treat it as a landmark, not a target. [The full WPM breakdown lives here](/guides/what-is-wpm).',
        },
      ],
    },
    {
      id: 'raw-vs-net',
      heading: 'Raw speed vs net speed',
      blocks: [
        {
          kind: 'p',
          text: 'Raw WPM counts every character you typed, right or wrong. Net WPM subtracts the damage from your mistakes. The gap between them is the single most useful diagnostic a typing test gives you, and most people never look at it.',
        },
        {
          kind: 'list',
          items: [
            'A small gap means you are typing at a speed you can actually control.',
            'A large gap means you are outrunning your accuracy — your raw speed is real, but you are spending it on corrections.',
            'A gap that widens as the test goes on usually means fatigue or tension, not a skill ceiling.',
          ],
        },
        {
          kind: 'note',
          text: 'If your net WPM is more than about 10% below your raw WPM, slowing down will make you faster. That is not a paradox — every correction costs more keystrokes than the character it fixes.',
        },
      ],
    },
    {
      id: 'accuracy',
      heading: 'Why accuracy is the number that matters',
      blocks: [
        {
          kind: 'p',
          text: 'Accuracy is the percentage of characters typed correctly the first time. It sounds like a secondary statistic and it is not: mistakes are asymmetric. Typing a character takes one keystroke. Noticing a mistake, backspacing to it, and retyping takes three or more, plus the attention you spent spotting it.',
        },
        {
          kind: 'p',
          text: 'That asymmetry means accuracy compounds. A typist at 60 WPM and 98% accuracy produces more finished text than one at 75 WPM and 90% accuracy, and finds the work less tiring. [We wrote up the trade-off in full](/guides/accuracy-vs-speed).',
        },
      ],
    },
    {
      id: 'reading-your-result',
      heading: 'How to read your result',
      blocks: [
        {
          kind: 'p',
          text: 'One test is a data point, not a measurement. Your speed swings by 10 WPM or more depending on the passage, your posture, the keyboard, and how recently you warmed up. What matters is the trend across many tests and the shape of your errors within them.',
        },
        {
          kind: 'steps',
          items: [
            {
              title: 'Look at accuracy first',
              text: 'If it is under 95%, that is the number to fix. Speed follows accuracy far more reliably than the reverse.',
            },
            {
              title: 'Then look at the raw–net gap',
              text: 'A wide gap tells you to slow down; a narrow one at a low speed tells you it is safe to push.',
            },
            {
              title: 'Then find the specific keys',
              text: 'Most people lose most of their time to a handful of letter pairs. Guessing which ones is unreliable — [targeted drills](/practice) work from your actual error history instead.',
            },
          ],
        },
      ],
    },
    {
      id: 'modes',
      heading: 'Ways to take a test on tactiletype',
      blocks: [
        {
          kind: 'p',
          text: 'The standard timed test is the baseline, but a timer is only one way to put pressure on your typing, and it trains only one thing.',
        },
        {
          kind: 'list',
          items: [
            'Timed and word-count tests on [the main test page](/) — the classic format, with quotes, code, and symbols as source text.',
            'Drills on [the practice page](/practice) that rebuild the specific keys and letter pairs you keep missing.',
            '[Play modes](/play) that change the failure condition instead of the clock — sudden death, ghost races, and more.',
            'A shared [daily challenge](/daily) so your result is comparable to everyone else who typed that day.',
            '[Multiplayer races](/multiplayer) against live opponents, where pacing beats raw speed.',
          ],
        },
      ],
    },
  ],
  faq: [
    {
      q: 'What is a good typing speed?',
      a: 'Around 40 WPM is a common benchmark for everyday competence, and the largest public study of typing puts the average at roughly 52 WPM. Sustained work above 70 WPM is fast, and competitive typists exceed 120 WPM. Any of these is worth less than the accuracy you hold while typing at it.',
    },
    {
      q: 'How is WPM calculated?',
      a: 'Total characters typed are divided by five to convert to "words", then divided by the elapsed time in minutes. Net WPM subtracts a penalty for uncorrected errors. The five-character convention includes spaces, which is why it is consistent across different passages.',
    },
    {
      q: 'How long should a typing test be?',
      a: 'One minute is enough to place you within a few WPM of your real speed. Longer tests of three to five minutes measure something different and arguably more useful: whether you can hold that speed once concentration starts to cost you.',
    },
    {
      q: 'Does the passage affect my score?',
      a: 'Yes, substantially. Common words in familiar patterns type faster than unusual vocabulary, and punctuation, capitals, and code symbols all slow most people down. Compare results from the same kind of source text, not across them.',
    },
    {
      q: 'Do I need an account to take a typing test?',
      a: 'No. The test is free and works without signing up. An account only adds history, analytics, and drills built from your own error patterns.',
    },
    {
      q: 'Is a typing test accurate on a laptop keyboard?',
      a: 'It measures your speed on that keyboard accurately, which is not quite the same question. Key travel and layout materially change typing speed, so results move when you switch machines. Keep your benchmarks on one keyboard if you want to track progress.',
    },
  ],
  sources: [
    {
      label:
        'Dhakal, Feit, Kristensson & Oulasvirta — Observations on Typing from 136 Million Keystrokes (CHI 2018)',
      href: 'https://userinterfaces.aalto.fi/136Mkeystrokes/',
    },
    {
      label: 'Words per minute — the five-character standard',
      href: 'https://en.wikipedia.org/wiki/Words_per_minute',
    },
  ],
  related: [
    {
      label: 'What is WPM?',
      to: '/guides/what-is-wpm',
      hint: 'The metric in full — raw, net, and what the averages actually say.',
    },
    {
      label: 'How to improve typing speed',
      to: '/guides/how-to-improve-typing-speed',
      hint: 'What actually moves the number, in the order worth doing it.',
    },
    { label: 'Take the test', to: '/', hint: 'One minute, no account. Come back with a number.' },
  ],
};
