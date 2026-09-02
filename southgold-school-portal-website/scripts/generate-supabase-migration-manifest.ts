import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const manifestVersion = 1;
const outputDir = path.join(process.cwd(), '.local', 'migration');
const jsonOutputPath = path.join(outputDir, 'migration-manifest.json');
const mdOutputPath = path.join(outputDir, 'migration-manifest.md');

const sourceUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const sourceKey = process.env.SUPABASE_SECRET_KEY;

type TableCategory =
  | 'identity'
  | 'role'
  | 'academic'
  | 'relationship'
  | 'transaction'
  | 'cms'
  | 'configuration';

type SupabaseAnyClient = ReturnType<typeof createClient<any>>;

const tableCategories: Record<string, TableCategory> = {
  users: 'identity',
  super_admins: 'role',
  staff_admins: 'role',
  teachers: 'role',
  parents: 'role',
  students: 'identity',
  subjects: 'academic',
  classes: 'academic',
  classes_subjects: 'relationship',
  sessions: 'academic',
  attendance: 'transaction',
  results: 'academic',
  fees: 'transaction',
  notifications: 'transaction',
  tickets: 'transaction',
  activities: 'cms',
  configurations: 'configuration',
  cms_content: 'cms',
  student_subjects: 'relationship',
  teacher_subjects: 'relationship',
  result_approval_requests: 'academic',
  early_years_results: 'academic',
};

const expectedTables = Object.keys(tableCategories);

const expectedColumns: Record<string, string[]> = {
  users: ['can_change_password', 'created_at', 'created_by', 'email', 'full_name', 'id', 'linked_id', 'status', 'updated_at', 'user_role'],
  super_admins: ['email', 'full_name', 'user_id'],
  staff_admins: ['created_by', 'department', 'email', 'full_name', 'permissions', 'user_id'],
  teachers: ['classes_assigned', 'department', 'email', 'first_name', 'id', 'last_name', 'phone', 'photo', 'staff_id', 'status', 'user_id'],
  parents: ['address', 'created_at', 'created_by', 'email', 'first_name', 'id', 'last_name', 'phone', 'status', 'user_id'],
  students: ['admission_no', 'arm', 'class_id', 'created_at', 'date_of_birth', 'email', 'first_name', 'gender', 'id', 'last_name', 'parent_email', 'parent_id', 'parent_name', 'parent_phone', 'photo', 'status', 'subjects', 'user_id'],
  subjects: ['code', 'id', 'name'],
  classes: ['class_id', 'class_teacher_id', 'created_at', 'stage'],
  classes_subjects: ['class_id', 'stage', 'subjects'],
  sessions: ['end_date', 'id', 'is_active', 'name', 'start_date'],
  attendance: ['date', 'entity_id', 'entity_type', 'id', 'remark', 'session', 'status', 'term'],
  results: ['arm', 'assignment_score', 'class_id', 'created_at', 'exam_score', 'grade', 'id', 'is_approved', 'session', 'student_id', 'subject_id', 'teacher_remark', 'term', 'test_score', 'total_score'],
  fees: ['amount', 'amount_paid', 'due_date', 'id', 'status', 'student_id', 'title', 'transaction_history'],
  notifications: ['category', 'content', 'date', 'id', 'is_read', 'recipient_id', 'recipient_role', 'title'],
  tickets: ['created_at', 'id', 'message', 'replies', 'sender_email', 'sender_name', 'sender_role', 'status', 'subject'],
  activities: ['badge', 'description', 'footer', 'id', 'img_url', 'title'],
  configurations: ['ca_assignment_max', 'ca_test_max', 'closing_date', 'current_session_id', 'current_term', 'early_years_grading_scale', 'exam_max', 'grading_scale', 'id', 'logo_url', 'resumption_date', 'school_address', 'school_email', 'school_name', 'school_phone'],
  cms_content: ['content', 'id', 'updated_at'],
  student_subjects: ['student_id', 'subject_id'],
  teacher_subjects: ['class_id', 'subject_id', 'teacher_id'],
  result_approval_requests: ['class_id', 'head_teacher_comment', 'id', 'principal_comment', 'review_history', 'session', 'status', 'submission_time', 'teacher_id', 'term'],
  early_years_results: ['academic_readiness', 'admin_review', 'arm', 'behavioural_development', 'class_id', 'communication_skills', 'created_at', 'id', 'is_approved', 'learning_readiness', 'motor_skills', 'overall_development', 'rating', 'session', 'social_development', 'status', 'student_id', 'subject_id', 'teacher_comment', 'term'],
};

