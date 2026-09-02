import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const exportVersion = 1;
const sourceUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const sourceKey = process.env.SUPABASE_SECRET_KEY;
const outputRoot = path.join(process.cwd(), '.local', 'migration', 'source-export');
const dataDir = path.join(outputRoot, 'data');
const authDir = path.join(outputRoot, 'auth');
const storageDir = path.join(outputRoot, 'storage');
const sourceProjectRef = getSourceProjectRef();

const applicationTables = [
  'users',
  'super_admins',
  'staff_admins',
  'teachers',
  'parents',
  'students',
  'subjects',
  'classes',
  'classes_subjects',
  'sessions',
  'attendance',
  'results',
  'fees',
  'notifications',
  'tickets',
  'activities',
  'configurations',
  'cms_content',
  'student_subjects',
  'teacher_subjects',
  'result_approval_requests',
  'early_years_results',
];

type SupabaseAnyClient = ReturnType<typeof createClient<any>>;

type StorageObjectManifest = {
  bucket: string;
  path: string;
  folder: string;
  size: number | null;
  contentType: string | null;
  downloadSuccess: boolean;
  sha256: string | null;
  error: string | null;
  localRelativePath: string | null;
};

function sha256Hex(bytes: Buffer) {
  const hash = createHash('sha256');
  hash.write(bytes);
  hash.end();
  return hash.digest('hex');
}

function getSourceProjectRef() {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function requireSourceConfig() {
  if (!sourceUrl || !sourceKey) {
    throw new Error('Required source Supabase environment variables are unavailable.');
  }
  if (sourceProjectRef !== 'bkrnnfybboiotvtpscmt') {
    throw new Error('Configured source project ref does not match the verified SouthGold production project.');
  }
}

function relativeOutput(filePath: string) {
  return path.relative(process.cwd(), filePath);
}

async function ensureDirs() {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.mkdir(authDir, { recursive: true });
  await fs.mkdir(storageDir, { recursive: true });
}

async function getAllRows(client: SupabaseAnyClient, table: string) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const result = await client.from(table).select('*').range(start, start + pageSize - 1);
    if (result.error) throw new Error(`${table}: ${result.error.message}`);
    rows.push(...(result.data || []));
    if (!result.data || result.data.length < pageSize) break;
  }
  return rows;
}

async function countRows(client: SupabaseAnyClient, table: string) {
  const result = await client.from(table).select('*', { count: 'exact', head: true });
  if (result.error) throw new Error(`${table}: ${result.error.message}`);
  return result.count ?? 0;
}

async function exportTable(client: SupabaseAnyClient, table: string) {
  const rows = await getAllRows(client, table);
  const sourceCount = await countRows(client, table);
  const filePath = path.join(dataDir, `${table}.json`);
  await fs.writeFile(filePath, JSON.stringify(rows, null, 2) + '\n', 'utf8');
  return {
    table,
    sourceCount,
    exportedCount: rows.length,
    file: relativeOutput(filePath),
    integrityPassed: sourceCount === rows.length,
  };
}

function collectStorageUrls(
  value: unknown,
  hostNeedle: string,
  currentPath = '',
  matches: Array<{ fieldPath: string; oldUrl: string }> = [],
) {
  if (value === null || value === undefined) return matches;
  if (typeof value === 'string') {
    if (value.includes(hostNeedle)) matches.push({ fieldPath: currentPath || '(value)', oldUrl: value });
    return matches;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStorageUrls(item, hostNeedle, `${currentPath}[${index}]`, matches));
    return matches;
  }
  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      collectStorageUrls(nested, hostNeedle, currentPath ? `${currentPath}.${key}` : key, matches);
    }
  }
  return matches;
}

function recordId(row: any) {
  return row?.id ?? row?.user_id ?? row?.class_id ?? null;
}

async function exportStorageUrlReferences(exportedTables: Record<string, any[]>) {
  const hostNeedle = `${sourceProjectRef}.supabase.co`;
  const references: Array<{ table: string; recordId: string | null; fieldPath: string; oldUrl: string }> = [];

  for (const [table, rows] of Object.entries(exportedTables)) {
    for (const row of rows) {
      for (const match of collectStorageUrls(row, hostNeedle)) {
        references.push({ table, recordId: recordId(row), fieldPath: match.fieldPath, oldUrl: match.oldUrl });
      }
    }
  }

  const filePath = path.join(outputRoot, 'storage-url-references.json');
  await fs.writeFile(filePath, JSON.stringify(references, null, 2) + '\n', 'utf8');
  return { references, file: relativeOutput(filePath) };
}

