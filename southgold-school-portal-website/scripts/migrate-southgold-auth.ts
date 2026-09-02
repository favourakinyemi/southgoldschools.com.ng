import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', override: true, quiet: true });

const expectedTargetRef = 'utmbrfsiyowjfjfeodof';
const forbiddenRefs = ['bkrnnfybboiotvtpscmt', 'opdxxhqwwrsvllbtsraz'];
const sourceAuthPath = path.join(process.cwd(), '.local', 'migration', 'source-export', 'auth', 'auth-users.json');
const outputDir = path.join(process.cwd(), '.local', 'migration', 'auth');
const authIdMapPath = path.join(outputDir, 'auth-id-map.json');
const orphanReviewPath = path.join(outputDir, 'orphan-auth-review.json');
const authSummaryPath = path.join(outputDir, 'auth-migration-summary.json');

type SupabaseAnyClient = ReturnType<typeof createClient<any>>;

type SourceAuthUser = {
  id: string;
  email: string | null;
  phone?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  orphanAuthUser?: boolean;
};

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
  const targetRef = projectRefFromUrl(targetUrl);

  if (!targetUrl || !targetKey) {
    throw new Error('TARGET_SUPABASE_URL or TARGET_SUPABASE_SECRET_KEY is missing.');
  }
  if (targetRef !== expectedTargetRef) {
    throw new Error('TARGET_SUPABASE_URL does not match the expected target project ref.');
  }
  for (const forbiddenRef of forbiddenRefs) {
    if (targetUrl.includes(forbiddenRef) || targetKey.includes(forbiddenRef)) {
      throw new Error('Target Auth configuration references a forbidden old project ref.');
    }
  }

  return { targetUrl, targetKey, targetRef };
}

function temporaryPassword() {
  return randomBytes(48).toString('base64url');
}

async function readJsonIfExists<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as T;
  } catch (error: any) {
    if (error?.code === 'ENOENT') return fallback;
    throw error;
  }
}

