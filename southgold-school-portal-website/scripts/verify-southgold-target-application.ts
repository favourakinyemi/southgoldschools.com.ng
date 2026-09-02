import fs from 'fs/promises';
import path from 'path';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const expectedTargetRef = 'utmbrfsiyowjfjfeodof';
const sourceProjectRef = 'bkrnnfybboiotvtpscmt';
const staleProjectRef = 'opdxxhqwwrsvllbtsraz';
const reportDir = path.join(process.cwd(), '.local', 'migration', 'target');
const reportPath = path.join(reportDir, 'final-application-verification.json');

const expectedCounts: Record<string, number> = {
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
  const targetPublishableKey = process.env.TARGET_SUPABASE_PUBLISHABLE_KEY || '';
  const targetDbUrl = process.env.TARGET_DATABASE_URL || '';
  const targetRef = projectRefFromUrl(targetUrl);

  if (!targetUrl || !targetKey || !targetPublishableKey || !targetDbUrl) {
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
    targetPublishableKey.includes(sourceProjectRef) ||
    targetPublishableKey.includes(staleProjectRef) ||
    targetDbUrl.includes(sourceProjectRef) ||
    targetDbUrl.includes(staleProjectRef)
  ) {
    throw new Error('Target configuration references a forbidden old project ref.');
  }

  return { targetRef, targetUrl, targetKey, targetPublishableKey, targetDbUrl };
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

async function getCounts(client: Client) {
  const counts: Record<string, number> = {};
  for (const table of Object.keys(expectedCounts)) {
    const result = await client.query(`select count(*)::int as count from public.${quoteIdent(table)}`);
    counts[table] = Number(result.rows[0]?.count ?? 0);
  }
  return counts;
}

async function scalarCount(client: Client, sql: string) {
  const result = await client.query(sql);
  return Number(result.rows[0]?.count ?? 0);
}

async function roleResolution(client: Client) {
  const roles = await client.query(`
    select user_role::text as role, count(*)::int as count
    from public.users
    group by user_role
    order by user_role
  `);

  const checks = {
    SUPER_ADMIN: await scalarCount(client, `
      select count(*) from public.users u
      join public.super_admins r on r.user_id = u.id
      where u.user_role = 'SUPER_ADMIN'
    `),
    SCHOOL_ADMIN: await scalarCount(client, `
      select count(*) from public.users u
      join public.staff_admins r on r.user_id = u.id
      where u.user_role = 'SCHOOL_ADMIN'
    `),
    TEACHER: await scalarCount(client, `
      select count(*) from public.users u
      join public.teachers r on r.user_id = u.id
      where u.user_role = 'TEACHER'
    `),
    PARENT: await scalarCount(client, `
      select count(*) from public.users u
      join public.parents r on r.user_id = u.id
      where u.user_role = 'PARENT'
    `),
    STUDENT: await scalarCount(client, `
      select count(*) from public.users u
      join public.students r on r.user_id = u.id
      where u.user_role = 'STUDENT'
    `),
  };

  return {
    roleCounts: Object.fromEntries(roles.rows.map((row) => [row.role, Number(row.count)])),
    roleProfileCounts: checks,
    pass: Object.values(checks).every((count) => count > 0),
  };
}

async function relationshipValidation(client: Client) {
  const checks = {
    publicUsersMissingAuth: 0,
    superAdminsMissingUsers: await scalarCount(client, `
      select count(*) from public.super_admins r left join public.users u on u.id = r.user_id where u.id is null
    `),
    staffAdminsMissingUsers: await scalarCount(client, `
      select count(*) from public.staff_admins r left join public.users u on u.id = r.user_id where u.id is null
    `),
    teachersMissingUsers: await scalarCount(client, `
      select count(*) from public.teachers r left join public.users u on u.id = r.user_id where r.user_id is not null and u.id is null
    `),
    parentsMissingUsers: await scalarCount(client, `
      select count(*) from public.parents r left join public.users u on u.id = r.user_id where r.user_id is not null and u.id is null
    `),
    studentsMissingUsers: await scalarCount(client, `
      select count(*) from public.students r left join public.users u on u.id = r.user_id where r.user_id is not null and u.id is null
    `),
    studentsMissingParents: await scalarCount(client, `
      select count(*) from public.students s left join public.parents p on p.id = s.parent_id where p.id is null
    `),
    classesMissingTeachers: await scalarCount(client, `
      select count(*) from public.classes c left join public.teachers t on t.id = c.class_teacher_id where c.class_teacher_id is not null and t.id is null
    `),
    resultsMissingStudents: await scalarCount(client, `
      select count(*) from public.results r left join public.students s on s.id = r.student_id where s.id is null
    `),
    resultsMissingSubjects: await scalarCount(client, `
      select count(*) from public.results r left join public.subjects s on s.id = r.subject_id where r.subject_id is not null and s.id is null
    `),
    studentSubjectsMissingStudents: await scalarCount(client, `
      select count(*) from public.student_subjects r left join public.students s on s.id = r.student_id where s.id is null
    `),
    studentSubjectsMissingSubjects: await scalarCount(client, `
      select count(*) from public.student_subjects r left join public.subjects s on s.id = r.subject_id where s.id is null
    `),
    teacherSubjectsMissingTeachers: await scalarCount(client, `
      select count(*) from public.teacher_subjects r left join public.teachers t on t.id = r.teacher_id where t.id is null
    `),
    teacherSubjectsMissingSubjects: await scalarCount(client, `
      select count(*) from public.teacher_subjects r left join public.subjects s on s.id = r.subject_id where s.id is null
    `),
    teacherSubjectsMissingClasses: await scalarCount(client, `
      select count(*) from public.teacher_subjects r left join public.classes c on c.class_id = r.class_id where c.class_id is null
    `),
  };
  const brokenRelationshipCount = Object.values(checks).reduce((sum, count) => sum + count, 0);
  return { ...checks, brokenRelationshipCount };
}

async function securityValidation(client: Client) {
  const rls = await client.query(
    `
      select c.relname, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname = any($1)
    `,
    [Object.keys(expectedCounts)],
  );
  const directGrants = await scalarCount(client, `
    select count(*)
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = any(array[${Object.keys(expectedCounts).map((table) => `'${table}'`).join(',')}])
      and grantee in ('anon', 'authenticated')
  `);
  const unsafeStoragePolicyRefs = await scalarCount(client, `
    select count(*)
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and ((qual is not null and qual like '%user_metadata%') or (with_check is not null and with_check like '%user_metadata%'))
  `);
  const anonymousWritableStoragePolicies = await scalarCount(client, `
    select count(*)
      from pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
        and roles && array['anon', 'public']::name[]
  `);
  const allRlsEnabled = rls.rows.length === Object.keys(expectedCounts).length && rls.rows.every((row) => row.relrowsecurity);
  return {
    allRlsEnabled,
    directAnonAuthenticatedGrantCount: directGrants,
    unsafeStoragePolicyReferenceCount: unsafeStoragePolicyRefs,
    anonymousWritableStoragePolicyCount: anonymousWritableStoragePolicies,
    pass: allRlsEnabled && directGrants === 0 && unsafeStoragePolicyRefs === 0 && anonymousWritableStoragePolicies === 0,
  };
}

function countProjectRefs(value: unknown, projectRef: string): number {
  if (value instanceof Date) return 0;
  if (typeof value === 'string') return value.includes(`${projectRef}.supabase.co`) ? 1 : 0;
  if (Array.isArray(value)) return value.reduce<number>((sum, item) => sum + countProjectRefs(item, projectRef), 0);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce<number>((sum, nested) => sum + countProjectRefs(nested, projectRef), 0);
  }
  return 0;
}