function publicUserIds(rows: any[]) {
  return new Set(rows.map((row) => row.id).filter(Boolean));
}

function sanitizeAuthUser(user: any, knownPublicUserIds: Set<string>) {
  const identities = (user.identities || []).map((identity: any) => ({
    id: identity.id ?? null,
    provider: identity.provider ?? null,
    identity_id: identity.identity_id ?? null,
    user_id: identity.user_id ?? null,
    created_at: identity.created_at ?? null,
    updated_at: identity.updated_at ?? null,
    last_sign_in_at: identity.last_sign_in_at ?? null,
  }));

  return {
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    email_confirmed_at: user.email_confirmed_at ?? null,
    confirmed_at: user.confirmed_at ?? null,
    created_at: user.created_at ?? null,
    updated_at: user.updated_at ?? null,
    last_sign_in_at: user.last_sign_in_at ?? null,
    role: user.role ?? null,
    aud: user.aud ?? null,
    app_metadata: user.app_metadata ?? {},
    user_metadata: user.user_metadata ?? {},
    providers: identities.map((identity: any) => identity.provider).filter(Boolean),
    identities,
    orphanAuthUser: !knownPublicUserIds.has(user.id),
  };
}

async function exportAuth(client: SupabaseAnyClient, usersTableRows: any[]) {
  const authUsers: any[] = [];
  for (let page = 1; ; page += 1) {
    const result = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw new Error(result.error.message);
    const batch = result.data?.users || [];
    authUsers.push(...batch);
    if (batch.length < 1000) break;
  }

  const knownPublicUserIds = publicUserIds(usersTableRows);
  const exportedUsers = authUsers.map((user) => sanitizeAuthUser(user, knownPublicUserIds));
  const idMapTemplate = Object.fromEntries(exportedUsers.map((user) => [user.id, null]));
  const authUsersPath = path.join(authDir, 'auth-users.json');
  const authMapPath = path.join(authDir, 'auth-id-map.json');

  await fs.writeFile(authUsersPath, JSON.stringify(exportedUsers, null, 2) + '\n', 'utf8');
  await fs.writeFile(authMapPath, JSON.stringify(idMapTemplate, null, 2) + '\n', 'utf8');

  return {
    authUserCount: exportedUsers.length,
    orphanAuthUserCount: exportedUsers.filter((user) => user.orphanAuthUser).length,
    authUsersFile: relativeOutput(authUsersPath),
    authIdMapFile: relativeOutput(authMapPath),
  };
}

async function listAllStorageObjects(client: SupabaseAnyClient, bucketName: string) {
  const objects: Array<{ name: string; metadata?: any }> = [];
  const folders = [''];
  const limit = 1000;

  while (folders.length) {
    const folder = folders.pop() || '';
    for (let offset = 0; ; offset += limit) {
      const result = await client.storage.from(bucketName).list(folder, { limit, offset });
      if (result.error) throw new Error(`${bucketName}/${folder}: ${result.error.message}`);
      const batch = result.data || [];

      for (const item of batch) {
        const objectPath = folder ? `${folder}/${item.name}` : item.name;
        const appearsToBeFolder = !item.id && !item.metadata;
        if (appearsToBeFolder) {
          folders.push(objectPath);
        } else {
          objects.push({ name: objectPath, metadata: item.metadata });
        }
      }

      if (batch.length < limit) break;
    }
  }

  return objects.sort((a, b) => a.name.localeCompare(b.name));
}

