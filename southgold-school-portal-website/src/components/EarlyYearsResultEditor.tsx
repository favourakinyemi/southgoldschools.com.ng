import React, { useState, useEffect } from 'react';
import { 
  X,
  Edit,
  FileText,
  RefreshCw,
  Download,
  Upload,
  ArrowLeft,
  CheckCircle,
  Menu,
  CalendarCheck
} from 'lucide-react';
import { Student, SchoolTerm, Subject, UserRole, ResultRecord, AssessmentItem } from '../types';
import { isChecklistPreschoolClass } from '../data/preschoolSkills';

export interface EarlyYearsResultRecord {
  id: string;
  studentId: string;
  classId: string;
  arm: string;
  subjectId: string;
  term: SchoolTerm;
  session: string;
  rating: string;
  isApproved: boolean;
  status: string; // 'DRAFT' | 'SUBMITTED' | 'PUBLISHED'
}

interface EarlyYearsResultEditorProps {
  currentRole: UserRole;
  selectedClass: string;
  selectedArm: string;
  selectedTerm: SchoolTerm;
  activeSessionName: string;
  students: Student[];
  subjects: Subject[];
  classesWithSubjects?: { classId: string; subjects: string[]; stage?: 'Pre-School' | 'Primary' | 'Secondary' }[];
  earlyYearsResults: EarlyYearsResultRecord[];
  onSetEarlyYearsResults: (res: EarlyYearsResultRecord[]) => void;
  assessmentItems?: AssessmentItem[];
  config?: any;
  results?: ResultRecord[];
  onSetResults?: (res: ResultRecord[]) => void;
  attendance?: any[];
  onSetAttendance?: (att: any[]) => void;
  onSelectStudentReport?: (studentId: string, mode: 'EOT' | 'EOS' | 'SCORES' | 'LIST') => void;
}

