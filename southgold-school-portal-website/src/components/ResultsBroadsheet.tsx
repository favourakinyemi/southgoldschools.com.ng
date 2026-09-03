import React from 'react';
import { BarChart3, BookOpen, GraduationCap, UserRound } from 'lucide-react';
import { ResultRecord, SchoolTerm, Student, Subject } from '../types';
import { buildResultScoreLimits, unpackResultScores } from '../lib/resultScoreValidation';
import { isReceptionClass } from '../data/preschoolSkills';
import { Tabs } from './shared';

type BroadsheetMode = 'CLASS' | 'SUBJECT' | 'STUDENT';

interface ResultsBroadsheetProps {
  students: Student[];
  results: ResultRecord[];
  subjects: Subject[];
  classes: string[];
  activeSessionName: string;
  activeTerm: SchoolTerm;
  gradingScale: { grade: string; min: number; remark: string }[];
  config?: {
    caTestMax?: number;
    caAssignmentMax?: number;
    examMax?: number;
  };
  classesWithSubjects?: { classId: string; subjects: string[]; stage?: 'Pre-School' | 'Primary' | 'Secondary' }[];
}

const TERMS: SchoolTerm[] = ['First Term', 'Second Term', 'Third Term'];

const displayDash = '—';

const getStudentName = (student: Student) => `${student.firstName} ${student.lastName}`.trim();

