import { Button } from '@/components/ui/button';
import {
  buildAllPacks,
  generateAccuracyChallenge,
  generateBigramDrill,
  generateKeyDrill,
  generateWordDrill,
} from '@tactile/content';
import { useTestPreferences } from '@/hooks/useTestPreferences';
import { getHomeRow } from '@/utils/keyboardLayouts';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
  Braces,
  Crosshair,
  Keyboard,
  Quote,
  Sparkles,
  Target,
  Type,
  Zap,
} from 'lucide-react';
import React, { useMemo } from 'react';

const packs = buildAllPacks();

const EXERCISE_TYPES = [
  {
    id: 'keys',
    title: 'Key drills',
    description: 'Focus on weak or target keys (home row, pinkies, etc.)',
    icon: Crosshair,
    href: '/practice?drill=keys',
  },
  {
    id: 'bigrams',
    title: 'Bigram drills',
    description: 'Speed bottlenecks like th, ion, ing, tion',
    icon: Zap,
    href: '/practice?drill=bigrams',
  },
  {
    id: 'words',
    title: 'Word drills',
    description: 'Repeat hard words from common vocabulary',
    icon: Type,
    href: '/practice?drill=words',
  },
  {
    id: 'accuracy',
    title: 'Accuracy challenge',
    description: 'Quality over speed — aim for 98%+',
    icon: Target,
    href: '/practice?drill=accuracy',
  },
  {
    id: 'symbols',
    title: 'Symbols & operators',
    description: 'Brackets, paths, emails, and operators',
    icon: Sparkles,
    href: '/test?type=symbols',
  },
  {
    id: 'code',
    title: 'Code typing',
    description: 'Real snippets from the code pack',
    icon: Braces,
    href: '/test?type=code',
  },
  {
    id: 'quotes',
    title: 'Quotes',
    description: 'Reading-length attributed passages',
    icon: Quote,
    href: '/test?type=quotes',
  },
  {
    id: 'free',
    title: 'Free test',
    description: 'Sandbox timer/words modes',
    icon: Keyboard,
    href: '/test',
  },
];

function categoryIcon(category: string) {
  switch (category) {
    case 'code':
      return Braces;
    case 'quotes':
      return Quote;
    case 'symbols':
    case 'real_world':
      return Sparkles;
    default:
      return Type;
  }
}

export const Practice: React.FC = () => {
  const navigate = useNavigate();
  const { prefs } = useTestPreferences();
  // Search params typed loosely; route validates
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
    // Store drill text for TypingTest to pick up
    sessionStorage.setItem(
      'tactile_practice_drill',
      JSON.stringify({
        content: drillPreview.content,
        title: drillPreview.title,
        exerciseKind: activeDrill,
        exercisePackId: `drill-${activeDrill}`,
      })
    );
    navigate({ to: '/test', search: { practice: '1' } as never });
  };

  return (
    <div className="pt-2 pb-10 max-w-5xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold">Practice</h1>
        <p className="text-text/50 max-w-2xl leading-relaxed">
          Guided exercises separate from free tests. Pick a drill type or a
          content pack — then type with purpose.
        </p>
      </header>

      {activeDrill && drillPreview && (
        <section className="bg-accent/15 border border-accent/30 rounded-xl p-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{drillPreview.title}</h2>
              <p className="text-sm text-text/50 mt-1">
                Preview — start when ready. Result saves with exercise metadata.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate({ to: '/practice' })}
              >
                Back
              </Button>
              <Button onClick={startDrill}>Start drill</Button>
            </div>
          </div>
          <p className="font-mono text-sm text-text/70 leading-relaxed bg-primary/30 rounded-lg p-4 max-h-40 overflow-y-auto">
            {drillPreview.content}
          </p>
        </section>
      )}

      {!activeDrill && (
        <>
          <section>
            <h2 className="text-lg font-semibold mb-3">Exercise types</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {EXERCISE_TYPES.map((ex) => {
                const Icon = ex.icon;
                return (
                  <a
                    key={ex.id}
                    href={ex.href}
                    className="bg-accent/10 hover:bg-accent/15 rounded-xl p-5 transition-colors border border-transparent hover:border-accent/20 block"
                  >
                    <Icon className="size-5 text-accent mb-3" />
                    <h3 className="font-semibold mb-1">{ex.title}</h3>
                    <p className="text-sm text-text/50 leading-relaxed">
                      {ex.description}
                    </p>
                  </a>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Content packs</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {packs.map((pack) => {
                const Icon = categoryIcon(pack.category);
                const testType =
                  pack.category === 'code'
                    ? 'code'
                    : pack.category === 'symbols' ||
                        pack.category === 'real_world'
                      ? 'symbols'
                      : pack.category === 'quotes'
                        ? 'quotes'
                        : 'text';
                return (
                  <div
                    key={pack.id}
                    className="bg-accent/10 rounded-xl p-5 flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="size-5 text-accent shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h3 className="font-semibold">{pack.title}</h3>
                        <p className="text-sm text-text/50 mt-1 leading-relaxed">
                          {pack.description}
                        </p>
                        <p className="text-xs text-text/40 mt-2">
                          {pack.items.length} units · {pack.difficulty} ·{' '}
                          {pack.category}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="self-start"
                      onClick={() => {
                        sessionStorage.setItem(
                          'tactile_practice_drill',
                          JSON.stringify({
                            content: pack.items[
                              Math.floor(Math.random() * pack.items.length)
                            ]!.content,
                            title: pack.title,
                            exerciseKind: pack.category,
                            exercisePackId: pack.id,
                          })
                        );
                        navigate({
                          to: '/test',
                          search: { practice: '1', type: testType } as never,
                        });
                      }}
                    >
                      Practice pack
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
};
