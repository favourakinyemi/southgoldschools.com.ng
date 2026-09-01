import React from 'react';
import { 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  Bell, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Plus, 
  Activity, 
  ArrowRight,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import { Student, Teacher, FeeRecord, AttendanceRecord, SchoolNotification, ResultRecord, Subject } from '../types';
import { cleanAcademicSession, formatTermSession } from '../lib/portalDisplay';

interface DashboardStatsProps {
  currentRole: string;
  students: Student[];
  teachers: Teacher[];
  fees: FeeRecord[];
  attendance: AttendanceRecord[];
  notifications: SchoolNotification[];
  results: ResultRecord[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeTerm: string;
  activeSessionName: string;
  userEmail?: string;
  userId?: string;
  subjects?: Subject[];
}

export default function DashboardStats({
  currentRole,
  students,
  teachers,
  fees,
  attendance,
  notifications,
  results,
  activeTab,
  setActiveTab,
  activeTerm,
  activeSessionName,
  userEmail,
  userId,
  subjects = []
}: DashboardStatsProps) {
  const sessionDisplayName = cleanAcademicSession(activeSessionName, activeTerm) || activeSessionName;
  const termSessionLabel = formatTermSession(activeTerm, activeSessionName);

  // 1. Calculations for Admin Visual Dashboard
  const adminTotalStudents = students.length;
  const adminTotalStaff = teachers.length;
  
  // Overall attendance rate (student percent of Present/Late vs Total for active term)
  const activeTermAttendance = attendance.filter(a => a.session === activeSessionName && a.term === activeTerm && a.entityType === 'Student');
  const studentPresentCount = activeTermAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const adminStudentAttendanceRate = activeTermAttendance.length > 0 
    ? Math.round((studentPresentCount / activeTermAttendance.length) * 100) 
    : null;

  // Grade distributions for charts
  const approvedResults = results.filter(r => r.session === activeSessionName && r.term === activeTerm && r.isApproved);
  const gradeCounts = { A: 0, B: 0, C: 0, P: 0, F: 0 };
  approvedResults.forEach(r => {
    const g = r.grade as keyof typeof gradeCounts;
    if (gradeCounts[g] !== undefined) gradeCounts[g]++;
  });

  // 2. Calculations for Teacher Visual Dashboard
  const teacherProfile = teachers.find(t => t.userId === userId) || teachers[0];
  const assignedClasses = teacherProfile?.classesAssigned ?? [];
  const assignedClassesCount = new Set(assignedClasses.map(c => `${c.classId}${c.arm}`)).size;
  const assignedSubjectIds = [...new Set(assignedClasses.map(c => c.subjectId))];
  const assignedSubjectsList = assignedSubjectIds.length > 0
    ? assignedSubjectIds.map(id => id === 'maths' ? 'Mathematics' : id === 'science' ? 'Basic Science' : id === 'english' ? 'English Studies' : id)
    : [];
  const pendingGradesApprovalCount = results.filter(r => !r.isApproved).length;

  // 3. Parent Dashboard details
  const parentEmail = userEmail || '';
  const registeredChildren = students.filter(s => s.parentEmail === parentEmail);
  const parentTotalBilled = fees.filter(f => registeredChildren.some(rc => rc.id === f.studentId)).reduce((sum, f) => sum + f.amount, 0);
  const parentTotalPaid = fees.filter(f => registeredChildren.some(rc => rc.id === f.studentId)).reduce((sum, f) => sum + f.amountPaid, 0);
  const outstandingParentFees = parentTotalBilled - parentTotalPaid;

  // 4. Student Dashboard details
  const myProfile = students.find(s => s.userId === userId) || students[0];
  const currentStudentId = myProfile?.id || (students[0]?.id || '');
  const myAttendance = attendance.filter(a => a.entityId === currentStudentId && a.session === activeSessionName && a.term === activeTerm);
  const myPresenceRate = myAttendance.length > 0 
    ? Math.round((myAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length / myAttendance.length) * 100)
    : null;

  const mySubjectsCount = myProfile ? myProfile.subjects.length : 0;
  const publishedStudentResults = results.filter(r => r.studentId === currentStudentId && r.status === 'PUBLISHED');

  return (
    <div className="space-y-6">
      
      {/* ----------------- ADMIN DASHBOARD ----------------- */}
      {(currentRole === 'SUPER_ADMIN' || currentRole === 'SCHOOL_ADMIN') && (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-portal-heading dark:text-white tracking-tight">School Overview</h2>
              <p className="mt-1 text-sm text-portal-muted dark:text-slate-400">
                Monitor academics, attendance and school operations for {termSessionLabel}.
              </p>
            </div>
          </div>

          {/* Main Counters Grid Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            
            {/* Box 1 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm flex items-center justify-between min-h-36">
              <div>
                <span className="text-xs font-semibold text-portal-muted dark:text-slate-400">Total Enrolled Pupils</span>
                <h3 className="text-3xl font-extrabold text-portal-heading dark:text-slate-100 mt-2">{adminTotalStudents}</h3>
                <span className="text-xs text-portal-success font-semibold flex items-center mt-2">
                  {sessionDisplayName} Session
                </span>
              </div>
              <div className="p-3 bg-blue-50 text-portal-primary dark:bg-blue-950/25 dark:text-blue-400 rounded-lg">
                <Users size={24} />
              </div>
            </div>

            {/* Box 2 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm flex items-center justify-between min-h-36">
              <div>
                <span className="text-xs font-semibold text-portal-muted dark:text-slate-400">Instructors & Staff</span>
                <h3 className="text-3xl font-extrabold text-portal-heading dark:text-slate-100 mt-2">{adminTotalStaff}</h3>
                <span className="text-xs text-portal-primary dark:text-blue-400 font-semibold flex items-center mt-2">
                  Registered staff records
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 text-portal-success dark:bg-emerald-500/5 dark:text-emerald-400 rounded-lg">
                <GraduationCap size={24} />
              </div>
            </div>

            {/* Box 3 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm flex items-center justify-between min-h-36">
              <div>
                <span className="text-xs font-semibold text-portal-muted dark:text-slate-400">Avg. Attendance Rate</span>
                <h3 className="text-3xl font-extrabold text-portal-heading dark:text-slate-100 mt-2">
                  {adminStudentAttendanceRate === null ? 'No data' : `${adminStudentAttendanceRate}%`}
                </h3>
                {adminStudentAttendanceRate === null ? (
                  <span className="text-xs text-portal-muted dark:text-slate-500 mt-2 block">No student attendance records yet</span>
                ) : (
                  <div className="w-28 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div className="bg-portal-success h-full rounded-full" style={{ width: `${adminStudentAttendanceRate}%` }} />
                  </div>
                )}
              </div>
              <div className="p-3 bg-sky-500/10 text-sky-600 dark:bg-sky-500/5 dark:text-sky-400 rounded-lg">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm flex items-center justify-between min-h-36">
              <div>
                <span className="text-xs font-semibold text-portal-muted dark:text-slate-400">Subjects Offered</span>
                <h3 className="text-3xl font-extrabold text-portal-heading dark:text-slate-100 mt-2">{subjects.length}</h3>
                <span className="text-xs text-portal-primary dark:text-blue-400 font-semibold flex items-center mt-2">
                  Current subject catalog
                </span>
              </div>
              <div className="p-3 bg-amber-500/10 text-portal-gold dark:bg-amber-500/5 rounded-lg">
                <BookOpen size={24} />
              </div>
            </div>

          </div>

          {/* Bento Visual charts & Lists row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Column & Statistics */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-portal-heading dark:text-slate-100 text-base flex items-center gap-2">
                    <BarChart3 size={17} className="text-portal-primary" />
                    <span>Grading Distribution Analysis</span>
                  </h4>
                  <p className="text-portal-muted dark:text-slate-400 text-xs mt-1">Approved result records for {termSessionLabel}</p>
                </div>
                <span className="text-xs font-semibold bg-emerald-500/10 text-portal-success px-2.5 py-1 rounded-md">
                  {approvedResults.length} approved
                </span>
              </div>

              {/* Graphic Score Visual Bars */}
              {approvedResults.length === 0 ? (
                <div className="rounded-lg border border-dashed border-portal-border dark:border-slate-800 bg-portal-elevated dark:bg-slate-950/40 p-8 text-center">
                  <ClipboardList className="mx-auto text-slate-400" size={28} />
                  <p className="mt-3 text-sm font-bold text-portal-heading dark:text-slate-100">No approved results yet</p>
                  <p className="mt-1 text-xs text-portal-muted dark:text-slate-400">Grading distribution will appear after result records are approved for this term.</p>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {[
                    { grade: 'Grade A', range: 'Excellent: 85 - 100', count: gradeCounts.A, color: 'bg-emerald-500' },
                    { grade: 'Grade B', range: 'Very Good: 70 - 84', count: gradeCounts.B, color: 'bg-blue-600' },
                    { grade: 'Grade C', range: 'Credit: 55 - 69', count: gradeCounts.C, color: 'bg-amber-500' },
                    { grade: 'Grade P / Pass', range: '40 - 54', count: gradeCounts.P, color: 'bg-sky-500' },
                    { grade: 'Grade F', range: 'Fail: 0 - 39', count: gradeCounts.F, color: 'bg-rose-500' },
                  ].map((item, idx) => {
                    const actualPct = Math.round((item.count / approvedResults.length) * 100);
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                          <span><span className="font-bold">{item.grade}</span> <span className="text-portal-muted dark:text-slate-500">({item.range})</span></span>
                          <span className="shrink-0">{item.count} ({actualPct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`${item.color} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${actualPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Attendance and Fees Quick Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-portal-success dark:text-emerald-400 mb-1">
                    <CheckCircle size={14} />
                    <span>Notifications</span>
                  </div>
                  <p className="text-xl font-extrabold text-portal-heading dark:text-slate-200">{notifications.length}</p>
                  <span className="text-xs text-portal-muted dark:text-slate-400 block mt-0.5">Published school notices in the current data set.</span>
                </div>
                <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-portal-primary dark:text-blue-400 mb-1">
                    <BookOpen size={14} />
                    <span>Academic Term</span>
                  </div>
                  <p className="text-xl font-extrabold text-portal-heading dark:text-slate-200">{activeTerm}</p>
                  <span className="text-xs text-portal-muted dark:text-slate-400 block mt-0.5">{sessionDisplayName} Session</span>
                </div>
              </div>

            </div>

            {/* Recent activity section */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h4 className="font-bold text-portal-heading dark:text-slate-100 text-base flex items-center gap-2">
                  <Activity size={16} className="text-portal-primary" />
                  <span>Recent Activity</span>
                </h4>
                <p className="text-portal-muted dark:text-slate-400 text-xs mt-1">Operational audit records</p>
              </div>

              <div className="rounded-lg border border-dashed border-portal-border dark:border-slate-800 bg-portal-elevated dark:bg-slate-950/40 p-6 text-center">
                <Activity className="mx-auto text-slate-400" size={24} />
                <p className="mt-3 text-sm font-bold text-portal-heading dark:text-slate-100">No recent activity yet.</p>
                <p className="mt-1 text-xs leading-5 text-portal-muted dark:text-slate-400">
                  No recent activity has been recorded.
                </p>
              </div>

              {/* Admin Quick Action Button Drawer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <p className="text-xs font-bold text-portal-heading dark:text-slate-100">Quick Actions</p>
                <button
                  onClick={() => setActiveTab('students')}
                  className="w-full flex items-center justify-between text-xs bg-portal-elevated hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 hover:text-portal-primary px-3 py-2.5 rounded-md font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Plus size={14} /> Add New Pupil
                  </span>
                  <ArrowRight size={14} />
                </button>
                <button
                  onClick={() => setActiveTab('results')}
                  className="w-full flex items-center justify-between text-xs bg-portal-elevated hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 hover:text-portal-primary px-3 py-2.5 rounded-md font-semibold transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ClipboardList size={14} /> Process Results
                  </span>
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>

          </div>
        </>
      )}

      {/* ----------------- TEACHER PORTAL DASHBOARD ----------------- */}
      {currentRole === 'TEACHER' && (
        <div className="space-y-6">
          <div className="bg-portal-heading text-white p-6 rounded-lg shadow-sm border border-white/10 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1 z-10">
              <p className="text-xs font-semibold text-[#d9b65f]">Teaching Workspace</p>
              <h2 className="text-xl font-extrabold tracking-tight">Welcome back, {teacherProfile ? `${teacherProfile.firstName} ${teacherProfile.lastName}` : 'Teacher'}</h2>
              <p className="text-blue-100 text-sm leading-6 max-w-xl">
                Manage attendance and result processing for your assigned classes in {termSessionLabel}.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 z-10">
              <button
                onClick={() => setActiveTab('attendance')}
                className="bg-white/10 text-white text-xs font-semibold py-2 px-4 rounded-md hover:bg-white/15 transition-colors"
              >
                Mark Attendance
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className="bg-white text-portal-heading text-xs font-semibold py-2 px-4 rounded-md hover:bg-slate-50 shadow-sm transition-colors"
              >
                Enter Scores
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Stat Cards */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm">
              <span className="text-xs text-portal-muted dark:text-slate-400 font-semibold block">Assigned Class Arms</span>
              <h4 className="text-2xl font-extrabold text-portal-heading dark:text-slate-100 mt-2">{assignedClassesCount} Classes</h4>
              <div className="flex items-center gap-1.5 text-xs text-portal-primary dark:text-blue-400 mt-2 font-semibold flex-wrap">
                {assignedClasses.length > 0
                  ? [...new Set(assignedClasses.map(c => `${c.classId} ${c.arm}`))].slice(0, 3).map((cls, i, arr) => (
                      <React.Fragment key={cls}>
                        <span>{cls}</span>
                        {i < arr.length - 1 && <span>•</span>}
                      </React.Fragment>
                    ))
                  : <span>No assigned class arms</span>
                }
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm">
              <span className="text-xs text-portal-muted dark:text-slate-400 font-semibold block">Subjects Entrusted</span>
              <h4 className="text-2xl font-extrabold text-portal-heading dark:text-slate-100 mt-2">{assignedSubjectsList.length} Subjects</h4>
              <p className="text-portal-muted dark:text-slate-400 text-xs mt-2 truncate">
                {assignedSubjectsList.length > 0 ? assignedSubjectsList.join(' and ') : 'No assigned subjects'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm block">
              <span className="text-xs text-portal-muted dark:text-slate-400 font-semibold block">Pending Admin Approval</span>
              <h4 className="text-2xl font-extrabold text-portal-danger mt-2">{pendingGradesApprovalCount} Records</h4>
              <span className="text-xs text-portal-muted dark:text-slate-400 mt-2 block">
                {pendingGradesApprovalCount > 0 ? `${pendingGradesApprovalCount} result${pendingGradesApprovalCount !== 1 ? 's' : ''} awaiting approval` : 'All results approved'}
              </span>
            </div>
          </div>

          {/* Assignment overview */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm">
            <h4 className="font-bold text-base text-portal-heading dark:text-slate-100 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-portal-primary dark:text-blue-400" />
              <span>Assigned Teaching Groups</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedClasses.length > 0 ? (
                assignedClasses.slice(0, 6).map((ac, index) => {
                  return (
                    <div key={index} className="p-4 bg-portal-elevated dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-850">
                      <span className="text-[10px] font-bold text-portal-muted dark:text-slate-400">ASSIGNMENT</span>
                      <p className="font-bold text-sm text-portal-heading dark:text-slate-200 mt-1">
                        {ac.subjectId === 'maths' ? 'Mathematics' : ac.subjectId === 'science' ? 'Basic Science' : ac.subjectId === 'english' ? 'English Studies' : ac.subjectId}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-portal-primary dark:text-blue-400 font-semibold">{ac.classId} {ac.arm}</span>
                        <span className="text-[10px] bg-blue-50 text-portal-primary px-1.5 py-0.5 rounded-md">Assigned</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-4 text-center text-slate-400 text-xs">
                  No teaching schedule found for today.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- PARENT PORTAL DASHBOARD ----------------- */}
      {currentRole === 'PARENT' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-portal-border dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-portal-heading dark:text-slate-100">My Registered Children</h2>
              <p className="text-portal-muted dark:text-slate-400 text-sm mt-1">Viewing registered profiles linked to {parentEmail}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registeredChildren.length === 0 ? (
              <div className="md:col-span-2 rounded-lg border border-dashed border-portal-border dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
                <Users className="mx-auto text-slate-400" size={28} />
                <p className="mt-3 text-sm font-bold text-portal-heading dark:text-slate-100">No linked children found</p>
                <p className="mt-1 text-xs text-portal-muted dark:text-slate-400">Linked student profiles will appear here once the school office connects them to this account.</p>
              </div>
            ) : (
              registeredChildren.map((child) => (
                <div key={child.id} className="bg-white dark:bg-slate-900 border border-portal-border dark:border-slate-800 rounded-lg overflow-hidden shadow-sm hover:border-blue-500/50 transition-colors">
                  <div className="bg-portal-elevated dark:bg-slate-850 p-4 border-b border-slate-150 dark:border-slate-800 flex items-center gap-4">
                    <img 
                      src={child.photo} 
                      alt={child.firstName} 
                      className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-portal-heading dark:text-slate-100">
                        {child.firstName} {child.lastName}
                      </h4>
                      <span className="text-xs text-portal-primary dark:text-blue-400 font-semibold">{child.classId} {child.arm}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md ml-2">
                        Admission: {child.admissionNo}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="pt-1 flex gap-2">
                      <button
                        onClick={() => setActiveTab('results')}
                        className="w-full bg-portal-primary text-white text-xs font-semibold py-2.5 rounded-md shadow-xs hover:bg-portal-primary-hover transition-colors text-center cursor-pointer"
                      >
                        View Report Card
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm">
            <h4 className="font-bold text-base text-portal-heading dark:text-slate-100 mb-3">School Announcements</h4>
            <div className="space-y-3">
              {notifications.filter(n => n.recipientRole === 'ALL' || n.recipientRole === 'PARENT').length === 0 ? (
                <div className="rounded-lg border border-dashed border-portal-border dark:border-slate-800 bg-portal-elevated dark:bg-slate-950/40 p-6 text-center text-xs text-portal-muted dark:text-slate-400">
                  No parent announcements yet.
                </div>
              ) : (
                notifications.filter(n => n.recipientRole === 'ALL' || n.recipientRole === 'PARENT').map((not, idx) => (
                  <button
                    type="button"
                    key={idx}
                    onClick={() => setActiveTab('announcements')}
                    className="w-full text-left bg-portal-elevated dark:bg-slate-950/40 p-3 rounded-lg border border-slate-150 dark:border-slate-850 shadow-2xs flex items-start gap-3 hover:border-blue-500/40 hover:shadow-md transition-all cursor-pointer"
                  >
                    <span className="p-1.5 bg-blue-50 text-portal-primary dark:bg-blue-950/20 dark:text-blue-400 rounded-md">
                      <Bell size={14} />
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-portal-heading dark:text-slate-200">{not.title}</h5>
                      <p className="text-portal-muted text-[11px] mt-0.5">{not.content}</p>
                      <span className="text-[10px] text-slate-400 block mt-1">{not.date}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- STUDENT PORTAL DASHBOARD ----------------- */}
      {currentRole === 'STUDENT' && (
        <div className="space-y-6">
          <div className="bg-portal-heading text-white p-6 rounded-lg flex justify-between items-center relative overflow-hidden shadow-sm">
            <div className="z-10 space-y-1">
              <span className="text-xs bg-white/10 text-[#d9b65f] font-semibold px-2.5 py-1 rounded-md">Student Dashboard</span>
              <h2 className="text-xl font-extrabold tracking-tight">{myProfile ? `${myProfile.firstName} ${myProfile.lastName}` : 'Student'}</h2>
              <p className="text-blue-100 text-sm max-w-md">Class: {myProfile ? `${myProfile.classId} ${myProfile.arm}` : 'N/A'} | Admission No: {myProfile?.admissionNo ?? 'N/A'}</p>
            </div>
            <div className="p-4 bg-white/10 rounded-lg hidden sm:block">
              <GraduationCap className="w-10 h-10 text-[#d9b65f]" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm">
              <h5 className="text-portal-muted dark:text-slate-400 text-xs font-semibold">Subjects Registered</h5>
              <p className="text-2xl font-extrabold text-portal-heading dark:text-slate-200 mt-2">{mySubjectsCount}</p>
              <span className="text-xs text-portal-muted dark:text-slate-400 mt-2 block">
                {myProfile && myProfile.subjects.length > 0 ? `${myProfile.subjects.slice(0, 3).join(', ')}${myProfile.subjects.length > 3 ? '...' : ''}` : 'No subject registrations found'}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm">
              <h5 className="text-portal-muted dark:text-slate-400 text-xs font-semibold">Attendance Rate</h5>
              <p className="text-2xl font-extrabold text-portal-success mt-2">{myPresenceRate === null ? 'No data' : `${myPresenceRate}%`}</p>
              {myPresenceRate === null ? (
                <span className="text-xs text-portal-muted dark:text-slate-400 mt-2 block">No attendance records for this term</span>
              ) : (
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div className="bg-portal-success h-full rounded-full" style={{ width: `${myPresenceRate}%` }} />
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm">
              <h5 className="text-portal-muted dark:text-slate-400 text-xs font-semibold">Published Results</h5>
              <p className="text-2xl font-extrabold text-portal-primary mt-2">{publishedStudentResults.length}</p>
              <span className="text-xs text-portal-muted dark:text-slate-400 mt-2 block">Approved report records available to view</span>
            </div>
          </div>

          {/* Quick Grades alert */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-lg border border-portal-border dark:border-slate-800 shadow-sm">
            <h4 className="font-bold text-base text-portal-heading dark:text-slate-100 mb-3 block">My Approved Report Cards</h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {publishedStudentResults.length === 0 ? (
                <div className="rounded-lg border border-dashed border-portal-border dark:border-slate-800 bg-portal-elevated dark:bg-slate-950/40 p-6 text-center text-xs text-portal-muted dark:text-slate-400">
                  No published results yet.
                </div>
              ) : publishedStudentResults.map((res, idx) => {
                const subName = subjects.find(s => s.id === res.subjectId)?.name || 
                                (res.subjectId === 'maths' ? 'Mathematics' : 
                                 res.subjectId === 'english' ? 'English Studies' : 
                                 res.subjectId === 'science' ? 'Basic Science' : res.subjectId);
                return (
                  <div key={idx} className="py-2.5 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 capitalize">
                        {subName}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">{res.term} ({res.session})</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 font-medium">Total: {res.totalScore}/100</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                        res.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                        res.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                        res.grade === 'C' ? 'bg-amber-100 text-amber-800' :
                        res.grade === 'P' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {res.grade}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
