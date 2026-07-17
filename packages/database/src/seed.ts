import {
  buildAllPacks,
  countPracticeUnits,
  flattenPackItems,
  STARTER_ACHIEVEMENTS,
} from '@tactile/content';
import { achievements, db, testTexts } from './index';

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    await db.delete(testTexts);
    console.log('Cleared existing test texts');

    const packs = buildAllPacks();
    const items = flattenPackItems(packs);

    const rows = items.map((item) => ({
      title: item.title.slice(0, 200),
      content: item.content,
      difficulty: item.difficulty,
      language: item.language.slice(0, 10),
      wordCount: item.wordCount,
      isActive: true,
    }));

    const batchSize = 50;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      await db.insert(testTexts).values(batch);
    }

    console.log(
      `Inserted ${rows.length} practice units from ${packs.length} packs`
    );
    for (const pack of packs) {
      console.log(
        `  - ${pack.id}: ${pack.items.length} items (${pack.category})`
      );
    }
    console.log(`Total practice units: ${countPracticeUnits(packs)}`);

    // Seed starter achievements (skip if name already exists)
    const existing = await db.select().from(achievements);
    const existingNames = new Set(existing.map((a) => a.name));
    const toInsert = STARTER_ACHIEVEMENTS.filter(
      (a) => !existingNames.has(a.name)
    ).map((a) => ({
      name: a.name,
      description: a.description,
      category: a.category,
      criteria: a.criteria,
      badgeIcon: a.badgeIcon,
      points: a.points,
      rarity: a.rarity,
      isActive: true,
    }));

    if (toInsert.length) {
      await db.insert(achievements).values(toInsert);
      console.log(`Inserted ${toInsert.length} starter achievements`);
    } else {
      console.log('Starter achievements already present');
    }

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
