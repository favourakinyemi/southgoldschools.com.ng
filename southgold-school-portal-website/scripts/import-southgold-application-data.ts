import fs from 'fs/promises';
import path from 'path';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const expectedTargetRef = 'utmbrfsiyowjfjfeodof';
const forbiddenRefs = ['bkrnnfybboiotvtpscmt', 'opdxxhqwwrsvllbtsraz'];
const exportRoot = path.join(process.cwd(), '.local', 'migration', 'source-export');
const dataDir = path.join(exportRoot, 'data');
const targetReportDir = path.join(process.cwd(), '.local', 'migration', 'target');
const authIdMapPath = path.join(process.cwd(), '.local', 'migration', 'auth', 'auth-id-map.json');
const authExportPath = path.join(exportRoot, 'auth', 'auth-users.json');
const exportMetadataPath = path.join(exportRoot, 'export-metadata.json');
const importReportPath = path.join(targetReportDir, 'application-import-report.json');
const importReportMdPath = path.join(targetReportDir, 'application-import-report.md');

const tableOrder = [
  'users',
  'subjects',
  'sessions',
  'configurations',
  'cms_content',
  'activities',
  'notifications',
  'tickets',
  'super_admins',
  'staff_admins',
  'teachers',
  'parents',
  'classes',
  'students',
  'classes_subjects',
  'student_subjects',
  'teacher_subjects',
  'attendance',
  'results',
  'fees',
  'result_approval_requests',
  'early_years_results',
];

const conflictTargets: Record<string, string[]> = {
  users: ['id'],
  super_admins: ['user_id'],
  staff_admins: ['user_id'],
  teachers: ['id'],
  parents: ['id'],
  students: ['id'],
  subjects: ['id'],
  classes: ['class_id'],
  classes_subjects: ['class_id'],
  sessions: ['id'],
  attendance: ['id'],
  results: ['id'],
  fees: ['id'],
  notifications: ['id'],
  tickets: ['id'],
  activities: ['id'],
  configurations: ['id'],
  cms_content: ['id'],
  student_subjects: ['student_id', 'subject_id'],
  teacher_subjects: ['teacher_id', 'subject_id', 'class_id'],
  result_approval_requests: ['id'],
  early_years_results: ['id'],
};

const authUuidFields: Record<string, string[]> = {
  users: ['id', 'created_by'],
  super_admins: ['user_id'],
  staff_admins: ['user_id', 'created_by'],
  teachers: ['user_id'],
  parents: ['user_id', 'created_by'],
  students: ['user_id'],
  notifications: ['recipient_id'],
};

const jsonFields: Record<string, string[]> = {
  staff_admins: ['permissions'],
  teachers: ['classes_assigned'],
  configurations: ['grading_scale', 'early_years_grading_scale'],
  cms_content: ['content'],
  fees: ['transaction_history'],
  tickets: ['replies'],
  result_approval_requests: ['review_history'],
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
  for (const forbiddenRef of forbiddenRefs) {
    if (targetUrl.includes(forbiddenRef) || targetKey.includes(forbiddenRef) || targetDbUrl.includes(forbiddenRef)) {
      throw new Error('Target configuration references a forbidden old project ref.');
    }
  }

  return { targetRef, targetUrl, targetKey, targetDbUrl };
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

function quoteIdent(value: string) {
  return '"' + value.replace(/"/g, '""') + '"';
}

async function listAllTargetAuthUsers(client: SupabaseAnyClient) {
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

async function getTableCounts(client: Client, tables: string[]) {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const result = await client.query(`select count(*)::int as count from public.${quoteIdent(table)}`);
    counts[table] = Number(result.rows[0]?.count ?? 0);
  }
  return counts;
}

function remapRow(table: string, row: any, authMap: Record<string, string | null>) {
  const copy = { ...row };
  for (const field of authUuidFields[table] || []) {
    if (copy[field] && authMap[copy[field]]) copy[field] = authMap[copy[field]];
  }
  return copy;
}

async function upsertRows(client: Client, table: string, rows: any[]) {
  if (!rows.length) return;

  const columns = Object.keys(rows[0]);
  const tableJsonFields = new Set(jsonFields[table] || []);
  const conflictColumns = conflictTargets[table];
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
  const updateSql = updateColumns.length
    ? `do update set ${updateColumns.map((column) => `${quoteIdent(column)} = excluded.${quoteIdent(column)}`).join(', ')}`
    : 'do nothing';

  await client.query(
    `
      insert into public.${quoteIdent(table)} (${columns.map(quoteIdent).join(', ')})
      values ${rowPlaceholders.join(', ')}
      on conflict (${conflictColumns.map(quoteIdent).join(', ')}) ${updateSql}
    `,
    values,
  );
}

function scanForSourceStorageUrls(value: unknown, matches: string[] = []) {
  if (value === null || value === undefined) return matches;
  if (typeof value === 'string') {
    if (value.includes('bkrnnfybboiotvtpscmt.supabase.co')) matches.push(value);
    return matches;
  }
  if (Array.isArray(value)) {
    for (const item of value) scanForSourceStorageUrls(item, matches);
    return matches;
  }
  if (typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) scanForSourceStorageUrls(nested, matches);
  }
  return matches;
}

function countMissing(rows: any[], field: string, validIds: Set<unknown>, allowNull = false) {
  return rows.filter((row) => {
    const value = row[field];
    if ((value === null || value === undefined || value === '') && allowNull) return false;
    return !validIds.has(value);
  }).length;
}

function ids(rows: any[], field = 'id') {
  return new Set(rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined && value !== ''));
}

