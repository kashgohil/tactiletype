import { db, testTexts } from './index';
import { testTexts as sampleTexts } from './testTexts';

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
  await seed();
  // postgres-js keeps the event loop alive until we exit
  process.exit(0);
}

export { seed };