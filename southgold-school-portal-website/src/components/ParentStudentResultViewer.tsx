import React, { useState, useMemo } from 'react';
import { FileText, Printer, AlertCircle, Award, Percent, ChevronRight, MessageSquare } from 'lucide-react';
import { Student, ResultRecord, SchoolTerm, Subject } from '../types';
import ReportCardPrintout from './ReportCardPrintout';
import { isChecklistPreschoolClass } from '../data/preschoolSkills';
import { EarlyYearsResultRecord } from './EarlyYearsResultEditor';

interface ParentStudentResultViewerProps {
  classmates: Student[];
  allProcessedResultsList: ResultRecord[];
  selectedTerm: SchoolTerm;
  activeSessionName: string;
  subjects: Subject[];
  onShowNotice: (msg: string) => void;
  gradingScale: { grade: string; min: number; remark: string }[];
  config: any;
  currentRole: 'PARENT' | 'STUDENT';
  classesWithSubjects?: { classId: string; subjects: string[]; stage?: 'Pre-School' | 'Primary' | 'Secondary' }[];
  earlyYearsResults?: EarlyYearsResultRecord[];
  attendance?: any[];
}

export default function ParentStudentResultViewer({
  classmates,
  allProcessedResultsList,
  selectedTerm: initialTerm,
  activeSessionName,
  subjects,
  onShowNotice,
  gradingScale,
  config,
  currentRole,
  classesWithSubjects = [],
  earlyYearsResults = [],
  attendance = []
}: ParentStudentResultViewerProps) {
  const [selectedChildId, setSelectedChildId] = useState<string>(() => classmates[0]?.id || '');
  const [term, setTerm] = useState<SchoolTerm>(initialTerm);
  const [showPrintNotice, setShowPrintNotice] = useState<boolean>(true);

  const selectedChild = useMemo(() => {
    return classmates.find(c => c.id === selectedChildId);
  }, [classmates, selectedChildId]);

  const isEarlyYearsClass = useMemo(() => {
    if (!selectedChild) return false;
    const classId = selectedChild.classId || '';
    const classMap = classesWithSubjects?.find(c => c.classId?.toLowerCase() === classId.toLowerCase());
    return classMap?.stage === 'Pre-School' || 
      ['toddler', 'creche', 'playgroup', 'nursery', 'reception', 'preschool', 'pre-school', 'kindergarten'].some(word => classId.toLowerCase().includes(word));
  }, [selectedChild, classesWithSubjects]);

  const publishedEarlyYearsResults = useMemo(() => {
    if (!selectedChild) return [];
    return earlyYearsResults.filter(r => 
      r.studentId === selectedChild.id && 
      r.term === term && 
      r.session === activeSessionName &&
      r.status === 'PUBLISHED'
    );
  }, [earlyYearsResults, selectedChild, term, activeSessionName]);

  // Filter results: ONLY show results for selected child, term, session, and STRICTLY with status === 'PUBLISHED'
  const publishedResults = useMemo(() => {
    if (!selectedChild) return [];
    return allProcessedResultsList.filter(r => 
      r.studentId === selectedChild.id && 
      r.term === term && 
      r.session === activeSessionName &&
      r.status === 'PUBLISHED'
    );
  }, [allProcessedResultsList, selectedChild, term, activeSessionName]);

  // Helper to unpack scores
  const unpackScores = (res: ResultRecord) => {
    const ca1 = res.testScore || 0;
    const ca2 = (res.assignmentScore || 0) % 100;
    const ca3 = Math.floor((res.assignmentScore || 0) / 100);
    const exam = res.examScore || 0;
    const total = ca1 + ca2 + ca3 + exam;
    return { ca1, ca2, ca3, exam, total };
  };

  const totals = useMemo(() => {
    if (publishedResults.length === 0) return { sum: 0, avg: 0 };
    const sum = publishedResults.reduce((acc, r) => acc + unpackScores(r).total, 0);
    const avg = Math.round((sum / publishedResults.length) * 10) / 10;
    return { sum, avg };
  }, [publishedResults]);

  const overallRemarks = useMemo(() => {
    const customRec = publishedResults.find(r => r.teacherRemark && !r.teacherRemark.includes('performance in'));
    const raw = customRec?.teacherRemark || '';
    
    const classMatch = raw.match(/Class Teacher:\s*(.*?)(?=\s*\|\s*(Head Teacher|Principal)|$)/i);
    const headMatch = raw.match(/Head Teacher:\s*(.*?)(?=\s*\|\s*(Class Teacher|Principal)|$)/i);
    const principalMatch = raw.match(/Principal:\s*(.*?)(?=\s*\|\s*(Class Teacher|Head Teacher)|$)/i);

    if (!raw.includes('Class Teacher:') && !raw.includes('Head Teacher:') && !raw.includes('Principal:')) {
      return {
        classTeacherRemark: raw.trim(),
        headTeacherRemark: '',
        principalRemark: ''
      };
    }

    return {
      classTeacherRemark: classMatch ? classMatch[1].trim() : '',
      headTeacherRemark: headMatch ? headMatch[1].trim() : '',
      principalRemark: principalMatch ? principalMatch[1].trim() : ''
    };
  }, [publishedResults]);

  const handlePrint = () => {
    window.print();
  };

  if (classmates.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center max-w-lg mx-auto shadow-xs space-y-3">
        <AlertCircle className="mx-auto text-amber-550" size={36} />
        <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">No linked profiles detected</h3>
        <p className="text-xs text-slate-455 leading-relaxed">
          There are no student portal profiles linked with your parent account. Please contact the school's administrative office to link your children.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selection Control Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {currentRole === 'PARENT' && (
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Select Ward (Child)</label>
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3.5 rounded-lg border-0 text-slate-700 dark:text-slate-300 w-full sm:w-48 cursor-pointer font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-550"
              >
                {classmates.map(c => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Terminal Term</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value as SchoolTerm)}
              className="bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3.5 rounded-lg border-0 text-slate-700 dark:text-slate-300 w-full sm:w-36 cursor-pointer font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-550"
            >
              <option value="First Term">First Term</option>
              <option value="Second Term">Second Term</option>
              <option value="Third Term">Third Term</option>
            </select>
          </div>
        </div>

        <div>
          <button
            onClick={handlePrint}
            disabled={isEarlyYearsClass ? publishedEarlyYearsResults.length === 0 : publishedResults.length === 0}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
          >
            <Printer size={14} />
            <span>Print Report Card</span>
          </button>
        </div>
      </div>

      {/* Iframe sandbox printing instruction banner */}
      {showPrintNotice && (
        <div className="no-print p-3.5 bg-indigo-50 border border-indigo-200 dark:bg-slate-800/80 dark:border-slate-700 rounded-xl text-xs text-indigo-950 dark:text-slate-200 flex gap-3 items-start shadow-xs relative">
          <span className="text-sm select-none">💡</span>
          <div className="space-y-1 pr-6">
            <p className="font-extrabold text-[11.5px] text-indigo-900 dark:text-indigo-400">Viewing inside AI Studio's iframe preview?</p>
            <p className="leading-relaxed opacity-90 text-[10.5px]">
              Browsers protect security by restricting print dialogue commands (`window.print()`) inside sandboxed preview iframes.
            </p>
            <p className="leading-relaxed font-bold mt-1 text-[11px]">
              For a flawless PDF copy or full paper printout, click the <span className="underline">"Open App" or external link icon</span> at the very top-right corner of your preview panel to run the app in a **new top-level tab**, then click <strong>Print Report Card</strong>!
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Note: Page headers/footers (like dates, URLs, and page numbers) are browser-controlled print settings. You can toggle them in your browser's print options window under "Headers and footers".
            </p>
          </div>
          <button 
            onClick={() => setShowPrintNotice(false)}
            className="absolute top-2.5 right-2 text-indigo-400 hover:text-indigo-700 dark:hover:text-amber-300 font-bold p-1 cursor-pointer text-[10px]"
            aria-label="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {selectedChild && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          {/* Student Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 dark:border-slate-800 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <img 
                src={selectedChild.photo} 
                alt={selectedChild.firstName} 
                className="w-14 h-14 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
                referrerPolicy="no-referrer"
              />
              <div>
                <h2 className="text-base font-black text-slate-805 dark:text-slate-100 uppercase tracking-tight">
                  {selectedChild.firstName} {selectedChild.lastName}
                </h2>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 py-0.5 px-2 rounded-md">
                    ADM: {selectedChild.admissionNo}
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-605 py-0.5 px-2 rounded-md">
                    CLASS: {selectedChild.classId} {selectedChild.arm}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto">
              <span className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest block">
                Session context
              </span>
              <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 font-mono mt-0.5 block">
                {activeSessionName} • {term}
              </span>
            </div>
          </div>

          {/* Results Display */}
          {(isEarlyYearsClass ? publishedEarlyYearsResults.length > 0 : publishedResults.length > 0) ? (
            <div className="space-y-6">
              <ReportCardPrintout
                targetStudent={selectedChild}
                targetStudentResults={publishedResults}
                isPreschoolMode={isChecklistPreschoolClass(selectedChild?.classId || '', classesWithSubjects)}
                activeSessionName={activeSessionName}
                selectedTerm={term}
                subjects={subjects}
                config={config}
                gradingScale={gradingScale}
                classmates={classmates}
                allProcessedResultsList={allProcessedResultsList}
                isAdminOrSuper={false}
                isEarlyYearsClass={isEarlyYearsClass}
                earlyYearsResults={earlyYearsResults}
                attendance={attendance}
              />
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-xl p-8 text-center space-y-2">
              <AlertCircle className="mx-auto text-indigo-600" size={28} />
              <p className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Awaiting Official Stamp Publication</p>
              <p className="text-xs text-slate-455 max-w-sm mx-auto leading-relaxed">
                Academic records for {selectedChild.firstName} {selectedChild.lastName} in {term} are currently undergoing final administrative validation. Please check back shortly.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
