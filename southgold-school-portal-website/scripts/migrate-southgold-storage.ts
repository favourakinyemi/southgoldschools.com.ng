import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const expectedTargetRef = 'utmbrfsiyowjfjfeodof';
const sourceProjectRef = 'bkrnnfybboiotvtpscmt';
const staleProjectRef = 'opdxxhqwwrsvllbtsraz';
const bucketName = 'school-assets';
const exportRoot = path.join(process.cwd(), '.local', 'migration', 'source-export');
const targetReportDir = path.join(process.cwd(), '.local', 'migration', 'target');
const storageManifestPath = path.join(exportRoot, 'storage-manifest.json');
const sourceUrlRefsPath = path.join(exportRoot, 'storage-url-references.json');
const applicationImportReportPath = path.join(targetReportDir, 'application-import-report.json');
const storageReportPath = path.join(targetReportDir, 'storage-migration-report.json');
const storageReportMdPath = path.join(targetReportDir, 'storage-migration-report.md');

const expectedTableCounts: Record<string, number> = {
  users: 161,
  super_admins: 1,
  staff_admins: 2,
  teachers: 3,
  parents: 40,
  students: 49,
  subjects: 30,
  classes: 9,
  classes_subjects: 9,
  sessions: 3,
  attendance: 776,
  results: 78,
  fees: 0,
  notifications: 3,
  tickets: 2,
  activities: 1,
  configurations: 2,
  cms_content: 3,
  student_subjects: 416,
  teacher_subjects: 46,
  result_approval_requests: 0,
  early_years_results: 0,
};

const conflictTargets: Record<string, string[]> = {
  configurations: ['id'],
  cms_content: ['id'],
};

const jsonFields: Record<string, string[]> = {
  configurations: ['grading_scale', 'early_years_grading_scale'],
  cms_content: ['content'],
};

type StorageObjectManifest = {
  bucket: string;
  path: string;
  folder: string;
  size: number | null;
  contentType: string | null;
  downloadSuccess: boolean;
  sha256: string | null;
  localRelativePath: string | null;
};

type StorageUrlReference = {
  table: string;
  recordId: string | null;
  fieldPath: string;
  oldUrl: string;
};

type SupabaseAnyClient = ReturnType<typeof createClient<any>>;

function projectRefFromUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function assertTargetIdentity() {
  const targetUrl = process.env.TARGET_SUPABASE_URL || '';
  const targetKey = process.env.TARGET_SUPABASE_SECRET_KEY || '';
  const targetDbUrl = process.env.TARGET_DATABASE_URL || '';
  const targetRef = projectRefFromUrl(targetUrl);

  if (!targetUrl || !targetKey || !targetDbUrl) {
    throw new Error('Required TARGET_* environment variables are missing.');
  }
  if (targetRef !== expectedTargetRef || !targetDbUrl.includes(expectedTargetRef)) {
    throw new Error('Target configuration does not reference the expected target project.');
  }
  if (
    targetUrl.includes(sourceProjectRef) ||
    targetUrl.includes(staleProjectRef) ||
    targetKey.includes(sourceProjectRef) ||
    targetKey.includes(staleProjectRef) ||
    targetDbUrl.includes(sourceProjectRef) ||
    targetDbUrl.includes(staleProjectRef)
  ) {
    throw new Error('Target configuration references a forbidden old project ref.');
  }

  return { targetRef, targetUrl, targetKey, targetDbUrl };
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

function sha256Hex(bytes: Buffer) {
  const hash = createHash('sha256');
  hash.write(bytes);
  hash.end();
  return hash.digest('hex');
}

function quoteIdent(value: string) {
  return '"' + value.replace(/"/g, '""') + '"';
}

async function listTargetAuthUsers(client: SupabaseAnyClient) {
  const users: any[] = [];
  for (let page = 1; ; page += 1) {
    const result = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw new Error(result.error.message);
    const batch = result.data?.users || [];
    users.push(...batch);
    if (batch.length < 1000) break;
  }
  return users;
}

async function getTableCounts(client: Client) {
  const counts: Record<string, number> = {};
  for (const table of Object.keys(expectedTableCounts)) {
    const result = await client.query(`select count(*)::int as count from public.${quoteIdent(table)}`);
    counts[table] = Number(result.rows[0]?.count ?? 0);
  }
  return counts;
}

function getObjectPathFromStorageUrl(value: string) {
  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

function sourceUrlCanBeRewritten(value: string, objectPaths: Set<string>) {
  if (!value.includes(`${sourceProjectRef}.supabase.co`)) return false;
  const objectPath = getObjectPathFromStorageUrl(value);
  return Boolean(objectPath && objectPaths.has(objectPath));
}

function rewriteValue(value: unknown, objectPaths: Set<string>, stats: { rewritten: number }): unknown {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    if (!sourceUrlCanBeRewritten(value, objectPaths)) return value;
    stats.rewritten += 1;
    return value.replace(`${sourceProjectRef}.supabase.co`, `${expectedTargetRef}.supabase.co`);
  }
  if (Array.isArray(value)) return value.map((item) => rewriteValue(item, objectPaths, stats));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, rewriteValue(nested, objectPaths, stats)]),
    );
  }
  return value;
}

