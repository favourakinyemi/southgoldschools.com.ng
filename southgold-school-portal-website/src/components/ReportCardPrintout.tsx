import React, { useMemo } from 'react';
import { Student, ResultRecord, SchoolTerm, Subject, AssessmentItem } from '../types';
import { Check, X } from 'lucide-react';
import { EarlyYearsResultRecord } from './EarlyYearsResultEditor';
import { isReceptionClass } from '../data/preschoolSkills';
import { cleanAcademicSession, formatOptionalDate, formatTermSession } from '../lib/portalDisplay';

interface ReportCardPrintoutProps {
  targetStudent: Student | undefined;
  targetStudentResults: ResultRecord[];
  isPreschoolMode: boolean;
  activeSessionName: string;
  selectedTerm: SchoolTerm;
  reportType?: 'EOT' | 'EOS';
  subjects: Subject[];
  config: any;
  gradingScale: { grade: string; min: number; remark: string }[];
  classmates: Student[];
  allProcessedResultsList: ResultRecord[];
  isAdminOrSuper?: boolean;
  handleToggleApproveResult?: (id: string) => void;
  isEarlyYearsClass?: boolean;
  earlyYearsResults?: EarlyYearsResultRecord[];
  classesWithSubjects?: { classId: string; subjects: string[]; stage?: 'Pre-School' | 'Primary' | 'Secondary' }[];
  assessmentItems?: AssessmentItem[];
  attendance?: any[];
}

const unpackScores = (r: ResultRecord) => {
  const ca1 = r.testScore || 0;
  const packed = r.assignmentScore || 0;
  const ca2 = packed % 100;
  const ca3 = Math.floor(packed / 100);
  const exam = r.examScore || 0;
  const total = ca1 + ca2 + ca3 + exam;
  return { ca1, ca2, ca3, exam, total };
};

const unpackRemarks = (rawRemark: string) => {
  const classMatch = rawRemark.match(/Class Teacher:\s*(.*?)(?=\s*\|\s*(Head Teacher|Principal)|$)/i);
  const headMatch = rawRemark.match(/Head Teacher:\s*(.*?)(?=\s*\|\s*(Class Teacher|Principal)|$)/i);
  const principalMatch = rawRemark.match(/Principal:\s*(.*?)(?=\s*\|\s*(Class Teacher|Head Teacher)|$)/i);

  if (!rawRemark.includes('Class Teacher:') && !rawRemark.includes('Head Teacher:') && !rawRemark.includes('Principal:')) {
    return {
      classTeacherRemark: rawRemark.trim(),
      headTeacherRemark: '',
      principalRemark: ''
    };
  }

  return {
    classTeacherRemark: classMatch ? classMatch[1].trim() : '',
    headTeacherRemark: headMatch ? headMatch[1].trim() : '',
    principalRemark: principalMatch ? principalMatch[1].trim() : ''
  };
};

