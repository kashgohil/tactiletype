import { Button } from '@/components/ui/button';
import type { RecommendedExercise as Rec } from '@/utils/recommendations';
import { ArrowRight, Sparkles } from 'lucide-react';
import React from 'react';

interface RecommendedExerciseProps {
  recommendation: Rec;
}

export const RecommendedExerciseCard: React.FC<RecommendedExerciseProps> = ({
  recommendation,
}) => {
  return (
    <section className="bg-accent/20 border border-accent/30 rounded-xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-accent text-sm font-medium mb-1">
          <Sparkles className="size-4" />
          Recommended next
        </div>
        <h2 className="text-lg font-semibold">{recommendation.title}</h2>
        <p className="text-sm text-text/60 mt-1 leading-relaxed">
          {recommendation.description}
        </p>
        <p className="text-xs text-text/40 mt-2">{recommendation.reason}</p>
      </div>
      <Button asChild className="shrink-0">
        <a href={recommendation.href}>
          Start
          <ArrowRight className="size-4" />
        </a>
      </Button>
    </section>
  );
};
