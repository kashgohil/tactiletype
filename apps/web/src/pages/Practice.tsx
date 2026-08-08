import {
  generateAccuracyChallenge,
  generateBigramDrill,
  generateKeyDrill,
  generateWordDrill,
} from '@tactile/content';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronRight, Crosshair, Gamepad2, Target, Type, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import type React from 'react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useTestPreferences } from '@/hooks/useTestPreferences';
import { EASE_OUT, uiTransition } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { getHomeRow } from '@/utils/keyboardLayouts';

/** Only drills with a real training purpose - not “another text type”. */
const DRILLS = [
  {
    id: 'keys',
    title: 'Key drills',
    description: 'Bias text toward weak or target keys (home row, pinkies, etc.)',
    icon: Crosshair,
  },
  {
    id: 'bigrams',
    title: 'Bigram drills',
    description: 'Hammer speed bottlenecks like th, ion, ing, tion',
    icon: Zap,
  },
  {
    id: 'words',
    title: 'Word drills',
    description: 'Repeat hard words until they stop tripping you',
    icon: Type,
  },
  {
    id: 'accuracy',
    title: 'Accuracy focus',
    description: 'Calm passage for clean 98%+ runs (no speed pressure)',
    icon: Target,
  },
];

export const Practice: React.FC = () => {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const { prefs } = useTestPreferences();
  const search = useSearch({ strict: false }) as {
    drill?: string;
    keys?: string;
    words?: string;
  };

  const activeDrill = search.drill;
  const layoutHome = getHomeRow(prefs.keyboardLayout);

  const drillPreview = useMemo(() => {
    if (!activeDrill) return null;
    if (activeDrill === 'keys') {
      const keys = (search.keys || layoutHome.slice(0, 4)).split(/[,\s]+/);
      return generateKeyDrill(keys, 40);
    }
    if (activeDrill === 'bigrams') {
      return generateBigramDrill(undefined, 40);
    }
    if (activeDrill === 'words') {
      const words = search.words
        ? search.words.split(/[,\s]+/)
        : ['the', 'their', 'there', 'through', 'thought'];
      return generateWordDrill(words, 3, 40);
    }
    if (activeDrill === 'accuracy') {
      return generateAccuracyChallenge(40);
    }
    return null;
  }, [activeDrill, search.keys, search.words, layoutHome]);

  const startDrill = () => {
    if (!drillPreview) return;
    sessionStorage.setItem(
      'tactile_practice_drill',
      JSON.stringify({
        content: drillPreview.content,
        title: drillPreview.title,
        exerciseKind: activeDrill,
        exercisePackId: `drill-${activeDrill}`,
      })
    );
    navigate({ to: '/', search: { practice: '1' } as never });
  };

  return (
    <div className="space-y-8">
      <motion.header
        className="space-y-2.5"
        initial={reduced ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={uiTransition(reduced, 0.22)}
      >
        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight leading-[1.15]">
          Typing practice, one weak spot at a time
        </h1>
        <p className="text-text/50 max-w-2xl leading-relaxed text-[15px]">
          Generated for a skill - keys, bigrams, hard words. For game-like training, use{' '}
          <Link to="/play" className="text-accent underline-offset-2 hover:underline">
            Play modes
          </Link>
          .
        </p>
      </motion.header>

      {!activeDrill && (
        <motion.section
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduced ? 0 : 0.26, delay: 0.04, ease: EASE_OUT }}
          className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/[0.12] to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
              <Gamepad2 className="size-5 text-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Want something different?</h2>
              <p className="text-sm text-text/48 mt-1 max-w-md leading-relaxed">
                Lesson Path, Weak Storm, Sudden Death, Ghost Race - each with different rules, not
                the same test with a new label.
              </p>
            </div>
          </div>
          <Button asChild size="lg" className="shrink-0 gap-1">
            <Link to="/play">
              Browse play modes
              <ChevronRight className="size-4 opacity-70" />
            </Link>
          </Button>
        </motion.section>
      )}

      {activeDrill && drillPreview && (
        <motion.section
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={uiTransition(reduced, 0.22)}
          className="rounded-2xl border border-accent/30 bg-accent/[0.12] p-6 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{drillPreview.title}</h2>
              <p className="text-sm text-text/45 mt-1">
                Preview - start when ready. Result saves with exercise metadata.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate({ to: '/practice' })}>
                Back
              </Button>
              <Button onClick={startDrill}>Start drill</Button>
            </div>
          </div>
          <p className="font-mono text-sm text-text/65 leading-relaxed rounded-lg bg-accent/[0.06] p-4 max-h-40 overflow-y-auto">
            {drillPreview.content}
          </p>
        </motion.section>
      )}

      {!activeDrill && (
        <section>
          <h2 className="text-base font-semibold mb-1 tracking-tight">Drill types</h2>
          <p className="text-sm text-text/40 mb-4">
            Still the main typing screen - text is generated for one skill.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {DRILLS.map((ex, i) => {
              const Icon = ex.icon;
              return (
                <motion.div
                  key={ex.id}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: reduced ? 0 : 0.24,
                    delay: reduced ? 0 : 0.06 + i * 0.04,
                    ease: EASE_OUT,
                  }}
                >
                  <Link
                    to="/practice"
                    search={{ drill: ex.id } as never}
                    className={cn(
                      'bg-accent/[0.05] hover:bg-accent/10 rounded-2xl p-5 block h-full',
                      'border border-transparent hover:border-accent/30',
                      'transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                      'active:scale-[0.99]'
                    )}
                  >
                    <Icon className="size-5 text-accent mb-3" />
                    <h3 className="font-semibold tracking-tight mb-1">{ex.title}</h3>
                    <p className="text-sm text-text/45 leading-relaxed">{ex.description}</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {!activeDrill && (
        <p className="text-sm text-text/38">
          Free sandbox (timer / words / code / symbols / quotes) lives on{' '}
          <Link to="/" className="text-accent hover:underline underline-offset-2">
            the test page
          </Link>
          . New to drilling?{' '}
          <Link
            to="/guides/$slug"
            params={{ slug: 'how-to-improve-typing-speed' }}
            className="text-accent hover:underline underline-offset-2"
          >
            How to improve your typing speed
          </Link>{' '}
          covers the order that works.
        </p>
      )}
    </div>
  );
};
