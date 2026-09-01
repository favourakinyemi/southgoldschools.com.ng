import React, { useState } from 'react';
import { BookOpen, Plus, Shield, Check, Info, Lock, BookMarked, Layers, Search, AlertCircle, FileSpreadsheet, UserCheck, Edit, Trash2 } from 'lucide-react';
import { Subject, UserRole, Teacher, Student, AssessmentItem } from '../types';
import { Alert } from './shared';

interface ClassSubjectManagerProps {
  currentRole: UserRole;
  subjects: Subject[];
  onSetSubjects: (subs: Subject[]) => void;
  classesWithSubjects: { 
    classId: string; 
    subjects: string[]; 
    stage?: 'Pre-School' | 'Primary' | 'Secondary';
  }[];
  onSetClassesWithSubjects: (classes: { 
    classId: string; 
    subjects: string[]; 
    stage?: 'Pre-School' | 'Primary' | 'Secondary';
  }[]) => any;
  teachers: Teacher[];
  onSetTeachers: (tch: Teacher[]) => any;
  students?: Student[];
  onSetStudents?: (students: Student[]) => any;
  assessmentItems?: AssessmentItem[];
  onSetAssessmentItems?: (items: AssessmentItem[]) => any;
}

export const getDetectedStage = (classId: string): 'Pre-School' | 'Primary' | 'Secondary' => {
  const norm = classId.toLowerCase();
  if (norm.includes('nursery') || norm.includes('preschool') || norm.includes('pre-school') || norm.includes('toddler') || norm.includes('creche') || norm.includes('kindergarten')) {
    return 'Pre-School';
  }
  if (norm.includes('secondary') || norm.includes('jss') || norm.includes('sss') || norm.includes('high') || norm.includes('college')) {
    return 'Secondary';
  }
  return 'Primary';
};

