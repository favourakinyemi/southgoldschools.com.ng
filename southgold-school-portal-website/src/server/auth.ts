import { supabase } from './db';

const SUPER_ADMIN_EMAIL = 'southgold@gmail.com';
const SUPER_ADMIN_PASSWORD = 'Southgold1234';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  status: string;
  linkedId?: string | null;
  canChangePassword: boolean;
}

async function getProfileById(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, full_name, user_role, status, linked_id, can_change_password')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.user_role,
    status: data.status,
    linkedId: data.linked_id,
    canChangePassword: data.can_change_password,
  };
}

// Validate a JWT from the Authorization header and return the profile.
export async function authenticate(token?: string): Promise<AuthUser | null> {
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token.replace(/^Bearer\s+/i, ''));
  if (error || !data.user) return null;
  const profile = await getProfileById(data.user.id);
  if (!profile) return null;
  if (profile.status === 'Suspended') return null;
  return profile;
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(error?.message || 'Invalid credentials');
  }
  const profile = await getProfileById(data.user.id);
  if (!profile) throw new Error('Account exists but is not provisioned. Contact the administrator.');
  if (profile.status === 'Suspended') throw new Error('This account has been suspended.');
  return {
    accessToken: data.session.access_token,
    user: profile,
  };
}

// Create an auth user + app profile. `role` decides which table gets a row.
export async function createAppUser(input: {
  email: string;
  password: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT';
  fullName?: string;
  canChangePassword?: boolean;
  createdBy?: string;
  teacherData?: any;
  parentData?: any;
  studentData?: any;
}) {
  // 1. Create the auth account using admin API (no email confirmation required; we confirm directly).
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, role: input.role },
  });
  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create auth user');
  }
  const userId = authData.user.id;

  // 2. App profile row.
  const { error: userErr } = await supabase.from('users').insert({
    id: userId,
    email: input.email,
    full_name: input.fullName ?? null,
    user_role: input.role,
    status: 'Active',
    can_change_password: input.canChangePassword ?? false,
    created_by: input.createdBy ?? null,
  });
  if (userErr) throw new Error(userErr.message);

  // 3. Role-specific row.
  if (input.role === 'SCHOOL_ADMIN') {
    await supabase.from('staff_admins').insert({
      user_id: userId,
      email: input.email,
      full_name: input.fullName ?? null,
      department: input.teacherData?.department ?? null,
      permissions: {},
      created_by: input.createdBy ?? null,
    });
  } else if (input.role === 'TEACHER' && input.teacherData) {
    const teacherId = input.teacherData.id || `tch_${Date.now()}`;
    await supabase.from('teachers').insert({
      id: teacherId,
      staff_id: input.teacherData.staffId ?? null,
      first_name: input.teacherData.firstName ?? (input.fullName?.split(' ')[0] || ''),
      last_name: input.teacherData.lastName ?? (input.fullName?.split(' ').slice(1).join(' ') || ''),
      email: input.email,
      phone: input.teacherData.phone ?? null,
      department: input.teacherData.department ?? null,
      status: 'Active',
      user_id: userId,
      classes_assigned: input.teacherData.classesAssigned ?? [],
    });
    await supabase.from('users').update({ linked_id: teacherId }).eq('id', userId);
  } else if (input.role === 'PARENT' && input.parentData) {
    const parentId = input.parentData.id || `par_${Date.now()}`;
    await supabase.from('parents').insert({
      id: parentId,
      first_name: input.parentData.firstName ?? (input.fullName?.split(' ')[0] || ''),
      last_name: input.parentData.lastName ?? (input.fullName?.split(' ').slice(1).join(' ') || ''),
      email: input.email,
      phone: input.parentData.phone ?? null,
      address: input.parentData.address ?? null,
      status: 'Active',
      user_id: userId,
      created_by: input.createdBy ?? null,
    });
    await supabase.from('users').update({ linked_id: parentId }).eq('id', userId);
  } else if (input.role === 'STUDENT' && input.studentData) {
    const studentId = input.studentData.id || `std_${Date.now()}`;
    await supabase.from('students').insert({
      id: studentId,
      admission_no: input.studentData.admissionNo ?? null,
      first_name: input.studentData.firstName ?? (input.fullName?.split(' ')[0] || ''),
      last_name: input.studentData.lastName ?? (input.fullName?.split(' ').slice(1).join(' ') || ''),
      photo: input.studentData.photo ?? null,
      gender: input.studentData.gender ?? null,
      date_of_birth: input.studentData.dateOfBirth ?? null,
      parent_id: input.studentData.parentId ?? null,
      parent_name: input.studentData.parentName ?? null,
      parent_email: input.studentData.parentEmail ?? null,
      parent_phone: input.studentData.parentPhone ?? null,
      class_id: input.studentData.classId ?? null,
      arm: input.studentData.arm ?? 'A',
      status: 'Active',
      subjects: input.studentData.subjects ?? [],
      user_id: userId,
    });
    await supabase.from('users').update({ linked_id: studentId }).eq('id', userId);
  }

  return { id: userId, email: input.email, role: input.role };
}

