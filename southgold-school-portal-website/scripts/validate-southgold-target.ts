import fs from 'fs/promises';
import path from 'path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const expectedTargetRef = 'utmbrfsiyowjfjfeodof';
const forbiddenRefs = ['bkrnnfybboiotvtpscmt', 'opdxxhqwwrsvllbtsraz'];
const outputDir = path.join(process.cwd(), '.local', 'migration', 'target');
const readinessPath = path.join(outputDir, 'target-readiness.json');

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
  results: ['arm', 'assignment_score', 'class_id', 'created_at', 'exam_score', 'grade', 'id', 'is_approved', 'session', 'status', 'student_id', 'subject_id', 'teacher_remark', 'term', 'test_score', 'total_score'],
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

function targetRefFromUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

function assertTargetIdentity() {
  const targetUrl = process.env.TARGET_SUPABASE_URL || '';
  const targetDbUrl = process.env.TARGET_DATABASE_URL || '';
  const targetRef = targetRefFromUrl(targetUrl);

  if (!targetUrl || !process.env.TARGET_SUPABASE_SECRET_KEY || !process.env.TARGET_SUPABASE_PUBLISHABLE_KEY || !targetDbUrl) {
    throw new Error('One or more TARGET_* environment variables are missing.');
  }
  if (targetRef !== expectedTargetRef) {
    throw new Error('TARGET_SUPABASE_URL does not match the expected target project ref.');
  }
  if (!targetDbUrl.includes(expectedTargetRef)) {
    throw new Error('TARGET_DATABASE_URL does not appear to reference the expected target project.');
  }
  for (const forbiddenRef of forbiddenRefs) {
    if (targetUrl.includes(forbiddenRef) || targetDbUrl.includes(forbiddenRef)) {
      throw new Error('Target configuration references a forbidden old project ref.');
    }
  }

  return targetRef;
}

async function queryRows<T = any>(client: Client, sql: string, values: unknown[] = []) {
  return (await client.query<T>(sql, values)).rows;
}

async function getColumns(client: Client) {
  const rows = await queryRows<{ table_name: string; column_name: string }>(
    client,
    `
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
      order by table_name, ordinal_position
    `,
  );
  const byTable: Record<string, string[]> = {};
  for (const row of rows) {
    byTable[row.table_name] ||= [];
    byTable[row.table_name].push(row.column_name);
  }
  return byTable;
}

async function getTableCounts(client: Client) {
  const counts: Record<string, number | null> = {};
  for (const table of expectedTables) {
    try {
      const result = await queryRows<{ count: string }>(client, `select count(*)::text as count from public.${quoteIdent(table)}`);
      counts[table] = Number(result[0]?.count ?? 0);
    } catch {
      counts[table] = null;
    }
  }
  return counts;
}

