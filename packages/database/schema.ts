import pg from 'pg';

export function createPool(connectionString: string) {
  if (!connectionString) throw new Error('Set DATABASE_URL');
  return new pg.Pool({ connectionString, connectionTimeoutMillis: 15000 });
}

export type DatabaseClient = pg.PoolClient;