// Ensure an auth user + profile + role row exists (idempotent, safe for upserts & syncs)
export async function ensureAppUserExists(input: {
  email: string;
  password?: string;
  role: 'SUPER_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT';
  fullName?: string;
  canChangePassword?: boolean;
  createdBy?: string;
  teacherData?: any;
  parentData?: any;
  studentData?: any;
}) {
  let userId: string | null = null;
  
  // 1. Check our public.users table first (extremely fast and indexed)
  const { data: dbUser } = await supabase.from('users').select('id').eq('email', input.email).maybeSingle();
  if (dbUser) {
    userId = dbUser.id;
  } else {
    // 2. Try creating user
    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: input.email,
        password: input.password || '1234',
        email_confirm: true,
        user_metadata: { full_name: input.fullName, role: input.role },
      });
      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists') || authError.status === 422) {
          const listRes = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const usersList: any[] = (listRes.data as any)?.users || [];
          const found = usersList.find(u => u.email?.toLowerCase() === input.email.toLowerCase());
          if (found) {
            userId = found.id;
          } else {
            throw authError;
          }
        } else {
          throw authError;
        }
      } else if (authData?.user) {
        userId = authData.user.id;
      }
    } catch (err: any) {
      const listRes = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const usersList: any[] = (listRes.data as any)?.users || [];
      const found = usersList.find(u => u.email?.toLowerCase() === input.email.toLowerCase());
      if (found) {
        userId = found.id;
      } else {
        throw err;
      }
    }
  }

  if (!userId) {
    throw new Error(`Could not find or create auth user for ${input.email}`);
  }

  const isNewUser = !dbUser;

  try {
    // Upsert public.users profile row
    const { error: userErr } = await supabase.from('users').upsert({
      id: userId,
      email: input.email,
      full_name: input.fullName ?? null,
      user_role: input.role,
      status: 'Active',
      can_change_password: input.canChangePassword ?? (input.role === 'SCHOOL_ADMIN'),
      created_by: input.createdBy ?? null,
    }, { onConflict: 'id' });
    if (userErr) throw new Error(userErr.message);

    // Upsert role-specific row
    if (input.role === 'SCHOOL_ADMIN') {
      const { error: saErr } = await supabase.from('staff_admins').upsert({
        user_id: userId,
        email: input.email,
        full_name: input.fullName ?? null,
        department: input.teacherData?.department ?? null,
        permissions: {},
        created_by: input.createdBy ?? null,
      }, { onConflict: 'user_id' });
      if (saErr) throw new Error(saErr.message);
    } else if (input.role === 'TEACHER') {
      const teacherId = input.teacherData?.id || `tch_${Date.now()}`;
      const { error: tErr } = await supabase.from('teachers').upsert({
        id: teacherId,
        staff_id: input.teacherData?.staffId ?? null,
        first_name: input.teacherData?.firstName ?? (input.fullName?.split(' ')[0] || ''),
        last_name: input.teacherData?.lastName ?? (input.fullName?.split(' ').slice(1).join(' ') || ''),
        email: input.email,
        phone: input.teacherData?.phone ?? null,
        department: input.teacherData?.department ?? null,
        status: 'Active',
        user_id: userId,
        classes_assigned: input.teacherData?.classesAssigned ?? [],
        photo: input.teacherData?.photo ?? null,
      }, { onConflict: 'id' });
      if (tErr) throw new Error(tErr.message);
      await supabase.from('users').update({ linked_id: teacherId }).eq('id', userId);
    } else if (input.role === 'PARENT') {
      const parentId = input.parentData?.id || `par_${Date.now()}`;
      const { error: pErr } = await supabase.from('parents').upsert({
        id: parentId,
        first_name: input.parentData?.firstName ?? (input.fullName?.split(' ')[0] || ''),
        last_name: input.parentData?.lastName ?? (input.fullName?.split(' ').slice(1).join(' ') || ''),
        email: input.email,
        phone: input.parentData?.phone ?? null,
        address: input.parentData?.address ?? null,
        status: 'Active',
        user_id: userId,
        created_by: input.createdBy ?? null,
      }, { onConflict: 'id' });
      if (pErr) throw new Error(pErr.message);
      await supabase.from('users').update({ linked_id: parentId }).eq('id', userId);
    } else if (input.role === 'STUDENT') {
      const studentId = input.studentData?.id || `std_${Date.now()}`;
      const { error: sErr } = await supabase.from('students').upsert({
        id: studentId,
        admission_no: input.studentData?.admissionNo ?? null,
        first_name: input.studentData?.firstName ?? (input.fullName?.split(' ')[0] || ''),
        last_name: input.studentData?.lastName ?? (input.fullName?.split(' ').slice(1).join(' ') || ''),
        photo: input.studentData?.photo ?? null,
        gender: input.studentData?.gender ?? null,
        date_of_birth: input.studentData?.dateOfBirth ?? null,
        parent_id: input.studentData?.parentId ?? null,
        parent_name: input.studentData?.parentName ?? null,
        parent_email: input.studentData?.parentEmail ?? null,
        parent_phone: input.studentData?.parentPhone ?? null,
        class_id: input.studentData?.classId ?? null,
        arm: input.studentData?.arm ?? 'A',
        status: 'Active',
        subjects: input.studentData?.subjects ?? [],
        user_id: userId,
      }, { onConflict: 'id' });
      if (sErr) throw new Error(sErr.message);
      await supabase.from('users').update({ linked_id: studentId }).eq('id', userId);
    }
  } catch (dbError: any) {
    console.error('Onboarding database insert/update failed, rolling back auth/profile:', dbError);
    if (userId && isNewUser) {
      await supabase.from('users').delete().eq('id', userId);
      await supabase.from('staff_admins').delete().eq('user_id', userId);
      if (input.role === 'TEACHER') {
        await supabase.from('teachers').delete().eq('user_id', userId);
      } else if (input.role === 'PARENT') {
        await supabase.from('parents').delete().eq('user_id', userId);
      } else if (input.role === 'STUDENT') {
        await supabase.from('students').delete().eq('user_id', userId);
      }
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (authDelErr) {
        console.error('Failed to delete auth user during onboarding rollback:', authDelErr);
      }
    }
    throw dbError;
  }

  return { id: userId, email: input.email, role: input.role };
}

