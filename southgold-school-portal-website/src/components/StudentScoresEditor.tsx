import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  CalendarCheck, 
  BookOpen, 
  FileSpreadsheet, 
  CheckSquare, 
  Award, 
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Check,
  UserCheck,
  ClipboardList,
  Send
} from 'lucide-react';
import { Student, ResultRecord, SchoolTerm, Subject, AssessmentItem } from '../types';
import { isReceptionClass } from '../data/preschoolSkills';
import {
  buildResultScoreLimits,
  validateResultScoreRecord,
  validateScoreInput,
  type ResultScoreField
} from '../lib/resultScoreValidation';

interface StudentScoresEditorProps {
  targetStudent: Student;
  targetStudentResults: ResultRecord[];
  isPreschoolMode: boolean;
  preschoolSkills?: string[];
  assessmentItems?: AssessmentItem[];
  subjects: Subject[];
  allProcessedResultsList: ResultRecord[];
  onSetResults: (res: ResultRecord[]) => void;
  onBack: () => void;
  selectedTerm: SchoolTerm;
  activeSessionName: string;
  caTestMax?: number;
  caAssignmentMax?: number;
  examMax?: number;
  gradingScale?: { grade: string; min: number; remark: string }[];
  attendance?: any[];
  onSetAttendance?: (att: any[]) => void;
  classesWithSubjects?: { classId: string; subjects: string[]; stage?: 'Pre-School' | 'Primary' | 'Secondary' }[];
}

type WorkflowStep = 'ATTENDANCE' | 'CA1' | 'CA2' | 'CA3' | 'EXAM' | 'TOTAL_SAVE' | 'SUBMIT';

