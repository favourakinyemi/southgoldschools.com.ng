import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';

import * as repo from './src/server/repo';
import { authenticate, login, createAppUser, resetPasswordToDefault, setUserStatus, ensureSuperAdmin, changePassword } from './src/server/auth';
import { SUPABASE_CONFIGURED, supabase } from './src/server/db';
import { runMigrations } from './src/db/migrate';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Populate req.user when a valid Bearer token is supplied via headers or cookie
app.use(async (req: any, res: any, next: any) => {
  let token = req.headers.authorization;
  if (!token && req.headers.cookie) {
    const rawCookies = req.headers.cookie.split(';');
    const tokenCookie = rawCookies.find((c: string) => c.trim().startsWith('sb-access-token='));
    if (tokenCookie) {
      token = 'Bearer ' + tokenCookie.split('=')[1].trim();
    }
  }

  if (token) {
    try {
      req.user = await authenticate(token);
    } catch {
      req.user = null;
    }
  }
  next();
});

function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient privileges' });
    }
    next();
  };
}

// ---------------- Lazy SMTP Email Transporter ----------------
let mailTransporter: any = null;

async function sendAdmissionsEmail(data: { name: string; email: string; subject: string; message: string }) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`[Email Service] Attempting email dispatch for: ${data.name}`);

  if (!user || !pass) {
    console.warn(`[Email Service] SMTP credentials (SMTP_USER/SMTP_PASS) are not set. Ticket email skipped.`);
    return { success: false, reason: 'SMTP credentials missing' };
  }

  try {
    if (!mailTransporter) {
      mailTransporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
      });
    }

    const htmlContent = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 25px;">
          <h2 style="color: #1e293b; margin: 0 0 5px 0; font-size: 20px; font-weight: 800;">SOUTHGOLD MONTESSORI SCHOOL</h2>
          <p style="color: #f59e0b; margin: 0; font-size: 11px; font-weight: bold; text-transform: uppercase;">Admissions & Academic Inquiry Desk</p>
        </div>
        <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569;"><strong>Sender Name:</strong> ${data.name}</p>
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #475569;"><strong>Email Address:</strong> <a href="mailto:${data.email}" style="color: #2563eb;">${data.email}</a></p>
          <p style="margin: 2px 0 0 0; font-size: 13px; color: #475569;"><strong>Subject:</strong> ${data.subject}</p>
        </div>
        <div style="margin-bottom: 30px;">
          <h3 style="color: #0f172a; font-size: 13px; font-weight: bold; margin-bottom: 12px; text-transform: uppercase;">Inquiry Message:</h3>
          <div style="color: #334155; font-size: 15px; line-height: 1.6; background-color: #ffffff; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; white-space: pre-wrap;">${data.message}</div>
        </div>
        <div style="text-align: center; margin-bottom: 30px;">
          <a href="mailto:${data.email}?subject=Re: ${encodeURI(data.subject)}" style="background-color: #1e293b; color: #ffffff; padding: 12px 28px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 14px;">Reply Directly to Parent</a>
        </div>
        <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; font-size: 11px; color: #94a3b8;">
          <p style="margin: 0 0 5px 0;">This inquiry was routed in real-time through the SouthGold School Portal.</p>
          <p style="margin: 0;">© 2026 SouthGold Montessori School. Lekki-Ajah, Lagos, Nigeria.</p>
        </div>
      </div>`;

    const info = await mailTransporter.sendMail({
      from: `"${data.name} via SouthGold Portal" <${user}>`,
      to: 'southgoldmontessorischools@gmail.com',
      replyTo: data.email,
      subject: `[Academic/Admissions Inquiry] ${data.subject}`,
      html: htmlContent,
      text: `Academic inquiry from: ${data.name}\nEmail: ${data.email}\nSubject: ${data.subject}\n\nMessage:\n${data.message}`,
    });

    console.log(`[Email Service] Successful dispatch. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[Email Service] Failed dispatch. Error:`, error);
    return { success: false, error: error.message };
  }
}

// ---------------- Health & DB snapshot ----------------
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', supabase: SUPABASE_CONFIGURED, time: new Date() });
});

app.get('/api/db', async (req: any, res) => {
  try {
    const db = await repo.getDbSnapshot(req.user);
    res.json(db);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to send structured, actionable errors to the frontend
function sendStructuredError(res: any, error: any) {
  const isValidationError = error.isValidationError;
  const statusCode = isValidationError || error.sqlState === '23505' ? 422 : 500;
  
  res.status(statusCode).json({
    error: error.message || 'An error occurred during the request.',
    structuredError: {
      errorType: error.errorType || 'UNKNOWN_ERROR',
      rootCause: error.rootCause || error.message || 'An unexpected error occurred.',
      table: error.table || 'unknown',
      column: error.column || 'unknown',
      constraint: error.constraint || 'unknown',
      repositoryMethod: error.repositoryMethod || 'unknown',
      sqlState: error.sqlState || 'unknown',
      suggestedResolution: error.suggestedResolution || 'Please review your inputs and try again.',
      originalError: error.originalError ? String(error.originalError) : undefined
    }
  });
}

// ---------------- Students ----------------
app.get('/api/students', async (req, res) => {
  try { res.json(await repo.Students.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/students', async (req, res) => {
  try {
    const s = req.body;
    if (!s.id) s.id = `std_${Date.now()}`;
    await repo.Students.insert([s]);
    res.status(201).json(s);
  } catch (e: any) { sendStructuredError(res, e); }
});
app.put('/api/students', async (req, res) => {
  try { await repo.Students.replace(req.body); res.json({ success: true }); } catch (e: any) { sendStructuredError(res, e); }
});
app.put('/api/students/:id', async (req, res) => {
  try { await repo.Students.update(req.params.id, req.body); res.json({ success: true }); } catch (e: any) { sendStructuredError(res, e); }
});
app.delete('/api/students/:id', async (req, res) => {
  try { await repo.Students.remove(req.params.id); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Parents ----------------
app.get('/api/parents', async (req, res) => {
  try { res.json(await repo.Parents.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/parents', async (req, res) => {
  try {
    const p = req.body;
    if (!p.id) p.id = `par_${Date.now()}`;
    await repo.Parents.insert([p]);
    res.status(201).json(p);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/parents/:id', async (req, res) => {
  try { await repo.Parents.update(req.params.id, req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/parents/:id', async (req, res) => {
  try { await repo.Parents.remove(req.params.id); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Staff Admins ----------------
app.get('/api/staff-admins', requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
  try { res.json(await repo.StaffAdmins.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/staff-admins', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const s = req.body;
    const inserted = await repo.StaffAdmins.insert([s]);
    res.status(201).json(inserted[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/staff-admins/:userId', requireRole('SUPER_ADMIN'), async (req, res) => {
  try { await repo.StaffAdmins.update(req.params.userId, req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/staff-admins/:userId', requireRole('SUPER_ADMIN'), async (req, res) => {
  try { await repo.StaffAdmins.remove(req.params.userId); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Teachers ----------------
app.get('/api/teachers', async (req, res) => {
  try { res.json(await repo.Teachers.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/teachers', async (req, res) => {
  try {
    const t = req.body;
    if (!t.id) t.id = `tch_${Date.now()}`;
    await repo.Teachers.insert([t]);
    res.status(201).json(t);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/teachers', async (req, res) => {
  try { await repo.Teachers.replace(req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/teachers/:id', async (req, res) => {
  try { await repo.Teachers.update(req.params.id, req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/teachers/:id', async (req, res) => {
  try { await repo.Teachers.remove(req.params.id); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Results ----------------
app.get('/api/results', async (req, res) => {
  try { res.json(await repo.Results.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/results', async (req, res) => {
  try {
    const r = req.body;
    if (!r.id) r.id = `res_${Date.now()}`;
    await repo.Results.insert([r]);
    res.status(201).json(r);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/results', async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    await repo.Results.upsert(rows);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/results/:id', async (req, res) => {
  try { await repo.Results.update(req.params.id, req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Early Years Results ----------------
app.get('/api/early-years/results', async (req, res) => {
  try { res.json(await repo.EarlyYearsResults.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/early-years/results', async (req, res) => {
  try {
    const r = req.body;
    if (!r.id) r.id = `ey_${Date.now()}`;
    await repo.EarlyYearsResults.insert([r]);
    res.status(201).json(r);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/early-years/results', async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    await repo.EarlyYearsResults.upsert(rows);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/early-years/results/:id', async (req, res) => {
  try { await repo.EarlyYearsResults.update(req.params.id, req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Early Years Assessment Items ----------------
app.get('/api/assessment-items', async (req, res) => {
  try { res.json(await repo.AssessmentItems.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/assessment-items', async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : [];
    await repo.AssessmentItems.save(items);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Result Approvals ----------------
app.get('/api/result-approvals', async (req, res) => {
  try { res.json(await repo.ResultApprovals.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/result-approvals', async (req, res) => {
  try {
    const r = req.body;
    await repo.ResultApprovals.upsert([r]);
    res.status(201).json(r);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/result-approvals/:id', async (req, res) => {
  try {
    await repo.ResultApprovals.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/result-approvals/transition', async (req, res) => {
  try {
    const {
      classId,
      session,
      term,
      status,
      headTeacherComment,
      principalComment,
      action,
      actor,
      teacherId,
      comment
    } = req.body;

    const reqId = `${classId}_${session}_${term}`.replace(/\s+/g, '_');
    
    // 1. Fetch current approval request or create default
    let currentReq: any = null;
    const { data: existing } = await supabase.from('result_approval_requests').select('*').eq('id', reqId).maybeSingle();
    if (existing) {
      currentReq = {
        id: existing.id,
        classId: existing.class_id,
        session: existing.session,
        term: existing.term,
        teacherId: existing.teacher_id,
        submissionTime: existing.submission_time,
        status: existing.status,
        headTeacherComment: existing.head_teacher_comment,
        principalComment: existing.principal_comment,
        reviewHistory: typeof existing.review_history === 'string' ? JSON.parse(existing.review_history) : (existing.review_history || []),
      };
    } else {
      currentReq = {
        id: reqId,
        classId,
        session,
        term,
        teacherId: teacherId || 'SYSTEM',
        submissionTime: new Date().toISOString(),
        status: 'PENDING_APPROVAL',
        headTeacherComment: '',
        principalComment: '',
        reviewHistory: []
      };
    }

    // 2. Update status and comments if specified
    currentReq.status = status;
    if (headTeacherComment !== undefined) currentReq.headTeacherComment = headTeacherComment;
    if (principalComment !== undefined) currentReq.principalComment = principalComment;

    // 3. Add to review history
    const historyItem = {
      timestamp: new Date().toISOString(),
      action,
      user: actor || 'Authorized Staff',
      comment: comment || ''
    };
    currentReq.reviewHistory.push(historyItem);

    // 4. Save approval request using repo.ResultApprovals
    await repo.ResultApprovals.upsert([currentReq]);

    // 5. Update all matching individual results in results table!
    const isApprovedVal = (status === 'APPROVED' || status === 'PUBLISHED');
    const { error: resultsErr } = await supabase
      .from('results')
      .update({
        status: status,
        is_approved: isApprovedVal
      })
      .eq('class_id', classId)
      .eq('session', session)
      .eq('term', term);

    if (resultsErr) {
      console.error('[Result Approval] Error updating results table:', resultsErr);
    }

    // 6. Generate backend-driven persistent notifications
    const notificationsToInsert: any[] = [];
    const createNotifObj = (title: string, content: string, role: string, rId: string | null = null) => ({
      id: `not_be_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      content,
      category: 'Academic',
      date: new Date().toISOString().split('T')[0],
      recipientRole: role,
      recipientId: rId,
      isRead: false
    });

    if (status === 'PENDING_APPROVAL') {
      notificationsToInsert.push(createNotifObj(
        'Results Submitted for Review',
        `Teacher ${actor || 'Class Teacher'} has submitted academic sheets for ${classId} (${term}) for approval.`,
        'SCHOOL_ADMIN'
      ));
    } else if (status === 'APPROVED') {
      notificationsToInsert.push(createNotifObj(
        'Results Approved',
        `Academic report sheets for ${classId} (${term}) have been approved by ${actor || 'Admin'} and are awaiting final publication.`,
        'TEACHER',
        teacherId
      ));
    } else if (status === 'REJECTED' || status === 'RETURNED_FOR_CORRECTION') {
      notificationsToInsert.push(createNotifObj(
        'Results Returned for Correction',
        `Academic sheets for ${classId} (${term}) were returned for correction: "${comment || 'Please review and adjust scores.'}"`,
        'TEACHER',
        teacherId
      ));
    } else if (status === 'PUBLISHED') {
      // Notify Teacher
      notificationsToInsert.push(createNotifObj(
        'Results Published',
        `Official terminal report cards for ${classId} (${term}) have been published and are now visible to parents.`,
        'TEACHER',
        teacherId
      ));
      // Notify Parent
      notificationsToInsert.push(createNotifObj(
        'Terminal Report Card Published',
        `Official terminal report cards for ${classId} (${term}) are now available on your parent dashboard.`,
        'PARENT'
      ));
      // Notify Student
      notificationsToInsert.push(createNotifObj(
        'Terminal Report Released',
        `Your academic report card for ${term} has been officially published. Check your grades now!`,
        'STUDENT'
      ));
    }

    if (notificationsToInsert.length > 0) {
      await repo.Notifications.insert(notificationsToInsert);
    }

    res.json({ success: true, request: currentReq });
  } catch (e: any) {
    console.error('[Result Approval] Error during workflow transition:', e);
    res.status(500).json({ error: e.message });
  }
});