export async function resetPasswordToDefault(email: string, defaultPassword = '1234') {
  const listData: any = (await supabase.auth.admin.listUsers()).data;
  const existing = listData?.users?.find((u: any) => u.email === email);
  if (!existing) throw new Error('No auth account found for this email');
  const { error } = await supabase.auth.admin.updateUserById(existing.id, { password: defaultPassword });
  if (error) throw new Error(error.message);
  return true;
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const { data: profile } = await supabase
    .from('users')
    .select('can_change_password')
    .eq('id', userId)
    .maybeSingle();
  
  if (!profile?.can_change_password) {
    throw new Error('You are not authorized to change your password.');
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: (await supabase.auth.admin.getUserById(userId)).data.user?.email || '',
    password: oldPassword,
  });
  if (verifyError) {
    throw new Error('Current password is incorrect.');
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) throw new Error(error.message);
  return true;
}

export async function setUserStatus(email: string, status: 'Active' | 'Suspended' | 'Inactive') {
  const listData: any = (await supabase.auth.admin.listUsers()).data;
  const existing = listData?.users?.find((u: any) => u.email === email);
  if (!existing) throw new Error('No auth account found for this email');
  const { error: profileErr } = await supabase.from('users').update({ status }).eq('id', existing.id);
  if (profileErr) throw new Error(profileErr.message);
  return true;
}

