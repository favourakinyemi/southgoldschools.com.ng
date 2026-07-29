import React from 'react';
import { 
  Users, 
  GraduationCap, 
  CalendarCheck, 
  DollarSign, 
  TrendingUp, 
  Bell, 
  CheckCircle, 
  UserX, 
  Clock, 
  BookOpen, 
  Plus, 
  MessageSquare, 
  Activity, 
  AlertTriangle 
} from 'lucide-react';
import { Student, Teacher, FeeRecord, AttendanceRecord, SchoolNotification, ResultRecord, Subject } from '../types';

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

  // 1. Calculations for Admin Visual Dashboard
  const adminTotalStudents = students.length;
  const adminTotalStaff = teachers.length;
  
  // Overall attendance rate (student percent of Present/Late vs Total for active term)
  const activeTermAttendance = attendance.filter(a => a.session === activeSessionName && a.term === activeTerm && a.entityType === 'Student');
  const studentPresentCount = activeTermAttendance.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const adminStudentAttendanceRate = activeTermAttendance.length > 0 
    ? Math.round((studentPresentCount / activeTermAttendance.length) * 100) 
    : 92; // default high-perf primary school fallback score

  // Fees details
  const totalBilledFees = fees.reduce((sum, f) => sum + f.amount, 0);
  const totalCollectedFees = fees.reduce((sum, f) => sum + f.amountPaid, 0);
  const collectionsRate = totalBilledFees > 0 ? Math.round((totalCollectedFees / totalBilledFees) * 100) : 0;
  const pendingFeesBalance = totalBilledFees - totalCollectedFees;

  // Grade distributions for charts
  const approvedResults = results.filter(r => r.session === activeSessionName && r.term === activeTerm && r.isApproved);
  const gradeCounts = { A: 0, B: 0, C: 0, P: 0, F: 0 };
  approvedResults.forEach(r => {
    const g = r.grade as keyof typeof gradeCounts;
    if (gradeCounts[g] !== undefined) gradeCounts[g]++;
  });

  // Recent actions
  const recentActivities = [
    { text: 'Teacher entered Third Term Science test scores', time: '10 mins ago', type: 'academic' },
    { text: 'Parent submitted feedback on terminal report', time: '1 hour ago', type: 'academic' },
    { text: 'Admin approved results publication', time: '2 hours ago', type: 'security' },
    { text: 'New student details uploaded', time: 'Yesterday', type: 'onboarding' },
  ];

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
    : 95;

  const mySubjectsCount = myProfile ? myProfile.subjects.length : 4;

  return (
    <div className="space-y-6">
      
      {/* ----------------- ADMIN DASHBOARD ----------------- */}
      {(currentRole === 'SUPER_ADMIN' || currentRole === 'SCHOOL_ADMIN') && (
        <>
          {/* Main Counters Grid Header */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* Box 1 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Total Enrolled Pupils</span>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{adminTotalStudents}</h3>
                <span className="text-xs text-emerald-500 font-medium flex items-center mt-1">
                  Active in {activeSessionName}
                </span>
              </div>
              <div className="p-3.5 bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-400 rounded-xl">
                <Users size={24} />
              </div>
            </div>

            {/* Box 2 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Instructors & Staff</span>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{adminTotalStaff}</h3>
                <span className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center mt-1">
                  100% On-duty today
                </span>
              </div>
              <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/5 dark:text-emerald-400 rounded-xl">
                <GraduationCap size={24} />
              </div>
            </div>

            {/* Box 3 */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">Avg. Attendance Rate</span>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{adminStudentAttendanceRate}%</h3>
                <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${adminStudentAttendanceRate}%` }}></div>
                </div>
              </div>
              <div className="p-3.5 bg-sky-500/10 text-sky-600 dark:bg-sky-500/5 dark:text-sky-400 rounded-xl">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </div>



          </div>

          {/* Bento Visual charts & Lists row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Chart Column & Statistics */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm lg:col-span-2 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Grading Distribution Analysis</h4>
                  <p className="text-slate-400 text-xs">Overall academic standing for {activeTerm} ({activeSessionName})</p>
                </div>
                <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">
                  {approvedResults.length} Marked Classes
                </span>
              </div>

              {/* Graphic Score Visual Bars */}
              <div className="space-y-4 pt-2">
                {[
                  { grade: 'Grade A (Excellent: 85 - 100)', count: gradeCounts.A, color: 'bg-emerald-500' },
                  { grade: 'Grade B (Very Good: 70 - 84)', count: gradeCounts.B, color: 'bg-blue-600' },
                  { grade: 'Grade C (Credit: 55 - 69)', count: gradeCounts.C, color: 'bg-indigo-500' },
                  { grade: 'Grade P / Pass (40 - 54)', count: gradeCounts.P, color: 'bg-sky-500' },
                  { grade: 'Grade F (Fail: 0 - 39)', count: gradeCounts.F, color: 'bg-rose-500' },
                ].map((item, idx) => {
                  const totalResults = approvedResults.length || 1;
                  const actualPct = Math.round((item.count / totalResults) * 100);
                  const maxCount = Math.max(...Object.values(gradeCounts)) || 1;
                  const barWidth = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                        <span>{item.grade}</span>
                        <span>{item.count} pupils ({item.count > 0 ? actualPct : 0}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className={`${item.color} h-full rounded-full transition-all duration-500`}
                          style={{ width: `${item.count > 0 ? barWidth : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Attendance and Fees Quick Indicators */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                    <CheckCircle size={14} />
                    <span>School Health</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-200">Excellent</p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">0 reports of school injuries/illness.</span>
                </div>
                <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/10">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                    <BookOpen size={14} />
                    <span>Academic Term</span>
                  </div>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{activeTerm}</p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Active under session {activeSessionName}</span>
                </div>
              </div>

            </div>

            {/* Simulated Live Audit Logs section */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                  <Activity size={16} className="text-blue-600" />
                  <span>Recent School Logs</span>
                </h4>
                <p className="text-slate-400 text-xs">Real-time trace indicators</p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto space-y-3.5 pr-1">
                {recentActivities.map((act, idx) => (
                  <div key={idx} className="pt-3 first:pt-0 flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg text-xs mt-0.5 ${
                      act.type === 'academic' ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-950/20' :
                      act.type === 'billing' ? 'bg-blue-50 text-blue-500 dark:bg-blue-950/20' :
                      'bg-emerald-50 text-emerald-500 dark:bg-emerald-950/20'
                    }`}>
                      <CheckCircle size={12} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight">
                        {act.text}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {act.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Admin Quick Action Button Drawer */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <button
                  onClick={() => setActiveTab('students')}
                  className="w-full flex items-center justify-between text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 hover:text-indigo-600 px-3 py-2 rounded-lg font-medium transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Plus size={14} /> Add New Pupil
                  </span>
                  <span>➜</span>
                </button>
                <button
                  onClick={() => setActiveTab('results')}
                  className="w-full flex items-center justify-between text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800 hover:text-blue-600 px-3 py-2 rounded-lg font-medium transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    📑 Process Results
                  </span>
                  <span>➜</span>
                </button>
              </div>

            </div>

          </div>
        </>
      )}

      {/* ----------------- TEACHER PORTAL DASHBOARD ----------------- */}
      {currentRole === 'TEACHER' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xl shadow-sm border border-blue-550/20 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 font-bold text-9xl">
              🍎
            </div>
            <div className="space-y-1 z-10">
              <h2 className="text-xl font-bold tracking-tight">Welcome Back, {teacherProfile ? `${teacherProfile.firstName} ${teacherProfile.lastName}` : 'Teacher'}!</h2>
              <p className="text-blue-105 text-xs font-medium max-w-xl">
                Classroom management is fully responsive. Select Class Attendance to mark today’s presence grid, or process test and exam results.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 z-10">
              <button
                onClick={() => setActiveTab('attendance')}
                className="bg-slate-950 text-slate-100 text-xs font-semibold py-2 px-4 rounded-lg hover:bg-slate-900 transition-colors"
              >
                📝 Today’s Attendance
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className="bg-white text-slate-950 text-xs font-semibold py-2 px-4 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
              >
                🖊️ Enter Scores
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Stat Cards */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase block">Assigned Class Arms</span>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{assignedClassesCount} Classes</h4>
              <div className="flex items-center gap-1.5 text-xs text-blue-605 dark:text-blue-400 mt-1 font-semibold flex-wrap">
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

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase block">Subjects Entrusted</span>
              <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-1">{assignedSubjectsList.length} Core Subjects</h4>
              <p className="text-slate-400 text-xs mt-1 truncate">
                {assignedSubjectsList.join(' & ')}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 block">
              <span className="text-[11px] text-slate-400 font-semibold uppercase block">Pending Admin Approval</span>
              <h4 className="text-2xl font-bold text-red-500 mt-1">{pendingGradesApprovalCount} Records</h4>
              <span className="text-xs text-slate-400 mt-1 block">
                {pendingGradesApprovalCount > 0 ? `${pendingGradesApprovalCount} result${pendingGradesApprovalCount !== 1 ? 's' : ''} awaiting approval` : 'All results approved'}
              </span>
            </div>
          </div>

          {/* Timetable overview */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Clock size={16} className="text-blue-600 dark:text-blue-400" />
              <span>Today’s Teaching Schedule (Monday)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedClasses.length > 0 ? (
                assignedClasses.slice(0, 3).map((ac, index) => {
                  const times = ['08:30 AM - 09:30 AM', '09:30 AM - 10:30 AM', '11:30 AM - 12:30 PM'];
                  return (
                    <div key={index} className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-850">
                      <span className="text-[10px] uppercase font-mono text-slate-400">{times[index % times.length]}</span>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                        {ac.subjectId === 'maths' ? 'Mathematics' : ac.subjectId === 'science' ? 'Basic Science' : ac.subjectId === 'english' ? 'English Studies' : ac.subjectId}
                      </p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{ac.classId} {ac.arm}</span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-550 px-1.5 py-0.5 rounded">Assigned</span>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">My Registered Children</h2>
              <p className="text-slate-400 text-xs">Viewing registered profiles linked to {parentEmail}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {registeredChildren.map((child) => (
              <div key={child.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs hover:border-blue-500/50 transition-colors">
                <div className="bg-slate-50 dark:bg-slate-850 p-4 border-b border-slate-150 dark:border-slate-800 flex items-center gap-4">
                  <img 
                    src={child.photo} 
                    alt={child.firstName} 
                    className="w-12 h-12 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                      {child.firstName} {child.lastName}
                    </h4>
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{child.classId} {child.arm}</span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded ml-2">
                      Admission: {child.admissionNo}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={() => setActiveTab('results')}
                      className="w-full bg-blue-600 text-white text-xs font-semibold py-2 rounded shadow-xs hover:bg-blue-700 transition-colors text-center cursor-pointer"
                    >
                      📑 View Report Card
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/20 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
            <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-100 mb-2">School Announcement Ticker</h4>
            <div className="space-y-3">
              {notifications.filter(n => n.recipientRole === 'ALL' || n.recipientRole === 'PARENT').map((not, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-150 dark:border-slate-850 shadow-2xs flex items-start gap-3">
                  <span className="p-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 rounded">
                    <Bell size={14} />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-200">{not.title}</h5>
                    <p className="text-slate-500 text-[11px] mt-0.5">{not.content}</p>
                    <span className="text-[10px] text-slate-400 block mt-1">{not.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ----------------- STUDENT PORTAL DASHBOARD ----------------- */}
      {currentRole === 'STUDENT' && (
        <div className="space-y-6">
          <div className="bg-indigo-900 text-white p-6 rounded-xl flex justify-between items-center relative overflow-hidden">
            <div className="z-10 space-y-1">
              <span className="text-xs bg-indigo-500/30 text-indigo-200 font-semibold px-2.5 py-1 rounded">Pupil Dashboard</span>
              <h2 className="text-xl font-bold tracking-tight">{myProfile ? `${myProfile.firstName} ${myProfile.lastName}` : 'Student'}</h2>
              <p className="text-indigo-200 text-xs max-w-md">Class: {myProfile ? `${myProfile.classId} ${myProfile.arm}` : 'N/A'} | Admission No: {myProfile?.admissionNo ?? 'N/A'}</p>
            </div>
            <div className="p-4 bg-indigo-800 rounded-xl hidden sm:block">
              <GraduationCap className="w-10 h-10 text-indigo-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h5 className="text-slate-400 text-[11px] font-semibold uppercase">Subjects Registered</h5>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-1">{mySubjectsCount}</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Maths, English, Science, Verbal...</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h5 className="text-slate-400 text-[11px] font-semibold uppercase">Attendance Rate</h5>
              <p className="text-2xl font-bold text-emerald-500 mt-1">{myPresenceRate}%</p>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${myPresenceRate}%` }} />
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
              <h5 className="text-slate-400 text-[11px] font-semibold uppercase">Assignments</h5>
              <p className="text-2xl font-bold text-blue-500 mt-1">2 Pending</p>
              <span className="text-[11px] text-slate-400 mt-1 block">Creative Arts drawing due tomorrow.</span>
            </div>
          </div>

          {/* Quick Grades alert */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs">
            <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-400 mb-3 block">My Graded Cards (Approved Report Cards)</h4>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {results.filter(r => r.studentId === currentStudentId && r.status === 'PUBLISHED').map((res, idx) => {
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
                        res.grade === 'C' ? 'bg-amber-100 text-amber-805' :
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
