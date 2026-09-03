import { supabase } from './db';
import { ensureAppUserExists, onboardStudent } from './auth';
import fs from 'fs';
import path from 'path';
import { HOMEPAGE_IMAGE_DEFAULTS } from '../data/cmsDefaults';
import { isReceptionClass } from '../data/preschoolSkills';
import { assertValidResultScores, buildResultScoreLimits } from '../lib/resultScoreValidation';

// ============================================================================
// Row <-> Frontend shape mappers
// Frontend uses camelCase (e.g. admissionNo); Postgres uses snake_case.
// ============================================================================

function parseList(v: any): string[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function parseJsonArr(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim().length > 0) {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

function parseGradingScale(v: any): any[] {
  if (Array.isArray(v)) {
    if (v.length === 0) return [];
    if (typeof v[0] === 'object' && v[0] !== null) return v;
    return v.map((item: any) => {
      const s = String(item);
      const g = s.match(/grade=([^;]+)/);
      const m = s.match(/minScore=([^;]+)/);
      const r = s.match(/remark=([^;}]*)/);
      return {
        grade: g ? g[1].trim() : '',
        minScore: m ? Number(m[1].trim()) : 0,
        remark: r ? r[1].trim() : '',
      };
    });
  }
  if (typeof v === 'string' && v.trim().length > 0) {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

export const mapStudentFromDb = (r: any) => ({
  id: r.id,
  admissionNo: r.admission_no,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email || '',
  photo: r.photo,
  gender: r.gender,
  dateOfBirth: r.date_of_birth,
  parentId: r.parent_id,
  parentName: r.parent_name,
  parentEmail: r.parent_email,
  parentPhone: r.parent_phone,
  classId: r.class_id,
  arm: r.arm,
  status: r.status,
  subjects: parseList(r.subjects),
  userId: r.user_id,
});

export const mapStudentToDb = (s: any) => ({
  id: s.id,
  admission_no: s.admissionNo,
  first_name: s.firstName,
  last_name: s.lastName,
  email: s.email ?? null,
  photo: s.photo ?? null,
  gender: s.gender ?? null,
  date_of_birth: s.dateOfBirth ?? null,
  parent_id: s.parentId ?? null,
  parent_name: s.parentName ?? null,
  parent_email: s.parentEmail ?? null,
  parent_phone: s.parentPhone ?? null,
  class_id: s.classId ?? null,
  arm: s.arm ?? 'A',
  status: s.status ?? 'Active',
  subjects: s.subjects ?? [],
});

export const mapTeacherFromDb = (r: any) => ({
  id: r.id,
  staffId: r.staff_id,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
  phone: r.phone,
  department: r.department,
  status: r.status,
  classesAssigned: Array.isArray(r.classes_assigned) ? r.classes_assigned : [],
  userId: r.user_id,
  photo: r.photo ?? undefined,
});

export const mapTeacherToDb = (t: any) => ({
  id: t.id,
  staff_id: t.staffId ?? null,
  first_name: t.firstName,
  last_name: t.lastName ?? null,
  email: t.email ?? null,
  phone: t.phone ?? null,
  department: t.department ?? null,
  status: t.status ?? 'Active',
  classes_assigned: t.classesAssigned ?? [],
  photo: t.photo ?? null,
});

export const mapResultFromDb = (r: any) => {
  const rawRemark = r.teacher_remark || '';
  const match = rawRemark.match(/^\[([A-Z_]+)\]\s*(.*)/i);
  let status = r.is_approved ? 'APPROVED' : 'DRAFT';
  let cleanRemark = rawRemark;
  if (match) {
    status = match[1].toUpperCase();
    cleanRemark = match[2];
  }
  return {
    id: r.id,
    studentId: r.student_id,
    classId: r.class_id,
    arm: r.arm,
    subjectId: r.subject_id,
    term: r.term,
    session: r.session,
    testScore: r.test_score,
    assignmentScore: r.assignment_score,
    examScore: r.exam_score,
    totalScore: r.total_score,
    grade: r.grade,
    teacherRemark: cleanRemark,
    isApproved: r.is_approved,
    status,
  };
};

export const mapResultToDb = (r: any) => {
  const status = r.status ?? (r.isApproved ? 'APPROVED' : 'DRAFT');
  const rawRemark = r.teacherRemark || '';
  const cleanRemark = rawRemark.replace(/^\[[A-Z_]+\]\s*/i, '');
  const packedRemark = `[${status}] ${cleanRemark}`;
  return {
    id: r.id,
    student_id: r.studentId,
    class_id: r.classId ?? null,
    arm: r.arm ?? null,
    subject_id: r.subjectId ?? null,
    term: r.term ?? null,
    session: r.session ?? null,
    test_score: r.testScore ?? 0,
    assignment_score: r.assignmentScore ?? 0,
    exam_score: r.examScore ?? 0,
    total_score: r.totalScore ?? 0,
    grade: r.grade ?? null,
    teacher_remark: packedRemark,
    is_approved: (status === 'APPROVED' || status === 'PUBLISHED') ? true : false,
  };
};

export const mapEarlyYearsResultFromDb = (r: any) => {
  return {
    id: r.id,
    studentId: r.student_id,
    classId: r.class_id,
    arm: r.arm,
    subjectId: r.subject_id,
    term: r.term,
    session: r.session,
    rating: r.rating,
    isApproved: r.is_approved,
    status: r.status,
  };
};

export const mapEarlyYearsResultToDb = (r: any) => {
  return {
    id: r.id,
    student_id: r.studentId,
    class_id: r.classId,
    arm: r.arm,
    subject_id: (r.subjectId && typeof r.subjectId === 'string' && r.subjectId.trim() !== '') ? r.subjectId : null,
    term: r.term,
    session: r.session,
    rating: r.rating,
    is_approved: r.isApproved ?? false,
    status: r.status ?? 'DRAFT',
  };
};

export const mapAttendanceFromDb = (r: any) => ({
  id: r.id,
  date: r.date,
  entityId: r.entity_id,
  entityType: r.entity_type,
  status: r.status,
  remark: r.remark ?? undefined,
  session: r.session ?? undefined,
  term: r.term ?? undefined,
});

export const mapAttendanceToDb = (a: any) => ({
  id: a.id,
  date: a.date,
  entity_id: a.entityId,
  entity_type: a.entityType,
  status: a.status,
  remark: a.remark ?? null,
  session: a.session ?? null,
  term: a.term ?? null,
});



export const mapNotificationFromDb = (r: any) => ({
  id: r.id,
  title: r.title,
  content: r.content,
  category: r.category,
  date: r.date,
  recipientRole: r.recipient_role,
  recipientId: r.recipient_id || '',
  isRead: r.is_read || false,
});

export const mapNotificationToDb = (n: any) => ({
  id: n.id,
  title: n.title,
  content: n.content,
  category: n.category,
  date: n.date,
  recipient_role: n.recipientRole,
  recipient_id: n.recipientId || null,
  is_read: n.isRead ?? false,
});

export const mapTicketFromDb = (r: any) => ({
  id: r.id,
  senderName: r.sender_name,
  senderEmail: r.sender_email,
  senderRole: r.sender_role,
  subject: r.subject,
  message: r.message,
  status: r.status,
  createdAt: r.created_at,
  replies: parseJsonArr(r.replies),
});

export const mapTicketToDb = (t: any) => ({
  id: t.id,
  sender_name: t.senderName,
  sender_email: t.senderEmail,
  sender_role: t.senderRole,
  subject: t.subject,
  message: t.message,
  status: t.status ?? 'Open',
  created_at: t.createdAt ?? new Date().toISOString(),
  replies: t.replies ?? [],
});

export const mapResultApprovalFromDb = (r: any) => ({
  id: r.id,
  classId: r.class_id,
  session: r.session,
  term: r.term,
  teacherId: r.teacher_id,
  submissionTime: r.submission_time,
  status: r.status,
  headTeacherComment: r.head_teacher_comment || '',
  principalComment: r.principal_comment || '',
  reviewHistory: typeof r.review_history === 'string' ? JSON.parse(r.review_history) : (Array.isArray(r.review_history) ? r.review_history : []),
});

export const mapResultApprovalToDb = (r: any) => ({
  id: r.id,
  class_id: r.classId,
  session: r.session,
  term: r.term,
  teacher_id: r.teacherId,
  submission_time: r.submissionTime ?? new Date().toISOString(),
  status: r.status,
  head_teacher_comment: r.headTeacherComment ?? '',
  principal_comment: r.principalComment ?? '',
  review_history: r.reviewHistory ? (typeof r.reviewHistory === 'string' ? r.reviewHistory : JSON.stringify(r.reviewHistory)) : '[]',
});

export const mapSessionFromDb = (r: any) => ({
  id: r.id,
  name: r.name,
  isActive: r.is_active,
  startDate: r.start_date,
  endDate: r.end_date,
});

export const mapSessionToDb = (s: any) => ({
  id: s.id,
  name: s.name,
  is_active: s.isActive,
  start_date: s.startDate,
  end_date: s.endDate,
});

export const mapActivityFromDb = (r: any) => ({
  id: r.id,
  title: r.title,
  badge: r.badge,
  desc: r.description,
  imgUrl: r.img_url,
  footer: r.footer,
});

export const mapActivityToDb = (a: any) => ({
  id: a.id,
  title: a.title,
  badge: a.badge ?? null,
  description: a.desc ?? null,
  img_url: a.imgUrl ?? null,
  footer: a.footer ?? null,
});

export const mapConfigFromDb = (r: any) => ({
  currentTerm: r.current_term,
  currentSessionId: r.current_session_id,
  resumptionDate: r.resumption_date,
  closingDate: r.closing_date,
  gradingScale: parseGradingScale(r.grading_scale),
  earlyYearsGradingScale: r.early_years_grading_scale ?? [],
  earlyYearsCompetencies: r.early_years_competencies ?? [],
  caTestMax: r.ca_test_max ?? 20,
  caAssignmentMax: r.ca_assignment_max ?? 20,
  examMax: r.exam_max ?? 60,
  logoUrl: r.logo_url ?? '',
  schoolName: r.school_name ?? 'SOUTHGOLD MONTESSORI SCHOOL',
  schoolAddress: r.school_address ?? '3, Fagbeyi Ige, Olusi crescent, Hopeville Estate, Haruna B/Stop. Sangotedo, Lagos, Nigeria',
  schoolEmail: r.school_email ?? 'southgoldmontessorischools@gmail.com',
  schoolPhone: r.school_phone ?? '+234 803 123 4567',
});

export const mapConfigToDb = (c: any) => ({
  id: 'global',
  current_term: c.currentTerm,
  current_session_id: c.currentSessionId,
  resumption_date: c.resumptionDate,
  closing_date: c.closingDate,
  grading_scale: c.gradingScale ?? [],
  early_years_grading_scale: c.earlyYearsGradingScale ?? [],
  early_years_competencies: c.earlyYearsCompetencies ?? [],
  ca_test_max: c.caTestMax ?? 20,
  ca_assignment_max: c.caAssignmentMax ?? 20,
  exam_max: c.examMax ?? 60,
  logo_url: c.logoUrl ?? null,
  school_name: c.schoolName ?? 'SOUTHGOLD MONTESSORI SCHOOL',
  school_address: c.schoolAddress ?? '3, Fagbeyi Ige, Olusi crescent, Hopeville Estate, Haruna B/Stop. Sangotedo, Lagos, Nigeria',
  school_email: c.schoolEmail ?? 'southgoldmontessorischools@gmail.com',
  school_phone: c.schoolPhone ?? '+234 803 123 4567',
});

export const mapClassesSubjectsFromDb = (r: any) => ({
  classId: r.class_id,
  subjects: parseList(r.subjects),
  stage: r.stage ?? undefined,
});

export const mapClassesSubjectsToDb = (c: any) => ({
  class_id: c.classId,
  subjects: c.subjects ?? [],
  stage: c.stage ?? null,
});

// ---------- STAFF ADMINS ----------
export const mapStaffAdminFromDb = (r: any) => ({
  userId: r.user_id,
  email: r.email,
  fullName: r.full_name,
  department: r.department,
  permissions: r.permissions ?? {},
});

export const mapStaffAdminToDb = (s: any) => ({
  user_id: s.userId,
  email: s.email,
  full_name: s.fullName,
  department: s.department ?? null,
  permissions: s.permissions ?? {},
});

// ---------- PARENTS ----------
export const mapParentFromDb = (r: any) => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
  phone: r.phone,
  address: r.address ?? undefined,
  status: r.status,
  userId: r.user_id,
});

export const mapParentToDb = (p: any) => ({
  id: p.id,
  first_name: p.firstName,
  last_name: p.lastName ?? null,
  email: p.email,
  phone: p.phone ?? null,
  address: p.address ?? null,
  status: p.status ?? 'Active',
});

// Find-or-create a parent from a student's parentEmail/parentName so the
// students.parent_id FK constraint is always satisfied.
// Find-or-create a parent and ensure their Supabase Auth and database profiles exist
async function resolveParentIdAndEnsureAuth(s: any): Promise<string> {
  if (s.parentId) {
    const { data: existingParent } = await supabase.from('parents').select('id').eq('id', s.parentId).maybeSingle();
    if (existingParent) {
      return existingParent.id;
    }
  }

  const email = s.parentEmail || `parent.${s.firstName.toLowerCase()}_${Math.floor(Math.random() * 1000)}@southgold.com`;
  const name = s.parentName || `${s.firstName} ${s.lastName || ''}'s Parent`.trim();
  const parentId = s.parentId || `par_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

  const auth = await ensureAppUserExists({
    email,
    role: 'PARENT',
    fullName: name,
    parentData: {
      id: parentId,
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' ') || 'Parent',
      phone: s.parentPhone || null,
    }
  });

  // Retrieve the parent's ID from users table or use parentId
  const { data } = await supabase.from('users').select('linked_id').eq('id', auth.id).maybeSingle();
  if (data?.linked_id) return data.linked_id;

  // Fallback check if user row is not fully updated yet
  const { data: pData } = await supabase.from('parents').select('id').eq('email', email).maybeSingle();
  return pData?.id ?? parentId;
}

export const mapSubjectFromDb = (r: any) => ({ id: r.id, name: r.name, code: r.code });
export const mapSubjectToDb = (s: any) => ({ id: s.id, name: s.name, code: s.code });

// ============================================================================
// Generic replace helper: upsert provided rows, delete orphans not in set.
// ============================================================================

async function replaceAll(table: string, rows: any[], idField: string) {
  if (rows.length === 0) {
    const { error } = await supabase.from(table).delete().neq(idField, '__never__');
    if (error) throw error;
    return [];
  }
  const { error } = await supabase.from(table).upsert(rows, { onConflict: idField });
  if (error) throw error;
  const ids = rows.map((r) => r[idField]);
  const { error: delErr } = await supabase
    .from(table)
    .delete()
    .not(idField, 'in', `(${ids.map((i) => `"${String(i).replace(/"/g, '\\"')}"`).join(',')})`);
  if (delErr) throw delErr;
  return rows;
}

// ============================================================================
// Snapshot used by GET /api/db
// ============================================================================

export async function getDbSnapshot(user?: any) {
  const [
    students,
    teachers,
    results,
    earlyYearsResults,
    attendance,
    notifications,
    tickets,
    sessions,
    config,
    activities,
    subjects,
    classesSubjects,
    parents,
    staffAdmins,
  ] = await Promise.all([
    supabase.from('students').select('*'),
    supabase.from('teachers').select('*'),
    supabase.from('results').select('*'),
    supabase.from('early_years_results').select('*'),
    supabase.from('attendance').select('*'),
    supabase.from('notifications').select('*'),
    supabase.from('tickets').select('*'),
    supabase.from('sessions').select('*'),
    supabase.from('configurations').select('*').eq('id', 'global').maybeSingle(),
    supabase.from('activities').select('*'),
    supabase.from('subjects').select('*'),
    supabase.from('classes_subjects').select('*'),
    supabase.from('parents').select('*'),
    supabase.from('staff_admins').select('*'),
  ]);

  const firstError = [students, teachers, results, attendance, notifications, tickets, sessions, activities, subjects, classesSubjects, parents, staffAdmins].find((r) => r.error);
  if (firstError?.error) throw firstError.error;
  if (config.error) throw config.error;

  let studentsList = (students.data || []).map(mapStudentFromDb);
  let teachersList = (teachers.data || []).map(mapTeacherFromDb);
  let resultsList = (results.data || []).map(mapResultFromDb);
  
  if (earlyYearsResults.error) {
    throw earlyYearsResults.error;
  }
  let earlyYearsResultsList = (earlyYearsResults.data || []).map(mapEarlyYearsResultFromDb);

  let attendanceList = (attendance.data || []).map(mapAttendanceFromDb);
  let notificationsList = (notifications.data || []).map(mapNotificationFromDb);
  let ticketsList = (tickets.data || []).map(mapTicketFromDb);
  let sessionsList = (sessions.data || []).map(mapSessionFromDb);
  let activitiesList = (activities.data || []).map(mapActivityFromDb);
  let subjectsList = (subjects.data || []).map(mapSubjectFromDb);
  let classesWithSubjectsList = (classesSubjects.data || []).map(mapClassesSubjectsFromDb);
  let parentsList = (parents.data || []).map(mapParentFromDb);
  let staffAdminsList = (staffAdmins.data || []).map(mapStaffAdminFromDb);
  let assessmentItemsList = await AssessmentItems.list();

  // If no authenticated user, return only basic public details for login page branding
  if (!user) {
    return {
      students: [],
      teachers: [],
      results: [],
      earlyYearsResults: [],
      assessmentItems: [],
      attendance: [],
      notifications: [],
      tickets: [],
      sessions: [],
      config: config.data ? mapConfigFromDb(config.data) : {},
      activities: activitiesList,
      subjects: [],
      classesWithSubjects: [],
      parents: [],
      staffAdmins: [],
    };
  }

  // Row Level Security (RLS) Filtering based on role at API gateway level
  if (user.role === 'PARENT') {
    const parentId = user.linkedId;
    const parentEmail = user.email;

    // Filter students: only children belonging to this parent
    studentsList = studentsList.filter((s) => s.parentId === parentId || s.parentEmail === parentEmail);
    const childIds = studentsList.map((s) => s.id);

    // Filter results & attendance: only for their children
    resultsList = resultsList.filter((r) => childIds.includes(r.studentId));
    earlyYearsResultsList = earlyYearsResultsList.filter((r) => childIds.includes(r.studentId));
    attendanceList = attendanceList.filter((a) => childIds.includes(a.entityId));

    // Filter parents list: only show self
    parentsList = parentsList.filter((p) => p.id === parentId || p.email === parentEmail);

    // Filter tickets: only theirs
    ticketsList = ticketsList.filter((t) => t.senderEmail === parentEmail);

    // Hide administrative details
    staffAdminsList = [];
  } else if (user.role === 'STUDENT') {
    const studentId = user.linkedId;
    const studentEmail = user.email;

    // Filter students: only self
    studentsList = studentsList.filter((s) => s.id === studentId);

    // Filter results & attendance: only self
    resultsList = resultsList.filter((r) => r.studentId === studentId);
    earlyYearsResultsList = earlyYearsResultsList.filter((r) => r.studentId === studentId);
    attendanceList = attendanceList.filter((a) => a.entityId === studentId);

    // Filter tickets: only self
    ticketsList = ticketsList.filter((t) => t.senderEmail === studentEmail);

    // Hide other sensitive information for students
    parentsList = [];
    teachersList = [];
    staffAdminsList = [];
  } else if (user.role === 'TEACHER') {
    // Teachers are allowed to see students, results, attendance to perform grading.
    // They don't need to see staff admin user profiles.
    staffAdminsList = [];
  }

  return {
    students: studentsList,
    teachers: teachersList,
    results: resultsList,
    earlyYearsResults: earlyYearsResultsList,
    assessmentItems: assessmentItemsList,
    attendance: attendanceList,
    notifications: notificationsList,
    tickets: ticketsList,
    sessions: sessionsList,
    config: config.data ? mapConfigFromDb(config.data) : {},
    activities: activitiesList,
    subjects: subjectsList,
    classesWithSubjects: classesWithSubjectsList,
    parents: parentsList,
    staffAdmins: staffAdminsList,
  };
}

// ============================================================================
// Resource-specific helpers
// ============================================================================

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

export const Students = {
  list: async () => {
    return (await supabase.from('students').select('*')).data?.map(mapStudentFromDb) ?? [];
  },
  get: async (id: string) => {
    const { data } = await supabase.from('students').select('*').eq('id', id).maybeSingle();
    return data ? mapStudentFromDb(data) : null;
  },
  insert: async (rows: any[]) => {
    for (const s of rows) {
      await onboardStudent({ studentData: s });
    }
  },
  replace: async (rows: any[]) => {
    const incomingIds = rows.map((s) => s.id);
    const { data: existing } = await supabase.from('students').select('id');
    const existingIds = existing?.map((s) => s.id) || [];

    for (const oldId of existingIds) {
      if (!incomingIds.includes(oldId)) {
        await Students.remove(oldId);
      }
    }

    for (const s of rows) {
      await onboardStudent({ studentData: s });
    }
  },
  update: async (id: string, row: any) => {
    await onboardStudent({ studentData: { ...row, id } });
  },
  remove: async (id: string) => {
    const { data } = await supabase.from('students').select('user_id').eq('id', id).maybeSingle();
    const userId = data?.user_id;

    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;

    if (userId) {
      await supabase.from('users').delete().eq('id', userId);
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (authErr) {
        console.error('Failed to delete student auth user:', authErr);
      }
    }
  },
};

export const Parents = {
  list: async () => {
    return (await supabase.from('parents').select('*')).data?.map(mapParentFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    await Promise.all(
      rows.map(async (p) => {
        await ensureAppUserExists({
          email: p.email,
          role: 'PARENT',
          fullName: `${p.firstName} ${p.lastName || ''}`.trim(),
          parentData: p,
        });
      })
    );
  },
  update: async (id: string, row: any) => {
    const auth = await ensureAppUserExists({
      email: row.email,
      role: 'PARENT',
      fullName: `${row.firstName} ${row.lastName || ''}`.trim(),
      parentData: { ...row, id },
    });
    const { error } = await supabase.from('parents').update({ ...mapParentToDb(row), user_id: auth.id }).eq('id', id);
    if (error) throw error;
  },
  remove: async (id: string) => {
    const { data } = await supabase.from('parents').select('user_id').eq('id', id).maybeSingle();
    const userId = data?.user_id;

    const { error } = await supabase.from('parents').delete().eq('id', id);
    if (error) throw error;

    if (userId) {
      await supabase.from('users').delete().eq('id', userId);
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (authErr) {
        console.error('Failed to delete parent auth user:', authErr);
      }
    }
  },
};

export const Teachers = {
  list: async () => {
    return (await supabase.from('teachers').select('*')).data?.map(mapTeacherFromDb) ?? [];
  },
  replace: async (rows: any[]) => {
    const { data: existingTeachers } = await supabase.from('teachers').select('id, user_id, email');
    const existingMap = new Map(existingTeachers?.map(t => [t.id, t]) || []);

    const resolved = await Promise.all(
      rows.map(async (t) => {
        const existing = existingMap.get(t.id);
        if (existing) {
          return { ...mapTeacherToDb(t), user_id: existing.user_id };
        } else {
          const auth = await ensureAppUserExists({
            email: t.email,
            role: 'TEACHER',
            fullName: `${t.firstName} ${t.lastName || ''}`.trim(),
            teacherData: t,
          });
          return { ...mapTeacherToDb(t), user_id: auth.id };
        }
      })
    );
    await replaceAll('teachers', resolved, 'id');
  },
  insert: async (rows: any[]) => {
    return await Promise.all(
      rows.map(async (t) => {
        const auth = await ensureAppUserExists({
          email: t.email,
          role: 'TEACHER',
          fullName: `${t.firstName} ${t.lastName || ''}`.trim(),
          teacherData: t,
        });
        const { data, error } = await supabase.from('teachers').select('*').eq('user_id', auth.id).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Teacher profile was not created.');
        return mapTeacherFromDb(data);
      })
    );
  },
  update: async (id: string, row: any) => {
    const auth = await ensureAppUserExists({
      email: row.email,
      role: 'TEACHER',
      fullName: `${row.firstName} ${row.lastName || ''}`.trim(),
      teacherData: { ...row, id },
    });
    const { error } = await supabase.from('teachers').update({ ...mapTeacherToDb(row), user_id: auth.id }).eq('id', id);
    if (error) throw error;
  },
  remove: async (id: string) => {
    const { data } = await supabase.from('teachers').select('user_id').eq('id', id).maybeSingle();
    const userId = data?.user_id;

    const { error } = await supabase.from('teachers').delete().eq('id', id);
    if (error) throw error;

    if (userId) {
      await supabase.from('users').delete().eq('id', userId);
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (authErr) {
        console.error('Failed to delete teacher auth user:', authErr);
      }
    }
  },
};

const getConfiguredResultScoreLimits = async () => {
  const config = await Config.get();
  return buildResultScoreLimits(config);
};

const validateRowsForResultPersistence = async (rows: any[]) => {
  const limits = await getConfiguredResultScoreLimits();
  assertValidResultScores(rows, limits, isReceptionClass);
};

export const Results = {
  list: async () => {
    return (await supabase.from('results').select('*')).data?.map(mapResultFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    await validateRowsForResultPersistence(rows);
    const { error } = await supabase.from('results').insert(rows.map(mapResultToDb));
    if (error) throw error;
  },
  update: async (id: string, row: any) => {
    await validateRowsForResultPersistence([{ ...row, id }]);
    const { error } = await supabase.from('results').update(mapResultToDb(row)).eq('id', id);
    if (error) throw error;
  },
  upsert: async (rows: any[]) => {
    await validateRowsForResultPersistence(rows);
    const { error } = await supabase.from('results').upsert(rows.map(mapResultToDb), { onConflict: 'id' });
    if (error) throw error;
  },
};

export const EarlyYearsResults = {
  list: async () => {
    return (await supabase.from('early_years_results').select('*')).data?.map(mapEarlyYearsResultFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    const { data: validSubs } = await supabase.from('subjects').select('id');
    const validSubIds = new Set((validSubs || []).map(s => s.id));
    const dbRows = rows.map(r => {
      const row = mapEarlyYearsResultToDb(r);
      if (row.subject_id && !validSubIds.has(row.subject_id)) {
        row.subject_id = null;
      }
      return row;
    });
    const { error } = await supabase.from('early_years_results').insert(dbRows);
    if (error) throw error;
  },
  update: async (id: string, row: any) => {
    const { data: validSubs } = await supabase.from('subjects').select('id');
    const validSubIds = new Set((validSubs || []).map(s => s.id));
    const dbRow = mapEarlyYearsResultToDb(row);
    if (dbRow.subject_id && !validSubIds.has(dbRow.subject_id)) {
      dbRow.subject_id = null;
    }
    const { error } = await supabase.from('early_years_results').update(dbRow).eq('id', id);
    if (error) throw error;
  },
  upsert: async (rows: any[]) => {
    const { data: validSubs } = await supabase.from('subjects').select('id');
    const validSubIds = new Set((validSubs || []).map(s => s.id));
    const dbRows = rows.map(r => {
      const row = mapEarlyYearsResultToDb(r);
      if (row.subject_id && !validSubIds.has(row.subject_id)) {
        row.subject_id = null;
      }
      return row;
    });
    const { error } = await supabase.from('early_years_results').upsert(dbRows, { onConflict: 'id' });
    if (error) throw error;
  },
};

export const AssessmentItems = {
  list: async () => {
    try {
      const { data } = await supabase.from('cms_content').select('*').eq('id', 'early_years_assessment_items').maybeSingle();
      if (data && data.content && Array.isArray(data.content.items)) {
        return data.content.items;
      }
    } catch (e: any) {
      console.warn('[Supabase] Failed to fetch assessment_items from cms_content:', e.message);
    }
    return [];
  },
  save: async (items: any[]) => {
    const { error } = await supabase.from('cms_content').upsert({
      id: 'early_years_assessment_items',
      content: { items }
    });
    if (error) throw error;
  },
};

export const Attendance = {
  list: async () => {
    return (await supabase.from('attendance').select('*')).data?.map(mapAttendanceFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    for (const r of rows) {
      const dbRow = mapAttendanceToDb(r);
      let query = supabase.from('attendance').select('id');
      if (dbRow.id) {
        query = query.eq('id', dbRow.id);
      } else {
        query = query
          .eq('entity_id', dbRow.entity_id)
          .eq('date', dbRow.date)
          .eq('entity_type', dbRow.entity_type);
      }
      const { data: existing } = await query.maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('attendance')
          .update(dbRow)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('attendance')
          .insert(dbRow);
        if (error) throw error;
      }
    }
  },
  removeMany: async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const batchSize = 200;
    for (let i = 0; i < ids.length; i += batchSize) {
      const chunk = ids.slice(i, i + batchSize);
      const { error } = await supabase
        .from('attendance')
        .delete()
        .in('id', chunk);
      if (error) throw error;
    }
  },
};



export const Notifications = {
  list: async () => {
    return (await supabase.from('notifications').select('*')).data?.map(mapNotificationFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    const { error } = await supabase.from('notifications').insert(rows.map(mapNotificationToDb));
    if (error) throw error;
  },
  update: async (id: string, row: any) => {
    const { error } = await supabase.from('notifications').update(mapNotificationToDb(row)).eq('id', id);
    if (error) throw error;
  },
};

export const Tickets = {
  list: async () => {
    return (await supabase.from('tickets').select('*')).data?.map(mapTicketFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    const { error } = await supabase.from('tickets').insert(rows.map(mapTicketToDb));
    if (error) throw error;
    return rows[0];
  },
  update: async (id: string, row: any) => {
    const { error } = await supabase.from('tickets').update(mapTicketToDb(row)).eq('id', id);
    if (error) throw error;
  },
};

export const ResultApprovals = {
  list: async () => {
    return (await supabase.from('result_approval_requests').select('*')).data?.map(mapResultApprovalFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    const { error } = await supabase.from('result_approval_requests').insert(rows.map(mapResultApprovalToDb));
    if (error) throw error;
  },
  upsert: async (rows: any[]) => {
    const { error } = await supabase.from('result_approval_requests').upsert(rows.map(mapResultApprovalToDb), { onConflict: 'id' });
    if (error) throw error;
  },
  update: async (id: string, row: any) => {
    const { error } = await supabase.from('result_approval_requests').update(mapResultApprovalToDb(row)).eq('id', id);
    if (error) throw error;
  },
};

export const Sessions = {
  list: async () => {
    return (await supabase.from('sessions').select('*')).data?.map(mapSessionFromDb) ?? [];
  },
  replace: async (rows: any[]) => replaceAll('sessions', rows.map(mapSessionToDb), 'id'),
};

export const Config = {
  get: async () => {
    let dbRow: any = null;
    try {
      const { data } = await supabase.from('configurations').select('*').eq('id', 'global').maybeSingle();
      dbRow = data;
    } catch (e) {
      console.error('Error fetching config from db:', e);
    }
    
    const config: any = {};
    if (dbRow) {
      config.currentTerm = dbRow.current_term;
      config.currentSessionId = dbRow.current_session_id;
      config.resumptionDate = dbRow.resumption_date;
      config.closingDate = dbRow.closing_date;
      config.gradingScale = parseGradingScale(dbRow.grading_scale);
      config.earlyYearsGradingScale = dbRow.early_years_grading_scale ?? [];
      config.caTestMax = dbRow.ca_test_max ?? 20;
      config.caAssignmentMax = dbRow.ca_assignment_max ?? 20;
      config.examMax = dbRow.exam_max ?? 60;
      config.logoUrl = dbRow.logo_url ?? '';
      config.schoolName = dbRow.school_name ?? 'SOUTHGOLD MONTESSORI SCHOOL';
      config.schoolAddress = dbRow.school_address ?? '3, Fagbeyi Ige, Olusi crescent, Hopeville Estate, Haruna B/Stop. Sangotedo, Lagos, Nigeria';
      config.schoolEmail = dbRow.school_email ?? 'southgoldmontessorischools@gmail.com';
      config.schoolPhone = dbRow.school_phone ?? '+234 803 123 4567';
    } else {
      config.currentTerm = 'First Term';
      config.currentSessionId = '';
      config.resumptionDate = '';
      config.closingDate = '';
      config.gradingScale = [];
      config.earlyYearsGradingScale = [];
      config.caTestMax = 20;
      config.caAssignmentMax = 20;
      config.examMax = 60;
      config.logoUrl = '';
      config.schoolName = 'SOUTHGOLD MONTESSORI SCHOOL';
      config.schoolAddress = '3, Fagbeyi Ige, Olusi crescent, Hopeville Estate, Haruna B/Stop. Sangotedo, Lagos, Nigeria';
      config.schoolEmail = 'southgoldmontessorischools@gmail.com';
      config.schoolPhone = '+234 803 123 4567';
    }
    return config;
  },
  update: async (row: any) => {
    let dbRow: any = null;
    try {
      const { data } = await supabase.from('configurations').select('*').eq('id', 'global').maybeSingle();
      dbRow = data;
    } catch (e) {
      console.error('Error fetching config before update:', e);
    }

    const fullPayload = mapConfigToDb(row);
    const dbPayload: any = { id: 'global' };
    
    if (dbRow) {
      for (const key of Object.keys(dbRow)) {
        if (key in fullPayload) {
          dbPayload[key] = (fullPayload as any)[key];
        }
      }
    } else {
      dbPayload.current_term = fullPayload.current_term;
      dbPayload.current_session_id = fullPayload.current_session_id;
      dbPayload.resumption_date = fullPayload.resumption_date;
      dbPayload.closing_date = fullPayload.closing_date;
      dbPayload.grading_scale = fullPayload.grading_scale;
      dbPayload.ca_test_max = fullPayload.ca_test_max;
      dbPayload.ca_assignment_max = fullPayload.ca_assignment_max;
      dbPayload.exam_max = fullPayload.exam_max;
      dbPayload.early_years_grading_scale = fullPayload.early_years_grading_scale;
    }

    const { error } = await supabase.from('configurations').upsert(dbPayload);
    if (error) throw error;
  },
};

export const CMS = {
  get: async () => {
    try {
      const { data, error } = await supabase.from('cms_content').select('*').eq('id', 'landing_cms').maybeSingle();
      if (data && data.content) {
        return {
          motto: data.content.motto ?? 'Learn and Grow Together.',
          whatsapp: data.content.whatsapp ?? '+234 803 123 4567',
          facebook: data.content.facebook ?? 'https://facebook.com',
          instagram: data.content.instagram ?? 'https://instagram.com',
          youtube: data.content.youtube ?? 'https://youtube.com',
          website: data.content.website ?? 'https://southgoldschools.com.ng',
          welcomeTitle: data.content.welcomeTitle ?? 'Welcome to SouthGold Montessori School',
          welcomeDesc: data.content.welcomeDesc ?? 'We provide a warm, nurturing environment where every child can flourish academically, socially, and emotionally.',
          aboutTitle: data.content.aboutTitle ?? 'Our Heritage of Excellence',
          aboutDesc: data.content.aboutDesc ?? 'Established with a vision to cultivate outstanding young minds, SouthGold Montessori School combines modern learning methodologies with classical values.',
          mission: data.content.mission ?? 'To foster creative thinking, intellectual curiosity, and moral integrity in every student.',
          vision: data.content.vision ?? 'To be a premier educational institution recognized globally for academic leadership and character development.',
          principalMessage: data.content.principalMessage ?? 'Welcome to our community. At SouthGold, we believe that education is the key to unlocking every child’s potential. We invite you to partner with us in this journey.',
          principalName: data.content.principalName ?? 'Mrs. Olufunmilayo Fagbeyi',
          principalPhoto: data.content.principalPhoto ?? '',
          heroImages: data.content.heroImages ?? [],
          gallery: data.content.gallery ?? [],
          welcomeImage: data.content.welcomeImage || HOMEPAGE_IMAGE_DEFAULTS.welcomeImage,
          earlyYearsImage: data.content.earlyYearsImage || HOMEPAGE_IMAGE_DEFAULTS.earlyYearsImage,
          primarySchoolImage: data.content.primarySchoolImage || HOMEPAGE_IMAGE_DEFAULTS.primarySchoolImage,
          secondarySchoolImage: data.content.secondarySchoolImage || HOMEPAGE_IMAGE_DEFAULTS.secondarySchoolImage,
          admissionsTitle: data.content.admissionsTitle ?? 'Admissions Open for 2026/2027 Session',
          admissionsDesc: data.content.admissionsDesc ?? 'We are currently accepting applications for Preschool, Primary, and Junior Secondary classes. Reach out to our admissions desk to learn more.',
          news: data.content.news ?? [
            { id: '1', title: 'Inter-House Sports Festival 2026', content: 'Our annual inter-house sports festival was held with high spirits and excellent performances from all houses.', date: '2026-06-15' },
            { id: '2', title: 'STEAM Exhibition Day', content: 'Students showcased amazing science, technology, engineering, arts, and math projects at our annual exhibition.', date: '2026-05-20' }
          ],
          announcements: data.content.announcements ?? [
            { id: '1', title: 'Resumption for Third Term', content: 'Third term begins on Monday, May 11th, 2026. All pupils are expected to be in full uniform.', date: '2026-05-08' }
          ]
        };
      }
    } catch (e) {
      console.error('Error fetching CMS from db:', e);
    }
    return {
      motto: 'Learn and Grow Together.',
      whatsapp: '+234 803 123 4567',
      facebook: 'https://facebook.com',
      instagram: 'https://instagram.com',
      youtube: 'https://youtube.com',
      website: 'https://southgoldschools.com.ng',
      welcomeTitle: 'Welcome to SouthGold Montessori School',
      welcomeDesc: 'We provide a warm, nurturing environment where every child can flourish academically, socially, and emotionally.',
      aboutTitle: 'Our Heritage of Excellence',
      aboutDesc: 'Established with a vision to cultivate outstanding young minds, SouthGold Montessori School combines modern learning methodologies with classical values.',
      mission: 'To foster creative thinking, intellectual curiosity, and moral integrity in every student.',
      vision: 'To be a premier educational institution recognized globally for academic leadership and character development.',
      principalMessage: 'Welcome to our community. At SouthGold, we believe that education is the key to unlocking every child’s potential. We invite you to partner with us in this journey.',
      principalName: 'Mrs. Olufunmilayo Fagbeyi',
      principalPhoto: '',
      heroImages: [],
      gallery: [],
      ...HOMEPAGE_IMAGE_DEFAULTS,
      admissionsTitle: 'Admissions Open for 2026/2027 Session',
      admissionsDesc: 'We are currently accepting applications for Preschool, Primary, and Junior Secondary classes. Reach out to our admissions desk to learn more.',
      news: [
        { id: '1', title: 'Inter-House Sports Festival 2026', content: 'Our annual inter-house sports festival was held with high spirits and excellent performances from all houses.', date: '2026-06-15' },
        { id: '2', title: 'STEAM Exhibition Day', content: 'Students showcased amazing science, technology, engineering, arts, and math projects at our annual exhibition.', date: '2026-05-20' }
      ],
      announcements: [
        { id: '1', title: 'Resumption for Third Term', content: 'Third term begins on Monday, May 11th, 2026. All pupils are expected to be in full uniform.', date: '2026-05-08' }
      ]
    };
  },
  update: async (payload: any) => {
    // Merge onto existing content rather than replacing it wholesale, so a
    // partial payload can never silently wipe out the rest of the CMS data.
    const { data: existing } = await supabase
      .from('cms_content')
      .select('content')
      .eq('id', 'landing_cms')
      .maybeSingle();
    const mergedContent = { ...(existing?.content ?? {}), ...payload };
    const { error } = await supabase.from('cms_content').upsert({ id: 'landing_cms', content: mergedContent });
    if (error) throw error;
    return mergedContent;
  },
  // Real last-modified time for the CMS content, for the sitemap's
  // <lastmod>. Falls back to null if migration 0014 (which adds this
  // column) hasn't been applied yet -- callers should fall back to
  // something reasonable (e.g. the current time) in that case.
  getLastModified: async (): Promise<Date | null> => {
    try {
      const { data, error } = await supabase.from('cms_content').select('updated_at').eq('id', 'landing_cms').maybeSingle();
      if (error || !data?.updated_at) return null;
      return new Date(data.updated_at);
    } catch {
      return null;
    }
  }
};

export const Activities = {
  list: async () => {
    return (await supabase.from('activities').select('*')).data?.map(mapActivityFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    const { error } = await supabase.from('activities').insert(rows.map(mapActivityToDb));
    if (error) throw error;
    return rows[0];
  },
  update: async (id: string, row: any) => {
    const { error } = await supabase.from('activities').update(mapActivityToDb(row)).eq('id', id);
    if (error) throw error;
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) throw error;
  },
};

export const Subjects = {
  list: async () => {
    return (await supabase.from('subjects').select('*')).data?.map(mapSubjectFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    const { error } = await supabase.from('subjects').insert(rows.map(mapSubjectToDb));
    if (error) throw error;
    return rows[0];
  },
  update: async (id: string, row: any) => {
    const { error } = await supabase.from('subjects').update(mapSubjectToDb(row)).eq('id', id);
    if (error) throw error;
  },
  remove: async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) throw error;
  },
  replace: async (rows: any[]) => replaceAll('subjects', rows.map(mapSubjectToDb), 'id'),
};

export const ClassesSubjects = {
  list: async () => {
    return (await supabase.from('classes_subjects').select('*')).data?.map(mapClassesSubjectsFromDb) ?? [];
  },
  replace: async (rows: any[]) => {
    // Synchronize classes table first to satisfy the classes_subjects foreign key constraint.
    const classesToUpsert = rows.map((c) => ({
      class_id: c.classId,
      stage: c.stage ?? 'Primary',
    }));
    if (classesToUpsert.length > 0) {
      const { error: classErr } = await supabase.from('classes').upsert(classesToUpsert, { onConflict: 'class_id' });
      if (classErr) throw classErr;
    }
    
    // Replace in classes_subjects
    await replaceAll('classes_subjects', rows.map(mapClassesSubjectsToDb), 'class_id');

    // Clean up classes table
    const classIds = rows.map((r) => r.classId);
    if (classIds.length > 0) {
      await supabase.from('classes').delete().not('class_id', 'in', `(${classIds.map((i) => `"${String(i).replace(/"/g, '\\"')}"`).join(',')})`);
    } else {
      await supabase.from('classes').delete().neq('class_id', '__never__');
    }

    // Immediately trigger subject sync for students and teachers
    await runDataMigrations();
  },
};

export const StaffAdmins = {
  list: async () => {
    return (await supabase.from('staff_admins').select('*')).data?.map(mapStaffAdminFromDb) ?? [];
  },
  insert: async (rows: any[]) => {
    return await Promise.all(
      rows.map(async (s) => {
        const auth = await ensureAppUserExists({
          email: s.email,
          role: 'SCHOOL_ADMIN',
          fullName: s.fullName,
          teacherData: { department: s.department },
        });
        const { data, error } = await supabase.from('staff_admins').select('*').eq('user_id', auth.id).maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Staff admin profile was not created.');
        return mapStaffAdminFromDb(data);
      })
    );
  },
  update: async (userId: string, row: any) => {
    const auth = await ensureAppUserExists({
      email: row.email,
      role: 'SCHOOL_ADMIN',
      fullName: row.fullName,
      teacherData: { department: row.department },
    });
    const { error } = await supabase.from('staff_admins').update({ ...mapStaffAdminToDb(row), user_id: auth.id }).eq('user_id', userId);
    if (error) throw error;
  },
  remove: async (userId: string) => {
    const { error: staffErr } = await supabase.from('staff_admins').delete().eq('user_id', userId);
    if (staffErr) throw staffErr;

    const { error: userErr } = await supabase.from('users').delete().eq('id', userId);
    if (userErr) throw userErr;

    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (authErr) {
      console.error('Failed to delete staff admin auth user:', authErr);
    }
  },
};

export async function runDataMigrations() {
  console.log('[Data Migration] Starting data migration process...');
  try {
    // 1. Ensure 'global' configurations row exists
    const { data: globalConfig } = await supabase.from('configurations').select('*').eq('id', 'global').maybeSingle();
    if (!globalConfig) {
      console.log('[Data Migration] Global configurations row not found. Seeding default global configurations...');
      const defaultScale = [
        { grade: 'A', minScore: 75, remark: 'Excellent' },
        { grade: 'B', minScore: 65, remark: 'Very Good' },
        { grade: 'C', minScore: 50, remark: 'Good' },
        { grade: 'P', minScore: 40, remark: 'Pass' },
        { grade: 'F', minScore: 0, remark: 'Fail' }
      ];
      const { error: seedErr } = await supabase.from('configurations').insert({
        id: 'global',
        current_term: 'First Term',
        current_session_id: '2025/2026',
        grading_scale: defaultScale as any,
        ca_test_max: 20,
        ca_assignment_max: 20,
        exam_max: 60,
        school_name: 'SOUTHGOLD MONTESSORI SCHOOL'
      });
      if (seedErr) {
        console.error('[Data Migration] Failed to seed default global configurations:', seedErr);
      } else {
        console.log('[Data Migration] Seeded default global configurations successfully.');
      }
    }

    // 2. Fetch classes_subjects mappings
    const { data: classSubjectsRaw } = await supabase.from('classes_subjects').select('*');
    const classSubjectsMap = new Map<string, string[]>();
    if (classSubjectsRaw) {
      for (const row of classSubjectsRaw) {
        const classId = row.class_id;
        const subjects = Array.isArray(row.subjects) ? row.subjects : [];
        classSubjectsMap.set(classId, subjects);
      }
    }

    // 3. Migrate and Sync student subjects
    const { data: studentsRaw } = await supabase.from('students').select('id, class_id, subjects');
    if (studentsRaw) {
      let syncedStudentsCount = 0;
      for (const student of studentsRaw) {
        const classId = student.class_id;
        const currentSubjects = Array.isArray(student.subjects) ? student.subjects : [];
        
        if (classId) {
          const blueprintSubjects = classSubjectsMap.get(classId) || [];
          const isSynced = currentSubjects.length === blueprintSubjects.length &&
            currentSubjects.every(s => blueprintSubjects.includes(s));
          
          if (!isSynced) {
            const { error: updateErr } = await supabase.from('students').update({
              subjects: blueprintSubjects
            }).eq('id', student.id);
            if (updateErr) {
              console.error(`[Data Migration] Failed to sync subjects for student ${student.id}:`, updateErr);
            } else {
              syncedStudentsCount++;
            }
          }
        }
      }
      if (syncedStudentsCount > 0) {
        console.log(`[Data Migration] Successfully synced subjects for ${syncedStudentsCount} students.`);
      }
    }

    // 4. Migrate and Sync teacher subjects based on assigned classes
    const { data: teachersRaw } = await supabase.from('teachers').select('id, classes_assigned');
    if (teachersRaw) {
      let syncedTeachersCount = 0;
      for (const teacher of teachersRaw) {
        const currentAssignments = Array.isArray(teacher.classes_assigned) ? teacher.classes_assigned : [];
        if (currentAssignments.length > 0) {
          const uniqueClasses = Array.from(new Set(currentAssignments.map((ca: any) => ca.classId || ca.class_id).filter(Boolean))) as string[];
          
          let updatedAssignments: any[] = [];
          const nonSubjectAssignments = currentAssignments.filter((ca: any) => {
            const subId = ca.subjectId || ca.subject_id;
            return subId === 'general_admin';
          }).map((ca: any) => ({
            classId: ca.classId || ca.class_id,
            arm: ca.arm || 'A',
            subjectId: 'general_admin'
          }));

          const subjectAssignments: any[] = [];
          for (const classId of uniqueClasses) {
            const blueprintSubjects = classSubjectsMap.get(classId) || [];
            for (const subId of blueprintSubjects) {
              subjectAssignments.push({
                classId,
                arm: 'A',
                subjectId: subId
              });
            }
          }

          const combinedAssignments = [...nonSubjectAssignments, ...subjectAssignments];
          const uniqueCombined: any[] = [];
          const seen = new Set<string>();
          for (const ca of combinedAssignments) {
            const key = `${ca.classId}-${ca.arm}-${ca.subjectId}`;
            if (!seen.has(key)) {
              seen.add(key);
              uniqueCombined.push(ca);
            }
          }

          const lengthDiffers = currentAssignments.length !== uniqueCombined.length;
          let contentDiffers = false;
          if (!lengthDiffers) {
            contentDiffers = !currentAssignments.every((curr: any) => {
              const currCId = curr.classId || curr.class_id;
              const currSId = curr.subjectId || curr.subject_id;
              const currArm = curr.arm || 'A';
              return uniqueCombined.some((u: any) => u.classId === currCId && u.subjectId === currSId && u.arm === currArm);
            });
          }

          if (lengthDiffers || contentDiffers) {
            const { error: updateErr } = await supabase.from('teachers').update({
              classes_assigned: uniqueCombined
            }).eq('id', teacher.id);
            if (updateErr) {
              console.error(`[Data Migration] Failed to sync assignments for teacher ${teacher.id}:`, updateErr);
            } else {
              syncedTeachersCount++;
            }
          }
        }
      }
      if (syncedTeachersCount > 0) {
        console.log(`[Data Migration] Successfully synced subject assignments for ${syncedTeachersCount} teachers.`);
      }
    }

    // 5. Synchronize into student_subjects table for normalized subject loading
    const { data: latestStudents } = await supabase.from('students').select('id, class_id, subjects');
    if (latestStudents) {
      await supabase.from('student_subjects').delete().neq('student_id', '');
      const ssToInsert: any[] = [];
      for (const student of latestStudents) {
        const subjects = Array.isArray(student.subjects) ? student.subjects : [];
        for (const subId of subjects) {
          ssToInsert.push({
            student_id: student.id,
            subject_id: subId
          });
        }
      }
      if (ssToInsert.length > 0) {
        const { error: ssErr } = await supabase.from('student_subjects').insert(ssToInsert);
        if (ssErr) {
          console.error('[Data Migration] Error inserting into student_subjects:', ssErr);
        } else {
          console.log(`[Data Migration] Successfully synchronized ${ssToInsert.length} records into student_subjects.`);
        }
      }
    }

    // 6. Synchronize into teacher_subjects table for normalized teacher subject loading
    const { data: latestTeachers } = await supabase.from('teachers').select('id, classes_assigned');
    if (latestTeachers) {
      await supabase.from('teacher_subjects').delete().neq('teacher_id', '');
      const tsToInsert: any[] = [];
      for (const teacher of latestTeachers) {
        const currentAssignments = Array.isArray(teacher.classes_assigned) ? teacher.classes_assigned : [];
        for (const assignment of currentAssignments) {
          const classId = assignment.classId || assignment.class_id;
          const subjectId = assignment.subjectId || assignment.subject_id;
          if (classId && subjectId && subjectId !== 'general_admin') {
            tsToInsert.push({
              teacher_id: teacher.id,
              subject_id: subjectId,
              class_id: classId
            });
          }
        }
      }
      if (tsToInsert.length > 0) {
        const uniqueClassIds = Array.from(new Set(tsToInsert.map(x => x.class_id)));
        const getDetectedStage = (classId: string): 'Pre-School' | 'Primary' | 'Secondary' => {
          const norm = classId.toLowerCase();
          if (norm.includes('nursery') || norm.includes('preschool') || norm.includes('pre-school') || norm.includes('toddler') || norm.includes('creche') || norm.includes('kindergarten') || norm.includes('reception')) {
            return 'Pre-School';
          }
          if (norm.includes('secondary') || norm.includes('jss') || norm.includes('sss') || norm.includes('high') || norm.includes('college')) {
            return 'Secondary';
          }
          return 'Primary';
        };
        const classesRows = uniqueClassIds.map(id => ({ class_id: id, stage: getDetectedStage(id) }));
        await supabase.from('classes').upsert(classesRows, { onConflict: 'class_id' });

        const { error: tsErr } = await supabase.from('teacher_subjects').insert(tsToInsert);
        if (tsErr) {
          console.error('[Data Migration] Error inserting into teacher_subjects:', tsErr);
        } else {
          console.log(`[Data Migration] Successfully synchronized ${tsToInsert.length} records into teacher_subjects.`);
        }
      }
    }

    console.log('[Data Migration] Data migrations check completed successfully.');
  } catch (e: any) {
    console.error('[Data Migration] Critical error during data migration:', e);
  }
}
