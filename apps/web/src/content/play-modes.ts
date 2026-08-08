/**
 * Authored copy for the six `/play/:mode` pages.
 *
 * These URLs were indexable but had nothing to index: the auto-derived title
 * ("Sudden Death - Typing Mode") and a JavaScript-only game were the whole
 * page. A crawler that does not execute JS saw an empty `#root`, and a crawler
 * that does saw a canvas of words with no sentence explaining what it is.
 *
 * The copy below renders visibly under each game, mirrors into the
 * prerendered `<noscript>` block, and feeds the FAQ schema - the same
 * single-source arrangement `content/typing-test.ts` and the guides use.
 *
 * Every number here is read off the mode's implementation rather than
 * remembered. If a rule changes in `components/play/*`, this file is wrong and
 * has to change with it.
 */
import type { PlayModeId } from '@/utils/playModes';
import type { FaqItem, Section } from './types';

export type PlayModePage = {
  mode: PlayModeId;
  /** Route path. Matches the file-based route `/play/$mode`. */
  path: string;
  /** `<title>`; keep to ~60 chars. */
  title: string;
  /** `<meta name="description">`; keep to ~155 chars. */
  description: string;
  /**
   * The answer-first paragraph, rendered directly under the game. It has to
   * stand alone: this is the sentence an answer engine quotes when someone
   * asks what the mode is.
   */
  intro: string;
  sections: Section[];
  faq: FaqItem[];
  /** ISO date. Drives the visible freshness stamp and the sitemap `lastmod`. */
  updated: string;
  related: { label: string; to: string; hint: string }[];
};

const UPDATED = '2026-08-08';

const suddenDeath: PlayModePage = {
  mode: 'sudden-death',
  path: '/play/sudden-death',
  title: 'Sudden Death - Typing Game | tactiletype',
  description:
    'A typing game where one wrong key ends the run. Type an endless word stream in Hardcore or 3-lives mode and train accuracy under real pressure.',
  intro:
    'Sudden Death is a typing game with a single rule: one wrong character ends the run. There is no clock and no finish line, so the run lasts exactly as long as your accuracy does. It is the quickest way to find out whether your speed holds up when a mistake actually costs something.',
  sections: [
    {
      id: 'rules',
      heading: 'How Sudden Death works',
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              title: 'Start typing',
              text: 'Words arrive in a continuous stream. The run begins on your first keystroke, not on a countdown.',
            },
            {
              title: 'One wrong key ends it',
              text: 'In Hardcore there is a single life, so the first incorrect character stops the run outright. Switch to 3 lives before you start for a version that forgives two mistakes.',
            },
            {
              title: 'Score is survival, not speed',
              text: 'Your result is the number of words you cleared plus the peak WPM you reached along the way. Both are saved as a personal best on this device.',
            },
          ],
        },
        {
          kind: 'note',
          text: 'There is no backspace safety net here. Correcting a character does not undo the run that a wrong character already ended.',
        },
      ],
    },
    {
      id: 'what-it-trains',
      heading: 'What Sudden Death trains',
      blocks: [
        {
          kind: 'p',
          text: 'Timed tests let you buy speed with errors and pay for them later in corrections. Sudden Death removes that trade entirely, so the only strategy that works is the one that also works in real typing: slow down at the transitions you are unsure of and keep the rest at pace.',
        },
        {
          kind: 'list',
          items: [
            'Precision under pressure, which is the part of accuracy a relaxed practice run never tests',
            'Noticing a mistake as it happens rather than three words later',
            'Holding a steady rhythm instead of sprinting between errors',
          ],
        },
        {
          kind: 'p',
          text: 'If your runs end early and often, the constraint is accuracy rather than nerve. [Targeted drills](/practice) work from your real error history, and [the case for accuracy over speed](/guides/accuracy-vs-speed) explains why the trade pays.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'What happens when I make a mistake?',
      a: 'In Hardcore mode the run ends on the first wrong character. In 3-lives mode a wrong character costs one life and the run continues until all three are gone.',
    },
    {
      q: 'Is there a time limit?',
      a: 'No. Sudden Death has no timer at all. The run ends when you run out of lives, so a careful typist can keep it going indefinitely.',
    },
    {
      q: 'How is the score calculated?',
      a: 'Words survived are worth ten points each and your peak WPM is added on top, so clearing more words matters more than a single fast burst.',
    },
  ],
  updated: UPDATED,
  related: [
    { label: 'All play modes', to: '/play', hint: 'Six modes, six different rules.' },
    {
      label: 'Accuracy over speed',
      to: '/guides/accuracy-vs-speed',
      hint: 'Why one error costs at least three keystrokes.',
    },
    { label: 'Targeted practice', to: '/practice', hint: 'Drills built from the keys you miss.' },
  ],
};

