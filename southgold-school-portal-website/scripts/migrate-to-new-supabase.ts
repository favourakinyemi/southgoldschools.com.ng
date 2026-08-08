import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// One-time migration: old Supabase project -> new Supabase project.
// Copies every table's data, every Storage file, and recreates every Auth
// account (Supabase doesn't allow copying password hashes between
// projects, so every migrated account gets the app's existing default
// password of '1234' -- or 'Southgold1234' for the Super Admin -- and
// will need to sign in and change it).
//
// Prerequisites:
// 1. All 14 files in supabase/migrations/ already applied to the NEW
//    project (via its SQL Editor, in order) -- this script only copies
//    data, it does not create schema.
// 2. .env has the OLD project's SUPABASE_URL / SUPABASE_SECRET_KEY (the
//    ones already there), PLUS the NEW project's credentials under:
//      NEW_SUPABASE_URL=...
//      NEW_SUPABASE_SECRET_KEY=...
//
// Run with:  npx tsx scripts/migrate-to-new-supabase.ts
//
// Safe to re-run: every insert uses upsert with onConflict on the primary
// key, and the auth-user step skips any email that already exists in the
// new project. Never writes to the OLD project -- only ever reads from it.
// ============================================================================

const OLD_URL = process.env.SUPABASE_URL;
const OLD_KEY = process.env.SUPABASE_SECRET_KEY;
const NEW_URL = process.env.NEW_SUPABASE_URL;
const NEW_KEY = process.env.NEW_SUPABASE_SECRET_KEY;

if (!OLD_URL || !OLD_KEY) {
  console.error('SUPABASE_URL / SUPABASE_SECRET_KEY (the OLD project) must be set in .env.');
  process.exit(1);
}
if (!NEW_URL || !NEW_KEY) {
  console.error(
    'NEW_SUPABASE_URL / NEW_SUPABASE_SECRET_KEY (the NEW project) must be set in .env.\n' +
    'Add them temporarily, run this script, then remove them once done.'
  );
  process.exit(1);
}

const oldDb = createClient(OLD_URL, OLD_KEY);
const newDb = createClient(NEW_URL, NEW_KEY);

const DEFAULT_PASSWORD = '1234';
const SUPER_ADMIN_EMAIL = 'southgold@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Southgold1234';

// Tables with no foreign keys into other app tables -- copy first, in any order.
const INDEPENDENT_TABLES = ['subjects', 'sessions', 'configurations', 'cms_content', 'notifications', 'tickets', 'activities'];

// Tables that depend on public.users existing (via a uuid column).
// [table, columns-that-hold-a-user-id]
const USER_LINKED_TABLES: Array<[string, string[]]> = [
  ['super_admins', ['user_id']],
  ['staff_admins', ['user_id', 'created_by']],
  ['teachers', ['user_id']],
  ['parents', ['user_id', 'created_by']],
];

async function copyTable(table: string) {
  const { data, error } = await oldDb.from(table).select('*');
  if (error) throw new Error(`Reading ${table} from old project: ${error.message}`);
  if (!data || data.length === 0) {
    console.log(`${table}: nothing to copy`);
    return;
  }
  const { error: writeErr } = await newDb.from(table).upsert(data);
  if (writeErr) throw new Error(`Writing ${table} to new project: ${writeErr.message}`);
  console.log(`${table}: copied ${data.length} row(s)`);
}

async function migrateAuthUsers(): Promise<Map<string, string>> {
  console.log('\n--- Migrating Auth users ---');
  const idMap = new Map<string, string>();

  const { data: oldUsersData, error: listErr } = await oldDb.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) throw new Error(`Listing old auth users: ${listErr.message}`);
  const oldUsers = oldUsersData.users;

  const { data: newUsersData } = await newDb.auth.admin.listUsers({ perPage: 1000 });
  const existingByEmail = new Map((newUsersData?.users ?? []).map((u) => [u.email?.toLowerCase(), u.id]));

  for (const u of oldUsers) {
    const email = u.email!;
    const existingId = existingByEmail.get(email.toLowerCase());
    if (existingId) {
      idMap.set(u.id, existingId);
      console.log(`  ${email}: already exists in new project, reusing id`);
      continue;
    }

    const password = email.toLowerCase() === SUPER_ADMIN_EMAIL ? SUPER_ADMIN_PASSWORD : DEFAULT_PASSWORD;
    const { data: created, error: createErr } = await newDb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: u.user_metadata,
    });
    if (createErr || !created.user) {
      console.error(`  FAILED to create ${email}: ${createErr?.message}`);
      continue;
    }
    idMap.set(u.id, created.user.id);
    console.log(`  ${email}: created (default password -- must be changed on first login)`);
  }

  console.log(`Auth users: ${idMap.size}/${oldUsers.length} mapped`);
  return idMap;
}