async function exportStorage(client: SupabaseAnyClient) {
  const bucketsResult = await client.storage.listBuckets();
  if (bucketsResult.error) throw new Error(bucketsResult.error.message);
  const bucketManifests: Array<{ bucket: string; public: boolean; objectCount: number }> = [];
  const objectManifest: StorageObjectManifest[] = [];

  for (const bucket of bucketsResult.data || []) {
    const objects = await listAllStorageObjects(client, bucket.name);
    bucketManifests.push({ bucket: bucket.name, public: Boolean(bucket.public), objectCount: objects.length });

    for (const object of objects) {
      const download = await client.storage.from(bucket.name).download(object.name);
      const folder = object.name.includes('/') ? object.name.split('/')[0] : '(root)';
      const localPath = path.join(storageDir, bucket.name, ...object.name.split('/'));

      if (download.error || !download.data) {
        objectManifest.push({
          bucket: bucket.name,
          path: object.name,
          folder,
          size: object.metadata?.size ?? null,
          contentType: object.metadata?.mimetype ?? object.metadata?.contentType ?? null,
          downloadSuccess: false,
          sha256: null,
          error: download.error?.message || 'Download failed.',
          localRelativePath: null,
        });
        continue;
      }

      const bytes = Buffer.from(await download.data.arrayBuffer());
      await fs.mkdir(path.dirname(localPath), { recursive: true });
      await fs.writeFile(localPath, bytes);

      objectManifest.push({
        bucket: bucket.name,
        path: object.name,
        folder,
        size: object.metadata?.size ?? bytes.length,
        contentType: object.metadata?.mimetype ?? object.metadata?.contentType ?? null,
        downloadSuccess: true,
        sha256: sha256Hex(bytes),
        error: null,
        localRelativePath: relativeOutput(localPath),
      });
    }
  }

  const manifestPath = path.join(outputRoot, 'storage-manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify({ buckets: bucketManifests, objects: objectManifest }, null, 2) + '\n', 'utf8');

  return {
    buckets: bucketManifests,
    objects: objectManifest,
    storageObjectCount: objectManifest.length,
    downloadedObjectCount: objectManifest.filter((object) => object.downloadSuccess).length,
    checksummedObjectCount: objectManifest.filter((object) => Boolean(object.sha256)).length,
    manifestFile: relativeOutput(manifestPath),
  };
}

async function main() {
  requireSourceConfig();
  await ensureDirs();

  const generatedAt = new Date().toISOString();
  const client = createClient(sourceUrl!, sourceKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { 'Cache-Control': 'no-store' } },
  });

  console.log('Starting SouthGold source export.');
  console.log(`Source project ref: ${sourceProjectRef}`);

  const tableResults = [];
  const exportedTables: Record<string, any[]> = {};
  for (const table of applicationTables) {
    const result = await exportTable(client, table);
    const fileContent = await fs.readFile(path.join(dataDir, `${table}.json`), 'utf8');
    exportedTables[table] = JSON.parse(fileContent);
    tableResults.push(result);
    console.log(`${table}: exported ${result.exportedCount} row(s)`);
  }

  const authExport = await exportAuth(client, exportedTables.users || []);
  console.log(`Auth users exported: ${authExport.authUserCount}`);

  const storageExport = await exportStorage(client);
  console.log(`Storage objects downloaded: ${storageExport.downloadedObjectCount}/${storageExport.storageObjectCount}`);

  const storageUrlReferences = await exportStorageUrlReferences(exportedTables);
  console.log(`Storage URL references inventoried: ${storageUrlReferences.references.length}`);

  const tableCounts = Object.fromEntries(tableResults.map((result) => [result.table, result.exportedCount]));
  const exportMetadata = {
    exportVersion,
    generatedAt,
    sourceProjectRef,
    tableCount: applicationTables.length,
    tableCounts,
    authUserCount: authExport.authUserCount,
    orphanAuthUserCount: authExport.orphanAuthUserCount,
    storageObjectCount: storageExport.storageObjectCount,
    storageBuckets: storageExport.buckets,
    storageUrlReferenceCount: storageUrlReferences.references.length,
    exportCompleted: true,
    integrityPassed:
      tableResults.every((result) => result.integrityPassed) &&
      storageExport.objects.every((object) => object.downloadSuccess && object.sha256),
  };

  const exportSummary = {
    generatedAt,
    sourceProjectRef,
    tableCounts,
    authUserCount: authExport.authUserCount,
    orphanAuthUserCount: authExport.orphanAuthUserCount,
    storageObjectCount: storageExport.storageObjectCount,
    downloadedStorageObjectCount: storageExport.downloadedObjectCount,
    checksummedStorageObjectCount: storageExport.checksummedObjectCount,
    storageUrlReferenceCount: storageUrlReferences.references.length,
    tableIntegrityPassed: tableResults.every((result) => result.integrityPassed),
    storageIntegrityPassed: storageExport.objects.every((object) => object.downloadSuccess && object.sha256),
  };

  await fs.writeFile(path.join(outputRoot, 'export-metadata.json'), JSON.stringify(exportMetadata, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(outputRoot, 'export-summary.json'), JSON.stringify(exportSummary, null, 2) + '\n', 'utf8');

  console.log(`Export metadata: ${relativeOutput(path.join(outputRoot, 'export-metadata.json'))}`);
  console.log('SouthGold source export complete.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'SouthGold source export failed.');
  process.exit(1);
});