// Idempotent: create the default Super Admin on first boot if missing.
export async function ensureSuperAdmin() {
  try {
    const listData: any = (await supabase.auth.admin.listUsers()).data;
    const authUser = listData?.users?.find((u: any) => u.email === SUPER_ADMIN_EMAIL);
    
    let userId: string;
    if (authUser) {
      userId = authUser.id;
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: 'SouthGold Super Admin', role: 'SUPER_ADMIN' },
      });
      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Failed to create auth user');
      }
      userId = authData.user.id;
    }

    const { error: userErr } = await supabase.from('users').upsert({
      id: userId,
      email: SUPER_ADMIN_EMAIL,
      full_name: 'SouthGold Super Admin',
      user_role: 'SUPER_ADMIN',
      status: 'Active',
      can_change_password: true,
    });
    if (userErr) throw new Error(userErr.message);

    const { error: saErr } = await supabase.from('super_admins').upsert({
      user_id: userId,
      email: SUPER_ADMIN_EMAIL,
      full_name: 'SouthGold Super Admin',
    });
    if (saErr) throw new Error(saErr.message);

    console.log(`[Auth] Default Super Admin ready (${SUPER_ADMIN_EMAIL}).`);
  } catch (err: any) {
    console.warn('[Auth] Could not ensure Super Admin (is Supabase reachable / tables created?):', err?.message);
  }
}

export async function generateStudentEmail(firstName: string, lastName: string): Promise<string> {
  const f = (firstName || '').toLowerCase().trim().replace(/\s+/g, '.');
  const l = (lastName || '').toLowerCase().trim().replace(/\s+/g, '.');
  const baseEmail = `student.${f}.${l}`.replace(/\.+/g, '.');
  
  let suffix = '';
  let counter = 0;
  while (true) {
    const candidateEmail = `${baseEmail}${suffix}@gmail.com`;
    const { data } = await supabase.from('users').select('id').eq('email', candidateEmail).maybeSingle();
    if (!data) {
      return candidateEmail;
    }
    counter++;
    suffix = String(counter);
  }
}