const wordStorm: PlayModePage = {
  mode: 'word-storm',
  path: '/play/word-storm',
  title: 'Word Storm - Timed Typing Game | tactiletype',
  description:
    'A typing game with a shrinking timer. One word at a time, 3.5 seconds down to 1.2, three lives. Trains burst speed and recovery under a closing window.',
  intro:
    'Word Storm shows one word at a time with a countdown attached to it. Clear the word before the timer empties or you lose a life, and every five words the window gets shorter. It trains burst speed: the ability to read a word and produce it without a warm-up.',
  sections: [
    {
      id: 'rules',
      heading: 'How Word Storm works',
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              title: 'One word, one window',
              text: 'A single word appears with a timer rail beneath it. You start with 3.5 seconds to clear it.',
            },
            {
              title: 'The window closes as you level',
              text: 'Every five words cleared raises the level and shortens the window, down to a floor of 1.2 seconds.',
            },
            {
              title: 'Three lives',
              text: 'Letting the timer run out costs a life. The storm ends when all three are gone, and your result is words cleared plus the level you reached.',
            },
          ],
        },
      ],
    },
    {
      id: 'what-it-trains',
      heading: 'What Word Storm trains',
      blocks: [
        {
          kind: 'p',
          text: 'A normal typing test measures your average over a minute, which hides how long you take to start. Word Storm measures only the start: every word is a fresh cold read with no sentence context to carry you into it.',
        },
        {
          kind: 'list',
          items: [
            'Reading a whole word at a glance instead of letter by letter',
            'Recovering immediately after a miss, since the next word is already counting down',
            'Sustaining pace as the margin shrinks rather than collapsing at the first tight window',
          ],
        },
        {
          kind: 'note',
          text: 'Word Storm draws from a general word list. If you would rather the pressure landed on the keys you actually miss, [Weak Storm](/play/weak-storm) is the same game aimed at your error history.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'How fast does the timer get?',
      a: 'It starts at 3.5 seconds per word and drops each time you clear five words, stopping at a floor of 1.2 seconds. It never goes below that, so high levels are sustainable rather than impossible.',
    },
    {
      q: 'Do typing mistakes cost a life?',
      a: 'Only indirectly. Lives are lost when a word times out, so an error hurts because fixing it eats the window, not because it is penalised on its own.',
    },
    {
      q: 'What counts as a good score?',
      a: 'Clearing 40 words puts you at level 9, where the window is close to its floor. Past that the game is measuring how long you can hold a near-minimum window rather than how fast you can get.',
    },
  ],
  updated: UPDATED,
  related: [
    {
      label: 'Weak Storm',
      to: '/play/weak-storm',
      hint: 'The same storm, aimed at your weak keys.',
    },
    {
      label: 'How to improve typing speed',
      to: '/guides/how-to-improve-typing-speed',
      hint: 'What actually moves the number.',
    },
    { label: 'All play modes', to: '/play', hint: 'Six modes, six different rules.' },
  ],
};