const baselineCounts: Record<string, number> = {
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
    throw new Error('Required source credential is unavailable.');
  }
}

function uniq(values: string[]) {
  return Array.from(new Set(values)).sort();
}

async function getPostgrestSchema() {
  requireSourceConfig();
  const response = await fetch(sourceUrl!.replace(/\/$/, '') + '/rest/v1/', {
    headers: {
      apikey: sourceKey!,
      Authorization: `Bearer ${sourceKey}`,
      Accept: 'application/openapi+json',
    },
  });

  if (!response.ok) {
    return { ok: false, status: response.status, columnsByTable: {} as Record<string, string[]> };
  }

  const spec: any = await response.json();
  const definitions = spec.definitions || spec.components?.schemas || {};
  const columnsByTable: Record<string, string[]> = {};
  for (const [name, definition] of Object.entries<any>(definitions)) {
    if (name.startsWith('rpc_')) continue;
    columnsByTable[name] = Object.keys(definition.properties || {}).sort();
  }
  return { ok: true, status: response.status, columnsByTable };
}

async function countRows(client: SupabaseAnyClient, table: string) {
  const result = await client.from(table).select('*', { count: 'exact', head: true });
  return {
    succeeded: !result.error,
    rowCount: result.error ? null : result.count ?? 0,
    errorCode: result.error?.code,
  };
}

async function getAllRows(client: SupabaseAnyClient, table: string, columns: string) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let start = 0; ; start += pageSize) {
    const result = await client.from(table).select(columns).range(start, start + pageSize - 1);
    if (result.error) throw new Error(`${table}: ${result.error.message}`);
    rows.push(...(result.data || []));
    if (!result.data || result.data.length < pageSize) break;
  }
  return rows;
}

function scanForUrlFields(value: unknown, hostNeedle: string, pathPrefix = '', matches: string[] = []) {
  if (value === null || value === undefined) return matches;
  if (typeof value === 'string') {
    if (value.includes(hostNeedle)) matches.push(pathPrefix || '(value)');
    return matches;
  }
  if (Array.isArray(value)) {
    for (const item of value) scanForUrlFields(item, hostNeedle, pathPrefix, matches);
    return matches;
  }
  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      scanForUrlFields(nested, hostNeedle, pathPrefix ? `${pathPrefix}.${key}` : key, matches);
    }
  }
  return matches;
}

async function getAuthManifest(client: SupabaseAnyClient, publicUsers: any[]) {
  const authUsers: any[] = [];
  for (let page = 1; ; page += 1) {
    const result = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw new Error(result.error.message);
    const batch = result.data?.users || [];
    authUsers.push(...batch);
    if (batch.length < 1000) break;
  }

  const authIds = new Set(authUsers.map((user) => user.id));
  const publicUserIds = new Set(publicUsers.map((user) => user.id));
  const providerCounts: Record<string, number> = {};
  let passwordHashesAvailable = false;

  for (const user of authUsers) {
    const providers = new Set<string>();
    for (const identity of user.identities || []) {
      if (identity.provider) providers.add(identity.provider);
    }
    if (!providers.size && user.app_metadata?.provider) providers.add(user.app_metadata.provider);
    if (!providers.size) providers.add('unknown');
    for (const provider of providers) providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    if ('encrypted_password' in user || 'password_hash' in user) passwordHashesAvailable = true;
  }

  return {
    totalAuthUsers: authUsers.length,
    providerCounts,
    matchingPublicUsers: publicUsers.filter((user) => authIds.has(user.id)).length,
    authUsersWithoutPublicUsers: authUsers.filter((user) => !publicUserIds.has(user.id)).length,
    publicUsersWithoutAuthUsers: publicUsers.filter((user) => !authIds.has(user.id)).length,
    passwordHashesAvailable,
    authIds,
  };
}

async function getStorageManifest(client: SupabaseAnyClient) {
  const bucketsResult = await client.storage.listBuckets();
  if (bucketsResult.error) throw new Error(bucketsResult.error.message);

  const buckets = [];

  for (const bucket of bucketsResult.data || []) {
    const stack = [''];
    const topLevelFolders = new Set<string>();
    const objectCountByFolder: Record<string, number> = {};
    let totalObjectCount = 0;

    while (stack.length) {
      const current = stack.pop() || '';
      const listResult = await client.storage.from(bucket.name).list(current, { limit: 1000, offset: 0 });
      if (listResult.error) throw new Error(`${bucket.name}/${current}: ${listResult.error.message}`);

      for (const item of listResult.data || []) {
        const objectPath = current ? `${current}/${item.name}` : item.name;
        const appearsToBeFolder = !item.id && !item.metadata;

        if (appearsToBeFolder) {
          if (!current) topLevelFolders.add(item.name);
          stack.push(objectPath);
        } else {
          totalObjectCount += 1;
          const folder = objectPath.includes('/') ? objectPath.split('/')[0] : '(root)';
          objectCountByFolder[folder] = (objectCountByFolder[folder] || 0) + 1;
        }
      }
    }

    buckets.push({
      name: bucket.name,
      public: Boolean(bucket.public),
      totalObjectCount,
      topLevelFolders: Array.from(topLevelFolders).sort(),
      objectCountByFolder,
    });
  }

  return buckets;
}

