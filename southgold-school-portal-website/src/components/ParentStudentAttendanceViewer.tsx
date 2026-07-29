import React, { useState, useMemo } from 'react';
import { CalendarCheck, AlertCircle, Calendar, User, Clock, CheckCircle, XCircle, ChevronRight, Award, Percent } from 'lucide-react';
import { Student, AttendanceRecord, SchoolTerm } from '../types';

interface ParentStudentAttendanceViewerProps {
  students: Student[];
  attendance: AttendanceRecord[];
  activeSessionName: string;
  activeTerm: SchoolTerm;
  currentRole: 'PARENT' | 'STUDENT';
  userEmail: string;
}

export default function ParentStudentAttendanceViewer({
  students,
  attendance,
  activeSessionName,
  activeTerm,
  currentRole,
  userEmail
}: ParentStudentAttendanceViewerProps) {
  // 1. Get the list of students in scope
  const scopedStudents = useMemo(() => {
    if (currentRole === 'PARENT') {
      return students.filter(s => s.parentEmail?.toLowerCase() === userEmail?.toLowerCase());
    }
    return students.filter(s => s.email?.toLowerCase() === userEmail?.toLowerCase());
  }, [students, currentRole, userEmail]);

  // Selected student state
  const [selectedStudentId, setSelectedStudentId] = useState<string>(() => scopedStudents[0]?.id || '');

  const selectedStudent = useMemo(() => {
    return scopedStudents.find(s => s.id === selectedStudentId) || scopedStudents[0];
  }, [scopedStudents, selectedStudentId]);

  // Sync state if selected student changes
  React.useEffect(() => {
    if (scopedStudents.length > 0 && !selectedStudentId) {
      setSelectedStudentId(scopedStudents[0].id);
    }
  }, [scopedStudents, selectedStudentId]);

  // 2. Filter attendance records for the selected student
  const studentAttendance = useMemo(() => {
    if (!selectedStudent) return [];
    return attendance.filter(a => a.entityId === selectedStudent.id && a.entityType === 'Student');
  }, [attendance, selectedStudent]);

  // Term-specific attendance
  const termAttendance = useMemo(() => {
    return studentAttendance.filter(a => a.session === activeSessionName && a.term === activeTerm);
  }, [studentAttendance, activeSessionName, activeTerm]);

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = studentAttendance.length;
    const present = studentAttendance.filter(a => a.status === 'Present').length;
    const absent = studentAttendance.filter(a => a.status === 'Absent').length;
    const late = studentAttendance.filter(a => a.status === 'Late').length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 100;

    // Term-specific metrics
    const termTotal = termAttendance.length;
    const termPresent = termAttendance.filter(a => a.status === 'Present').length;
    const termAbsent = termAttendance.filter(a => a.status === 'Absent').length;
    const termLate = termAttendance.filter(a => a.status === 'Late').length;
    const termPercentage = termTotal > 0 ? Math.round(((termPresent + termLate) / termTotal) * 100) : 100;

    return {
      total,
      present,
      absent,
      late,
      percentage,
      termTotal,
      termPresent,
      termAbsent,
      termLate,
      termPercentage
    };
  }, [studentAttendance, termAttendance]);

  // 3. Monthly Summary
  const monthlySummary = useMemo(() => {
    const summary: Record<string, { present: number; absent: number; late: number; total: number }> = {};
    
    // Sort chronological order
    const sorted = [...studentAttendance].sort((a, b) => b.date.localeCompare(a.date));

    sorted.forEach(rec => {
      if (!rec.date) return;
      const dateObj = new Date(rec.date);
      // Fallback if Date is invalid
      if (isNaN(dateObj.getTime())) return;
      
      const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!summary[monthName]) {
        summary[monthName] = { present: 0, absent: 0, late: 0, total: 0 };
      }
      summary[monthName].total += 1;
      if (rec.status === 'Present') summary[monthName].present += 1;
      else if (rec.status === 'Absent') summary[monthName].absent += 1;
      else if (rec.status === 'Late') summary[monthName].late += 1;
    });

    return Object.entries(summary).map(([month, data]) => ({
      month,
      ...data,
      percentage: data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 100
    }));
  }, [studentAttendance]);

  if (scopedStudents.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xs space-y-3">
        <AlertCircle className="mx-auto text-amber-550" size={36} />
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">No linked profiles detected</h3>
        <p className="text-xs text-slate-455 leading-relaxed">
          There are no student portal profiles linked with your account. Please contact the school's administrative office to link profiles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card with student selection */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-2">
              <CalendarCheck className="text-blue-600" size={20} />
              <span>{currentRole === 'PARENT' ? "Children Attendance Tracker" : "My Attendance Logs"}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              View daily attendance logs, terminal stats, and monthly summaries.
            </p>
          </div>

          {currentRole === 'PARENT' && scopedStudents.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase font-mono">Select Child:</span>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs py-2 px-3.5 rounded-xl font-bold text-slate-750 dark:text-slate-250 cursor-pointer shadow-3xs"
              >
                {scopedStudents.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.firstName} {child.lastName} ({child.classId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {selectedStudent && (
        <div className="space-y-6">
          {/* Pupil Specification Strip */}
          <div className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-3xs">
            <div className="flex items-center gap-3">
              <img 
                src={selectedStudent.photo || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop"} 
                alt={selectedStudent.firstName} 
                className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-white"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">PUPIL PROFILE</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-4 text-xs">
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-lg text-center sm:text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Class</span>
                <span className="font-extrabold text-slate-750 dark:text-slate-200">{selectedStudent.classId} {selectedStudent.arm || ''}</span>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-3 py-1.5 rounded-lg text-center sm:text-left">
                <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono">Admission No</span>
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedStudent.admissionNo}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Box 1: Terminal Attendance Percentage */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono block">Term Attendance Rate</span>
              <div className="flex items-center gap-2">
                <Percent size={20} className="text-indigo-600 dark:text-indigo-400" />
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
                  {metrics.termPercentage}%
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-medium block">
                For current term ({activeTerm})
              </span>
            </div>

            {/* Box 2: Present Days */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono block">Days Present</span>
              <div className="flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-500" />
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
                  {metrics.termPresent}
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-medium block">
                Total present in current term
              </span>
            </div>

            {/* Box 3: Absent Days */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono block">Days Absent</span>
              <div className="flex items-center gap-2">
                <XCircle size={20} className="text-rose-500" />
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
                  {metrics.termAbsent}
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-medium block">
                Total absent in current term
              </span>
            </div>

            {/* Box 4: Late Days */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 font-mono block">Days Late</span>
              <div className="flex items-center gap-2">
                <Clock size={20} className="text-amber-500" />
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 font-mono">
                  {metrics.termLate}
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-medium block">
                Total late arrivals recorded
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Monthly Summary & Historical Stats */}
            <div className="lg:col-span-1 space-y-5">
              {/* Overall Session Stats Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  Session Cumulative Stats
                </h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-455 font-bold">Total Days Logged:</span>
                    <span className="font-mono font-black text-slate-850 dark:text-slate-100">{metrics.total} Days</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-455 font-bold">Cumulative Rate:</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">{metrics.percentage}%</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-455 font-bold">Total Session Absences:</span>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400">{metrics.absent} Days</span>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <span className="text-slate-455 font-bold">Active Session Year:</span>
                    <span className="font-bold text-slate-750 dark:text-slate-200">{activeSessionName}</span>
                  </div>
                </div>
              </div>

              {/* Monthly Attendance Summary */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                  Monthly Summary Ledger
                </h4>
                {monthlySummary.length > 0 ? (
                  <div className="space-y-3">
                    {monthlySummary.map(m => (
                      <div key={m.month} className="p-3 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase">{m.month}</span>
                          <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">{m.percentage}%</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-center font-bold text-slate-500">
                          <div className="bg-white dark:bg-slate-900 py-1 rounded border border-slate-100 dark:border-slate-800">
                            <span className="text-emerald-500 block font-mono">{m.present}</span> Present
                          </div>
                          <div className="bg-white dark:bg-slate-900 py-1 rounded border border-slate-100 dark:border-slate-800">
                            <span className="text-rose-500 block font-mono">{m.absent}</span> Absent
                          </div>
                          <div className="bg-white dark:bg-slate-900 py-1 rounded border border-slate-100 dark:border-slate-800">
                            <span className="text-amber-500 block font-mono">{m.late}</span> Late
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-400 italic font-semibold text-xs">
                    No monthly stats compiled.
                  </div>
                )}
              </div>
            </div>

            {/* Attendance History (List) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center justify-between">
                <span>Daily Registry History</span>
                <span className="text-[10px] font-mono lowercase font-bold text-slate-400">({studentAttendance.length} records total)</span>
              </h4>

              {studentAttendance.length > 0 ? (
                <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-150 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-4">Term & Session</th>
                          <th className="py-3 px-4">Explanation Remark</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-705 dark:text-slate-300">
                        {[...studentAttendance]
                          .sort((a, b) => b.date.localeCompare(a.date))
                          .map(rec => (
                            <tr key={rec.id} className="hover:bg-slate-50/40">
                              <td className="py-3 px-4 font-bold font-mono">
                                {rec.date}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                                  rec.status === 'Present' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-150' :
                                  rec.status === 'Late' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-150' :
                                  'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-150'
                                }`}>
                                  {rec.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 uppercase font-bold text-[10px] text-slate-500">
                                {rec.term} / {rec.session}
                              </td>
                              <td className="py-3 px-4 italic font-medium text-slate-500 text-[11px] truncate max-w-[150px]">
                                {rec.remark || '—'}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-8 text-center space-y-2">
                  <AlertCircle size={24} className="mx-auto text-slate-400" />
                  <p className="text-xs text-slate-455 italic font-semibold">
                    No marked daily attendance logs exist for this child yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
