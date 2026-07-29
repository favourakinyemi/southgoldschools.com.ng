import fs from 'fs';
import path from 'path';
import { supabase } from '../src/server/db';

// ============================================================================
// One-time migration: db.json  ->  Supabase PostgreSQL
// - Preserves all existing IDs (onConflict upserts).
// - Synthesizes parent records from students' parentEmail and links them.
// - Idempotent: safe to run multiple times.
// Run with:  npm run migrate
// ============================================================================

const DB_FILE = path.join(process.cwd(), 'db.json');

async function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.log('No db.json found. Nothing to migrate.');
    return;
  }
  const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  console.log('Loaded db.json. Beginning migration...');

  // ---- subjects ----
  if (db.subjects?.length) {
    await supabase.from('subjects').upsert(db.subjects.map((s: any) => ({ id: s.id, name: s.name, code: s.code })), { onConflict: 'id' });
    console.log(`subjects: ${db.subjects.length}`);
  }

  // ---- classes + classes_subjects ----
  const classIds = new Set<string>();
  (db.classesWithSubjects || []).forEach((c: any) => classIds.add(c.classId));
  (db.students || []).forEach((s: any) => s.classId && classIds.add(s.classId));
  const classesRows = [...classIds].map((cid) => {
    const cws = (db.classesWithSubjects || []).find((c: any) => c.classId === cid);
    return { class_id: cid, stage: cws?.stage ?? null };
  });
  if (classesRows.length) {
    await supabase.from('classes').upsert(classesRows, { onConflict: 'class_id' });
    console.log(`classes: ${classesRows.length}`);
  }
  if (db.classesWithSubjects?.length) {
    await supabase.from('classes_subjects').upsert(
      db.classesWithSubjects.map((c: any) => ({ class_id: c.classId, subjects: c.subjects || [], stage: c.stage ?? null })),
      { onConflict: 'class_id' }
    );
    console.log(`classes_subjects: ${db.classesWithSubjects.length}`);
  }

  // ---- sessions ----
  if (db.sessions?.length) {
    await supabase.from('sessions').upsert(
      db.sessions.map((s: any) => ({ id: s.id, name: s.name, is_active: s.isActive, start_date: s.startDate, end_date: s.endDate })),
      { onConflict: 'id' }
    );
    console.log(`sessions: ${db.sessions.length}`);
  }

  // ---- activities ----
  if (db.activities?.length) {
    await supabase.from('activities').upsert(
      db.activities.map((a: any) => ({ id: a.id, title: a.title, badge: a.badge, description: a.desc, img_url: a.imgUrl, footer: a.footer })),
      { onConflict: 'id' }
    );
    console.log(`activities: ${db.activities.length}`);
  }

  // ---- config (single global row) ----
  if (db.config) {
    const c = db.config;
    await supabase.from('configurations').upsert({
      id: 'global',
      current_term: c.currentTerm,
      current_session_id: c.currentSessionId,
      resumption_date: c.resumptionDate,
      closing_date: c.closingDate,
      grading_scale: c.gradingScale || [],
      ca_test_max: c.caTestMax ?? 20,
      ca_assignment_max: c.caAssignmentMax ?? 20,
      exam_max: c.examMax ?? 60,
    });
    console.log('configurations: 1');
  }

  // ---- parents (synthesized from students' parentEmail) ----
  const parentByEmail = new Map<string, any>();
  let parentCounter = 1;
  for (const s of db.students || []) {
    if (s.parentEmail && !parentByEmail.has(s.parentEmail)) {
      parentByEmail.set(s.parentEmail, {
        id: `par_${parentCounter++}`,
        first_name: (s.parentName || s.parentEmail).split(' ')[0],
        last_name: (s.parentName || '').split(' ').slice(1).join(' ') || '',
        email: s.parentEmail,
        phone: s.parentPhone ?? null,
        address: null,
        status: 'Active',
      });
    }
  }
  if (parentByEmail.size) {
    await supabase.from('parents').upsert([...parentByEmail.values()], { onConflict: 'id' });
    console.log(`parents (synthesized): ${parentByEmail.size}`);
  }

  // ---- students ----
  if (db.students?.length) {
    await supabase.from('students').upsert(
      db.students.map((s: any) => ({
        id: s.id,
        admission_no: s.admissionNo,
        first_name: s.firstName,
        last_name: s.lastName,
        photo: s.photo ?? null,
        gender: s.gender ?? null,
        date_of_birth: s.dateOfBirth ?? null,
        parent_id: s.parentEmail ? parentByEmail.get(s.parentEmail)?.id : null,
        parent_name: s.parentName ?? null,
        parent_email: s.parentEmail ?? null,
        parent_phone: s.parentPhone ?? null,
        class_id: s.classId ?? null,
        arm: s.arm ?? 'A',
        status: s.status ?? 'Active',
        subjects: s.subjects ?? [],
      })),
      { onConflict: 'id' }
    );
    console.log(`students: ${db.students.length}`);
  }

  // ---- teachers ----
  if (db.teachers?.length) {
    await supabase.from('teachers').upsert(
      db.teachers.map((t: any) => ({
        id: t.id,
        staff_id: t.staffId ?? null,
        first_name: t.firstName,
        last_name: t.lastName ?? null,
        email: t.email ?? null,
        phone: t.phone ?? null,
        department: t.department ?? null,
        status: t.status ?? 'Active',
        classes_assigned: t.classesAssigned ?? [],
      })),
      { onConflict: 'id' }
    );
    console.log(`teachers: ${db.teachers.length}`);
  }

  // ---- results ----
  if (db.results?.length) {
    await supabase.from('results').upsert(
      db.results.map((r: any) => ({
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
        teacher_remark: r.teacherRemark ?? null,
        is_approved: r.isApproved ?? false,
      })),
      { onConflict: 'id' }
    );
    console.log(`results: ${db.results.length}`);
  }

  // ---- attendance ----
  if (db.attendance?.length) {
    await supabase.from('attendance').upsert(
      db.attendance.map((a: any) => ({
        id: a.id,
        date: a.date,
        entity_id: a.entityId,
        entity_type: a.entityType,
        status: a.status,
        remark: a.remark ?? null,
        session: a.session ?? null,
        term: a.term ?? null,
      })),
      { onConflict: 'id' }
    );
    console.log(`attendance: ${db.attendance.length}`);
  }

  // ---- fees ----
  if (db.fees?.length) {
    await supabase.from('fees').upsert(
      db.fees.map((f: any) => ({
        id: f.id,
        student_id: f.studentId,
        title: f.title,
        amount: f.amount,
        amount_paid: f.amountPaid,
        status: f.status,
        due_date: f.dueDate,
        transaction_history: f.transactionHistory ?? [],
      })),
      { onConflict: 'id' }
    );
    console.log(`fees: ${db.fees.length}`);
  }

  // ---- notifications ----
  if (db.notifications?.length) {
    await supabase.from('notifications').upsert(
      db.notifications.map((n: any) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        date: n.date,
        recipient_role: n.recipientRole,
      })),
      { onConflict: 'id' }
    );
    console.log(`notifications: ${db.notifications.length}`);
  }

  // ---- tickets ----
  if (db.tickets?.length) {
    await supabase.from('tickets').upsert(
      db.tickets.map((t: any) => ({
        id: t.id,
        sender_name: t.senderName,
        sender_email: t.senderEmail,
        sender_role: t.senderRole,
        subject: t.subject,
        message: t.message,
        status: t.status,
        created_at: t.createdAt,
        replies: t.replies ?? [],
      })),
      { onConflict: 'id' }
    );
    console.log(`tickets: ${db.tickets.length}`);
  }

  console.log('Migration complete. Verify counts in the Supabase dashboard.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