const weakStorm: PlayModePage = {
  mode: 'weak-storm',
  path: '/play/weak-storm',
  title: 'Weak Storm - Adaptive Typing Game | tactiletype',
  description:
    'A typing game that builds every word from the keys you actually miss. Same shrinking timer as Word Storm, aimed at your own error history.',
  intro:
    'Weak Storm is Word Storm pointed at your weakest keys. Instead of drawing from a general word list, it generates words loaded with the characters your recent sessions show you missing most, then puts them under a shrinking timer. The more you type on tactiletype, the more personal the storm gets.',
  sections: [
    {
      id: 'rules',
      heading: 'How Weak Storm works',
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              title: 'Your weak keys are collected as you type',
              text: 'Every test and drill contributes to an error profile. Until you have enough history, the storm falls back to a common set of problem keys so the mode still works on a first visit.',
            },
            {
              title: 'Words are built to hit them',
              text: 'Each word is chosen to concentrate your weak characters rather than to look natural, so a short run puts far more pressure on them than ordinary practice would.',
            },
            {
              title: 'Then the timer closes in',
              text: 'You start with 3.8 seconds per word, and the window shortens every four words down to a floor of 1.4 seconds. Three lives, lost on a timeout.',
            },
          ],
        },
      ],
    },
    {
      id: 'what-it-trains',
      heading: 'Why targeting beats volume',
      blocks: [
        {
          kind: 'p',
          text: 'Most people lose most of their time to a small number of transitions, and normal practice barely touches them: a random passage spends its keystrokes on letters you already type well. Weak Storm inverts the ratio so the awkward reaches get the repetitions instead.',
        },
        {
          kind: 'list',
          items: [
            'The specific letter pairs your errors cluster around',
            'Reaches that are fine at a slow pace and fall apart at speed',
            'Keys you have quietly been avoiding by rephrasing in real writing',
          ],
        },
        {
          kind: 'p',
          text: 'For the same targeting without a timer, [the practice page](/practice) generates drills from the same error data and lets you work through them at your own pace.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'Where do my weak keys come from?',
      a: 'From the errors recorded across your typing tests, drills, and play runs on tactiletype. Before there is enough history, Weak Storm uses a default set of commonly missed keys.',
    },
    {
      q: 'How is it different from Word Storm?',
      a: 'The rules are almost identical. Word Storm draws from a general word list; Weak Storm builds words from your own error profile and gives you slightly more time per word, 3.8 seconds against 3.5, because the words are harder.',
    },
    {
      q: 'Does it get easier as I improve?',
      a: 'The targeting moves rather than easing. As one weak key stops producing errors it drops out of the profile and the next one takes its place, so the mode keeps pointing at whatever is currently worst.',
    },
  ],
  updated: UPDATED,
  related: [
    { label: 'Word Storm', to: '/play/word-storm', hint: 'The same rules on a general word list.' },
    { label: 'Targeted practice', to: '/practice', hint: 'The same error data, without a timer.' },
    { label: 'All play modes', to: '/play', hint: 'Six modes, six different rules.' },
  ],
};

const memoryFlash: PlayModePage = {
  mode: 'memory-flash',
  path: '/play/memory-flash',
  title: 'Memory Flash - Recall Typing Game | tactiletype',
  description:
    'A typing game that hides the text. A phrase flashes, then vanishes, and you type it back from memory. Hold it and the next phrase grows by a word.',
  intro:
    'Memory Flash shows you a phrase, hides it, and asks you to type it back from memory. Get it exactly right and the next phrase is one word longer; drop a word and it shrinks and costs a life. The longest phrase you can carry whole is your recall span, and it is a different skill from raw speed.',
  sections: [
    {
      id: 'rules',
      heading: 'How Memory Flash works',
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              title: 'Read the phrase while it is visible',
              text: 'A phrase appears for a moment with nothing else on screen. Runs open at four words.',
            },
            {
              title: 'It hides, and you type',
              text: 'The phrase disappears completely. You type what you remember with no reference to check against.',
            },
            {
              title: 'The ladder moves',
              text: 'Recall it whole and the next phrase gains a word, up to sixteen. Miss a word and it drops back and costs one of your three lives.',
            },
          ],
        },
        {
          kind: 'stat',
          items: [
            { value: '4', label: 'Words in the opening phrase' },
            { value: '16', label: 'Longest phrase the ladder reaches' },
            { value: '3', label: 'Lives per run' },
          ],
        },
      ],
    },
    {
      id: 'what-it-trains',
      heading: 'What recall span has to do with typing',
      blocks: [
        {
          kind: 'p',
          text: 'Fast typists do not read one character ahead. They take in a chunk, then type it while their eyes are already on the next one. That buffer is what keeps the hands moving continuously instead of stopping between words, and it is the thing Memory Flash isolates by removing the text entirely.',
        },
        {
          kind: 'list',
          items: [
            'Chunking, which is reading several words as one unit rather than in sequence',
            'Typing from a held phrase instead of from the screen, which is what copy typing actually is',
            'Finishing a phrase without checking, since there is nothing to check against',
          ],
        },
        {
          kind: 'note',
          text: 'A span of six or seven words is already strong. The ladder goes to sixteen so it does not cap anyone, not because sixteen is a realistic target.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'Does spelling have to be exact?',
      a: 'The phrase is scored word by word, so every word has to come back correct for the span to advance. A missing or wrong word drops the ladder and costs a life.',
    },
    {
      q: 'What is a recall span?',
      a: 'The longest phrase you typed back whole in a run. It is the score Memory Flash saves, and it measures how much text you can hold at once rather than how fast you type.',
    },
    {
      q: 'Does this actually make me faster?',
      a: 'Indirectly. It trains the read-ahead buffer that lets you type continuously instead of stopping to look at the next word, which is usually what separates a smooth 70 WPM from a stuttering one.',
    },
  ],
  updated: UPDATED,
  related: [
    { label: 'All play modes', to: '/play', hint: 'Six modes, six different rules.' },
    {
      label: 'What WPM measures',
      to: '/guides/what-is-wpm',
      hint: 'The metric, and what it leaves out.',
    },
    { label: 'Take a typing test', to: '/', hint: 'Benchmark the plain version first.' },
  ],
};

