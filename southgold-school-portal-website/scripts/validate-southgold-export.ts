import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

const exportRoot = path.join(process.cwd(), '.local', 'migration', 'source-export');
const dataDir = path.join(exportRoot, 'data');
const authDir = path.join(exportRoot, 'auth');

const expectedTables = [
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

function sha256Hex(bytes: Buffer) {
  const hash = createHash('sha256');
  hash.write(bytes);
  hash.end();
  return hash.digest('hex');
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
}

function countMissing(rows: any[], field: string, validIds: Set<unknown>, options: { allowNull?: boolean } = {}) {
  return rows.filter((row) => {
    const value = row[field];
    if ((value === null || value === undefined || value === '') && options.allowNull) return false;
    return !validIds.has(value);
  }).length;
}

function ids(rows: any[], field = 'id') {
  return new Set(rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined && value !== ''));
}

async function validateStorageChecksums(storageManifest: any) {
  let listedObjects = 0;
  let existingFiles = 0;
  let checksumMatches = 0;
  let checksumMismatches = 0;

  for (const object of storageManifest.objects || []) {
    listedObjects += 1;
    if (!object.downloadSuccess || !object.localRelativePath || !object.sha256) continue;

    try {
      const filePath = path.join(process.cwd(), object.localRelativePath);
      const fileBytes = await fs.readFile(filePath);
      existingFiles += 1;
      const digest = sha256Hex(fileBytes);
      if (digest === object.sha256) checksumMatches += 1;
      else checksumMismatches += 1;
    } catch {
      checksumMismatches += 1;
    }
  }

  return { listedObjects, existingFiles, checksumMatches, checksumMismatches };
}

async function main() {
  const metadata = await readJson<any>(path.join(exportRoot, 'export-metadata.json'));
  const storageManifest = await readJson<any>(path.join(exportRoot, 'storage-manifest.json'));
  const authUsers = await readJson<any[]>(path.join(authDir, 'auth-users.json'));

  const tables: Record<string, any[]> = {};
  const missingTableFiles: string[] = [];
  const countMismatches: Record<string, { metadata: number; exported: number }> = {};

  for (const table of expectedTables) {
    const tablePath = path.join(dataDir, `${table}.json`);
    try {
      const rows = await readJson<any[]>(tablePath);
      tables[table] = rows;
      if (!Array.isArray(rows)) {
        countMismatches[table] = { metadata: metadata.tableCounts?.[table] ?? -1, exported: -1 };
      } else if (metadata.tableCounts?.[table] !== rows.length) {
        countMismatches[table] = { metadata: metadata.tableCounts?.[table] ?? -1, exported: rows.length };
      }
    } catch {
      missingTableFiles.push(table);
    }
  }

  const userIds = ids(tables.users || []);
  const authIds = ids(authUsers || []);
  const parentIds = ids(tables.parents || []);
  const teacherIds = ids(tables.teachers || []);
  const studentIds = ids(tables.students || []);
  const subjectIds = ids(tables.subjects || []);
  const classIds = ids(tables.classes || [], 'class_id');

  const relationshipValidation = {
    studentsMissingParents: countMissing(tables.students || [], 'parent_id', parentIds, { allowNull: true }),
    resultsMissingStudents: countMissing(tables.results || [], 'student_id', studentIds),
    resultsMissingSubjects: countMissing(tables.results || [], 'subject_id', subjectIds, { allowNull: true }),
    studentSubjectsMissingStudents: countMissing(tables.student_subjects || [], 'student_id', studentIds),
    studentSubjectsMissingSubjects: countMissing(tables.student_subjects || [], 'subject_id', subjectIds),
    teacherSubjectsMissingTeachers: countMissing(tables.teacher_subjects || [], 'teacher_id', teacherIds),
    teacherSubjectsMissingSubjects: countMissing(tables.teacher_subjects || [], 'subject_id', subjectIds),
    teacherSubjectsMissingClasses: countMissing(tables.teacher_subjects || [], 'class_id', classIds),
    classesWithInvalidClassTeacherId: countMissing(tables.classes || [], 'class_teacher_id', teacherIds, { allowNull: true }),
    publicUsersMissingAuthUsers: countMissing(tables.users || [], 'id', authIds),
    superAdminsMissingPublicUsers: countMissing(tables.super_admins || [], 'user_id', userIds),
    staffAdminsMissingPublicUsers: countMissing(tables.staff_admins || [], 'user_id', userIds),
    teachersMissingPublicUsers: countMissing(tables.teachers || [], 'user_id', userIds, { allowNull: true }),
    parentsMissingPublicUsers: countMissing(tables.parents || [], 'user_id', userIds, { allowNull: true }),
    studentsMissingPublicUsers: countMissing(tables.students || [], 'user_id', userIds, { allowNull: true }),
  };

  const storageValidation = await validateStorageChecksums(storageManifest);
  const authCountMatches = metadata.authUserCount === authUsers.length;
  const storageCountMatches = metadata.storageObjectCount === storageValidation.listedObjects;
  const relationshipIntegrityPassed = Object.values(relationshipValidation).every((count) => count === 0);
  const passed =
    missingTableFiles.length === 0 &&
    Object.keys(countMismatches).length === 0 &&
    authCountMatches &&
    storageCountMatches &&
    storageValidation.checksumMismatches === 0 &&
    storageValidation.checksumMatches === metadata.storageObjectCount &&
    relationshipIntegrityPassed;

  const validationReport = {
    validatedAt: new Date().toISOString(),
    exportGeneratedAt: metadata.generatedAt,
    sourceProjectRef: metadata.sourceProjectRef,
    missingTableFiles,
    countMismatches,
    authCountMatches,
    storageCountMatches,
    storageValidation,
    relationshipValidation,
    passed,
  };

  await fs.writeFile(path.join(exportRoot, 'validation-report.json'), JSON.stringify(validationReport, null, 2) + '\n', 'utf8');

  console.log(`Validation result: ${passed ? 'PASS' : 'FAIL'}`);
  console.log(`Tables validated: ${expectedTables.length - missingTableFiles.length}/${expectedTables.length}`);
  console.log(`Auth users validated: ${authUsers.length}`);
  console.log(`Storage checksums matched: ${storageValidation.checksumMatches}`);
  console.log(`Broken relationship count total: ${Object.values(relationshipValidation).reduce((sum, count) => sum + count, 0)}`);

  if (!passed) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'SouthGold export validation failed.');
  process.exit(1);
});
