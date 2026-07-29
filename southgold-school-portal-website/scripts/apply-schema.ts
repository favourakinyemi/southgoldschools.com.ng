import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

// Applies supabase/migrations/0001_init.sql to the database.
// Requires a direct Postgres connection string in DATABASE_URL, e.g.:
//   postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres
// If DATABASE_URL is not set, this script exits with a helpful message
// (the SQL can also be pasted into the Supabase SQL Editor).

const sqlFile = path.join(process.cwd(), 'supabase', 'migrations', '0001_init.sql');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log(
      'DATABASE_URL is not set. To apply the schema programmatically, set it to your\n' +
      'Supabase direct connection string (Project Settings -> Database -> Connection string),\n' +
      'then run:  npm run apply-schema\n\n' +
      'Alternatively, paste supabase/migrations/0001_init.sql into the Supabase SQL Editor and run it.'
    );
    return;
  }

  const sql = fs.readFileSync(sqlFile, 'utf-8');
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(sql);
    console.log('Schema applied successfully (0001_init.sql).');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Failed to apply schema:', err.message);
  process.exit(1);
});
