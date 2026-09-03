import React, { useState } from 'react';
import { 
  Award, 
  Check, 
  Lock, 
  Unlock, 
  Printer, 
  Download, 
  ArrowRight, 
  FileText, 
  TrendingUp, 
  Sliders, 
  ChevronRight,
  Sparkles,
  X,
  Clock,
  MessageSquare,
  List,
  ArrowLeft,
  Edit,
  BookOpen,
  BarChart3
} from 'lucide-react';
import { Student, ResultRecord, SchoolTerm, Subject, UserRole, Teacher, SchoolConfigState } from '../types';
import ParentStudentResultViewer from './ParentStudentResultViewer';
import ReportCardPrintout from './ReportCardPrintout';
import { Alert, PageHeader, Tabs } from './shared';
import ResultsBroadsheet from './ResultsBroadsheet';

const unpackScores = (r: ResultRecord) => {
  const ca1 = r.testScore || 0;
  const packed = r.assignmentScore || 0;
  const ca2 = packed % 100;
  const ca3 = Math.floor(packed / 100);
  const exam = r.examScore || 0;
  const total = ca1 + ca2 + ca3 + exam;
  return { ca1, ca2, ca3, exam, total };
};

export function unpackRemarks(rawRemark: string) {
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
}

export function packRemarks(classTeacher: string, headTeacher: string, principal: string) {
  return `Class Teacher: ${classTeacher || ''} | Head Teacher: ${headTeacher || ''} | Principal: ${principal || ''}`;
}

export const getOverallReportStatus = (resultsList: any[]) => {
  if (resultsList.length === 0) return 'DRAFT';
  const statuses = resultsList.map(r => r.status || (r.isApproved ? 'APPROVED' : 'DRAFT'));
  if (statuses.includes('DRAFT')) return 'DRAFT';
  if (statuses.includes('REJECTED')) return 'REJECTED';
  if (statuses.includes('SUBMITTED') || statuses.includes('PENDING_APPROVAL')) return 'PENDING_APPROVAL';
  if (statuses.includes('APPROVED')) return 'APPROVED';
  if (statuses.includes('PUBLISHED')) return 'PUBLISHED';
  return 'DRAFT';
};

import { isChecklistPreschoolClass } from '../data/preschoolSkills';
import ClassStudentsTable from './ClassStudentsTable';
import StudentScoresEditor from './StudentScoresEditor';
import EarlyYearsResultEditor, { EarlyYearsResultRecord } from './EarlyYearsResultEditor';
import { AssessmentItem } from '../types';

interface ResultProcessorProps {
  currentRole: UserRole;
  students: Student[];
  results: ResultRecord[];
  onSetResults: (res: ResultRecord[]) => void;
  subjects: Subject[];
  activeSessionName: string;
  activeTerm: SchoolTerm;
  classes?: string[];
  classesWithSubjects?: { classId: string; subjects: string[]; stage?: 'Pre-School' | 'Primary' | 'Secondary' }[];
  teachers?: Teacher[];
  onSetTeachers?: (teachers: Teacher[]) => void;
  config?: SchoolConfigState;
  onUpdateConfig?: (updates: Partial<SchoolConfigState>) => void;
  attendance?: any[];
  onSetAttendance?: (att: any[]) => void;
  userEmail?: string;
  earlyYearsResults?: EarlyYearsResultRecord[];
  onSetEarlyYearsResults?: (res: EarlyYearsResultRecord[]) => void;
  assessmentItems?: AssessmentItem[];
  onSetAssessmentItems?: (items: AssessmentItem[]) => void;
}