export default function ClassSubjectManager({
  currentRole,
  subjects,
  onSetSubjects,
  classesWithSubjects,
  onSetClassesWithSubjects,
  teachers,
  onSetTeachers,
  students,
  onSetStudents,
  assessmentItems = [],
  onSetAssessmentItems
}: ClassSubjectManagerProps) {
  const isAdmin = currentRole === 'SUPER_ADMIN' || currentRole === 'SCHOOL_ADMIN';

  // Navigation tab
  const [activeSubTab, setActiveSubTab] = useState<'classes' | 'subjects' | 'assessmentItems'>('classes');

  // Search queries
  const [subjectQuery, setSubjectQuery] = useState('');
  const [classQuery, setClassQuery] = useState('');

  // Add Subject Form
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Edit Subject Form
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editSubName, setEditSubName] = useState('');
  const [editSubCode, setEditSubCode] = useState('');
  const [editSubError, setEditSubError] = useState<string | null>(null);
  const [subjectToDeleteConfirm, setSubjectToDeleteConfirm] = useState<string | null>(null);

  // Assessment Items State
  const [assessmentQuery, setAssessmentQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('ALL');

  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [editingAssessmentItem, setEditingAssessmentItem] = useState<AssessmentItem | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemSubjectId, setItemSubjectId] = useState('');
  const [itemClassId, setItemClassId] = useState('ALL');
  const [itemOrder, setItemOrder] = useState<number>(1);
  const [itemError, setItemError] = useState<string | null>(null);

  // Add Class Form
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassStage, setNewClassStage] = useState<'Pre-School' | 'Primary' | 'Secondary'>('Primary');
  const [addClassError, setAddClassError] = useState<string | null>(null);

  // Edit/Rename Class Form State
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [selectedClassToEdit, setSelectedClassToEdit] = useState<{ classId: string; subjects: string[]; stage?: 'Pre-School' | 'Primary' | 'Secondary' } | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassStage, setEditClassStage] = useState<'Pre-School' | 'Primary' | 'Secondary'>('Primary');
  const [editClassError, setEditClassError] = useState<string | null>(null);

  // Class assignment editor state
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeManagerMode, setActiveManagerMode] = useState<'subjects' | 'teachers'>('subjects');
  const [classToDeleteConfirm, setClassToDeleteConfirm] = useState<string | null>(null);

  const handleRemoveClass = async (classId: string) => {
    // 1. Filter out from subclasses map
    const updatedClasses = classesWithSubjects.filter(c => c.classId !== classId);
    await onSetClassesWithSubjects(updatedClasses);

    // 2. Clear classId for Students in this class
    if (students && onSetStudents) {
      const updatedStudents = students.map(std => {
        if (std.classId === classId) {
          return {
            ...std,
            classId: ''
          };
        }
        return std;
      });
      await onSetStudents(updatedStudents);
    }

    // 3. Clear assignments for Teachers in this class
    if (teachers && onSetTeachers) {
      const updatedTeachers = teachers.map(tch => {
        const hasAssignment = (tch.classesAssigned || []).some(ca => ca.classId === classId);
        if (hasAssignment) {
          return {
            ...tch,
            classesAssigned: (tch.classesAssigned || []).filter(ca => ca.classId !== classId)
          };
        }
        return tch;
      });
      await onSetTeachers(updatedTeachers);
    }

    // Clear editing context if we deleted the currently edited class
    if (editingClassId === classId) {
      setEditingClassId(null);
    }

    setClassToDeleteConfirm(null);
    showTempMessage(`Class "${classId}" was removed successfully!`);
  };

  // Helper: check unique teachers assigned to a class
  const getClassTeachers = (classId: string) => {
    return teachers.filter(t =>
      (t.classesAssigned || []).some(ca => ca.classId === classId)
    );
  };

  // Helper: check teacher for a Class
  const getClassTeacher = (classId: string): Teacher | undefined => {
    return teachers.find(t =>
      (t.classesAssigned || []).some(ca => ca.classId === classId)
    );
  };

  // Handler to assign a teacher as the sole Class Teacher (all subjects & arms)
  const handleAssignClassTeacher = (teacherId: string) => {
    if (!editingClassId) return;

    const classMapObj = classesWithSubjects.find(c => c.classId === editingClassId);
    const assignedSubIds = classMapObj ? classMapObj.subjects : [];

    const updatedTeachers = teachers.map(t => {
      // 1. Clear any current assignments for this class from EVERY teacher
      const cleanedClasses = (t.classesAssigned || []).filter(ca => ca.classId !== editingClassId);

      // 2. If this teacher is selected, assign them to all subjects and arms for this class
      if (t.id === teacherId) {
        const newAssignments: { classId: string; arm: string; subjectId: string }[] = [];
        for (const subId of assignedSubIds) {
          for (const arm of ['A']) {
            newAssignments.push({
              classId: editingClassId,
              arm,
              subjectId: subId
            });
          }
        }
        return {
          ...t,
          classesAssigned: [...cleanedClasses, ...newAssignments]
        };
      }

      return {
        ...t,
        classesAssigned: cleanedClasses
      };
    });

    onSetTeachers(updatedTeachers);
    
    const selectedTch = teachers.find(t => t.id === teacherId);
    if (selectedTch) {
      showTempMessage(`Success: Assigned ${selectedTch.firstName} ${selectedTch.lastName} as Class Teacher for ${editingClassId}`);
    } else {
      showTempMessage(`Success: Removed Class Teacher assignment from ${editingClassId}`);
    }
  };

  // Helper: check how many classes have a certain subject assigned
  const getSubjectClassCount = (subId: string) => {
    return classesWithSubjects.filter(c => c.subjects.includes(subId)).length;
  };

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const name = newSubName.trim();
    const code = newSubCode.trim().toUpperCase() || `SUB-${Math.floor(100 + Math.random() * 900)}`;

    if (!name) {
      setAddError('Subject name is required.');
      return;
    }

    const nameExists = subjects.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (nameExists) {
      setAddError('A subject with this exact name already exists.');
      return;
    }

    const id = name.toLowerCase().replace(/\s+/g, '_');
    const newSub: Subject = { id, name, code };

    onSetSubjects([...subjects, newSub]);
    setNewSubName('');
    setNewSubCode('');
    setShowAddModal(false);
    showTempMessage('Subject added successfully!');
  };

  const handleSaveEditSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    setEditSubError(null);

    const name = editSubName.trim();
    const code = editSubCode.trim().toUpperCase() || editingSubject.code;

    if (!name) {
      setEditSubError('Subject name is required.');
      return;
    }

    const nameExists = subjects.some(s => s.id !== editingSubject.id && s.name.toLowerCase() === name.toLowerCase());
    if (nameExists) {
      setEditSubError('Another subject with this exact name already exists.');
      return;
    }

    const updatedSubjects = subjects.map(s => s.id === editingSubject.id ? { ...s, name, code } : s);
    onSetSubjects(updatedSubjects);
    setShowEditSubjectModal(false);
    setEditingSubject(null);
    showTempMessage(`Subject "${name}" updated successfully!`);
  };

  const handleRemoveSubject = async (subId: string) => {
    const targetSubject = subjects.find(s => s.id === subId);
    
    // 1. Remove from subjects
    const updatedSubjects = subjects.filter(s => s.id !== subId);
    await onSetSubjects(updatedSubjects);

    // 2. Remove subId from classesWithSubjects
    const updatedClassesWithSubjects = classesWithSubjects.map(c => ({
      ...c,
      subjects: c.subjects.filter(id => id !== subId)
    }));
    await onSetClassesWithSubjects(updatedClassesWithSubjects);

    // 3. Remove subId from students
    if (students && onSetStudents) {
      const updatedStudents = students.map(std => ({
        ...std,
        subjects: (std.subjects || []).filter(id => id !== subId)
      }));
      await onSetStudents(updatedStudents);
    }

    // 4. Remove subId from teachers
    if (teachers && onSetTeachers) {
      const updatedTeachers = teachers.map(t => ({
        ...t,
        classesAssigned: (t.classesAssigned || []).filter(ca => ca.subjectId !== subId)
      }));
      await onSetTeachers(updatedTeachers);
    }

    setSubjectToDeleteConfirm(null);
    showTempMessage(`Subject "${targetSubject?.name || subId}" deleted successfully.`);
  };

  // Assessment Items Handlers
  const handleSaveAssessmentItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSetAssessmentItems) return;
    setItemError(null);

    const title = itemTitle.trim();
    if (!title) {
      setItemError('Title is required.');
      return;
    }
    if (!itemSubjectId) {
      setItemError('Please select a subject.');
      return;
    }

    const currentItems = assessmentItems || [];

    if (editingAssessmentItem) {
      const updated = currentItems.map(item => item.id === editingAssessmentItem.id ? {
        ...item,
        title,
        name: title,
        subjectId: itemSubjectId,
        classId: itemClassId === 'ALL' ? undefined : itemClassId,
        orderIndex: itemOrder
      } : item);
      onSetAssessmentItems(updated);
      showTempMessage('Assessment item updated successfully!');
    } else {
      const newItem: AssessmentItem = {
        id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        title,
        name: title,
        subjectId: itemSubjectId,
        classId: itemClassId === 'ALL' ? undefined : itemClassId,
        orderIndex: itemOrder || currentItems.length + 1
      };
      onSetAssessmentItems([...currentItems, newItem]);
      showTempMessage('Assessment item added successfully!');
    }

    setShowAssessmentModal(false);
    setEditingAssessmentItem(null);
    setItemTitle('');
    setItemSubjectId('');
    setItemClassId('ALL');
  };

  const handleRemoveAssessmentItem = (itemId: string) => {
    if (!onSetAssessmentItems) return;
    const currentItems = assessmentItems || [];
    const updated = currentItems.filter(item => item.id !== itemId);
    onSetAssessmentItems(updated);
    showTempMessage('Assessment item deleted successfully.');
  };

  const handleMoveAssessmentItem = (itemId: string, direction: 'up' | 'down') => {
    if (!onSetAssessmentItems) return;
    const currentItems = [...(assessmentItems || [])];
    const index = currentItems.findIndex(i => i.id === itemId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentItems.length) return;

    const temp = currentItems[index];
    currentItems[index] = currentItems[targetIndex];
    currentItems[targetIndex] = temp;

    const reordered = currentItems.map((item, idx) => ({ ...item, orderIndex: idx + 1 }));
    onSetAssessmentItems(reordered);
  };

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    setAddClassError(null);

    const trimmedName = newClassName.trim();
    if (!trimmedName) {
      setAddClassError('Class name is required.');
      return;
    }

    const exists = classesWithSubjects.some(
      c => c.classId.toLowerCase() === trimmedName.toLowerCase()
    );

    if (exists) {
      setAddClassError('A class with this name already exists.');
      return;
    }

    const newClassObj: { classId: string; subjects: string[]; stage: 'Pre-School' | 'Primary' | 'Secondary' } = {
      classId: trimmedName,
      subjects: [],
      stage: newClassStage
    };

    onSetClassesWithSubjects([...classesWithSubjects, newClassObj]);
    setNewClassName('');
    setNewClassStage('Primary');
    setShowAddClassModal(false);
    showTempMessage(`Class "${trimmedName}" added successfully!`);
  };

  const handleSaveEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditClassError(null);

    if (!selectedClassToEdit) return;

    const oldName = selectedClassToEdit.classId;
    const trimmedName = editClassName.trim();

    if (!trimmedName) {
      setEditClassError('Class name is required.');
      return;
    }

    if (trimmedName.toLowerCase() !== oldName.toLowerCase()) {
      const exists = classesWithSubjects.some(
        c => c.classId.toLowerCase() === trimmedName.toLowerCase()
      );
      if (exists) {
        setEditClassError('A class with this name already exists.');
        return;
      }
    }

    // 1. Update list of classes & stages
    const updatedClasses = classesWithSubjects.map(c => {
      if (c.classId === oldName) {
        return {
          ...c,
          classId: trimmedName,
          stage: editClassStage
        };
      }
      return c;
    });

    await onSetClassesWithSubjects(updatedClasses);

    // 2. Cascade update in Students
    if (students && onSetStudents && trimmedName !== oldName) {
      const updatedStudents = students.map(std => {
        if (std.classId === oldName) {
          return {
            ...std,
            classId: trimmedName
          };
        }
        return std;
      });
      await onSetStudents(updatedStudents);
    }

    // 3. Cascade update in Teachers' assignments
    if (teachers && onSetTeachers && trimmedName !== oldName) {
      const updatedTeachers = teachers.map(tch => {
        const hasAssignment = (tch.classesAssigned || []).some(ca => ca.classId === oldName);
        if (hasAssignment) {
          return {
            ...tch,
            classesAssigned: (tch.classesAssigned || []).map(ca => {
              if (ca.classId === oldName) {
                return {
                  ...ca,
                  classId: trimmedName
                };
              }
              return ca;
            })
          };
        }
        return tch;
      });
      await onSetTeachers(updatedTeachers);
    }

    setShowEditClassModal(false);
    setSelectedClassToEdit(null);
    showTempMessage(`Class "${oldName}" updated to "${trimmedName}" successfully!`);
  };

  const startEditClass = (classId: string) => {
    if (!isAdmin) return;
    const currentAssignment = classesWithSubjects.find(c => c.classId === classId);
    setEditingClassId(classId);
    setSelectedSubjectIds(currentAssignment ? [...currentAssignment.subjects] : []);
  };

  const handleToggleSubjectInClass = (subId: string) => {
    if (selectedSubjectIds.includes(subId)) {
      setSelectedSubjectIds(selectedSubjectIds.filter(id => id !== subId));
    } else {
      setSelectedSubjectIds([...selectedSubjectIds, subId]);
    }
  };

  const handleSaveClassSubjects = () => {
    if (!editingClassId) return;

    const existingIndex = classesWithSubjects.findIndex(c => c.classId === editingClassId);
    let updated = [...classesWithSubjects];

    if (existingIndex > -1) {
      updated[existingIndex] = {
        ...classesWithSubjects[existingIndex],
        subjects: selectedSubjectIds
      };
    } else {
      updated.push({
        classId: editingClassId,
        subjects: selectedSubjectIds,
        stage: getDetectedStage(editingClassId)
      });
    }

    onSetClassesWithSubjects(updated);

    // Sync current teacher's assignments to newly saved subjects if a teacher is already assigned
    const currentClassTeacher = getClassTeacher(editingClassId);
    if (currentClassTeacher) {
      const updatedTeachers = teachers.map(t => {
        const cleanedClasses = (t.classesAssigned || []).filter(ca => ca.classId !== editingClassId);
        if (t.id === currentClassTeacher.id) {
          const newAssignments: { classId: string; arm: string; subjectId: string }[] = [];
          for (const subId of selectedSubjectIds) {
            for (const arm of ['A']) {
              newAssignments.push({
                classId: editingClassId,
                arm,
                subjectId: subId
              });
            }
          }
          return {
            ...t,
            classesAssigned: [...cleanedClasses, ...newAssignments]
          };
        }
        return {
          ...t,
          classesAssigned: cleanedClasses
        };
      });
      onSetTeachers(updatedTeachers);
    }

    setEditingClassId(null);
    showTempMessage(`Subject blueprint for ${editingClassId} has been successfully updated!`);
  };

  // Phase 2 & 3: Automatic Student & Teacher Subject Assignment States & Handlers
  const [autoTeacherId, setAutoTeacherId] = useState('');
  const [autoClassId, setAutoClassId] = useState('');

  const handleAutoAssignStudentSubjects = async () => {
    if (!students || !onSetStudents) {
      alert('Student records are not loaded or initialized.');
      return;
    }

    const confirmRun = window.confirm ? window.confirm('Are you sure you want to automatically assign subjects to ALL active students based on their enrolled class curriculum blueprint?') : true;
    if (!confirmRun) return;

    let updatedCount = 0;
    const updatedStudents = students.map(std => {
      const classBlueprint = classesWithSubjects.find(c => c.classId === std.classId);
      if (classBlueprint && classBlueprint.subjects) {
        const blueprintSorted = [...classBlueprint.subjects].sort().join(',');
        const studentSorted = [...(std.subjects || [])].sort().join(',');
        if (blueprintSorted !== studentSorted) {
          updatedCount++;
          return {
            ...std,
            subjects: classBlueprint.subjects
          };
        }
      }
      return std;
    });

    if (updatedCount > 0) {
      await onSetStudents(updatedStudents);
      showTempMessage(`Success! Automatically synchronized curriculum subjects for ${updatedCount} students.`);
    } else {
      showTempMessage('All student subjects are already fully synchronized with their class curriculum.');
    }
  };

  const handleAutoAssignAllTeachers = async () => {
    const confirmRun = window.confirm ? window.confirm('Are you sure you want to automatically map all class teachers to teach all active subjects of their assigned classes?') : true;
    if (!confirmRun) return;

    let updatedCount = 0;
    const updatedTeachers = teachers.map(t => {
      // Find classes where this teacher has at least one assignment
      const classesAssignedUnique = Array.from(new Set((t.classesAssigned || []).map(ca => ca.classId)));
      if (classesAssignedUnique.length === 0) return t;

      const newAssignments: { classId: string; arm: string; subjectId: string }[] = [];
      let changed = false;

      for (const classId of classesAssignedUnique) {
        const classBlueprint = classesWithSubjects.find(c => c.classId === classId);
        if (!classBlueprint) continue;

        for (const subId of classBlueprint.subjects) {
          for (const arm of ['A']) { // default arm is A
            const exists = (t.classesAssigned || []).some(ca => ca.classId === classId && ca.subjectId === subId && ca.arm === arm);
            if (!exists) {
              changed = true;
            }
            newAssignments.push({ classId, arm, subjectId: subId });
          }
        }
      }

      if (changed) {
        updatedCount++;
        return {
          ...t,
          classesAssigned: newAssignments
        };
      }
      return t;
    });

    if (updatedCount > 0) {
      await onSetTeachers(updatedTeachers);
      showTempMessage(`Success! Automatically synchronized full subject curriculum assignments for ${updatedCount} Teachers.`);
    } else {
      showTempMessage('All teachers are already fully mapped to teach their classes\' subjects.');
    }
  };

  const handleAutoAssignTeacherToClass = async () => {
    if (!autoTeacherId || !autoClassId) {
      alert('Please select both a Teacher and a Target Class.');
      return;
    }

    const classBlueprint = classesWithSubjects.find(c => c.classId === autoClassId);
    if (!classBlueprint || !classBlueprint.subjects || classBlueprint.subjects.length === 0) {
      alert(`The class ${autoClassId} does not have any subjects assigned yet. Please assign subjects first.`);
      return;
    }

    const selectedTeacher = teachers.find(t => t.id === autoTeacherId);
    if (!selectedTeacher) return;

    const confirmRun = window.confirm ? window.confirm(`Assign Mrs/Mr. ${selectedTeacher.lastName} to teach ALL ${classBlueprint.subjects.length} subjects for ${autoClassId}?`) : true;
    if (!confirmRun) return;

    const updatedTeachers = teachers.map(t => {
      if (t.id === autoTeacherId) {
        // filter out current assignments for this class to prevent duplicates
        const otherAssignments = (t.classesAssigned || []).filter(ca => ca.classId !== autoClassId);
        const newAssignments = classBlueprint.subjects.map(subId => ({
          classId: autoClassId,
          arm: 'A',
          subjectId: subId
        }));
        return {
          ...t,
          classesAssigned: [...otherAssignments, ...newAssignments]
        };
      }
      return t;
    });

    await onSetTeachers(updatedTeachers);
    showTempMessage(`Success! Assigned ${selectedTeacher.firstName} ${selectedTeacher.lastName} to teach all subjects in ${autoClassId}.`);
    setAutoTeacherId('');
    setAutoClassId('');
  };

  const showTempMessage = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Filter lists
  const filteredSubjects = subjects.filter(sub =>
    sub.name.toLowerCase().includes(subjectQuery.toLowerCase()) ||
    sub.code.toLowerCase().includes(subjectQuery.toLowerCase())
  );

  const filteredClasses = classesWithSubjects.map(c => c.classId).filter(cls =>
    cls.toLowerCase().includes(classQuery.toLowerCase())
  );

  const filteredAssessmentItems = (assessmentItems || []).filter(item => {
    const itemTitleText = (item.title || item.name || '').toLowerCase();
    const queryMatch = itemTitleText.includes(assessmentQuery.toLowerCase());
    const classMatch = filterClassId === 'ALL' || !item.classId || item.classId === filterClassId;
    const subjectMatch = filterSubjectId === 'ALL' || item.subjectId === filterSubjectId;
    return queryMatch && classMatch && subjectMatch;
  }).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

  return (
    <div className="space-y-6">
      
      {/* Banner message */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 p-3.5 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 shadow-xs transition-all animate-bounce">
          <Check size={14} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-[10px] bg-amber-100 text-amber-900 dark:bg-amber-955/30 dark:text-amber-400 font-black tracking-widest uppercase px-2.5 py-0.5 rounded-full inline-block">
            Curriculum Blueprint
          </span>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-800 dark:text-slate-100 tracking-tight mt-1.5 flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            Class & Subjects Panel
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Configure subjects and combine curricula maps across preschool and primary school tiers. Keep class schemas synchronized.
          </p>
        </div>

        {/* Read-Only Alert or Admin Tools info */}
        {!isAdmin ? (
          <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center gap-2 max-w-xs shrink-0 self-start sm:self-center">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="text-[10px] text-slate-500 font-semibold">
              <span className="block text-slate-800 dark:text-slate-200 font-bold uppercase tracking-wider">Read-Only View</span>
              Only registered Administrators can alter mappings.
            </div>
          </div>
        ) : (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0 animate-pulse" />
            <div className="text-[10px] text-slate-500 font-semibold">
              <span className="block text-amber-600 dark:text-amber-400 font-black uppercase tracking-wider">Authorized Console</span>
              Logged as {currentRole === 'SUPER_ADMIN' ? 'Super Administrator' : 'Staff Admin'}.
            </div>
          </div>
        )}
      </div>

      {/* Tab select row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => setActiveSubTab('classes')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeSubTab === 'classes'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-500 hover:text-slate-850 dark:text-slate-400'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Class Curriculum Maps
          </button>
          <button
            onClick={() => setActiveSubTab('subjects')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeSubTab === 'subjects'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-500 hover:text-slate-850 dark:text-slate-400'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Subject Index
          </button>
          <button
            onClick={() => setActiveSubTab('assessmentItems')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-xs font-bold transition-all ${
              activeSubTab === 'assessmentItems'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                : 'text-slate-500 hover:text-slate-850 dark:text-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Early Years Assessment Items
          </button>
        </div>

        {activeSubTab === 'subjects' && isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Subject
          </button>
        )}

        {activeSubTab === 'classes' && isAdmin && (
          <button
            onClick={() => setShowAddClassModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Class
          </button>
        )}

        {activeSubTab === 'assessmentItems' && isAdmin && (
          <button
            onClick={() => {
              setEditingAssessmentItem(null);
              setItemTitle('');
              setItemSubjectId(subjects[0]?.id || '');
              setItemClassId('ALL');
              setItemOrder((assessmentItems?.length || 0) + 1);
              setItemError(null);
              setShowAssessmentModal(true);
            }}
            className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all flex items-center gap-1.5 uppercase tracking-wide cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Assessment Item
          </button>
        )}
      </div>

      {/* CORE WRAPPERS */}
      {activeSubTab === 'classes' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Class List (Grid span 2) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 border.5 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="font-display font-bold text-sm uppercase text-slate-800 dark:text-slate-100 tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                  Grade Classes Blueprint List
                </h3>
                
                {/* Search index */}
                <div className="relative max-w-xs w-full">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search classes..."
                    value={classQuery}
                    onChange={(e) => setClassQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800/80 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:outline-hidden focus:border-amber-500 dark:text-slate-100 placeholder-slate-400"
                  />
                </div>
              </div>

              {filteredClasses.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs italic">
                  No classes match the current filter.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredClasses.map(classId => {
                    const mapItem = classesWithSubjects.find(c => c.classId === classId);
                    const classSubjects = mapItem ? mapItem.subjects : [];
                    const isSelectedEditing = editingClassId === classId;

                    return (
                      <div
                        key={classId}
                        className={`rounded-xl border p-5 transition-all flex flex-col justify-between ${
                          isSelectedEditing
                            ? 'bg-amber-50/10 border-amber-300 dark:bg-amber-955/15 dark:border-amber-800/60 shadow-md'
                            : 'bg-white hover:shadow-md border-slate-205 dark:bg-slate-900/60 dark:border-slate-800/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/50">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  Class Group
                                </span>
                                {(() => {
                                  const cStage = mapItem?.stage || getDetectedStage(classId);
                                  return (
                                    <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                                      cStage === 'Pre-School'
                                        ? 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/25 dark:text-violet-400 dark:border-violet-900/40'
                                        : cStage === 'Secondary'
                                        ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/25 dark:text-blue-400 dark:border-blue-900/40'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/25 dark:text-emerald-400 dark:border-emerald-900/40'
                                    }`}>
                                      {cStage}
                                    </span>
                                  );
                                })()}
                              </div>
                              <h4 className="font-display font-black text-slate-900 dark:text-slate-50 text-lg mt-1 tracking-tight">
                                {classId}
                              </h4>
                            </div>

                            {isAdmin && (
                              <div className="flex items-center gap-1 shrink-0">
                                {classToDeleteConfirm === classId ? (
                                  <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-1 duration-150">
                                    <button
                                      onClick={() => handleRemoveClass(classId)}
                                      className="text-white bg-rose-600 hover:bg-rose-700 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide cursor-pointer transition-all"
                                      title="Confirm Deletion"
                                    >
                                      Delete
                                    </button>
                                    <button
                                      onClick={() => setClassToDeleteConfirm(null)}
                                      className="text-slate-705 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wide cursor-pointer transition-all"
                                      title="Cancel Deletion"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setSelectedClassToEdit(mapItem || { classId, subjects: [], stage: getDetectedStage(classId) });
                                        setEditClassName(classId);
                                        setEditClassStage(mapItem?.stage || getDetectedStage(classId));
                                        setEditClassError(null);
                                        setShowEditClassModal(true);
                                      }}
                                      className="text-slate-400 hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-450 p-1.5 rounded-lg border border-transparent hover:border-slate-205 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-all cursor-pointer"
                                      title="Edit Class Name & Academic Stage"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setClassToDeleteConfirm(classId)}
                                      className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-450 p-1.5 rounded-lg border border-transparent hover:border-slate-205 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/60 transition-all cursor-pointer"
                                      title="Remove Class Group"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {isAdmin && (
                            <div className="grid grid-cols-2 gap-2 mt-4">
                              <button
                                onClick={() => {
                                  startEditClass(classId);
                                  setActiveManagerMode('subjects');
                                }}
                                className={`text-[10.5px] font-bold px-3 py-2 rounded-lg uppercase tracking-wide transition-all border text-center cursor-pointer ${
                                  isSelectedEditing && activeManagerMode === 'subjects'
                                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700/80'
                                }`}
                              >
                                {isSelectedEditing && activeManagerMode === 'subjects' ? 'Editing Info' : 'Assign Subjects'}
                              </button>
                              <button
                                onClick={() => {
                                  startEditClass(classId);
                                  setActiveManagerMode('teachers');
                                }}
                                className={`text-[10.5px] font-bold px-3 py-2 rounded-lg uppercase tracking-wide transition-all border text-center cursor-pointer ${
                                  isSelectedEditing && activeManagerMode === 'teachers'
                                    ? 'bg-indigo-600 text-white border-indigo-650 shadow-xs'
                                    : 'bg-slate-50 text-indigo-600 hover:bg-slate-100 border-indigo-150 dark:bg-slate-800 dark:text-indigo-350 dark:border-slate-705 dark:hover:bg-slate-705/80'
                                }`}
                              >
                                {isSelectedEditing && activeManagerMode === 'teachers' ? 'Allocating Now' : 'Assign Teacher'}
                              </button>
                            </div>
                          )}

                          <div className="mt-5 pt-3 border-t border-dashed border-slate-150 dark:border-slate-800">
                            <span className="text-[9px] uppercase font-bold text-slate-450 block mb-2 tracking-wide">
                              Assigned Subjects ({classSubjects.length})
                            </span>
                            
                            {classSubjects.length === 0 ? (
                              <span className="text-[10px] text-slate-400 italic font-medium flex items-center gap-1.5 py-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500/70" />
                                No subjects assigned yet
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {classSubjects.map(subId => {
                                  const subObj = subjects.find(s => s.id === subId);
                                  return (
                                    <span
                                      key={subId}
                                      className="bg-slate-50 border border-slate-200/80 text-slate-700 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-300 text-[9.5px] font-semibold px-2.5 py-1 rounded-md"
                                    >
                                      {subObj ? subObj.name : subId}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Assigned Class Teacher */}
                        <div className="mt-5 pt-3 border-t border-dashed border-slate-150 dark:border-slate-800">
                          <span className="text-[9px] uppercase font-bold text-slate-455 block mb-2 tracking-wide">
                            Class Teacher
                          </span>

                          {getClassTeachers(classId).length === 0 ? (
                            <span className="text-[10px] text-slate-405 dark:text-slate-400 italic font-medium flex items-center gap-1.5 py-1">
                              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                              No class teacher assigned
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {getClassTeachers(classId).map(t => (
                                <span
                                  key={t.id}
                                  className="bg-indigo-50/50 border border-indigo-100/60 text-indigo-700 dark:bg-indigo-950/45 dark:border-indigo-900/40 dark:text-indigo-300 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-2"
                                >
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                  {t.firstName} {t.lastName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>          {/* Interactive Assignment Drawer/Sidebar panel (Grid span 1) */}
          <div className="space-y-4">
            {editingClassId ? (
              activeManagerMode === 'subjects' ? (
                /* SUBJECTS MAPPING SIDEBAR */
                <div className="bg-slate-900 border border-amber-500/25 rounded-2xl p-5 text-slate-50 shadow-md space-y-5 flex flex-col justify-between min-h-[380px]">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">
                        Interactive Curator Mode
                      </span>
                    </div>
                    <h3 className="text-lg font-display font-bold mt-2 text-slate-100">
                      Curate Subjects taught in <span className="font-black text-amber-400 underline">{editingClassId}</span>
                    </h3>
                    <p className="text-[10.5px] text-slate-350 mt-1.5 leading-relaxed">
                      Toggle subject badges to assign or revoke topics from {editingClassId}'s active curriculum template. This will update the Teacher & Student options instantly.
                    </p>

                    <div className="mt-6 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wide block">
                        Select Subject Mapping Blueprint:
                      </span>
                      <div className="flex flex-col gap-1.5 p-1 max-h-[220px] overflow-y-auto">
                        {subjects.map(s => {
                          const isChecked = selectedSubjectIds.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => handleToggleSubjectInClass(s.id)}
                              className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                                isChecked
                                  ? 'bg-amber-500/10 border-amber-500/40 text-slate-100'
                                  : 'bg-slate-850/50 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold leading-tight">{s.name}</span>
                                <span className="text-[9px] font-mono text-slate-500 mt-0.5">{s.code}</span>
                              </div>
                              
                              <div className={`h-4.5 w-4.5 rounded-full flex items-center justify-center border transition-all ${
                                isChecked
                                  ? 'bg-amber-600 border-amber-600 text-white'
                                  : 'border-slate-600'
                              }`}>
                                {isChecked && <Check className="w-2.5 h-2.5" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center gap-2">
                    <button
                      onClick={handleSaveClassSubjects}
                      className="flex-1 bg-amber-500 hover:bg-amber-450 text-slate-950 text-xs font-black py-2.5 px-4 rounded-xl shadow-xs transition-all uppercase tracking-wide text-center"
                    >
                      Save Mapping
                    </button>
                    <button
                      onClick={() => setEditingClassId(null)}
                      className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold py-2.5 px-3.5 rounded-xl transition-all uppercase tracking-wide"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* TEACHERS ALLOCATION SIDEBAR */
                <div className="bg-slate-900 border border-indigo-500/25 rounded-2xl p-5 text-slate-50 shadow-md space-y-5 flex flex-col justify-between min-h-[350px]">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                      <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">
                        Class Teacher Assignment
                      </span>
                    </div>
                    <h3 className="text-lg font-display font-bold mt-2 text-slate-100">
                      Assign Teacher for <span className="font-black text-indigo-400 underline">{editingClassId}</span>
                    </h3>
                    <p className="text-[10.5px] text-slate-350 mt-1.5 leading-relaxed">
                      In primary and preschool education streams, one dedicated teacher handles all curriculum subjects for a class. Assigning a teacher here automatically schedules them to teach all of {editingClassId}'s subjects.
                    </p>

                    <div className="mt-6 space-y-3">
                      <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wide block">
                        Select Class Teacher:
                      </span>
                      
                      {(() => {
                        const activeTeacher = getClassTeacher(editingClassId);
                        return (
                          <div className="space-y-3.5">
                            <select
                              value={activeTeacher?.id || ''}
                              onChange={(e) => handleAssignClassTeacher(e.target.value)}
                              className="w-full bg-slate-850 border border-slate-700 rounded-xl text-xs py-3 px-3.5 text-slate-100 outline-none focus:border-indigo-500 transition-colors font-bold cursor-pointer"
                            >
                              <option value="" className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">[ No Teacher Assigned / Vacant ]</option>
                              {teachers.map(t => (
                                <option 
                                  key={t.id} 
                                  value={t.id} 
                                  className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
                                >
                                  {t.firstName} {t.lastName} ({t.department || 'Heads'})
                                </option>
                              ))}
                            </select>

                            {activeTeacher && (
                              <div className="p-3 bg-indigo-950/20 border border-indigo-900/40 rounded-xl flex items-center gap-3">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <div className="text-[10px] text-indigo-200 leading-snug">
                                  <span className="font-bold text-indigo-100">{activeTeacher.firstName} {activeTeacher.lastName}</span> is now marked as the school's active instructor for <span className="underline font-bold text-slate-100">{editingClassId}</span> across all subjects and arms.
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800">
                    <button
                      onClick={() => setEditingClassId(null)}
                      className="w-full bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-black py-2.5 rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center"
                    >
                      Close Allocation Panel
                    </button>
                  </div>
                </div>
              ) ) : (
                <div className="space-y-4">
                {/* 1. Default Guide */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs text-center py-6 space-y-3">
                  <div className="h-9 w-9 bg-amber-100 dark:bg-amber-955/25 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center mx-auto">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-slate-800 dark:text-slate-150 text-xs uppercase tracking-wider">
                      Interactive Grid Builder
                    </h4>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 leading-relaxed">
                      {isAdmin 
                        ? "Click 'Assign Subjects' beside any class to safely map their curriculum combinatorics." 
                        : "Administrators use this panel to map subjects to the appropriate term classrooms."}
                    </p>
                  </div>
                </div>

                {/* 2. Admin Automation Panel */}
                {isAdmin && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-xs space-y-4">
                    <h4 className="font-display font-extrabold text-slate-800 dark:text-slate-100 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
                      <Shield className="w-4 h-4 text-amber-600" />
                      Automatic Mapping Tools
                    </h4>

                    {/* Phase 2: Student Assignment */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-black tracking-wide text-slate-450 block">Student Auto-Assignment</span>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        Map standard class curriculum subjects directly to all enrolled students with a single click.
                      </p>
                      <button
                        type="button"
                        onClick={handleAutoAssignStudentSubjects}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] py-2 px-3 rounded-lg uppercase tracking-wider shadow-sm transition-all cursor-pointer text-center"
                      >
                        Automate Student Subjects
                      </button>
                    </div>

                    {/* Phase 3: Teacher Assignment */}
                    <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-850">
                      <span className="text-[10px] uppercase font-black tracking-wide text-slate-450 block">Teacher Auto-Assignment</span>
                      
                      {/* Subtool A: Map Class Teachers */}
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Automatically map all designated class teachers to teach all active subjects of their assigned classes.
                        </p>
                        <button
                          type="button"
                          onClick={handleAutoAssignAllTeachers}
                          className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] py-1.5 px-3 rounded-lg uppercase tracking-wider transition-all cursor-pointer text-center border border-slate-200 dark:border-slate-700"
                        >
                          Auto-Map Class Teachers
                        </button>
                      </div>

                      {/* Subtool B: Specific Assignment */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                        <p className="text-[10px] text-slate-450 font-bold leading-normal">
                          Or force-assign a specific teacher to teach all subjects of a target class:
                        </p>
                        <div className="space-y-1.5">
                          <select
                            value={autoTeacherId}
                            onChange={(e) => setAutoTeacherId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded text-[10px] py-1 px-2 text-slate-850 dark:text-slate-100 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Select Teacher --</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id} className="text-slate-900 bg-white">{t.firstName} {t.lastName}</option>
                            ))}
                          </select>
                          <select
                            value={autoClassId}
                            onChange={(e) => setAutoClassId(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded text-[10px] py-1 px-2 text-slate-850 dark:text-slate-100 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Select Class --</option>
                            {classesWithSubjects.map(c => (
                              <option key={c.classId} value={c.classId} className="text-slate-900 bg-white">{c.classId}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleAutoAssignTeacherToClass}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg uppercase tracking-wider transition-all cursor-pointer text-center shadow-xs"
                          >
                            Assign Teacher to Class
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      ) : activeSubTab === 'subjects' ? (
        /* SUBJECTS TAB VIEW: Lists subjects, shows count */
        <div className="bg-white dark:bg-slate-900 border.5 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-display font-bold text-sm uppercase text-slate-800 dark:text-slate-100 tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              Dynamic Curriculum Subjects List ({subjects.length})
            </h3>
            
            {/* Search subject */}
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search subject index..."
                value={subjectQuery}
                onChange={(e) => setSubjectQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800/80 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:outline-hidden focus:border-amber-500 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredSubjects.map(sub => {
              const activeCount = getSubjectClassCount(sub.id);
              const isDeleting = subjectToDeleteConfirm === sub.id;
              return (
                <div
                  key={sub.id}
                  className="bg-slate-50/70 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-705 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 px-2 py-0.5 rounded tracking-wider">
                        {sub.code}
                      </span>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingSubject(sub);
                              setEditSubName(sub.name);
                              setEditSubCode(sub.code);
                              setEditSubError(null);
                              setShowEditSubjectModal(true);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="Rename / Modify Subject"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSubjectToDeleteConfirm(sub.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <h4 className="font-display font-bold text-slate-900 dark:text-slate-50 text-sm mt-2.5">
                      {sub.name}
                    </h4>
                  </div>

                  {isDeleting ? (
                    <div className="mt-4 pt-3 border-t border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg space-y-2">
                      <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                        Confirm deletion of subject?
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveSubject(sub.id)}
                          className="bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-md uppercase cursor-pointer"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setSubjectToDeleteConfirm(null)}
                          className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-md uppercase cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/50 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-400">Class Assignments:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border.5 rounded-full px-2.5 py-0.5">
                        {activeCount} {activeCount === 1 ? 'Class' : 'Classes'}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ASSESSMENT ITEMS TAB VIEW */
        <div className="bg-white dark:bg-slate-900 border.5 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-display font-bold text-sm uppercase text-slate-800 dark:text-slate-100 tracking-wider flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                Early Years Assessment Items ({filteredAssessmentItems.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure learning items evaluated in Toddler, Pre-School 1, Pre-School 2, and Reception report cards.
              </p>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="relative max-w-xs w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                placeholder="Search items..."
                value={assessmentQuery}
                onChange={(e) => setAssessmentQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 pl-8 pr-3 text-xs focus:outline-hidden focus:border-amber-500 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Classes</option>
              <option value="Toddler">Toddler</option>
              <option value="Pre-School 1">Pre-School 1</option>
              <option value="Pre-School 2">Pre-School 2</option>
              <option value="Reception">Reception</option>
            </select>

            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl py-1.5 px-3 text-xs text-slate-700 dark:text-slate-200 font-medium"
            >
              <option value="ALL">All Subjects</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* List of items */}
          {filteredAssessmentItems.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              No assessment items found for the selected criteria.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAssessmentItems.map((item, idx) => {
                const sub = subjects.find(s => s.id === item.subjectId);
                return (
                  <div
                    key={item.id}
                    className="bg-slate-50/70 border border-slate-200 dark:bg-slate-900/40 dark:border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center text-[10px] font-black font-mono shrink-0">
                        {item.orderIndex || idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {item.title || item.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            Subject: {sub ? sub.name : item.subjectId}
                          </span>
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-900/40">
                            Class: {item.classId || 'All Early Years'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => handleMoveAssessmentItem(item.id, 'up')}
                          disabled={idx === 0}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => handleMoveAssessmentItem(item.id, 'down')}
                          disabled={idx === filteredAssessmentItems.length - 1}
                          className="px-2 py-1 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
                          title="Move Down"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => {
                            setEditingAssessmentItem(item);
                            setItemTitle(item.title || item.name || '');
                            setItemSubjectId(item.subjectId);
                            setItemClassId(item.classId || 'ALL');
                            setItemOrder(item.orderIndex || idx + 1);
                            setItemError(null);
                            setShowAssessmentModal(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRemoveAssessmentItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border.5 border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-805/80 pb-3">
              <h3 className="font-display font-black text-slate-900 dark:text-slate-50 text-sm sm:text-base uppercase tracking-tight flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-amber-500" />
                Onboard New Subject
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm uppercase font-extrabold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-4">
              {addError && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-[10.5px] text-rose-600 font-semibold shadow-xs">
                  ⚠️ {addError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Geography & Cartography"
                  value={newSubName}
                  onChange={(e) => {
                    setNewSubName(e.target.value);
                    setAddError(null);
                  }}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2 px-3 text-xs focus:outline-hidden focus:border-amber-500 dark:text-slate-100 placeholder-slate-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Subject Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. GEO101"
                  value={newSubCode}
                  onChange={(e) => {
                    setNewSubCode(e.target.value);
                    setAddError(null);
                  }}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2 px-3 text-xs focus:outline-hidden focus:border-amber-500 dark:text-slate-100 placeholder-slate-400 font-mono"
                />
                <span className="text-[9px] text-slate-400 block italic leading-snug">
                  If left blank, an automated curriculum tag identifier will be generated.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-xl transition-all uppercase tracking-wide cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black py-2 px-5 rounded-xl shadow-xs transition-all uppercase tracking-wide cursor-pointer"
                >
                  Add Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {showAddClassModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border.5 border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-805/80 pb-3">
              <h3 className="font-display font-black text-slate-900 dark:text-slate-50 text-sm sm:text-base uppercase tracking-tight flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-550" />
                Onboard New Class Group
              </h3>
              <button
                onClick={() => setShowAddClassModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm uppercase font-extrabold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddClass} className="space-y-4">
              {addClassError && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-[10.5px] text-rose-600 font-semibold shadow-xs">
                  ⚠️ {addClassError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Class Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Primary 6 or Nursery 1"
                  value={newClassName}
                  onChange={(e) => {
                    setNewClassName(e.target.value);
                    setAddClassError(null);
                  }}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2 px-3 text-xs focus:outline-hidden focus:border-indigo-500 dark:text-slate-100 placeholder-slate-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Academic Stage *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Pre-School', 'Primary', 'Secondary'] as const).map(stg => (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => setNewClassStage(stg)}
                      className={`py-2 px-3 text-[11px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        newClassStage === stg
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs animate-pulse-once'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-350 dark:border-slate-800'
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-slate-405 dark:text-slate-400 block italic leading-snug pt-1">
                  Once designated, assignments of core curriculum subjects and allocated form tutoring staff can be managed dynamically.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-xl transition-all uppercase tracking-wide cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-5 rounded-xl shadow-xs transition-all uppercase tracking-wide cursor-pointer"
                >
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditClassModal && selectedClassToEdit && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border.5 border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-805/80 pb-3">
              <h3 className="font-display font-black text-slate-900 dark:text-slate-50 text-sm sm:text-base uppercase tracking-tight flex items-center gap-1.5">
                <Edit className="w-4 h-4 text-indigo-550" />
                Modify Class Group
              </h3>
              <button
                onClick={() => {
                  setShowEditClassModal(false);
                  setSelectedClassToEdit(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm uppercase font-extrabold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditClass} className="space-y-4">
              {editClassError && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-[10.5px] text-rose-600 font-semibold shadow-xs">
                  ⚠️ {editClassError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Class Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Primary 6 or Nursery 1"
                  value={editClassName}
                  onChange={(e) => {
                    setEditClassName(e.target.value);
                    setEditClassError(null);
                  }}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2.5 px-3 text-xs focus:outline-hidden focus:border-indigo-500 dark:text-slate-100 placeholder-slate-400 font-bold"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Academic Stage *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Pre-School', 'Primary', 'Secondary'] as const).map(stg => (
                    <button
                      key={stg}
                      type="button"
                      onClick={() => setEditClassStage(stg)}
                      className={`py-2 px-3 text-[11px] font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        editClassStage === stg
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-350 dark:border-slate-800'
                      }`}
                    >
                      {stg}
                    </button>
                  ))}
                </div>
                <span className="text-[9px] text-slate-405 dark:text-slate-400 block italic leading-snug pt-1">
                  Adjusting the school level structures core academic reports, tutoring systems, and grade scaling templates safely.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditClassModal(false);
                    setSelectedClassToEdit(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-605 font-semibold py-2 px-4 rounded-xl transition-all uppercase tracking-wide cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-5 rounded-xl shadow-xs transition-all uppercase tracking-wide cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && editingSubject && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border.5 border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-805/80 pb-3">
              <h3 className="font-display font-black text-slate-900 dark:text-slate-50 text-sm sm:text-base uppercase tracking-tight flex items-center gap-1.5">
                <Edit className="w-4 h-4 text-amber-500" />
                Edit Subject Details
              </h3>
              <button
                onClick={() => {
                  setShowEditSubjectModal(false);
                  setEditingSubject(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm uppercase font-extrabold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSubject} className="space-y-4">
              {editSubError && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-[10.5px] text-rose-600 font-semibold shadow-xs">
                  ⚠️ {editSubError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Subject Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics"
                  value={editSubName}
                  onChange={(e) => {
                    setEditSubName(e.target.value);
                    setEditSubError(null);
                  }}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2 px-3 text-xs focus:outline-hidden focus:border-amber-500 dark:text-slate-100 placeholder-slate-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g. MTH101"
                  value={editSubCode}
                  onChange={(e) => {
                    setEditSubCode(e.target.value);
                    setEditSubError(null);
                  }}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2 px-3 text-xs focus:outline-hidden focus:border-amber-500 dark:text-slate-100 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubjectModal(false);
                    setEditingSubject(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-xl transition-all uppercase tracking-wide cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black py-2 px-5 rounded-xl shadow-xs transition-all uppercase tracking-wide cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Assessment Item Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border.5 border-slate-200 dark:border-slate-800 w-full max-w-md rounded-2xl shadow-xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-805/80 pb-3">
              <h3 className="font-display font-black text-slate-900 dark:text-slate-50 text-sm sm:text-base uppercase tracking-tight flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-amber-500" />
                {editingAssessmentItem ? 'Edit Assessment Item' : 'New Early Years Assessment Item'}
              </h3>
              <button
                onClick={() => setShowAssessmentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm uppercase font-extrabold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssessmentItem} className="space-y-4">
              {itemError && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-[10.5px] text-rose-600 font-semibold shadow-xs">
                  ⚠️ {itemError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Assessment Title / Skill *</label>
                <input
                  type="text"
                  placeholder="e.g. Recognizes basic shapes and colors"
                  value={itemTitle}
                  onChange={(e) => {
                    setItemTitle(e.target.value);
                    setItemError(null);
                  }}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2 px-3 text-xs focus:outline-hidden focus:border-amber-500 dark:text-slate-100 placeholder-slate-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Subject *</label>
                <select
                  value={itemSubjectId}
                  onChange={(e) => setItemSubjectId(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-100 font-medium"
                  required
                >
                  <option value="" disabled>-- Select Associated Subject --</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Class Level</label>
                <select
                  value={itemClassId}
                  onChange={(e) => setItemClassId(e.target.value)}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-100 font-medium"
                >
                  <option value="ALL">All Early Years Classes</option>
                  <option value="Toddler">Toddler</option>
                  <option value="Pre-School 1">Pre-School 1</option>
                  <option value="Pre-School 2">Pre-School 2</option>
                  <option value="Reception">Reception</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-slate-450 block">Display Order Index</label>
                <input
                  type="number"
                  value={itemOrder}
                  onChange={(e) => setItemOrder(parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border.5 rounded-xl py-2 px-3 text-xs focus:outline-hidden focus:border-amber-500 dark:text-slate-100 font-mono"
                  min={1}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAssessmentModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-xl transition-all uppercase tracking-wide cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black py-2 px-5 rounded-xl shadow-xs transition-all uppercase tracking-wide cursor-pointer"
                >
                  {editingAssessmentItem ? 'Save Item' : 'Add Assessment Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