export default function StudentScoresEditor({
  targetStudent,
  targetStudentResults,
  isPreschoolMode,
  preschoolSkills = [],
  assessmentItems = [],
  subjects,
  allProcessedResultsList,
  onSetResults,
  onBack,
  selectedTerm,
  activeSessionName,
  caTestMax = 15,
  caAssignmentMax = 15,
  examMax = 60,
  gradingScale = [],
  attendance = [],
  onSetAttendance,
  classesWithSubjects = []
}: StudentScoresEditorProps) {

  // View Mode: GRID (All-in-one table) vs WIZARD (7-step stepper)
  const [editorViewMode, setEditorViewMode] = useState<'GRID' | 'WIZARD'>('GRID');
  // Steps state
  const [activeStep, setActiveStep] = useState<WorkflowStep>('ATTENDANCE');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [scoreErrors, setScoreErrors] = useState<Record<string, string>>({});
  const [scoreDraftValues, setScoreDraftValues] = useState<Record<string, string>>({});

  const defaultGradingScale = [
    { grade: 'A', min: 75, remark: 'Excellent' },
    { grade: 'B', min: 65, remark: 'Very Good' },
    { grade: 'C', min: 55, remark: 'Good' },
    { grade: 'P', min: 45, remark: 'Pass' },
    { grade: 'F', min: 0, remark: 'Fail' }
  ];

  const scaleToUse = gradingScale.length > 0 ? gradingScale : defaultGradingScale;

  const getCalculatedGrade = (score: number) => {
    const sorted = [...scaleToUse].sort((a, b) => b.min - a.min);
    for (const gd of sorted) {
      if (score >= gd.min) return gd.grade;
    }
    return 'F';
  };

  // Helper to unpack ca1, ca2, ca3 from result record
  const unpackScores = (res: ResultRecord) => {
    const ca1 = res.testScore || 0;
    const ca2 = (res.assignmentScore || 0) % 100;
    const ca3 = Math.floor((res.assignmentScore || 0) / 100);
    const exam = res.examScore || 0;
    const total = ca1 + ca2 + ca3 + exam;
    return { ca1, ca2, ca3, exam, total };
  };

  // Calculate student attendance metrics dynamically
  const studentAttendanceRecords = attendance.filter(
    a => a.entityId === targetStudent.id && 
    a.term === selectedTerm && 
    a.session === activeSessionName
  );

  const daysPresent = studentAttendanceRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
  const daysAbsent = studentAttendanceRecords.filter(a => a.status === 'Absent').length;
  const defaultOpened = studentAttendanceRecords.length || 60;
  const defaultPresent = studentAttendanceRecords.length ? daysPresent : 58;

  const [manualDaysOpened, setManualDaysOpened] = useState(() => defaultOpened);
  const [manualDaysPresent, setManualDaysPresent] = useState(() => defaultPresent);

  useEffect(() => {
    if (studentAttendanceRecords.length > 0) {
      const pCount = studentAttendanceRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
      setManualDaysOpened(studentAttendanceRecords.length);
      setManualDaysPresent(pCount);
    }
  }, [targetStudent.id, selectedTerm, activeSessionName, studentAttendanceRecords.length, daysPresent]);

  const totalDaysOpened = manualDaysOpened;
  const manualDaysAbsent = Math.max(0, totalDaysOpened - manualDaysPresent);
  const attendancePercentage = totalDaysOpened > 0 ? Math.round((manualDaysPresent / totalDaysOpened) * 100) : 0;

  const targetStudentAttendance = {
    daysPresent: manualDaysPresent,
    daysOpened: totalDaysOpened
  };

  // Automatically pre-populate result records for the student's class subjects if none exist yet!
  useEffect(() => {
    if (isPreschoolMode) return;
    if (targetStudentResults.length > 0) return;

    // Load from student-specific subjects (synced in student_subjects), fallback to class blueprint subjects
    const studentSubjectIds = targetStudent.subjects || [];
    const classMap = classesWithSubjects.find(c => c.classId?.toLowerCase() === targetStudent.classId?.toLowerCase());
    const classSubjectIds = classMap ? classMap.subjects : [];
    const activeSubjectIds = studentSubjectIds.length > 0 ? studentSubjectIds : classSubjectIds;

    if (activeSubjectIds.length > 0) {
      const existingResults = allProcessedResultsList.filter(r => 
        r.studentId === targetStudent.id && 
        r.term === selectedTerm && 
        r.session === activeSessionName
      );

      if (existingResults.length === 0) {
        // Create new empty records for each student/class subject
        const newRecords: ResultRecord[] = activeSubjectIds.map((subId, index) => ({
          id: `res_${targetStudent.id}_${subId}_${selectedTerm.replace(/\s+/g, '')}_${activeSessionName}_${Date.now()}_${index}`,
          studentId: targetStudent.id,
          classId: targetStudent.classId,
          arm: targetStudent.arm || 'A',
          subjectId: subId,
          term: selectedTerm,
          session: activeSessionName,
          testScore: 0,
          assignmentScore: 0, // packed CA2 and CA3 (0 + 0 * 100)
          examScore: 0,
          totalScore: 0,
          grade: 'F',
          teacherRemark: '',
          isApproved: false,
          status: 'DRAFT'
        }));

        onSetResults([...allProcessedResultsList, ...newRecords]);
      }
    }
  }, [isPreschoolMode, targetStudent, targetStudentResults.length, selectedTerm, activeSessionName, classesWithSubjects, allProcessedResultsList, onSetResults]);

  const isReception = isReceptionClass(targetStudent?.classId);

  const rawStepsList: { key: WorkflowStep; label: string; icon: any }[] = [
    { key: 'ATTENDANCE', label: 'Attendance', icon: CalendarCheck },
    { key: 'CA1', label: isReception ? 'Test / CA (40)' : 'CA1 (Class work/Test)', icon: BookOpen },
    { key: 'CA2', label: 'CA2 (Homework/Assignment)', icon: ClipboardList },
    { key: 'CA3', label: 'CA3 (Project/Midterm)', icon: ClipboardList },
    { key: 'EXAM', label: isReception ? 'Exam (60)' : 'Exam', icon: Award },
    { key: 'TOTAL_SAVE', label: 'Total & Save', icon: FileSpreadsheet },
    { key: 'SUBMIT', label: 'Submit results', icon: CheckSquare }
  ];

  const stepsList = isReception ? rawStepsList.filter(s => s.key !== 'CA2' && s.key !== 'CA3') : rawStepsList;

  const triggerSaveNotice = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const calculateStudentAverages = () => {
    if (targetStudentResults.length === 0) return { total: 0, avg: 0 };
    const total = targetStudentResults.reduce((acc, r) => acc + (unpackScores(r).total || 0), 0);
    const avg = Math.round((total / targetStudentResults.length) * 10) / 10;
    return { total, avg };
  };

  const { total: totalScoreSum, avg: averageScore } = calculateStudentAverages();
  const scoreLimits = buildResultScoreLimits({ caTestMax, caAssignmentMax, examMax });
  const ca3Max = scoreLimits.ca3Max;

  const getScoreErrorKey = (resultId: string, field: ResultScoreField) => `${resultId}:${field}`;

  const getScoreInputValue = (resultId: string, field: ResultScoreField, currentValue: number) => {
    const key = getScoreErrorKey(resultId, field);
    return scoreDraftValues[key] ?? (currentValue === 0 ? '' : String(currentValue));
  };

  const setScoreInputDraft = (resultId: string, field: ResultScoreField, value: string, hasError: boolean) => {
    const key = getScoreErrorKey(resultId, field);
    setScoreDraftValues(prev => {
      const next = { ...prev };
      if (hasError) {
        next[key] = value;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const setFieldScoreError = (resultId: string, field: ResultScoreField, message: string | null) => {
    const key = getScoreErrorKey(resultId, field);
    setScoreErrors(prev => {
      const next = { ...prev };
      if (message) {
        next[key] = message;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const collectCurrentScoreErrors = () => {
    const nextErrors: Record<string, string> = {};
    targetStudentResults.forEach(result => {
      validateResultScoreRecord(result, scoreLimits, { isReception }).forEach(error => {
        nextErrors[getScoreErrorKey(result.id, error.field)] = error.message;
      });
    });
    Object.entries(scoreDraftValues).forEach(([key, value]) => {
      const [resultId, field] = key.split(':') as [string, ResultScoreField];
      if (!resultId || !field) return;
      const max = field === 'ca1'
        ? (isReception ? scoreLimits.receptionCa1Max : scoreLimits.ca1Max)
        : field === 'ca2'
          ? scoreLimits.ca2Max
          : field === 'ca3'
            ? scoreLimits.ca3Max
            : field === 'exam'
              ? (isReception ? scoreLimits.receptionExamMax : scoreLimits.examMax)
              : scoreLimits.totalMax;
      const label = field === 'ca1'
        ? (isReception ? 'Reception test / CA' : 'CA1')
        : field === 'ca2'
          ? 'CA2'
          : field === 'ca3'
            ? 'CA3'
            : field === 'exam'
              ? (isReception ? 'Reception exam' : 'Exam')
              : 'Total';
      const message = validateScoreInput(value, max, label);
      if (message) nextErrors[key] = message;
    });
    return nextErrors;
  };

  const hasBlockingScoreErrors = () => {
    const currentErrors = collectCurrentScoreErrors();
    const mergedErrors = { ...currentErrors, ...scoreErrors };
    setScoreErrors(mergedErrors);
    if (Object.keys(mergedErrors).length > 0) {
      triggerSaveNotice('Please fix highlighted score errors before saving.');
      return true;
    }
    return false;
  };

  const handleUpdateScore = (resultId: string, field: 'ca1' | 'ca2' | 'ca3' | 'exam' | 'teacherRemark', value: any) => {
    const isReception = isReceptionClass(targetStudent?.classId);
    const updated = allProcessedResultsList.map(item => {
      if (item.id === resultId) {
        const current = unpackScores(item);
        
        let ca1 = current.ca1;
        let ca2 = isReception ? 0 : current.ca2;
        let ca3 = isReception ? 0 : current.ca3;
        let exam = current.exam;
        let remark = item.teacherRemark;

        if (field === 'ca1') {
          const maxVal = isReception ? scoreLimits.receptionCa1Max : scoreLimits.ca1Max;
          const message = validateScoreInput(value, maxVal, isReception ? 'Reception test / CA' : 'CA1');
          setFieldScoreError(resultId, 'ca1', message);
          setScoreInputDraft(resultId, 'ca1', String(value), !!message);
          if (message) return item;
          ca1 = Number(value);
        } else if (field === 'ca2') {
          if (isReception) {
            ca2 = 0;
          } else {
            const message = validateScoreInput(value, scoreLimits.ca2Max, 'CA2');
            setFieldScoreError(resultId, 'ca2', message);
            setScoreInputDraft(resultId, 'ca2', String(value), !!message);
            if (message) return item;
            ca2 = Number(value);
          }
        } else if (field === 'ca3') {
          if (isReception) {
            ca3 = 0;
          } else {
            const message = validateScoreInput(value, ca3Max, 'CA3');
            setFieldScoreError(resultId, 'ca3', message);
            setScoreInputDraft(resultId, 'ca3', String(value), !!message);
            if (message) return item;
            ca3 = Number(value);
          }
        } else if (field === 'exam') {
          const maxExam = isReception ? scoreLimits.receptionExamMax : scoreLimits.examMax;
          const message = validateScoreInput(value, maxExam, isReception ? 'Reception exam' : 'Exam');
          setFieldScoreError(resultId, 'exam', message);
          setScoreInputDraft(resultId, 'exam', String(value), !!message);
          if (message) return item;
          exam = Number(value);
        } else if (field === 'teacherRemark') {
          remark = value;
        }

        const total = ca1 + ca2 + ca3 + exam;
        const packedAssignmentScore = isReception ? 0 : (ca2 + (ca3 * 100));

        return {
          ...item,
          testScore: ca1,
          assignmentScore: packedAssignmentScore,
          examScore: exam,
          totalScore: total,
          grade: getCalculatedGrade(total),
          teacherRemark: remark
        };
      }
      return item;
    });
    onSetResults(updated);
  };

  const saveAttendanceData = () => {
    if (!onSetAttendance) return;
    const otherAttendance = (attendance || []).filter(
      a => !(a.entityId === targetStudent.id && a.term === selectedTerm && a.session === activeSessionName)
    );
    const newRecords = [];
    const presentCount = manualDaysPresent;
    const openedCount = totalDaysOpened;
    const safeTerm = selectedTerm.replace(/[\s\/]+/g, '_');
    const safeSession = activeSessionName.replace(/[\s\/]+/g, '_');

    for (let i = 0; i < presentCount; i++) {
      const d = new Date(2026, 0, i + 1);
      const dateStr = d.toISOString().split('T')[0];
      newRecords.push({
        id: `att_${targetStudent.id}_${safeSession}_${safeTerm}_${i}_p`,
        entityId: targetStudent.id,
        entityType: 'Student',
        date: dateStr,
        status: 'Present',
        term: selectedTerm,
        session: activeSessionName
      });
    }
    const absentCount = Math.max(0, openedCount - presentCount);
    for (let i = 0; i < absentCount; i++) {
      const d = new Date(2026, 0, presentCount + i + 1);
      const dateStr = d.toISOString().split('T')[0];
      newRecords.push({
        id: `att_${targetStudent.id}_${safeSession}_${safeTerm}_${i}_a`,
        entityId: targetStudent.id,
        entityType: 'Student',
        date: dateStr,
        status: 'Absent',
        term: selectedTerm,
        session: activeSessionName
      });
    }

    onSetAttendance([...otherAttendance, ...newRecords]);
  };

  const handleSaveDraft = () => {
    if (hasBlockingScoreErrors()) return;
    saveAttendanceData();
    const updated = allProcessedResultsList.map(item => {
      if (item.studentId === targetStudent.id && item.term === selectedTerm && item.session === activeSessionName) {
        return { ...item, status: 'DRAFT', isApproved: false };
      }
      return item;
    });
    onSetResults(updated);
    triggerSaveNotice("Success: Draft scoresheet and attendance saved successfully.");
    onBack();
  };

  const handleFormallySubmitToAdmin = () => {
    if (hasBlockingScoreErrors()) return;
    saveAttendanceData();
    const updated = allProcessedResultsList.map(item => {
      if (item.studentId === targetStudent.id && item.term === selectedTerm && item.session === activeSessionName) {
        return { ...item, status: 'SUBMITTED', isApproved: false };
      }
      return item;
    });
    onSetResults(updated);
    onBack();
  };

  return (
    <div className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
      
      {/* Title Header bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 font-bold transition-all bg-slate-100 dark:bg-slate-800 py-1.5 px-3 rounded-lg"
          >
            <ArrowLeft size={14} />
            <span>Back to Students</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-850 py-1 px-2.5 rounded-lg border border-slate-150 dark:border-slate-800">
              Pupil: <strong className="text-slate-800 dark:text-slate-100 uppercase">{targetStudent.firstName} {targetStudent.lastName}</strong> ({targetStudent.admissionNo})
            </span>
            <span className="text-[10px] font-black font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/20 py-1 px-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
              Class: <strong className="uppercase">{targetStudent.classId} {targetStudent.arm}</strong>
            </span>
          </div>
        </div>

        {/* View Mode Toggle Switcher */}
        {!isPreschoolMode && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setEditorViewMode('GRID')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                editorViewMode === 'GRID'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <FileSpreadsheet size={13} />
              <span>Full Scoresheet Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorViewMode('WIZARD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                editorViewMode === 'WIZARD'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <ClipboardList size={13} />
              <span>Step-by-Step Wizard</span>
            </button>
          </div>
        )}
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-405 block">Total Score Sum</span>
          <p className="text-lg font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5">{totalScoreSum} Marks</p>
        </div>
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
          <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 block">Terminal Average</span>
          <p className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">{averageScore}%</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-405 block">Subjects Enrolled</span>
          <p className="text-lg font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5">{targetStudentResults.length} Subjects</p>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30">
          <span className="text-[9px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">Attendance Index</span>
          <p className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
            {manualDaysPresent} / {totalDaysOpened} Days
          </p>
        </div>
      </div>

      {/* Stepper Wizard Bar (Only when WIZARD mode selected) */}
      {editorViewMode === 'WIZARD' && !isPreschoolMode && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {stepsList.map((st, idx) => {
            const StepIcon = st.icon;
            const isActive = activeStep === st.key;
            
            return (
              <button
                key={st.key}
                onClick={() => setActiveStep(st.key)}
                className={`p-2.5 rounded-xl border text-left transition-all duration-200 relative ${
                  isActive 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs' 
                    : 'bg-slate-55 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1 rounded-lg shrink-0 ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <StepIcon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] uppercase font-bold tracking-wider opacity-60">Step {idx + 1}</p>
                    <p className="text-[10px] font-extrabold truncate">{st.label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Save Status Banner */}
      {saveStatus && (
        <div className="p-3 bg-emerald-50 text-emerald-850 border border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all">
          <Check size={14} />
          <span>{saveStatus}</span>
        </div>
      )}

      {/* ALL-IN-ONE FULL SCORESHEET GRID MODE */}
      {editorViewMode === 'GRID' && !isPreschoolMode && (
        <div className="space-y-6">
          
          {/* Attendance Quick Entry Panel */}
          <div className="bg-slate-50 dark:bg-slate-850 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <UserCheck size={16} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">Term Attendance Configuration</h5>
                <p className="text-[10px] text-slate-500">Specify school days opened and days attended before report card generation.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Days Opened:</span>
                <input
                  type="number"
                  min={1}
                  max={150}
                  value={totalDaysOpened}
                  onChange={(e) => setManualDaysOpened(Number(e.target.value) || 60)}
                  className="w-16 text-center py-1 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Days Attended:</span>
                <input
                  type="number"
                  min={0}
                  max={totalDaysOpened}
                  value={manualDaysPresent}
                  onChange={(e) => setManualDaysPresent(Number(e.target.value) || 0)}
                  className="w-16 text-center py-1 px-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 py-1 px-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40">
                {attendancePercentage}%
              </span>
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
            <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Full Academic Scoresheet Grid
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Enter continuous assessment and examination scores directly into the grid. Totals and grades update dynamically.
                </p>
              </div>
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 py-1 px-2.5 rounded-full border border-blue-100 dark:border-blue-900">
                {targetStudentResults.length} Subjects
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  {isReceptionClass(targetStudent?.classId) ? (
                    <tr className="bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Subject Name</th>
                      <th className="py-2.5 px-2 text-center w-28">Test / CA (40)</th>
                      <th className="py-2.5 px-2 text-center w-28">Exam (60)</th>
                      <th className="py-2.5 px-2 text-center w-20">Total (100)</th>
                      <th className="py-2.5 px-2 text-center w-16">Grade</th>
                      <th className="py-2.5 px-3">Subject Remark</th>
                    </tr>
                  ) : (
                    <tr className="bg-slate-100/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3">Subject Name</th>
                      <th className="py-2.5 px-2 text-center w-24">CA1 (15)</th>
                      <th className="py-2.5 px-2 text-center w-24">CA2 (15)</th>
                      <th className="py-2.5 px-2 text-center w-24">CA3 (10)</th>
                      <th className="py-2.5 px-2 text-center w-28">Exam ({examMax})</th>
                      <th className="py-2.5 px-2 text-center w-20">Total (100)</th>
                      <th className="py-2.5 px-2 text-center w-16">Grade</th>
                      <th className="py-2.5 px-3">Subject Remark</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {targetStudentResults.map((res, index) => {
                    const sub = subjects.find(s => s.id === res.subjectId);
                    const scores = unpackScores(res);
                    const calculatedGrade = getCalculatedGrade(scores.total);
                    const isReception = isReceptionClass(targetStudent?.classId);
                    const ca1Error = scoreErrors[getScoreErrorKey(res.id, 'ca1')];
                    const ca2Error = scoreErrors[getScoreErrorKey(res.id, 'ca2')];
                    const ca3Error = scoreErrors[getScoreErrorKey(res.id, 'ca3')];
                    const examError = scoreErrors[getScoreErrorKey(res.id, 'exam')];

                    return (
                      <tr key={res.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/50 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">{index + 1}</td>
                        <td className="py-2 px-3 font-extrabold text-slate-800 dark:text-slate-200">
                          {sub?.name || res.subjectId}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={isReception ? 40 : 15}
                            value={getScoreInputValue(res.id, 'ca1', scores.ca1)}
                            onChange={(e) => handleUpdateScore(res.id, 'ca1', e.target.value)}
                            className="w-16 text-center py-1.5 px-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500"
                          />
                          {ca1Error && <p className="mt-1 text-[9px] font-bold text-red-600 dark:text-red-400">{ca1Error}</p>}
                        </td>
                        {!isReception && (
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={15}
                              value={getScoreInputValue(res.id, 'ca2', scores.ca2)}
                              onChange={(e) => handleUpdateScore(res.id, 'ca2', e.target.value)}
                              className="w-16 text-center py-1.5 px-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500"
                            />
                            {ca2Error && <p className="mt-1 text-[9px] font-bold text-red-600 dark:text-red-400">{ca2Error}</p>}
                          </td>
                        )}
                        {!isReception && (
                          <td className="py-2 px-2 text-center">
                            <input
                              type="number"
                              min={0}
                              max={10}
                              value={getScoreInputValue(res.id, 'ca3', scores.ca3)}
                              onChange={(e) => handleUpdateScore(res.id, 'ca3', e.target.value)}
                              className="w-16 text-center py-1.5 px-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500"
                            />
                            {ca3Error && <p className="mt-1 text-[9px] font-bold text-red-600 dark:text-red-400">{ca3Error}</p>}
                          </td>
                        )}
                        <td className="py-2 px-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={isReception ? 60 : examMax}
                            value={getScoreInputValue(res.id, 'exam', scores.exam)}
                            onChange={(e) => handleUpdateScore(res.id, 'exam', e.target.value)}
                            className="w-20 text-center py-1.5 px-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold font-mono focus:ring-2 focus:ring-blue-500"
                          />
                          {examError && <p className="mt-1 text-[9px] font-bold text-red-600 dark:text-red-400">{examError}</p>}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                          {scores.total}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className={`inline-block py-0.5 px-2 rounded-md font-mono font-black text-xs ${
                            calculatedGrade === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                            calculatedGrade === 'B' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                            calculatedGrade === 'C' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                            calculatedGrade === 'P' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          }`}>
                            {calculatedGrade}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={res.teacherRemark || ''}
                            onChange={(e) => handleUpdateScore(res.id, 'teacherRemark', e.target.value)}
                            placeholder="Optional subject comment..."
                            className="w-full py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar for Grid Mode */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
            <button
              onClick={onBack}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:underline"
            >
              ← Cancel & Return
            </button>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={handleSaveDraft}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all"
              >
                <Save size={14} />
                <span>Save as Draft</span>
              </button>
              <button
                onClick={handleFormallySubmitToAdmin}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                <Send size={14} />
                <span>Lock & Submit to Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP CONTENT SWITCHER (Only shown when WIZARD mode or Preschool) */}
      {(editorViewMode === 'WIZARD' || isPreschoolMode) && (
        <div className="p-1">
        
        {/* PRESCHOOL WORKAROUND */}
        {isPreschoolMode ? (() => {
          const itemsToRender = (assessmentItems && assessmentItems.length > 0)
            ? assessmentItems.filter(item => !item.classId || item.classId.toLowerCase() === targetStudent.classId?.toLowerCase())
            : preschoolSkills.map((skill, idx) => ({ id: `preschool_skill_${idx}`, name: skill, classId: targetStudent.classId }));

          return (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Early Years Assessment Items</h4>
                <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 py-1 px-2.5 rounded-full">Assessment Ratings</span>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 z-10 border-b border-slate-200 dark:border-slate-800">
                    <tr className="text-[9.5px] uppercase text-slate-400 font-black">
                      <th className="py-3 px-4">ASSESSMENT ITEM</th>
                      <th className="py-3 px-4 text-center">RATING LEVEL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {itemsToRender.map((item, idx) => {
                      const currentRec = targetStudentResults.find(r => r.subjectId === item.id || r.subjectId === `preschool_skill_${idx}`);
                      const curGrade = currentRec ? currentRec.grade : 'GOOD';
                      return (
                        <tr key={item.id} className="hover:bg-slate-55/10 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-705 dark:text-slate-250">{item.name}</td>
                          <td className="py-2.5 px-4 text-center">
                            <select
                              value={curGrade}
                              onChange={(e) => {
                                const newGrade = e.target.value;
                                const exists = allProcessedResultsList.some(r => r.studentId === targetStudent.id && (r.subjectId === item.id || r.subjectId === `preschool_skill_${idx}`) && r.term === selectedTerm && r.session === activeSessionName);
                                let updated;
                                if (exists) {
                                  updated = allProcessedResultsList.map(r => {
                                    if (r.studentId === targetStudent.id && (r.subjectId === item.id || r.subjectId === `preschool_skill_${idx}`) && r.term === selectedTerm && r.session === activeSessionName) {
                                      return { ...r, grade: newGrade };
                                    }
                                    return r;
                                  });
                                } else {
                                  const newRec: ResultRecord = {
                                    id: `res_${Date.now()}_ps_${idx}`,
                                    studentId: targetStudent.id,
                                    classId: targetStudent.classId,
                                    arm: targetStudent.arm || 'A',
                                    subjectId: item.id,
                                    term: selectedTerm,
                                    session: activeSessionName,
                                    testScore: 0,
                                    assignmentScore: 0,
                                    examScore: 0,
                                    totalScore: 0,
                                    grade: newGrade,
                                    teacherRemark: `${newGrade} performance in ${item.name}`,
                                    isApproved: false
                                  };
                                  updated = [...allProcessedResultsList, newRec];
                                }
                                onSetResults(updated);
                                triggerSaveNotice(`Updated item: ${item.name}`);
                              }}
                              className="bg-slate-55 dark:bg-slate-880 px-3 py-1.5 rounded-lg border border-slate-201 dark:border-slate-700 font-bold text-slate-705 dark:text-slate-205 cursor-pointer text-xs"
                            >
                              <option value="EXCELLENT">EXCELLENT</option>
                              <option value="VERY GOOD">VERY GOOD</option>
                              <option value="GOOD">GOOD</option>
                              <option value="FAIR">FAIR</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })() : (
          <>
            
            {/* STEP 1: ATTENDANCE STAGE */}
            {activeStep === 'ATTENDANCE' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Term Attendance synchronization</h4>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/20 py-1 px-2.5 rounded-full">Attendance Verification</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Institutional Days opened</span>
                    <span className="text-2xl font-black text-slate-705 dark:text-slate-205 font-mono">{totalDaysOpened}</span>
                    <p className="text-[9px] text-slate-405 font-medium">Standard school calendar days</p>
                  </div>

                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Present Days verified</span>
                    {studentAttendanceRecords.length ? (
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{daysPresent}</span>
                    ) : (
                      <input 
                        type="number"
                        min={0}
                        max={totalDaysOpened}
                        value={manualDaysPresent}
                        onChange={(e) => setManualDaysPresent(Math.min(totalDaysOpened, Math.max(0, parseInt(e.target.value) || 0)))}
                        className="w-16 bg-white dark:bg-slate-800 text-center border rounded py-0.5 text-lg font-bold font-mono text-emerald-600"
                      />
                    )}
                    <p className="text-[9px] text-slate-405 font-medium">Recorded presence logs</p>
                  </div>

                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Absent Days recorded</span>
                    {studentAttendanceRecords.length ? (
                      <span className="text-2xl font-black text-rose-500 font-mono">{daysAbsent}</span>
                    ) : (
                      <input 
                        type="number"
                        min={0}
                        max={totalDaysOpened}
                        value={manualDaysAbsent}
                        onChange={(e) => {
                          const newAbsent = Math.min(totalDaysOpened, Math.max(0, parseInt(e.target.value) || 0));
                          setManualDaysPresent(totalDaysOpened - newAbsent);
                        }}
                        className="w-16 bg-white dark:bg-slate-800 text-center border rounded py-0.5 text-lg font-bold font-mono text-rose-500"
                      />
                    )}
                    <p className="text-[9px] text-slate-405 font-medium">Unexcused absence metrics</p>
                  </div>

                  <div className="bg-blue-50/40 dark:bg-blue-950/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/40 text-center space-y-1">
                    <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block font-mono">Term Presence index</span>
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">{attendancePercentage}%</span>
                    <p className="text-[9px] text-slate-405 font-medium">Active classroom participation</p>
                  </div>
                </div>

                <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-1.5 leading-relaxed">
                  <span className="font-extrabold uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <UserCheck size={14} className="text-blue-500" />
                    <span>Nigerian School Attendance Audit Integration</span>
                  </span>
                  <p>In SouthGold Montessori, student attendance yields an automatic performance clearance index. Verification of attendance must precede cognitive score entries. Confirm that active logs represent the ledger before proceeding to Continuous Assessment (CA) scoresheets.</p>
                </div>
              </div>
            )}

            {/* STEP 2: CA1 STAGE */}
            {activeStep === 'CA1' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">
                    {isReception ? 'Continuous Assessment Test Scoresheet' : 'CA1 (Class work/Test) Scoresheet'}
                  </h4>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/20 py-1 px-2.5 rounded-full">
                    Max weight: {isReception ? scoreLimits.receptionCa1Max : scoreLimits.ca1Max} marks
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-55 dark:bg-slate-850">
                      <tr className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4">Subject Field</th>
                        <th className="py-3 px-4 text-center w-48">
                          {isReception ? 'Test Score (Max 40)' : 'CA1 Score (Max 15)'}
                        </th>
                        <th className="py-3 px-4 text-right pr-6">Validation status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {targetStudentResults.map((r) => {
                        const subObj = subjects.find(s => s.id === r.subjectId);
                        const readableName = subObj ? subObj.name : r.subjectId;
                        const scores = unpackScores(r);
                        const maxVal = isReception ? scoreLimits.receptionCa1Max : scoreLimits.ca1Max;
                        const scoreError = scoreErrors[getScoreErrorKey(r.id, 'ca1')];
                        return (
                          <tr key={r.id} className="hover:bg-slate-55/10 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-755 dark:text-slate-250 uppercase">{readableName}</td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min={0}
                                max={maxVal}
                                value={getScoreInputValue(r.id, 'ca1', scores.ca1)}
                                onChange={(e) => {
                                  handleUpdateScore(r.id, 'ca1', e.target.value);
                                }}
                                className="w-24 bg-slate-50 dark:bg-slate-800 py-1.5 px-3 rounded border border-slate-200 dark:border-slate-700 text-center text-xs font-bold font-mono text-slate-800 dark:text-slate-100"
                              />
                              {scoreError && <p className="mt-1 text-[9px] font-bold text-red-600 dark:text-red-400">{scoreError}</p>}
                            </td>
                            <td className="py-3 px-4 text-right pr-6 font-mono text-[10px] text-emerald-600 font-bold">
                              ✓ Verified Within Scope
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STEP 3: CA2 STAGE */}
            {activeStep === 'CA2' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">CA2 (Homework/Assignment) Scoresheet</h4>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/20 py-1 px-2.5 rounded-full">Max weight: 15 marks</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-55 dark:bg-slate-850">
                      <tr className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4">Subject Field</th>
                        <th className="py-3 px-4 text-center w-48">CA2 Score (Max 15)</th>
                        <th className="py-3 px-4 text-right pr-6">Validation status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {targetStudentResults.map((r) => {
                        const subObj = subjects.find(s => s.id === r.subjectId);
                        const readableName = subObj ? subObj.name : r.subjectId;
                        const scores = unpackScores(r);
                        const scoreError = scoreErrors[getScoreErrorKey(r.id, 'ca2')];
                        return (
                          <tr key={r.id} className="hover:bg-slate-55/10 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-755 dark:text-slate-250 uppercase">{readableName}</td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min={0}
                                max={scoreLimits.ca2Max}
                                value={getScoreInputValue(r.id, 'ca2', scores.ca2)}
                                onChange={(e) => {
                                  handleUpdateScore(r.id, 'ca2', e.target.value);
                                }}
                                className="w-24 bg-slate-50 dark:bg-slate-800 py-1.5 px-3 rounded border border-slate-200 dark:border-slate-700 text-center text-xs font-bold font-mono text-slate-800 dark:text-slate-100"
                              />
                              {scoreError && <p className="mt-1 text-[9px] font-bold text-red-600 dark:text-red-400">{scoreError}</p>}
                            </td>
                            <td className="py-3 px-4 text-right pr-6 font-mono text-[10px] text-emerald-600 font-bold">
                              ✓ Verified Within Scope
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STEP 4: CA3 STAGE */}
            {activeStep === 'CA3' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">CA3 (Project/Midterm) Scoresheet</h4>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/20 py-1 px-2.5 rounded-full">Max weight: {ca3Max} marks</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-55 dark:bg-slate-850">
                      <tr className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4">Subject Field</th>
                        <th className="py-3 px-4 text-center w-48">CA3 Score (Max 10)</th>
                        <th className="py-3 px-4 text-right pr-6">Validation status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {targetStudentResults.map((r) => {
                        const subObj = subjects.find(s => s.id === r.subjectId);
                        const readableName = subObj ? subObj.name : r.subjectId;
                        const scores = unpackScores(r);
                        const scoreError = scoreErrors[getScoreErrorKey(r.id, 'ca3')];
                        return (
                          <tr key={r.id} className="hover:bg-slate-55/10 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-755 dark:text-slate-250 uppercase">{readableName}</td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min={0}
                                max={ca3Max}
                                value={getScoreInputValue(r.id, 'ca3', scores.ca3)}
                                onChange={(e) => {
                                  handleUpdateScore(r.id, 'ca3', e.target.value);
                                }}
                                className="w-24 bg-slate-50 dark:bg-slate-800 py-1.5 px-3 rounded border border-slate-200 dark:border-slate-700 text-center text-xs font-bold font-mono text-slate-800 dark:text-slate-100"
                              />
                              {scoreError && <p className="mt-1 text-[9px] font-bold text-red-600 dark:text-red-400">{scoreError}</p>}
                            </td>
                            <td className="py-3 px-4 text-right pr-6 font-mono text-[10px] text-emerald-600 font-bold">
                              ✓ Verified Within Scope
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STEP 5: EXAM STAGE */}
            {activeStep === 'EXAM' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Terminal examination record</h4>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/20 py-1 px-2.5 rounded-full">Max weight: {isReception ? scoreLimits.receptionExamMax : scoreLimits.examMax} marks</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-55 dark:bg-slate-850">
                      <tr className="text-[9.5px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-200 dark:border-slate-800">
                        <th className="py-3 px-4">Subject Field</th>
                        <th className="py-3 px-4 text-center w-48">Exam score (Max {examMax})</th>
                        <th className="py-3 px-4 text-right pr-6">Validation status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {targetStudentResults.map((r) => {
                        const subObj = subjects.find(s => s.id === r.subjectId);
                        const readableName = subObj ? subObj.name : r.subjectId;
                        const scores = unpackScores(r);
                        const scoreError = scoreErrors[getScoreErrorKey(r.id, 'exam')];
                        return (
                          <tr key={r.id} className="hover:bg-slate-55/10 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-755 dark:text-slate-250 uppercase">{readableName}</td>
                            <td className="py-3 px-4 text-center">
                              <input
                                type="number"
                                min={0}
                                max={isReception ? scoreLimits.receptionExamMax : scoreLimits.examMax}
                                value={getScoreInputValue(r.id, 'exam', scores.exam)}
                                onChange={(e) => {
                                  handleUpdateScore(r.id, 'exam', e.target.value);
                                }}
                                className="w-24 bg-slate-50 dark:bg-slate-800 py-1.5 px-3 rounded border border-slate-200 dark:border-slate-700 text-center text-xs font-bold font-mono text-slate-800 dark:text-slate-100"
                              />
                              {scoreError && <p className="mt-1 text-[9px] font-bold text-red-600 dark:text-red-400">{scoreError}</p>}
                            </td>
                            <td className="py-3 px-4 text-right pr-6 font-mono text-[10px] text-emerald-600 font-bold">
                              ✓ Verified Within Scope
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STEP 6: TOTAL & SAVE STAGE */}
            {activeStep === 'TOTAL_SAVE' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Consolidated Result worksheet Ledger</h4>
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/20 py-1 px-2.5 rounded-full font-mono">Cognitive Summation: 100%</span>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-slate-50 dark:bg-slate-855 z-10 border-b border-slate-200 dark:border-slate-800">
                      <tr className="text-[9px] uppercase font-bold text-slate-455">
                        <th className="py-3 px-4">Subject registered</th>
                        <th className="py-3 px-2 text-center">CA1 (15)</th>
                        <th className="py-3 px-2 text-center">CA2 (15)</th>
                        <th className="py-3 px-2 text-center">CA3 (10)</th>
                        <th className="py-3 px-2 text-center">Exam ({examMax})</th>
                        <th className="py-3 px-2 text-center">Total (100)</th>
                        <th className="py-3 px-2 text-center">Grade</th>
                        <th className="py-3 px-4 text-left w-64">Class Instructor Evaluation Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {targetStudentResults.map((r) => {
                        const subObj = subjects.find(s => s.id === r.subjectId);
                        const readableName = subObj ? subObj.name : r.subjectId;
                        const scores = unpackScores(r);
                        return (
                          <tr key={r.id} className="hover:bg-slate-55/10 transition-colors">
                            <td className="py-2 px-4 font-bold text-slate-705 dark:text-slate-205 uppercase">{readableName}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 dark:text-slate-400">{scores.ca1}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 dark:text-slate-400">{scores.ca2}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 dark:text-slate-400">{scores.ca3}</td>
                            <td className="py-2 px-2 text-center font-mono font-bold text-slate-600 dark:text-slate-400">{scores.exam}</td>
                            <td className="py-2 px-2 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">{scores.total}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded font-black font-mono text-[9px] ${
                                r.grade === 'A' ? 'bg-emerald-100 text-emerald-800' :
                                r.grade === 'B' ? 'bg-blue-100 text-blue-800 font-bold' :
                                r.grade === 'C' ? 'bg-amber-100 text-amber-805' :
                                r.grade === 'P' ? 'bg-indigo-100 text-indigo-800' :
                                'bg-rose-105 text-rose-800'
                              }`}>
                                {r.grade}
                              </span>
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={r.teacherRemark || ''}
                                onChange={(e) => {
                                  handleUpdateScore(r.id, 'teacherRemark', e.target.value);
                                  triggerSaveNotice(`Saved custom evaluative comment for ${readableName}`);
                                }}
                                placeholder="Write specific evaluative remark..."
                                className="w-full bg-slate-50 dark:bg-slate-800 py-1 px-2.5 rounded border border-slate-201 text-[11px] focus:outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerSaveNotice("Success: Worksheet ledger saved successfully to cloud repository.");
                      setActiveStep('SUBMIT');
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-2 px-6 rounded-xl flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>Save Worksheet Ledger & Continue</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: SUBMIT STAGE */}
            {activeStep === 'SUBMIT' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Terminal Result lock & Submit</h4>
                  <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/20 py-1 px-2.5 rounded-full font-mono">Formal Submission Phase</span>
                </div>

                <div className="bg-slate-55 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-center space-y-4 max-w-xl mx-auto">
                  <h5 className="text-sm font-extrabold text-slate-705 dark:text-slate-250 uppercase tracking-wider">Cognitive Performance index</h5>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Cumulative Total</span>
                      <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{totalScoreSum} marks</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Academic Average</span>
                      <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{averageScore}%</span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 text-blue-800 border border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40 text-[11px] rounded-lg text-left leading-relaxed">
                    <strong>Submission Audit:</strong> Submitting these terminal scores will formally publish them to the student and parent portal dashboards. Once submitted, they are marked for official stamp publication and can only be altered by a School Administrator.
                  </div>

                  <div className="flex justify-center gap-3 pt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setActiveStep('TOTAL_SAVE')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2 px-5 rounded-xl border border-slate-205 transition-all"
                    >
                      Return to Worksheet
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="bg-slate-600 hover:bg-slate-700 text-white font-extrabold text-xs py-2 px-5 rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <Save size={14} />
                      <span>Save as Draft (Status: DRAFT)</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleFormallySubmitToAdmin}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2 px-6 rounded-xl flex items-center gap-1.5 transition-all shadow-md"
                    >
                      <CheckSquare size={14} />
                      <span>Lock & Submit to Admin (Status: SUBMITTED)</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </>
        )}

      </div>
      )}

      {/* WORKFLOW BACK & NEXT BUTTONS ROW */}
      {(editorViewMode === 'WIZARD' && !isPreschoolMode) && (
        <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-between items-center text-xs">
          <button
            type="button"
            disabled={activeStep === 'ATTENDANCE'}
            onClick={() => {
              const keys: WorkflowStep[] = ['ATTENDANCE', 'CA1', 'CA2', 'CA3', 'EXAM', 'TOTAL_SAVE', 'SUBMIT'];
              const currentIdx = keys.indexOf(activeStep);
              if (currentIdx > 0) setActiveStep(keys[currentIdx - 1]);
            }}
            className="inline-flex items-center gap-1 py-1.8 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer transition-all border border-slate-200 dark:border-slate-800"
          >
            <ChevronLeft size={14} />
            <span>Previous Step</span>
          </button>

          <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-slate-400">
            {stepsList.findIndex(s => s.key === activeStep) + 1} of 7 Phases Completed
          </span>

          <button
            type="button"
            disabled={activeStep === 'SUBMIT'}
            onClick={() => {
              const keys: WorkflowStep[] = ['ATTENDANCE', 'CA1', 'CA2', 'CA3', 'EXAM', 'TOTAL_SAVE', 'SUBMIT'];
              const currentIdx = keys.indexOf(activeStep);
              if (currentIdx < keys.length - 1) setActiveStep(keys[currentIdx + 1]);
            }}
            className="inline-flex items-center gap-1 py-1.8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer transition-all"
          >
            <span>Next Phase</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

    </div>
  );
}