export default function ResultProcessor({
  currentRole,
  students,
  results,
  onSetResults,
  subjects,
  activeSessionName,
  activeTerm,
  classes = [],
  classesWithSubjects,
  teachers,
  onSetTeachers,
  config,
  onUpdateConfig,
  attendance = [],
  onSetAttendance,
  userEmail,
  earlyYearsResults = [],
  onSetEarlyYearsResults = () => {},
  assessmentItems = []
}: ResultProcessorProps) {
  const isAdminOrSuper = currentRole === 'SUPER_ADMIN' || currentRole === 'SCHOOL_ADMIN';
  const isParentOrStudent = currentRole === 'PARENT' || currentRole === 'STUDENT';

  // Grading thresholds and assessment weights derived from config
  const gradingScale = React.useMemo(() => {
    if (config?.gradingScale && config.gradingScale.length > 0) {
      return config.gradingScale.map(item => ({
        grade: item.grade,
        min: item.minScore,
        remark: item.remark
      }));
    }
    return [
      { grade: 'A', min: 75, remark: 'Excellent' },
      { grade: 'B', min: 65, remark: 'Very Good' },
      { grade: 'C', min: 55, remark: 'Good' },
      { grade: 'P', min: 45, remark: 'Pass' },
      { grade: 'F', min: 0, remark: 'Fail' }
    ];
  }, [config?.gradingScale]);

  const caTestMax = config?.caTestMax ?? 15;
  const caAssignmentMax = config?.caAssignmentMax ?? 15;
  const examMax = config?.examMax ?? 60;

  const getLetterGrade = React.useCallback((score: number) => {
    const sortedScale = [...gradingScale].sort((a, b) => b.min - a.min);
    for (const item of sortedScale) {
      if (score >= item.min) {
        return item.grade;
      }
    }
    return 'F';
  }, [gradingScale]);

  // Selection states
  const [selectedClassForProcessing, setSelectedClassForProcessing] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState(classes[0] || '');
  const [selectedArm, setSelectedArm] = useState('A');
  const [selectedTerm, setSelectedTerm] = useState<SchoolTerm>(activeTerm);

  const loggedInTeacher = React.useMemo(() => {
    if (!userEmail || !teachers) return null;
    return teachers.find(t => t.email?.toLowerCase() === userEmail.toLowerCase());
  }, [teachers, userEmail]);

  const availableClasses = React.useMemo(() => {
    if (isAdminOrSuper) {
      return classes;
    }
    if (loggedInTeacher && loggedInTeacher.classesAssigned) {
      return Array.from(new Set(loggedInTeacher.classesAssigned.map(ca => ca.classId)));
    }
    return [];
  }, [classes, isAdminOrSuper, loggedInTeacher]);

  // Sync selectedClass to the first available class if it's no longer present
  React.useEffect(() => {
    if (availableClasses.length > 0 && (!selectedClass || !availableClasses.includes(selectedClass))) {
      setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses, selectedClass]);

  const teacherBroadsheetSubjects = React.useMemo(() => {
    if (isAdminOrSuper || !loggedInTeacher?.classesAssigned) return subjects;
    const allowedSubjectIds = new Set<string>();
    loggedInTeacher.classesAssigned.forEach(assignment => {
      if (assignment.subjectId === 'general_admin') {
        const blueprint = classesWithSubjects.find(item =>
          item.classId?.toLowerCase() === assignment.classId?.toLowerCase()
        );
        (blueprint?.subjects || []).forEach(subjectId => allowedSubjectIds.add(subjectId));
      } else {
        allowedSubjectIds.add(assignment.subjectId);
      }
    });
    return subjects.filter(subject => allowedSubjectIds.has(subject.id));
  }, [classesWithSubjects, isAdminOrSuper, loggedInTeacher, subjects]);

  const teacherBroadsheetClassesWithSubjects = React.useMemo(() => {
    const allowedClassSet = new Set(availableClasses.map(classId => classId.toLowerCase()));
    const allowedSubjectSet = new Set(teacherBroadsheetSubjects.map(subject => subject.id));
    return classesWithSubjects
      .filter(item => allowedClassSet.has(item.classId?.toLowerCase()))
      .map(item => ({
        ...item,
        subjects: (item.subjects || []).filter(subjectId => allowedSubjectSet.has(subjectId))
      }));
  }, [availableClasses, classesWithSubjects, teacherBroadsheetSubjects]);

  // Search and show entries list states
  const [searchText, setSearchText] = useState('');
  const [entriesCount, setEntriesCount] = useState(10);

  // Students list for processing (with case-insensitive class matches)
  const allProcessedStudentsList = React.useMemo(() => {
    const normalizedClasses = classes.map(c => c.toLowerCase());
    if (isAdminOrSuper || currentRole === 'PARENT' || currentRole === 'STUDENT') {
      return students;
    }
    const normalizedAvailable = availableClasses.map(c => c.toLowerCase());
    return students.filter(s => s.classId && normalizedAvailable.includes(s.classId.toLowerCase()));
  }, [students, classes, availableClasses, isAdminOrSuper, currentRole]);

  // Results list for processing
  const allProcessedResultsList = React.useMemo(() => {
    return results;
  }, [results]);

  // Active student selection for report card display
  const [activeCardStudentId, setActiveCardStudentId] = useState<string | null>(null);

  const [activeViewMode, setActiveViewMode] = useState<'LIST' | 'EOT' | 'EOS' | 'SCORES'>('LIST');

  const [notif, setNotif] = useState<string | null>(null);
  const [processorSubTab, setProcessorSubTab] = useState<'DIRECTORY' | 'APPROVAL_DASHBOARD' | 'BROADSHEET'>('DIRECTORY');

  const [resultApprovals, setResultApprovals] = useState<any[]>([]);
  const [selectedApprovalToReview, setSelectedApprovalToReview] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [htComment, setHtComment] = useState('');
  const [prComment, setPrComment] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED'>('ALL');

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/result-approvals');
      if (res.ok) {
        const data = await res.json();
        setResultApprovals(data);
      }
    } catch (err) {
      console.error('Error fetching result approvals:', err);
    }
  };

  React.useEffect(() => {
    fetchApprovals();
  }, [activeSessionName, selectedTerm]);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempCaTest, setTempCaTest] = useState(caTestMax);
  const [tempCaAssignment, setTempCaAssignment] = useState(caAssignmentMax);
  const [tempExam, setTempExam] = useState(examMax);
  const [tempGradingScale, setTempGradingScale] = useState<{ grade: string; minScore: number; remark: string }[]>([]);
  const [tempEarlyYearsGradingScale, setTempEarlyYearsGradingScale] = useState<{ grade: string; remark: string }[]>([]);

  const handleOpenConfigModal = () => {
    setTempCaTest(caTestMax);
    setTempCaAssignment(caAssignmentMax);
    setTempExam(examMax);
    setTempGradingScale(config?.gradingScale || [
      { grade: 'A', minScore: 75, remark: 'Excellent' },
      { grade: 'B', minScore: 65, remark: 'Very Good' },
      { grade: 'C', minScore: 55, remark: 'Good' },
      { grade: 'P', minScore: 45, remark: 'Pass' },
      { grade: 'F', minScore: 0, remark: 'Fail' }
    ]);
    setTempEarlyYearsGradingScale(config?.earlyYearsGradingScale || [
      { grade: 'Excellent', remark: 'Demonstrates exceptional mastery and consistent application.' },
      { grade: 'Very Good', remark: 'Shows high competence and handles tasks independently.' },
      { grade: 'Good', remark: 'Satisfactory development; meets expectations consistently.' },
      { grade: 'Fair', remark: 'Developing skill; requires occasional guidance.' },
      { grade: 'Needs Improvement', remark: 'Requires closer monitoring and targeted practice.' }
    ]);
    setShowConfigModal(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateConfig) {
      onUpdateConfig({
        caTestMax: 15,
        caAssignmentMax: 15,
        examMax: 60,
        gradingScale: tempGradingScale,
        earlyYearsGradingScale: tempEarlyYearsGradingScale
      });
      showNotice('Result setup & Continuous Assessment settings updated successfully!');
      setShowConfigModal(false);
    }
  };

  const getStudentsInScope = () => {
    // If parent role, return only their linked children (by parentEmail matching userEmail)
    if (currentRole === 'PARENT') {
      return allProcessedStudentsList.filter(s => 
        s.parentEmail?.toLowerCase() === userEmail?.toLowerCase()
      );
    }

    // If student role, return only themselves (by email matching userEmail)
    if (currentRole === 'STUDENT') {
      return allProcessedStudentsList.filter(s => 
        s.email?.toLowerCase() === userEmail?.toLowerCase()
      );
    }

    const list = allProcessedStudentsList.filter(s => 
      (s.classId || '').toLowerCase() === (selectedClass || '').toLowerCase() &&
      (s.arm || '').toLowerCase() === (selectedArm || '').toLowerCase()
    );
    if (isAdminOrSuper) {
      return list;
    }
    // Teacher filtering
    if (loggedInTeacher) {
      // Check if class teacher (general_admin) for this class/arm
      const hasGeneralAdmin = (loggedInTeacher.classesAssigned || []).some(ca => 
        ca.classId?.toLowerCase() === selectedClass?.toLowerCase() &&
        ca.arm?.toLowerCase() === selectedArm?.toLowerCase() &&
        ca.subjectId === 'general_admin'
      );
      if (hasGeneralAdmin) {
        return list; // Class teacher sees all students in assigned class/arm
      }
      // Subject teacher: only sees students taking their assigned subjects in this class/arm
      const assignedSubs = (loggedInTeacher.classesAssigned || [])
        .filter(ca => 
          ca.classId?.toLowerCase() === selectedClass?.toLowerCase() &&
          ca.arm?.toLowerCase() === selectedArm?.toLowerCase()
        )
        .map(ca => ca.subjectId.toLowerCase());
      
      return list.filter(s => 
        (s.subjects || []).some(sub => assignedSubs.includes(sub.toLowerCase()))
      );
    }
    return [];
  };

  const classmates = getStudentsInScope();

  // Helper for normalizing term string
  const normalizeTermStr = (t: string) => {
    if (!t) return '';
    const s = t.trim().toLowerCase();
    if (s.includes('1st') || s.includes('first')) return '1st';
    if (s.includes('2nd') || s.includes('second')) return '2nd';
    if (s.includes('3rd') || s.includes('third')) return '3rd';
    return s;
  };

  // Robust ranking algorithm
  const computeAveragesAndPositions = () => {
    const selectedClassLower = (selectedClass || '').trim().toLowerCase();
    const selectedArmUpper = (selectedArm || 'A').trim().toUpperCase();
    const selectedTermLower = normalizeTermStr(selectedTerm || '');
    const selectedSessionLower = (activeSessionName || '').trim().toLowerCase();

    const averagesList = classmates.map(s => {
      const parentResults = allProcessedResultsList.filter(r => {
        if (!r || r.studentId !== s.id) return false;

        const rClassLower = (r.classId || '').trim().toLowerCase();
        if (rClassLower && selectedClassLower && rClassLower !== selectedClassLower) return false;

        const rArmUpper = (r.arm || 'A').trim().toUpperCase();
        if (rArmUpper !== selectedArmUpper) return false;

        const rTermLower = normalizeTermStr(r.term || '');
        if (rTermLower && selectedTermLower && rTermLower !== selectedTermLower) return false;

        const rSessionLower = (r.session || '').trim().toLowerCase();
        if (rSessionLower && selectedSessionLower && rSessionLower !== selectedSessionLower) return false;

        return true;
      });

      const totalScoreSum = parentResults.reduce((sum, r) => {
        const ca1 = r.testScore || 0;
        const packed = r.assignmentScore || 0;
        const ca2 = packed % 100;
        const ca3 = Math.floor(packed / 100);
        const exam = r.examScore || 0;
        const computed = ca1 + ca2 + ca3 + exam;
        return sum + (r.totalScore || computed);
      }, 0);

      const avg = parentResults.length > 0 ? (totalScoreSum / parentResults.length) : 0;
      
      return {
        studentId: s.id,
        avgScore: parseFloat(avg.toFixed(1)),
        resultsCount: parentResults.length,
        totalScoreSum
      };
    }).filter(item => item.resultsCount > 0);

    averagesList.sort((a, b) => b.totalScoreSum - a.totalScoreSum);

    const positionsMap: Record<string, { rankNum: number; avg: number; totalSum: number }> = {};
    let rank = 1;

    averagesList.forEach((item, index) => {
      if (index > 0 && averagesList[index - 1].totalScoreSum > item.totalScoreSum) {
        rank = index + 1;
      }
      positionsMap[item.studentId] = {
        rankNum: rank,
        avg: item.avgScore,
        totalSum: item.totalScoreSum
      };
    });

    return positionsMap;
  };

  const positionsMapResult = computeAveragesAndPositions();

  // Handle approvals
  const handleToggleApproveResult = (recId: string) => {
    const updated = allProcessedResultsList.map(r => {
      if (r.id === recId) {
        return { ...r, isApproved: !r.isApproved };
      }
      return r;
    });
    onSetResults(updated);
    showNotice('Publication approval state toggled for grade entry.');
  };

  const handleApproveAllClassResults = () => {
    const updated = allProcessedResultsList.map(r => {
      if (
        r.classId === selectedClass && 
        r.arm === selectedArm && 
        r.term === selectedTerm && 
        r.session === activeSessionName
      ) {
        return { ...r, isApproved: true };
      }
      return r;
    });
    onSetResults(updated);
    showNotice(`Successfully published and approved all ${selectedClass}${selectedArm} ${selectedTerm} results.`);
  };

  const handleApproveAllStudentPreschoolResults = (studentId: string, classId: string) => {
    const updated = allProcessedResultsList.map(r => {
      if (
        r.studentId === studentId && 
        r.classId === classId && 
        r.term === selectedTerm && 
        r.session === activeSessionName && 
        r.subjectId.startsWith('preschool_skill_')
      ) {
        return { ...r, isApproved: true };
      }
      return r;
    });
    onSetResults(updated);
    showNotice(`Approved and published all developmental competency ratings for this child.`);
  };

  const showNotice = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3000);
  };

  const sendWorkflowNotification = async (title: string, content: string, recipientRole: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `not_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          title,
          content,
          category: 'Academic',
          date: new Date().toISOString().split('T')[0],
          recipientRole
        })
      });
    } catch (err) {
      console.error('Failed to send workflow notification:', err);
    }
  };

  const classesWorkflowStatus = React.useMemo(() => {
    const statusMap: Record<string, string> = {};
    availableClasses.forEach(classId => {
      const classResults = results.filter(r => 
        r.classId === classId && 
        r.term === selectedTerm && 
        r.session === activeSessionName
      );
      statusMap[classId] = getOverallReportStatus(classResults);
    });
    return statusMap;
  }, [availableClasses, results, selectedTerm, activeSessionName]);

  const getWorkflowStatusForClass = (classId: string) => {
    const dbReq = resultApprovals.find(ra => 
      ra.classId === classId && 
      ra.session === activeSessionName && 
      ra.term === selectedTerm
    );
    if (dbReq) return dbReq.status;
    return classesWorkflowStatus[classId] || 'DRAFT';
  };

  const pendingSubmissionsCount = React.useMemo(() => {
    return Object.values(classesWorkflowStatus).filter(status => status === 'PENDING_APPROVAL').length;
  }, [classesWorkflowStatus]);

  const handleTransitionWorkflow = async (
    classId: string,
    status: string,
    action: string,
    comment: string = '',
    headTeacherComment: string = '',
    principalComment: string = ''
  ) => {
    try {
      const classTeacher = teachers?.find(t => 
        (t.classesAssigned || []).some(ca => ca.classId === classId)
      );
      
      const payload = {
        classId,
        session: activeSessionName,
        term: selectedTerm,
        status,
        headTeacherComment,
        principalComment,
        action,
        actor: userEmail ? userEmail.split('@')[0] : 'Authorized Staff',
        teacherId: classTeacher?.id || 'SYSTEM',
        comment
      };

      const response = await fetch('/api/result-approvals/transition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedResults = allProcessedResultsList.map(r => {
          if (r.classId === classId && r.term === selectedTerm && r.session === activeSessionName) {
            return {
              ...r,
              status,
              isApproved: (status === 'APPROVED' || status === 'PUBLISHED')
            };
          }
          return r;
        });
        onSetResults(updatedResults);
        
        await fetchApprovals();
        setIsReviewModalOpen(false);
        showNotice(`Success: ${classId} reports status updated to ${status.replace('_', ' ')}.`);
        return true;
      } else {
        const err = await response.json();
        showNotice(`Error: ${err.error || 'Failed to update workflow state'}`);
        return false;
      }
    } catch (e: any) {
      console.error(e);
      showNotice('Workflow transition failed. Check connection.');
      return false;
    }
  };

  const handleWorkflowTransition = (classId: string, targetStatus: string) => {
    handleTransitionWorkflow(classId, targetStatus, targetStatus, `Batch Status Update: ${targetStatus}`);
  };

  const handleTeacherSubmitClassResults = () => {
    const teacherName = loggedInTeacher ? `${loggedInTeacher.firstName} ${loggedInTeacher.lastName}` : 'Teacher';
    handleTransitionWorkflow(
      selectedClass,
      'PENDING_APPROVAL',
      'SUBMIT',
      `Submitted for review by class teacher ${teacherName}`
    );
  };

  const handleProcessClass = (classId: string) => {
    setSelectedClass(classId);
    setSelectedClassForProcessing(classId);
    const classKids = allProcessedStudentsList.filter(s => s.classId === classId);
    if (classKids.length > 0) {
      setActiveCardStudentId(classKids[0].id);
    }
  };

  const handleAssignTeacherToClass = (classId: string, teacherId: string) => {
    if (!onSetTeachers || !teachers) return;

    // Find assigned subjects for this class
    const classMapObj = classesWithSubjects?.find(c => c.classId === classId);
    const assignedSubIds = classMapObj ? classMapObj.subjects : [];

    const updatedTeachers = teachers.map(t => {
      // 1. Clear any current assignments for this class from EVERY teacher
      const cleanedClasses = (t.classesAssigned || []).filter(ca => ca.classId !== classId);

      // 2. If this teacher is selected, assign them to all subjects and arms for this class
      if (t.id === teacherId) {
        const newAssignments: { classId: string; arm: string; subjectId: string }[] = [];
        if (assignedSubIds && assignedSubIds.length > 0) {
          for (const subId of assignedSubIds) {
            for (const arm of ['A']) {
              newAssignments.push({
                classId,
                arm,
                subjectId: subId
              });
            }
          }
        } else {
          newAssignments.push({
            classId,
            arm: 'A',
            subjectId: 'general_admin'
          });
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
      showNotice(`Assigned ${selectedTch.firstName} ${selectedTch.lastName} as Class Teacher for ${classId} successfully!`);
    } else {
      showNotice(`Removed Class Teacher assignment for ${classId}.`);
    }
  };

  const filteredClasses = availableClasses.map((classId, index) => {
    const dynamicTeacher = teachers?.find(t =>
      (t.classesAssigned || []).some(ca => ca.classId === classId)
    );
    const teacherName = dynamicTeacher
      ? `${dynamicTeacher.firstName} ${dynamicTeacher.lastName}`
      : 'Unassigned';

    const studentCount = allProcessedStudentsList.filter(s => s.classId === classId).length;

    const classMapping = classesWithSubjects?.find(c => c.classId === classId);
    const subjectsCount = classMapping
      ? (classMapping.subjects?.length || 0)
      : 0;

    return {
      id: index + 1,
      classId,
      teacherName,
      teacherId: dynamicTeacher?.id || '',
      studentsCount: studentCount,
      subjectsCount
    };
  }).filter(c => 
    c.classId.toLowerCase().includes(searchText.toLowerCase()) ||
    c.teacherName.toLowerCase().includes(searchText.toLowerCase())
  );

  // Convert position number to human reading ordinal suffix (e.g., 1st, 2nd, 3rd)
  const getOrdinalSuffix = (num: number) => {
    if (!num) return 'N/A';
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return `${num}st`;
    if (j === 2 && k !== 12) return `${num}nd`;
    if (j === 3 && k !== 13) return `${num}rd`;
    return `${num}th`;
  };

  // Render specific active Report card layout mathematical data
  const targetStudent = allProcessedStudentsList.find(s => s.id === activeCardStudentId) || allProcessedStudentsList[0];

  // Sync selected class with active student details
  React.useEffect(() => {
    if (targetStudent?.classId && targetStudent.classId !== selectedClass) {
      setSelectedClass(targetStudent.classId);
    }
  }, [targetStudent, selectedClass]);
  const assignedSubjectIds = React.useMemo(() => {
    if (isAdminOrSuper) {
      return null; // Admin has access to all subjects
    }
    if (loggedInTeacher && loggedInTeacher.classesAssigned) {
      const classAssignments = loggedInTeacher.classesAssigned.filter(ca => ca.classId === selectedClass && ca.arm === selectedArm);
      // If they are assigned to 'general_admin', they are the class teacher and see all subjects!
      const isClassTeacher = classAssignments.some(ca => ca.subjectId === 'general_admin');
      if (isClassTeacher) {
        return null; // See all subjects
      }
      return classAssignments.map(ca => ca.subjectId);
    }
    return [];
  }, [selectedClass, selectedArm, loggedInTeacher, isAdminOrSuper]);

  const targetStudentResults = React.useMemo(() => {
    const rawResults = allProcessedResultsList.filter(r => 
      r.studentId === targetStudent?.id && 
      (activeViewMode === 'EOS' ? true : r.term === selectedTerm) && 
      r.session === activeSessionName
    );
    if (isAdminOrSuper || assignedSubjectIds === null) {
      return rawResults;
    }
    return rawResults.filter(r => assignedSubjectIds.includes(r.subjectId));
  }, [allProcessedResultsList, targetStudent, selectedTerm, activeSessionName, activeViewMode, isAdminOrSuper, assignedSubjectIds]);

  const isPreschoolMode = isChecklistPreschoolClass(targetStudent?.classId || '', classesWithSubjects);
  const classMapObj2 = classesWithSubjects?.find(c => c.classId?.toLowerCase() === selectedClass?.toLowerCase());
  const isEarlyYearsClass = classMapObj2?.stage === 'Pre-School' || 
    isChecklistPreschoolClass(selectedClass, classesWithSubjects) || 
    ['toddler', 'creche', 'playgroup', 'nursery', 'reception', 'preschool', 'pre-school', 'kindergarten'].some(word => selectedClass?.toLowerCase().includes(word));

  const excellentCount = targetStudentResults.filter(r => r.grade === 'EXCELLENT').length;
  const veryGoodCount = targetStudentResults.filter(r => r.grade === 'VERY GOOD').length;
  const goodCount = targetStudentResults.filter(r => r.grade === 'GOOD').length;
  const fairCount = targetStudentResults.filter(r => r.grade === 'FAIR').length;
  
  const customRemarkRec = targetStudentResults.find(r => r.teacherRemark && !r.teacherRemark.includes('performance in'));
  const preschoolTeacherRemark = customRemarkRec?.teacherRemark || (targetStudentResults.length > 0 ? "Early years assessment checklist successfully evaluated." : "Awaiting evaluations.");

  const unpackedRemarksObj = React.useMemo(() => {
    const raw = customRemarkRec ? customRemarkRec.teacherRemark : '';
    return unpackRemarks(raw);
  }, [customRemarkRec]);

  const [classCommentInput, setClassCommentInput] = useState('');
  const [headCommentInput, setHeadCommentInput] = useState('');
  const [principalCommentInput, setPrincipalCommentInput] = useState('');

  // Notice banner state to assist iframe preview environments with browser print constraints
  const [showPrintNotice, setShowPrintNotice] = useState(() => {
    return typeof window !== 'undefined' && window.self !== window.top;
  });

  // Synchronize input with active student's saved remarks
  React.useEffect(() => {
    setClassCommentInput(unpackedRemarksObj.classTeacherRemark);
    setHeadCommentInput(unpackedRemarksObj.headTeacherRemark);
    setPrincipalCommentInput(unpackedRemarksObj.principalRemark);
  }, [unpackedRemarksObj]);

  const handleSaveReportComments = (classComm: string, headComm: string, princComm: string) => {
    if (!targetStudent) return;
    
    if (targetStudentResults.length === 0) {
      showNotice('No score entries or checklist markers exist yet. Please enter grades first.');
      return;
    }

    const packedText = packRemarks(classComm, headComm, princComm);

    const updated = allProcessedResultsList.map(r => {
      if (
        r.studentId === targetStudent.id &&
        r.term === selectedTerm &&
        r.session === activeSessionName
      ) {
        return { ...r, teacherRemark: packedText };
      }
      return r;
    });

    onSetResults(updated);
    showNotice(`Saved custom evaluative comments for ${targetStudent.firstName}.`);
  };

  const handleUpdateReportStatus = (newStatus: string) => {
    if (!targetStudent) return;
    
    if (targetStudentResults.length === 0) {
      showNotice('Cannot update status: No score entries exist for this student.');
      return;
    }

    const updated = allProcessedResultsList.map(r => {
      if (
        r.studentId === targetStudent.id &&
        r.term === selectedTerm &&
        r.session === activeSessionName
      ) {
        return {
          ...r,
          status: newStatus,
          isApproved: (newStatus === 'APPROVED' || newStatus === 'PUBLISHED')
        };
      }
      return r;
    });

    onSetResults(updated);
    showNotice(`Successfully updated report status to ${newStatus}.`);
  };

  // If a student or teacher has results waiting, lets calculate average
  const activeStudentSum = targetStudentResults.reduce((sum, r) => sum + r.totalScore, 0);
  const activeStudentAverage = targetStudentResults.length > 0 
    ? (activeStudentSum / targetStudentResults.length).toFixed(1) 
    : '0';

  const activeStudentRankInfo = positionsMapResult[targetStudent?.id || ''];

  // Export results CSV sheets trigger
  const handleExportCSV = () => {
    const csvRows = [
      ['Admission ID', 'Full Name', 'Class/Arm', 'Subject', 'Test (20)', 'Assignment (20)', 'Exam (60)', 'Total (100)', 'Letter Grade', 'Approved?']
    ];

    allProcessedResultsList.forEach(res => {
      const child = allProcessedStudentsList.find(s => s.id === res.studentId);
      const sub = subjects.find(s => s.id === res.subjectId);
      if (child) {
        csvRows.push([
          child.admissionNo,
          `${child.firstName} ${child.lastName}`,
          `${res.classId} ${res.arm}`,
          sub?.name || res.subjectId,
          String(res.testScore),
          String(res.assignmentScore),
          String(res.examScore),
          String(res.totalScore),
          res.grade,
          res.isApproved ? 'YES' : 'NO'
        ]);
      }
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `School_Grades_Ledger_${activeSessionName.replace('/', '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotice('Exported results catalog schema spreadsheet.');
  };

  // Handle standard document page printing
  const handlePrintDocument = () => {
    const overallStatus = getOverallReportStatus(targetStudentResults);
    if (overallStatus !== 'PUBLISHED') {
      showNotice("This report card is under review. Reports can only be printed or downloaded once the status is PUBLISHED by the School Authority.");
      return;
    }
    try {
      window.print();
      if (typeof window !== 'undefined' && window.self !== window.top) {
        setShowPrintNotice(true);
      }
    } catch (e) {
      console.warn("Print dialogue blocked by secure iframe sandbox preview context.", e);
      setShowPrintNotice(true);
    }
  };

  if (isParentOrStudent) {
    return (
      <ParentStudentResultViewer
        classmates={classmates}
        allProcessedResultsList={allProcessedResultsList}
        selectedTerm={selectedTerm}
        activeSessionName={activeSessionName}
        subjects={subjects}
        onShowNotice={showNotice}
        gradingScale={gradingScale}
        config={config}
        currentRole={currentRole as 'PARENT' | 'STUDENT'}
        classesWithSubjects={classesWithSubjects}
        attendance={attendance}
      />
    );
  }

  if (selectedClassForProcessing === null) {
    return (
      <div className="space-y-6">
        {notif && (
          <Alert variant="success" icon={<Check size={14} />}>{notif}</Alert>
        )}

        <PageHeader
          title="Result Processing"
          description="Review class rosters, manage terminal scores, and publish approved reports for parents and students."
          icon={<Award className="w-5 h-5" />}
          actions={isAdminOrSuper ? (
            <button
              onClick={handleOpenConfigModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs transition-all hover:border-indigo-300 hover:text-indigo-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-700 dark:hover:text-indigo-300"
            >
              <Sliders size={14} />
              Configure Scoring
            </button>
          ) : null}
        />

        {/* Dynamic sub-navigation for Admins/Supers */}
        {isAdminOrSuper && (
          <Tabs
            items={[
              { id: 'DIRECTORY', label: 'Class Roster Directory', icon: <List size={14} /> },
              { id: 'BROADSHEET', label: 'Broadsheet', icon: <BarChart3 size={14} /> },
              { id: 'APPROVAL_DASHBOARD', label: 'Workflow Approval Dashboard', count: pendingSubmissionsCount, icon: <Check size={14} /> }
            ]}
            active={processorSubTab}
            onChange={(id) => setProcessorSubTab(id)}
          />
        )}

        {currentRole === 'TEACHER' && (
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-xs font-bold shadow-xs">
            <button
              type="button"
              onClick={() => setProcessorSubTab('DIRECTORY')}
              className={`px-3.5 py-1.5 rounded-md transition-all ${
                processorSubTab === 'DIRECTORY'
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Classes
            </button>
            <button
              type="button"
              onClick={() => setProcessorSubTab('BROADSHEET')}
              className={`px-3.5 py-1.5 rounded-md transition-all ${
                processorSubTab === 'BROADSHEET'
                  ? 'bg-blue-600 text-white shadow-3xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Broadsheet
            </button>
          </div>
        )}

        {processorSubTab === 'BROADSHEET' && (isAdminOrSuper || currentRole === 'TEACHER') ? (
          <ResultsBroadsheet
            students={currentRole === 'TEACHER' ? allProcessedStudentsList : students}
            results={results}
            subjects={currentRole === 'TEACHER' ? teacherBroadsheetSubjects : subjects}
            classes={availableClasses}
            activeSessionName={activeSessionName}
            activeTerm={selectedTerm}
            gradingScale={gradingScale}
            config={config}
            classesWithSubjects={currentRole === 'TEACHER' ? teacherBroadsheetClassesWithSubjects : classesWithSubjects}
          />
        ) : processorSubTab === 'APPROVAL_DASHBOARD' && isAdminOrSuper ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-6">
            <div className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Terminal Results Approval Workflow</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 font-medium">
                  Review, remark, batch approve, and publish terminal reports submitted by teachers. Published reports are instantly visible to Parents and Students.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px]">
                {(['ALL', 'PENDING', 'APPROVED', 'PUBLISHED', 'REJECTED'] as const).map((filt) => {
                  const count = availableClasses.filter(classId => {
                    const status = getWorkflowStatusForClass(classId);
                    if (filt === 'ALL') return true;
                    if (filt === 'PENDING') return status === 'PENDING_APPROVAL' || status === 'SUBMITTED';
                    if (filt === 'APPROVED') return status === 'APPROVED';
                    if (filt === 'PUBLISHED') return status === 'PUBLISHED';
                    if (filt === 'REJECTED') return status === 'REJECTED' || status === 'RETURNED_FOR_CORRECTION';
                    return false;
                  }).length;
                  return (
                    <button
                      key={filt}
                      onClick={() => setApprovalFilter(filt)}
                      className={`px-2.5 py-1 rounded-md font-bold uppercase cursor-pointer transition-all ${
                        approvalFilter === filt
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-3xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {filt} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-350 border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-855 text-[10px] font-black uppercase text-slate-455 tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3 px-4">CLASS</th>
                    <th className="py-3 px-4">ASSIGNED TEACHER</th>
                    <th className="py-3 px-4 text-center">PUPILS</th>
                    <th className="py-3 px-4 text-center">GRADES COUNT</th>
                    <th className="py-3 px-4 text-center">OVERALL STATUS</th>
                    <th className="py-3 px-4 text-center">WORKFLOW ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClasses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        No submissions matching filter for this session/term.
                      </td>
                    </tr>
                  ) : (
                    filteredClasses.map(classItem => {
                      const classId = classItem.classId;
                      const status = getWorkflowStatusForClass(classId);
                      const classKids = students.filter(s => s.classId === classId);
                      const classTeacher = teachers?.find(t => 
                        (t.classesAssigned || []).some(ca => ca.classId === classId)
                      );
                      const teacherName = classTeacher ? `${classTeacher.firstName} ${classTeacher.lastName}` : 'Unassigned';
                      const classResults = results.filter(r => 
                        r.classId === classId && 
                        r.term === selectedTerm && 
                        r.session === activeSessionName
                      );

                      // Get database request info if any
                      const dbReq = resultApprovals.find(ra => 
                        ra.classId === classId && 
                        ra.session === activeSessionName && 
                        ra.term === selectedTerm
                      );

                      return (
                        <tr key={classId} className="hover:bg-slate-50/20 transition-colors">
                          <td className="py-3 px-4 font-extrabold text-blue-655 dark:text-blue-400">{classId}</td>
                          <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{teacherName}</td>
                          <td className="py-3 px-4 text-center font-bold font-mono">{classKids.length}</td>
                          <td className="py-3 px-4 text-center font-bold font-mono text-slate-500">{classResults.length}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block py-1 px-2.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/65'
                                : status === 'APPROVED'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/65'
                                : status === 'PENDING_APPROVAL' || status === 'SUBMITTED'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/65 animate-pulse'
                                : status === 'REJECTED' || status === 'RETURNED_FOR_CORRECTION'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/65'
                                : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}>
                              {status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  // Pre-populate remarks and comments from current db request or fallbacks
                                  setHtComment(dbReq?.headTeacherComment || '');
                                  setPrComment(dbReq?.principalComment || '');
                                  setActionComment('');
                                  setSelectedApprovalToReview({
                                    classId,
                                    teacherName,
                                    studentsCount: classKids.length,
                                    gradesCount: classResults.length,
                                    status,
                                    dbReq
                                  });
                                  setIsReviewModalOpen(true);
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] cursor-pointer shadow-3xs flex items-center gap-1"
                              >
                                <FileText size={12} />
                                Review Workflow
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Interactive review modal */}
            {isReviewModalOpen && selectedApprovalToReview && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col my-8">
                  {/* Header */}
                  <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase font-black tracking-widest bg-indigo-500/30 px-2 py-0.5 rounded text-indigo-200">
                        Approval Control Panel
                      </span>
                      <h4 className="text-base font-extrabold tracking-tight mt-1">
                        Review Academic Sheets: {selectedApprovalToReview.classId}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Assigned Teacher: {selectedApprovalToReview.teacherName} | Term: {selectedTerm} | Session: {activeSessionName}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsReviewModalOpen(false)}
                      className="text-slate-300 hover:text-white text-lg font-bold p-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body Scroller */}
                  <div className="p-6 overflow-y-auto space-y-6 max-h-[70vh]">
                    {/* Academic Stat Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                        <span className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest block">Pupils</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100">{selectedApprovalToReview.studentsCount}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                        <span className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest block">Grades Count</span>
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100">{selectedApprovalToReview.gradesCount}</span>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                        <span className="text-[9px] font-black text-slate-450 dark:text-slate-400 uppercase tracking-widest block">Current Status</span>
                        <span className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 uppercase block mt-1">{selectedApprovalToReview.status.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {/* Progress Pipeline */}
                    <div className="space-y-2">
                      <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wider">Workflow Progression</h5>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-450 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                        <div className="flex flex-col items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">1</span>
                          <span>Draft</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 mx-2" />
                        <div className="flex flex-col items-center gap-1">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                            ['PENDING_APPROVAL', 'SUBMITTED', 'APPROVED', 'PUBLISHED'].includes(selectedApprovalToReview.status)
                              ? 'bg-amber-500 text-white animate-pulse'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700'
                          }`}>2</span>
                          <span>Submitted</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 mx-2" />
                        <div className="flex flex-col items-center gap-1">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                            ['APPROVED', 'PUBLISHED'].includes(selectedApprovalToReview.status)
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700'
                          }`}>3</span>
                          <span>Approved</span>
                        </div>
                        <div className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-800 mx-2" />
                        <div className="flex flex-col items-center gap-1">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold ${
                            selectedApprovalToReview.status === 'PUBLISHED'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-800 text-slate-700'
                          }`}>4</span>
                          <span>Published</span>
                        </div>
                      </div>
                    </div>

                    {/* Evaluative Comments Editor */}
                    <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wider flex items-center gap-1">
                        <span>📝</span>
                        <span>Official Evaluative Remarks</span>
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                            Head Teacher Comment (Batch)
                          </label>
                          <textarea
                            value={htComment}
                            onChange={(e) => setHtComment(e.target.value)}
                            placeholder="Add standard/batch remarks from the Head Teacher..."
                            className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-750 text-[11px] h-20 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                            Principal Comment (Batch)
                          </label>
                          <textarea
                            value={prComment}
                            onChange={(e) => setPrComment(e.target.value)}
                            placeholder="Add overall/batch remarks from the Principal..."
                            className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-750 text-[11px] h-20 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={async () => {
                            const success = await handleTransitionWorkflow(
                              selectedApprovalToReview.classId,
                              selectedApprovalToReview.status,
                              'UPDATE_COMMENTS',
                              'Updated evaluative remarks',
                              htComment,
                              prComment
                            );
                            if (success) {
                              showNotice('Remarks updated successfully.');
                            }
                          }}
                          className="bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold py-1.5 px-3.5 rounded-lg cursor-pointer transition-all"
                        >
                          💾 Save remarks to database
                        </button>
                      </div>
                    </div>

                    {/* Transition Comments Block */}
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block">
                        Workflow Action Comment / Reject Reason
                      </label>
                      <input
                        type="text"
                        value={actionComment}
                        onChange={(e) => setActionComment(e.target.value)}
                        placeholder="Provide details or reasons for this action (e.g., Reject reason)..."
                        className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-750 text-[11px] focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Interactive Action Console */}
                    <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wider">Transition Console</h5>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        <button
                          onClick={() => handleTransitionWorkflow(selectedApprovalToReview.classId, 'APPROVED', 'APPROVE', actionComment || 'Approved report sheets', htComment, prComment)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-[10px] cursor-pointer shadow-3xs transition-all"
                        >
                          ✓ Approve Class
                        </button>
                        <button
                          onClick={() => handleTransitionWorkflow(selectedApprovalToReview.classId, 'PUBLISHED', 'PUBLISH', actionComment || 'Released terminal reports to portal', htComment, prComment)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-xl text-[10px] cursor-pointer shadow-3xs transition-all"
                        >
                          🚀 Publish (Live)
                        </button>
                        <button
                          onClick={() => {
                            if (!actionComment) {
                              showNotice('Error: Correction comment is required to return report sheets.');
                              return;
                            }
                            handleTransitionWorkflow(selectedApprovalToReview.classId, 'RETURNED_FOR_CORRECTION', 'RETURN', actionComment, htComment, prComment);
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-3 rounded-xl text-[10px] cursor-pointer shadow-3xs transition-all"
                        >
                          ↺ Return Correction
                        </button>
                        <button
                          onClick={() => {
                            if (!actionComment) {
                              showNotice('Error: A reject comment is required to reject reports.');
                              return;
                            }
                            handleTransitionWorkflow(selectedApprovalToReview.classId, 'REJECTED', 'REJECT', actionComment, htComment, prComment);
                          }}
                          className="bg-rose-600 hover:bg-rose-700 text-white font-bold py-2 px-3 rounded-xl text-[10px] cursor-pointer shadow-3xs transition-all"
                        >
                          ✕ Reject Sheet
                        </button>
                      </div>
                    </div>

                    {/* Timeline History */}
                    <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🕒</span>
                        <span>Audit Log & Timeline</span>
                      </h5>
                      <div className="space-y-3 pl-2 border-l border-slate-150 dark:border-slate-800">
                        {(!selectedApprovalToReview.dbReq?.reviewHistory || selectedApprovalToReview.dbReq.reviewHistory.length === 0) ? (
                          <p className="text-[11px] text-slate-450 italic">No previous workflow timeline logs found.</p>
                        ) : (
                          selectedApprovalToReview.dbReq.reviewHistory.map((h: any, hIdx: number) => (
                            <div key={hIdx} className="relative text-[11px] space-y-0.5">
                              <span className="absolute -left-[14px] top-1.5 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              <div className="flex justify-between text-slate-450 text-[10px]">
                                <span className="font-bold text-slate-650 dark:text-slate-300">{h.user}</span>
                                <span>{new Date(h.timestamp).toLocaleString('en-GB')}</span>
                              </div>
                              <p className="font-extrabold text-slate-700 dark:text-slate-100">
                                Action: <span className="uppercase text-[10px] tracking-wider px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-black text-indigo-600 dark:text-indigo-400">{h.action}</span>
                              </p>
                              {h.comment && (
                                <p className="text-slate-500 italic">Remark: "{h.comment}"</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-450">
                  <span>Workflow Engine</span>
                    <button
                      onClick={() => setIsReviewModalOpen(false)}
                      className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold py-1.5 px-4 rounded-lg cursor-pointer"
                    >
                      Close Control Panel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
            {/* Entries control & Search wrapper */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-5 border-b border-slate-100 dark:border-slate-800 mb-5 gap-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <span>Show</span>
                <select
                  value={entriesCount}
                  onChange={(e) => setEntriesCount(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-850 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer font-black text-slate-700 dark:text-slate-300"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold w-full sm:w-auto">
                <span>Search:</span>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search class or teacher..."
                  className="w-full sm:w-48 bg-slate-50 dark:bg-slate-850 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-705 dark:text-slate-205 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-350 border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-black uppercase text-slate-455 tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-2.5 px-4 text-center w-12 text-slate-400">#</th>
                    <th className="py-2.5 px-4">CLASS</th>
                    <th className="py-2.5 px-4">TEACHER</th>
                    <th className="py-2.5 px-4 text-center">STUDENTS</th>
                    <th className="py-2.5 px-4 text-center">SUBJECTS</th>
                    <th className="py-2.5 px-4 text-center w-40">OPTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredClasses.slice(0, entriesCount).map((cls, idx) => (
                    <tr key={cls.classId} className="hover:bg-slate-50/30 dark:hover:bg-slate-850/10 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold">{cls.id}</td>
                      <td className="py-3 px-4 font-bold text-blue-650 dark:text-blue-400">{cls.classId}</td>
                      <td className="py-2.5 px-4">
                        {isAdminOrSuper ? (
                          <select
                            value={cls.teacherId || ""}
                            onChange={(e) => handleAssignTeacherToClass(cls.classId, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-1 px-2.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-full max-w-[175px] shadow-3xs"
                            title="Assign Class Teacher"
                          >
                            <option value="">
                              Unassigned
                            </option>
                            {teachers?.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.firstName} {t.lastName || ""}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-500 font-semibold">{cls.teacherName}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-slate-700 dark:text-slate-300">{cls.studentsCount}</td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-slate-700 dark:text-slate-300">{cls.subjectsCount}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleProcessClass(cls.classId)}
                          className="bg-white hover:bg-slate-50 border border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-855 text-indigo-605 dark:text-indigo-400 font-bold py-1.5 px-3.5 rounded-lg text-[10.5px] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-3xs"
                        >
                          Process Class Result
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredClasses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-405 italic">
                        No matching classes found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer controls */}
            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 gap-3 text-[11px] text-slate-400 font-bold">
              <span>Showing 1 to {Math.min(filteredClasses.length, entriesCount)} of {filteredClasses.length} entries</span>
              <div className="flex items-center gap-1.5">
                <button 
                  disabled 
                  className="py-1 px-3.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-805 text-slate-350 cursor-not-allowed font-medium text-[10.5px]"
                >
                  Previous
                </button>
                <button className="py-1 px-3 bg-blue-650 hover:bg-blue-700 text-white rounded font-extrabold text-[10.5px] shadow-sm animate-none">
                  1
                </button>
                <button 
                  disabled 
                  className="py-1 px-3.5 rounded border border-slate-200 dark:border-slate-85 bg-slate-50/40 dark:bg-slate-805 text-slate-350 cursor-not-allowed font-medium text-[10.5px]"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5">
        <button
          onClick={() => setSelectedClassForProcessing(null)}
          className="inline-flex items-center gap-1.5 text-xs text-indigo-650 dark:text-indigo-400 hover:underline font-black cursor-pointer transition-all"
        >
          <ArrowLeft size={14} />
          Back to Class Directory
        </button>
        <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-855 py-1 px-2.5 rounded-lg">
          Currently Processing: <strong className="text-slate-700 dark:text-slate-200">{selectedClass}</strong>
        </span>
      </div>
      
      {/* Visual top notification tracker */}
      {notif && (
        <Alert variant="success" icon={<Check size={14} />}>{notif}</Alert>
      )}

      {/* ----------------- ADMIN/SUPER CONFIGURATION HEADER ----------------- */}
      {isAdminOrSuper && (
        <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Grade Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3.5 rounded-lg border-0 text-slate-700 dark:text-slate-300 w-full sm:w-36 cursor-pointer"
              >
                {availableClasses.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Terminal Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value as SchoolTerm)}
                className="bg-slate-50 dark:bg-slate-800 text-xs py-2 px-3.5 rounded-lg border-0 text-slate-700 dark:text-slate-300 w-full sm:w-32 cursor-pointer"
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="border border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-3.5 py-1.8 text-xs font-semibold rounded-lg flex items-center gap-1.5"
            >
              <Download size={14} />
              <span>Export Ledger</span>
            </button>
            <button
              onClick={handleApproveAllClassResults}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.8 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5"
            >
              <Lock size={14} />
              <span>Approve & Lock Batch</span>
            </button>
          </div>
        </div>
      )}

      {isParentOrStudent ? (
        <ParentStudentResultViewer
          classmates={classmates}
          allProcessedResultsList={allProcessedResultsList}
          selectedTerm={selectedTerm}
          activeSessionName={activeSessionName}
          subjects={subjects}
          onShowNotice={showNotice}
          gradingScale={gradingScale}
          config={config}
          currentRole={currentRole as 'PARENT' | 'STUDENT'}
          classesWithSubjects={classesWithSubjects}
          earlyYearsResults={earlyYearsResults}
          attendance={attendance}
        />
      ) : isEarlyYearsClass && activeViewMode === 'LIST' ? (
        <EarlyYearsResultEditor
          currentRole={currentRole}
          selectedClass={selectedClass}
          selectedArm={selectedArm}
          selectedTerm={selectedTerm}
          activeSessionName={activeSessionName}
          students={students}
          subjects={subjects}
          classesWithSubjects={classesWithSubjects}
          earlyYearsResults={earlyYearsResults}
          onSetEarlyYearsResults={onSetEarlyYearsResults}
          assessmentItems={assessmentItems}
          config={config}
          results={allProcessedResultsList}
          onSetResults={onSetResults}
          attendance={attendance}
          onSetAttendance={onSetAttendance}
          onSelectStudentReport={(studentId, mode) => {
            setActiveCardStudentId(studentId);
            setActiveViewMode(mode);
          }}
        />
      ) : activeViewMode === 'LIST' ? (
        <ClassStudentsTable
          classmates={classmates}
          onSelectStudent={(id, mode) => {
            setActiveCardStudentId(id);
            setActiveViewMode(mode);
          }}
          onShowNotice={showNotice}
          searchText={searchText}
          setSearchText={setSearchText}
          allProcessedResultsList={allProcessedResultsList}
          onSetResults={onSetResults}
          selectedTerm={selectedTerm}
          activeSessionName={activeSessionName}
        />
      ) : activeViewMode === 'SCORES' ? (
        <StudentScoresEditor
          targetStudent={targetStudent}
          targetStudentResults={targetStudentResults}
          isPreschoolMode={isPreschoolMode}
          assessmentItems={assessmentItems}
          subjects={subjects}
          allProcessedResultsList={allProcessedResultsList}
          onSetResults={onSetResults}
          onBack={() => setActiveViewMode('LIST')}
          selectedTerm={selectedTerm}
          activeSessionName={activeSessionName}
          caTestMax={caTestMax}
          caAssignmentMax={caAssignmentMax}
          examMax={examMax}
          gradingScale={gradingScale}
          attendance={attendance}
          onSetAttendance={onSetAttendance}
          classesWithSubjects={classesWithSubjects}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3">
            <button
              onClick={() => setActiveViewMode('LIST')}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-650 dark:text-indigo-400 hover:underline font-black cursor-pointer transition-all"
            >
              <ArrowLeft size={14} />
              <span>← Return to Students Directory</span>
            </button>
            <span className="text-[10.5px] uppercase font-black text-slate-400 tracking-widest bg-slate-50 dark:bg-slate-855 py-1 px-3 rounded-lg">
              Terminal Report Console
            </span>
          </div>

          {/* Main layout split list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Class Pupils List / selector */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 block">
              Class Roster & Standings ({classmates.length})
            </h4>

            <div className="divide-y divide-slate-100 dark:divide-slate-850 max-h-[400px] overflow-y-auto pr-1">
              {classmates.map(std => {
                const isSelected = std.id === activeCardStudentId;
                const rInfo = positionsMapResult[std.id];
                return (
                  <button
                    key={std.id}
                    onClick={() => setActiveCardStudentId(std.id)}
                    className={`w-full text-left py-2.5 px-3 rounded-lg flex items-center justify-between gap-2 transition-all ${
                      isSelected 
                        ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40' 
                        : 'border border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img src={std.photo} alt={std.firstName} className="w-8 h-8 rounded-full object-cover border" referrerPolicy="no-referrer" />
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                          {std.firstName} {std.lastName}
                        </p>
                        <span className="text-[10px] text-slate-450 block">{std.admissionNo}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {rInfo ? (
                        <>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 block font-display">
                            {getOrdinalSuffix(rInfo.rankNum)}
                          </span>
                          <span className="text-[9px] text-slate-400 block">Avg: {rInfo.avg}%</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-450 italic">Ungraded</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Approval and Publication Workflow Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Clock size={12} className="text-blue-600 animate-pulse" />
              <span>Report Approval Status</span>
            </h4>

            {targetStudent ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 p-2 rounded-lg">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Current Status:</span>
                  <span className={`text-[10px] font-black uppercase py-0.5 px-2 rounded-md ${
                    getOverallReportStatus(targetStudentResults) === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' :
                    getOverallReportStatus(targetStudentResults) === 'APPROVED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-955/40 dark:text-blue-400' :
                    getOverallReportStatus(targetStudentResults) === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400' :
                    getOverallReportStatus(targetStudentResults) === 'REJECTED' ? 'bg-rose-100 text-rose-800 dark:bg-rose-955/40 dark:text-rose-400' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {getOverallReportStatus(targetStudentResults) === 'PUBLISHED' ? 'Published' :
                     getOverallReportStatus(targetStudentResults) === 'APPROVED' ? 'Approved' :
                     getOverallReportStatus(targetStudentResults) === 'PENDING_APPROVAL' ? 'Pending Approval' :
                     getOverallReportStatus(targetStudentResults) === 'REJECTED' ? 'Returned / Rejected' :
                     'Draft'}
                  </span>
                </div>

                {/* Workflow actions depending on user roles */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-850">
                  {/* Teacher actions */}
                  {currentRole === 'TEACHER' && (
                    <>
                      {(getOverallReportStatus(targetStudentResults) === 'DRAFT' || getOverallReportStatus(targetStudentResults) === 'REJECTED') ? (
                        <button
                          onClick={() => handleUpdateReportStatus('SUBMITTED')}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Check size={12} />
                          <span>Submit to Admin for Review</span>
                        </button>
                      ) : (
                        <p className="text-[10px] text-slate-450 italic leading-relaxed text-center">
                          🔒 Locked: Submitted to school authority. Edits disabled during review.
                        </p>
                      )}
                    </>
                  )}

                  {/* Admin / SuperAdmin actions */}
                  {isAdminOrSuper && (
                    <div className="space-y-2">
                      {getOverallReportStatus(targetStudentResults) === 'PENDING_APPROVAL' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleUpdateReportStatus('APPROVED')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Check size={12} />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleUpdateReportStatus('REJECTED')}
                            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                          >
                            <X size={12} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {getOverallReportStatus(targetStudentResults) === 'APPROVED' && (
                        <div className="space-y-2">
                          <button
                            onClick={() => handleUpdateReportStatus('PUBLISHED')}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                          >
                            <Sparkles size={12} />
                            <span>Publish to Portal (Live)</span>
                          </button>
                          <button
                            onClick={() => handleUpdateReportStatus('REJECTED')}
                            className="w-full bg-slate-205 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                          >
                            <ArrowLeft size={11} />
                            <span>Reject / Send Back</span>
                          </button>
                        </div>
                      )}

                      {getOverallReportStatus(targetStudentResults) === 'PUBLISHED' && (
                        <button
                          onClick={() => handleUpdateReportStatus('APPROVED')}
                          className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-305 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Unlock size={12} className="text-amber-500" />
                          <span>Unpublish / Revoke</span>
                        </button>
                      )}

                      {/* Direct administrative override */}
                      {(getOverallReportStatus(targetStudentResults) === 'DRAFT' || getOverallReportStatus(targetStudentResults) === 'REJECTED') && (
                        <button
                          onClick={() => handleUpdateReportStatus('APPROVED')}
                          className="w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 text-xs font-bold py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all border border-indigo-100 dark:border-indigo-900/30"
                        >
                          <Check size={12} />
                          <span>Administrative Approval Override</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">Select a pupil from the roster above to manage approval workflow.</p>
            )}
          </div>

          {/* 2. Overall Report Card Evaluations & Remarks */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare size={12} className="text-indigo-600" />
              <span>Overall Terminal Remarks</span>
            </h4>

            {targetStudent ? (
              <div className="space-y-3">
                {/* Class Teacher Remark */}
                {(currentRole === 'TEACHER' || isAdminOrSuper) && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 block uppercase">Class Teacher Evaluation</label>
                    <textarea
                      value={classCommentInput}
                      onChange={(e) => setClassCommentInput(e.target.value)}
                      placeholder="Enter classroom development and behavioral remark..."
                      className="w-full bg-slate-50 dark:bg-slate-950 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-905 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 h-14"
                    />
                  </div>
                )}

                {/* Head Teacher Remark */}
                {isAdminOrSuper && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 block uppercase">Head Teacher Comment</label>
                    <textarea
                      value={headCommentInput}
                      onChange={(e) => setHeadCommentInput(e.target.value)}
                      placeholder="Enter official Section Head / Head Teacher remark..."
                      className="w-full bg-slate-50 dark:bg-slate-950 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-905 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 h-14"
                    />
                  </div>
                )}

                {/* Principal Remark */}
                {isAdminOrSuper && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 block uppercase">Principal's Signature Remark</label>
                    <textarea
                      value={principalCommentInput}
                      onChange={(e) => setPrincipalCommentInput(e.target.value)}
                      placeholder="Enter principal administrative academic commentary..."
                      className="w-full bg-slate-50 dark:bg-slate-950 text-xs p-2 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-905 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 h-14"
                    />
                  </div>
                )}

                <button
                  onClick={() => handleSaveReportComments(classCommentInput, headCommentInput, principalCommentInput)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2 px-3 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <Check size={12} />
                  <span>Save Evaluative Comments</span>
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic">Select a pupil to input evaluative commentaries.</p>
            )}
          </div>

          {/* Grading scale list configuration (For reference or update) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Sliders size={12} className="text-blue-650" />
              <span>Scale Configuration</span>
            </h4>
            <div className="space-y-1.5">
              {gradingScale.map((gd, idx) => (
                <div key={idx} className="flex justify-between items-center text-[11px] font-medium text-slate-600 dark:text-slate-350 bg-slate-55 dark:bg-slate-850 p-2 rounded">
                  <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">Grade {gd.grade}</span>
                  <span>Minimum score: {gd.min}%</span>
                  <span className="text-slate-400 italic font-semibold">{gd.remark}</span>
                </div>
              ))}
            </div>
            {isAdminOrSuper && (
              <button
                onClick={handleOpenConfigModal}
                className="mt-3 w-full bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-100 dark:border-indigo-900/30 transition-all"
              >
                <Edit size={12} />
                <span>Modify Assessment Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Primary comprehensive Terminal Report Card (Beautiful Printable Area) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs lg:col-span-2 overflow-hidden flex flex-col justify-between">
          
          {/* Action trigger header for print */}
          <div className="p-4 bg-slate-50 dark:bg-slate-150 border-b border-slate-150 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-blue-600" />
              <span>Consolidated Terminal Report Card View</span>
            </span>
            <button
              onClick={handlePrintDocument}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 hover:bg-slate-30 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer size={13} />
              <span>Print/Download PDF report</span>
            </button>
          </div>

          {/* Print notice */}
          {showPrintNotice && (
            <div className="no-print mx-4 sm:mx-6 mt-4 p-3.5 bg-indigo-50 border border-indigo-200 dark:bg-slate-800/80 dark:border-slate-700 rounded-xl text-xs text-indigo-950 dark:text-slate-200 flex gap-3 items-start shadow-xs relative">
              <div className="space-y-1 pr-6">
                <p className="font-extrabold text-[11.5px] text-indigo-900 dark:text-indigo-400">Print dialog did not open?</p>
                <p className="leading-relaxed opacity-90 text-[10.5px]">
                  Open the portal in a full browser tab and use Print/Download PDF again.
                </p>
              </div>
              <button 
                onClick={() => setShowPrintNotice(false)}
                className="absolute top-2.5 right-2 text-indigo-400 hover:text-indigo-700 dark:hover:text-amber-300 font-bold p-1 cursor-pointer text-[10px]"
                aria-label="Dismiss notice"
              >
                x
              </button>
            </div>
          )}

          {/* Clean report sheet wrapping paper (Print Target) */}
          <ReportCardPrintout
            targetStudent={targetStudent}
            targetStudentResults={targetStudentResults}
            isPreschoolMode={isPreschoolMode}
            activeSessionName={activeSessionName}
            selectedTerm={selectedTerm}
            reportType={activeViewMode === 'EOS' ? 'EOS' : 'EOT'}
            attendance={attendance}
            subjects={subjects}
            config={config}
            gradingScale={gradingScale}
            classmates={classmates}
            allProcessedResultsList={allProcessedResultsList}
            isAdminOrSuper={isAdminOrSuper}
            handleToggleApproveResult={handleToggleApproveResult}
            assessmentItems={assessmentItems}
            isEarlyYearsClass={isEarlyYearsClass}
            earlyYearsResults={earlyYearsResults}
            classesWithSubjects={classesWithSubjects}
          />

          {/* Locked/Approved indicator footer */}
          <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-202 dark:border-slate-800 truncate text-[10px] text-slate-450 flex items-center justify-between font-semibold">
            <span>Copyright 2026 SouthGold Montessori School, All Rights Reserved.</span>
            <span className="flex items-center gap-1 text-emerald-500">
              <Lock size={12} />
              <span>Session Authenticated Record Archive</span>
            </span>
          </div>

        </div>

      </div>
    </div>
    )}

      {/* Dynamic Continuous Assessment & Grading Modal overlay */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="text-indigo-650" size={18} />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-display">Assessment & Grading Configuration</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-5">
              {/* CA Breakdown Weights */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Assessments Weights Breakdown (Enforced 100%)</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">C.A. 1 (Test)</label>
                    <input
                      type="number"
                      disabled
                      value={15}
                      className="w-full text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded text-slate-400 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">C.A. 2 (Homework)</label>
                    <input
                      type="number"
                      disabled
                      value={15}
                      className="w-full text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded text-slate-400 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">C.A. 3 (Project)</label>
                    <input
                      type="number"
                      disabled
                      value={10}
                      className="w-full text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded text-slate-400 text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Written Exam</label>
                    <input
                      type="number"
                      disabled
                      value={60}
                      className="w-full text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded text-slate-400 text-center"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  Assessment weights are locked to the established Nigerian 4-step workflow: <strong>CA1 (15%) + CA2 (15%) + CA3 (10%) + EXAM (60%) = 100%</strong>.
                </p>
              </div>

              {/* Grading Tiers */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Grading Hierarchy System</h4>
                <div className="space-y-2 max-h-52 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
                  {tempGradingScale.map((t, idx) => (
                    <div key={idx} className="flex gap-2.5 items-center">
                      <div className="w-16">
                        <span className="text-[10px] font-bold text-center block uppercase tracking-wider py-1 px-2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300">
                          Grade {t.grade}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="number"
                          required
                          min={0}
                          max={100}
                          placeholder="Min Score %"
                          value={t.minScore}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setTempGradingScale(prev => prev.map((item, i) => i === idx ? { ...item, minScore: val } : item));
                          }}
                          className="w-full text-xs font-semibold font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded text-slate-800 dark:text-slate-100 placeholder-slate-400"
                        />
                      </div>
                      <div className="flex-1.5">
                        <input
                          type="text"
                          required
                          placeholder="Remark Level"
                          value={t.remark}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTempGradingScale(prev => prev.map((item, i) => i === idx ? { ...item, remark: val } : item));
                          }}
                          className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded text-slate-800 dark:text-slate-100 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Early Years Grading Scale */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-display">Early Years Development Scale</h4>
                <div className="space-y-2 max-h-52 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg p-2.5">
                  {tempEarlyYearsGradingScale.map((t, idx) => (
                    <div key={idx} className="flex gap-2.5 items-center">
                      <div className="w-32">
                        <input
                          type="text"
                          required
                          value={t.grade}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTempEarlyYearsGradingScale(prev => prev.map((item, i) => i === idx ? { ...item, grade: val } : item));
                          }}
                          placeholder="Rating Level"
                          className="w-full text-[10px] font-bold text-center uppercase tracking-wider py-1.5 px-2 rounded bg-slate-100 dark:bg-slate-800 font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Evaluation Standard / Remark"
                          value={t.remark}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTempEarlyYearsGradingScale(prev => prev.map((item, i) => i === idx ? { ...item, remark: val } : item));
                          }}
                          className="w-full text-xs font-medium bg-slate-55 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-2 rounded text-slate-800 dark:text-slate-100 placeholder-slate-400"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800 pt-3 text-right">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs py-2 px-4 rounded-lg shadow-sm cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-2 px-5 rounded-lg shadow-sm cursor-pointer transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
