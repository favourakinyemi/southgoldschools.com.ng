import fs from 'fs';
import path from 'path';
import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

export async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn(
      '[Migration] DATABASE_URL is not set. Skipped automated database migrations.\n' +
      'Please configure DATABASE_URL in your .env to enable on-boot migrations.'
    );
    return;
  }

  console.log('[Migration] DATABASE_URL found. Starting automated schema migrations check...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // Create tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations_tracker (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Read the migrations directory
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.log('[Migration] No migrations directory found at: ' + migrationsDir);
      return;
    }

    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // guarantees alphanumeric execution sequence e.g. 0001, 0002...

    if (files.length === 0) {
      console.log('[Migration] No SQL migration files found in: ' + migrationsDir);
      return;
    }

    // Fetch already applied migrations
    const { rows } = await client.query('SELECT filename FROM _migrations_tracker');
    const appliedFiles = new Set(rows.map(r => r.filename));

    for (const file of files) {
      if (appliedFiles.has(file)) {
        console.log(`[Migration] Script already applied: ${file}`);
        continue;
      }

      console.log(`[Migration] Applying new script: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Execute migration inside a transaction
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations_tracker (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`[Migration] Success: ${file} applied and registered.`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`[Migration] Error applying ${file}. Rolled back transaction.`, err);
        throw err;
      }
    }

    console.log('[Migration] Database is fully synchronized and consistent.');
  } catch (error: any) {
    console.error('[Migration] Automated migrations check failed:', error.message);
  } finally {
    try {
      await client.end();
    } catch (_) {}
  }
}
