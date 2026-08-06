import type { ContentPage } from '../types';

export const whatIsWpm: ContentPage = {
  path: '/guides/what-is-wpm',
  title: 'What Is WPM? Words Per Minute Explained | tactiletype',
  description:
    'WPM counts characters, not words: five characters equal one word. Here is where that convention came from, how raw and net WPM differ, and what the averages really mean.',
  h1: 'What is WPM?',
  intro:
    'WPM means words per minute, but it does not count words. One "word" is defined as five characters including the space that follows it, so a 250-character passage typed in one minute scores 50 WPM regardless of how many actual words it contained. The convention exists so that results stay comparable between different passages, different tests, and different decades.',
  updated: '2026-08-07',
  sections: [
    {
      id: 'five-characters',
      heading: 'Why five characters, not words',
      blocks: [
        {
          kind: 'p',
          text: 'Counting real words would make the metric meaningless. "I am at the top of it" is seven words and eighteen characters. "Uncharacteristically" is one word and twenty characters. A typist given the first passage would appear seven times faster than one given the second, despite doing marginally less work.',
        },
        {
          kind: 'p',
          text: 'Fixing a word at five characters removes the vocabulary of the passage from the score. It dates to mechanical typewriter proficiency tests, where examiners needed results from different test papers to mean the same thing, and it survived into every digital typing test because the problem never changed.',
        },
        {
          kind: 'note',
          text: 'The space counts. This trips people up when they try to verify a score by hand: "the cat sat" is eleven characters plus a trailing space, not nine letters.',
        },
      ],
    },
    {
      id: 'raw-vs-net',
      heading: 'Raw WPM vs net WPM',
      blocks: [
        {
          kind: 'p',
          text: 'Raw WPM is the unfiltered figure: every character you entered, divided by five, divided by minutes elapsed. It measures finger speed and nothing else. Net WPM applies a penalty for errors you left uncorrected, and it is the number that reflects usable output.',
        },
        {
          kind: 'steps',
          items: [
            {
              title: 'Raw WPM = (all characters typed ÷ 5) ÷ minutes',
              text: 'Wrong characters included. This is why raw speed alone flatters sloppy typing.',
            },
            {
              title: 'Net WPM = raw WPM − (uncorrected errors ÷ minutes)',
              text: 'The classic penalty formula. Some tests instead count only correct characters, which produces a similar but not identical figure.',
            },
            {
              title: 'The gap between them is your control margin',
              text: 'Small gap: you own your speed. Large gap: you are borrowing against it.',
            },
          ],
        },
        {
          kind: 'p',
          text: 'Because implementations differ slightly on the penalty, comparing net WPM across two different sites is less reliable than comparing raw. Compare yourself to yourself, on one test, over time.',
        },
      ],
    },
    {
      id: 'averages',
      heading: 'What the averages actually say',
      blocks: [
        {
          kind: 'p',
          text: 'The most-cited figure for average typing speed is around 40 WPM, which comes from older office-proficiency conventions. The best modern evidence is a 2018 study from Aalto University and the University of Cambridge that analysed 136 million keystrokes from roughly 168,000 volunteers and found an average of about 52 WPM.',
        },
        {
          kind: 'stat',
          items: [
            { value: '~52 WPM', label: 'average in the 136M-keystroke study' },
            { value: '~40 WPM', label: 'the older, widely quoted office benchmark' },
            { value: '120+ WPM', label: 'competitive typists' },
          ],
        },
        {
          kind: 'p',
          text: 'Both numbers deserve an asterisk. Study participants opted into a typing experiment, which selects for people who type a lot and are curious about their speed. The same study found that self-taught typists using six or seven fingers were often as fast as formally trained touch typists — a result worth remembering before you rebuild your technique from scratch.',
        },
      ],
    },
    {
      id: 'cpm-and-others',
      heading: 'CPM, KSPC, and the other metrics',
      blocks: [
        {
          kind: 'list',
          items: [
            'CPM (characters per minute) is simply WPM × 5. Some tests report it because it avoids the "words" abstraction entirely.',
            'Accuracy is the share of characters correct on the first attempt — the companion metric that makes WPM meaningful. [More on the trade-off](/guides/accuracy-vs-speed).',
            'Consistency measures how much your speed varies across the test. Steady output at 60 WPM is more useful than bursts between 40 and 90.',
            'KSPC (keystrokes per character) counts everything you pressed per character produced. Anything meaningfully above 1.0 is correction overhead.',
          ],
        },
      ],
    },
    {
      id: 'improving',
      heading: 'Raising the number',
      blocks: [
        {
          kind: 'p',
          text: 'WPM responds to accuracy work far more reliably than to effort. The reason is arithmetic: at 95% accuracy you are correcting roughly one character in twenty, and each correction costs several keystrokes. Removing those corrections raises net WPM without your fingers moving any faster. [The full method is here](/guides/how-to-improve-typing-speed), and [drills](/practice) target the specific pairs you miss.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'Is 60 WPM good?',
      a: 'Yes. It is comfortably above the ~52 WPM average found in the largest public study and well past the ~40 WPM office benchmark. At 60 WPM with high accuracy, typing has stopped being the bottleneck in most desk work.',
    },
    {
      q: 'What is the difference between WPM and CPM?',
      a: 'None, mathematically. CPM is characters per minute and WPM is CPM divided by five, because a "word" is defined as five characters. A score of 60 WPM is identical to 300 CPM.',
    },
    {
      q: 'Does WPM include mistakes?',
      a: 'Raw WPM does — it counts every character you typed regardless of correctness. Net WPM does not; it applies a penalty for uncorrected errors. When a site quotes a single WPM figure it is usually net.',
    },
    {
      q: 'What is the fastest typing speed ever recorded?',
      a: 'Records in the 200–300 WPM range have been claimed on short bursts and specialised keyboards, but they are not measured under a common standard, so they are difficult to compare. Sustained competitive typing on a standard keyboard tops out far lower, generally between 120 and 180 WPM.',
    },
    {
      q: 'Why does my WPM differ between websites?',
      a: 'Mostly because of the passage and the error penalty. Common-word passages type faster than ones with punctuation, capitals, or unusual vocabulary, and sites differ in how they subtract for mistakes. Raw WPM travels between sites better than net.',
    },
  ],
  sources: [
    {
      label: 'Dhakal, Feit, Kristensson & Oulasvirta — Observations on Typing from 136 Million Keystrokes (CHI 2018)',
      href: 'https://userinterfaces.aalto.fi/136Mkeystrokes/',
    },
    {
      label: 'Words per minute — definition and the five-character standard',
      href: 'https://en.wikipedia.org/wiki/Words_per_minute',
    },
  ],
  related: [
    { label: 'Accuracy vs speed', to: '/guides/accuracy-vs-speed', hint: 'Why the slower typist often finishes first.' },
    { label: 'How to improve typing speed', to: '/guides/how-to-improve-typing-speed', hint: 'The order of operations that actually works.' },
    { label: 'Measure yours', to: '/', hint: 'One minute, no account needed.' },
  ],
};