async function cmsStorageValidation(client: Client) {
  const config = await client.query('select * from public.configurations');
  const cms = await client.query('select * from public.cms_content');
  const rows = [...config.rows, ...cms.rows];
  const oldSourceUrlRefs = rows.reduce((sum, row) => sum + countProjectRefs(row, sourceProjectRef), 0);
  const targetUrlRefs = rows.reduce((sum, row) => sum + countProjectRefs(row, expectedTargetRef), 0);
  return {
    cmsContentCount: cms.rowCount ?? 0,
    configurationsCount: config.rowCount ?? 0,
    oldSourceUrlRefs,
    targetUrlRefs,
    pass: (cms.rowCount ?? 0) === 3 && (config.rowCount ?? 0) === 2 && oldSourceUrlRefs === 0 && targetUrlRefs === 8,
  };
}

async function storageValidation(client: SupabaseAnyClient) {
  const manifest = JSON.parse(await fs.readFile(path.join(process.cwd(), '.local', 'migration', 'source-export', 'storage-manifest.json'), 'utf8'));
  let reachable = 0;
  const folderCounts: Record<string, number> = {};

  for (const object of manifest.objects || []) {
    if (object.bucket !== 'school-assets') continue;
    folderCounts[object.folder] = (folderCounts[object.folder] || 0) + 1;
    const result = await client.storage.from('school-assets').download(object.path);
    if (!result.error && result.data) reachable += 1;
  }

  return {
    expectedObjects: 45,
    reachableObjects: reachable,
    folderCounts,
    pass: reachable === 45,
  };
}

