import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Calendar, 
  Award, 
  Users, 
  UserPlus, 
  BookOpen, 
  Clipboard, 
  Briefcase, 
  Clock, 
  IdCard, 
  UserCheck, 
  AlertCircle,
  Pencil
} from 'lucide-react';
import { Student, Teacher, Parent, ResultRecord, AttendanceRecord, SchoolTerm, Subject, AssessmentItem } from '../types';
import { isChecklistPreschoolClass, isReceptionClass } from '../data/preschoolSkills';

interface TeacherPortalProps {
  currentRole: string;
  teachers: Teacher[];
  onSetTeachers: (tch: Teacher[]) => void;
  students: Student[];
  onSetStudents?: (students: Student[]) => void;
  results: ResultRecord[];
  onSetResults: (res: ResultRecord[]) => void;
  attendance: AttendanceRecord[];
  onSetAttendance: (att: AttendanceRecord[]) => void;
  subjects: Subject[];
  activeSessionName: string;
  activeTerm: SchoolTerm;
  classes?: string[];
  classesWithSubjects?: { classId: string; subjects?: string[]; stage?: 'Pre-School' | 'Primary' | 'Secondary' }[];
  assessmentItems?: AssessmentItem[];
  staffAdmins?: any[];
  onSetStaffAdmins?: (sa: any[]) => void;
  parents?: Parent[];
  onSetParents?: (pa: Parent[]) => void;
  userEmail?: string;
  activeTab?: string;
}

