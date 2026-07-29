import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { 
  Student, 
  Teacher, 
  ResultRecord, 
  AttendanceRecord, 
  FeeRecord, 
  SchoolNotification, 
  SupportTicket, 
  AcademicSession, 
  SchoolTerm,
  UserRole,
  SchoolActivity,
  Subject,
  Parent,
  AuthUser,
  AssessmentItem
} from './types';

// Component imports
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardStats from './components/DashboardStats';
import StudentManager from './components/StudentManager';
import TeacherPortal from './components/TeacherPortal';
import ResultProcessor from './components/ResultProcessor';
import AcademicTermManager from './components/AcademicTermManager';
import SupportDesk from './components/SupportDesk';
import MessagingSystem from './components/MessagingSystem';
import PrintableIdCard from './components/PrintableIdCard';
import LandingPage from './components/LandingPage';
import ActivityManager from './components/ActivityManager';
import ClassSubjectManager from './components/ClassSubjectManager';
import MyProfile from './components/MyProfile';
import ParentStudentAttendanceViewer from './components/ParentStudentAttendanceViewer';
import { EarlyYearsResultRecord } from './components/EarlyYearsResultEditor';

export default function App() {
   
  // 1. Core State variables initialized empty, loaded from backend API
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [earlyYearsResults, setEarlyYearsResults] = useState<EarlyYearsResultRecord[]>([]);
  const [assessmentItems, setAssessmentItems] = useState<AssessmentItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [notifications, setNotifications] = useState<SchoolNotification[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [activities, setActivities] = useState<SchoolActivity[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [staffAdmins, setStaffAdmins] = useState<any[]>([]);
  const [classesWithSubjects, setClassesWithSubjects] = useState<{classId: string, subjects: string[], stage?: 'Pre-School' | 'Primary' | 'Secondary'}[]>([]);

  // 2. Auth state from Supabase
  const [authUser, setAuthUser] = useState<{ accessToken: string; user: AuthUser } | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalLoginError, setGlobalLoginError] = useState<string | null>(null);
  const [darkTheme, setDarkTheme] = useState(() => {
    try {
      return localStorage.getItem('school_theme') === 'dark';
    } catch {
      return false;
    }
  });

  // Derived helpful values
  const activeSessionObj = sessions.find(s => s.isActive) || sessions[0];
  const activeSessionName = activeSessionObj?.name || '2025/2026';
  const activeTerm = config?.currentTerm || 'First Term';
  const currentRole = authUser?.user?.role || 'SCHOOL_ADMIN';
  const userEmail = authUser?.user?.email || '';
  const isLoggedIn = !!authUser;

  // 3. Restore session from Supabase on mount and listen to changes
  useEffect(() => {
    let isMounted = true;

    async function handleSession(session: any) {
      if (session) {
        try {
          const syncRes = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: session.access_token }),
          });
          if (syncRes.ok) {
            const meResponse = await fetch('/api/auth/me');
            if (meResponse.ok && isMounted) {
              const meUser = await meResponse.json();
              
              // Validate role matches route immediately before setting authUser
              const currentPath = window.location.pathname;
              const PATH_TO_ROLE: Record<string, UserRole> = {
                '/login/super-admin': 'SUPER_ADMIN',
                '/login/staff-admin': 'SCHOOL_ADMIN',
                '/login/teacher': 'TEACHER',
                '/login/parent': 'PARENT',
                '/login/student': 'STUDENT'
              };
              const expectedRole = PATH_TO_ROLE[currentPath];
              if (expectedRole && meUser.role !== expectedRole) {
                await supabase.auth.signOut();
                await fetch('/api/auth/logout', { method: 'POST' });
                setGlobalLoginError('You do not have permission to access this portal. Please login using the correct portal.');
                setAuthUser(null);
                return;
              }

              setAuthUser({ accessToken: session.access_token, user: meUser });
            }
          }
        } catch (err) {
          console.error('Session sync error:', err);
        }
      } else {
        if (isMounted) {
          setAuthUser(null);
        }
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handleSession(session);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      handleSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 3b. Validate route on pathname change or state updates
  useEffect(() => {
    const PATH_TO_ROLE: Record<string, UserRole> = {
      '/login/super-admin': 'SUPER_ADMIN',
      '/login/staff-admin': 'SCHOOL_ADMIN',
      '/login/teacher': 'TEACHER',
      '/login/parent': 'PARENT',
      '/login/student': 'STUDENT'
    };
    const validateRoute = async () => {
      if (isLoggedIn) {
        const expectedRole = PATH_TO_ROLE[window.location.pathname];
        if (expectedRole && currentRole !== expectedRole) {
          await supabase.auth.signOut();
          await fetch('/api/auth/logout', { method: 'POST' });
          setGlobalLoginError('You do not have permission to access this portal. Please login using the correct portal.');
          setAuthUser(null);
        }
      }
    };
    validateRoute();

    const handleLocationChange = () => {
      validateRoute();
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [isLoggedIn, currentRole]);

  // 4. Load/Sync data snapshot when authentication status changes
  useEffect(() => {
    async function fetchSnapshot() {
      try {
        const response = await fetch('/api/db');
        if (response.ok) {
          const db = await response.json();
          setStudents(db.students || []);
          setTeachers(db.teachers || []);
          setResults(db.results || []);
          setEarlyYearsResults(db.earlyYearsResults || []);
          setAssessmentItems(db.assessmentItems || []);
          setAttendance(db.attendance || []);
          setNotifications(db.notifications || []);
          setTickets(db.tickets || []);
          setSessions(db.sessions || []);
          setConfig(db.config || {});
          setActivities(db.activities || []);
          setSubjects(db.subjects || []);
          setParents(db.parents || []);
          setStaffAdmins(db.staffAdmins || []);
          if (db.classesWithSubjects) {
            setClassesWithSubjects(db.classesWithSubjects);
          }
        }
      } catch (err) {
        console.error('Failed to sync from backend API:', err);
      }
    }
    fetchSnapshot();
  }, [authUser]);

  // Load public config & activities on mount for landing page dynamic loading
  useEffect(() => {
    async function fetchPublicData() {
      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData);
        }
        const activitiesRes = await fetch('/api/activities');
        if (activitiesRes.ok) {
          const activitiesData = await activitiesRes.json();
          setActivities(activitiesData);
        }
      } catch (err) {
        console.error('Failed to fetch public data:', err);
      }
    }
    fetchPublicData();
  }, []);

  // Theme support
  useEffect(() => {
    try {
      localStorage.setItem('school_theme', darkTheme ? 'dark' : 'light');
    } catch (e) {
      console.error(e);
    }
  }, [darkTheme]);

  // Safe wrapper handlers synchronizing react context edits onto the REST backend
  const handleSetStudents = async (newStudents: Student[]) => {
    setStudents(newStudents);
    try {
      await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudents)
      });
    } catch (err) {
      console.error('Error in students REST update:', err);
    }
  };

  const handleSetActivities = async (newActivities: SchoolActivity[]) => {
    setActivities(newActivities);
    try {
      if (newActivities.length > activities.length) {
        const added = newActivities.find(na => !activities.some(a => a.id === na.id));
        if (added) {
          await fetch('/api/activities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(added)
          });
        }
      } else if (newActivities.length < activities.length) {
        const deleted = activities.find(a => !newActivities.some(na => na.id === a.id));
        if (deleted) {
          await fetch(`/api/activities/${deleted.id}`, { method: 'DELETE' });
        }
      } else {
        for (const na of newActivities) {
          const orig = activities.find(a => a.id === na.id);
          if (orig && JSON.stringify(na) !== JSON.stringify(orig)) {
            await fetch(`/api/activities/${na.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(na)
            });
          }
        }
      }
    } catch (err) {
      console.error('Error in activities REST update:', err);
    }
  };

  const handleSetTeachers = async (newTeachers: Teacher[]) => {
    setTeachers(newTeachers);
    try {
      await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeachers)
      });
    } catch (err) {
      console.error('Error in teachers REST update:', err);
    }
  };

  const handleSetResults = async (newResults: ResultRecord[]) => {
    setResults(newResults);
    try {
      const changed = newResults.filter(nr => {
        const orig = results.find(r => r.id === nr.id);
        return !orig || JSON.stringify(nr) !== JSON.stringify(orig);
      });

      if (changed.length > 0) {
        await fetch('/api/results', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changed)
        });
      }
    } catch (err) {
      console.error('Error in results REST update:', err);
    }
  };

  const handleSetEarlyYearsResults = async (newResults: EarlyYearsResultRecord[]) => {
    setEarlyYearsResults(newResults);
    try {
      const changed = newResults.filter(nr => {
        const orig = earlyYearsResults.find(r => r.id === nr.id);
        return !orig || JSON.stringify(nr) !== JSON.stringify(orig);
      });

      if (changed.length > 0) {
        await fetch('/api/early-years/results', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changed)
        });
      }
    } catch (err) {
      console.error('Error in early-years/results REST update:', err);
    }
  };

  const handleSetAssessmentItems = async (newItems: AssessmentItem[]) => {
    setAssessmentItems(newItems);
    try {
      await fetch('/api/assessment-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItems)
      });
    } catch (err) {
      console.error('Error in assessment-items REST update:', err);
    }
  };

  const handleSetAttendance = async (newAttendance: AttendanceRecord[]) => {
    setAttendance(newAttendance);
    try {
      const deleted = attendance.filter(a => !newAttendance.some(na => na.id === a.id));
      if (deleted.length > 0) {
        await fetch('/api/attendance/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deleted.map(d => d.id))
        });
      }

      const changed = newAttendance.filter(na => {
        const orig = attendance.find(a => a.id === na.id);
        return !orig || JSON.stringify(na) !== JSON.stringify(orig);
      });
      if (changed.length > 0) {
        await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(changed)
        });
      }
    } catch (err) {
      console.error('Error in attendance REST update:', err);
    }
  };

  const handleSetNotifications = async (newNotifications: SchoolNotification[]) => {
    setNotifications(newNotifications);
    try {
      if (newNotifications.length > notifications.length) {
        const added = newNotifications.find(nn => !notifications.some(n => n.id === nn.id));
        if (added) {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(added)
          });
        }
      }
    } catch (err) {
      console.error('Error in notifications REST update:', err);
    }
  };

  const handleMarkNotificationRead = async (notifId: string) => {
    const updated = notifications.map(n => n.id === notifId ? { ...n, isRead: true } : n);
    setNotifications(updated);
    try {
      const found = updated.find(n => n.id === notifId);
      if (found) {
        await fetch(`/api/notifications/${notifId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(found)
        });
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleSetTickets = async (newTickets: SupportTicket[]) => {
    setTickets(newTickets);
    try {
      if (newTickets.length > tickets.length) {
        const added = newTickets.find(nt => !tickets.some(t => t.id === nt.id));
        if (added) {
          await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(added)
          });
        }
      } else {
        for (const nt of newTickets) {
          const orig = tickets.find(t => t.id === nt.id);
          if (orig && JSON.stringify(nt) !== JSON.stringify(orig)) {
            await fetch(`/api/tickets/${nt.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(nt)
            });
          }
        }
      }
    } catch (err) {
      console.error('Error in tickets REST update:', err);
    }
  };

  const handleSetSessions = async (newSessions: AcademicSession[]) => {
    setSessions(newSessions);
    try {
      await fetch('/api/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSessions)
      });
    } catch (err) {
      console.error('Error in sessions REST update:', err);
    }
  };

  const handleSetSubjects = async (newSubjects: Subject[]) => {
    setSubjects(newSubjects);
    try {
      if (newSubjects.length > subjects.length) {
        const added = newSubjects.find(ns => !subjects.some(s => s.id === ns.id));
        if (added) {
          await fetch('/api/subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(added)
          });
        }
      } else if (newSubjects.length < subjects.length) {
        const deleted = subjects.find(s => !newSubjects.some(ns => ns.id === s.id));
        if (deleted) {
          await fetch(`/api/subjects/${deleted.id}`, { method: 'DELETE' });
        }
      } else {
        for (const ns of newSubjects) {
          const orig = subjects.find(s => s.id === ns.id);
          if (orig && (orig.name !== ns.name || orig.code !== ns.code)) {
            await fetch(`/api/subjects/${ns.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(ns)
            });
          }
        }
      }
    } catch (err) {
      console.error('Error in subjects REST update:', err);
    }
  };

  const handleSetParents = async (newParents: Parent[]) => {
    setParents(newParents);
    try {
      const added = newParents.find(np => !parents.some(p => p.id === np.id));
      if (added) {
        await fetch('/api/parents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(added)
        });
      }
    } catch (err) {
      console.error('Error in parents REST update:', err);
    }
  };

  const handleSetClassesWithSubjects = async (newClassesSubjects: {classId: string, subjects: string[]}[]) => {
    setClassesWithSubjects(newClassesSubjects);
    try {
      await fetch('/api/classes-subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClassesSubjects)
      });
    } catch (err) {
      console.error('Error in classes-subjects REST update:', err);
    }
  };

  // Keep configuration in sync with backend API
  useEffect(() => {
    async function syncConfig() {
      try {
        await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
      } catch (err) {
        console.error('Error synchronizing school configuration:', err);
      }
    }
    if (config) syncConfig();
  }, [config]);

  const handleRoleChange = (role: UserRole) => {
    setActiveTab('dashboard');
  };

  const handleLogin = async (email: string, password: string, expectedRole?: UserRole) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      throw new Error(error.message || 'Login failed');
    }
    if (!data.session) {
      throw new Error('Login failed: no active session found');
    }
    
    const syncRes = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: data.session.access_token }),
    });
    if (!syncRes.ok) {
      const errJson = await syncRes.json();
      await supabase.auth.signOut();
      throw new Error(errJson.error || 'Server session synchronization failed');
    }

    const meResponse = await fetch('/api/auth/me');
    if (!meResponse.ok) {
      await supabase.auth.signOut();
      throw new Error('Failed to retrieve user profile after login');
    }
    const meUser = await meResponse.json();

    if (expectedRole && meUser.role !== expectedRole) {
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
      throw new Error('You do not have permission to access this portal.');
    }

    setAuthUser({ accessToken: data.session.access_token, user: meUser });
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Failed to clear session on logout:', err);
    }
    setAuthUser(null);
    setActiveTab('dashboard');
  };

  const handleToggleTheme = () => {
    setDarkTheme(!darkTheme);
  };

  const handleSetConfig = async (newConfig: any) => {
    setConfig(newConfig);
    try {
      await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      });
    } catch (err) {
      console.error('Error in config REST update:', err);
    }
  };

  const handleSwitchSession = (sessionId: string) => {
    const updatedSessions = sessions.map(s => ({
      ...s,
      isActive: s.id === sessionId
    }));
    handleSetSessions(updatedSessions);
    if (config) {
      const updatedConfig = {
        ...config,
        currentSessionId: sessionId
      };
      handleSetConfig(updatedConfig);
    }
  };

  const handleSwitchTerm = (term: SchoolTerm | null) => {
    if (config) {
      const updatedConfig = {
        ...config,
        currentTerm: term
      };
      handleSetConfig(updatedConfig);
    }
  };

  const handleUpdateConfigDates = (dates: { resumptionDate: string; closingDate: string }) => {
    if (config) {
      const updatedConfig = {
        ...config,
        resumptionDate: dates.resumptionDate,
        closingDate: dates.closingDate
      };
      handleSetConfig(updatedConfig);
    }
  };

  const handleUpdateConfig = (newConfigUpdates: Partial<any>) => {
    if (config) {
      const updatedConfig = {
        ...config,
        ...newConfigUpdates
      };
      handleSetConfig(updatedConfig);
    }
  };

  // 4. Tab Routing renderer
  const renderActiveComponent = () => {
    const allowedTabs: Record<UserRole, string[]> = {
      SUPER_ADMIN: ['dashboard', 'students', 'activities', 'staff', 'classes', 'attendance', 'results', 'session', 'messaging', 'idcards', 'announcements', 'helpdesk', 'profile'],
      SCHOOL_ADMIN: ['dashboard', 'students', 'activities', 'staff', 'classes', 'attendance', 'results', 'session', 'messaging', 'idcards', 'announcements', 'helpdesk', 'profile'],
      TEACHER: ['dashboard', 'attendance', 'results', 'announcements', 'profile'],
      PARENT: ['dashboard', 'results', 'attendance', 'announcements', 'helpdesk', 'profile'],
      STUDENT: ['dashboard', 'results', 'attendance', 'announcements', 'helpdesk', 'profile']
    };

    const currentAllowed = allowedTabs[currentRole] || ['dashboard', 'announcements', 'helpdesk'];
    const resolvedTab = currentAllowed.includes(activeTab) ? activeTab : 'dashboard';

    switch (resolvedTab) {
      case 'dashboard':
        return (
          <DashboardStats
            currentRole={currentRole}
            students={students}
            teachers={teachers}
            fees={[]}
            attendance={attendance}
            notifications={notifications}
            results={results}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeTerm={activeTerm}
            activeSessionName={activeSessionName}
            userEmail={userEmail}
            userId={authUser?.user?.id}
            subjects={subjects}
          />
        );
      case 'students':
        return (
          <StudentManager
            students={students}
            onSetStudents={handleSetStudents}
            parents={parents}
            onSetParents={handleSetParents}
            activeSessionName={activeSessionName}
            classes={classesWithSubjects.map(c => c.classId)}
            classesWithSubjects={classesWithSubjects}
            subjects={subjects}
          />
        );
      case 'activities':
        return (
          <ActivityManager
            currentRole={currentRole}
            activities={activities}
            onSetActivities={handleSetActivities}
          />
        );
      case 'staff':
        return (
          <TeacherPortal
            currentRole={currentRole}
            activeTab="staff"
            teachers={teachers}
            onSetTeachers={handleSetTeachers}
            students={students}
            onSetStudents={handleSetStudents}
            results={results}
            onSetResults={handleSetResults}
            attendance={attendance}
            onSetAttendance={handleSetAttendance}
            subjects={subjects}
            activeSessionName={activeSessionName}
            activeTerm={activeTerm}
            classes={classesWithSubjects.map(c => c.classId)}
            classesWithSubjects={classesWithSubjects}
            assessmentItems={assessmentItems}
            staffAdmins={staffAdmins}
            onSetStaffAdmins={setStaffAdmins}
            parents={parents}
            onSetParents={handleSetParents}
            userEmail={userEmail}
          />
        );
      case 'attendance':
        if (currentRole === 'STUDENT' || currentRole === 'PARENT') {
          return (
            <ParentStudentAttendanceViewer
              students={students}
              attendance={attendance}
              activeSessionName={activeSessionName}
              activeTerm={activeTerm}
              currentRole={currentRole as 'PARENT' | 'STUDENT'}
              userEmail={userEmail}
            />
          );
        }
        return (
          <TeacherPortal
            currentRole={currentRole}
            activeTab="attendance"
            teachers={teachers}
            onSetTeachers={handleSetTeachers}
            students={students}
            onSetStudents={handleSetStudents}
            results={results}
            onSetResults={handleSetResults}
            attendance={attendance}
            onSetAttendance={handleSetAttendance}
            subjects={subjects}
            activeSessionName={activeSessionName}
            activeTerm={activeTerm}
            classes={classesWithSubjects.map(c => c.classId)}
            classesWithSubjects={classesWithSubjects}
            assessmentItems={assessmentItems}
            staffAdmins={staffAdmins}
            onSetStaffAdmins={setStaffAdmins}
            parents={parents}
            onSetParents={handleSetParents}
            userEmail={userEmail}
          />
        );
      case 'results':
        return (
          <ResultProcessor
            currentRole={currentRole}
            students={students}
            results={results}
            onSetResults={handleSetResults}
            subjects={subjects}
            activeSessionName={activeSessionName}
            activeTerm={activeTerm}
            classes={classesWithSubjects.map(c => c.classId)}
            classesWithSubjects={classesWithSubjects}
            teachers={teachers}
            onSetTeachers={handleSetTeachers}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            attendance={attendance}
            onSetAttendance={handleSetAttendance}
            userEmail={userEmail}
            earlyYearsResults={earlyYearsResults}
            onSetEarlyYearsResults={handleSetEarlyYearsResults}
            assessmentItems={assessmentItems}
            onSetAssessmentItems={handleSetAssessmentItems}
          />
        );
      case 'session':
        return (
          <AcademicTermManager
            sessions={sessions}
            onSetSessions={handleSetSessions}
            activeSessionName={activeSessionName}
            onSwitchSession={handleSwitchSession}
            activeTerm={activeTerm}
            onSwitchTerm={handleSwitchTerm}
            config={config}
            onUpdateConfig={handleUpdateConfig}
            students={students}
            onSetStudents={handleSetStudents}
          />
        );
      case 'messaging':
        return (
          <MessagingSystem
            currentRole={currentRole}
            notifications={notifications}
            onSetNotifications={handleSetNotifications}
            userEmail={userEmail}
          />
        );
      case 'announcements':
        return (
          <MessagingSystem
            currentRole={currentRole}
            notifications={notifications}
            onSetNotifications={handleSetNotifications}
            userEmail={userEmail}
          />
        );
      case 'idcards':
        return (
          <PrintableIdCard
            currentRole={currentRole}
            students={students}
            teachers={teachers}
            logoUrl={config?.logoUrl}
          />
        );
      case 'helpdesk':
        return (
          <SupportDesk
            currentRole={currentRole}
            tickets={tickets}
            onSetTickets={handleSetTickets}
            userEmail={userEmail}
            teachers={teachers}
          />
        );
      case 'classes':
        return (
          <ClassSubjectManager
            currentRole={currentRole}
            subjects={subjects}
            onSetSubjects={handleSetSubjects}
            classesWithSubjects={classesWithSubjects}
            onSetClassesWithSubjects={handleSetClassesWithSubjects}
            teachers={teachers}
            onSetTeachers={handleSetTeachers}
            students={students}
            onSetStudents={handleSetStudents}
            assessmentItems={assessmentItems}
            onSetAssessmentItems={handleSetAssessmentItems}
          />
        );
      case 'profile':
        return (
          <MyProfile
            authUser={authUser}
            teachers={teachers}
            parents={parents}
            students={students}
          />
        );
      default:
        return (
          <div className="text-center py-20 text-slate-400 italic">
            This module represents custom extensions and will be integrated into future calendar pipelines.
          </div>
        );
    }
  };

  if (!isLoggedIn) {
    return (
      <div className={darkTheme ? 'dark' : ''}>
        <LandingPage 
          onLogin={handleLogin}
          darkTheme={darkTheme}
          onToggleTheme={handleToggleTheme}
          activities={activities}
          logoUrl={config?.logoUrl}
          schoolName={config?.schoolName}
          schoolEmail={config?.schoolEmail}
          schoolPhone={config?.schoolPhone}
          schoolAddress={config?.schoolAddress}
          globalLoginError={globalLoginError}
        />
      </div>
    );
  }

  return (
    <div className={darkTheme ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
        
        {/* Core Sidebar column */}
        <Sidebar
          currentRole={currentRole}
          onChangeRole={handleRoleChange}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          userEmail={userEmail}
          onLogout={handleLogout}
          logoUrl={config?.logoUrl}
          schoolName={config?.schoolName}
        />

        {/* Core content column */}
        <div id="school-main-scroller" className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
          
          <Header
            currentRole={currentRole}
            activeSessionName={activeSessionName}
            activeTerm={activeTerm}
            onSetSidebarOpen={setSidebarOpen}
            darkTheme={darkTheme}
            onToggleTheme={handleToggleTheme}
            sessions={sessions}
            onSwitchSession={handleSwitchSession}
            onSwitchTerm={handleSwitchTerm}
            notifications={notifications}
            onMarkNotificationRead={handleMarkNotificationRead}
            userEmail={userEmail}
          />

          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
            
            {/* Display Term Boundaries banner inside each view */}
            <div className="bg-blue-50 border border-blue-200 dark:bg-blue-950/25 dark:border-blue-900/50 rounded-xl p-4 flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-300 shadow-xs">
              <span className="flex items-center gap-2">
                <span>🔔</span>
                <span>
                  {activeTerm} academic boundaries: Resumption date {config?.resumptionDate ? new Date(config.resumptionDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}. Closing date {config?.closingDate ? new Date(config.closingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'TBD'}.
                </span>
              </span>
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 rounded uppercase font-bold tracking-wider hidden sm:inline">
                Calendar Schedule
              </span>
            </div>

            {/* Rendered Component View */}
            {renderActiveComponent()}

          </main>
          
        </div>

      </div>
    </div>
  );
}
