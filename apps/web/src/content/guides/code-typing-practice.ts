import type { ContentPage } from '../types';

export const codeTypingPractice: ContentPage = {
  path: '/guides/code-typing-practice',
  title: 'Code Typing Practice for Programmers | tactiletype',
  description:
    'Typing code is a different skill from typing prose: symbol-heavy, no autocorrect, and unforgiving of errors. Why your prose WPM drops on code, and how to train the gap.',
  h1: 'Code typing practice',
  intro:
    'Typing code is a measurably different skill from typing prose, and most developers are far worse at it than their prose WPM suggests. Code is dense with symbols that live on the weakest keys, it has no predictable word rhythm, and a single wrong character breaks a build rather than being quietly understood. Expect your code speed to sit 30–50% below your prose speed until you train the difference specifically.',
  updated: '2026-08-07',
  sections: [
    {
      id: 'why-harder',
      heading: 'Why code is harder to type',
      blocks: [
        {
          kind: 'p',
          text: 'English prose is a solved motor problem for anyone who types daily. The letter pairs repeat, the words are familiar, and your hands have rehearsed the common transitions tens of thousands of times. Code removes almost all of that support.',
        },
        {
          kind: 'list',
          items: [
            'Symbols cluster on the weakest fingers. Brackets, braces, underscores, and pipes all sit under the little fingers or require a modifier - the slowest, least practised reaches on the keyboard.',
            'There is no word rhythm. `const x = arr.map((i) => i * 2)` has no repeating pattern your hands can anticipate.',
            'Shift is constant. camelCase, PascalCase, and SCREAMING_SNAKE_CASE all mean modifier presses in the middle of a token, where prose puts them only at the start of a sentence.',
            'Errors are fatal rather than forgiven. A reader silently corrects "teh"; a compiler does not.',
            'Indentation and navigation break flow. Real code involves jumping, not just streaming forward.',
          ],
        },
        {
          kind: 'note',
          text: 'This is why a 90 WPM prose typist can drop to 50 WPM on code and feel like they have forgotten how to type. Nothing is wrong - the skill simply does not transfer as completely as it feels like it should.',
        },
      ],
    },
    {
      id: 'what-to-train',
      heading: 'What to train',
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              title: 'Symbol reaches, in isolation',
              text: 'Brackets, braces, angle brackets, backticks, pipes, underscores. Drill them as pairs - `()`, `{}`, `[]`, `=>`, `!=`, `::` - because that is how they occur.',
            },
            {
              title: 'Shift transitions inside words',
              text: 'camelCase and PascalCase force a modifier mid-token. This is the single most common source of lost time in code typing, and prose practice never touches it.',
            },
            {
              title: 'The idioms of your actual language',
              text: 'You will type `=>`, `::`, `!=`, or `<-` thousands of times depending on what you write. Practise the ones you will actually use, not a generic symbol set.',
            },
            {
              title: 'Numbers from the top row',
              text: 'Most developers never learned them properly and reach visually. In code they appear far more often than in prose.',
            },
            {
              title: 'Accuracy above all',
              text: 'The correction cost is higher in code because errors are frequently invisible until something fails. [The general argument holds here too](/guides/accuracy-vs-speed), only more so.',
            },
          ],
        },
      ],
    },
    {
      id: 'does-it-matter',
      heading: 'Does typing speed matter for programmers?',
      blocks: [
        {
          kind: 'p',
          text: 'Honestly: less than typing-practice sites usually claim. Programming is dominated by reading, understanding, and deciding, and nobody has ever been a better engineer purely for typing faster. If you are looking for a large productivity win, this is not it.',
        },
        {
          kind: 'p',
          text: 'The real case is narrower and more defensible. Typing that requires conscious attention competes for the attention you were using to hold the problem in your head. When symbol reaches become automatic, the thought survives the transcription. That is worth something - and it is a small, cheap skill to acquire compared to most engineering skills.',
        },
        {
          kind: 'p',
          text: 'It also matters at the margins where you type without a safety net: shell commands, regex, config files, live coding in an interview, pairing while someone watches.',
        },
      ],
    },
    {
      id: 'how-to-practise',
      heading: 'How to practise on tactiletype',
      blocks: [
        {
          kind: 'list',
          items: [
            'Use the code and symbols source text on [the main test](/) to benchmark where you actually are - the number will be lower than your prose speed, and that gap is the thing you are training.',
            'Run [targeted drills](/practice) so symbol pairs get concentrated repetition instead of appearing once per passage.',
            'Use [play modes](/play) to hold technique under pressure once the reaches are reliable.',
            'Re-benchmark on code weekly. Prose speed will not tell you whether any of this worked.',
          ],
        },
        {
          kind: 'p',
          text: 'One caution: practise on code that resembles what you write. Drilling Haskell operators will not help a TypeScript developer, and the specificity is most of the value.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'Why is my typing speed lower when typing code?',
      a: 'Because code is symbol-dense, requires constant use of the Shift key mid-token, and has no repeating word rhythm for your hands to anticipate. Symbols also sit on the weakest fingers. A 30–50% drop from prose speed is normal until you train code specifically.',
    },
    {
      q: 'Does typing speed matter for programmers?',
      a: 'Less than commonly claimed. Programming is dominated by reading and thinking, not transcription. The genuine benefit is that automatic typing stops competing for the attention you are using to hold a problem in your head - a real but modest gain.',
    },
    {
      q: 'What is a good typing speed for a programmer?',
      a: 'Anything above roughly 50 WPM on actual code, held accurately, means typing has stopped being the bottleneck. The figure matters less than the gap between your prose and code speeds - a large gap is the thing worth closing.',
    },
    {
      q: 'How do I practise typing symbols and brackets?',
      a: 'Drill them as pairs rather than as individual characters, because that is how they occur: `()`, `{}`, `[]`, `=>`, `!=`. Isolated repetition works far better than hoping they appear often enough in full passages.',
    },
    {
      q: 'Should programmers learn touch typing properly?',
      a: 'Consistency matters more than formal ten-finger technique - the large 2018 keystroke study found self-taught six and seven finger typists were often as fast as trained touch typists. Using the same finger for the same key every time is the part that pays.',
    },
  ],
  sources: [
    {
      label:
        'Dhakal, Feit, Kristensson & Oulasvirta - Observations on Typing from 136 Million Keystrokes (CHI 2018)',
      href: 'https://userinterfaces.aalto.fi/136Mkeystrokes/',
    },
  ],
  related: [
    {
      label: 'Accuracy vs speed',
      to: '/guides/accuracy-vs-speed',
      hint: 'Why errors cost more than they look like they do.',
    },
    {
      label: 'How to improve typing speed',
      to: '/guides/how-to-improve-typing-speed',
      hint: 'The method, in the order that works.',
    },
    { label: 'Practice drills', to: '/practice', hint: 'Concentrated reps on the pairs you miss.' },
  ],
};