export default function TeacherPortal({
  currentRole,
  teachers,
  onSetTeachers,
  students,
  onSetStudents,
  results,
  onSetResults,
  attendance,
  onSetAttendance,
  subjects,
  activeSessionName,
  activeTerm,
  classes = [],
  classesWithSubjects,
  assessmentItems = [],
  staffAdmins = [],
  onSetStaffAdmins,
  parents = [],
  onSetParents,
  userEmail,
  activeTab
}: TeacherPortalProps) {
  
  // Dashboard view selection inside teacher component
  const isAdminOrSuper = currentRole === 'SUPER_ADMIN' || currentRole === 'SCHOOL_ADMIN';
  const [internalTab, setInternalTab] = useState(() => {
    if (activeTab === 'staff') return 'staff';
    if (activeTab === 'attendance') return 'attendance';
    return isAdminOrSuper ? 'staff' : 'attendance';
  });

  // Sync internalTab with activeTab if provided
  React.useEffect(() => {
    if (activeTab === 'staff') {
      setInternalTab('staff');
    } else if (activeTab === 'attendance') {
      setInternalTab('attendance');
    }
  }, [activeTab]);

  // Attendance marking states
  const [attClass, setAttClass] = useState('');
  const [attArm, setAttArm] = useState('A');
  const [attDate, setAttDate] = useState('2026-05-25');
  const [tempAtt, setTempAtt] = useState<Record<string, { status: 'Present' | 'Absent' | 'Late'; remark: string }>>({});

  // Score processing states
  const [scoreClass, setScoreClass] = useState('');
  const [scoreArm, setScoreArm] = useState('A');
  const [scoreSubject, setScoreSubject] = useState('maths');
  const [scoreTerm, setScoreTerm] = useState<SchoolTerm>(activeTerm);
  const [tempScores, setTempScores] = useState<Record<string, { test: number; assignment: number; exam: number; remark: string }>>({});

  // Preschool Checklist Specific States
  const [selectedPreschoolStudentId, setSelectedPreschoolStudentId] = useState<string>('');
  const [preschoolGrades, setPreschoolGrades] = useState<Record<string, 'EXCELLENT' | 'VERY GOOD' | 'GOOD' | 'FAIR' | ''>>({});
  const [preschoolRemark, setPreschoolRemark] = useState('');

  // Assessment items for scoreClass
  const teacherClassItems = (assessmentItems || []).filter(i => !i.classId || i.classId.toLowerCase() === scoreClass.toLowerCase());

  // Staff onboarding states (Admin only)
  const [activeOnboardCategory, setActiveOnboardCategory] = useState<'TEACHER' | 'SCHOOL_ADMIN' | 'PARENT'>('TEACHER');
  const [parentAddress, setParentAddress] = useState('');
  const [editingStaffAdminId, setEditingStaffAdminId] = useState<string | null>(null);
  const [editingParentId, setEditingParentId] = useState<string | null>(null);
  const [parentRelationship, setParentRelationship] = useState('Father');
  const [parentLinkedChildren, setParentLinkedChildren] = useState<string[]>([]);
  const [staffFirstName, setStaffFirstName] = useState('');
  const [staffLastName, setStaffLastName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffDept, setStaffDept] = useState('Science & Math');
  const [staffAssignedClass, setStaffAssignedClass] = useState('');
  const [staffAssignedArm, setStaffAssignedArm] = useState('A');
  const [staffAssignedSubs, setStaffAssignedSubs] = useState<string[]>(['maths']);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [activeListTab, setActiveListTab] = useState<'TEACHER' | 'SCHOOL_ADMIN' | 'PARENT'>('TEACHER');
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [staffStatus, setStaffStatus] = useState<'Active' | 'Inactive'>('Active');
  const [staffPhotoUrl, setStaffPhotoUrl] = useState('');

  const [notif, setNotif] = useState<string | null>(null);

  // Derived teacher-specific assignments to restrict access to their specific classes and subjects
  const loggedInTeacher = teachers.find(t => t.email?.toLowerCase() === userEmail?.toLowerCase());
  const teacherClasses = loggedInTeacher && loggedInTeacher.classesAssigned
    ? Array.from(new Set(loggedInTeacher.classesAssigned.map(ca => ca.classId)))
    : [];

  const availableClasses = isAdminOrSuper
    ? classes
    : teacherClasses;

  const availableArms = isAdminOrSuper
    ? ['A', 'B', 'C']
    : (loggedInTeacher && loggedInTeacher.classesAssigned
        ? Array.from(new Set(
            loggedInTeacher.classesAssigned
              .filter(ca => ca.classId === (internalTab === 'attendance' ? attClass : scoreClass))
              .map(ca => ca.arm)
          ))
        : ['A', 'B', 'C']);

  // Synchronize dropdown selections for logged in teachers
  React.useEffect(() => {
    if (!isAdminOrSuper && loggedInTeacher && loggedInTeacher.classesAssigned) {
      const assigned = loggedInTeacher.classesAssigned;
      if (assigned.length > 0) {
        // Sync attendance class/arm
        const firstAssigned = assigned[0];
        const isAttValid = assigned.some(ca => ca.classId === attClass && ca.arm === attArm);
        if (!isAttValid) {
          setAttClass(firstAssigned.classId);
          setAttArm(firstAssigned.arm);
        }
        // Sync score class/arm/subject
        const currentScoreAssigned = assigned.find(ca => ca.classId === scoreClass && ca.arm === scoreArm);
        if (!currentScoreAssigned) {
          setScoreClass(firstAssigned.classId);
          setScoreArm(firstAssigned.arm);
          setScoreSubject(firstAssigned.subjectId);
        } else {
          const isSubValid = assigned.some(ca => ca.classId === scoreClass && ca.arm === scoreArm && ca.subjectId === scoreSubject);
          if (!isSubValid) {
            const firstSubForClass = assigned.find(ca => ca.classId === scoreClass && ca.arm === scoreArm);
            if (firstSubForClass) {
              setScoreSubject(firstSubForClass.subjectId);
            }
          }
        }
      }
    }
  }, [internalTab, teachers, userEmail, attClass, attArm, scoreClass, scoreArm, scoreSubject, isAdminOrSuper]);

  React.useEffect(() => {
    if (availableClasses && availableClasses.length > 0) {
      if (!attClass || !availableClasses.includes(attClass)) {
        setAttClass(availableClasses[0]);
      }
      if (!scoreClass || !availableClasses.includes(scoreClass)) {
        setScoreClass(availableClasses[0]);
      }
      if (!staffAssignedClass || !availableClasses.includes(staffAssignedClass)) {
        setStaffAssignedClass(availableClasses[0]);
      }
    }
  }, [availableClasses]);

  // Filter students for attendance marking
  const studentsInSelectedClass = React.useMemo(() => {
    const list = students.filter(s => 
      (s.classId || '').toLowerCase() === (attClass || '').toLowerCase() && 
      (s.arm || '').toLowerCase() === (attArm || '').toLowerCase() && 
      s.status === 'Active'
    );
    if (isAdminOrSuper) {
      return list;
    }
    if (loggedInTeacher) {
      // Must be assigned to this class/arm (either as class teacher or subject teacher)
      const isAssigned = (loggedInTeacher.classesAssigned || []).some(ca => 
        ca.classId?.toLowerCase() === attClass?.toLowerCase() &&
        ca.arm?.toLowerCase() === attArm?.toLowerCase()
      );
      if (isAssigned) {
        return list;
      }
    }
    return [];
  }, [students, attClass, attArm, loggedInTeacher, isAdminOrSuper]);
  
  // Filter students for score processing sheet
  const studentsInScoreClass = React.useMemo(() => {
    const list = students.filter(s => 
      (s.classId || '').toLowerCase() === (scoreClass || '').toLowerCase() && 
      (s.arm || '').toLowerCase() === (scoreArm || '').toLowerCase() && 
      s.status === 'Active'
    );
    if (isAdminOrSuper) {
      return list;
    }
    if (loggedInTeacher) {
      // Class Teacher for this class/arm?
      const hasGeneralAdmin = (loggedInTeacher.classesAssigned || []).some(ca => 
        ca.classId?.toLowerCase() === scoreClass?.toLowerCase() &&
        ca.arm?.toLowerCase() === scoreArm?.toLowerCase() &&
        ca.subjectId === 'general_admin'
      );
      if (hasGeneralAdmin) {
        return list;
      }
      // Subject Teacher: only show students who are taking the selected scoreSubject
      return list.filter(s => 
        (s.subjects || []).some(sub => sub.toLowerCase() === scoreSubject.toLowerCase())
      );
    }
    return [];
  }, [students, scoreClass, scoreArm, scoreSubject, loggedInTeacher, isAdminOrSuper]);

  const availableSubjects = isAdminOrSuper
    ? subjects
    : (loggedInTeacher && loggedInTeacher.classesAssigned
        ? subjects.filter(sub => 
            loggedInTeacher.classesAssigned.some(ca => 
              ca.classId === scoreClass && ca.arm === scoreArm && ca.subjectId === sub.id
            )
          )
        : subjects);

  // Automatically load the attendance grid when selection parameters change
  React.useEffect(() => {
    const grid: typeof tempAtt = {};
    const studentsInSelectedClass = students.filter(s => s.classId === attClass && s.arm === attArm && s.status === 'Active');
    studentsInSelectedClass.forEach(s => {
      const existing = attendance.find(a => a.entityId === s.id && a.date === attDate && a.entityType === 'Student');
      grid[s.id] = {
        status: existing ? existing.status : 'Present',
        remark: existing?.remark || ''
      };
    });
    setTempAtt(grid);
  }, [attClass, attArm, attDate, students, attendance]);

  // Trigger local state load when class is selected for attendance
  const initializeAttendanceGrid = () => {
    const grid: typeof tempAtt = {};
    studentsInSelectedClass.forEach(s => {
      // Look if attendance already marked for this date
      const existing = attendance.find(a => a.entityId === s.id && a.date === attDate && a.entityType === 'Student');
      grid[s.id] = {
        status: existing ? existing.status : 'Present',
        remark: existing?.remark || ''
      };
    });
    setTempAtt(grid);
    triggerNotification('Attendance worksheet populated.');
  };

  const handleSaveAttendance = () => {
    const updatedAttendance = [...attendance];
    Object.keys(tempAtt).forEach((studentId) => {
      const data = tempAtt[studentId];
      // Find if duplicate exists
      const idx = updatedAttendance.findIndex(a => a.entityId === studentId && a.date === attDate && a.entityType === 'Student');
      const newRec: AttendanceRecord = {
        id: idx >= 0 ? updatedAttendance[idx].id : `att_${Date.now()}_${studentId}`,
        date: attDate,
        entityId: studentId,
        entityType: 'Student',
        status: data.status,
        remark: data.remark,
        session: activeSessionName,
        term: activeTerm
      };

      if (idx >= 0) {
        updatedAttendance[idx] = newRec;
      } else {
        updatedAttendance.push(newRec);
      }
    });

    onSetAttendance(updatedAttendance);
    triggerNotification('Daily student attendance log successfully saved.');
  };

  // Grade processor helper
  const calculateGradeAndRemarks = (total: number) => {
    if (total >= 75) return { grade: 'A', remark: 'Excellent' };
    if (total >= 65) return { grade: 'B', remark: 'Very Good' };
    if (total >= 55) return { grade: 'C', remark: 'Good' };
    if (total >= 45) return { grade: 'P', remark: 'Pass' };
    return { grade: 'F', remark: 'Fail' };
  };

  const loadPreschoolStudentGrades = (stdId: string) => {
    if (!stdId) return;
    const studentResults = results.filter(r => 
      r.studentId === stdId && 
      r.classId === scoreClass && 
      r.arm === scoreArm && 
      r.term === scoreTerm && 
      r.session === activeSessionName
    );
    
    const gradesMap: Record<string, 'EXCELLENT' | 'VERY GOOD' | 'GOOD' | 'FAIR' | ''> = {};
    let generalRemark = '';

    studentResults.forEach(r => {
      if (r.grade) {
        gradesMap[r.subjectId] = r.grade as any;
        if (r.subjectId.startsWith('preschool_skill_')) {
          const idxStr = r.subjectId.replace('preschool_skill_', '');
          const idx = parseInt(idxStr, 10);
          if (!isNaN(idx)) {
            gradesMap[idx] = r.grade as any;
          }
        }
      }
    });

    const withRemark = studentResults.find(r => r.teacherRemark);
    if (withRemark) generalRemark = withRemark.teacherRemark;
    
    setPreschoolGrades(gradesMap);
    setPreschoolRemark(generalRemark);
  };

  const handleSavePreschoolGrades = (stdId: string) => {
    if (!stdId) return;
    
    // We remove all previous preschool skill entries for this student/term/session in results to overwrite freshly
    let updatedResults = results.filter(r => !(
      r.studentId === stdId && 
      r.classId === scoreClass && 
      r.arm === scoreArm && 
      r.term === scoreTerm && 
      r.session === activeSessionName
    ));
    
    teacherClassItems.forEach((item, idx) => {
      const rating = preschoolGrades[item.id] ?? preschoolGrades[idx] ?? '';
      if (!rating) return;
      
      let totalScore = 0;
      if (rating === 'EXCELLENT') totalScore = 4;
      else if (rating === 'VERY GOOD') totalScore = 3;
      else if (rating === 'GOOD') totalScore = 2;
      else if (rating === 'FAIR') totalScore = 1;

      const newRec: ResultRecord = {
        id: `res_preschool_${stdId}_${scoreTerm.replace(/\s+/g, '_')}_${item.id}`,
        studentId: stdId,
        classId: scoreClass,
        arm: scoreArm,
        subjectId: item.id,
        term: scoreTerm,
        session: activeSessionName,
        testScore: 0,
        assignmentScore: 0,
        examScore: 0,
        totalScore: totalScore,
        grade: rating,
        teacherRemark: preschoolRemark || `${rating} performance in ${item.name || item.title}`,
        isApproved: false // Needs admin approval
      };
      
      updatedResults.push(newRec);
    });
    
    onSetResults(updatedResults);
    triggerNotification('Successfully saved evaluation scorecard for child! Awaiting Admin publication approval.');
  };

  const initializeScoresGrid = () => {
    const isPreschool = isChecklistPreschoolClass(scoreClass, classesWithSubjects);
    if (isPreschool) {
      if (studentsInScoreClass.length > 0) {
        const firstStudent = studentsInScoreClass[0].id;
        setSelectedPreschoolStudentId(firstStudent);
        loadPreschoolStudentGrades(firstStudent);
      } else {
        setSelectedPreschoolStudentId('');
        setPreschoolGrades({});
        setPreschoolRemark('');
      }
      triggerNotification('Pre-school class evaluation sheet generated.');
      return;
    }

    const grid: typeof tempScores = {};
    studentsInScoreClass.forEach(s => {
      const existing = results.find(r => 
        r.studentId === s.id && 
        r.classId === scoreClass && 
        r.arm === scoreArm && 
        r.subjectId === scoreSubject && 
        r.term === scoreTerm && 
        r.session === activeSessionName
      );
      grid[s.id] = {
        test: existing ? existing.testScore : 0,
        assignment: existing ? existing.assignmentScore : 0,
        exam: existing ? existing.examScore : 0,
        remark: existing ? existing.teacherRemark : ''
      };
    });
    setTempScores(grid);
    triggerNotification('Pupils academic marks matrix loaded.');
  };

  const handleSaveScores = () => {
    const updatedResults = [...results];
    Object.keys(tempScores).forEach((studentId) => {
      const data = tempScores[studentId];
      const total = data.test + data.assignment + data.exam;
      const { grade, remark } = calculateGradeAndRemarks(total);

      const existingIdx = updatedResults.findIndex(r => 
        r.studentId === studentId && 
        r.classId === scoreClass && 
        r.arm === scoreArm && 
        r.subjectId === scoreSubject && 
        r.term === scoreTerm && 
        r.session === activeSessionName
      );

      const newRec: ResultRecord = {
        id: existingIdx >= 0 ? updatedResults[existingIdx].id : `res_${Date.now()}_${studentId}`,
        studentId,
        classId: scoreClass,
        arm: scoreArm,
        subjectId: scoreSubject,
        term: scoreTerm,
        session: activeSessionName,
        testScore: data.test,
        assignmentScore: data.assignment,
        examScore: data.exam,
        totalScore: total,
        grade,
        teacherRemark: data.remark || remark,
        isApproved: false // Requires admin approval
      };

      if (existingIdx >= 0) {
        // If results was locked, only overwrite if not approved, or bypass for demo
        updatedResults[existingIdx] = newRec;
      } else {
        updatedResults.push(newRec);
      }
    });

    onSetResults(updatedResults);
    triggerNotification('Term scores uploaded. Awaiting School Admin publication approval.');
  };

  const triggerNotification = (text: string) => {
    setNotif(text);
    setTimeout(() => setNotif(null), 3500);
  };

  const generateStaffId = () => {
    const year = activeSessionName.split('/')[0] || '2026';
    const num = String(teachers.length + 1).padStart(3, '0');
    return `STAFF/${year}/${num}`;
  };

  const handleCancelEdit = () => {
    setEditingStaffId(null);
    setEditingStaffAdminId(null);
    setEditingParentId(null);
    setStaffFirstName('');
    setStaffLastName('');
    setStaffEmail('');
    setStaffPhone('');
    setStaffDept('Science & Math');
    setStaffStatus('Active');
    setParentAddress('');
    setParentRelationship('Father');
    setParentLinkedChildren([]);
    setStaffAssignedClass(classes[0] || '');
    setStaffAssignedArm('A');
    setStaffAssignedSubs(['maths']);
    setStaffPhotoUrl('');
  };

  const handleEditClick = (tch: Teacher) => {
    setActiveOnboardCategory('TEACHER');
    setEditingStaffId(tch.id);
    setStaffFirstName(tch.firstName);
    setStaffLastName(tch.lastName);
    setStaffEmail(tch.email);
    setStaffPhone(tch.phone);
    setStaffDept(tch.department);
    setStaffStatus(tch.status);
    setStaffPhotoUrl(tch.photo || '');
    
    if (tch.classesAssigned && tch.classesAssigned.length > 0) {
      setStaffAssignedClass(tch.classesAssigned[0].classId);
      setStaffAssignedArm(tch.classesAssigned[0].arm);
      setStaffAssignedSubs(tch.classesAssigned.map(ca => ca.subjectId));
    } else {
      setStaffAssignedClass(classes[0] || '');
      setStaffAssignedArm('A');
      setStaffAssignedSubs([]);
    }
    triggerNotification(`Editing details for ${tch.firstName} ${tch.lastName}`);
  };

  const handleEditStaffAdminClick = (sa: any) => {
    setActiveOnboardCategory('SCHOOL_ADMIN');
    setEditingStaffAdminId(sa.userId);
    setStaffFirstName(sa.fullName ? sa.fullName.split(' ')[0] : '');
    setStaffLastName(sa.fullName ? sa.fullName.split(' ').slice(1).join(' ') : '');
    setStaffEmail(sa.email);
    setStaffPhone('');
    setStaffDept(sa.department || 'Administration');
    setStaffStatus('Active');
    triggerNotification(`Editing details for Staff Admin: ${sa.fullName}`);
  };

  const handleEditParentClick = (pa: any) => {
    setActiveOnboardCategory('PARENT');
    setEditingParentId(pa.id);
    setStaffFirstName(pa.firstName);
    setStaffLastName(pa.lastName || '');
    setStaffEmail(pa.email);
    setStaffPhone(pa.phone || '');
    
    let rel = 'Father';
    let addr = pa.address || '';
    if (addr.startsWith('Relationship: ')) {
      const parts = addr.split(' | Address: ');
      rel = parts[0].replace('Relationship: ', '');
      addr = parts[1] || '';
    }
    setParentRelationship(rel);
    setParentAddress(addr);
    setStaffStatus(pa.status || 'Active');

    const linked = students.filter(s => s.parentId === pa.id).map(s => s.id);
    setParentLinkedChildren(linked);

    triggerNotification(`Editing details for Parent: ${pa.firstName} ${pa.lastName}`);
  };

  const handleDeleteStaffAdmin = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this Staff Admin?')) return;
    try {
      const res = await fetch(`/api/staff-admins/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete Staff Admin');
      if (onSetStaffAdmins) {
        onSetStaffAdmins(staffAdmins.filter(sa => sa.userId !== userId));
      }
      triggerNotification('Staff Admin successfully deleted');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteParent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Parent? This may affect student linkages.')) return;
    try {
      const res = await fetch(`/api/parents/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete Parent');
      if (onSetParents) {
        onSetParents(parents.filter(p => p.id !== id));
      }
      triggerNotification('Parent successfully deleted');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleParentStatus = async (pa: Parent) => {
    const newStatus = pa.status === 'Active' ? 'Inactive' : 'Active';
    const updatedParent: Parent = { ...pa, status: newStatus as 'Active' | 'Inactive' };
    try {
      const res = await fetch(`/api/parents/${pa.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedParent),
      });
      if (!res.ok) throw new Error('Failed to update parent status');
      if (onSetParents) {
        onSetParents(parents.map(p => p.id === pa.id ? updatedParent : p));
      }
      triggerNotification(`Parent status updated to ${newStatus}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Teacher? This will delete their staff and login accounts.')) return;
    try {
      const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete Teacher');
      onSetTeachers(teachers.filter(t => t.id !== id));
      triggerNotification('Teacher successfully deleted');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!window.confirm(`Are you sure you want to reset password to default (1234) for ${email}?`)) return;
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to reset password');
      alert(`Password successfully reset to default "1234" for ${email}`);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOnboardStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFirstName || !staffLastName || !staffEmail) {
      alert('Mandatory fields are missing.');
      return;
    }

    if (activeOnboardCategory === 'TEACHER') {
      if (staffAssignedSubs.length === 0) {
        alert('Please select at least one assigned subject for this staff.');
        return;
      }

      if (editingStaffId) {
        const updatedTeachers = teachers.map(t => {
          if (t.id === editingStaffId) {
            return {
              ...t,
              firstName: staffFirstName,
              lastName: staffLastName,
              email: staffEmail,
              phone: staffPhone || '+234 800 000 0000',
              department: staffDept,
              status: staffStatus,
              classesAssigned: staffAssignedSubs.map(subId => ({
                classId: staffAssignedClass,
                arm: staffAssignedArm,
                subjectId: subId
              })),
              photo: staffPhotoUrl || undefined
            };
          }
          return t;
        });

        onSetTeachers(updatedTeachers);
        triggerNotification(`Success: Updated staff profile for ${staffFirstName} ${staffLastName}`);
        handleCancelEdit();
      } else {
        const newStaff: Teacher = {
          id: `tch_${Date.now()}`,
          staffId: generateStaffId(),
          firstName: staffFirstName,
          lastName: staffLastName,
          email: staffEmail,
          phone: staffPhone || '+234 800 000 0000',
          department: staffDept,
          status: 'Active',
          classesAssigned: staffAssignedSubs.map(subId => ({
            classId: staffAssignedClass,
            arm: staffAssignedArm,
            subjectId: subId
          })),
          photo: staffPhotoUrl || undefined
        };

        onSetTeachers([...teachers, newStaff]);
        triggerNotification(`Onboarded: Generated ${newStaff.staffId} for ${staffFirstName}`);
        handleCancelEdit();
      }
    } else if (activeOnboardCategory === 'SCHOOL_ADMIN') {
      const payload = {
        userId: editingStaffAdminId || `usr_${Date.now()}`,
        email: staffEmail,
        fullName: `${staffFirstName} ${staffLastName}`.trim(),
        department: staffDept,
        permissions: {},
      };

      try {
        if (editingStaffAdminId) {
          const res = await fetch(`/api/staff-admins/${editingStaffAdminId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Failed to update staff admin');
          
          if (onSetStaffAdmins) {
            onSetStaffAdmins(staffAdmins.map(sa => sa.userId === editingStaffAdminId ? payload : sa));
          }
          triggerNotification(`Updated Staff Admin: ${payload.fullName}`);
        } else {
          const res = await fetch('/api/staff-admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Failed to onboard staff admin');
          const created = await res.json();
          if (onSetStaffAdmins) {
            onSetStaffAdmins([...staffAdmins, created]);
          }
          triggerNotification(`Onboarded Staff Admin: ${payload.fullName}`);
        }
        handleCancelEdit();
      } catch (err: any) {
        alert(err.message);
      }
    } else if (activeOnboardCategory === 'PARENT') {
      const parentId = editingParentId || `par_${Date.now()}`;
      const payload: Parent = {
        id: parentId,
        firstName: staffFirstName,
        lastName: staffLastName,
        email: staffEmail,
        phone: staffPhone || '+234 800 000 0000',
        address: `Relationship: ${parentRelationship} | Address: ${parentAddress || 'Lagos, Nigeria'}`,
        status: staffStatus as 'Active' | 'Inactive' | 'Suspended',
      };

      try {
        let savedParent = payload;
        if (editingParentId) {
          const res = await fetch(`/api/parents/${editingParentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Failed to update parent');
          if (onSetParents) {
            onSetParents(parents.map(p => p.id === editingParentId ? payload : p));
          }
          triggerNotification(`Updated Parent: ${payload.firstName} ${payload.lastName}`);
        } else {
          const res = await fetch('/api/parents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error('Failed to onboard parent');
          const created = await res.json();
          savedParent = created;
          if (onSetParents) {
            onSetParents([...parents, created]);
          }
          triggerNotification(`Onboarded Parent: ${payload.firstName} ${payload.lastName}`);
        }

        // Link/unlink students
        const parentName = `${savedParent.firstName} ${savedParent.lastName || ''}`.trim();
        const parentEmail = savedParent.email;
        const parentPhone = savedParent.phone;

        const studentsToUpdate = students.map(s => {
          const isLinkedNow = parentLinkedChildren.includes(s.id);
          const wasLinkedBefore = s.parentId === parentId;

          if (isLinkedNow && !wasLinkedBefore) {
            return { ...s, parentId, parentName, parentEmail, parentPhone } as Student;
          } else if (!isLinkedNow && wasLinkedBefore) {
            return { ...s, parentId: '', parentName: '', parentEmail: '', parentPhone: '' } as Student;
          }
          return null;
        }).filter((s): s is Student => s !== null);

        for (const std of studentsToUpdate) {
          await fetch(`/api/students/${std.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(std)
          });
        }

        if (onSetStudents) {
          const updatedLocalStudents = students.map(s => {
            const found = studentsToUpdate.find(tu => tu.id === s.id);
            return found ? found : s;
          });
          onSetStudents(updatedLocalStudents);
        }

        handleCancelEdit();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Alert toast info */}
      {notif && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-2">
          <Check size={14} />
          <span>{notif}</span>
        </div>
      )}

      {/* Internal Navigation tabs */}
      {!(activeTab === 'staff' || activeTab === 'attendance') && (
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          {!isAdminOrSuper && (
            <>
              <button
                onClick={() => setInternalTab('attendance')}
                className={`py-2 px-4 text-xs font-bold transition-all ${
                  internalTab === 'attendance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                📝 Pupils Attendance List
              </button>
              <button
                onClick={() => setInternalTab('scores')}
                className={`py-2 px-4 text-xs font-bold transition-all ${
                  internalTab === 'scores' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                🖊️ Grade/Score Processor
              </button>
            </>
          )}

          {isAdminOrSuper && (
            <>
              <button
                onClick={() => setInternalTab('staff')}
                className={`py-2 px-4 text-xs font-bold transition-all ${
                  internalTab === 'staff' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                💼 Staff Directory & Onboarding
              </button>
              {activeTab !== 'staff' && (
                <button
                  onClick={() => setInternalTab('attendance')}
                  className={`py-2 px-4 text-xs font-bold transition-all ${
                    internalTab === 'attendance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  ⚙️ Pupil Attendance Tracker
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ---------------- 1. ATTENDANCE INTERFACE ---------------- */}
      {internalTab === 'attendance' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Mark Student Attendance Grid</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Select class</label>
                <select
                  value={attClass}
                  onChange={(e) => setAttClass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Select Arm</label>
                <select
                  value={attArm}
                  onChange={(e) => setAttArm(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  {availableArms.map(arm => (
                    <option key={arm} value={arm}>Arm {arm}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-semibold block mb-1">Calendar Date</label>
                <input
                  type="date"
                  value={attDate}
                  onChange={(e) => setAttDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 text-xs py-1.8 px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                />
              </div>

              <button
                onClick={initializeAttendanceGrid}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-lg shadow-sm transition-colors"
              >
                Fetch Class Roster
              </button>
            </div>
          </div>

          {/* Attendance entries list */}
          {studentsInSelectedClass.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">Pupil</th>
                      <th className="py-3 px-4">Admission ID</th>
                      <th className="py-3 px-4">Daily Status Selector</th>
                      <th className="py-3 px-4">Remarks / Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {studentsInSelectedClass.map(stud => {
                      const selection = tempAtt[stud.id] || { status: 'Present', remark: '' };
                      return (
                        <tr key={stud.id} className="text-xs text-slate-700 dark:text-slate-300">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img src={stud.photo} alt={stud.firstName} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                              <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {stud.firstName} {stud.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono">{stud.admissionNo}</td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              {(['Present', 'Absent', 'Late'] as const).map(stat => (
                                <button
                                  key={stat}
                                  onClick={() => setTempAtt({
                                    ...tempAtt,
                                    [stud.id]: { ...selection, status: stat }
                                  })}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded transiton-all ${
                                    selection.status === stat 
                                      ? stat === 'Present' ? 'bg-emerald-500 text-white' :
                                        stat === 'Absent' ? 'bg-rose-500 text-white' :
                                        'bg-amber-500 text-slate-950'
                                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
                                  }`}
                                >
                                  {stat}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={selection.remark}
                              onChange={(e) => setTempAtt({
                                ...tempAtt,
                                [stud.id]: { ...selection, remark: e.target.value }
                              })}
                              className="w-full bg-slate-50 dark:bg-slate-850 py-1.5 px-3 border border-slate-200 dark:border-slate-800 rounded focus:outline-none focus:border-blue-500"
                              placeholder="Add optional remarks (e.g. sick leave, late transit)"
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
                  onClick={handleSaveAttendance}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 px-6 rounded-lg shadow-sm font-semibold transition-colors"
                >
                  Save & Publicize Daily Attendance
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 italic bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Select class and click "Fetch Class Roster" to load student list.
            </div>
          )}
        </div>
      )}

      {/* ---------------- 2. SCORE PROCESSING SYSTEM ---------------- */}
      {internalTab === 'scores' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest">Continuous Assessment Inputs & Grading Sheet</h4>
            
            {(() => {
              const isPreschool = isChecklistPreschoolClass(scoreClass, classesWithSubjects);
              return (
                <div className={`grid grid-cols-1 ${isPreschool ? 'sm:grid-cols-4' : 'sm:grid-cols-5'} gap-3 items-end`}>
                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Class Graded</label>
                    <select
                      value={scoreClass}
                      onChange={(e) => setScoreClass(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer text-xs font-bold"
                    >
                      {availableClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Select Arm</label>
                    <select
                      value={scoreArm}
                      onChange={(e) => setScoreArm(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer font-bold"
                    >
                      {availableArms.map(arm => (
                        <option key={arm} value={arm}>Arm {arm}</option>
                      ))}
                    </select>
                  </div>

                  {!isPreschool && (
                    <div>
                      <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Subject</label>
                      <select
                        value={scoreSubject}
                        onChange={(e) => setScoreSubject(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer"
                      >
                        {availableSubjects.map(sub => (
                          <option key={sub.id} value={sub.id}>{sub.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-slate-400 font-semibold mb-1 block">Term Period</label>
                    <select
                      value={scoreTerm}
                      onChange={(e) => setScoreTerm(e.target.value as SchoolTerm)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer font-bold text-xs"
                    >
                      <option value="First Term">First Term</option>
                      <option value="Second Term">Second Term</option>
                      <option value="Third Term">Third Term</option>
                    </select>
                  </div>

                  <button
                    onClick={initializeScoresGrid}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition-colors cursor-pointer uppercase tracking-wider font-extrabold"
                  >
                    Assemble Grade Sheet
                  </button>
                </div>
              );
            })()}
          </div>

          {/* Scores matrix output */}
          {(() => {
            const isPreschool = isChecklistPreschoolClass(scoreClass, classesWithSubjects);
            if (studentsInScoreClass.length > 0) {
              if (isPreschool) {
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    
                    {/* Left Column: Student Selector list */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-4.5 h-fit space-y-4 shadow-2xs">
                      <div className="border-b border-slate-100 dark:border-slate-850 pb-2">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Class Pupils Roster</h5>
                        <p className="text-[9px] text-slate-400 mt-0.5">Select a pupil to rate abilities</p>
                      </div>
                      <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
                        {studentsInScoreClass.map(stud => {
                          const isSelected = stud.id === selectedPreschoolStudentId;
                          const studentGrades = results.filter(r => 
                            r.studentId === stud.id && 
                            r.classId === scoreClass && 
                            r.arm === scoreArm && 
                            r.term === scoreTerm && 
                            r.session === activeSessionName && 
                            r.subjectId.startsWith('preschool_skill_')
                          );
                          const gradedCount = studentGrades.length;
                          
                          return (
                            <button
                              key={stud.id}
                              type="button"
                              onClick={() => {
                                setSelectedPreschoolStudentId(stud.id);
                                loadPreschoolStudentGrades(stud.id);
                              }}
                              className={`w-full text-left py-2.5 px-3.5 rounded-xl flex flex-col gap-1 border transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-850 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850'
                              }`}
                            >
                              <span className="text-xs font-black leading-tight">{stud.firstName} {stud.lastName}</span>
                              <div className="flex items-center justify-between w-full mt-0.5">
                                <span className={`text-[9.5px] font-mono leading-none ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                  {stud.admissionNo}
                                </span>
                                <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded-full uppercase ${
                                  gradedCount === 69 
                                    ? (isSelected ? 'bg-indigo-500 text-white' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400')
                                    : (isSelected ? 'bg-indigo-500 text-indigo-100' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400')
                                }`}>
                                  {gradedCount === 69 ? '✓ Graded' : `${gradedCount}/69`}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right Column: 69 indicators entry grid */}
                    <div className="lg:col-span-3 space-y-4">
                      {selectedPreschoolStudentId ? (() => {
                        const currentStudent = studentsInScoreClass.find(s => s.id === selectedPreschoolStudentId);
                        return (
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs p-5 space-y-4">
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-3">
                              <div>
                                <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded">
                                  Pre-school Academic Evaluation Card
                                </span>
                                <h4 className="font-display font-black text-slate-850 dark:text-slate-100 text-sm sm:text-base uppercase tracking-tight mt-1.5">
                                  Checklist Ratings for {currentStudent?.firstName} {currentStudent?.lastName}
                                </h4>
                                <span className="text-xs text-slate-400 mt-0.5 block font-semibold">Class: {scoreClass} {scoreArm} • {scoreTerm} period</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSavePreschoolGrades(selectedPreschoolStudentId)}
                                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-5 rounded-xl shadow-xs cursor-pointer transition-all uppercase tracking-wider"
                              >
                                Save Student Checklist
                              </button>
                            </div>

                            <div className="max-h-[500px] overflow-y-auto pr-2 space-y-2 border border-slate-150 dark:border-slate-850 rounded-2xl p-2.5 bg-slate-50/50 dark:bg-slate-950/20">
                              <div className="grid grid-cols-12 text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 py-2 border-b border-slate-205 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
                                <span className="col-span-6">Evaluation Skill Indicator</span>
                                <span className="col-span-6 grid grid-cols-4 text-center">
                                  <span>Excellent</span>
                                  <span>Very Good</span>
                                  <span>Good</span>
                                  <span>Fair</span>
                                </span>
                              </div>

                              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {teacherClassItems.length === 0 ? (
                                  <div className="p-8 text-center text-slate-400 text-xs italic">
                                    No assessment items defined for {scoreClass}. Please configure assessment items in Subject Management.
                                  </div>
                                ) : (
                                  teacherClassItems.map((item, idx) => {
                                    const currentVal = preschoolGrades[item.id] ?? preschoolGrades[idx] ?? '';
                                    return (
                                      <div key={item.id} className="grid grid-cols-12 items-center text-xs py-2.5 px-3 hover:bg-slate-50/60 dark:hover:bg-slate-850/15 gap-2 transition-all">
                                        <span className="col-span-6 font-semibold text-slate-700 dark:text-slate-350 flex gap-2">
                                          <span className="font-mono text-[10px] text-slate-400 block w-5 shrink-0 font-bold">{idx + 1}.</span>
                                          <span className="text-[11px] leading-snug">{item.name || item.title}</span>
                                        </span>
                                        
                                        <span className="col-span-6 grid grid-cols-4 items-center">
                                          {(['EXCELLENT', 'VERY GOOD', 'GOOD', 'FAIR'] as const).map((lvl) => {
                                            const isChecked = currentVal === lvl;
                                            return (
                                              <div key={lvl} className="flex justify-center">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    setPreschoolGrades(prev => ({
                                                      ...prev,
                                                      [item.id]: lvl
                                                    }));
                                                  }}
                                                  className={`w-5 h-5 rounded-full flex items-center justify-center border cursor-pointer transition-all ${
                                                    isChecked
                                                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs scale-110'
                                                      : 'border-slate-300 hover:border-indigo-500 bg-white dark:bg-slate-800 dark:border-slate-700'
                                                  }`}
                                                  title={`${item.name || item.title}: ${lvl}`}
                                                >
                                                  {isChecked && <span className="text-[10px] font-bold">✓</span>}
                                                </button>
                                              </div>
                                            );
                                          })}
                                        </span>
                                      </div>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            {/* General Teacher remark */}
                            <div className="space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                              <label className="text-[10px] uppercase font-black tracking-wider text-indigo-650 dark:text-indigo-400 block">General development comment / remark</label>
                              <textarea
                                rows={2}
                                value={preschoolRemark}
                                onChange={(e) => setPreschoolRemark(e.target.value)}
                                placeholder="e.g. Exhibiting stellar motor control and cognitive development. Highly recommended for creative learning."
                                className="w-full bg-slate-50 focus:bg-white dark:bg-slate-950 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-700 dark:text-slate-100 focus:outline-hidden focus:border-indigo-500 font-semibold"
                              />
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
                              <span className="text-slate-400 italic">Be sure to save changes once completed.</span>
                              <button
                                type="button"
                                onClick={() => handleSavePreschoolGrades(selectedPreschoolStudentId)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-8 rounded-xl shadow-xs cursor-pointer transition-all uppercase tracking-wider"
                              >
                                Save Student Checklist
                              </button>
                            </div>

                          </div>
                        );
                      })() : (
                        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl p-10 text-center text-slate-400 italic shadow-2xs">
                          Select a student from the class roster to evaluate their competency checklist.
                        </div>
                      )}
                    </div>

                  </div>
                );
              } else {
                return (
                  <div className="space-y-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left">
                        <thead>
                          {isReceptionClass(scoreClass) ? (
                            <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider font-extrabold">
                              <th className="py-3 px-4">Pupil Profile</th>
                              <th className="py-3 px-4">Test / CA (Max 40)</th>
                              <th className="py-3 px-4">Exam (Max 60)</th>
                              <th className="py-3 px-4">Calculated Grade</th>
                              <th className="py-3 px-4">Teacher remark comment</th>
                            </tr>
                          ) : (
                            <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase text-[10px] tracking-wider font-extrabold">
                              <th className="py-3 px-4">Pupil Profile</th>
                              <th className="py-3 px-4">Test (Max 20)</th>
                              <th className="py-3 px-4">Assignment (Max 20)</th>
                              <th className="py-3 px-4">Exam (Max 60)</th>
                              <th className="py-3 px-4">Calculated Grade</th>
                              <th className="py-3 px-4">Teacher remark comment</th>
                            </tr>
                          )}
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {studentsInScoreClass.map(stud => {
                            const gradeRecord = tempScores[stud.id] || { test: 0, assignment: 0, exam: 0, remark: '' };
                            const isReception = isReceptionClass(scoreClass);
                            const sumTotal = isReception ? (gradeRecord.test + gradeRecord.exam) : (gradeRecord.test + gradeRecord.assignment + gradeRecord.exam);
                            const { grade, remark } = calculateGradeAndRemarks(sumTotal);
                            const maxTest = isReception ? 40 : 20;
                            
                            return (
                              <tr key={stud.id} className="text-xs text-slate-700 dark:text-slate-300">
                                <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-100 font-bold">
                                  {stud.firstName} {stud.lastName}
                                </td>
                                <td className="py-2.5 px-4">
                                  <input
                                    type="number"
                                    min={0}
                                    max={maxTest}
                                    value={gradeRecord.test}
                                    onChange={(e) => {
                                      const val = Math.min(maxTest, Math.max(0, parseInt(e.target.value) || 0));
                                      setTempScores({
                                        ...tempScores,
                                        [stud.id]: { ...gradeRecord, test: val, assignment: isReception ? 0 : gradeRecord.assignment }
                                      });
                                    }}
                                    className="w-16 bg-slate-50 dark:bg-slate-850 text-center py-1.5 px-2.5 border border-slate-205 dark:border-slate-800 rounded font-semibold font-mono"
                                  />
                                </td>
                                {!isReception && (
                                  <td className="py-2.5 px-4">
                                    <input
                                      type="number"
                                      min={0}
                                      max={20}
                                      value={gradeRecord.assignment}
                                      onChange={(e) => {
                                        const val = Math.min(20, Math.max(0, parseInt(e.target.value) || 0));
                                        setTempScores({
                                          ...tempScores,
                                          [stud.id]: { ...gradeRecord, assignment: val }
                                        });
                                      }}
                                      className="w-16 bg-slate-50 dark:bg-slate-850 text-center py-1.5 px-2.5 border border-slate-205 dark:border-slate-800 rounded font-semibold font-mono"
                                    />
                                  </td>
                                )}
                                <td className="py-2.5 px-4">
                                  <input
                                    type="number"
                                    min={0}
                                    max={60}
                                    value={gradeRecord.exam}
                                    onChange={(e) => {
                                      const val = Math.min(60, Math.max(0, parseInt(e.target.value) || 0));
                                      setTempScores({
                                        ...tempScores,
                                        [stud.id]: { ...gradeRecord, exam: val, assignment: isReception ? 0 : gradeRecord.assignment }
                                      });
                                    }}
                                    className="w-16 bg-slate-50 dark:bg-slate-850 text-center py-1.5 px-2.5 border border-slate-205 dark:border-slate-800 rounded font-semibold font-mono"
                                  />
                                </td>
                                <td className="py-2.5 px-4 font-bold">
                                  <span className="text-slate-800 dark:text-slate-200">
                                    {sumTotal}
                                  </span>
                                  <span className="ml-3 inline-block font-mono bg-blue-50 text-blue-700 dark:bg-blue-955/20 dark:text-blue-305 px-1.8 py-0.5 rounded text-[10px] font-black uppercase">
                                    {grade}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4">
                                  <input
                                    type="text"
                                    value={gradeRecord.remark}
                                    onChange={(e) => setTempScores({
                                      ...tempScores,
                                      [stud.id]: { ...gradeRecord, remark: e.target.value }
                                    })}
                                    className="w-full bg-slate-50 dark:bg-slate-850 py-1.5 px-3 border border-slate-250 dark:border-slate-800 rounded text-slate-700 font-medium"
                                    placeholder={remark}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg text-[11px] text-slate-500 font-semibold border border-dashed border-slate-250 dark:border-slate-800">
                      <span className="flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-blue-600" />
                        <span>Scores calculation matches: {isReceptionClass(scoreClass) ? 'Total = Test (40) + Exam (60)' : 'Total = Test (20) + Assignment (20) + Exam (60)'}</span>
                      </span>
                      <button
                        onClick={handleSaveScores}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 px-6 rounded-lg shadow-sm font-extrabold uppercase tracking-wide cursor-pointer"
                      >
                        Publish Grades to Admin queue
                      </button>
                    </div>
                  </div>
                );
              }
            } else {
              return (
                <div className="p-8 text-center text-slate-400 italic bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl">
                  Select combinations and click "Assemble Grade Sheet" to start grade logging.
                </div>
              );
            }
          })()}
        </div>
      )}

      {/* ---------------- 3. ADMIN ONLY: STAFF ONBOARDING & DIRECTORY ---------------- */}
      {internalTab === 'staff' && isAdminOrSuper && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Onboard Form */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 shadow-2xs">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                <UserPlus size={16} className="text-blue-650" />
                <span>
                  {editingStaffId || editingStaffAdminId || editingParentId ? 'Update Member Profile' : 'Onboard New Profile'}
                </span>
              </h4>
              <p className="text-slate-400 text-[11px]">
                Generate ID badge, configure system roles, and assign permissions.
              </p>

              {/* Admins can select onboarding categories */}
              {isAdminOrSuper && !(editingStaffId || editingStaffAdminId || editingParentId) && (
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  {(['TEACHER', 'SCHOOL_ADMIN', 'PARENT'] as const)
                    .filter(cat => currentRole === 'SUPER_ADMIN' || cat !== 'SCHOOL_ADMIN')
                    .map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveOnboardCategory(cat)}
                      className={`py-1.5 px-1 rounded text-[10px] font-bold uppercase transition-all ${
                        activeOnboardCategory === cat
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      {cat.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}

              {/* Editing Indicator */}
              {(editingStaffId || editingStaffAdminId || editingParentId) && (
                <div className="p-2 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-[11px] rounded border border-amber-200 dark:border-amber-800 font-semibold">
                  Currently editing profile for: <span className="font-bold underline">{staffFirstName} {staffLastName}</span> ({activeOnboardCategory})
                </div>
              )}

              <form onSubmit={handleOnboardStaff} className="space-y-3 pt-2">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">First Name *</label>
                  <input
                    type="text"
                    required
                    value={staffFirstName}
                    onChange={(e) => setStaffFirstName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-850 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="e.g. Robert"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={staffLastName}
                    onChange={(e) => setStaffLastName(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-850 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="e.g. Ade"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-850 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                    placeholder="example@southgold.com"
                  />
                </div>

                {activeOnboardCategory !== 'SCHOOL_ADMIN' && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase">Phone Number</label>
                    <input
                      type="text"
                      value={staffPhone}
                      onChange={(e) => setStaffPhone(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-850 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                      placeholder="+234 803 000 0000"
                    />
                  </div>
                )}

                {activeOnboardCategory === 'PARENT' && (
                  <>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Relationship *</label>
                      <select
                        value={parentRelationship}
                        onChange={(e) => setParentRelationship(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-850 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                      >
                        <option value="Father">Father</option>
                        <option value="Mother">Mother</option>
                        <option value="Guardian">Guardian</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 font-bold uppercase">Home Address</label>
                      <input
                        type="text"
                        value={parentAddress}
                        onChange={(e) => setParentAddress(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-850 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg"
                        placeholder="e.g. 15 Broad Street, Lagos"
                      />
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-[10px] text-slate-400 font-bold uppercase block">Linked Children</label>
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg max-h-[160px] overflow-y-auto space-y-1.5">
                        {students.length > 0 ? (
                          students.map(s => {
                            const isChecked = parentLinkedChildren.includes(s.id);
                            return (
                              <label key={s.id} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setParentLinkedChildren([...parentLinkedChildren, s.id]);
                                    } else {
                                      setParentLinkedChildren(parentLinkedChildren.filter(id => id !== s.id));
                                    }
                                  }}
                                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                                />
                                <span>{s.firstName} {s.lastName} ({s.classId} {s.arm})</span>
                              </label>
                            );
                          })
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No registered pupils available to link.</p>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">Select one or more children from the roster to associate with this parent.</p>
                    </div>
                  </>
                )}

                {activeOnboardCategory === 'TEACHER' && (
                  <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                    <label className="text-[10px] text-slate-400 font-bold uppercase block">Teacher Passport Photo (Optional)</label>
                    <div className="flex items-center gap-4">
                      {staffPhotoUrl ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                          <img src={staffPhotoUrl} alt="Teacher passport" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setStaffPhotoUrl('')}
                            className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 flex items-center justify-center transition-all text-white text-[10px] font-bold"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 font-bold text-lg border border-dashed border-slate-300 dark:border-slate-700 shrink-0">
                          ?
                        </div>
                      )}
                      <div className="flex-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="teacher-passport-upload"
                          className="hidden"
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
                                    setStaffPhotoUrl(data.publicUrl);
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
                        />
                        <label
                          htmlFor="teacher-passport-upload"
                          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg transition-all cursor-pointer shadow-sm shadow-blue-500/10"
                        >
                          Choose Passport File
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1">Accepts JPG, PNG. Optional.</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeOnboardCategory === 'TEACHER' && (
                  <>
                    {(editingStaffId || editingStaffAdminId || editingParentId) && (
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Status</label>
                        <select
                          value={staffStatus}
                          onChange={(e) => setStaffStatus(e.target.value as 'Active' | 'Inactive')}
                          className="w-full bg-slate-100 dark:bg-slate-850 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg font-bold"
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </select>
                      </div>
                    )}

                    <div className="bg-slate-55 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                      <span className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-450">Subject Allocation Duty</span>
                      
                      <div className="grid grid-cols-1">
                        <select
                          value={staffAssignedClass}
                          onChange={(e) => {
                            const newClassId = e.target.value;
                            setStaffAssignedClass(newClassId);
                            // Verify and reset subjects to match new class mappings
                            const classMapping = (classesWithSubjects || []).find(
                              c => c.classId?.toLowerCase() === newClassId?.toLowerCase()
                            );
                            if (classMapping && classMapping.subjects) {
                              // Keep only previously selected subjects that are valid for the new class
                              setStaffAssignedSubs(staffAssignedSubs.filter(id => classMapping.subjects!.includes(id)));
                            } else {
                              setStaffAssignedSubs([]);
                            }
                          }}
                          className="bg-white dark:bg-slate-900 border.5 rounded text-[10px] p-1 w-full text-slate-700 dark:text-slate-200"
                        >
                          {classes.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-500 block">Allocate Subjects *</span>
                        <div className="flex flex-wrap gap-1.5 p-1 border border-slate-200 dark:border-slate-800 rounded bg-white dark:bg-slate-900 max-h-[160px] overflow-y-auto">
                          {subjects
                            .filter(s => {
                              const classMapping = (classesWithSubjects || []).find(
                                c => c.classId?.toLowerCase() === staffAssignedClass?.toLowerCase()
                              );
                              if (classMapping && classMapping.subjects) {
                                return classMapping.subjects.includes(s.id);
                              }
                              return true;
                            })
                            .map(s => {
                            const isSelected = staffAssignedSubs.includes(s.id);
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setStaffAssignedSubs(staffAssignedSubs.filter(id => id !== s.id));
                                  } else {
                                    setStaffAssignedSubs([...staffAssignedSubs, s.id]);
                                  }
                                }}
                                className={`text-[9.5px] font-semibold py-1 px-2.5 rounded-full transition-all border shrink-0 ${
                                  isSelected
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/40'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750'
                                }`}
                              >
                                {s.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  {(editingStaffId || editingStaffAdminId || editingParentId) && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="w-1/3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-2 rounded-lg text-xs font-bold transition-all border border-slate-250 dark:border-slate-700"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`${(editingStaffId || editingStaffAdminId || editingParentId) ? 'w-2/3' : 'w-full'} bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm`}
                  >
                    {editingStaffId || editingStaffAdminId || editingParentId ? 'Save Changes' : 'Confirm Onboarding'}
                  </button>
                </div>
              </form>
            </div>

            {/* Staff Directory Panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-4">
              
              {/* Directory tabs */}
              {isAdminOrSuper ? (
                <div className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex gap-4">
                      {(['TEACHER', 'SCHOOL_ADMIN', 'PARENT'] as const)
                        .filter(tab => currentRole === 'SUPER_ADMIN' || tab !== 'SCHOOL_ADMIN')
                        .map((tab) => {
                          const count = tab === 'TEACHER' ? teachers.length : tab === 'SCHOOL_ADMIN' ? staffAdmins.length : parents.length;
                          return (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setActiveListTab(tab)}
                              className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 -mb-2.5 ${
                                activeListTab === tab
                                  ? 'border-blue-600 text-blue-600'
                                  : 'border-transparent text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              {tab === 'TEACHER' ? 'Teachers' : tab === 'SCHOOL_ADMIN' ? 'Staff Admins' : 'Parents'} ({count})
                            </button>
                          );
                        })}
                    </div>
                    {activeListTab === 'PARENT' && (
                      <input
                        type="text"
                        value={parentSearchQuery}
                        onChange={(e) => setParentSearchQuery(e.target.value)}
                        placeholder="Search parents by name, email, phone..."
                        className="text-xs py-1 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 w-full sm:w-56"
                      />
                    )}
                  </div>
                </div>
              ) : (
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2 pb-2">
                  <Briefcase size={16} className="text-blue-650" />
                  <span>On-duty Staff Register ({teachers.length})</span>
                </h4>
              )}

              <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[500px] overflow-y-auto">
                {currentRole === 'SUPER_ADMIN' && activeListTab === 'SCHOOL_ADMIN' ? (
                  // SCHOOL ADMINS LIST
                  staffAdmins.length === 0 ? (
                    <p className="py-4 text-center text-slate-400 text-xs italic">No registered staff administrators found.</p>
                  ) : (
                    staffAdmins.map((sa) => (
                      <div key={sa.userId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0">
                        <div>
                          <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{sa.fullName}</h5>
                          <p className="text-[11px] text-slate-500">{sa.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleResetPassword(sa.email)}
                            className="p-1 px-2 text-[10px] font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded transition-all"
                            title="Reset password to 1234"
                          >
                            Reset PWD
                          </button>
                          <button
                            onClick={() => handleEditStaffAdminClick(sa)}
                            className="p-1 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-450 dark:hover:text-amber-300 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-105 rounded flex items-center gap-1 transition-all"
                          >
                            <Pencil size={11} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteStaffAdmin(sa.userId)}
                            className="p-1 px-2 text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-all"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : activeListTab === 'PARENT' ? (
                  // PARENTS LIST
                  parents.filter(pa => {
                    if (!parentSearchQuery.trim()) return true;
                    const q = parentSearchQuery.toLowerCase().trim();
                    const name = `${pa.firstName} ${pa.lastName || ''}`.toLowerCase();
                    return name.includes(q) || (pa.email || '').toLowerCase().includes(q) || (pa.phone || '').includes(q);
                  }).length === 0 ? (
                    <p className="py-4 text-center text-slate-400 text-xs italic">No matching parents found.</p>
                  ) : (
                    parents
                      .filter(pa => {
                        if (!parentSearchQuery.trim()) return true;
                        const q = parentSearchQuery.toLowerCase().trim();
                        const name = `${pa.firstName} ${pa.lastName || ''}`.toLowerCase();
                        return name.includes(q) || (pa.email || '').toLowerCase().includes(q) || (pa.phone || '').includes(q);
                      })
                      .map((pa) => {
                        const linkedChildrenCount = students.filter(s => s.parentId === pa.id).length;
                        return (
                          <div key={pa.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{pa.firstName} {pa.lastName}</h5>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                                  (pa.status || 'Active') === 'Active' 
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                }`}>
                                  {pa.status || 'Active'}
                                </span>
                                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 font-semibold px-2 py-0.5 rounded">
                                  {linkedChildrenCount} {linkedChildrenCount === 1 ? 'Child' : 'Children'} Linked
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">{pa.email} • {pa.phone}</p>
                              <span className="text-[10px] mt-1 inline-block text-slate-400 italic">
                                Address: {pa.address || 'Lagos, Nigeria'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleToggleParentStatus(pa)}
                                className={`p-1 px-2 text-[10px] font-bold rounded transition-all ${
                                  (pa.status || 'Active') === 'Active'
                                    ? 'text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400'
                                    : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400'
                                }`}
                                title={pa.status === 'Active' ? 'Deactivate Parent account' : 'Activate Parent account'}
                              >
                                {pa.status === 'Active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleResetPassword(pa.email)}
                                className="p-1 px-2 text-[10px] font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded transition-all"
                                title="Reset password to 1234"
                              >
                                Reset PWD
                              </button>
                              <button
                                onClick={() => handleEditParentClick(pa)}
                                className="p-1 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-450 dark:hover:text-amber-300 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-105 rounded flex items-center gap-1 transition-all"
                              >
                                <Pencil size={11} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteParent(pa.id)}
                                className="p-1 px-2 text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })
                  )
                ) : (
                  // TEACHERS LIST
                  teachers.map((tch) => (
                    <div key={tch.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0">
                      <div className="flex items-center gap-3">
                        {tch.photo ? (
                          <img src={tch.photo} alt={`${tch.firstName} passport`} className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs uppercase border border-slate-200 dark:border-slate-800">
                            {tch.firstName[0]}{tch.lastName?.[0] || ''}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                              {tch.firstName} {tch.lastName}
                            </h5>
                            <span className="text-[9px] font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 font-semibold px-2 py-0.5 rounded">
                              {tch.staffId}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">{tch.email} • {tch.phone}</p>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {tch.classesAssigned.map((ca, idx) => (
                              <span key={idx} className="text-[10px] bg-indigo-50/60 dark:bg-indigo-950/20 text-indigo-500 dark:text-indigo-400 py-0.5 px-2 rounded border border-indigo-100 dark:border-indigo-950">
                                {ca.classId} ({subjects.find(s=>s.id === ca.subjectId)?.name || ca.subjectId})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          tch.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-slate-50 text-slate-400'
                        }`}>
                          {tch.status}
                        </span>
                        
                        {currentRole === 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleResetPassword(tch.email)}
                            className="p-1 px-2 text-[10px] font-bold text-slate-600 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded transition-all"
                            title="Reset password to 1234"
                          >
                            Reset PWD
                          </button>
                        )}

                        <button
                          onClick={() => handleEditClick(tch)}
                          className="p-1 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-450 dark:hover:text-amber-300 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-105 rounded flex items-center gap-1.5 transition-all"
                        >
                          <Pencil size={11} />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTeacher(tch.id)}
                          className="p-1 px-2 text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
