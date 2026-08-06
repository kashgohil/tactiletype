import type { ContentPage } from '../types';

export const accuracyVsSpeed: ContentPage = {
  path: '/guides/accuracy-vs-speed',
  title: 'Accuracy vs Speed: Which Matters More? | tactiletype',
  description:
    'Accuracy wins, and the reason is arithmetic: one wrong character costs three or more keystrokes to fix. Here is the maths, the threshold to hold, and when to push speed.',
  h1: 'Accuracy vs speed',
  intro:
    'Accuracy matters more than speed, and it is not close. A mistake costs at least three keystrokes to repair — noticing, backspacing, retyping — against the one keystroke it took to make. That asymmetry means a typist at 60 WPM and 98% accuracy finishes real work ahead of one at 75 WPM and 90%, while finding it less tiring. Hold accuracy above 95% and treat speed as the thing that follows.',
  updated: '2026-08-07',
  sections: [
    {
      id: 'the-arithmetic',
      heading: 'The arithmetic of a mistake',
      blocks: [
        {
          kind: 'p',
          text: 'Consider a 500-character passage. At 90% accuracy you make 50 errors. Each one costs you the wrong keystroke, at least one backspace, and the correct keystroke — three keystrokes minimum, often more when the error is several characters back by the time you notice it.',
        },
        {
          kind: 'stat',
          items: [
            { value: '1 keystroke', label: 'to make a mistake' },
            { value: '3+ keystrokes', label: 'to repair one' },
            { value: '~30%', label: 'of a 90%-accuracy typist\'s keystrokes go to corrections' },
          ],
        },
        {
          kind: 'p',
          text: 'So the 90% typist spends roughly 650 keystrokes producing 500 characters. The 98% typist spends about 530. Even if the careful typist\'s fingers move 20% slower, they press far fewer keys — and they finish first.',
        },
        {
          kind: 'note',
          text: 'The correction cost is also understated here, because it ignores attention. Spotting an error interrupts the flow you were typing in; resuming costs more than the keystrokes suggest.',
        },
      ],
    },
    {
      id: 'the-threshold',
      heading: 'The threshold worth holding',
      blocks: [
        {
          kind: 'p',
          text: '95% is the practical floor and 97–98% is where sustained work gets comfortable. Below 95%, corrections dominate enough that raising accuracy is the fastest available route to raising net speed. Above about 99%, you are probably typing more cautiously than you need to and leaving speed unclaimed.',
        },
        {
          kind: 'list',
          items: [
            'Under 92%: stop timing yourself entirely for a week. Type slowly, deliberately, and let the habit reset.',
            '92–95%: keep practising, but at a pace where you almost never backspace. Speed will feel wrong and the number will dip. That is expected.',
            '95–98%: the productive band. Now pressure and pace work is worth doing.',
            'Over 99% consistently: you have margin. Push the pace until accuracy settles back around 97%.',
          ],
        },
      ],
    },
    {
      id: 'raw-net-gap',
      heading: 'Reading the raw–net gap',
      blocks: [
        {
          kind: 'p',
          text: 'Every test gives you a diagnostic most people ignore: the distance between raw WPM and net WPM. Raw counts every character you typed; net subtracts the cost of the ones you got wrong. The gap is a direct measure of how much of your speed you are actually keeping.',
        },
        {
          kind: 'steps',
          items: [
            {
              title: 'Gap under 5%',
              text: 'You own your speed. This is the state to be in before pushing pace.',
            },
            {
              title: 'Gap of 5–15%',
              text: 'Normal but improvable. Accuracy drills will convert most of that gap directly into net WPM.',
            },
            {
              title: 'Gap over 15%',
              text: 'You are typing faster than you can control. Slowing down will raise your score, not lower it.',
            },
          ],
        },
      ],
    },
    {
      id: 'when-speed-wins',
      heading: 'When speed does matter',
      blocks: [
        {
          kind: 'p',
          text: 'The case for accuracy is not a case for typing slowly forever. Once you hold 97% comfortably, further accuracy gains have almost no value — the corrections you are removing are already rare — and the constraint moves to pace.',
        },
        {
          kind: 'p',
          text: 'It also matters where the work is thrown away. Chat, search queries, and rough drafts tolerate errors cheaply. Code, commands, and anything a machine parses do not, and there [the accuracy bar is higher still](/guides/code-typing-practice).',
        },
        {
          kind: 'p',
          text: 'The practical rule: raise accuracy until it stops being the bottleneck, then raise pace under [conditions that do not let you slow down](/play), then check accuracy has not slipped.',
        },
      ],
    },
  ],
  faq: [
    {
      q: 'Is accuracy more important than speed when typing?',
      a: 'Yes. A mistake costs at least three keystrokes to fix against the one that made it, so corrections consume a disproportionate share of your effort. Typists with high accuracy produce more finished text than faster, sloppier typists at the same keystroke rate.',
    },
    {
      q: 'What is a good typing accuracy?',
      a: '95% is the practical floor and 97–98% is where sustained work becomes comfortable. Consistently above 99% usually means you are being more careful than necessary and could safely push your pace.',
    },
    {
      q: 'Should I fix mistakes while taking a typing test?',
      a: 'During practice, yes — correcting reinforces the right motion. During a timed benchmark it depends on the scoring: if uncorrected errors are penalised, fixing them is usually worth the keystrokes.',
    },
    {
      q: 'Why does my speed drop when I try to be accurate?',
      a: 'Because it should, at first. You are trading a familiar fast-and-sloppy motor pattern for a slower, more deliberate one. The speed returns within a week or two, and it returns on top of the accuracy rather than instead of it.',
    },
    {
      q: 'What is the difference between raw and net WPM?',
      a: 'Raw WPM counts every character typed, correct or not. Net WPM subtracts a penalty for uncorrected errors. The gap between them measures how much of your raw speed survives your mistakes.',
    },
  ],
  related: [
    { label: 'What is WPM?', to: '/guides/what-is-wpm', hint: 'Raw, net, and where the averages come from.' },
    { label: 'How to improve typing speed', to: '/guides/how-to-improve-typing-speed', hint: 'The full method, in order.' },
    { label: 'Drill your weak spots', to: '/practice', hint: 'Accuracy work aimed at your actual misses.' },
  ],
};
