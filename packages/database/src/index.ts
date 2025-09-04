import { DATABASE_URL } from '@/apps/api/src/constants';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(DATABASE_URL, { max: 1 });

export const db = drizzle(client, { schema });
export * from './schema';
export type Database = typeof db;

// Migration utilities
export { migrate } from 'drizzle-orm/postgres-js/migrator';
