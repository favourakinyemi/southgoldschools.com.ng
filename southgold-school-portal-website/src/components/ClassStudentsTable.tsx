import React, { useState } from 'react';
import { Clock, MessageSquare, Edit, BookOpen, List, FileText, X, Save } from 'lucide-react';
import { Student, ResultRecord, SchoolTerm } from '../types';

interface ClassStudentsTableProps {
  classmates: Student[];
  onSelectStudent: (id: string, mode: 'LIST' | 'EOT' | 'EOS' | 'SCORES') => void;
  onShowNotice: (msg: string) => void;
  searchText: string;
  setSearchText: (txt: string) => void;
  allProcessedResultsList: ResultRecord[];
  onSetResults: (res: ResultRecord[]) => void;
  selectedTerm: SchoolTerm;
  activeSessionName: string;
}

export default function ClassStudentsTable({
  classmates,
  onSelectStudent,
  onShowNotice,
  searchText,
  setSearchText,
  allProcessedResultsList,
  onSetResults,
  selectedTerm,
  activeSessionName
}: ClassStudentsTableProps) {
  const [commentingStudent, setCommentingStudent] = useState<Student | null>(null);
  const [tempComment, setTempComment] = useState('');

  
  const filteredClassmates = classmates.filter(std => {
    const term = searchText.toLowerCase();
    return (
      std.firstName.toLowerCase().includes(term) ||
      std.lastName.toLowerCase().includes(term) ||
      std.admissionNo.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
      {/* Search and Header controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 gap-4">
        <div>
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5">
            <FileText size={14} className="text-indigo-600" />
            <span>Class Students Manager</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Click respective options in each row to edit academic sheets or prepare Terminal Report Cards.</p>
        </div>
        
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold w-full sm:w-auto">
          <span>Search:</span>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search pupil or admission ID..."
            className="w-full sm:w-48 bg-slate-50 dark:bg-slate-850 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-750 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-350 border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-black uppercase text-slate-455 tracking-wider border-b border-slate-200 dark:border-slate-800">
              <th className="py-3.5 px-4 text-slate-400 font-bold">STUDENT NAME</th>
              <th className="py-3.5 px-4 text-slate-400 font-bold">GENDER</th>
              <th className="py-3.5 px-4 text-slate-400 font-bold">PHONE</th>
              <th className="py-3.5 px-4 text-slate-400 font-bold">OPTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredClassmates.map((std, idx) => {
              // Extract phone digits or keep clean like standard screenshot format
              const rawPhone = std.parentPhone.replace(/[\s+()-]+/g, '');
              const formattedPhone = rawPhone.length > 10 ? rawPhone.slice(-13) : "000000000000";

              const studentResults = allProcessedResultsList.filter(r => 
                r.studentId === std.id && 
                r.term === selectedTerm && 
                r.session === activeSessionName
              );
              const customRemarkRec = studentResults.find(r => r.teacherRemark && !r.teacherRemark.includes('performance in'));
              const savedRemark = customRemarkRec ? customRemarkRec.teacherRemark : '';
              const hasComment = !!savedRemark;

              return (
                <tr key={std.id} className="hover:bg-slate-50/20 dark:hover:bg-slate-805/10 transition-colors">
                  {/* Avatar + name display */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={std.photo} 
                        alt={std.firstName} 
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" 
                        referrerPolicy="no-referrer" 
                      />
                      <div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200 leading-tight">
                          {std.firstName} {std.lastName}
                        </p>
                        <span className="text-[9.5px] font-mono font-bold text-slate-400 dark:text-slate-500 block mt-0.5">
                          {std.admissionNo}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Gender display */}
                  <td className="py-3 px-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {std.gender}
                  </td>

                  {/* Phone digits */}
                  <td className="py-3 px-4 text-xs font-semibold font-mono text-slate-600 dark:text-slate-400">
                    {formattedPhone}
                  </td>

                  {/* Button options matching screenshots precisely */}
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Attendance clock icon */}
                      <button
                        type="button"
                        onClick={() => onShowNotice(`Synced attendance registry check for ${std.firstName}: 96% present.`)}
                        title="Attendance Register"
                        className="p-1 px-1.5 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer bg-white dark:bg-slate-900 transition-all shadow-3xs"
                      >
                        <Clock size={13} />
                      </button>

                      {/* Teacher evaluation comment button (formerly direct messaging) */}
                      <button
                        type="button"
                        onClick={() => {
                          setCommentingStudent(std);
                          setTempComment(savedRemark);
                        }}
                        title={hasComment ? `Edit Comment: "${savedRemark}"` : "Add/Edit Teacher Comment"}
                        className={`p-1 px-1.5 border rounded-lg cursor-pointer transition-all shadow-3xs flex items-center gap-1 ${
                          hasComment 
                            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 font-semibold" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        <MessageSquare size={13} />
                        {hasComment && <span className="text-[8px] bg-amber-500 text-white w-1.5 h-1.5 rounded-full block"></span>}
                      </button>

                      {/* Edit/Enter Scores text button */}
                      <button
                        type="button"
                        onClick={() => onSelectStudent(std.id, 'SCORES')}
                        className="text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:border-slate-350 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                      >
                        <Edit size={11} className="text-slate-500" />
                        <span>Edit/Enter Scores</span>
                      </button>

                      {/* EOT Report button */}
                      <button
                        type="button"
                        onClick={() => onSelectStudent(std.id, 'EOT')}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-indigo-200 dark:border-indigo-900/40 py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                      >
                        <BookOpen size={11} className="text-indigo-500" />
                        <span>EOT Report</span>
                      </button>

                      {/* EOS Report button */}
                      <button
                        type="button"
                        onClick={() => onSelectStudent(std.id, 'EOS')}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-indigo-200 dark:border-indigo-900/40 py-1.5 px-3 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-3xs"
                      >
                        <BookOpen size={11} className="text-indigo-500" />
                        <span>EOS Report</span>
                      </button>

                      {/* List options icon */}
                      <button
                        type="button"
                        onClick={() => onShowNotice(`Active row index: #${idx + 1} for ${std.firstName} ${std.lastName}`)}
                        title="Options / settings"
                        className="p-1 px-1.5 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg cursor-pointer bg-white dark:bg-slate-900 transition-all shadow-3xs"
                      >
                        <List size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredClassmates.length === 0 && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-slate-400 italic">
                  No students found matching current directory criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {commentingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-widest flex items-center gap-1.5 font-display">
                  <MessageSquare size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Teacher Evaluation Comment</span>
                </h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                  Student: <span className="text-slate-700 dark:text-slate-300 font-extrabold">{commentingStudent.firstName} {commentingStudent.lastName}</span> ({commentingStudent.admissionNo})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCommentingStudent(null)}
                className="text-slate-400 hover:text-slate-650 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                Write or select a report comment below:
              </label>
              <textarea
                value={tempComment}
                onChange={(e) => setTempComment(e.target.value)}
                rows={3}
                placeholder="Enter custom comments on academic growth, classroom attitude, strengths, etc."
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-850 dark:text-slate-100 placeholder-slate-400 shadow-3xs"
              />

              {/* Template quick-click suggestions */}
              <div className="space-y-1.5">
                <span className="text-[9px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">Quick comment presets:</span>
                <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto pr-1">
                  {[
                    "Promising excellence showing exemplary cognitive performance. Keep it up.",
                    "A good record displaying average academic focus. Can achieve higher standard.",
                    "Requires intensive home tutoring support for terminal recovery.",
                    "Diligent pupil, highly focused cognitive performance and excellent behavior.",
                    "A very active and helpful classmate. Highly dedicated.",
                    "Showing steady academic progress but needs to pay more attention in subsequent terms.",
                    "Exhibits great leadership traits and excellent concentration during group activities."
                  ].map((preset, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      onClick={() => setTempComment(preset)}
                      className="text-left text-[10.5px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-850 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-800 py-2 px-3 rounded-lg transition-all cursor-pointer truncate"
                      title={preset}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setCommentingStudent(null)}
                className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const studentResults = allProcessedResultsList.filter(r => 
                    r.studentId === commentingStudent.id && 
                    r.term === selectedTerm && 
                    r.session === activeSessionName
                  );
                  if (studentResults.length === 0) {
                    onShowNotice(`Please enter grades first before saving reports card comments for ${commentingStudent.firstName}.`);
                    return;
                  }
                  const updated = allProcessedResultsList.map(r => {
                    if (
                      r.studentId === commentingStudent.id &&
                      r.term === selectedTerm &&
                      r.session === activeSessionName
                    ) {
                      return { ...r, teacherRemark: tempComment };
                    }
                    return r;
                  });
                  onSetResults(updated);
                  onShowNotice(`Saved custom evaluative comment for ${commentingStudent.firstName}.`);
                  setCommentingStudent(null);
                }}
                className="bg-indigo-605 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer select-none"
              >
                <Save size={13} />
                <span>Save Comments</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