const ghostRace: PlayModePage = {
  mode: 'ghost-race',
  path: '/play/ghost-race',
  title: 'Ghost Race - Pace Typing Game | tactiletype',
  description:
    'Race a ghost that types at a fixed WPM. Pick a pace from 40 to 120, stay ahead of the caret, and train consistency instead of bursts.',
  intro:
    'Ghost Race puts a second caret on the passage that advances at a pace you choose, from 40 to 120 WPM. You win by finishing the passage before it does. Because the ghost never speeds up or slows down, it exposes something a timed test averages away: whether you hold one pace or lurch between fast and stalled.',
  sections: [
    {
      id: 'rules',
      heading: 'How Ghost Race works',
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              title: 'Pick a pace',
              text: 'Choose a target of 40, 60, 80, 100, or 120 WPM. The ghost holds it exactly for the whole passage.',
            },
            {
              title: 'Race the caret',
              text: 'You and the ghost start together on a passage of about 35 words. Its caret advances at the target rate whatever you do.',
            },
            {
              title: 'Finish first',
              text: 'Reaching the end before the ghost is a win. Your own WPM is shown alongside the target so you can see the margin rather than just the result.',
            },
          ],
        },
      ],
    },
    {
      id: 'what-it-trains',
      heading: 'Why a fixed pace is useful',
      blocks: [
        {
          kind: 'p',
          text: 'A typing test reports one number for a whole minute, so a run that alternates between 100 WPM bursts and full stops can score the same as an even 70. The ghost makes the difference visible in real time: falling behind on one phrase and catching up on the next is a loss even when the averages match.',
        },
        {
          kind: 'list',
          items: [
            'Holding a target pace instead of sprinting and recovering',
            'Finding the speed you can actually sustain, by racing a pace just above your comfortable one',
            'Pushing a personal best deliberately rather than hoping a good run happens',
          ],
        },
        {
          kind: 'p',
          text: 'A good ladder is to pick the pace you clear comfortably, hold it until winning is routine, then move up one step. [The speed guide](/guides/how-to-improve-typing-speed) covers where that plateau usually sits and what breaks it.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'What pace should I start with?',
      a: 'Slightly above your current test average. If you type around 55 WPM, race the 60 ghost: close enough to win some runs, fast enough that sloppy stretches cost you the race.',
    },
    {
      q: 'Does the ghost make mistakes?',
      a: 'No. It advances at a constant rate for the full passage, which is what makes it a pace reference rather than an opponent.',
    },
    {
      q: 'How long is a race?',
      a: 'About 35 words, so under a minute at most paces. It is short on purpose, because holding one pace for 30 seconds is the skill being tested.',
    },
  ],
  updated: UPDATED,
  related: [
    {
      label: 'Multiplayer races',
      to: '/multiplayer',
      hint: 'The same idea against real people.',
    },
    {
      label: 'How to improve typing speed',
      to: '/guides/how-to-improve-typing-speed',
      hint: 'Getting past the plateau.',
    },
    { label: 'All play modes', to: '/play', hint: 'Six modes, six different rules.' },
  ],
};

