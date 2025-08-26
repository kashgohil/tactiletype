import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { db } from './index';

const migrationClient = postgres(
  process.env.DATABASE_URL || 'postgresql://localhost:5432/tactile',
  { max: 1 }
);

async function main() {
  console.log('Running migrations...');

  try {
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  await migrationClient.end();
  process.exit(0);
}

main();