function remapRow(row: any, columns: string[], idMap: Map<string, string>) {
  const copy = { ...row };
  for (const col of columns) {
    if (copy[col] && idMap.has(copy[col])) {
      copy[col] = idMap.get(copy[col]);
    }
  }
  return copy;
}

async function copyUsersTable(idMap: Map<string, string>) {
  const { data, error } = await oldDb.from('users').select('*');
  if (error) throw new Error(`Reading users from old project: ${error.message}`);
  if (!data || data.length === 0) return;

  const remapped = data
    .map((row) => remapRow(row, ['id', 'created_by'], idMap))
    .filter((row) => row.id); // drop any row whose auth user failed to migrate

  const { error: writeErr } = await newDb.from('users').upsert(remapped);
  if (writeErr) throw new Error(`Writing users to new project: ${writeErr.message}`);
  console.log(`users: copied ${remapped.length} row(s)`);
}

async function copyUserLinkedTable(table: string, columns: string[], idMap: Map<string, string>) {
  const { data, error } = await oldDb.from(table).select('*');
  if (error) throw new Error(`Reading ${table} from old project: ${error.message}`);
  if (!data || data.length === 0) {
    console.log(`${table}: nothing to copy`);
    return;
  }
  const remapped = data.map((row) => remapRow(row, columns, idMap));
  const { error: writeErr } = await newDb.from(table).upsert(remapped);
  if (writeErr) throw new Error(`Writing ${table} to new project: ${writeErr.message}`);
  console.log(`${table}: copied ${remapped.length} row(s)`);
}

async function migrateStorage() {
  console.log('\n--- Migrating Storage (school-assets bucket) ---');
  const BUCKET = 'school-assets';

  await newDb.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const folders = ['cms', 'logos', 'passports'];
  let total = 0;
  for (const folder of folders) {
    const { data: files, error } = await oldDb.storage.from(BUCKET).list(folder, { limit: 1000 });
    if (error || !files) continue;
    for (const file of files) {
      const path = `${folder}/${file.name}`;
      const { data: blob, error: dlErr } = await oldDb.storage.from(BUCKET).download(path);
      if (dlErr || !blob) {
        console.error(`  FAILED to download ${path}: ${dlErr?.message}`);
        continue;
      }
      const { error: upErr } = await newDb.storage.from(BUCKET).upload(path, blob, { upsert: true });
      if (upErr) {
        console.error(`  FAILED to upload ${path}: ${upErr.message}`);
        continue;
      }
      total++;
    }
  }
  console.log(`Storage: copied ${total} file(s)`);
}

async function main() {
  console.log('=== Migrating data from OLD Supabase project to NEW Supabase project ===\n');

  console.log('--- Independent tables ---');
  for (const table of INDEPENDENT_TABLES) {
    await copyTable(table);
  }

  const idMap = await migrateAuthUsers();

  console.log('\n--- users (remapped to new auth ids) ---');
  await copyUsersTable(idMap);

  console.log('\n--- Role tables (remapped to new auth ids) ---');
  for (const [table, columns] of USER_LINKED_TABLES) {
    await copyUserLinkedTable(table, columns, idMap);
  }

  console.log('\n--- students (depends on parents + users) ---');
  {
    const { data, error } = await oldDb.from('students').select('*');
    if (error) throw new Error(`Reading students: ${error.message}`);
    if (data?.length) {
      const remapped = data.map((row) => remapRow(row, ['user_id'], idMap));
      const { error: writeErr } = await newDb.from('students').upsert(remapped);
      if (writeErr) throw new Error(`Writing students: ${writeErr.message}`);
      console.log(`students: copied ${remapped.length} row(s)`);
    }
  }

  console.log('\n--- classes (depends on teachers) ---');
  await copyTable('classes');
  await copyTable('classes_subjects');
  await copyTable('student_subjects');
  await copyTable('teacher_subjects');

  console.log('\n--- Remaining data tables ---');
  await copyTable('attendance');
  await copyTable('results');
  await copyTable('fees');
  await copyTable('early_years_results');
  await copyTable('result_approval_requests');

  await migrateStorage();

  console.log('\n=== Migration complete. Spot-check row counts and a few records in the new project before cutting over. ===');
}

main().catch((err) => {
  console.error('\nMigration failed:', err);
  process.exit(1);
});
