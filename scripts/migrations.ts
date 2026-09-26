import { readFile } from 'node:fs/promises';
import { createPool } from '../packages/database/schema.js';

// Application composition: add your domain migrations here.
export const migrationFiles = [
  new URL('../packages/database/migrations/001_initial.sql', import.meta.url),
  new URL('../packages/example/migration.sql', import.meta.url)
];

export async function migrateDatabase(databaseUrl: string) {
  const pool = createPool(databaseUrl);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    for (const file of migrationFiles) await db.query(await readFile(file, 'utf8'));
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); await pool.end(); }
}
