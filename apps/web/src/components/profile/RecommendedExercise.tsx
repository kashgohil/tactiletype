import { ArrowRight, Sparkles } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import type { RecommendedExercise as Rec } from '@/utils/recommendations';

interface RecommendedExerciseProps {
  recommendation: Rec;
}

export const RecommendedExerciseCard: React.FC<RecommendedExerciseProps> = ({ recommendation }) => {
  return (
    <Panel tone="accent" bodyClassName="flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-accent text-sm font-medium mb-1">
          <Sparkles className="size-4" />
          Recommended next
        </div>
        <h2 className="text-lg font-semibold">{recommendation.title}</h2>
        <p className="text-sm text-text/60 mt-1 leading-relaxed">{recommendation.description}</p>
        <p className="text-xs text-text/40 mt-2">{recommendation.reason}</p>
      </div>
      <Button asChild className="shrink-0">
        <a href={recommendation.href}>
          Start
          <ArrowRight className="size-4" />
        </a>
      </Button>
    </Panel>
  );
};