function countStorageUrlRefs(value: unknown, projectRef: string): number {
  if (value instanceof Date) return 0;
  if (typeof value === 'string') return value.includes(`${projectRef}.supabase.co`) ? 1 : 0;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + countStorageUrlRefs(item, projectRef), 0);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (sum, nested) => sum + countStorageUrlRefs(nested, projectRef),
      0,
    );
  }
  return 0;
}

async function upsertRows(client: Client, table: string, rows: any[]) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  const conflictColumns = conflictTargets[table];
  const tableJsonFields = new Set(jsonFields[table] || []);
  const values: unknown[] = [];
  const rowPlaceholders = rows.map((row, rowIndex) => {
    const placeholders = columns.map((column, columnIndex) => {
      const value = row[column];
      values.push(tableJsonFields.has(column) && value !== null && value !== undefined ? JSON.stringify(value) : value);
      return `$${rowIndex * columns.length + columnIndex + 1}`;
    });
    return `(${placeholders.join(', ')})`;
  });
  const updateColumns = columns.filter((column) => !conflictColumns.includes(column));

  await client.query(
    `
      insert into public.${quoteIdent(table)} (${columns.map(quoteIdent).join(', ')})
      values ${rowPlaceholders.join(', ')}
      on conflict (${conflictColumns.map(quoteIdent).join(', ')})
      do update set ${updateColumns.map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`).join(', ')}
    `,
    values,
  );
}

async function downloadTargetObject(client: SupabaseAnyClient, objectPath: string) {
  const result = await client.storage.from(bucketName).download(objectPath);
  if (result.error || !result.data) return null;
  return Buffer.from(await result.data.arrayBuffer());
}

async function uploadObjects(client: SupabaseAnyClient, objects: StorageObjectManifest[]) {
  let uploaded = 0;
  let skipped = 0;
  let overwritten = 0;
  let verified = 0;
  let checksumMatches = 0;
  let checksumMismatches = 0;
  const folderCounts: Record<string, number> = {};

  for (const object of objects) {
    folderCounts[object.folder] = (folderCounts[object.folder] || 0) + 1;
    if (!object.localRelativePath || !object.sha256 || object.bucket !== bucketName) {
      checksumMismatches += 1;
      continue;
    }

    const sourceBytes = await fs.readFile(path.join(process.cwd(), object.localRelativePath));
    const sourceDigest = sha256Hex(sourceBytes);
    if (sourceDigest !== object.sha256) {
      checksumMismatches += 1;
      continue;
    }

    const existingBytes = await downloadTargetObject(client, object.path);
    if (existingBytes && existingBytes.length === sourceBytes.length && sha256Hex(existingBytes) === object.sha256) {
      skipped += 1;
    } else {
      const result = await client.storage.from(bucketName).upload(object.path, sourceBytes, {
        contentType: object.contentType || undefined,
        upsert: true,
      });
      if (result.error) throw new Error(`Storage upload failed: ${result.error.message}`);
      if (existingBytes) overwritten += 1;
      else uploaded += 1;
    }

    const targetBytes = await downloadTargetObject(client, object.path);
    verified += 1;
    if (targetBytes && sha256Hex(targetBytes) === object.sha256) checksumMatches += 1;
    else checksumMismatches += 1;
  }

  return { uploaded, skipped, overwritten, verified, checksumMatches, checksumMismatches, folderCounts };
}

async function rewriteStorageUrls(client: Client, refs: StorageUrlReference[], objectPaths: Set<string>) {
  const tables = Array.from(new Set(refs.map((ref) => ref.table))).sort();
  let oldRefsBefore = 0;
  let oldRefsAfter = 0;
  let targetRefsAfter = 0;
  let rowsUpdated = 0;
  let fieldsRewritten = 0;

  await client.query('begin');
  try {
    for (const table of tables) {
      if (!conflictTargets[table]) throw new Error(`No conflict target configured for ${table}.`);
      const result = await client.query(`select * from public.${quoteIdent(table)}`);
      const updatedRows: any[] = [];

      for (const row of result.rows) {
        oldRefsBefore += countStorageUrlRefs(row, sourceProjectRef);
        const stats = { rewritten: 0 };
        const updatedRow = rewriteValue(row, objectPaths, stats);
        if (stats.rewritten > 0) {
          fieldsRewritten += stats.rewritten;
          rowsUpdated += 1;
          updatedRows.push(updatedRow);
        }
      }

      await upsertRows(client, table, updatedRows);

      const after = await client.query(`select * from public.${quoteIdent(table)}`);
      for (const row of after.rows) {
        oldRefsAfter += countStorageUrlRefs(row, sourceProjectRef);
        targetRefsAfter += countStorageUrlRefs(row, expectedTargetRef);
      }
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }

  return { oldRefsBefore, oldRefsAfter, targetRefsAfter, rowsUpdated, fieldsRewritten };
}

async function main() {
  const { targetRef, targetUrl, targetKey, targetDbUrl } = assertTargetIdentity();
  const storageManifest = await readJson<{ objects: StorageObjectManifest[] }>(storageManifestPath);
  const urlRefs = await readJson<StorageUrlReference[]>(sourceUrlRefsPath);
  const appReport = await readJson<any>(applicationImportReportPath);
  const objects = storageManifest.objects.filter((object) => object.bucket === bucketName);
  const objectPaths = new Set(objects.map((object) => object.path));

  if (!appReport.importCompleted) throw new Error('Application import report is not complete.');
  if (objects.length !== 45) throw new Error('Source Storage export object count preflight failed.');
  if (objects.filter((object) => object.sha256 && object.downloadSuccess).length !== 45) {
    throw new Error('Source Storage checksum preflight failed.');
  }
  if (urlRefs.length !== 8) throw new Error('Source Storage URL reference preflight failed.');
  if (!urlRefs.every((ref) => sourceUrlCanBeRewritten(ref.oldUrl, objectPaths))) {
    throw new Error('One or more source Storage URL references does not match an exported object.');
  }

  const supabase = createClient(targetUrl, targetKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const pg = new Client({ connectionString: targetDbUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  try {
    const targetAuthCount = (await listTargetAuthUsers(supabase)).length;
    if (targetAuthCount !== 161) throw new Error('Target Auth count preflight failed.');

    const tableCountsBefore = await getTableCounts(pg);
    const tableCountMismatchesBefore = Object.entries(expectedTableCounts).filter(([table, count]) => tableCountsBefore[table] !== count);
    if (tableCountMismatchesBefore.length) throw new Error('Target table count preflight failed.');

    const bucket = await pg.query('select public from storage.buckets where id = $1', [bucketName]);
    if (!bucket.rows[0]?.public) throw new Error('Target school-assets bucket preflight failed.');

    const storageResult = await uploadObjects(supabase, objects);
    const rewriteResult = await rewriteStorageUrls(pg, urlRefs, objectPaths);
    const tableCountsAfter = await getTableCounts(pg);
    const tableCountMismatchesAfter = Object.entries(expectedTableCounts).filter(([table, count]) => tableCountsAfter[table] !== count);
    const finalTargetAuthCount = (await listTargetAuthUsers(supabase)).length;

    const completionStatus =
      storageResult.checksumMatches === 45 &&
      storageResult.checksumMismatches === 0 &&
      rewriteResult.oldRefsBefore === 8 &&
      rewriteResult.oldRefsAfter === 0 &&
      rewriteResult.targetRefsAfter === 8 &&
      tableCountMismatchesAfter.length === 0 &&
      finalTargetAuthCount === 161;

    const report = {
      generatedAt: new Date().toISOString(),
      targetProjectRef: targetRef,
      expectedObjectCount: 45,
      uploadedCount: storageResult.uploaded,
      skippedCount: storageResult.skipped,
      overwrittenCount: storageResult.overwritten,
      verifiedCount: storageResult.verified,
      checksumExpectedCount: 45,
      checksumMatchCount: storageResult.checksumMatches,
      checksumMismatchCount: storageResult.checksumMismatches,
      folderCounts: storageResult.folderCounts,
      oldStorageUrlReferencesBefore: rewriteResult.oldRefsBefore,
      oldStorageUrlReferencesAfter: rewriteResult.oldRefsAfter,
      targetStorageUrlReferencesAfter: rewriteResult.targetRefsAfter,
      rowsUpdatedForUrlRewrite: rewriteResult.rowsUpdated,
      fieldsRewritten: rewriteResult.fieldsRewritten,
      tableCountsAfter,
      tableCountMismatchCount: tableCountMismatchesAfter.length,
      targetAuthCount: finalTargetAuthCount,
      sourceWrites: 0,
      authChangesThisPhase: 0,
      applicationTableReimportStarted: false,
      netlifyTouched: false,
      completionStatus,
      passportPrivacyFutureReviewRequired: true,
    };

    await fs.mkdir(targetReportDir, { recursive: true });
    await fs.writeFile(storageReportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    await fs.writeFile(
      storageReportMdPath,
      [
        '# SouthGold Storage Migration Report',
        '',
        `Generated at: ${report.generatedAt}`,
        `Target project ref: ${targetRef}`,
        `Completion status: ${completionStatus ? 'PASS' : 'FAIL'}`,
        `Expected objects: ${report.expectedObjectCount}`,
        `Uploaded: ${report.uploadedCount}`,
        `Skipped: ${report.skippedCount}`,
        `Verified: ${report.verifiedCount}`,
        `Checksum matches: ${report.checksumMatchCount}`,
        `Old URL refs before: ${report.oldStorageUrlReferencesBefore}`,
        `Old URL refs after: ${report.oldStorageUrlReferencesAfter}`,
        `Target URL refs after: ${report.targetStorageUrlReferencesAfter}`,
        '',
      ].join('\n'),
      'utf8',
    );

    console.log(`Target project ref: ${targetRef}`);
    console.log(`Storage objects expected: ${report.expectedObjectCount}`);
    console.log(`Storage objects uploaded: ${report.uploadedCount}`);
    console.log(`Storage objects skipped: ${report.skippedCount}`);
    console.log(`Storage objects verified: ${report.verifiedCount}`);
    console.log(`Checksum matches: ${report.checksumMatchCount}`);
    console.log(`Checksum mismatches: ${report.checksumMismatchCount}`);
    console.log(`Old source Storage URL refs before: ${report.oldStorageUrlReferencesBefore}`);
    console.log(`Old source Storage URL refs after: ${report.oldStorageUrlReferencesAfter}`);
    console.log(`Target Storage URL refs after: ${report.targetStorageUrlReferencesAfter}`);
    console.log(`Storage migration validation: ${completionStatus ? 'PASS' : 'FAIL'}`);

    if (!completionStatus) process.exit(1);
  } finally {
    await pg.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'SouthGold Storage migration failed.');
  process.exit(1);
});