async function httpCheck(baseUrl: string, pathname: string, expectedStatuses: number[]) {
  try {
    const response = await fetch(new URL(pathname, baseUrl));
    const text = await response.text();
    return {
      path: pathname,
      status: response.status,
      pass: expectedStatuses.includes(response.status),
      oldSourceRefs: text.includes(`${sourceProjectRef}.supabase.co`) ? 1 : 0,
      targetRefs: text.includes(`${expectedTargetRef}.supabase.co`) ? 1 : 0,
      error: null as string | null,
    };
  } catch (error) {
    return {
      path: pathname,
      status: 0,
      pass: false,
      oldSourceRefs: 0,
      targetRefs: 0,
      error: error instanceof Error ? error.message : 'HTTP check failed.',
    };
  }
}

async function httpValidation(baseUrl?: string) {
  if (!baseUrl) {
    return { enabled: false, pass: false, publicPages: [], apiRoutes: [], errorCount: 0 };
  }
  const publicPages = await Promise.all(['/', '/about', '/admissions'].map((path) => httpCheck(baseUrl, path, [200])));
  const apiRoutes = await Promise.all([
    httpCheck(baseUrl, '/api/health', [200]),
    httpCheck(baseUrl, '/api/config', [200]),
    httpCheck(baseUrl, '/api/cms', [200]),
    httpCheck(baseUrl, '/api/students', [401]),
    httpCheck(baseUrl, '/api/teachers', [401]),
    httpCheck(baseUrl, '/api/parents', [401]),
    httpCheck(baseUrl, '/api/subjects', [401]),
    httpCheck(baseUrl, '/api/results', [401]),
    httpCheck(baseUrl, '/api/attendance', [401]),
  ]);
  const checks = [...publicPages, ...apiRoutes];
  return {
    enabled: true,
    pass: checks.every((check) => check.pass) && checks.every((check) => check.oldSourceRefs === 0),
    publicPages,
    apiRoutes,
    errorCount: checks.filter((check) => !check.pass || check.error).length,
    oldSourceRefCount: checks.reduce((sum, check) => sum + check.oldSourceRefs, 0),
  };
}