export default function ReportCardPrintout({
  targetStudent,
  targetStudentResults,
  isPreschoolMode,
  activeSessionName,
  selectedTerm,
  reportType = 'EOT',
  subjects,
  config,
  gradingScale,
  classmates,
  allProcessedResultsList,
  isAdminOrSuper = false,
  handleToggleApproveResult,
  isEarlyYearsClass = false,
  earlyYearsResults = [],
  classesWithSubjects = [],
  assessmentItems = [],
  attendance = []
}: ReportCardPrintoutProps) {

  const studentAttendanceRecords = useMemo(() => {
    if (!targetStudent?.id) return [];
    return (attendance || []).filter((a: any) => 
      a.entityId === targetStudent.id && 
      a.session === activeSessionName &&
      (reportType === 'EOS' ? true : a.term === selectedTerm)
    );
  }, [attendance, targetStudent, selectedTerm, activeSessionName, reportType]);

  const daysOpened = studentAttendanceRecords.length;
  const daysPresent = daysOpened 
    ? studentAttendanceRecords.filter((a: any) => a.status === 'Present' || a.status === 'Late').length 
    : 0;
  const daysAbsent = Math.max(0, daysOpened - daysPresent);
  const attendancePercentage = daysOpened > 0 ? Math.round((daysPresent / daysOpened) * 100) : null;
  const sessionDisplayName = cleanAcademicSession(activeSessionName, selectedTerm) || activeSessionName;
  const termSessionLabel = formatTermSession(selectedTerm, activeSessionName);

  const studentAssessmentItems = useMemo(() => {
    if (!targetStudent?.classId) return [];
    const targetClassLower = targetStudent.classId.toLowerCase();
    const isChecklistClass = (targetClassLower.includes('toddler') || targetClassLower.includes('preschool') || targetClassLower.includes('pre-school')) && !targetClassLower.includes('reception');
    
    if (!isChecklistClass) return [];

    const filtered = (assessmentItems || []).filter(item => 
      !item.classId || 
      item.classId.toLowerCase() === targetClassLower ||
      (targetClassLower.includes('preschool') && item.classId.toLowerCase().includes('preschool')) ||
      (targetClassLower.includes('toddler') && item.classId.toLowerCase().includes('toddler'))
    );
    return filtered.length > 0 ? filtered : (assessmentItems || []);
  }, [assessmentItems, targetStudent]);

  const halfIndex = Math.ceil(studentAssessmentItems.length / 2);
  const leftItems = studentAssessmentItems.slice(0, halfIndex);
  const rightItems = studentAssessmentItems.slice(halfIndex);

  const getItemRating = (item: AssessmentItem, idx: number): string => {
    if (targetStudent && earlyYearsResults && earlyYearsResults.length > 0) {
      const ey = earlyYearsResults.find(r => 
        r.studentId === targetStudent.id &&
        r.term === selectedTerm &&
        (
          r.id.endsWith(`_${item.id}`) ||
          r.id === `res_ey_${targetStudent.id}_${selectedTerm.replace(/\s+/g, '_')}_${activeSessionName.replace(/[\/\s]+/g, '_')}_${item.id}` ||
          r.subjectId === item.id
        )
      );
      if (ey?.rating) return ey.rating;
    }
    const rec = targetStudentResults.find(r => 
      r.subjectId === item.id || 
      r.id.endsWith(`_${item.id}`)
    );
    return rec?.grade || '';
  };

  const allItemRatings = useMemo(() => {
    return studentAssessmentItems.map((item, idx) => getItemRating(item, idx)).filter(Boolean);
  }, [studentAssessmentItems, earlyYearsResults, targetStudentResults, targetStudent, selectedTerm, activeSessionName]);

  const excellentCount = useMemo(() => allItemRatings.filter(r => r === 'EXCELLENT').length + targetStudentResults.filter(r => r.grade === 'EXCELLENT').length, [allItemRatings, targetStudentResults]);
  const veryGoodCount = useMemo(() => allItemRatings.filter(r => r === 'VERY GOOD').length + targetStudentResults.filter(r => r.grade === 'VERY GOOD').length, [allItemRatings, targetStudentResults]);
  const goodCount = useMemo(() => allItemRatings.filter(r => r === 'GOOD').length + targetStudentResults.filter(r => r.grade === 'GOOD').length, [allItemRatings, targetStudentResults]);
  const fairCount = useMemo(() => allItemRatings.filter(r => r === 'FAIR').length + targetStudentResults.filter(r => r.grade === 'FAIR').length, [allItemRatings, targetStudentResults]);

  // Calculate statistics consistently
  const activeStudentSum = useMemo(() => {
    return targetStudentResults.reduce((sum, r) => sum + r.totalScore, 0);
  }, [targetStudentResults]);

  const activeStudentAverage = useMemo(() => {
    return targetStudentResults.length > 0
      ? (activeStudentSum / targetStudentResults.length).toFixed(1)
      : '0';
  }, [targetStudentResults, activeStudentSum]);

  const customRemarkRec = useMemo(() => {
    return targetStudentResults.find(r => r.teacherRemark && !r.teacherRemark.includes('performance in'));
  }, [targetStudentResults]);

  const preschoolTeacherRemark = useMemo(() => {
    return customRemarkRec?.teacherRemark || '';
  }, [customRemarkRec]);

  const unpackedRemarksObj = useMemo(() => {
    const raw = customRemarkRec ? customRemarkRec.teacherRemark : '';
    return unpackRemarks(raw);
  }, [customRemarkRec]);

  return (
    <div id="printable-report-card" className="mx-auto max-w-[210mm] p-6 md:p-8 space-y-6 flex-1 bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 print:shadow-none print:ring-0">
      {isPreschoolMode ? (
        <div className="space-y-6">
          {/* Logo and address */}
          <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-250 dark:border-slate-800 pb-3">
            {config?.logoUrl ? (
              <img 
                src={config.logoUrl} 
                alt="School Logo" 
                className="w-14 h-14 object-contain rounded-xl shadow-md shrink-0 bg-white p-0.5 border" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl tracking-wider shadow-md select-none shrink-0 border border-blue-500">
                SG
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">{config?.schoolName || 'SOUTHGOLD SCHOOLS'}</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 max-w-xl leading-relaxed">
                {[config?.schoolAddress, config?.schoolEmail, config?.schoolPhone].filter(Boolean).join(' | ') || 'Official school academic record'}
              </p>
            </div>
          </div>

          {/* Header Badge */}
          <div className="bg-indigo-50 dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 text-center py-2 px-4 rounded-xl">
            <h3 className="text-xs font-black uppercase text-indigo-900 dark:text-indigo-100 tracking-wider font-display flex items-center justify-center gap-1.5">
              <span>Early Years Cognitive & Milestone Evaluation Report</span>
            </h3>
            <p className="text-[9.5px] text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-widest mt-0.5">
              {reportType === 'EOS' ? `End of Session Evaluation | ${sessionDisplayName} Session` : termSessionLabel}
            </p>
          </div>

          {/* Student Profile Block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-3xs bg-white dark:bg-slate-900 text-xs">
              <div className="bg-slate-50 dark:bg-slate-850 px-4 py-2 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500">
                Pupil Demographic Profile
              </div>
              <div className="p-3 space-y-2">
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-405 font-semibold">Pupil Full Name:</span>
                  <span className="font-black text-slate-800 dark:text-slate-100">{targetStudent?.firstName} {targetStudent?.lastName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-405 font-semibold">Admission ID:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{targetStudent?.admissionNo}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1.5">
                  <span className="text-slate-405 font-semibold">Class Grouping:</span>
                  <span className="font-bold text-indigo-650 dark:text-indigo-405">{targetStudent?.classId}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-405">Gender & Date of Birth:</span>
                  <span className="text-slate-700 dark:text-slate-300">{targetStudent?.gender || 'Not available'} | {targetStudent?.dateOfBirth || 'Not available'}</span>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-3xs bg-white dark:bg-slate-900 text-xs">
              <div className="bg-slate-50 dark:bg-slate-850 px-4 py-2 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500">
                Early-Stage Developmental Keys
              </div>
              <div className="p-3 space-y-2">
                {config?.earlyYearsGradingScale?.map((scale: any) => (
                  <div key={scale.grade} className="flex gap-2 items-start text-[10px]">
                    <span className="bg-indigo-50 text-indigo-600 font-black px-1.5 py-0.5 rounded text-[9px] uppercase w-28 text-center shrink-0">
                      {scale.grade}
                    </span>
                    <span className="text-slate-505 leading-relaxed">{scale.remark}</span>
                  </div>
                )) || [
                  { grade: 'Excellent', remark: 'Demonstrates exceptional mastery and consistent application.' },
                  { grade: 'Very Good', remark: 'Shows high competence and handles tasks independently.' },
                  { grade: 'Good', remark: 'Satisfactory development; meets expectations consistently.' },
                  { grade: 'Fair', remark: 'Developing skill; requires occasional guidance.' },
                  { grade: 'Needs Improvement', remark: 'Requires closer monitoring and targeted practice.' }
                ].map((scale: any) => (
                  <div key={scale.grade} className="flex gap-2 items-start text-[10px]">
                    <span className="bg-indigo-50 text-indigo-600 font-black px-1.5 py-0.5 rounded text-[9px] uppercase w-28 text-center shrink-0">
                      {scale.grade}
                    </span>
                    <span className="text-slate-550 leading-relaxed">{scale.remark}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Core Developmental Area Ratings Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-3xs">
            <div className="bg-slate-50 dark:bg-slate-850 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs font-black uppercase text-slate-700 dark:text-slate-300 font-display">Competency & Cognitive Area Evaluations</h4>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-black border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2.5 px-4 w-3/5">Developmental domain</th>
                  <th className="py-2.5 px-4 text-center">Assessed competency level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {(() => {
                  if (studentAssessmentItems && studentAssessmentItems.length > 0) {
                    return studentAssessmentItems.map((item, idx) => {
                      const rating = getItemRating(item, idx) || 'Good';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/10">
                          <td className="py-2.5 px-4 font-semibold text-xs text-slate-800 dark:text-slate-200">
                            {item.name}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span className="inline-flex bg-indigo-50/85 text-indigo-650 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                              {rating}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  }

                  const classMap = classesWithSubjects?.find(c => c.classId?.toLowerCase() === targetStudent?.classId?.toLowerCase());
                  const assignedSubjectIds = classMap ? classMap.subjects : [];
                  const classSubjects = subjects.filter(sub => assignedSubjectIds.includes(sub.id));

                  if (classSubjects.length === 0) {
                    return (
                      <tr>
                        <td colSpan={2} className="py-4 px-4 text-center text-xs text-slate-400">
                          No assigned subjects or evaluations found for this class. Please assign subjects in Subject Management.
                        </td>
                      </tr>
                    );
                  }

                  return classSubjects.map(sub => {
                    const rec = targetStudentResults?.find(r => r.subjectId === sub.id) ||
                      earlyYearsResults?.find(r => r.studentId === targetStudent?.id && r.subjectId === sub.id);
                    const rating = rec ? ((rec as any).grade || (rec as any).rating || 'Not assessed') : 'Not assessed';

                    return (
                      <tr key={sub.id} className="hover:bg-slate-50/10">
                        <td className="py-2.5 px-4 font-semibold text-xs text-slate-800 dark:text-slate-200">
                          {sub.name}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="inline-flex bg-indigo-50/85 text-indigo-650 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                            {rating}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      ) : false ? (
        <div className="space-y-6">
          {/* Page 1: Branding, Rating keys, Conduct matrix, Student Details, and comments */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Key to Ratings & Conducts */}
              <div className="lg:col-span-4 space-y-4">
                {/* Key to Ratings table */}
                <div className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-3xs">
                  <h4 className="text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-205 uppercase border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-1.5 text-center">KEY TO RATINGS</h4>
                  <table className="w-full text-[9.5px]">
                    <thead>
                      <tr className="border-b border-slate-250 dark:border-slate-800 text-slate-400 font-extrabold uppercase">
                        <th className="pb-1 text-left">RATING</th>
                        <th className="pb-1 text-center">NUMBER</th>
                        <th className="pb-1 text-center font-display">ALPHABET</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-semibold text-slate-700 dark:text-slate-300">
                      <tr><td className="py-1">Excellent</td><td className="py-1 text-center font-mono">5</td><td className="py-1 text-center font-bold">A</td></tr>
                      <tr><td className="py-1">Very Good</td><td className="py-1 text-center font-mono">4</td><td className="py-1 text-center font-bold">B</td></tr>
                      <tr><td className="py-1">Good</td><td className="py-1 text-center font-mono">3</td><td className="py-1 text-center font-bold">C</td></tr>
                      <tr><td className="py-1">Fair</td><td className="py-1 text-center font-mono">2</td><td className="py-1 text-center font-bold">D</td></tr>
                      <tr><td className="py-1">Poor</td><td className="py-1 text-center font-mono">1</td><td className="py-1 text-center font-bold">E</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* Observation of Conducts table */}
                <div className="border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 rounded-xl shadow-3xs">
                  <h4 className="text-[10px] font-black tracking-widest text-slate-800 dark:text-slate-205 uppercase border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-1.5 text-center">OBSERVATION OF CONDUCTS</h4>
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr className="border-b border-slate-250 dark:border-slate-800 text-slate-400 font-extrabold uppercase">
                        <th className="pb-1 text-left">OBSERVATIONS</th>
                        <th className="pb-1 text-center w-8">A</th>
                        <th className="pb-1 text-center w-8">B</th>
                        <th className="pb-1 text-center w-8">C</th>
                        <th className="pb-1 text-center w-8">D</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-bold text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                      {[
                        "Honesty",
                        "Neatness",
                        "Punctuality",
                        "Complete Task In Time",
                        "Sport Activities",
                        "Organizational Skills",
                        "Works Independently",
                        "Team Support",
                        "Handwriting"
                      ].map((conduct) => (
                        <tr key={conduct} className="hover:bg-slate-50/50">
                          <td className="py-1 text-slate-800 dark:text-slate-200 text-[9.5px] leading-tight font-medium">{conduct}</td>
                          <td className="py-1 text-center text-slate-400 text-[11px]">-</td>
                          <td className="py-1 text-center text-slate-400 text-[11px]">-</td>
                          <td className="py-1 text-center text-slate-400 text-[11px]">-</td>
                          <td className="py-1 text-center text-slate-400 text-[11px]">-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right School branding, Pupil Specifications, and comments */}
              <div className="lg:col-span-8 space-y-4">
                {/* Logo and address */}
                <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-250 dark:border-slate-800 pb-3">
                  {config?.logoUrl ? (
                    <img 
                      src={config.logoUrl} 
                      alt="School Logo" 
                      className="w-14 h-14 object-contain rounded-xl shadow-md shrink-0 bg-white p-0.5 border" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl tracking-wider shadow-md select-none shrink-0 border border-blue-500">
                      SG
                    </div>
                  )}
                  <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">{config?.schoolName || 'SOUTHGOLD SCHOOLS'}</h2>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 max-w-xl leading-relaxed">
                      {[config?.schoolAddress, config?.schoolEmail, config?.schoolPhone].filter(Boolean).join(' | ') || 'Official school academic record'}
                    </p>
                  </div>
                </div>

                {/* Header Badge */}
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center py-2 px-4 rounded-xl">
                  <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider font-display">
                    {reportType === 'EOS' ? `END OF SESSION (ANNUAL) REPORT SHEET (${activeSessionName}) - ${targetStudent?.classId.toUpperCase()}` : `${selectedTerm.toUpperCase()} (${activeSessionName}) ${targetStudent?.classId.toUpperCase()} REPORT SHEET`}
                  </h3>
                </div>

                {/* Profile Grid Table */}
                <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-3xs bg-white dark:bg-slate-900">
                  <table className="w-full text-xs border-collapse divide-y divide-slate-200 dark:divide-slate-800">
                    <tbody>
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td className="p-2 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500 dark:text-slate-405 w-2/5 text-[11px]">Pupil Full Name:</td>
                        <td className="p-2 font-black text-slate-800 dark:text-slate-100 text-[12.5px]">{targetStudent?.firstName} {targetStudent?.lastName}</td>
                      </tr>
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td className="p-2 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500 dark:text-slate-405 text-[11px]">Admission ID Number:</td>
                        <td className="p-2 font-mono font-bold text-blue-600 dark:text-blue-400">{targetStudent?.admissionNo}</td>
                      </tr>
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td className="p-2 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500 dark:text-slate-405 text-[11px]">Gender Profile:</td>
                        <td className="p-2 font-semibold text-slate-700 dark:text-slate-300">{targetStudent?.gender || 'Male'}</td>
                      </tr>
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td className="p-2 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500 dark:text-slate-405 text-[11px]">Date of Birth / Age:</td>
                        <td className="p-2 font-semibold text-slate-705 dark:text-slate-300">{targetStudent?.dateOfBirth || '2019-05-12'} (5 Years)</td>
                      </tr>
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td className="p-2 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500 dark:text-slate-405 text-[11px]">Academic Grade Class:</td>
                        <td className="p-2 font-black text-slate-800 dark:text-slate-100">{targetStudent?.classId}</td>
                      </tr>
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td className="p-2 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500 dark:text-slate-405 text-[11px]">Form Class Teacher:</td>
                        <td className="p-2 font-semibold text-slate-705 dark:text-slate-300">Form Teacher</td>
                      </tr>
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td className="p-2 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500 dark:text-slate-405 text-[11px]">No. of Times School Opened:</td>
                        <td className="p-2 font-mono font-semibold text-slate-705 dark:text-slate-300">{daysOpened} Days</td>
                      </tr>
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td className="p-2 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500 dark:text-slate-405 text-[11px]">No. of Days Attended:</td>
                        <td className="p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400">{daysPresent} Days ({attendancePercentage}%)</td>
                      </tr>
                      <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                        <td className="p-2 bg-slate-50 dark:bg-slate-850 font-bold text-slate-500 dark:text-slate-405 text-[11px]">Term Resumption Date:</td>
                        <td className="p-2 font-semibold text-slate-705 dark:text-slate-250">12 January 2026</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Comment sections side by side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 shadow-3xs">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-405 uppercase pb-1 mb-1 border-b border-slate-200 dark:border-slate-850">ACADEMIC COMMENT/REMARK</h4>
                    <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 italic font-semibold mt-1">
                      {targetStudent?.firstName} enjoys morning circles. In numeracy can write 1-5 perfectly, in literacy can write a-e, in Montessori knows animals, shapes, colours.
                    </p>
                  </div>
                  <div className="border border-slate-300 dark:border-slate-700 rounded-xl p-3 bg-white dark:bg-slate-900 shadow-3xs">
                    <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-405 uppercase pb-1 mb-1 border-b border-slate-200 dark:border-slate-850">TEACHER'S COMMENT/REMARK</h4>
                    <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 italic font-medium mt-1">
                      "{preschoolTeacherRemark}"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Page 2 indicator row - force page break on PDF rendering */}
          <div className="print-page-break" />

          {/* Page 2 of report card: Two category tables side-by-side representing all 70 Competencies */}
          <div className="space-y-4 pt-4 print:pt-0">
            <div className="text-center py-2 border-t-2 border-b-2 border-slate-800 dark:border-slate-200">
              <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest font-display">DEVELOPMENTAL COMPETENCY & SKILL CHECKLIST</h3>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              {/* Left Checklist Table (Columns 1-35) */}
              <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-3xs bg-white dark:bg-slate-900">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold uppercase text-[9px]">
                      <th className="py-2.5 px-2 w-[8%] text-center border-r border-slate-200 dark:border-slate-800">#</th>
                      <th className="py-2.5 px-2 w-[52%] border-r border-slate-200 dark:border-slate-800">SUBJECT SKILLS & COMPETENCIES</th>
                      <th className="py-2.5 px-1 text-center w-[10%] border-r border-slate-200 dark:border-slate-800">EXCEL</th>
                      <th className="py-2.5 px-1 text-center w-[10%] border-r border-slate-200 dark:border-slate-800">V.GD</th>
                      <th className="py-2.5 px-1 text-center w-[10%] border-r border-slate-200 dark:border-slate-800">GOOD</th>
                      <th className="py-2.5 px-1 text-center w-[10%]">FAIR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {leftItems.map((item, idx) => {
                      const itemNum = idx + 1;
                      const rating = getItemRating(item, idx);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/40 divide-x divide-slate-100 dark:divide-slate-855">
                          <td className="py-1.5 px-2 text-center font-bold font-mono text-slate-400">{itemNum}</td>
                          <td className="py-1.5 px-2 font-semibold text-slate-800 dark:text-slate-250 leading-snug">{item.name}</td>
                          <td className="py-1.5 px-2 text-center text-blue-600 dark:text-blue-400 font-extrabold text-[12px]">{rating === 'EXCELLENT' ? '✓' : ''}</td>
                          <td className="py-1.5 px-2 text-center text-blue-600 dark:text-blue-400 font-extrabold text-[12px]">{rating === 'VERY GOOD' ? '✓' : ''}</td>
                          <td className="py-1.5 px-2 text-center text-blue-600 dark:text-blue-400 font-extrabold text-[12px]">{rating === 'GOOD' ? '✓' : ''}</td>
                          <td className="py-1.5 px-2 text-center text-blue-600 dark:text-blue-400 font-extrabold text-[12px]">{rating === 'FAIR' ? '✓' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Right Checklist Table */}
              <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden shadow-3xs bg-white dark:bg-slate-900">
                <table className="w-full text-left text-[10px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-extrabold uppercase text-[9px]">
                      <th className="py-2.5 px-2 w-[8%] text-center border-r border-slate-200 dark:border-slate-800">#</th>
                      <th className="py-2.5 px-2 w-[52%] border-r border-slate-200 dark:border-slate-800">SUBJECT SKILLS & COMPETENCIES</th>
                      <th className="py-2.5 px-1 text-center w-[10%] border-r border-slate-200 dark:border-slate-800">EXCEL</th>
                      <th className="py-2.5 px-1 text-center w-[10%] border-r border-slate-200 dark:border-slate-800">V.GD</th>
                      <th className="py-2.5 px-1 text-center w-[10%] border-r border-slate-200 dark:border-slate-800">GOOD</th>
                      <th className="py-2.5 px-1 text-center w-[10%]">FAIR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {rightItems.map((item, idx) => {
                      const actualIdx = idx + halfIndex;
                      const itemNum = actualIdx + 1;
                      const rating = getItemRating(item, actualIdx);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/40 divide-x divide-slate-100 dark:divide-slate-855">
                          <td className="py-1.5 px-2 text-center font-bold font-mono text-slate-400">{itemNum}</td>
                          <td className="py-1.5 px-2 font-semibold text-slate-800 dark:text-slate-202 leading-snug">{item.name}</td>
                          <td className="py-1.5 px-2 text-center text-blue-600 dark:text-blue-400 font-extrabold text-[12px]">{rating === 'EXCELLENT' ? '✓' : ''}</td>
                          <td className="py-1.5 px-2 text-center text-blue-600 dark:text-blue-400 font-extrabold text-[12px]">{rating === 'VERY GOOD' ? '✓' : ''}</td>
                          <td className="py-1.5 px-2 text-center text-blue-600 dark:text-blue-400 font-extrabold text-[12px]">{rating === 'GOOD' ? '✓' : ''}</td>
                          <td className="py-1.5 px-2 text-center text-blue-600 dark:text-blue-400 font-extrabold text-[12px]">{rating === 'FAIR' ? '✓' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Progress indices & metrics summary counts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-b border-slate-200 dark:border-slate-800 py-4 mt-6">
            <div>
              <span className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-455 block">Pupil Progress Metrics Summary</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-1.5 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Excellent: {excellentCount}</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Very Good: {veryGoodCount}</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Good: {goodCount}</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Fair: {fairCount}</span>
              </div>
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-slate-455 block">Evaluation Milestone Coverage</span>
              <p className="text-lg font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">{targetStudentResults.length} of {studentAssessmentItems.length || targetStudentResults.length} Assessment Items</p>
              <span className="text-[10px] text-slate-455 font-bold block mt-0.5">{((targetStudentResults.length / (studentAssessmentItems.length || 1)) * 100).toFixed(0)}% Curricular Assessment Coverage</span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-black text-slate-455 block">Principal Evaluation Seal</span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 italic mt-1 leading-relaxed">
                "Promising development milestones assessed in preschool environment. Performance validated."
              </p>
            </div>
          </div>

          {/* Sign off stamps */}
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="border-t border-slate-300 dark:border-slate-800 pt-2.5 text-center">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Form Teacher</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Instructor / Form Teacher</span>
            </div>
            <div className="border-t border-slate-300 dark:border-slate-800 pt-2.5 text-center">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Form Teacher</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Principal Official Stamp</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Branding matching the high-fidelity template */}
          <div className="flex flex-col sm:flex-row items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
            {config?.logoUrl ? (
              <img 
                src={config.logoUrl} 
                alt="School Logo" 
                className="w-14 h-14 object-contain rounded-xl shadow-md shrink-0 bg-white p-0.5 border" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl tracking-wider shadow-md select-none shrink-0 border border-blue-500">
                SG
              </div>
            )}
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">{config?.schoolName || 'SOUTHGOLD MONTESSORI SCHOOL'}</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5 max-w-xl leading-relaxed">
                {config?.schoolAddress || '3, Fagbeyi Ige, Olusi crescent, Hopeville Estate, Haruna B/Stop. Sangotedo, Lagos, Nigeria'} <br/>
                {config?.schoolEmail || 'southgoldmontessorischools@gmail.com'}
              </p>
            </div>
          </div>

          {/* Header Badge */}
          <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center py-2 px-4 rounded-xl">
            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider font-display">
              {selectedTerm.toUpperCase()} {activeSessionName} ACADEMIC REPORT CONTINUOUS LEDGER
            </h3>
          </div>

          {/* Student specifications */}
          <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-3xs">
            <table className="w-full text-xs divide-y divide-slate-200 dark:divide-slate-800">
              <tbody>
                <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                  <td className="p-2 w-1/3 bg-slate-50 dark:bg-slate-855 font-bold text-slate-500 dark:text-slate-405 border-r border-slate-200 dark:border-slate-800">Pupil Full Name:</td>
                  <td className="p-2 font-black text-slate-800 dark:text-slate-100 text-[12.5px]">{targetStudent?.firstName} {targetStudent?.lastName}</td>
                </tr>
                <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                  <td className="p-2 bg-slate-50 dark:bg-slate-855 font-bold text-slate-500 dark:text-slate-405 border-r border-slate-200 dark:border-slate-800">Admission No.:</td>
                  <td className="p-2 font-mono font-bold text-blue-600 dark:text-blue-400">{targetStudent?.admissionNo}</td>
                </tr>
                <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                  <td className="p-2 bg-slate-50 dark:bg-slate-855 font-bold text-slate-500 dark:text-slate-405 border-r border-slate-200 dark:border-slate-800">Gender & Attendance:</td>
                  <td className="p-2 font-semibold text-slate-700 dark:text-slate-300">
                    {targetStudent?.gender || 'Male'} • Attended {daysPresent}/{daysOpened} Days ({attendancePercentage}%)
                  </td>
                </tr>
                <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                  <td className="p-2 bg-slate-50 dark:bg-slate-855 font-bold text-slate-500 dark:text-slate-405 border-r border-slate-200 dark:border-slate-800">Academic Class Arm:</td>
                  <td className="p-2 font-bold text-slate-800 dark:text-slate-200">{targetStudent?.classId} {targetStudent?.arm}</td>
                </tr>
                <tr className="divide-x divide-slate-200 dark:divide-slate-800">
                  <td className="p-2 bg-slate-50 dark:bg-slate-854 font-bold text-slate-500 dark:text-slate-405 border-r border-slate-200 dark:border-slate-800">Teacher assigned:</td>
                  <td className="p-2 font-semibold text-slate-700 dark:text-slate-300">Form Teacher</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Score Ledger List */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black tracking-widest text-slate-400 dark:text-slate-405 uppercase">SUBJECT SCORE LEDGER ASSESSMENT</h4>
            <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-3xs">
              <table className="w-full text-left text-xs">
                <thead>
                  {isReceptionClass(targetStudent?.classId) ? (
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-300 uppercase text-[9.5px]">
                      <th className="py-2.5 px-3">Subject Entitled</th>
                      <th className="py-2.5 px-3 text-center">Test / CA (40)</th>
                      <th className="py-2.5 px-3 text-center">Exams (60)</th>
                      <th className="py-2.5 px-3 text-center">Total (100)</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                      <th className="py-2.5 px-3 no-print">Publishing Status</th>
                    </tr>
                  ) : (
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-300 uppercase text-[9.5px]">
                      <th className="py-2.5 px-3">Subject Entitled</th>
                      <th className="py-2.5 px-3 text-center">CA1 (15)</th>
                      <th className="py-2.5 px-3 text-center">CA2 (15)</th>
                      <th className="py-2.5 px-3 text-center">CA3 (10)</th>
                      <th className="py-2.5 px-3 text-center">Exams (60)</th>
                      <th className="py-2.5 px-3 text-center">Total (100)</th>
                      <th className="py-2.5 px-3 text-center">Grade</th>
                      <th className="py-2.5 px-3 no-print">Publishing Status</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {targetStudentResults.length > 0 ? (
                    targetStudentResults.map(res => {
                      const sub = subjects.find(s => s.id === res.subjectId);
                      const scores = unpackScores(res);
                      const isReception = isReceptionClass(targetStudent?.classId);
                      return (
                        <tr key={res.id} className="text-slate-700 dark:text-slate-300">
                          <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-250">{sub?.name || res.subjectId}</td>
                          <td className="py-2 px-3 text-center font-mono">{scores.ca1}</td>
                          {!isReception && <td className="py-2 px-3 text-center font-mono">{scores.ca2}</td>}
                          {!isReception && <td className="py-2 px-3 text-center font-mono">{scores.ca3}</td>}
                          <td className="py-2 px-3 text-center font-mono">{scores.exam}</td>
                          <td className="py-2 px-3 text-center font-bold font-mono text-slate-800 dark:text-slate-100">{scores.total}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="font-mono bg-blue-50 text-blue-600 dark:bg-blue-955/40 dark:text-blue-400 py-0.5 px-1.8 font-black rounded text-[10px] border border-blue-150">
                              {res.grade}
                            </span>
                          </td>
                          <td className="py-2 px-3 no-print">
                            {isAdminOrSuper && handleToggleApproveResult ? (
                              <button
                                onClick={() => handleToggleApproveResult(res.id)}
                                className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider py-1 px-1.8 rounded border leading-none cursor-pointer ${
                                  res.isApproved 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-355' 
                                    : 'bg-rose-50 text-rose-700 border-rose-250 dark:bg-rose-950/40 dark:text-rose-355'
                                }`}
                              >
                                {res.isApproved ? <Check size={10} /> : <X size={10} />}
                                <span>{res.isApproved ? 'Approved' : 'Pending'}</span>
                              </button>
                            ) : (
                              <span className={`text-[9.5px] font-black uppercase ${res.isApproved ? 'text-emerald-500' : 'text-amber-500 animate-pulse'}`}>
                                {res.isApproved ? 'Published' : 'Under Review'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400 italic font-semibold">
                        No marked academic grade records detected for this child this term.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Progress evaluations metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-b border-slate-200 dark:border-slate-800 py-4 mt-6">
            <div className="text-center md:text-left">
              <span className="text-[9px] uppercase font-bold text-slate-455 block">Terminal Average Percentage</span>
              <p className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1">{activeStudentAverage}%</p>
              <span className="text-[10px] text-slate-400 block mt-0.5">Computed across {targetStudentResults.length} course studies</span>
            </div>
            <div className="text-center md:text-left space-y-2">
              <div>
                <span className="text-[9px] uppercase font-bold text-indigo-650 dark:text-indigo-400 block">Class Instructor Evaluation</span>
                <p className="text-xs font-semibold text-slate-705 dark:text-slate-300 mt-0.5 italic leading-relaxed">
                  {unpackedRemarksObj.classTeacherRemark ? `"${unpackedRemarksObj.classTeacherRemark}"` : '"Awaiting custom teacher report commentary."'}
                </p>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-455 block">Head Teacher Evaluation</span>
                <p className="text-xs font-semibold text-slate-705 dark:text-slate-300 mt-0.5 italic leading-relaxed">
                  {unpackedRemarksObj.headTeacherRemark ? `"${unpackedRemarksObj.headTeacherRemark}"` : '"Awaiting Head Teacher evaluative remark."'}
                </p>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-455 block">Principal Academic Remark</span>
                <p className="text-xs font-semibold text-slate-705 dark:text-slate-300 italic leading-relaxed">
                  {unpackedRemarksObj.principalRemark ? `"${unpackedRemarksObj.principalRemark}"` : (
                    parseFloat(activeStudentAverage) >= 80 
                      ? 'Promising excellence showing exemplary cognitive performance. Keep it up.' 
                      : parseFloat(activeStudentAverage) >= 55 
                      ? 'A good record displaying average academic focus. Can achieve higher standard.' 
                      : 'Requires intensive home tutoring support for terminal recovery.'
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Signature panels */}
          <div className="grid grid-cols-2 gap-8 pt-4">
            <div className="border-t border-slate-250 dark:border-slate-800 pt-3 text-center">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-205">Form Teacher</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">Class Room Teacher</span>
            </div>
            <div className="border-t border-slate-250 dark:border-slate-800 pt-3 text-center">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-205">Head Teacher / Principal</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 block">School Authority Signature</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