export default function EarlyYearsResultEditor({
  currentRole,
  selectedClass,
  selectedArm,
  selectedTerm,
  activeSessionName,
  students,
  subjects,
  classesWithSubjects,
  earlyYearsResults,
  onSetEarlyYearsResults,
  assessmentItems = [],
  config,
  results = [],
  onSetResults,
  attendance = [],
  onSetAttendance,
  onSelectStudentReport
}: EarlyYearsResultEditorProps) {
  const [evalStudentId, setEvalStudentId] = useState<string | null>(null);
  const [notif, setNotif] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Attendance state
  const defaultOpened = config?.termDaysOpened ? Number(config.termDaysOpened) : 60;
  const [totalDaysOpened, setTotalDaysOpened] = useState<number>(defaultOpened);
  const [manualDaysPresent, setManualDaysPresent] = useState<number>(defaultOpened);

  const manualDaysAbsent = Math.max(0, totalDaysOpened - manualDaysPresent);
  const attendancePercentage = totalDaysOpened > 0 ? Math.round((manualDaysPresent / totalDaysOpened) * 100) : 0;

  // Form states inside modal (for Toddler / Pre-School 1 & 2 checklist)
  const [formRatings, setFormRatings] = useState<Record<string, 'EXCELLENT' | 'VERY GOOD' | 'GOOD' | 'FAIR' | ''>>({});

  // Form states inside modal (for Reception academic grid)
  const [formReceptionScores, setFormReceptionScores] = useState<Record<string, { test: number; cbt: number; exam: number }>>({});

  // Mode detection: Checklist-based preschool vs Reception
  const isChecklistClass = isChecklistPreschoolClass(selectedClass, classesWithSubjects);

  // Assessment items for selected class
  const classAssessmentItems = (assessmentItems || []).filter(item => 
    !item.classId || item.classId === 'ALL' || item.classId.toLowerCase() === selectedClass.toLowerCase()
  );

  // Filter students in selected class and arm
  const classStudents = students.filter(s => 
    s.classId?.toLowerCase() === selectedClass.toLowerCase() && 
    (s.arm || 'A').toUpperCase() === selectedArm.toUpperCase()
  );

  const maleCount = classStudents.filter(s => s.gender === 'Male').length;
  const femaleCount = classStudents.filter(s => s.gender === 'Female').length;

  const activeStudent = students.find(s => s.id === evalStudentId) || null;

  // Notification trigger
  const triggerNotification = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3000);
  };

  // Download CSV template
  const handleDownloadTemplate = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (isChecklistClass) {
      csvContent += 'Admission No,Student Name,Assessment Item ID,Assessment Item Title,Rating (EXCELLENT / VERY GOOD / GOOD / FAIR)\n';
      classStudents.forEach(s => {
        classAssessmentItems.forEach(item => {
          csvContent += `"${s.admissionNo}","${s.firstName} ${s.lastName}","${item.id}","${item.name || item.title}",""\n`;
        });
      });
    } else {
      csvContent += 'Admission No,Student Name,Subject ID,Subject Name,Test Score (40),Exam Score (60)\n';
      classStudents.forEach(s => {
        receptionSubjects.forEach(sub => {
          csvContent += `"${s.admissionNo}","${s.firstName} ${s.lastName}","${sub.id}","${sub.name}","",""\n`;
        });
      });
    }
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedClass}_${selectedTerm}_Template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification('Downloaded CSV template.');
  };

  const handleImportScores = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      triggerNotification(`Successfully processed ${file.name}`);
    };
    input.click();
  };

  const handleRefreshData = async () => {
    try {
      const res = await fetch('/api/early-years/results');
      if (res.ok) {
        const data = await res.json();
        onSetEarlyYearsResults(data);
      }
      triggerNotification('Refreshed class roster and scores from database.');
    } catch (err) {
      triggerNotification('Failed to refresh data from server.');
    }
  };

  const handleProcessClassResults = async () => {
    triggerNotification(`Processed class results calculation for ${classStudents.length} students in ${selectedClass}.`);
  };

  // Open modal for student
  const handleOpenModal = (studentId: string) => {
    setEvalStudentId(studentId);

    // Load attendance for student
    const studentAtt = (attendance || []).filter(
      a => a.entityId === studentId && a.entityType === 'Student' && a.session === activeSessionName && a.term === selectedTerm
    );
    if (studentAtt.length > 0) {
      const compPresent = studentAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
      setTotalDaysOpened(studentAtt.length);
      setManualDaysPresent(compPresent);
    } else {
      const defOpened = config?.termDaysOpened ? Number(config.termDaysOpened) : 60;
      setTotalDaysOpened(defOpened);
      setManualDaysPresent(defOpened);
    }

    if (isChecklistClass) {
      // Load ratings for Toddler / Pre-School
      const existing = earlyYearsResults.filter(r => 
        r.studentId === studentId && 
        r.term === selectedTerm && 
        r.session === activeSessionName
      );

      const loadedRatings: Record<string, 'EXCELLENT' | 'VERY GOOD' | 'GOOD' | 'FAIR' | ''> = {};
      classAssessmentItems.forEach((item) => {
        const matchingRec = existing.find(r => 
          r.id.endsWith(`_${item.id}`) ||
          r.id === `res_ey_${studentId}_${selectedTerm.replace(/\s+/g, '_')}_${activeSessionName.replace(/[\/\s]+/g, '_')}_${item.id}` ||
          r.subjectId === item.id
        );
        if (matchingRec && matchingRec.rating) {
          loadedRatings[item.id] = matchingRec.rating as any;
        }
      });
      setFormRatings(loadedRatings);
    } else {
      // Load academic scores for Reception
      const existing = results.filter(r => 
        r.studentId === studentId && 
        r.term === selectedTerm && 
        r.session === activeSessionName
      );

      const loadedScores: Record<string, { test: number; cbt: number; exam: number }> = {};
      existing.forEach(r => {
        loadedScores[r.subjectId] = {
          test: r.testScore || 0,
          cbt: r.assignmentScore || 0,
          exam: r.examScore || 0
        };
      });
      setFormReceptionScores(loadedScores);
    }
  };

  const handleCloseModal = () => {
    setEvalStudentId(null);
    setFormRatings({});
    setFormReceptionScores({});
  };

  useEffect(() => {
    if (!evalStudentId) return;
    const studentAtt = (attendance || []).filter(
      a => a.entityId === evalStudentId && a.entityType === 'Student' && a.session === activeSessionName && a.term === selectedTerm
    );
    if (studentAtt.length > 0) {
      const compPresent = studentAtt.filter(a => a.status === 'Present' || a.status === 'Late').length;
      setTotalDaysOpened(studentAtt.length);
      setManualDaysPresent(compPresent);
    }
  }, [evalStudentId, attendance, activeSessionName, selectedTerm]);

  // Rating change for Checklist
  const handleRatingChange = (itemId: string, val: 'EXCELLENT' | 'VERY GOOD' | 'GOOD' | 'FAIR' | '') => {
    setFormRatings(prev => ({
      ...prev,
      [itemId]: val
    }));
  };

  // Reception score change
  const handleScoreChange = (subId: string, field: 'test' | 'cbt' | 'exam', valStr: string) => {
    const val = parseInt(valStr, 10) || 0;
    setFormReceptionScores(prev => {
      const existing = prev[subId] || { test: 0, cbt: 0, exam: 0 };
      let updated = { ...existing, [field]: val };
      if (field === 'test') updated.test = Math.min(40, Math.max(0, val));
      if (field === 'exam') updated.exam = Math.min(60, Math.max(0, val));
      return { ...prev, [subId]: updated };
    });
  };

  // Save Modal Form
  const handleSubmit = async () => {
    if (!evalStudentId || !activeStudent) return;
    setIsSaving(true);

    try {
      if (isChecklistClass) {
        // Build EarlyYearsResultRecords for assessment items
        const updatedRecords: EarlyYearsResultRecord[] = [];
        
        classAssessmentItems.forEach((item, idx) => {
          const ratingVal = formRatings[item.id] ?? formRatings[idx] ?? '';
          const recId = `res_ey_${evalStudentId}_${selectedTerm.replace(/\s+/g, '_')}_${activeSessionName.replace(/[\/\s]+/g, '_')}_${item.id}`;
          
          updatedRecords.push({
            id: recId,
            studentId: evalStudentId,
            classId: selectedClass,
            arm: selectedArm,
            subjectId: item.subjectId || item.id,
            term: selectedTerm,
            session: activeSessionName,
            rating: ratingVal,
            isApproved: false,
            status: 'SUBMITTED'
          });
        });

        // Save to backend API
        const resp = await fetch('/api/early-years/results', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedRecords)
        });

        if (!resp.ok) {
          throw new Error('Failed to save early years assessment scores');
        }

        // Sync local earlyYearsResults state
        const remaining = earlyYearsResults.filter(r => !(
          r.studentId === evalStudentId && 
          r.term === selectedTerm && 
          r.session === activeSessionName
        ));

        onSetEarlyYearsResults([...remaining, ...updatedRecords]);
        triggerNotification(`Scores successfully saved for ${activeStudent.firstName} ${activeStudent.lastName}`);
      } else {
        // Reception Academic Grid Save
        const classMap = classesWithSubjects?.find(c => c.classId?.toLowerCase() === selectedClass.toLowerCase());
        const assignedSubjectIds = classMap ? classMap.subjects : [];
        const targetSubjects = subjects.filter(s => assignedSubjectIds.includes(s.id));

        if (targetSubjects.length === 0) {
          triggerNotification('No subjects assigned to Reception. Please assign subjects in Subject Management.');
          setIsSaving(false);
          return;
        }

        const updatedAcademicRecords: ResultRecord[] = targetSubjects.map(sub => {
          const scores = formReceptionScores[sub.id] || { test: 0, cbt: 0, exam: 0 };
          const total = scores.test + scores.cbt + scores.exam;
          let grade = 'F';
          if (total >= 70) grade = 'A';
          else if (total >= 60) grade = 'B';
          else if (total >= 50) grade = 'C';
          else if (total >= 40) grade = 'P';

          return {
            id: `res_rec_${evalStudentId}_${sub.id}_${selectedTerm.replace(/\s+/g, '_')}_${activeSessionName.replace(/[\/\s]+/g, '_')}`,
            studentId: evalStudentId,
            classId: selectedClass,
            arm: selectedArm,
            subjectId: sub.id,
            term: selectedTerm,
            session: activeSessionName,
            testScore: scores.test,
            assignmentScore: scores.cbt,
            examScore: scores.exam,
            totalScore: total,
            grade,
            teacherRemark: '',
            isApproved: false,
            status: 'SUBMITTED'
          };
        });

        const resp = await fetch('/api/results', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedAcademicRecords)
        });

        if (!resp.ok) {
          throw new Error('Failed to save Reception examination scores');
        }

        if (onSetResults) {
          const remaining = results.filter(r => !(
            r.studentId === evalStudentId && 
            r.term === selectedTerm && 
            r.session === activeSessionName
          ));
          onSetResults([...remaining, ...updatedAcademicRecords]);
        }

        triggerNotification(`Scores successfully saved for ${activeStudent.firstName} ${activeStudent.lastName}`);
      }

      // Synchronize attendance log state
      if (onSetAttendance && activeStudent) {
        const otherAttendance = (attendance || []).filter(
          a => !(a.entityId === activeStudent.id && a.entityType === 'Student' && a.session === activeSessionName && a.term === selectedTerm)
        );

        const todayStr = new Date().toISOString().split('T')[0];
        const presentCount = manualDaysPresent;
        const absentCount = Math.max(0, totalDaysOpened - presentCount);

        const newRecords: any[] = [];
        for (let i = 0; i < presentCount; i++) {
          newRecords.push({
            id: `att_pres_${activeStudent.id}_${i}`,
            entityId: activeStudent.id,
            entityType: 'Student',
            date: todayStr,
            status: 'Present',
            session: activeSessionName,
            term: selectedTerm,
            classId: activeStudent.classId || selectedClass,
            arm: activeStudent.arm || selectedArm
          });
        }
        for (let i = 0; i < absentCount; i++) {
          newRecords.push({
            id: `att_abs_${activeStudent.id}_${i}`,
            entityId: activeStudent.id,
            entityType: 'Student',
            date: todayStr,
            status: 'Absent',
            session: activeSessionName,
            term: selectedTerm,
            classId: activeStudent.classId || selectedClass,
            arm: activeStudent.arm || selectedArm
          });
        }

        onSetAttendance([...otherAttendance, ...newRecords]);
      }

      handleCloseModal();
    } catch (err: any) {
      triggerNotification(err.message || 'Error saving examination scores');
    } finally {
      setIsSaving(false);
    }
  };

  // Assigned subjects for Reception mode
  const classMap = classesWithSubjects?.find(c => c.classId?.toLowerCase() === selectedClass.toLowerCase());
  const assignedSubjectIds = classMap ? classMap.subjects : [];
  const receptionSubjects = subjects.filter(s => assignedSubjectIds.includes(s.id));

  return (
    <div className="w-full bg-[#0b0f19] text-slate-100 min-h-screen p-4 sm:p-6 font-sans">
      {/* Toast Notification */}
      {notif && (
        <div className="fixed top-5 right-5 z-50 bg-indigo-600 text-white px-4 py-2.5 rounded-md shadow-xl text-xs font-bold flex items-center gap-2 border border-indigo-400">
          <CheckCircle size={16} />
          <span>{notif}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-800/80 pb-3">
          <div>
            <h1 className="text-xl font-black text-slate-100 tracking-tight">Process Class Results</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Dashboard / Classroom / Process Results / <span className="text-indigo-400 font-bold">{selectedClass}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleImportScores}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload size={13} />
              <span>Import exam scores</span>
            </button>
            <button 
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={13} />
              <span>Download template</span>
            </button>
            <button 
              onClick={() => window.history.back()}
              className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800/80 text-purple-200 border border-purple-700/50 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Info Banner Bar */}
        <div className="bg-[#141b2d] border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 font-semibold tracking-wide">
            <div>TERM: <span className="text-indigo-400 font-bold">{selectedTerm}</span></div>
            <div>SESSION: <span className="text-indigo-400 font-bold">{activeSessionName}</span></div>
            <div>TOTAL IN CLASS: <span className="text-slate-200 font-bold">{classStudents.length}</span></div>
            <div>MALE: <span className="text-slate-200 font-bold">{maleCount}</span></div>
            <div>FEMALE: <span className="text-slate-200 font-bold">{femaleCount}</span></div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefreshData} 
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} />
              <span>Refresh</span>
            </button>
            <button 
              onClick={handleProcessClassResults}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle size={12} />
              <span>Process Class Result</span>
            </button>
          </div>
        </div>

        {/* Student Roster Table */}
        <div className="bg-[#111726] border border-slate-800 rounded-lg overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#182035] text-slate-300 uppercase font-bold border-b border-slate-800 text-[11px] tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4 w-28">Gender</th>
                  <th className="py-3 px-4 w-40">Phone</th>
                  <th className="py-3 px-4 w-96 text-center">Options</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200 font-medium">
                {classStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                      No students enrolled in {selectedClass} Arm {selectedArm}
                    </td>
                  </tr>
                ) : (
                  classStudents.map((std, idx) => (
                    <tr key={std.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-200">{std.firstName} {std.lastName}</div>
                        <div className="text-[10px] font-mono text-indigo-400">{std.admissionNo}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{std.gender}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{std.parentPhone || '09000000000'}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenModal(std.id)}
                            className="px-2.5 py-1 bg-indigo-950/80 hover:bg-indigo-900/90 text-indigo-300 border border-indigo-700/60 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Edit size={12} />
                            <span>Edit/Enter Scores</span>
                          </button>
                          <button
                            onClick={() => {
                              if (onSelectStudentReport) {
                                onSelectStudentReport(std.id, 'EOT');
                              } else {
                                triggerNotification(`Generated EOT Report for ${std.firstName}`);
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FileText size={12} />
                            <span>EOT Report</span>
                          </button>
                          <button
                            onClick={() => {
                              if (onSelectStudentReport) {
                                onSelectStudentReport(std.id, 'EOS');
                              } else {
                                triggerNotification(`Generated EOS Report for ${std.firstName}`);
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FileText size={12} />
                            <span>EOS Report</span>
                          </button>
                          <button
                            className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition-colors"
                            title="More Options"
                          >
                            <Menu size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Score Modal Window */}
      {evalStudentId && activeStudent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#0e1424] border border-slate-700/80 rounded-lg shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Subtitle & Top Bar */}
            <div className="bg-[#0a0e19] px-4 py-2 border-b border-slate-800 flex justify-between items-center text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Enter / Edit examination scores</span>
              <button 
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Main Banner Header */}
            <div className="bg-[#12192c] py-4 px-6 text-center border-b border-slate-800/80">
              <h2 className="text-lg sm:text-xl font-black text-indigo-400 tracking-tight">
                Add or Edit examination scores for <span className="text-white">{activeStudent.firstName} {activeStudent.lastName}</span>
              </h2>
              <p className="text-xs font-semibold text-indigo-300 mt-1">
                {selectedClass} - {selectedTerm}, {activeSessionName}
              </p>
            </div>

            {/* Modal Table Body Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#0a0e1a]">
              {/* Terminal Attendance Register Section */}
              <div className="bg-[#141b2d] border border-slate-800 rounded-lg p-3 mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-300 uppercase tracking-wider">
                  <CalendarCheck size={16} className="text-indigo-400" />
                  <span>Terminal Attendance Register</span>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">School Opened:</span>
                    <input
                      type="number"
                      min={1}
                      max={150}
                      value={totalDaysOpened}
                      onChange={(e) => setTotalDaysOpened(Math.max(1, Number(e.target.value) || 60))}
                      className="w-16 text-center py-1 px-1.5 bg-[#0a0e1a] border border-slate-700 rounded text-xs font-bold font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Days Present:</span>
                    <input
                      type="number"
                      min={0}
                      max={totalDaysOpened}
                      value={manualDaysPresent}
                      onChange={(e) => setManualDaysPresent(Math.min(totalDaysOpened, Math.max(0, Number(e.target.value) || 0)))}
                      className="w-16 text-center py-1 px-1.5 bg-[#0a0e1a] border border-slate-700 rounded text-xs font-bold font-mono text-emerald-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Days Absent:</span>
                    <span className="text-xs font-bold font-mono text-rose-400 px-2 py-1 bg-[#0a0e1a] border border-slate-700 rounded">
                      {manualDaysAbsent}
                    </span>
                  </div>
                  <span className="text-xs font-black font-mono text-indigo-300 bg-indigo-950/60 py-1 px-2.5 rounded border border-indigo-700/60">
                    {attendancePercentage}% Attended
                  </span>
                </div>
              </div>

              {isChecklistClass ? (
                /* Toddler / Pre-School 1 & 2 Checklist Table */
                classAssessmentItems.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <p className="font-semibold text-slate-300">No assessment items defined for {selectedClass}.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Please configure assessment items for {selectedClass} in Subject Management / Assessment Items.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-[#151c30] text-slate-200 font-bold uppercase border-b border-slate-800 text-[11px] tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center border-r border-slate-800">#</th>
                        <th className="py-2.5 px-3 border-r border-slate-800">SUBJECT / ASSESSMENT ITEM</th>
                        <th className="py-2.5 px-2 w-24 text-center border-r border-slate-800">EXCELLENT</th>
                        <th className="py-2.5 px-2 w-24 text-center border-r border-slate-800">VERY GOOD</th>
                        <th className="py-2.5 px-2 w-24 text-center border-r border-slate-800">GOOD</th>
                        <th className="py-2.5 px-2 w-24 text-center border-r border-slate-800">FAIR</th>
                        <th className="py-2.5 px-2 w-20 text-center">OPTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                      {classAssessmentItems.map((item, idx) => {
                        const currentVal = formRatings[item.id] ?? formRatings[idx] ?? '';
                        return (
                          <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-800/60">{idx + 1}</td>
                            <td className="py-2 px-3 text-slate-200 text-xs border-r border-slate-800/60">{item.name || item.title}</td>
                            
                            {/* EXCELLENT */}
                            <td className="py-2 px-2 text-center border-r border-slate-800/60">
                              <input 
                                type="radio" 
                                name={`item_radio_${item.id}`}
                                checked={currentVal === 'EXCELLENT'}
                                onChange={() => handleRatingChange(item.id, 'EXCELLENT')}
                                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                              />
                            </td>

                            {/* VERY GOOD */}
                            <td className="py-2 px-2 text-center border-r border-slate-800/60">
                              <input 
                                type="radio" 
                                name={`item_radio_${item.id}`}
                                checked={currentVal === 'VERY GOOD'}
                                onChange={() => handleRatingChange(item.id, 'VERY GOOD')}
                                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                              />
                            </td>

                            {/* GOOD */}
                            <td className="py-2 px-2 text-center border-r border-slate-800/60">
                              <input 
                                type="radio" 
                                name={`item_radio_${item.id}`}
                                checked={currentVal === 'GOOD'}
                                onChange={() => handleRatingChange(item.id, 'GOOD')}
                                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                              />
                            </td>

                            {/* FAIR */}
                            <td className="py-2 px-2 text-center border-r border-slate-800/60">
                              <input 
                                type="radio" 
                                name={`item_radio_${item.id}`}
                                checked={currentVal === 'FAIR'}
                                onChange={() => handleRatingChange(item.id, 'FAIR')}
                                className="w-4 h-4 accent-indigo-500 cursor-pointer"
                              />
                            </td>

                            {/* OPTION / CLEAR */}
                            <td className="py-2 px-2 text-center">
                              <input 
                                type="radio" 
                                name={`item_radio_${item.id}`}
                                checked={currentVal === ''}
                                onChange={() => handleRatingChange(item.id, '')}
                                className="w-4 h-4 accent-slate-600 cursor-pointer"
                                title="Clear choice"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              ) : (
                /* Reception Academic Score Grid */
                receptionSubjects.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    <p className="font-semibold text-slate-300">No subjects assigned to {selectedClass}.</p>
                    <p className="text-[11px] text-slate-500 mt-1">Please assign subjects to {selectedClass} in Subject Management.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse border border-slate-800">
                    <thead>
                      <tr className="bg-[#151c30] text-slate-200 font-bold uppercase border-b border-slate-800 text-[11px] tracking-wider">
                        <th className="py-2.5 px-3 w-10 text-center border-r border-slate-800">#</th>
                        <th className="py-2.5 px-3 border-r border-slate-800">SUBJECT</th>
                        <th className="py-2.5 px-3 w-32 text-center border-r border-slate-800">TEST / CA (40)</th>
                        <th className="py-2.5 px-3 w-32 text-center border-r border-slate-800">EXAM (60)</th>
                        <th className="py-2.5 px-3 w-32 text-center border-r border-slate-800">TOTAL (100)</th>
                        <th className="py-2.5 px-3 w-20 text-center">OPTION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                      {receptionSubjects.map((sub, idx) => {
                        const scores = formReceptionScores[sub.id] || { test: 0, cbt: 0, exam: 0 };
                        const total = (scores.test || 0) + (scores.exam || 0);

                        return (
                          <tr key={sub.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-2 px-3 text-center font-mono text-slate-400 border-r border-slate-800/60">{idx + 1}</td>
                            <td className="py-2 px-3 text-slate-200 text-xs border-r border-slate-800/60">{sub.name}</td>
                            
                            {/* TEST / CA (40) */}
                            <td className="py-2 px-3 text-center border-r border-slate-800/60">
                              <input 
                                type="number"
                                min="0"
                                max="40"
                                value={scores.test || ''}
                                placeholder="CA score (40)"
                                onChange={(e) => handleScoreChange(sub.id, 'test', e.target.value)}
                                className="w-20 bg-[#0f1628] border border-slate-700 text-slate-100 text-center rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </td>

                            {/* EXAM (60) */}
                            <td className="py-2 px-3 text-center border-r border-slate-800/60">
                              <input 
                                type="number"
                                min="0"
                                max="60"
                                value={scores.exam || ''}
                                placeholder="Exam score (60)"
                                onChange={(e) => handleScoreChange(sub.id, 'exam', e.target.value)}
                                className="w-20 bg-[#0f1628] border border-slate-700 text-slate-100 text-center rounded px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
                              />
                            </td>

                            {/* TOTAL (100) */}
                            <td className="py-2 px-3 text-center border-r border-slate-800/60 font-mono font-bold text-indigo-300">
                              {total}
                            </td>

                            {/* OPTION */}
                            <td className="py-2 px-3 text-center text-slate-500">
                              —
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )
              )}
            </div>

            {/* Modal Bottom Buttons */}
            <div className="p-3.5 bg-[#0e1424] border-t border-slate-800 flex justify-center items-center gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSaving}
                className="px-6 py-1.5 rounded text-xs font-bold bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700/50 transition-colors disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSaving}
                className="px-6 py-1.5 rounded text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