async function writeReports(report: any) {
  await fs.mkdir(targetReportDir, { recursive: true });
  await fs.writeFile(importReportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  const lines = [
    '# SouthGold Application Data Import Report',
    '',
    `Generated at: ${report.generatedAt}`,
    `Target project ref: ${report.targetProjectRef}`,
    `Import status: ${report.importCompleted ? 'PASS' : 'FAIL'}`,
    '',
    '## Counts',
    ...Object.entries(report.targetCounts).map(([table, count]) => `- ${table}: ${count} / ${report.expectedCounts[table]}`),
    '',
    `Count mismatches: ${Object.keys(report.countMismatches).length}`,
    `Broken relationship total: ${report.relationshipValidation.brokenRelationshipTotal}`,
    `Old source Storage URL references: ${report.oldSourceStorageUrlReferenceCount}`,
    `Source writes: ${report.sourceWrites}`,
    `Storage object migration started: ${report.storageObjectMigrationStarted}`,
    `Auth migration started in this phase: ${report.authMigrationStartedThisPhase}`,
    '',
  ];
  await fs.writeFile(importReportMdPath, lines.join('\n'), 'utf8');
}

async function main() {
  const { targetRef, targetUrl, targetKey, targetDbUrl } = assertTargetIdentity();
  const exportMetadata = await readJson<any>(exportMetadataPath);
  const authMap = await readJson<Record<string, string | null>>(authIdMapPath);
  const sourceAuthUsers = await readJson<any[]>(authExportPath);
  const tableFiles = Object.fromEntries(
    await Promise.all(tableOrder.map(async (table) => [table, await readJson<any[]>(path.join(dataDir, `${table}.json`))])),
  ) as Record<string, any[]>;

  const linkedAuthUsers = sourceAuthUsers.filter((user) => !user.orphanAuthUser);
  const orphanAuthUsers = sourceAuthUsers.filter((user) => user.orphanAuthUser);
  const completedMappings = linkedAuthUsers.filter((user) => Boolean(authMap[user.id])).length;
  const unresolvedMappings = linkedAuthUsers.length - completedMappings;
  if (linkedAuthUsers.length !== 161 || completedMappings !== 161 || unresolvedMappings !== 0) {
    throw new Error('Auth UUID map preflight failed.');
  }

  for (const [table, rows] of Object.entries(tableFiles)) {
    if (rows.length !== exportMetadata.tableCounts?.[table]) {
      throw new Error(`Source export count mismatch for ${table}.`);
    }
  }

  const supabase = createClient(targetUrl, targetKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const targetAuthUsers = await listAllTargetAuthUsers(supabase);
  if (targetAuthUsers.length !== 161) {
    throw new Error('Target Auth count preflight failed.');
  }

  const client = new Client({ connectionString: targetDbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const preCounts = await getTableCounts(client, tableOrder);
    const sourceConfigIds = new Set(tableFiles.configurations.map((row) => row.id));
    const existingConfigRows = (await client.query('select id from public.configurations order by id')).rows;
    const unexpectedConfigRows = existingConfigRows.filter((row) => !sourceConfigIds.has(row.id));
    if (unexpectedConfigRows.length) {
      throw new Error('Unexpected target configuration rows exist before import.');
    }

    const importedCounts: Record<string, number> = {};
    const remapCounts: Record<string, number> = {};
    const importedData: Record<string, any[]> = {};

    await client.query('begin');
    try {
      for (const table of tableOrder) {
        const remapped = tableFiles[table].map((row) => remapRow(table, row, authMap));
        importedData[table] = remapped;
        remapCounts[table] = remapped.reduce((count, row, index) => {
          const original = tableFiles[table][index];
          return count + Object.keys(row).filter((field) => row[field] !== original[field]).length;
        }, 0);
        try {
          await upsertRows(client, table, remapped);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Import failed.';
          throw new Error(`${table}: ${message}`);
        }
        importedCounts[table] = remapped.length;
      }
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw error;
    }

    const targetCounts = await getTableCounts(client, tableOrder);
    const expectedCounts = exportMetadata.tableCounts || {};
    const countMismatches: Record<string, { expected: number; actual: number }> = {};
    for (const table of tableOrder) {
      if (targetCounts[table] !== expectedCounts[table]) {
        countMismatches[table] = { expected: expectedCounts[table], actual: targetCounts[table] };
      }
    }

    const users = importedData.users || [];
    const superAdmins = importedData.super_admins || [];
    const staffAdmins = importedData.staff_admins || [];
    const teachers = importedData.teachers || [];
    const parents = importedData.parents || [];
    const students = importedData.students || [];
    const subjects = importedData.subjects || [];
    const classes = importedData.classes || [];
    const results = importedData.results || [];
    const studentSubjects = importedData.student_subjects || [];
    const teacherSubjects = importedData.teacher_subjects || [];
    const fees = importedData.fees || [];
    const resultApprovals = importedData.result_approval_requests || [];
    const earlyYears = importedData.early_years_results || [];
    const notifications = importedData.notifications || [];

    const targetAuthIds = ids(targetAuthUsers);
    const userIds = ids(users);
    const parentIds = ids(parents);
    const teacherIds = ids(teachers);
    const studentIds = ids(students);
    const subjectIds = ids(subjects);
    const classIds = ids(classes, 'class_id');

    const relationshipValidation = {
      publicUsersMissingTargetAuth: countMissing(users, 'id', targetAuthIds),
      superAdminsMissingUsers: countMissing(superAdmins, 'user_id', userIds),
      staffAdminsMissingUsers: countMissing(staffAdmins, 'user_id', userIds),
      teachersMissingUsers: countMissing(teachers, 'user_id', userIds, true),
      parentsMissingUsers: countMissing(parents, 'user_id', userIds, true),
      studentsMissingUsers: countMissing(students, 'user_id', userIds, true),
      studentsMissingParents: countMissing(students, 'parent_id', parentIds),
      classesMissingTeachers: countMissing(classes, 'class_teacher_id', teacherIds, true),
      resultsMissingStudents: countMissing(results, 'student_id', studentIds),
      resultsMissingSubjects: countMissing(results, 'subject_id', subjectIds, true),
      feesMissingStudents: countMissing(fees, 'student_id', studentIds),
      studentSubjectsMissingStudents: countMissing(studentSubjects, 'student_id', studentIds),
      studentSubjectsMissingSubjects: countMissing(studentSubjects, 'subject_id', subjectIds),
      teacherSubjectsMissingTeachers: countMissing(teacherSubjects, 'teacher_id', teacherIds),
      teacherSubjectsMissingSubjects: countMissing(teacherSubjects, 'subject_id', subjectIds),
      teacherSubjectsMissingClasses: countMissing(teacherSubjects, 'class_id', classIds),
      resultApprovalsMissingTeachers: countMissing(resultApprovals, 'teacher_id', teacherIds),
      earlyYearsMissingStudents: countMissing(earlyYears, 'student_id', studentIds),
      earlyYearsMissingSubjects: countMissing(earlyYears, 'subject_id', subjectIds, true),
      notificationsMissingUsers: countMissing(notifications, 'recipient_id', userIds, true),
    };
    const brokenRelationshipTotal = Object.values(relationshipValidation).reduce((sum, count) => sum + count, 0);

    const oldSourceStorageUrlReferenceCount = Object.values(importedData).reduce(
      (sum, rows) => sum + rows.reduce((rowSum, row) => rowSum + scanForSourceStorageUrls(row).length, 0),
      0,
    );

    const targetAuthAfter = await listAllTargetAuthUsers(supabase);
    const finalTargetAuthIds = ids(targetAuthAfter);
    const authConsistency = {
      targetAuthUsers: targetAuthAfter.length,
      publicUsers: targetCounts.users,
      publicUsersMissingTargetAuth: countMissing(users, 'id', finalTargetAuthIds),
      completedMappings,
      unresolvedMappings,
      orphanMigrated: orphanAuthUsers.some((user) => Boolean(authMap[user.id])),
    };

    const importCompleted =
      Object.keys(countMismatches).length === 0 &&
      brokenRelationshipTotal === 0 &&
      authConsistency.targetAuthUsers === 161 &&
      authConsistency.publicUsers === 161 &&
      authConsistency.publicUsersMissingTargetAuth === 0 &&
      !authConsistency.orphanMigrated;

    const report = {
      generatedAt: new Date().toISOString(),
      targetProjectRef: targetRef,
      sourceProjectRef: 'bkrnnfybboiotvtpscmt',
      preImportCounts: preCounts,
      importedCounts,
      expectedCounts,
      targetCounts,
      countMismatches,
      configurationsBootstrapHandling: {
        preImportConfigurationRows: preCounts.configurations,
        sourceConfigurationRows: tableFiles.configurations.length,
        unexpectedConfigurationRows: unexpectedConfigRows.length,
        action: 'UPSERT_REPLACED_MATCHING_SOURCE_IDS',
        finalConfigurationRows: targetCounts.configurations,
      },
      uuidRemapping: {
        mappedApplicationAuthUsers: completedMappings,
        unresolvedApplicationAuthUsers: unresolvedMappings,
        totalFieldValuesRemapped: Object.values(remapCounts).reduce((sum, count) => sum + count, 0),
        remappedTables: Object.fromEntries(Object.entries(remapCounts).filter(([, count]) => count > 0)),
      },
      relationshipValidation: {
        ...relationshipValidation,
        brokenRelationshipTotal,
      },
      authConsistency,
      cms: {
        cmsContentCount: targetCounts.cms_content,
        configurationsCount: targetCounts.configurations,
      },
      oldSourceStorageUrlReferenceCount,
      oldSourceStorageUrlsRemain: oldSourceStorageUrlReferenceCount > 0,
      applicationDataImportStarted: true,
      importCompleted,
      sourceWrites: 0,
      authMigrationStartedThisPhase: false,
      storageObjectMigrationStarted: false,
      storageUrlRewriteStarted: false,
      passwordResetEmailsSent: false,
      netlifyTouched: false,
    };

    await writeReports(report);

    console.log(`Target project ref: ${targetRef}`);
    console.log(`Tables imported: ${tableOrder.length}`);
    console.log(`Count mismatches: ${Object.keys(countMismatches).length}`);
    console.log(`Broken relationship total: ${brokenRelationshipTotal}`);
    console.log(`Completed UUID mappings used: ${completedMappings}`);
    console.log(`Old source Storage URL references: ${oldSourceStorageUrlReferenceCount}`);
    console.log(`Application import validation: ${importCompleted ? 'PASS' : 'FAIL'}`);

    if (!importCompleted) process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'SouthGold application data import failed.');
  process.exit(1);
});
