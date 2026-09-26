import { readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { parse } from 'dotenv';

export function validateDatabaseUrl(value: string): true | string {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || url.pathname.length < 2) {
      return 'Enter a PostgreSQL connection URI with a username, host, and database name.';
    }
    if (/[\r\n]/.test(value)) return 'Enter the connection URI on one line.';
    return true;
  } catch { return 'Enter a valid PostgreSQL connection URI.'; }
}

export function mergeEnv(source: string, updates: Record<string, string>): string {
  const remaining = new Map(Object.entries(updates));
  const encode = (value: string) => {
    if (/[\r\n]/.test(value)) throw new Error('Environment values must be a single line');
    for (const quote of ["'", '"', '`']) {
      if (!value.includes(quote)) return quote + value + quote;
    }
    throw new Error('Percent-encode quote characters in the database password');
  };
  const lines = source.split(/\r?\n/).flatMap(line => {
    const name = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/)?.[1];
    if (!name || !(name in updates)) return [line];
    if (!remaining.has(name)) return [];
    remaining.delete(name);
    return [name + '=' + encode(updates[name])];
  });
  while (lines.at(-1) === '') lines.pop();
  for (const [name, value] of remaining) lines.push(name + '=' + encode(value));
  const result = lines.join('\n') + '\n';
  const parsed = parse(result);
  for (const [name, value] of Object.entries(updates)) {
    if (parsed[name] !== value) throw new Error('Could not safely encode configuration value: ' + name);
  }
  return result;
}

export async function readEnvFile(path: string): Promise<string> {
  try { return await readFile(path, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    throw error;
  }
}

export async function saveEnvFile(path: string, updates: Record<string, string>): Promise<void> {
  const output = mergeEnv(await readEnvFile(path), updates);
  const temporary = path + '.' + randomUUID() + '.tmp';
  try {
    await writeFile(temporary, output, { mode: 0o600, flag: 'wx' });
    await rename(temporary, path);
  } finally { await rm(temporary, { force: true }); }
}
