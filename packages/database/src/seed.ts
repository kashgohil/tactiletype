import {
  buildAllPacks,
  countPracticeUnits,
  flattenPackItems,
} from '@tactile/content';
import { db, testTexts } from './index';

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    await db.delete(testTexts);
    console.log('Cleared existing test texts');

    const packs = buildAllPacks();
    const items = flattenPackItems(packs);

    // Insert as test_texts for multiplayer / API consumers
    const rows = items.map((item) => ({
      title: item.title.slice(0, 200),
      content: item.content,
      difficulty: item.difficulty,
      language: item.language.slice(0, 10),
      wordCount: item.wordCount,
      isActive: true,
    }));

    // Batch insert to avoid huge single statements
    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await db.insert(testTexts).values(batch);
    }

    console.log(
      `Inserted ${rows.length} practice units from ${packs.length} packs`
    );
    console.log(`Pack breakdown:`);
    for (const pack of packs) {
      console.log(`  - ${pack.id}: ${pack.items.length} items (${pack.category})`);
    }
    console.log(`Total practice units: ${countPracticeUnits(packs)}`);
    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  await seed();
  process.exit(0);
}

export { seed };
