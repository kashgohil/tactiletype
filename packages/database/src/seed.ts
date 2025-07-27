import { db, testTexts } from './index';

const sampleTexts = [
  {
    title: 'The Quick Brown Fox',
    content: 'The quick brown fox jumps over the lazy dog. This pangram contains every letter of the alphabet at least once.',
    difficulty: 'easy' as const,
    language: 'english' as const,
    category: 'pangram' as const,
    wordCount: 19,
  },
  {
    title: 'Programming Basics',
    content: 'Programming is the process of creating a set of instructions that tell a computer how to perform a task. It involves writing code in various programming languages such as JavaScript, Python, Java, and C++.',
    difficulty: 'medium' as const,
    language: 'english' as const,
    category: 'technology' as const,
    wordCount: 32,
  },
  {
    title: 'Advanced Algorithms',
    content: 'Dynamic programming is an algorithmic paradigm that solves complex problems by breaking them down into simpler subproblems. It is applicable to problems exhibiting the properties of overlapping subproblems and optimal substructure.',
    difficulty: 'hard' as const,
    language: 'english' as const,
    category: 'technology' as const,
    wordCount: 29,
  },
  {
    title: 'Literature Classic',
    content: 'It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity.',
    difficulty: 'medium' as const,
    language: 'english' as const,
    category: 'literature' as const,
    wordCount: 32,
  },
  {
    title: 'Science Facts',
    content: 'The human brain contains approximately 86 billion neurons, each connected to thousands of others, forming a complex network that enables consciousness, memory, and thought.',
    difficulty: 'medium' as const,
    language: 'english' as const,
    category: 'science' as const,
    wordCount: 24,
  },
  {
    title: 'Simple Sentence',
    content: 'The cat sat on the mat.',
    difficulty: 'easy' as const,
    language: 'english' as const,
    category: 'basic' as const,
    wordCount: 6,
  },
  {
    title: 'JavaScript Code',
    content: 'function calculateSum(a, b) { return a + b; } const result = calculateSum(10, 20); console.log(result);',
    difficulty: 'hard' as const,
    language: 'english' as const,
    category: 'code' as const,
    wordCount: 16,
  },
  {
    title: 'Common Words',
    content: 'and the of to a in is it you that he was for on are as with his they I at be this have from or one had by word but not what all were we when your can said there each which she do how their if will up other about out many then them these so some her would make like into him has two more go no way could my than first been call who oil its now find long down day did get come made may part',
    difficulty: 'easy' as const,
    language: 'english' as const,
    category: 'common' as const,
    wordCount: 75,
  },
  {
    title: 'Numbers and Symbols',
    content: 'The password is P@ssw0rd123! Please remember: user@example.com (2024) #hashtag $100.50 & 75% success rate.',
    difficulty: 'hard' as const,
    language: 'english' as const,
    category: 'mixed' as const,
    wordCount: 15,
  },
  {
    title: 'Typing Speed Test',
    content: 'Typing speed is measured in words per minute (WPM). The average typing speed is around 40 WPM, while professional typists can achieve speeds of 70 WPM or higher. Practice regularly to improve your typing accuracy and speed.',
    difficulty: 'medium' as const,
    language: 'english' as const,
    category: 'typing' as const,
    wordCount: 37,
  },
];

async function seed() {
  try {
    console.log('🌱 Seeding database...');
    
    // Clear existing test texts
    await db.delete(testTexts);
    console.log('Cleared existing test texts');
    
    // Insert sample texts
    await db.insert(testTexts).values(sampleTexts);
    console.log(`Inserted ${sampleTexts.length} sample texts`);
    
    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

// Run seed if this file is executed directly
if (import.meta.main) {
  seed();
}

export { seed };