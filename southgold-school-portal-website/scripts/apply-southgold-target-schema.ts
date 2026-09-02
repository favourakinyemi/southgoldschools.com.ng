import fs from 'fs/promises';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const expectedTargetRef = 'utmbrfsiyowjfjfeodof';
const forbiddenRefs = ['bkrnnfybboiotvtpscmt', 'opdxxhqwwrsvllbtsraz'];
const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
const outputDir = path.join(process.cwd(), '.local', 'migration', 'target');
const resultsPath = path.join(outputDir, 'migration-results.json');

function targetRefFromUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function assertTargetIdentity() {
  const targetUrl = process.env.TARGET_SUPABASE_URL || '';
  const targetDbUrl = process.env.TARGET_DATABASE_URL || '';
  const targetRef = targetRefFromUrl(targetUrl);

  if (!targetUrl || !targetDbUrl) {
    throw new Error('TARGET_SUPABASE_URL or TARGET_DATABASE_URL is missing.');
  }
  if (targetRef !== expectedTargetRef) {
    throw new Error('TARGET_SUPABASE_URL does not match the expected target project ref.');
  }
  if (!targetDbUrl.includes(expectedTargetRef)) {
    throw new Error('TARGET_DATABASE_URL does not appear to reference the expected target project.');
  }
  for (const forbiddenRef of forbiddenRefs) {
    if (targetUrl.includes(forbiddenRef) || targetDbUrl.includes(forbiddenRef)) {
      throw new Error('Target configuration references a forbidden old project ref.');
    }
  }

  return targetRef;
}

async function getMigrationFiles() {
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const expected = Array.from({ length: 15 }, (_, index) => String(index + 1).padStart(4, '0'));
  const prefixes = files.map((file) => file.slice(0, 4));
  const missing = expected.filter((prefix) => !prefixes.includes(prefix));

  if (missing.length || files.length !== 15) {
    throw new Error(`Expected exactly migrations 0001-0015. Missing: ${missing.join(', ') || 'none'}. Found: ${files.length}.`);
  }

  return files;
}

async function main() {
  const targetProjectRef = assertTargetIdentity();
  const files = await getMigrationFiles();
  await fs.mkdir(outputDir, { recursive: true });

  const client = new Client({ connectionString: process.env.TARGET_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  const results: Array<{ migration: string; status: 'PASS' | 'FAIL'; error: string | null }> = [];

  await client.connect();
  try {
    console.log(`Applying schema to target project ref: ${targetProjectRef}`);
    for (const file of files) {
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      try {
        await client.query(sql);
        results.push({ migration: file, status: 'PASS', error: null });
        console.log(`${file}: PASS`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Migration failed.';
        results.push({ migration: file, status: 'FAIL', error: message });
        await fs.writeFile(
          resultsPath,
          JSON.stringify({ generatedAt: new Date().toISOString(), targetProjectRef, results, completed: false }, null, 2) + '\n',
          'utf8',
        );
        console.log(`${file}: FAIL`);
        throw new Error(`${file}: ${message}`);
      }
    }

    await fs.writeFile(
      resultsPath,
      JSON.stringify({ generatedAt: new Date().toISOString(), targetProjectRef, results, completed: true }, null, 2) + '\n',
      'utf8',
    );
    console.log(`Migration results: ${path.relative(process.cwd(), resultsPath)}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Target schema migration failed.');
  process.exit(1);
});