function quoteIdent(value: string) {
  return '"' + value.replace(/"/g, '""') + '"';
}

function normalizePgArray(value: unknown) {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return [];
  if (!value.startsWith('{') || !value.endsWith('}')) return [value];
  return value
    .slice(1, -1)
    .split(',')
    .map((item) => item.replace(/^"|"$/g, ''))
    .filter(Boolean);
}

async function main() {
  const targetRef = assertTargetIdentity();
  const client = new Client({ connectionString: process.env.TARGET_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const generatedAt = new Date().toISOString();
    const columnsByTable = await getColumns(client);
    const actualTables = Object.keys(columnsByTable).sort();
    const missingTables = expectedTables.filter((table) => !actualTables.includes(table));
    const extraPublicTables = actualTables.filter((table) => !expectedTables.includes(table));

    const missingColumns: Record<string, string[]> = {};
    for (const [table, columns] of Object.entries(expectedColumns)) {
      const actual = columnsByTable[table] || [];
      const missing = columns.filter((column) => !actual.includes(column));
      if (missing.length) missingColumns[table] = missing;
    }

    const tableCounts = await getTableCounts(client);
    const functions = await queryRows<{ proname: string }>(
      client,
      `
        select p.proname
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname in ('set_updated_at', 'onboard_student_transaction')
        order by p.proname
      `,
    );
    const functionNames = functions.map((row) => row.proname);

    const triggers = await queryRows<{ trigger_name: string; event_object_table: string }>(
      client,
      `
        select trigger_name, event_object_table
        from information_schema.triggers
        where trigger_schema = 'public'
          and trigger_name in ('trg_users_updated', 'trg_cms_content_updated')
        order by trigger_name
      `,
    );

    const rlsRows = await queryRows<{ relname: string; relrowsecurity: boolean }>(
      client,
      `
        select c.relname, c.relrowsecurity
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public'
          and c.relkind = 'r'
          and c.relname = any($1)
        order by c.relname
      `,
      [expectedTables],
    );
    const rlsStatus = Object.fromEntries(rlsRows.map((row) => [row.relname, row.relrowsecurity]));

    const servicePolicies = await queryRows<{ tablename: string; roles: string[] }>(
      client,
      `
        select tablename, roles
        from pg_policies
        where schemaname = 'public'
          and policyname = 'service_role_all'
          and tablename = any($1)
        order by tablename
      `,
      [expectedTables],
    );

    const directGrants = await queryRows<{ table_name: string; grantee: string; privilege_type: string }>(
      client,
      `
        select table_name, grantee, privilege_type
        from information_schema.table_privileges
        where table_schema = 'public'
          and table_name = any($1)
          and grantee in ('anon', 'authenticated')
        order by table_name, grantee, privilege_type
      `,
      [expectedTables],
    );

    const storageBuckets = await queryRows<{ id: string; name: string; public: boolean }>(
      client,
      `
        select id, name, public
        from storage.buckets
        where id = 'school-assets'
      `,
    );

    const storagePolicies = await queryRows<{ policyname: string; cmd: string; roles: string[]; qual: string | null; with_check: string | null }>(
      client,
      `
        select policyname, cmd, roles, qual, with_check
        from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname in (
            'Public Read school-assets',
            'Admin Upload school-assets',
            'Admin Update school-assets',
            'Admin Delete school-assets'
          )
        order by policyname
      `,
    );

    const authUserCount = await queryRows<{ count: string }>(client, `select count(*)::text as count from auth.users`);
    const cmsUpdatedAtExists = Boolean(columnsByTable.cms_content?.includes('updated_at'));
    const allRlsEnabled = expectedTables.every((table) => rlsStatus[table] === true);
    const allServicePoliciesRestricted = expectedTables.every((table) => {
      const policy = servicePolicies.find((item) => item.tablename === table);
      const roles = normalizePgArray(policy?.roles);
      return roles.length === 1 && roles[0] === 'service_role';
    });
    const storageUsesUnsafeUserMetadata = storagePolicies.some((policy) =>
      `${policy.qual || ''} ${policy.with_check || ''}`.includes('user_metadata'),
    );
    const anonymouslyWritableStoragePolicies = storagePolicies.filter((policy) => {
      const writableCommand = ['INSERT', 'UPDATE', 'DELETE', 'ALL'].includes(policy.cmd);
      const publicLikeRole = normalizePgArray(policy.roles).some((role) => ['anon', 'public'].includes(role));
      return writableCommand && publicLikeRole;
    });
    const schoolAssetsBucket = storageBuckets[0] || null;

    const report = {
      generatedAt,
      targetProjectRef: targetRef,
      forbiddenProjectRefsDetected: false,
      dataImportStarted: false,
      storageObjectMigrationStarted: false,
      authUserMigrationStarted: false,
      tables: {
        expectedCount: expectedTables.length,
        actualExpectedTablesPresent: expectedTables.length - missingTables.length,
        missingTables,
        extraPublicTables,
        missingColumns,
        counts: tableCounts,
      },
      cmsContentDriftResolution: {
        updatedAtExists: cmsUpdatedAtExists,
      },
      functions: {
        setUpdatedAtExists: functionNames.includes('set_updated_at'),
        onboardStudentTransactionExists: functionNames.includes('onboard_student_transaction'),
      },
      triggers: {
        trgUsersUpdatedExists: triggers.some((trigger) => trigger.trigger_name === 'trg_users_updated'),
        trgCmsContentUpdatedExists: triggers.some((trigger) => trigger.trigger_name === 'trg_cms_content_updated'),
      },
      rls: {
        status: rlsStatus,
        allExpectedTablesEnabled: allRlsEnabled,
      },
      securityPosture: {
        serviceRolePoliciesRestricted: allServicePoliciesRestricted,
        anonAuthenticatedDirectGrantCount: directGrants.length,
        directGrants,
      },
      storage: {
        schoolAssetsExists: Boolean(schoolAssetsBucket),
        schoolAssetsPublic: schoolAssetsBucket?.public ?? false,
        policyCount: storagePolicies.length,
        unsafeUserMetadataReferencePresent: storageUsesUnsafeUserMetadata,
        anonymouslyWritablePolicyCount: anonymouslyWritableStoragePolicies.length,
      },
      auth: {
        targetAuthUserCount: Number(authUserCount[0]?.count ?? 0),
        usersCreatedByMigrationPhase: false,
      },
      schemaReady:
        missingTables.length === 0 &&
        Object.keys(missingColumns).length === 0 &&
        cmsUpdatedAtExists &&
        functionNames.includes('set_updated_at') &&
        functionNames.includes('onboard_student_transaction') &&
        triggers.some((trigger) => trigger.trigger_name === 'trg_users_updated') &&
        triggers.some((trigger) => trigger.trigger_name === 'trg_cms_content_updated') &&
        allRlsEnabled &&
        allServicePoliciesRestricted &&
        directGrants.length === 0 &&
        Boolean(schoolAssetsBucket) &&
        schoolAssetsBucket.public === true &&
        !storageUsesUnsafeUserMetadata &&
        anonymouslyWritableStoragePolicies.length === 0,
      authReadyForImport: true,
    };

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(readinessPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

    console.log(`Target validation result: ${report.schemaReady ? 'PASS' : 'FAIL'}`);
    console.log(`Target project ref: ${targetRef}`);
    console.log(`Expected tables present: ${report.tables.actualExpectedTablesPresent}/${report.tables.expectedCount}`);
    console.log(`Auth users currently present: ${report.auth.targetAuthUserCount}`);
    console.log(`Anon/auth direct grant count: ${directGrants.length}`);
    console.log(`Storage unsafe user_metadata reference present: ${storageUsesUnsafeUserMetadata}`);
    console.log(`Readiness report: ${path.relative(process.cwd(), readinessPath)}`);

    if (!report.schemaReady) process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Target validation failed.');
  process.exit(1);
});