export default function ResultsBroadsheet({
  students,
  results,
  subjects,
  classes,
  activeSessionName,
  activeTerm,
  gradingScale,
  config,
  classesWithSubjects = []
}: ResultsBroadsheetProps) {
  const [mode, setMode] = React.useState<BroadsheetMode>('CLASS');
  const [selectedSession, setSelectedSession] = React.useState(activeSessionName);
  const [selectedTerm, setSelectedTerm] = React.useState<SchoolTerm>(activeTerm);
  const [selectedClass, setSelectedClass] = React.useState(classes[0] || '');
  const [selectedSubject, setSelectedSubject] = React.useState(subjects[0]?.id || '');
  const [selectedStudent, setSelectedStudent] = React.useState(students[0]?.id || '');

  React.useEffect(() => {
    if (!selectedClass && classes[0]) setSelectedClass(classes[0]);
  }, [classes, selectedClass]);

  const limits = buildResultScoreLimits(config);
  const selectedClassIsReception = isReceptionClass(selectedClass);
  const sessionOptions = React.useMemo(() => {
    const values = new Set<string>([activeSessionName]);
    results.forEach(result => {
      if (result.session) values.add(result.session);
    });
    return Array.from(values).filter(Boolean).sort();
  }, [activeSessionName, results]);

  const studentsInClass = React.useMemo(() => (
    students
      .filter(student => student.classId === selectedClass)
      .sort((a, b) => getStudentName(a).localeCompare(getStudentName(b)))
  ), [selectedClass, students]);

  const classSubjectIds = React.useMemo(() => {
    const blueprint = classesWithSubjects.find(item => item.classId?.toLowerCase() === selectedClass.toLowerCase());
    const fromBlueprint = blueprint?.subjects || [];
    const fromStudents = studentsInClass.flatMap(student => student.subjects || []);
    const fromResults = results
      .filter(result => result.classId === selectedClass && result.term === selectedTerm && result.session === selectedSession)
      .map(result => result.subjectId);
    return Array.from(new Set([...fromBlueprint, ...fromStudents, ...fromResults])).filter(Boolean);
  }, [classesWithSubjects, results, selectedClass, selectedSession, selectedTerm, studentsInClass]);

  const classSubjects = React.useMemo(() => (
    classSubjectIds
      .map(subjectId => subjects.find(subject => subject.id === subjectId))
      .filter((subject): subject is Subject => Boolean(subject))
      .sort((a, b) => a.name.localeCompare(b.name))
  ), [classSubjectIds, subjects]);

  React.useEffect(() => {
    if (classSubjects.length > 0 && !classSubjects.some(subject => subject.id === selectedSubject)) {
      setSelectedSubject(classSubjects[0].id);
    }
  }, [classSubjects, selectedSubject]);

  React.useEffect(() => {
    if (studentsInClass.length > 0 && !studentsInClass.some(student => student.id === selectedStudent)) {
      setSelectedStudent(studentsInClass[0].id);
    }
  }, [selectedStudent, studentsInClass]);

  const filteredResults = React.useMemo(() => (
    results.filter(result =>
      result.session === selectedSession &&
      result.term === selectedTerm &&
      result.classId === selectedClass
    )
  ), [results, selectedClass, selectedSession, selectedTerm]);

  const getResult = (studentId: string, subjectId: string) => filteredResults.find(result =>
    result.studentId === studentId && result.subjectId === subjectId
  );

  const getGrade = (score: number) => {
    const sorted = [...gradingScale].sort((a, b) => b.min - a.min);
    return sorted.find(item => score >= item.min)?.grade || '';
  };

  const subjectResults = studentsInClass.map(student => ({
    student,
    result: getResult(student.id, selectedSubject),
  }));

  const selectedStudentRecord = students.find(student => student.id === selectedStudent);
  const studentResults = selectedStudentRecord
    ? classSubjects.map(subject => ({ subject, result: getResult(selectedStudentRecord.id, subject.id) }))
    : [];

  const renderFilters = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <label className="block">
        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Session</span>
        <select value={selectedSession} onChange={(event) => setSelectedSession(event.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold">
          {sessionOptions.map(session => <option key={session} value={session}>{session}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Term</span>
        <select value={selectedTerm} onChange={(event) => setSelectedTerm(event.target.value as SchoolTerm)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold">
          {TERMS.map(term => <option key={term} value={term}>{term}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Class</span>
        <select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold">
          {classes.map(className => <option key={className} value={className}>{className}</option>)}
        </select>
      </label>
      {mode === 'SUBJECT' && (
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Subject</span>
          <select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold">
            {classSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
          </select>
        </label>
      )}
      {mode === 'STUDENT' && (
        <label className="block">
          <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Student</span>
          <select value={selectedStudent} onChange={(event) => setSelectedStudent(event.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs font-bold">
            {studentsInClass.map(student => <option key={student.id} value={student.id}>{getStudentName(student)}</option>)}
          </select>
        </label>
      )}
    </div>
  );

  const renderScoreCells = (result?: ResultRecord) => {
    if (!result) {
      return selectedClassIsReception ? (
        <>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
        </>
      ) : (
        <>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
          <td className="py-3 px-3 text-center text-slate-400">{displayDash}</td>
        </>
      );
    }
    const scores = unpackResultScores(result);
    return selectedClassIsReception ? (
      <>
        <td className="py-3 px-3 text-center font-mono">{scores.ca1}</td>
        <td className="py-3 px-3 text-center font-mono">{scores.exam}</td>
        <td className="py-3 px-3 text-center font-mono font-black">{scores.ca1 + scores.exam}</td>
        <td className="py-3 px-3 text-center font-bold">{result.grade || getGrade(scores.ca1 + scores.exam) || displayDash}</td>
      </>
    ) : (
      <>
        <td className="py-3 px-3 text-center font-mono">{scores.ca1}</td>
        <td className="py-3 px-3 text-center font-mono">{scores.ca2}</td>
        <td className="py-3 px-3 text-center font-mono">{scores.ca3}</td>
        <td className="py-3 px-3 text-center font-mono">{scores.exam}</td>
        <td className="py-3 px-3 text-center font-mono font-black">{scores.total}</td>
        <td className="py-3 px-3 text-center font-bold">{result.grade || getGrade(scores.total) || displayDash}</td>
      </>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Academic Broadsheet
          </h3>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Read-only terminal result analysis using the existing score records and assessment structure.
          </p>
        </div>
      </div>

      <Tabs
        items={[
          { id: 'CLASS', label: 'By Class', icon: <GraduationCap size={14} /> },
          { id: 'SUBJECT', label: 'By Subject', icon: <BookOpen size={14} /> },
          { id: 'STUDENT', label: 'By Student', icon: <UserRound size={14} /> },
        ]}
        active={mode}
        onChange={(id) => setMode(id as BroadsheetMode)}
      />

      {renderFilters()}

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
        {mode === 'CLASS' && (
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-[10px] uppercase text-slate-400 font-black">
              <tr>
                <th className="py-3 px-4 min-w-52">Student</th>
                {classSubjects.map(subject => <th key={subject.id} className="py-3 px-3 text-center min-w-28">{subject.name}</th>)}
                <th className="py-3 px-3 text-center min-w-28">Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {studentsInClass.map(student => {
                const totals = classSubjects
                  .map(subject => getResult(student.id, subject.id))
                  .filter((result): result is ResultRecord => Boolean(result))
                  .map(result => unpackResultScores(result).total);
                const average = totals.length ? Math.round((totals.reduce((sum, value) => sum + value, 0) / totals.length) * 10) / 10 : null;
                return (
                  <tr key={student.id} className="text-slate-700 dark:text-slate-300">
                    <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{getStudentName(student)}</td>
                    {classSubjects.map(subject => {
                      const result = getResult(student.id, subject.id);
                      return (
                        <td key={subject.id} className="py-3 px-3 text-center font-mono">
                          {result ? unpackResultScores(result).total : displayDash}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-center font-mono font-black">{average ?? displayDash}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {mode === 'SUBJECT' && (
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-[10px] uppercase text-slate-400 font-black">
              <tr>
                <th className="py-3 px-4 min-w-52">Student</th>
                {selectedClassIsReception ? (
                  <>
                    <th className="py-3 px-3 text-center">CA /{limits.receptionCa1Max}</th>
                    <th className="py-3 px-3 text-center">Exam /{limits.receptionExamMax}</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-3 text-center">CA1 /{limits.ca1Max}</th>
                    <th className="py-3 px-3 text-center">CA2 /{limits.ca2Max}</th>
                    <th className="py-3 px-3 text-center">CA3 /{limits.ca3Max}</th>
                    <th className="py-3 px-3 text-center">Exam /{limits.examMax}</th>
                  </>
                )}
                <th className="py-3 px-3 text-center">Total /100</th>
                <th className="py-3 px-3 text-center">Grade</th>
                <th className="py-3 px-4 min-w-60">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjectResults.map(({ student, result }) => (
                <tr key={student.id} className="text-slate-700 dark:text-slate-300">
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{getStudentName(student)}</td>
                  {renderScoreCells(result)}
                  <td className="py-3 px-4 text-slate-500">{result?.teacherRemark || displayDash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {mode === 'STUDENT' && (
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-850 text-[10px] uppercase text-slate-400 font-black">
              <tr>
                <th className="py-3 px-4 min-w-52">Subject</th>
                {selectedClassIsReception ? (
                  <>
                    <th className="py-3 px-3 text-center">CA /{limits.receptionCa1Max}</th>
                    <th className="py-3 px-3 text-center">Exam /{limits.receptionExamMax}</th>
                  </>
                ) : (
                  <>
                    <th className="py-3 px-3 text-center">CA1 /{limits.ca1Max}</th>
                    <th className="py-3 px-3 text-center">CA2 /{limits.ca2Max}</th>
                    <th className="py-3 px-3 text-center">CA3 /{limits.ca3Max}</th>
                    <th className="py-3 px-3 text-center">Exam /{limits.examMax}</th>
                  </>
                )}
                <th className="py-3 px-3 text-center">Total /100</th>
                <th className="py-3 px-3 text-center">Grade</th>
                <th className="py-3 px-4 min-w-60">Remark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {studentResults.map(({ subject, result }) => (
                <tr key={subject.id} className="text-slate-700 dark:text-slate-300">
                  <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">{subject.name}</td>
                  {renderScoreCells(result)}
                  <td className="py-3 px-4 text-slate-500">{result?.teacherRemark || displayDash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
