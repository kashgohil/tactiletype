import type { ContentPage } from '../types';

export const howToImproveTypingSpeed: ContentPage = {
  path: '/guides/how-to-improve-typing-speed',
  title: 'How to Improve Typing Speed (What Actually Works) | tactiletype',
  description:
    'Typing speed improves in a specific order: accuracy, then your worst letter pairs, then pace. Here is the method, what to skip, and how long each stage takes.',
  h1: 'How to improve your typing speed',
  intro:
    'Typing speed improves fastest when you stop practising typing and start practising the parts you are bad at. The order that works is: fix accuracy first, then attack your worst letter pairs specifically, then raise pace under mild pressure. Practising general passages faster is the most common approach and the least effective one, because it rehearses what you can already do.',
  updated: '2026-08-07',
  sections: [
    {
      id: 'why-plateaus',
      heading: 'Why you plateau',
      blocks: [
        {
          kind: 'p',
          text: 'Almost everyone stalls somewhere between 45 and 70 WPM. The cause is rarely finger speed. It is that a small number of transitions - specific letter pairs, punctuation, capitals, numbers - cost far more than the rest, and normal practice barely touches them.',
        },
        {
          kind: 'p',
          text: 'Typing an ordinary English passage, you will hit the pair "th" constantly and the pair "qu" almost never. If your weakness is in the rare pairs, a thousand more passages will not find it. Meanwhile the strong pairs get faster, the weak ones stay slow, and your average stops moving.',
        },
        {
          kind: 'note',
          text: 'This is why time spent does not predict improvement well. People who have typed daily for twenty years are frequently stuck at the speed they reached in year two.',
        },
      ],
    },
    {
      id: 'the-order',
      heading: 'The order that works',
      blocks: [
        {
          kind: 'steps',
          items: [
            {
              title: 'Get accuracy above 95% - first, and before anything else',
              text: 'Type slowly enough that you almost never backspace. This will feel like going backwards for about a week. It is the only stage that reliably raises net WPM on its own, because every correction you remove is several keystrokes you get back.',
            },
            {
              title: 'Find your actual weak pairs',
              text: 'Not the ones you think. Error patterns are surprisingly stable per person and surprisingly hard to self-diagnose. [Practice drills](/practice) build from your recorded misses rather than from a generic lesson order.',
            },
            {
              title: 'Drill those pairs in isolation',
              text: 'Short, repeated, deliberately boring. Ten focused minutes on six pairs beats an hour of full passages, because the pair appears hundreds of times instead of twice.',
            },
            {
              title: 'Add pressure, not speed',
              text: 'Once accuracy holds, put yourself in situations where slowing down is not an option - [a race](/multiplayer), [sudden death, or a ghost of your own best run](/play). Pressure surfaces the transitions that are still fragile.',
            },
            {
              title: 'Re-measure weekly, not daily',
              text: 'Day-to-day variance is 10 WPM or more. Weekly numbers show the trend; daily numbers show the noise and will talk you out of a method that is working.',
            },
          ],
        },
      ],
    },
    {
      id: 'technique',
      heading: 'Technique: what matters and what does not',
      blocks: [
        {
          kind: 'p',
          text: 'The 2018 Aalto and Cambridge keystroke study found something that contradicts most typing advice: self-taught typists using six or seven fingers were often as fast as formally trained ten-finger touch typists. What predicted speed was not finger count but consistency - using the same finger for the same key every time, and keeping hands close to the keys.',
        },
        {
          kind: 'list',
          items: [
            'Worth fixing: looking at the keyboard between words, inconsistent finger assignments, hands drifting far from home position, tension in the forearms.',
            'Worth fixing: hunting for punctuation, capitals, and numbers - these are where most intermediate typists lose their time.',
            'Not worth rebuilding from scratch: a stable six or seven finger technique that already delivers good accuracy. The retraining cost is high and the evidence for a payoff is weak.',
            'Not worth it for most people: switching to Dvorak or Colemak. The gains reported are modest and contested, and the transition costs months of reduced output.',
          ],
        },
      ],
    },
    {
      id: 'practice-design',
      heading: 'How to structure a session',
      blocks: [
        {
          kind: 'p',
          text: 'Short and frequent beats long and occasional. Typing is a motor skill, and motor skills consolidate between sessions rather than during them. Fifteen minutes daily will outperform two hours on Sunday, comfortably.',
        },
        {
          kind: 'steps',
          items: [
            {
              title: 'Two minutes warming up',
              text: 'Easy passage, no timer, no score. Cold hands type badly and the bad result colours the whole session.',
            },
            {
              title: 'Eight minutes on drills',
              text: 'Your weak pairs, at an accuracy you can hold. This is the part that actually changes anything.',
            },
            {
              title: 'Five minutes under pressure',
              text: 'One timed test or one race. Not five - the goal is to apply the drilling, not to grind for a personal best.',
            },
          ],
        },
        {
          kind: 'note',
          text: 'Stop when accuracy starts falling. Practising past that point rehearses the errors and is worse than stopping.',
        },
      ],
    },
    {
      id: 'timeline',
      heading: 'How long it takes',
      blocks: [
        {
          kind: 'p',
          text: 'With fifteen focused minutes a day, most people see accuracy stabilise within a week or two, and a measurable speed gain within four to six weeks. Progress from 40 to 70 WPM is realistic over a few months. Progress past 100 WPM is a different project, and it is mostly about eliminating the last few unreliable transitions rather than getting broadly faster.',
        },
        {
          kind: 'p',
          text: 'Improvement is not linear. Expect a flat stretch after the first gain - that is the point where accuracy work is quietly repaying, before it shows up in the number.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'How long does it take to improve typing speed?',
      a: 'With about fifteen focused minutes a day, accuracy usually stabilises within one to two weeks and speed gains become measurable in four to six weeks. Moving from 40 to 70 WPM over a few months is a realistic goal; progress slows considerably above 100 WPM.',
    },
    {
      q: 'Should I look at the keyboard while typing?',
      a: 'Try not to, but do not treat it as the primary problem. Glancing down costs time and breaks rhythm, yet the larger cost for most intermediate typists is inconsistent finger assignment - using different fingers for the same key on different occasions.',
    },
    {
      q: 'Is it better to type fast or accurately when practising?',
      a: 'Accurately, without much ambiguity. Practising at a speed where you make frequent errors rehearses the errors. Type slowly enough to stay above 95% accuracy and let speed follow.',
    },
    {
      q: 'Do typing games actually help?',
      a: 'Yes, for one specific thing: holding technique under pressure. They are poor substitutes for targeted drills, because they do not concentrate practice on your weak transitions - but they surface which transitions collapse when you cannot slow down.',
    },
    {
      q: 'Will a mechanical keyboard make me type faster?',
      a: 'Marginally at best, and mostly through comfort rather than speed. Key travel and actuation force change how typing feels and can reduce fatigue over long sessions, but they do not address the transitions that limit your speed.',
    },
    {
      q: 'How often should I practise typing?',
      a: 'Daily, briefly. Fifteen minutes a day beats two hours once a week, because motor skills consolidate between sessions rather than during them.',
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
      hint: 'The arithmetic behind "slow down to speed up".',
    },
    { label: 'Targeted drills', to: '/practice', hint: 'Built from the pairs you actually miss.' },
    {
      label: 'What is WPM?',
      to: '/guides/what-is-wpm',
      hint: 'What the number is really counting.',
    },
  ],
};