// ---------------- Attendance ----------------
app.get('/api/attendance', async (req, res) => {
  try { res.json(await repo.Attendance.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/attendance', async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];
    const processed = records.map((rec: any) => {
      if (!rec.id) rec.id = `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      return rec;
    });
    await repo.Attendance.insert(processed);
    res.status(201).json(processed);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/attendance/batch-delete', async (req, res) => {
  try {
    const ids = Array.isArray(req.body) ? req.body : [req.body];
    if (ids.length > 0) {
      await repo.Attendance.removeMany(ids);
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Notifications ----------------
app.get('/api/notifications', async (req, res) => {
  try { res.json(await repo.Notifications.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/notifications', async (req, res) => {
  try {
    const r = req.body;
    if (!r.id) r.id = `not_${Date.now()}`;
    await repo.Notifications.insert([r]);
    res.status(201).json(r);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/notifications/:id', async (req, res) => {
  try {
    await repo.Notifications.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Tickets ----------------
app.get('/api/tickets', async (req, res) => {
  try { res.json(await repo.Tickets.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/tickets', async (req, res) => {
  try {
    const r = req.body;
    if (!r.id) r.id = `tkt_${Date.now()}`;
    const saved = await repo.Tickets.insert([r]);
    if (r.subject && r.senderEmail) {
      sendAdmissionsEmail({ name: r.senderName || 'Anonymous Parent', email: r.senderEmail, subject: r.subject, message: r.message || '' })
        .then((result) => console.log(result.success ? '[Email] Sent.' : `[Email] Skipped: ${result.reason || 'error'}`))
        .catch((err) => console.error('[Email] Error:', err));
    }
    res.status(201).json(saved);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/tickets/:id', async (req, res) => {
  try { await repo.Tickets.update(req.params.id, req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Sessions ----------------
app.get('/api/sessions', async (req, res) => {
  try { res.json(await repo.Sessions.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/sessions', requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
  try { await repo.Sessions.replace(req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Config ----------------
app.get('/api/config', async (req, res) => {
  try { res.json(await repo.Config.get()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/config', requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
  try { await repo.Config.update(req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Landing Page CMS ----------------
app.get('/api/cms', async (req, res) => {
  try { res.json(await repo.CMS.get()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/cms', requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req, res) => {
  try { const updated = await repo.CMS.update(req.body); res.json({ success: true, data: updated }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- General Base64 File Upload ----------------
app.post('/api/school/upload', requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: any, res) => {
  try {
    const { fileBase64, fileName, folderName } = req.body || {};
    if (!fileBase64) return res.status(400).json({ error: 'fileBase64 payload is required' });

    // Create bucket if not exists
    try {
      await supabase.storage.createBucket('school-assets', { public: true });
    } catch (_) {}

    const matches = fileBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid Base64 image encoding' });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    const folder = folderName || 'cms';
    const uploadName = `${folder}/${Date.now()}_${fileName || 'uploaded_image.png'}`;

    const { error: uploadErr } = await supabase.storage
      .from('school-assets')
      .upload(uploadName, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from('school-assets')
      .getPublicUrl(uploadName);

    res.json({ success: true, publicUrl: urlData.publicUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- Logo Upload & School Settings ----------------
app.post('/api/school/logo', requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: any, res) => {
  let uploadPath = '';
  try {
    const { logoBase64, fileName } = req.body || {};
    if (!logoBase64) return res.status(400).json({ error: 'logoBase64 payload is required' });

    // Create bucket if not exists
    try {
      await supabase.storage.createBucket('school-assets', { public: true });
    } catch (_) {}

    // Parse base64
    const matches = logoBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid Base64 image encoding' });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadName = `logos/${fileName || `school_logo_${Date.now()}.png`}`;
    uploadPath = uploadName;

    const { error: uploadErr } = await supabase.storage
      .from('school-assets')
      .upload(uploadName, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from('school-assets')
      .getPublicUrl(uploadName);

    // Update DB with logo URL
    try {
      const currentConfig = await repo.Config.get();
      const updated = {
        ...currentConfig,
        logoUrl: urlData.publicUrl
      };
      await repo.Config.update(updated);
    } catch (dbErr: any) {
      // Rollback uploaded file if configuration update fails
      try {
        await supabase.storage.from('school-assets').remove([uploadPath]);
      } catch (rollbackErr) {
        console.error('Failed to rollback logo upload:', rollbackErr);
      }
      return res.status(422).json({ error: `Database failed to save logo URL. Upload rolled back. Details: ${dbErr.message}` });
    }

    res.json({ success: true, logoUrl: urlData.publicUrl });
  } catch (e: any) {
    res.status(400).json({ error: `Logo upload failed: ${e.message}` });
  }
});

app.post('/api/school/passport', async (req: any, res) => {
  try {
    const { passportBase64, fileName } = req.body || {};
    if (!passportBase64) return res.status(400).json({ error: 'passportBase64 payload is required' });

    // Create bucket if not exists
    try {
      await supabase.storage.createBucket('school-assets', { public: true });
    } catch (_) {}

    // Parse base64
    const matches = passportBase64.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ error: 'Invalid Base64 image encoding' });
    }
    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadName = `passports/${fileName || `passport_${Date.now()}.png`}`;

    const { error: uploadErr } = await supabase.storage
      .from('school-assets')
      .upload(uploadName, buffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage
      .from('school-assets')
      .getPublicUrl(uploadName);

    res.json({ success: true, publicUrl: urlData.publicUrl });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ---------------- Activities ----------------
app.get('/api/activities', async (req, res) => {
  try { res.json(await repo.Activities.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/activities', async (req, res) => {
  try {
    const r = req.body;
    if (!r.id) r.id = `act_${Date.now()}`;
    const saved = await repo.Activities.insert([r]);
    res.status(201).json(saved);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/activities/:id', async (req, res) => {
  try { await repo.Activities.update(req.params.id, req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/activities/:id', async (req, res) => {
  try { await repo.Activities.remove(req.params.id); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Subjects ----------------
app.get('/api/subjects', async (req, res) => {
  try { res.json(await repo.Subjects.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/subjects', async (req, res) => {
  try {
    const r = req.body;
    if (!r.id) r.id = (r.name || 'sub').toLowerCase().replace(/\s+/g, '_');
    const saved = await repo.Subjects.insert([r]);
    res.status(201).json(saved);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/subjects', async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : [req.body];
    await repo.Subjects.replace(rows);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/subjects/:id', async (req, res) => {
  try { await repo.Subjects.update(req.params.id, req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.delete('/api/subjects/:id', async (req, res) => {
  try { await repo.Subjects.remove(req.params.id); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Classes <-> Subjects ----------------
app.get('/api/classes-subjects', async (req, res) => {
  try { res.json(await repo.ClassesSubjects.list()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});
app.put('/api/classes-subjects', async (req, res) => {
  try { await repo.ClassesSubjects.replace(req.body); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ---------------- Authentication ----------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const result = await login(email, password);
    res.setHeader('Set-Cookie', `sb-access-token=${result.accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
    res.json(result);
  } catch (e: any) { res.status(401).json({ error: e.message }); }
});

app.post('/api/auth/session', async (req, res) => {
  try {
    const { accessToken } = req.body || {};
    if (!accessToken) {
      res.setHeader('Set-Cookie', 'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      return res.json({ success: true });
    }
    res.setHeader('Set-Cookie', `sb-access-token=${accessToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/auth/logout', async (req: any, res) => {
  res.setHeader('Set-Cookie', 'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
  res.json({ success: true });
});

app.get('/api/auth/me', async (req: any, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.user);
});

app.post('/api/auth/super-admin/init', async (req, res) => {
  try { await ensureSuperAdmin(); res.json({ success: true }); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Create Staff Admin / Teacher / Parent / Student accounts.
app.post('/api/auth/users', requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: any, res) => {
  try {
    const { email, password, role, fullName, teacherData, parentData, studentData } = req.body || {};
    if (!email || !role) return res.status(400).json({ error: 'Email and role are required' });

    // Only Super Admin may create Staff Admins.
    if (role === 'SCHOOL_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only the Super Admin can create Staff Admins' });
    }
    // Teachers/Parents/Students cannot create other accounts.
    if (['TEACHER', 'PARENT', 'STUDENT'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient privileges' });
    }

    const pw = role === 'SCHOOL_ADMIN' ? (password || '1234') : (password || '1234');
    const created = await createAppUser({
      email,
      password: pw,
      role,
      fullName,
      canChangePassword: role === 'SCHOOL_ADMIN' ? (req.body.canChangePassword ?? false) : false,
      createdBy: req.user.id,
      teacherData,
      parentData,
      studentData,
    });
    res.status(201).json(created);
  } catch (e: any) { sendStructuredError(res, e); }
});

app.post('/api/auth/reset-password', requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: any, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });
    await resetPasswordToDefault(email, '1234');
    res.json({ success: true, message: 'Password reset to default (1234)' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/set-status', requireRole('SUPER_ADMIN', 'SCHOOL_ADMIN'), async (req: any, res) => {
  try {
    const { email, status } = req.body || {};
    if (!email || !status) return res.status(400).json({ error: 'Email and status are required' });
    if (req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Only the Super Admin can suspend/reactivate users' });
    }
    await setUserStatus(email, status);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/change-password', async (req: any, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Old and new passwords are required' });
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    await changePassword(req.user.id, oldPassword, newPassword);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

app.post('/api/auth/logout', async (req: any, res) => {
  res.json({ success: true });
});

// ---------------- Vite middleware / static serving ----------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });

  // Run on-boot database migrations check
  await runMigrations();

  // Run on-boot custom data migrations check (subjects, teacher assignments, configuration)
  await repo.runDataMigrations();

  // Auto-create the default Super Admin account once the DB is reachable.
  await ensureSuperAdmin();
}

startServer();