export async function onboardStudent(input: {
  studentData: any;
  createdBy?: string;
}) {
  const s = input.studentData;
  const createdBy = input.createdBy;

  console.log('[Onboarding] STEP STARTED: Student Onboarding Validation');
  if (!s.firstName || !s.lastName) {
    console.error('[Onboarding] STEP FAILED: Validation failed - Missing student name');
    throw new Error('Student first name and last name are required.');
  }
  if (!s.parentName || !s.parentEmail) {
    console.error('[Onboarding] STEP FAILED: Validation failed - Missing parent name or email');
    throw new Error('Parent name and email are required for student onboarding.');
  }

  // 0. Resolve Existing Student Info if any
  console.log('[Onboarding] STEP STARTED: Resolving existing student details');
  const { data: existingStudent } = await supabase
    .from('students')
    .select('user_id, email, parent_id')
    .eq('id', s.id)
    .maybeSingle();

  const studentEmail = s.email || existingStudent?.email || await generateStudentEmail(s.firstName, s.lastName);
  const parentEmail = s.parentEmail;

  console.log(`[Onboarding] STEP COMPLETED: Resolved student email: ${studentEmail}, parent email: ${parentEmail}`);

  // Pre-onboarding Idempotent Duplicate Validation Check
  console.log('[Onboarding] STEP STARTED: Running idempotent duplicate validation check');
  
  // 1. Check admission_no uniqueness
  if (s.admissionNo) {
    const { data: dupAdmission } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('admission_no', s.admissionNo)
      .neq('id', s.id)
      .maybeSingle();

    if (dupAdmission) {
      console.error(`[Onboarding] STEP FAILED: Duplicate admission number: ${s.admissionNo}`);
      const err = new Error(`The admission number "${s.admissionNo}" is already assigned to student "${dupAdmission.first_name} ${dupAdmission.last_name}".`);
      (err as any).isValidationError = true;
      (err as any).errorType = 'DUPLICATE_ADMISSION_NUMBER';
      (err as any).rootCause = 'Admission number already exists in students table';
      (err as any).table = 'students';
      (err as any).column = 'admission_no';
      (err as any).constraint = 'students_admission_no_key';
      (err as any).sqlState = '23505';
      (err as any).repositoryMethod = 'onboardStudent';
      (err as any).suggestedResolution = 'Please generate a new or different unique admission number.';
      throw err;
    }
  }

  // 2. Check student email uniqueness in public.students and public.users
  if (studentEmail) {
    const { data: dupStudentEmail } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('email', studentEmail)
      .neq('id', s.id)
      .maybeSingle();

    if (dupStudentEmail) {
      console.error(`[Onboarding] STEP FAILED: Duplicate student email: ${studentEmail}`);
      const err = new Error(`The student email "${studentEmail}" is already registered to student "${dupStudentEmail.first_name} ${dupStudentEmail.last_name}".`);
      (err as any).isValidationError = true;
      (err as any).errorType = 'DUPLICATE_STUDENT_EMAIL';
      (err as any).rootCause = 'Email address already exists in students table';
      (err as any).table = 'students';
      (err as any).column = 'email';
      (err as any).constraint = 'students_email_key';
      (err as any).sqlState = '23505';
      (err as any).repositoryMethod = 'onboardStudent';
      (err as any).suggestedResolution = 'Please use a different email address for the student.';
      throw err;
    }

    const { data: dupUserEmail } = await supabase
      .from('users')
      .select('id, full_name, user_role')
      .eq('email', studentEmail)
      .maybeSingle();

    if (dupUserEmail && dupUserEmail.id !== existingStudent?.user_id) {
      console.error(`[Onboarding] STEP FAILED: Duplicate email in users: ${studentEmail}`);
      const err = new Error(`The email "${studentEmail}" is already registered in the system to user "${dupUserEmail.full_name}" (Role: ${dupUserEmail.user_role}).`);
      (err as any).isValidationError = true;
      (err as any).errorType = 'DUPLICATE_USER_EMAIL';
      (err as any).rootCause = 'Email address already exists in users table';
      (err as any).table = 'users';
      (err as any).column = 'email';
      (err as any).constraint = 'users_email_key';
      (err as any).sqlState = '23505';
      (err as any).repositoryMethod = 'onboardStudent';
      (err as any).suggestedResolution = 'Please use a unique email address.';
      throw err;
    }
  }

  // 3. Check student UUID (ID) conflict
  if (s.id) {
    const { data: dupStudentId } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('id', s.id)
      .maybeSingle();

    if (dupStudentId && !existingStudent) {
      console.error(`[Onboarding] STEP FAILED: Student ID conflict: ${s.id}`);
      const err = new Error(`The student ID "${s.id}" already exists for student "${dupStudentId.first_name} ${dupStudentId.last_name}".`);
      (err as any).isValidationError = true;
      (err as any).errorType = 'DUPLICATE_STUDENT_ID';
      (err as any).rootCause = 'Student ID already exists in students table';
      (err as any).table = 'students';
      (err as any).column = 'id';
      (err as any).constraint = 'students_pkey';
      (err as any).sqlState = '23505';
      (err as any).repositoryMethod = 'onboardStudent';
      (err as any).suggestedResolution = 'Please generate a new unique ID for the student.';
      throw err;
    }
  }

  console.log('[Onboarding] STEP COMPLETED: Idempotent duplicate validation passed');

  let studentAuthId: string | null = null;
  let parentAuthId: string | null = null;
  let resolvedParentId: string | null = s.parentId || existingStudent?.parent_id || null;
  let isNewStudentAuth = false;
  let isNewParentAuth = false;

  try {
    // 1. Locate or Create Parent Details and Auth User
    console.log(`[Onboarding] STEP STARTED: Locating or creating parent for email ${parentEmail}`);
    
    // Check if parent details exist in public.parents
    const { data: existingParent } = await supabase
      .from('parents')
      .select('id, user_id')
      .eq('email', parentEmail)
      .maybeSingle();

    if (existingParent) {
      resolvedParentId = existingParent.id;
      parentAuthId = existingParent.user_id;
      console.log(`[Onboarding] Found existing parent record with ID ${resolvedParentId} and user ID ${parentAuthId}`);
    }

    if (!parentAuthId) {
      // Look up parent auth in public.users
      const { data: dbParentUser } = await supabase.from('users').select('id').eq('email', parentEmail).maybeSingle();
      if (dbParentUser) {
        parentAuthId = dbParentUser.id;
        console.log(`[Onboarding] Found existing parent user ID in public.users: ${parentAuthId}`);
      }
    }

    // If still no auth ID, create a new Auth account
    if (!parentAuthId) {
      console.log(`[Onboarding] Creating new parent auth user for ${parentEmail}`);
      try {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: parentEmail,
          password: '1234',
          email_confirm: true,
          user_metadata: { full_name: s.parentName, role: 'PARENT' },
        });
        if (authErr) {
          if (authErr.message.includes('already registered') || authErr.message.includes('already exists') || authErr.status === 422) {
            console.log(`[Onboarding] Parent auth already exists, listing users to locate ID`);
            const listRes = await supabase.auth.admin.listUsers({ perPage: 1000 });
            const usersList = (listRes.data as any)?.users || [];
            const found = usersList.find((u: any) => u.email?.toLowerCase() === parentEmail.toLowerCase());
            if (found) {
              parentAuthId = found.id;
            } else {
              console.error(`[Onboarding] STEP FAILED: Create Parent Auth failed: ${authErr.message}`);
              throw authErr;
            }
          } else {
            console.error(`[Onboarding] STEP FAILED: Create Parent Auth failed: ${authErr.message}`);
            throw authErr;
          }
        } else if (authData?.user) {
          parentAuthId = authData.user.id;
          isNewParentAuth = true;
          console.log(`[Onboarding] Created new parent auth user successfully. ID: ${parentAuthId}`);
        }
      } catch (err: any) {
        console.warn(`[Onboarding] Fallback lookup of parent auth user due to error: ${err.message}`);
        const listRes = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const usersList = (listRes.data as any)?.users || [];
        const found = usersList.find((u: any) => u.email?.toLowerCase() === parentEmail.toLowerCase());
        if (found) {
          parentAuthId = found.id;
        } else {
          console.error(`[Onboarding] STEP FAILED: Locating parent auth user: ${err.message}`);
          throw err;
        }
      }
    }

    if (!parentAuthId) {
      throw new Error(`Failed to locate or create parent authentication account for ${parentEmail}`);
    }

    if (!resolvedParentId) {
      resolvedParentId = `par_${Date.now()}`;
      console.log(`[Onboarding] Assigned new Parent ID: ${resolvedParentId}`);
    }

    console.log(`[Onboarding] STEP COMPLETED: Parent account ready (Parent ID: ${resolvedParentId}, Auth ID: ${parentAuthId})`);

    // 2. Locate or Create Student Auth User
    console.log(`[Onboarding] STEP STARTED: Locating or creating student auth user for ${studentEmail}`);
    if (existingStudent && existingStudent.user_id) {
      studentAuthId = existingStudent.user_id;
      console.log(`[Onboarding] Found existing student user ID from students record: ${studentAuthId}`);
    }

    if (!studentAuthId) {
      const { data: dbStudentUser } = await supabase.from('users').select('id').eq('email', studentEmail).maybeSingle();
      if (dbStudentUser) {
        studentAuthId = dbStudentUser.id;
        console.log(`[Onboarding] Found existing student user ID in public.users: ${studentAuthId}`);
      }
    }

    if (!studentAuthId) {
      console.log(`[Onboarding] Creating new student auth user for ${studentEmail}`);
      try {
        const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
          email: studentEmail,
          password: '1234',
          email_confirm: true,
          user_metadata: { full_name: `${s.firstName} ${s.lastName}`, role: 'STUDENT' },
        });
        if (authErr) {
          if (authErr.message.includes('already registered') || authErr.message.includes('already exists') || authErr.status === 422) {
            console.log(`[Onboarding] Student auth already exists, listing users to locate ID`);
            const listRes = await supabase.auth.admin.listUsers({ perPage: 1000 });
            const usersList = (listRes.data as any)?.users || [];
            const found = usersList.find((u: any) => u.email?.toLowerCase() === studentEmail.toLowerCase());
            if (found) {
              studentAuthId = found.id;
            } else {
              console.error(`[Onboarding] STEP FAILED: Create Student Auth failed: ${authErr.message}`);
              throw authErr;
            }
          } else {
            console.error(`[Onboarding] STEP FAILED: Create Student Auth failed: ${authErr.message}`);
            throw authErr;
          }
        } else if (authData?.user) {
          studentAuthId = authData.user.id;
          isNewStudentAuth = true;
          console.log(`[Onboarding] Created new student auth user successfully. ID: ${studentAuthId}`);
        }
      } catch (err: any) {
        console.warn(`[Onboarding] Fallback lookup of student auth user due to error: ${err.message}`);
        const listRes = await supabase.auth.admin.listUsers({ perPage: 1000 });
        const usersList = (listRes.data as any)?.users || [];
        const found = usersList.find((u: any) => u.email?.toLowerCase() === studentEmail.toLowerCase());
        if (found) {
          studentAuthId = found.id;
        } else {
          console.error(`[Onboarding] STEP FAILED: Locating student auth user: ${err.message}`);
          throw err;
        }
      }
    }

    if (!studentAuthId) {
      throw new Error(`Failed to locate or create student authentication account for ${studentEmail}`);
    }

    console.log(`[Onboarding] STEP COMPLETED: Student auth user ready (Auth ID: ${studentAuthId})`);

    // 3. Execute DB transaction function via RPC (fully atomic)
    console.log(`[Onboarding] STEP STARTED: Triggering onboard_student_transaction RPC`);
    const rpcPayload = {
      p_student_id: s.id,
      p_admission_no: s.admissionNo,
      p_first_name: s.firstName,
      p_last_name: s.lastName,
      p_photo: s.photo || '',
      p_gender: s.gender || 'Male',
      p_date_of_birth: s.dateOfBirth || '',
      p_student_email: studentEmail,
      p_parent_id: resolvedParentId,
      p_parent_name: s.parentName,
      p_parent_email: parentEmail,
      p_parent_phone: s.parentPhone || '',
      p_parent_address: s.parentAddress || s.address || '',
      p_class_id: s.classId || '',
      p_arm: s.arm || 'A',
      p_status: s.status || 'Active',
      p_subjects: s.subjects || [],
      p_student_user_id: studentAuthId,
      p_parent_user_id: parentAuthId,
      p_created_by: createdBy || null
    };

    const { error: rpcErr } = await supabase.rpc('onboard_student_transaction', rpcPayload);

    if (rpcErr) {
      console.error(`[Onboarding] STEP FAILED: Database transaction function failed! Payload:`, JSON.stringify(rpcPayload), `Error details:`, rpcErr);
      const isUniqueViolation = rpcErr.code === '23505' || rpcErr.message?.toLowerCase().includes('unique');
      
      const err = new Error(`Database transaction failed: ${rpcErr.message} (${rpcErr.code})`);
      (err as any).isValidationError = !isUniqueViolation;
      (err as any).errorType = isUniqueViolation ? 'DATABASE_UNIQUE_VIOLATION' : 'DATABASE_TRANSACTION_FAILED';
      (err as any).rootCause = rpcErr.message;
      (err as any).sqlState = rpcErr.code || 'UNKNOWN';
      (err as any).repositoryMethod = 'onboardStudent';
      
      // Attempt to parse out details
      if (rpcErr.message?.includes('students_admission_no_key') || rpcErr.message?.toLowerCase().includes('admission_no')) {
        (err as any).table = 'students';
        (err as any).column = 'admission_no';
        (err as any).constraint = 'students_admission_no_key';
        (err as any).suggestedResolution = 'The generated admission number already exists. Please assign a different unique admission number.';
      } else if (rpcErr.message?.includes('users_email_key') || rpcErr.message?.toLowerCase().includes('email')) {
        (err as any).table = 'users';
        (err as any).column = 'email';
        (err as any).constraint = 'users_email_key';
        (err as any).suggestedResolution = 'The student or parent email is already registered in the system. Please use a unique email.';
      } else {
        (err as any).table = rpcErr.details?.match(/table "([^"]+)"/)?.[1] || 'unknown';
        (err as any).column = rpcErr.details?.match(/column "([^"]+)"/)?.[1] || 'unknown';
        (err as any).constraint = rpcErr.details?.match(/constraint "([^"]+)"/)?.[1] || 'unknown';
        (err as any).suggestedResolution = 'Please check the input values and try again. Contact school IT if the issue persists.';
      }
      
      (err as any).originalError = rpcErr;
      throw err;
    }

    console.log(`[Onboarding] STEP COMPLETED: Database transaction completed successfully for student ${s.id}`);

    return {
      success: true,
      studentId: s.id,
      studentEmail,
      studentAuthId,
      parentAuthId
    };

  } catch (error: any) {
    console.error('[Onboarding] STEP FAILED: Transaction execution failed! Initiating ROLLBACK of auth accounts. Error:', error);
    
    if (studentAuthId && isNewStudentAuth) {
      try {
        await supabase.auth.admin.deleteUser(studentAuthId);
        console.log(`[Rollback] Deleted newly created student auth user: ${studentAuthId}`);
      } catch (authDelErr) {
        console.error(`[Rollback] Failed to delete newly created student auth user:`, authDelErr);
      }
    }

    if (parentAuthId && isNewParentAuth) {
      try {
        await supabase.auth.admin.deleteUser(parentAuthId);
        console.log(`[Rollback] Deleted newly created parent auth user: ${parentAuthId}`);
      } catch (authDelErr) {
        console.error(`[Rollback] Failed to delete newly created parent auth user:`, authDelErr);
      }
    }

    throw error;
  }
}

