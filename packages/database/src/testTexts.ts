export const testTexts = [
  {
    title: "Common Words",
    content: "the quick brown fox jumps over the lazy dog and runs through the forest with great speed and agility while the sun shines brightly overhead",
    difficulty: "easy" as const,
    language: "en" as const,
    wordCount: 25,
  },
  {
    title: "Programming Terms",
    content: "function variable array object method class interface component state props render useEffect useState callback promise async await fetch api endpoint",
    difficulty: "medium" as const,
    language: "en" as const,
    wordCount: 20,
  },
  {
    title: "Business Text",
    content: "strategic planning requires comprehensive analysis of market conditions competitive landscape customer demographics financial projections operational efficiency resource allocation risk management stakeholder engagement",
    difficulty: "hard" as const,
    language: "en" as const,
    wordCount: 20,
  },
  {
    title: "Literature Excerpt",
    content: "it was the best of times it was the worst of times it was the age of wisdom it was the age of foolishness it was the epoch of belief it was the epoch of incredulity",
    difficulty: "medium" as const,
    language: "en" as const,
    wordCount: 32,
  },
  {
    title: "Technical Writing",
    content: "implementation requires careful consideration of architectural patterns design principles scalability requirements performance optimization security measures data integrity validation error handling logging monitoring",
    difficulty: "hard" as const,
    language: "en" as const,
    wordCount: 20,
  },
  {
    title: "Simple Sentences",
    content: "the cat sat on the mat and looked at the bird in the tree while the dog played in the yard with a red ball",
    difficulty: "easy" as const,
    language: "en" as const,
    wordCount: 23,
  },
  {
    title: "Numbers and Symbols",
    content: "user123 logged in at 09:45 AM with password $ecure@2024 and accessed file_name.txt from /home/user/documents/ directory successfully",
    difficulty: "hard" as const,
    language: "en" as const,
    wordCount: 17,
  },
  {
    title: "Common Phrases",
    content: "how are you today what time is it where do you live what is your name how old are you what do you like to do for fun",
    difficulty: "easy" as const,
    language: "en" as const,
    wordCount: 25,
  },
  {
    title: "Science Text",
    content: "photosynthesis converts carbon dioxide and water into glucose using sunlight energy chlorophyll molecules absorb light wavelengths chemical reactions produce oxygen as byproduct cellular respiration releases stored energy",
    difficulty: "hard" as const,
    language: "en" as const,
    wordCount: 24,
  },
  {
    title: "Mixed Content",
    content: "the year 2024 brought many changes to technology artificial intelligence machine learning blockchain cryptocurrency web3 metaverse virtual reality augmented reality internet of things",
    difficulty: "medium" as const,
    language: "en" as const,
    wordCount: 22,
  },
];

export type TestTextDifficulty = "easy" | "medium" | "hard";

export interface TestText {
  title: string;
  content: string;
  difficulty: TestTextDifficulty;
  language: string;
  wordCount: number;
}