async function listAllTargetUsers(client: SupabaseAnyClient) {
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

function cleanMetadata(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.password;
  delete copy.password_hash;
  delete copy.encrypted_password;
  delete copy.access_token;
  delete copy.refresh_token;
  delete copy.session;
  return copy;
}

async function main() {
  const { targetUrl, targetKey, targetRef } = assertTargetIdentity();
  await fs.mkdir(outputDir, { recursive: true });

  const sourceAuthUsers = JSON.parse(await fs.readFile(sourceAuthPath, 'utf8')) as SourceAuthUser[];
  const applicationLinkedUsers = sourceAuthUsers.filter((user) => !user.orphanAuthUser);
  const orphanUsers = sourceAuthUsers.filter((user) => user.orphanAuthUser);
  const uniqueApplicationEmails = new Set(applicationLinkedUsers.map((user) => user.email?.toLowerCase()).filter(Boolean));

  if (applicationLinkedUsers.length !== uniqueApplicationEmails.size) {
    throw new Error('Application-linked source Auth users do not have unique emails.');
  }
  if (applicationLinkedUsers.some((user) => !user.email)) {
    throw new Error('One or more application-linked source Auth users is missing an email.');
  }

  const client = createClient(targetUrl, targetKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const existingMap = await readJsonIfExists<Record<string, string | null>>(authIdMapPath, {});
  const targetUsersBefore = await listAllTargetUsers(client);
  const targetByEmail = new Map<string, any>();
  for (const user of targetUsersBefore) {
    const email = user.email?.toLowerCase();
    if (email) targetByEmail.set(email, user);
  }
  const unexpectedTargetUsers = targetUsersBefore.filter((user) => {
    const email = user.email?.toLowerCase();
    if (!email) return true;
    if (!uniqueApplicationEmails.has(email)) return true;
    const sourceUser = applicationLinkedUsers.find((candidate) => candidate.email?.toLowerCase() === email);
    return sourceUser ? Boolean(existingMap[sourceUser.id] && existingMap[sourceUser.id] !== user.id) : true;
  });

  if (unexpectedTargetUsers.length > 0) {
    const summary = {
      generatedAt: new Date().toISOString(),
      targetProjectRef: targetRef,
      status: 'STOPPED_UNEXPECTED_TARGET_USERS',
      sourceAuthUsers: sourceAuthUsers.length,
      applicationLinkedAuthUsers: applicationLinkedUsers.length,
      orphanAuthUsers: orphanUsers.length,
      unexpectedTargetAuthUserCount: unexpectedTargetUsers.length,
      targetAuthUsersBefore: targetUsersBefore.length,
      sourceWrites: 0,
      applicationDataImportStarted: false,
      storageMigrationStarted: false,
      authUserMigrationStarted: false,
    };
    await fs.writeFile(authSummaryPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');
    throw new Error('Unexpected target Auth users exist. Bulk Auth recreation stopped.');
  }

  const idMap: Record<string, string | null> = {};
  for (const user of applicationLinkedUsers) idMap[user.id] = existingMap[user.id] || null;
  for (const user of orphanUsers) idMap[user.id] = null;

  let createdCount = 0;
  let reusedCount = 0;

  for (const sourceUser of applicationLinkedUsers) {
    const email = sourceUser.email!.toLowerCase();
    const existingTargetUser = targetByEmail.get(email);

    if (existingTargetUser) {
      idMap[sourceUser.id] = existingTargetUser.id;
      reusedCount += 1;
      await fs.writeFile(authIdMapPath, JSON.stringify(idMap, null, 2) + '\n', 'utf8');
      continue;
    }

    const result = await client.auth.admin.createUser({
      email: sourceUser.email!,
      password: temporaryPassword(),
      email_confirm: Boolean(sourceUser.email_confirmed_at || sourceUser.confirmed_at),
      app_metadata: cleanMetadata(sourceUser.app_metadata),
      user_metadata: cleanMetadata(sourceUser.user_metadata),
    });

    if (result.error || !result.data.user) {
      await fs.writeFile(authIdMapPath, JSON.stringify(idMap, null, 2) + '\n', 'utf8');
      throw new Error(result.error?.message || 'Target Auth user creation failed.');
    }

    idMap[sourceUser.id] = result.data.user.id;
    targetByEmail.set(email, result.data.user);
    createdCount += 1;
    await fs.writeFile(authIdMapPath, JSON.stringify(idMap, null, 2) + '\n', 'utf8');
  }

  await fs.writeFile(
    orphanReviewPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        targetProjectRef: targetRef,
        orphanAuthUsers: orphanUsers.map((user) => ({
          sourceAuthUuid: user.id,
          reviewRequired: true,
          migrated: false,
        })),
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  const targetUsersAfter = await listAllTargetUsers(client);
  const completedApplicationMappings = applicationLinkedUsers.filter((user) => Boolean(idMap[user.id])).length;
  const unresolvedApplicationMappings = applicationLinkedUsers.length - completedApplicationMappings;
  const orphanMigrated = orphanUsers.some((user) => Boolean(idMap[user.id]));
  const targetEmails = new Set(targetUsersAfter.map((user) => user.email?.toLowerCase()).filter(Boolean));
  const targetMappedApplicationUsers = applicationLinkedUsers.filter((user) => targetEmails.has(user.email!.toLowerCase())).length;
  const duplicateCheckPassed = targetEmails.size === targetUsersAfter.filter((user) => Boolean(user.email)).length;
  const validationPassed =
    completedApplicationMappings === applicationLinkedUsers.length &&
    unresolvedApplicationMappings === 0 &&
    targetMappedApplicationUsers === applicationLinkedUsers.length &&
    !orphanMigrated &&
    duplicateCheckPassed;

  const summary = {
    generatedAt: new Date().toISOString(),
    targetProjectRef: targetRef,
    sourceAuthUsers: sourceAuthUsers.length,
    applicationLinkedAuthUsers: applicationLinkedUsers.length,
    orphanAuthUsers: orphanUsers.length,
    targetAuthUsersBefore: targetUsersBefore.length,
    targetAuthUsersAfter: targetUsersAfter.length,
    targetAuthUsersCreatedThisRun: createdCount,
    targetAuthUsersReusedThisRun: reusedCount,
    completedApplicationMappings,
    unresolvedApplicationMappings,
    orphanAuthUserMigrated: false,
    duplicateCheckPassed,
    passwordPreservation: 'NOT_POSSIBLE',
    passwordResetEmailsSent: false,
    applicationDataImportStarted: false,
    storageMigrationStarted: false,
    sourceWrites: 0,
    validationPassed,
  };

  await fs.writeFile(authSummaryPath, JSON.stringify(summary, null, 2) + '\n', 'utf8');

  console.log(`Target project ref: ${targetRef}`);
  console.log(`Source Auth users: ${sourceAuthUsers.length}`);
  console.log(`Application-linked Auth users: ${applicationLinkedUsers.length}`);
  console.log(`Orphan Auth users: ${orphanUsers.length}`);
  console.log(`Target Auth users created this run: ${createdCount}`);
  console.log(`Completed application UUID mappings: ${completedApplicationMappings}`);
  console.log(`Unresolved application UUID mappings: ${unresolvedApplicationMappings}`);
  console.log(`Duplicate check: ${duplicateCheckPassed ? 'PASS' : 'FAIL'}`);
  console.log(`Auth migration validation: ${validationPassed ? 'PASS' : 'FAIL'}`);

  if (!validationPassed) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'SouthGold Auth migration failed.');
  process.exit(1);
});