async function getMigrationInventory() {
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const files = (await fs.readdir(migrationsDir)).filter((file) => file.endsWith('.sql')).sort();
  const migrations = [];

  for (const file of files) {
    const content = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    const purpose =
      content
        .split(/\r?\n/)
        .find((line) => line.startsWith('-- Migration') || (line.startsWith('--') && !line.includes('====')))
        ?.replace(/^--\s*/, '')
        .trim() || 'Purpose not stated';

    migrations.push({
      filename: file,
      migrationNumber: file.match(/^(\d+)/)?.[1] || null,
      purpose,
      requiredForTargetReconstruction: true,
    });
  }

  return migrations;
}

function buildMarkdown(manifest: any) {
  const lines: string[] = [];
  lines.push('# SouthGold Supabase Migration Manifest');
  lines.push('');
  lines.push(`Generated at: ${manifest.generatedAt}`);
  lines.push(`Source project ref: ${manifest.sourceProjectRef}`);
  lines.push(`Manifest version: ${manifest.manifestVersion}`);
  lines.push('');
  lines.push('## Table Counts');
  for (const table of manifest.tableManifest) {
    lines.push(`- ${table.table}: ${table.rowCount} (${table.migrationCategory}, succeeded: ${table.countSucceeded})`);
  }
  lines.push('');
  lines.push('## Auth Summary');
  lines.push(`- Auth users: ${manifest.authManifest.totalAuthUsers}`);
  lines.push(`- Provider counts: ${JSON.stringify(manifest.authManifest.providerCounts)}`);
  lines.push(`- Matching public users: ${manifest.authManifest.matchingPublicUsers}`);
  lines.push(`- Auth users without public users: ${manifest.authManifest.authUsersWithoutPublicUsers}`);
  lines.push(`- Public users without Auth users: ${manifest.authManifest.publicUsersWithoutAuthUsers}`);
  lines.push('');
  lines.push('## Storage Summary');
  for (const bucket of manifest.storageManifest.buckets) {
    lines.push(`- ${bucket.name}: public=${bucket.public}, objects=${bucket.totalObjectCount}, folders=${bucket.topLevelFolders.join(', ') || '(root)'}`);
  }
  lines.push('');
  lines.push('## Schema Findings');
  lines.push(`- Missing expected tables: ${manifest.schemaManifest.missingExpectedTables.join(', ') || 'none'}`);
  lines.push(`- Additional production tables: ${manifest.schemaManifest.additionalProductionTables.join(', ') || 'none'}`);
  lines.push(`- Uncertain findings: ${manifest.schemaManifest.uncertainFindings.join('; ') || 'none'}`);
  lines.push('');
  lines.push('## Target Readiness');
  for (const [key, value] of Object.entries(manifest.targetReadiness)) {
    lines.push(`- ${key}: ${JSON.stringify(value)}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main() {
  requireSourceConfig();

  const generatedAt = new Date().toISOString();
  const sourceProjectRef = getSourceProjectRef();
  const client = createClient(sourceUrl!, sourceKey!, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    global: { headers: { 'Cache-Control': 'no-store' } },
  });

  const schema = await getPostgrestSchema();
  const discoveredProductionTables = Object.keys(schema.columnsByTable).sort();
  const additionalProductionTables = discoveredProductionTables.filter((table) => !expectedTables.includes(table));
  const allTables = uniq([...expectedTables, ...additionalProductionTables]);

  const tableManifest = [];
  for (const table of allTables) {
    const count = await countRows(client, table);
    tableManifest.push({
      table,
      rowCount: count.rowCount,
      countSucceeded: count.succeeded,
      migrationCategory: tableCategories[table] || 'transaction',
      errorCode: count.errorCode || null,
    });
  }

  const publicUsers = await getAllRows(client, 'users', 'id,user_role,linked_id');
  const authManifest = await getAuthManifest(client, publicUsers);
  const authIds = authManifest.authIds;
  const publicUserIds = new Set(publicUsers.map((user) => user.id));

  const roleIntegrity: Record<string, any> = {};
  for (const table of ['super_admins', 'staff_admins']) {
    const rows = await getAllRows(client, table, 'user_id');
    roleIntegrity[table] = {
      rows: rows.length,
      rowsMissingPublicUsers: rows.filter((row) => row.user_id && !publicUserIds.has(row.user_id)).length,
      rowsMissingAuthUsers: rows.filter((row) => row.user_id && !authIds.has(row.user_id)).length,
    };
  }
  for (const table of ['teachers', 'parents', 'students']) {
    const rows = await getAllRows(client, table, 'id,user_id');
    roleIntegrity[table] = {
      rows: rows.length,
      rowsWithUserId: rows.filter((row) => Boolean(row.user_id)).length,
      rowsMissingPublicUsers: rows.filter((row) => row.user_id && !publicUserIds.has(row.user_id)).length,
      rowsMissingAuthUsers: rows.filter((row) => row.user_id && !authIds.has(row.user_id)).length,
    };
  }

  const [students, parents, teachers, subjects, classes, results, studentSubjects, teacherSubjects] = await Promise.all([
    getAllRows(client, 'students', 'id,parent_id,user_id'),
    getAllRows(client, 'parents', 'id,user_id'),
    getAllRows(client, 'teachers', 'id,user_id'),
    getAllRows(client, 'subjects', 'id'),
    getAllRows(client, 'classes', 'class_id,class_teacher_id'),
    getAllRows(client, 'results', 'id,student_id,subject_id'),
    getAllRows(client, 'student_subjects', 'student_id,subject_id'),
    getAllRows(client, 'teacher_subjects', 'teacher_id,subject_id,class_id'),
  ]);

  const parentIds = new Set(parents.map((row) => row.id));
  const teacherIds = new Set(teachers.map((row) => row.id));
  const studentIds = new Set(students.map((row) => row.id));
  const subjectIds = new Set(subjects.map((row) => row.id));
  const classIds = new Set(classes.map((row) => row.class_id));

  const academicIntegrity = {
    studentsMissingParents: students.filter((row) => row.parent_id && !parentIds.has(row.parent_id)).length,
    resultsMissingStudents: results.filter((row) => !studentIds.has(row.student_id)).length,
    resultsMissingSubjects: results.filter((row) => row.subject_id && !subjectIds.has(row.subject_id)).length,
    studentSubjectsMissingStudents: studentSubjects.filter((row) => !studentIds.has(row.student_id)).length,
    studentSubjectsMissingSubjects: studentSubjects.filter((row) => !subjectIds.has(row.subject_id)).length,
    teacherSubjectsMissingTeachers: teacherSubjects.filter((row) => !teacherIds.has(row.teacher_id)).length,
    teacherSubjectsMissingSubjects: teacherSubjects.filter((row) => !subjectIds.has(row.subject_id)).length,
    teacherSubjectsMissingClasses: teacherSubjects.filter((row) => !classIds.has(row.class_id)).length,
    classesWithInvalidClassTeacherId: classes.filter((row) => row.class_teacher_id && !teacherIds.has(row.class_teacher_id)).length,
  };

  const storageBuckets = await getStorageManifest(client);

  const hostNeedle = `${sourceProjectRef}.supabase.co/storage/`;
  const storageUrlReferences: Record<string, any> = {};
  for (const table of allTables) {
    const rows = await getAllRows(client, table, '*');
    const fieldCounts: Record<string, number> = {};
    let recordsWithStorageUrls = 0;
    for (const row of rows) {
      const fields = uniq(scanForUrlFields(row, hostNeedle));
      if (!fields.length) continue;
      recordsWithStorageUrls += 1;
      for (const field of fields) fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    }
    if (recordsWithStorageUrls) {
      storageUrlReferences[table] = { recordsWithStorageUrls, fieldCounts };
    }
  }

  const expectedColumnsApparentlyMissingLive: Record<string, string[]> = {};
  const productionColumnsNotRepresentedInRepository: Record<string, string[]> = {};
  for (const table of expectedTables) {
    const liveColumns = schema.columnsByTable[table] || [];
    const expected = expectedColumns[table] || [];
    const missing = expected.filter((column) => !liveColumns.includes(column));
    const extra = liveColumns.filter((column) => !expected.includes(column));
    if (missing.length) expectedColumnsApparentlyMissingLive[table] = missing;
    if (extra.length) productionColumnsNotRepresentedInRepository[table] = extra;
  }

  let rpcMetadata = {
    liveRpcEndpointAppearsAvailable: false,
    metadataHttpStatus: null as number | null,
    metadataError: null as string | null,
  };
  try {
    const rpcResponse = await fetch(sourceUrl!.replace(/\/$/, '') + '/rest/v1/rpc/onboard_student_transaction', {
      method: 'OPTIONS',
      headers: { apikey: sourceKey!, Authorization: `Bearer ${sourceKey}` },
    });
    rpcMetadata = {
      liveRpcEndpointAppearsAvailable: rpcResponse.status < 500,
      metadataHttpStatus: rpcResponse.status,
      metadataError: null,
    };
  } catch (error) {
    rpcMetadata.metadataError = error instanceof Error ? error.message : 'RPC metadata check failed.';
  }

  const migrationInventory = await getMigrationInventory();
  const baselineComparison = tableManifest.map((table) => ({
    table: table.table,
    previousCount: baselineCounts[table.table] ?? null,
    currentCount: table.rowCount,
    changed: baselineCounts[table.table] !== undefined && baselineCounts[table.table] !== table.rowCount,
  }));

  const uncertainFindings: string[] = [];
  if (expectedColumnsApparentlyMissingLive.cms_content?.includes('updated_at')) {
    uncertainFindings.push('cms_content.updated_at is expected from migration 0014 but is not visible in PostgREST metadata; this may be unapplied migration or schema cache ambiguity.');
  }

  const totalStorageObjects = storageBuckets.reduce((sum, bucket) => sum + bucket.totalObjectCount, 0);

  const manifest = {
    manifestVersion,
    generatedAt,
    sourceProjectRef,
    tableManifest,
    authManifest: {
      totalAuthUsers: authManifest.totalAuthUsers,
      providerCounts: authManifest.providerCounts,
      matchingPublicUsers: authManifest.matchingPublicUsers,
      authUsersWithoutPublicUsers: authManifest.authUsersWithoutPublicUsers,
      publicUsersWithoutAuthUsers: authManifest.publicUsersWithoutAuthUsers,
      passwordHashesAvailable: authManifest.passwordHashesAvailable,
    },
    roleIntegrity,
    academicIntegrity,
    storageManifest: {
      buckets: storageBuckets,
      totalObjectCount: totalStorageObjects,
    },
    storageUrlReferences,
    schemaManifest: {
      postgrestMetadataReadable: schema.ok,
      postgrestStatus: schema.status,
      expectedTables,
      discoveredProductionTables,
      missingExpectedTables: expectedTables.filter((table) => !discoveredProductionTables.includes(table)),
      additionalProductionTables,
      expectedColumnsApparentlyMissingLive,
      productionColumnsNotRepresentedInRepository,
      uncertainFindings,
    },
    migrationFileManifest: migrationInventory,
    rpcFunctionManifest: [
      {
        functionName: 'onboard_student_transaction',
        referencedByApplication: true,
        liveRpcEndpointAppearsAvailable: rpcMetadata.liveRpcEndpointAppearsAvailable,
        metadataHttpStatus: rpcMetadata.metadataHttpStatus,
        metadataError: rpcMetadata.metadataError,
        definingMigrations: ['0009_student_onboarding_transaction.sql', '0012_remove_onboarding_activities_coupling.sql'],
        executed: false,
      },
    ],
    targetReadiness: {
      sourceProjectRef,
      tableInventoryComplete: tableManifest.every((table) => table.countSucceeded),
      authReadable: true,
      passwordHashesAvailable: authManifest.passwordHashesAvailable,
      storageReadable: true,
      storageObjectCount: totalStorageObjects,
      schemaReconstructionAvailable: migrationInventory.length > 0 && !expectedTables.some((table) => !expectedColumns[table]),
      authRemappingRequired: !authManifest.passwordHashesAvailable,
      storageUrlRewriteRequired: Object.keys(storageUrlReferences).length > 0,
      pendingSchemaDrift: Object.keys(expectedColumnsApparentlyMissingLive).length > 0 || additionalProductionTables.length > 0,
      recommendedTargetType: 'brand-new Supabase project',
    },
  };

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(jsonOutputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  await fs.writeFile(mdOutputPath, buildMarkdown(manifest), 'utf8');

  console.log(`Manifest generated: ${path.relative(process.cwd(), jsonOutputPath)}`);
  console.log(`Human summary generated: ${path.relative(process.cwd(), mdOutputPath)}`);
  console.log(`Source project ref: ${sourceProjectRef}`);
  console.log(`Tables inventoried: ${tableManifest.length}`);
  console.log(`Auth users counted: ${authManifest.totalAuthUsers}`);
  console.log(`Storage objects counted: ${totalStorageObjects}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Manifest generation failed.');
  process.exit(1);
});