async function main() {
  const baseUrlArg = process.argv.find((arg) => arg.startsWith('--base-url='));
  const baseUrl = baseUrlArg?.split('=')[1];
  const target = assertTargetIdentity();
  const supabase = createClient(target.targetUrl, target.targetKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const pg = new Client({ connectionString: target.targetDbUrl, ssl: { rejectUnauthorized: false } });
  await pg.connect();

  try {
    const counts = await getCounts(pg);
    const countMismatches = Object.fromEntries(Object.entries(expectedCounts).filter(([table, count]) => counts[table] !== count));
    const authUsers = await listTargetAuthUsers(supabase);
    const authIds = new Set(authUsers.map((user) => user.id));
    const publicUsers = await pg.query('select id from public.users');
    const publicUsersMissingAuth = publicUsers.rows.filter((row) => !authIds.has(row.id)).length;
    const roles = await roleResolution(pg);
    const relationships = await relationshipValidation(pg);
    relationships.publicUsersMissingAuth = publicUsersMissingAuth;
    relationships.brokenRelationshipCount += publicUsersMissingAuth;
    const academic = {
      students: counts.students,
      subjects: counts.subjects,
      classes: counts.classes,
      sessions: counts.sessions,
      attendance: counts.attendance,
      results: counts.results,
      student_subjects: counts.student_subjects,
      teacher_subjects: counts.teacher_subjects,
      pass:
        counts.students === 49 &&
        counts.subjects === 30 &&
        counts.classes === 9 &&
        counts.sessions === 3 &&
        counts.attendance === 776 &&
        counts.results === 78 &&
        counts.student_subjects === 416 &&
        counts.teacher_subjects === 46 &&
        relationships.brokenRelationshipCount === 0,
    };
    const cms = await cmsStorageValidation(pg);
    const storage = await storageValidation(supabase);
    const security = await securityValidation(pg);
    const http = await httpValidation(baseUrl);
    const passwordReset = {
      existingPasswordsPreserved: false,
      routeExists: true,
      ready: false,
      blocker:
        'Current reset-password route resets to a configured staff default behind admin auth; no self-service forgot-password email flow was verified.',
    };
    const applicationStartupPass = http.enabled ? http.publicPages.some((check: any) => check.path === '/' && check.pass) : false;

    const report = {
      generatedAt: new Date().toISOString(),
      targetProjectRef: target.targetRef,
      sourceIsolation: {
        targetRefExpected: target.targetRef === expectedTargetRef,
        forbiddenRefsUsed: false,
        pass: target.targetRef === expectedTargetRef,
      },
      applicationStartup: { pass: applicationStartupPass, httpChecksEnabled: http.enabled },
      publicWebsite: {
        pass: http.enabled && http.publicPages.every((check: any) => check.pass) && http.oldSourceRefCount === 0,
        routesChecked: http.enabled ? http.publicPages.length : 0,
      },
      cmsImages: cms,
      authInfrastructure: {
        targetAuthUsers: authUsers.length,
        publicUsers: counts.users,
        publicUsersMissingAuth,
        emailProviderUsers: authUsers.filter((user) => user.email).length,
        pass: authUsers.length === 161 && counts.users === 161 && publicUsersMissingAuth === 0,
      },
      roleResolution: roles,
      academicData: academic,
      serverApiRoutes: {
        enabled: http.enabled,
        pass: http.enabled && http.apiRoutes.every((check: any) => check.pass),
        routesChecked: http.enabled ? http.apiRoutes.length : 0,
        failedRoutes: http.enabled ? http.apiRoutes.filter((check: any) => !check.pass).map((check: any) => check.path) : [],
      },
      storage,
      oldSourceUrlReferences: {
        expected: 0,
        databaseCount: cms.oldSourceUrlRefs,
        renderedHttpCount: (http as any).oldSourceRefCount ?? null,
        pass: cms.oldSourceUrlRefs === 0 && (!http.enabled || (http as any).oldSourceRefCount === 0),
      },
      applicationErrors: {
        count: http.enabled ? http.errorCount : 1,
        sanitizedSummary: http.enabled && http.errorCount === 0 ? 'none' : http.enabled ? 'One or more HTTP checks failed.' : 'HTTP checks were not run because no base URL was provided.',
      },
      passwordResetFlow: passwordReset,
      passportPrivacy: 'FUTURE SECURITY REVIEW REQUIRED',
      counts,
      countMismatchCount: Object.keys(countMismatches).length,
      countMismatches,
      rlsSecurity: security,
      sourceWrites: 0,
      netlifyTouched: false,
      gitPushed: false,
      finalCutoverReady:
        applicationStartupPass &&
        http.pass &&
        cms.pass &&
        storage.pass &&
        security.pass &&
        roles.pass &&
        academic.pass &&
        Object.keys(countMismatches).length === 0 &&
        passwordReset.ready,
    };

    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

    console.log(`Target used locally: ${target.targetRef}`);
    console.log(`Source isolation: ${report.sourceIsolation.pass ? 'PASS' : 'FAIL'}`);
    console.log(`Application startup: ${report.applicationStartup.pass ? 'PASS' : 'FAIL'}`);
    console.log(`Public website: ${report.publicWebsite.pass ? 'PASS' : 'FAIL'}`);
    console.log(`CMS/images: ${report.cmsImages.pass ? 'PASS' : 'FAIL'}`);
    console.log(`Auth infrastructure: ${report.authInfrastructure.pass ? 'PASS' : 'FAIL'}`);
    console.log(`Role resolution: ${report.roleResolution.pass ? 'PASS' : 'FAIL'}`);
    console.log(`Academic data: ${report.academicData.pass ? 'PASS' : 'FAIL'}`);
    console.log(`Server/API routes: ${report.serverApiRoutes.pass ? 'PASS' : 'FAIL'}`);
    console.log(`Storage: ${report.storage.pass ? 'PASS' : 'FAIL'}`);
    console.log(`Old source URL references: ${report.oldSourceUrlReferences.databaseCount}`);
    console.log(`Password reset flow: ${report.passwordResetFlow.ready ? 'READY' : 'BLOCKER'}`);
    console.log(`Final cutover readiness: ${report.finalCutoverReady ? 'READY' : 'NOT READY'}`);

    if (!report.finalCutoverReady) process.exitCode = 1;
  } finally {
    await pg.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Final target application verification failed.');
  process.exit(1);
});
