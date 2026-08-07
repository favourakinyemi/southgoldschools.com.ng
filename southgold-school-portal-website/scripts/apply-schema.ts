import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

// Applies every file in supabase/migrations/, in filename order, to the
// database. Requires a direct Postgres connection string in DATABASE_URL,
// e.g.:
//   postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
// If DATABASE_URL is not set, this script exits with a helpful message
// (each file's SQL can also be pasted into the Supabase SQL Editor by hand,
// in the same filename order).

const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(
      'DATABASE_URL is not set. To apply the schema programmatically, set it to your\n' +
      'Supabase direct connection string (Project Settings -> Database -> Connection string),\n' +
      'then run:  npm run apply-schema\n\n' +
      'Alternatively, paste each file in supabase/migrations/ into the Supabase SQL Editor\n' +
      'and run them in filename order.'
    );
    return;
  }

  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      await client.query(sql);
      console.log(`Applied ${file}`);
    }
    console.log(`Schema applied successfully (${files.length} migration file(s)).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Failed to apply schema:', err.message);
  process.exit(1);
});
