import React, { useState } from 'react';
import { 
  IdCard, 
  Printer, 
  Search, 
  Check, 
  Sparkles, 
  Building, 
  ShieldAlert 
} from 'lucide-react';
import { Student, Teacher, UserRole } from '../types';

interface PrintableIdCardProps {
  currentRole: UserRole;
  students: Student[];
  teachers: Teacher[];
  logoUrl?: string;
}

export default function PrintableIdCard({
  currentRole,
  students,
  teachers,
  logoUrl
}: PrintableIdCardProps) {
  
  const [selectedType, setSelectedType] = useState<'Student' | 'Teacher'>('Student');
  const [selectedEntityId, setSelectedEntityId] = useState(students[0]?.id ?? '');

  const [notif, setNotif] = useState<string | null>(null);
  
  // Notice banner state to assist iframe preview environments with browser print constraints
  const [showPrintNotice, setShowPrintNotice] = useState(() => {
    return typeof window !== 'undefined' && window.self !== window.top;
  });

  // Filter lists based on type
  const targetStudent = students.find(s => s.id === selectedEntityId);
  const targetTeacher = teachers.find(t => t.id === selectedEntityId);

  const handlePrintId = () => {
    try {
      window.print();
      if (typeof window !== 'undefined' && window.self !== window.top) {
        setShowPrintNotice(true);
      }
      showNotice('Printed badge profile successfully.');
    } catch (e) {
      console.warn("Print dialogue blocked by secure iframe sandbox preview context.", e);
      setShowPrintNotice(true);
    }
  };

  const handleTypeSwitch = (type: 'Student' | 'Teacher') => {
    setSelectedType(type);
    setSelectedEntityId(type === 'Student' ? students[0]?.id : teachers[0]?.id);
  };

  const showNotice = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3500);
  };

  return (
    <div className="space-y-6">

      {/* Info status */}
      {notif && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-2">
          <Check size={14} />
          <span>{notif}</span>
        </div>
      )}

      {/* Double config selection row */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => handleTypeSwitch('Student')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
              selectedType === 'Student' 
                ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm' 
                : 'text-slate-400 hover:text-slate-700 bg-slate-50 dark:bg-slate-800 border-transparent'
            }`}
          >
            🧑 Pupil ID Badges
          </button>
          <button
            onClick={() => handleTypeSwitch('Teacher')}
            className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all border ${
              selectedType === 'Teacher' 
                ? 'bg-blue-600 text-white border-blue-500 font-bold shadow-sm' 
                : 'text-slate-400 hover:text-slate-700 bg-slate-50 dark:bg-slate-800 border-transparent'
            }`}
          >
            👩‍🏫 Staff ID Badges
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs text-slate-450 font-semibold mb-0 block whitespace-nowrap">Select Profile:</label>
          <select
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 py-2 px-3 text-xs w-full sm:w-56 focus:outline-none border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            {selectedType === 'Student' ? (
              students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName} ({s.admissionNo})
                </option>
              ))
            ) : (
              teachers.map(t => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName} ({t.staffId})
                </option>
              ))
            )}
          </select>
        </div>

        <button
          onClick={handlePrintId}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2 text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
        >
          <Printer size={13} />
          <span>Launch ID Print Layout</span>
        </button>
      </div>

      {/* Iframe sandbox printing instruction banner */}
      {showPrintNotice && (
        <div className="no-print mx-auto max-w-2xl p-3.5 bg-indigo-50 border border-indigo-200 dark:bg-slate-800/80 dark:border-slate-700 rounded-xl text-xs text-indigo-950 dark:text-slate-200 flex gap-3 items-start shadow-xs relative">
          <span className="text-sm select-none">💡</span>
          <div className="space-y-1 pr-6">
            <p className="font-extrabold text-[11.5px] text-indigo-900 dark:text-indigo-400">Viewing inside AI Studio's iframe preview?</p>
            <p className="leading-relaxed opacity-90 text-[10.5px]">
              Browsers protect security by restricting print dialogue commands (`window.print()`) inside sandboxed preview iframes.
            </p>
            <p className="leading-relaxed font-bold mt-1 text-[11px]">
              For a flawless PDF copy or full paper printout, click the <span className="underline">"Open App" or external link icon</span> at the very top-right corner of your preview panel to run the app in a **new top-level tab**, then click <strong>Launch ID Print Layout</strong>!
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

      {/* Main card render panel */}
      <div className="flex flex-col items-center pt-4">
        
        {/* Printable Section wrapper with frame */}
        <div className="p-6 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl flex flex-col sm:flex-row gap-8 justify-center max-w-2xl w-full">
          
          {/* ================ CARD FRONT ================ */}
          <div className="w-[240px] h-[360px] bg-white rounded-xl shadow-lg border border-slate-205 flex flex-col justify-between overflow-hidden shrink-0 relative">
            
            {/* Top Wave header */}
            <div className="bg-slate-900 text-white p-3.5 text-center relative flex items-center justify-center min-h-[50px]">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="School Logo" 
                  className="absolute top-1 left-2 w-7 h-7 object-contain bg-white rounded p-0.5" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="absolute top-1 left-2 bg-blue-600 text-white rounded font-black text-[10px] w-4 h-4 flex items-center justify-center border border-blue-500 shadow-sm">
                  S
                </div>
              )}
              <h5 className="font-black text-xs tracking-wider uppercase ml-5">SOUTHGOLD MONTESSORI</h5>
            </div>

            {/* Passport & Details */}
            <div className="flex-1 flex flex-col items-center justify-center p-3 text-center space-y-2.5">
              <div className="w-22 h-22 rounded-full overflow-hidden border-2 border-blue-600 shadow-inner block">
                <img 
                  src={selectedType === 'Student' ? targetStudent?.photo : 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'} 
                  alt="Badge holder" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div>
                <h4 className="font-bold text-sm text-slate-850">
                  {selectedType === 'Student' 
                    ? `${targetStudent?.firstName} ${targetStudent?.lastName}` 
                    : `${targetTeacher?.firstName} ${targetTeacher?.lastName}`
                  }
                </h4>
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider font-display">
                  {selectedType === 'Student' ? 'Grade Pupil Profile' : 'Staff Instructor'}
                </span>
              </div>

              <div className="text-left w-full bg-slate-50 p-2 rounded-lg border-px border-slate-102 font-medium text-[10px] text-slate-600 font-semibold space-y-1">
                <div className="flex justify-between">
                  <span>ID Badge Value:</span>
                  <span className="font-mono text-slate-800">
                    {selectedType === 'Student' ? targetStudent?.admissionNo : targetTeacher?.staffId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Class/Assignment:</span>
                  <span className="text-slate-800">
                    {selectedType === 'Student' ? targetStudent?.classId : targetTeacher?.department}
                  </span>
                </div>
                {selectedType === 'Student' && (
                  <div className="flex justify-between">
                    <span>Guard Name:</span>
                    <span className="text-slate-800 truncate max-w-[100px]">{targetStudent?.parentName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Simulated linear barcode footer */}
            <div className="bg-slate-50 p-2.5 border-t border-slate-150 flex flex-col justify-center items-center gap-1">
              {/* barcode image visual lines block */}
              <div className="w-full flex items-center justify-center gap-[1.5px] h-6 overflow-hidden bg-white px-2 py-1 select-none border">
                {[1,3,1,1,2,3,1,2,1,3,1,1,2,1,2,3,1,1,3,2,1,1,3,1].map((bar, i) => (
                  <div 
                    key={i} 
                    className="bg-slate-900 h-full" 
                    style={{ width: `${bar * 1.25}px` }}
                  />
                ))}
              </div>
              <span className="text-[8px] font-mono font-bold tracking-widest text-slate-500 block uppercase leading-none">
                {selectedType === 'Student' ? targetStudent?.id : targetTeacher?.id}
              </span>
            </div>

          </div>

          {/* ================ CARD BACK ================ */}
          <div className="w-[240px] h-[360px] bg-white rounded-xl shadow-lg border border-slate-205 flex flex-col justify-between p-4 overflow-hidden shrink-0 relative">
            
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b">
                <Building size={14} className="text-blue-600 shrink-0" />
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest block">Entry Instructions</span>
              </div>

              <ul className="text-[9px] text-slate-500 space-y-2 list-disc pl-3 mt-1.5 leading-snug font-semibold text-slate-501">
                <li>This ID card remains the legal property of SouthGold Montessori School victoria gate campus.</li>
                <li>It must be worn visibly within campus boundaries at all academic intervals.</li>
                <li>Loss of active badge must be reported immediately to the admin service.</li>
                <li>Forging or duplicating this ticket is a severe legal offense leading to suspension.</li>
              </ul>
            </div>

            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center gap-1.5 justify-start text-[9px] text-red-500 font-bold uppercase">
                <ShieldAlert size={12} className="shrink-0" />
                <span>Emergency contact hotline:</span>
              </div>
              <p className="text-[10px] font-mono text-slate-800 font-bold leading-none">+234 803 123 4567 • campus-sec@southgoldmontessori.com</p>

              <div className="pt-2 text-center border-t border-dashed self-center">
                <p className="text-[10px] italic font-mono text-slate-500">Official Stamp</p>
                <span className="text-[8px] uppercase font-black text-slate-400 block mt-0.5 tracking-widest">Office of the Registrar</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
