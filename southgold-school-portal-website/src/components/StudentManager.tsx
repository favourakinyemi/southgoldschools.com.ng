import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  UserPlus, 
  Trash, 
  Check, 
  X,
  UserX,
  BookOpen,
  ArrowUpCircle,
  UserCheck,
  ArrowRightLeft,
  Upload
} from 'lucide-react';
import { Student, Parent, Subject } from '../types';

interface StudentManagerProps {
  students: Student[];
  onSetStudents: (students: Student[]) => void;
  parents?: Parent[];
  onSetParents?: (parents: Parent[]) => void;
  activeSessionName: string;
  classes?: string[];
  classesWithSubjects?: {classId: string, subjects: string[], stage?: 'Pre-School' | 'Primary' | 'Secondary'}[];
  subjects?: Subject[];
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80', // Boy
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', // Girl
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', // Boy
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'  // Girl
];

export default function StudentManager({
  students,
  onSetStudents,
  parents = [],
  onSetParents,
  activeSessionName,
  classes = [],
  classesWithSubjects = [],
  subjects = []
}: StudentManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedArm, setSelectedArm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // New Student state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [dob, setDob] = useState('2019-03-10');
  const [parentId, setParentId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [classId, setClassId] = useState('');
  const [arm, setArm] = useState('A');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(['maths', 'english', 'science']);
  const [photoUrl, setPhotoUrl] = useState(AVATAR_PRESETS[0]);

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'res' } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [structuredFormError, setStructuredFormError] = useState<any>(null);

  // Move Student Class states
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [moveClassId, setMoveClassId] = useState('');
  const [moveArm, setMoveArm] = useState('A');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (classes && classes.length > 0) {
      if (!classId || !classes.includes(classId)) {
        setClassId(classes[0]);
      }
      if (!moveClassId || !classes.includes(moveClassId)) {
        setMoveClassId(classes[0]);
      }
    }
  }, [classes, classId, moveClassId]);

  // Bulk Student Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    const lines = importText.split('\n');
    const newStudents: Student[] = [];
    let parsedCount = 0;
    let skippedCount = 0;

    // Detect header row
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('name') || firstLine.includes('class') || firstLine.includes('admission') || firstLine.includes('gender') || firstLine.includes('arm');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    for (const line of dataLines) {
      if (!line.trim()) continue;

      // Allow delimiter to be tab, semicolon, or comma
      const parts = line.split(/[,\t;]/).map(p => p.trim());
      if (parts.length < 2) {
        skippedCount++;
        continue;
      }

      // Format expected: Admission No, First Name, Last Name, Gender, Class, Arm, Parent Name, Parent Email, Parent Phone
      let admissionNo = parts[0] || `ADM/${activeSessionName.split('/')[0] || '2026'}/${students.length + parsedCount + 101}`;
      let first = parts[1] || '';
      let last = parts[2] || '';
      let gen = parts[3] || 'Male';
      let cls = parts[4] || (classes[0] || 'JSS1');
      let a = parts[5] || 'A';
      let pName = parts[6] || `${first} ${last}'s Parent`;
      let pEmail = parts[7] || `parent.${first.toLowerCase().replace(/[^a-z]/g, '')}@example.com`;
      let pPhone = parts[8] || '+234 800 000 0000';

      // Fallback if they pasted "FirstName LastName" in the first block and gender in second
      if (!last) {
        const spaceIdx = first.indexOf(' ');
        if (spaceIdx > 0) {
          last = first.substring(spaceIdx + 1);
          first = first.substring(0, spaceIdx);
        } else {
          last = 'Pupil';
        }
      }

      // Check name validity
      if (!first) {
        skippedCount++;
        continue;
      }

      newStudents.push({
        id: `imported_${Date.now()}_${parsedCount}_${Math.floor(Math.random() * 10000)}`,
        admissionNo,
        firstName: first,
        lastName: last,
        photo: AVATAR_PRESETS[parsedCount % AVATAR_PRESETS.length],
        gender: (gen.toLowerCase().startsWith('f') || gen.toLowerCase().startsWith('g')) ? 'Female' : 'Male',
        dateOfBirth: '2019-03-10',
        classId: cls,
        arm: a,
        status: 'Active',
        parentName: pName,
        parentEmail: pEmail,
        parentPhone: pPhone,
        subjects: []
      });
      parsedCount++;
    }

    if (newStudents.length > 0) {
      onSetStudents([...students, ...newStudents]);
      showTemporaryMessage(`Bulk Import: Successfully imported ${parsedCount} pupils into register! (Skipped ${skippedCount} lines)`, 'success');
      setShowImportModal(false);
      setImportText('');
    } else {
      alert(`Could not parse any student rows. Please make check formatting layout.`);
    }
  };

  const handleOpenMoveModal = (student: Student) => {
    setMovingStudent(student);
    setMoveClassId(student.classId);
    setMoveArm(student.arm);
    setIsMoveModalOpen(true);
  };

  const handleMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingStudent) return;

    const classSubjects = (classesWithSubjects || [])
      .find(c => c.classId?.toLowerCase() === moveClassId?.toLowerCase())?.subjects || [];

    const updatedList = students.map(std => {
      if (std.id === movingStudent.id) {
        return {
          ...std,
          classId: moveClassId,
          arm: moveArm,
          subjects: classSubjects
        };
      }
      return std;
    });

    onSetStudents(updatedList);
    setIsMoveModalOpen(false);
    setMovingStudent(null);
    showTemporaryMessage(`Success: Transferred ${movingStudent.firstName} ${movingStudent.lastName} to ${moveClassId} (Arm ${moveArm}) and assigned class subjects.`, 'success');
  };

  // Auto-generate Admission Number
  const generateAdmissionNumber = () => {
    const year = activeSessionName.split('/')[0] || '2026';
    let maxNum = 100;
    students.forEach(s => {
      if (s.admissionNo) {
        const parts = s.admissionNo.split('/');
        if (parts.length === 3 && parts[1] === year) {
          const parsed = parseInt(parts[2], 10);
          if (!isNaN(parsed) && parsed > maxNum) {
            maxNum = parsed;
          }
        }
      }
    });
    const num = maxNum + 1;
    return `ADM/${year}/${num}`;
  };

  // Filter computation
  const filteredStudents = students.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                          student.admissionNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === '' || (student.classId || '').toLowerCase() === selectedClass.toLowerCase();
    const matchesArm = selectedArm === '' || (student.arm || '').toLowerCase() === selectedArm.toLowerCase();
    return matchesSearch && matchesClass && matchesArm;
  });

  const handleToggleSubject = (subjectId: string) => {
    if (selectedSubjects.includes(subjectId)) {
      setSelectedSubjects(selectedSubjects.filter(id => id !== subjectId));
    } else {
      setSelectedSubjects([...selectedSubjects, subjectId]);
    }
  };

  const handleOpenAddForm = () => {
    setEditingStudent(null);
    setFirstName('');
    setLastName('');
    setStudentEmail('');
    setGender('Male');
    setDob('2019-01-01');
    setParentId('');
    setParentName('');
    setParentEmail('');
    setParentPhone('');
    const defaultClass = classes[0] || '';
    setClassId(defaultClass);
    setArm('A');
    const classSubjects = (classesWithSubjects || [])
      .find(c => c.classId?.toLowerCase() === defaultClass.toLowerCase())?.subjects || [];
    setSelectedSubjects(classSubjects.length > 0 ? classSubjects : ['maths', 'english', 'science']);
    setPhotoUrl(AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)]);
    setFormError(null);
    setStructuredFormError(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (student: Student) => {
    setEditingStudent(student);
    setFirstName(student.firstName);
    setLastName(student.lastName);
    setStudentEmail(student.email ?? '');
    setGender(student.gender);
    setDob(student.dateOfBirth);
    setParentId(student.parentId ?? '');
    setParentName(student.parentName);
    setParentEmail(student.parentEmail);
    setParentPhone(student.parentPhone);
    setClassId(student.classId);
    setArm(student.arm);
    setSelectedSubjects(student.subjects);
    setPhotoUrl(student.photo);
    setFormError(null);
    setStructuredFormError(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !parentName.trim() || !parentEmail.trim()) {
      setFormError('Please fill out all mandatory fields registered with an asterisk (*).');
      return;
    }
    setFormError(null);
    setStructuredFormError(null);
    setIsSaving(true);

    try {
      if (editingStudent) {
        // Update action
        const updatedStd: Student = {
          ...editingStudent,
          firstName,
          lastName,
          email: studentEmail,
          gender,
          dateOfBirth: dob,
          parentId: parentId || undefined,
          parentName,
          parentEmail,
          parentPhone,
          classId,
          arm,
          subjects: selectedSubjects,
          photo: photoUrl
        };

        const res = await fetch(`/api/students/${editingStudent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedStd)
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.structuredError) {
            setStructuredFormError(data.structuredError);
          }
          throw new Error(data.error || 'Failed to update student profile.');
        }

        const updatedList = students.map(std => std.id === editingStudent.id ? updatedStd : std);
        onSetStudents(updatedList);
        showTemporaryMessage('Pupil details successfully updated.', 'success');
        setIsFormOpen(false);
      } else {
        // Create action
        const classSubjects = (classesWithSubjects || [])
          .find(c => c.classId?.toLowerCase() === classId?.toLowerCase())?.subjects || [];

        const newStd: Student = {
          id: `std_${Date.now()}`,
          admissionNo: generateAdmissionNumber(),
          firstName,
          lastName,
          email: '',
          photo: photoUrl,
          gender,
          dateOfBirth: dob,
          parentId: parentId || undefined,
          parentName,
          parentEmail,
          parentPhone,
          classId,
          arm,
          status: 'Active',
          subjects: classSubjects.length > 0 ? classSubjects : selectedSubjects
        };

        const res = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newStd)
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.structuredError) {
            setStructuredFormError(data.structuredError);
          }
          throw new Error(data.error || 'Failed to register student.');
        }

        onSetStudents([newStd, ...students]);
        showTemporaryMessage(`Pupil registered: assigned ${newStd.admissionNo}`, 'success');
        setIsFormOpen(false);
      }
    } catch (err: any) {
      console.error('[StudentManager] Save Error:', err);
      setFormError(err.message || 'An unexpected error occurred while saving the pupil register.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = (studentId: string) => {
    const updated = students.map(std => {
      if (std.id === studentId) {
        return {
          ...std,
          status: std.status === 'Active' ? ('Suspended' as const) : ('Active' as const)
        };
      }
      return std;
    });
    onSetStudents(updated);
    showTemporaryMessage('Pupil enrollment status updated.', 'success');
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this student and their associated login accounts permanently?')) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete student');
      onSetStudents(students.filter(s => s.id !== id));
      showTemporaryMessage('Student successfully deleted.', 'success');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handlePromoteBatch = () => {
    // Simply promote every student in filtered list to the next grade class
    const updated = students.map(std => {
      const classIdx = classes.indexOf(std.classId);
      if (classIdx >= 0 && classIdx < classes.length - 1) {
        return {
          ...std,
          classId: classes[classIdx + 1]
        };
      }
      return std;
    });
    onSetStudents(updated);
    showTemporaryMessage('Promoted all eligible selected class students to subsequent grade levels.', 'success');
  };

  const showTemporaryMessage = (text: string, type: 'success' | 'res') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Status Notifications */}
      {message && (
        <div className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in ${
          message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30' : 'bg-slate-50 text-slate-800'
        }`}>
          <Check size={14} />
          <span>{message.text}</span>
        </div>
      )}

      {/* Profile controls Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Pupils Register</h3>
          <p className="text-xs text-slate-400">Total Enrolled on register: {students.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePromoteBatch}
            className="flex items-center gap-1.5 border border-blue-600 hover:bg-blue-50 text-blue-600 dark:text-blue-400 dark:hover:bg-blue-950/20 px-3.5 py-1.8 rounded-lg text-xs font-semibold tracking-wide transition-all"
            title="Promote all listed students"
          >
            <ArrowUpCircle size={14} />
            <span>Bulk Promote Grade</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 border border-indigo-600 hover:bg-indigo-50 text-indigo-600 dark:text-indigo-400 dark:hover:bg-indigo-950/20 px-3.5 py-1.8 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer font-display"
            title="Import pupils register in bulk"
          >
            <Upload size={14} />
            <span>Bulk Import</span>
          </button>
          
          <button
            onClick={handleOpenAddForm}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus size={14} />
            <span>Admit Student</span>
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search student name or admission ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 text-xs py-2.5 pl-10 pr-4 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700 dark:text-slate-200 border-0"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <Filter size={14} className="text-slate-400 hidden sm:inline" />
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3 rounded-lg focus:outline-none border-0 text-slate-700 dark:text-slate-300 w-full sm:w-36 cursor-pointer"
            >
              <option value="">All Grades</option>
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Data Grid Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4">Pupil Passport</th>
                <th className="py-3 px-4">Admission ID</th>
                <th className="py-3 px-4">Age / Gender</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Parent Details</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Settings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredStudents.length > 0 ? (
                filteredStudents.map(student => {
                  
                  // Calculate raw age
                  const birthYear = new Date(student.dateOfBirth).getFullYear();
                  const age = 2026 - birthYear;

                  return (
                    <tr key={student.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/20 text-slate-700 dark:text-slate-300 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={student.photo} 
                            alt={student.firstName} 
                            className="w-9 h-9 rounded-full object-cover border border-slate-300 dark:border-slate-700"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100">
                              {student.firstName} {student.lastName}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold tracking-wider text-[11px]">
                        {student.admissionNo}
                      </td>
                      <td className="py-3.5 px-4">
                        <span>{student.gender} • {age} yrs</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {student.classId}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">{student.parentName}</p>
                          <p className="text-[10px] text-slate-400">{student.parentEmail}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          student.status === 'Active' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' 
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${student.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditForm(student)}
                            className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Profile"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleOpenMoveModal(student)}
                            className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Move Class / Transfer"
                          >
                            <ArrowRightLeft size={14} />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(student.id)}
                            className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                              student.status === 'Active' ? 'text-slate-400 hover:text-rose-500' : 'text-slate-400 hover:text-emerald-500'
                            }`}
                            title={student.status === 'Active' ? 'Suspend Student' : 'Activate Student'}
                          >
                            {student.status === 'Active' ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Student Permanently"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No student records matched the current active search filter query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admit/Edit Student Full Dialogue Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative">
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={18} />
            </button>

            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm">
              <UserPlus className="text-blue-600" size={16} />
              <span>{editingStudent ? 'Edit Pupil Profile' : 'Admit & Register New Pupil'}</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">Provide comprehensive documentation for records.</p>

            {structuredFormError ? (
              <div className="mt-3 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900/40 shadow-xs animate-fade-in space-y-2.5">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-600 dark:bg-rose-500 shrink-0" />
                  <span>Onboarding Rejected: {structuredFormError.errorType?.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs font-medium">{formError}</p>
                <div className="p-3 bg-white dark:bg-slate-950 rounded-lg border border-rose-100 dark:border-rose-950/30 text-[10px] space-y-1 font-mono text-slate-500 dark:text-slate-400">
                  <div><strong className="text-slate-700 dark:text-slate-300">Table:</strong> {structuredFormError.table}</div>
                  <div><strong className="text-slate-700 dark:text-slate-300">Field:</strong> {structuredFormError.column}</div>
                  <div><strong className="text-slate-700 dark:text-slate-300">Constraint:</strong> {structuredFormError.constraint}</div>
                  <div><strong className="text-slate-700 dark:text-slate-300">SQLSTATE:</strong> {structuredFormError.sqlState}</div>
                </div>
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-250/30 dark:border-amber-900/30 flex items-start gap-1.5">
                  <span className="text-amber-500 font-bold">💡</span>
                  <span><strong>Suggested Action:</strong> {structuredFormError.suggestedResolution}</span>
                </div>
              </div>
            ) : formError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-lg text-xs font-semibold flex items-center gap-2 border border-red-200 dark:border-red-900/35 shadow-3xs animate-fade-in">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 animate-pulse shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              
              {/* Presets & Avatars selector preview */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide block mb-2">
                  Associate Photo Badge ID
                </label>
                <div className="flex items-center gap-3">
                  <img 
                    src={photoUrl} 
                    alt="Active choice" 
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-650"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Select passport photograph preset or upload custom image:</p>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                          {AVATAR_PRESETS.map((p, ix) => (
                            <button
                              key={ix}
                              type="button"
                              onClick={() => setPhotoUrl(p)}
                              className={`w-8 h-8 rounded-full overflow-hidden border border-slate-200 transition-all ${
                                photoUrl === p ? 'ring-2 ring-blue-600' : 'hover:scale-105'
                              }`}
                            >
                              <img src={p} alt="Preset avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                        <div className="flex-1">
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                  const base64String = reader.result as string;
                                  try {
                                    const response = await fetch('/api/school/passport', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ passportBase64: base64String, fileName: file.name }),
                                    });
                                    if (response.ok) {
                                      const data = await response.json();
                                      setPhotoUrl(data.publicUrl);
                                    } else {
                                      alert('Passport upload failed.');
                                    }
                                  } catch (err) {
                                    console.error('Upload error:', err);
                                    alert('Error uploading passport.');
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-slate-800 dark:file:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>              {/* Biological fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">First Name *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-slate-100/60 hover:bg-slate-100 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 text-xs py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    placeholder="e.g. Chidera"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-slate-100/60 hover:bg-slate-100 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 text-xs py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                    placeholder="e.g. Obi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'Male' | 'Female' | 'Other')}
                    className="w-full bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-950 text-xs py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-100/60 hover:bg-slate-100 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 text-xs py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Class association */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300 block mb-1.5">Assigned Grade</label>
                <select
                  value={classId}
                  onChange={(e) => {
                    const newClassId = e.target.value;
                    setClassId(newClassId);
                    const classSubjects = (classesWithSubjects || [])
                      .find(c => c.classId?.toLowerCase() === newClassId?.toLowerCase())?.subjects || [];
                    setSelectedSubjects(classSubjects.length > 0 ? classSubjects : ['maths', 'english', 'science']);
                  }}
                  className="w-full bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-950 text-xs py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                >
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              {/* Parents field */}
              <div className="bg-slate-50 dark:bg-slate-800/20 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest block font-display">Linked Guardian / Parent Details</p>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 block mb-1">Select Existing Parent *</label>
                  <select
                    value={parentId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setParentId(pid);
                      const p = parents.find((x) => x.id === pid);
                      if (p) {
                        setParentName(`${p.firstName} ${p.lastName}`.trim());
                        setParentEmail(p.email);
                        setParentPhone(p.phone);
                      }
                    }}
                    className="w-full bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-950 text-xs py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    <option value="">— Create new parent from details below —</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName} ({p.email})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">A parent must exist before a pupil is registered. Pick an existing parent or fill the details below to create one automatically.</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 block mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full bg-slate-100/60 hover:bg-slate-100 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 text-xs py-2 px-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      placeholder="Mr. Adeleke"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 block mb-1">Contact Email *</label>
                    <input
                      type="email"
                      required
                      value={parentEmail}
                      onChange={(e) => setParentEmail(e.target.value)}
                      className="w-full bg-slate-100/60 hover:bg-slate-100 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 text-xs py-2 px-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      placeholder="parent@mail.com"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 block mb-1">Phone Line</label>
                    <input
                      type="text"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="w-full bg-slate-100/60 hover:bg-slate-100 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 text-xs py-2 px-2.5 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                      placeholder="+234..."
                    />
                  </div>
                </div>
              </div>

              {/* Subject combinations */}
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Registered Subject Combinations (READ-ONLY)</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(subjects || []).map((sub) => {
                    const checked = selectedSubjects.includes(sub.id);
                    return (
                      <div
                        key={sub.id}
                        className={`text-left text-[11px] p-2 rounded-lg border transition-all flex items-center justify-between select-none ${
                          checked 
                            ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40 font-semibold' 
                            : 'bg-slate-55/50 dark:bg-slate-900 text-slate-400 border-slate-100 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <span className="truncate">{sub.name}</span>
                        {checked && <Check size={11} className="text-blue-600 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-55 shadow-2xs text-slate-600 dark:border-slate-800 dark:text-slate-350 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingStudent ? 'Save Profile' : 'Complete Admission'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Move Student Class Modal */}
      {isMoveModalOpen && movingStudent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl max-w-md w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsMoveModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X size={18} />
            </button>

            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wider">
              <ArrowRightLeft className="text-amber-500" size={16} />
              <span>Transfer Pupil Class / Arm</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">Reassign the pupil to a different class category or a specific classroom arm.</p>            <div className="mt-4 p-3.5 bg-slate-50 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800/60 rounded-xl flex items-center gap-3">
              <img 
                src={movingStudent.photo} 
                alt={movingStudent.firstName} 
                className="w-10 h-10 rounded-full object-cover border border-slate-350 dark:border-slate-700"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-slate-50">
                  {movingStudent.firstName} {movingStudent.lastName}
                </p>
                <p className="text-[10px] font-mono text-slate-450 font-bold uppercase tracking-wide mt-0.5">
                  Current Class: {movingStudent.classId}
                </p>
              </div>
            </div>

            <form onSubmit={handleMoveSubmit} className="mt-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-300 block">Target Grade Class *</label>
                <select
                  value={moveClassId}
                  onChange={(e) => setMoveClassId(e.target.value)}
                  className="w-full bg-slate-100/60 hover:bg-slate-100 dark:bg-slate-950 text-xs py-2.5 px-3 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-semibold cursor-pointer"
                >
                  {classes.map(cls => (
                    <option key={cls} value={cls} className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">{cls}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-55 dark:text-slate-300 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 font-black rounded-lg transition-colors shadow-sm cursor-pointer uppercase tracking-tight"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Student Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center bg-slate-900/65 p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X size={18} />
            </button>

            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-sm uppercase tracking-wider font-display">
              <Upload className="text-indigo-600" size={16} />
              <span>Bulk Paste Pupil Register</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1 pb-2">
              Quickly create multiple pupil accounts on the register. Paste text records below (from Excel or text lists). Refer to columns template order below.
            </p>

            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/40 dark:border-indigo-900/30 rounded-lg p-3.5 space-y-1.5 text-[10.5px] text-indigo-900 dark:text-indigo-300 font-semibold leading-relaxed">
              <span className="uppercase text-[9px] tracking-wide font-black text-indigo-700 dark:text-indigo-400 block">EXPECTED PASTING TEMPLATE</span>
              <p className="font-mono bg-white dark:bg-slate-950 p-1.5 rounded text-[10px] break-all border overflow-x-auto whitespace-pre text-slate-700 dark:text-slate-350">
                AdmissionNo, FirstName, LastName, Gender, Class, Arm, ParentName, ParentEmail, ParentPhone
              </p>
              <p className="font-mono bg-white dark:bg-slate-950 p-1.5 rounded text-[10px] break-all border overflow-x-auto whitespace-pre text-slate-600 dark:text-slate-400">
                {"ADM/2026/201, Tunde, Bello, Male, Primary 1, A, Bello Fausat, fausat@mail.com, 08011112222\nADM/2026/202, Anita, Chukwu, Female, Primary 1, A, Frank Chukwu, frank@mail.com, 08022223333"}
              </p>
              <p className="font-normal italic text-slate-400 text-[10px]">
                Tip: You can omit columns at the end (e.g. parent name or emails). Sensible default profiles will auto-generate!
              </p>
            </div>

            <form onSubmit={handleImportSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-300 block">Copy-Paste Students Lines Data</label>
                <textarea
                  required
                  rows={8}
                  placeholder="Paste table or list rows here..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 text-xs py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-950 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono placeholder-slate-400"
                />
              </div>

              <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-55 dark:text-slate-300 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 font-black rounded-lg transition-colors shadow-sm cursor-pointer uppercase tracking-tight"
                >
                  Confirm Import Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
