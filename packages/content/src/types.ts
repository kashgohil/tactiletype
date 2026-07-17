export type PackCategory =
  | 'words'
  | 'quotes'
  | 'symbols'
  | 'code'
  | 'real_world'
  | 'punctuation'
  | 'numbers';

export type PackDifficulty = 'easy' | 'medium' | 'hard';

export interface ContentItem {
  id: string;
  title: string;
  content: string;
  difficulty: PackDifficulty;
  language: string;
  wordCount: number;
  tags?: string[];
}

export interface ExercisePack {
  id: string;
  title: string;
  description: string;
  category: PackCategory;
  difficulty: PackDifficulty;
  language: string;
  tags: string[];
  focus?: string;
  items: ContentItem[];
}
