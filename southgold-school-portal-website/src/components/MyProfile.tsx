import React from 'react';
import { User, Mail, Phone, Shield, Award, BookOpen, CheckCircle, Briefcase } from 'lucide-react';
import { AuthUser, Teacher, Parent, Student } from '../types';

interface MyProfileProps {
  authUser: { accessToken: string; user: AuthUser } | null;
  teachers: Teacher[];
  parents: Parent[];
  students: Student[];
}

export default function MyProfile({ authUser, teachers, parents, students }: MyProfileProps) {
  if (!authUser) return null;

  const { user } = authUser;
  const currentRole = user.role;

  // Find correct profile data based on role
  const teacherProfile = teachers.find(t => t.userId === user.id || t.email === user.email);
  const parentProfile = parents.find(p => p.userId === user.id || p.email === user.email);
  const studentProfile = students.find(s => s.userId === user.id || s.email === user.email);

  const getProfileInitials = () => {
    if (teacherProfile) return `${teacherProfile.firstName[0]}${teacherProfile.lastName[0]}`;
    if (parentProfile) return `${parentProfile.firstName[0]}${parentProfile.lastName[0]}`;
    if (studentProfile) return `${studentProfile.firstName[0]}${studentProfile.lastName[0]}`;
    return user.email[0].toUpperCase();
  };

  const getFullName = () => {
    if (teacherProfile) return `${teacherProfile.firstName} ${teacherProfile.lastName}`;
    if (parentProfile) return `${parentProfile.firstName} ${parentProfile.lastName}`;
    if (studentProfile) return `${studentProfile.firstName} ${studentProfile.lastName}`;
    return user.email.split('@')[0];
  };

  const getStatus = () => {
    if (teacherProfile) return teacherProfile.status;
    if (parentProfile) return parentProfile.status;
    if (studentProfile) return studentProfile.status;
    return 'Active';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center">
        
        {/* Avatar Circle */}
        <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-3xl font-extrabold font-mono tracking-wider shrink-0 shadow-xs">
          {teacherProfile?.photo || studentProfile?.photo ? (
            <img 
              src={teacherProfile?.photo || studentProfile?.photo} 
              alt="Profile" 
              className="w-full h-full rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            getProfileInitials()
          )}
        </div>

        {/* Primary Metadata */}
        <div className="text-center md:text-left space-y-2 flex-1">
          <div className="flex flex-col md:flex-row md:items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{getFullName()}</h2>
            <span className={`self-center md:self-auto px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase border inline-flex items-center gap-1 ${
              getStatus() === 'Active' 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40' 
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400'
            }`}>
              <CheckCircle size={10} />
              <span>{getStatus()} Status</span>
            </span>
          </div>

          <p className="text-xs text-slate-400 font-medium">SouthGold Montessori School Official Profile Ledger Link</p>
          
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs justify-center md:justify-start">
            <span className="flex items-center gap-1 text-slate-500">
              <Shield size={13} className="text-slate-400" />
              <span className="font-semibold text-slate-705 dark:text-slate-300">Role:</span> {currentRole.replace('_', ' ')}
            </span>
            {teacherProfile?.staffId && (
              <span className="flex items-center gap-1 text-slate-500 font-mono">
                <Briefcase size={13} className="text-slate-400" />
                <span className="font-semibold text-slate-705 dark:text-slate-300">Staff ID:</span> {teacherProfile.staffId}
              </span>
            )}
            {studentProfile?.admissionNo && (
              <span className="flex items-center gap-1 text-slate-500 font-mono">
                <Briefcase size={13} className="text-slate-400" />
                <span className="font-semibold text-slate-705 dark:text-slate-300">Admission No:</span> {studentProfile.admissionNo}
              </span>
            )}
          </div>
        </div>

      </div>

      {/* Grid panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Contact credentials */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-1 border-l-3 border-blue-600">
            Official Credentials
          </h4>
          <p className="text-[11px] text-slate-400">Verified institutional contacts registered with the administration portal.</p>
          
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 p-2.5 bg-slate-55 dark:bg-slate-850 rounded-lg border border-slate-100 dark:border-slate-800">
              <Mail size={16} className="text-slate-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-1">Email Address</span>
                <span className="text-xs text-slate-700 dark:text-slate-250 font-medium truncate block">{teacherProfile?.email || parentProfile?.email || studentProfile?.email || user.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2.5 bg-slate-55 dark:bg-slate-850 rounded-lg border border-slate-100 dark:border-slate-800">
              <Phone size={16} className="text-slate-400 shrink-0" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-1">Telephone Number</span>
                <span className="text-xs text-slate-700 dark:text-slate-250 font-medium font-mono">{teacherProfile?.phone || parentProfile?.phone || studentProfile?.parentPhone || 'No telephone loaded'}</span>
              </div>
            </div>

            {teacherProfile?.department && (
              <div className="flex items-center gap-3 p-2.5 bg-slate-55 dark:bg-slate-850 rounded-lg border border-slate-100 dark:border-slate-800">
                <Award size={16} className="text-slate-400 shrink-0" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none mb-1">Department / Division</span>
                  <span className="text-xs text-slate-700 dark:text-slate-250 font-medium">{teacherProfile.department}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Assigned Responsibilities / Children list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          
          {teacherProfile && (
            <>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-1 border-l-3 border-blue-600">
                Assigned Classes & Subjects
              </h4>
              <p className="text-[11px] text-slate-400">Classrooms and subject fields assigned to your instruction ledger.</p>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-2">
                {teacherProfile.classesAssigned && teacherProfile.classesAssigned.length > 0 ? (
                  teacherProfile.classesAssigned.map((assignment, index) => (
                    <div key={index} className="p-2.5 bg-slate-55 dark:bg-slate-850 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <BookOpen size={14} className="text-blue-500 shrink-0" />
                        <span className="font-bold text-slate-705 dark:text-slate-205">{assignment.classId} {assignment.arm}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 font-extrabold font-mono text-[10px] uppercase">{assignment.subjectId}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No assigned classes or subjects registered.</p>
                )}
              </div>
            </>
          )}

          {studentProfile && (
            <>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-1 border-l-3 border-blue-600">
                Classroom Placement
              </h4>
              <p className="text-[11px] text-slate-400">Your currently registered classroom and placement details.</p>

              <div className="space-y-2.5 pt-2">
                <div className="p-3 bg-slate-55 dark:bg-slate-850 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Assigned Class</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{studentProfile.classId} {studentProfile.arm}</span>
                </div>
                <div className="p-3 bg-slate-55 dark:bg-slate-850 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">Registered Parent</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100">{studentProfile.parentName}</span>
                </div>
              </div>
            </>
          )}

          {parentProfile && (
            <>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-1 border-l-3 border-blue-600">
                Registered Children
              </h4>
              <p className="text-[11px] text-slate-400">Verified wards linked to your parent dashboard account.</p>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 pt-2">
                {students.filter(s => s.parentId === parentProfile.id || s.parentEmail === parentProfile.email).length > 0 ? (
                  students.filter(s => s.parentId === parentProfile.id || s.parentEmail === parentProfile.email).map((child) => (
                    <div key={child.id} className="p-2.5 bg-slate-55 dark:bg-slate-850 rounded-lg border border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-blue-500 shrink-0" />
                        <span className="font-bold text-slate-705 dark:text-slate-205">{child.firstName} {child.lastName}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 font-extrabold font-mono text-[10px] uppercase">{child.classId} {child.arm}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">No registered children found linked to your email.</p>
                )}
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
}