const lessonPath: PlayModePage = {
  mode: 'lesson-path',
  path: '/play/lesson-path',
  title: 'Lesson Path - Free Typing Lessons | tactiletype',
  description:
    'Ten free typing lessons that unlock in order, from home row to a 45 WPM graduation. Each lesson has its own pass rule, not just different text.',
  intro:
    'Lesson Path is a ten-step typing course where each lesson has its own rule to pass rather than just different words. It runs from home row through the full alphabet, bigrams, numbers, and symbols, with a no-backspace lesson and a clean-streak lesson in between, and ends at a graduation run that asks for 45 WPM at 95% accuracy.',
  sections: [
    {
      id: 'rules',
      heading: 'How the path works',
      blocks: [
        {
          kind: 'p',
          text: 'Lessons unlock in order. Each one states its pass rule before you start, and passing unlocks the next permanently. Progress is stored on your device, so you can leave and come back without losing the path.',
        },
        {
          kind: 'list',
          items: [
            'Home row, then the top row, then the full alphabet, each gated on accuracy rather than speed',
            'Bigram flow: the common pairs like th, ing, and er that bottleneck most typists',
            'No erase: backspace is disabled, so every key has to be committed to',
            'Clean streak: 80 correct characters in a row without a single miss',
            'Number mix and symbol stretch, the two sets most self-taught typists never drill',
            'Speed check at 40 WPM, then graduation at 45 WPM and 95% accuracy over 50 words',
          ],
        },
        {
          kind: 'note',
          text: 'The rules are the point. A lesson that only changed the text would be a typing test with a different word list; a lesson that disables backspace teaches something a word list cannot.',
        },
      ],
    },
    {
      id: 'what-it-trains',
      heading: 'Who the path is for',
      blocks: [
        {
          kind: 'p',
          text: 'If you have never learned touch typing, start here rather than at the timed test: the early lessons keep your hands on the home row long enough for the positions to stick. If you already type by feel but have gaps, the later lessons are worth doing on their own, since numbers and symbols are where self-taught typists lose the most time.',
        },
        {
          kind: 'p',
          text: 'The 2018 Aalto and Cambridge keystroke study found that self-taught typists using six or seven fingers were often as fast as formally trained touch typists, and that consistency predicted speed better than finger count. The path is built around that: it gates on accuracy first and only asks for pace in the last two lessons.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'How many typing lessons are there?',
      a: 'Ten, unlocking in sequence from home row to graduation. Each has its own pass rule, and you can retry a lesson as many times as you need.',
    },
    {
      q: 'Do I need an account?',
      a: 'No. Lesson Path is free and your progress is saved locally in your browser, so it survives a refresh but does not follow you to another device.',
    },
    {
      q: 'What does it take to finish?',
      a: 'The graduation lesson asks for 45 WPM at 95% accuracy over 50 words. That is comfortably above the roughly 40 WPM office benchmark and short of the study average of about 52 WPM.',
    },
  ],
  updated: UPDATED,
  related: [
    {
      label: 'How to improve typing speed',
      to: '/guides/how-to-improve-typing-speed',
      hint: 'What to do after graduation.',
    },
    { label: 'Targeted practice', to: '/practice', hint: 'Drills for the keys still costing you.' },
    { label: 'All play modes', to: '/play', hint: 'Six modes, six different rules.' },
  ],
};

/** Ordered as the hub orders them: progression first, then pressure modes. */
export const PLAY_MODE_PAGES: PlayModePage[] = [
  lessonPath,
  weakStorm,
  suddenDeath,
  wordStorm,
  memoryFlash,
  ghostRace,
];

export const PLAY_MODE_PAGE_BY_PATH: Record<string, PlayModePage> = Object.fromEntries(
  PLAY_MODE_PAGES.map((page) => [page.path, page])
);

export function getPlayModePage(idOrPath: string | undefined): PlayModePage | undefined {
  if (!idOrPath) return undefined;
  return idOrPath.startsWith('/')
    ? PLAY_MODE_PAGE_BY_PATH[idOrPath]
    : PLAY_MODE_PAGE_BY_PATH[`/play/${idOrPath}`];
}
