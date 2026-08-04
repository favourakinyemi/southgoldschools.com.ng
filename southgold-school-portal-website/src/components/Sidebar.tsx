import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Award, 
  CalendarCheck, 
  DollarSign, 
  HelpCircle, 
  MessageSquare, 
  Bell, 
  Settings,
  Shield,
  Clock,
  LogOut,
  ChevronDown,
  BookOpen,
  IdCard,
  Menu,
  X,
  Sparkles,
  User
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  userEmail: string;
  onLogout?: () => void;
  logoUrl?: string;
  schoolName?: string;
}

export default function Sidebar({
  currentRole,
  onChangeRole,
  activeTab,
  setActiveTab,
  sidebarOpen,
  setSidebarOpen,
  userEmail,
  onLogout,
  logoUrl,
  schoolName
}: SidebarProps) {

  const rolesList: { value: UserRole; label: string; desc: string }[] = [
    { value: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Manage schools, systems' },
    { value: 'SCHOOL_ADMIN', label: 'School Admin', desc: 'Manage students, staff, terms' },
    { value: 'TEACHER', label: 'Teacher / Staff', desc: 'Mark scores, attendance' },
    { value: 'PARENT', label: 'Parent / Guardian', desc: 'View kids, track attendance, results' },
    { value: 'STUDENT', label: 'Student Portal', desc: 'View schedules, assignments' }
  ];

  // Navigation Items per Role
  const getNavItems = () => {
    const commonItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'announcements', label: 'Announcements', icon: Bell },
      { id: 'helpdesk', label: 'Help & Support', icon: HelpCircle },
    ];

    switch (currentRole) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'students', label: 'Student Directory', icon: Users },
          { id: 'staff', label: 'Staff Directory', icon: GraduationCap },
          { id: 'classes', label: 'Class & Subjects', icon: BookOpen },
          { id: 'activities', label: 'School Activities', icon: Sparkles },
          { id: 'results', label: 'Process Results', icon: Award },
          { id: 'attendance', label: 'Attendance logs', icon: CalendarCheck },
          { id: 'session', label: 'Academic Term Settings', icon: Settings },
          { id: 'messaging', label: 'Parent Messages', icon: MessageSquare },
          { id: 'idcards', label: 'Print ID Cards', icon: IdCard },
          { id: 'helpdesk', label: 'Support Tickets', icon: HelpCircle },
          { id: 'announcements', label: 'Announcements', icon: Bell },
        ];
      case 'TEACHER':
        return [
          { id: 'dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
          { id: 'attendance', label: 'Mark Attendance', icon: CalendarCheck },
          { id: 'results', label: 'Process Scores & Results', icon: Award },
          { id: 'announcements', label: 'Announcements & Notifications', icon: Bell },
          { id: 'profile', label: 'My Profile', icon: User },
        ];
      case 'PARENT':
        return [
          { id: 'dashboard', label: 'Parent Dashboard', icon: LayoutDashboard },
          { id: 'results', label: 'Children Report Cards', icon: Award },
          { id: 'attendance', label: 'Children Attendance', icon: CalendarCheck },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'helpdesk', label: 'Help Tickets', icon: HelpCircle },
        ];
      case 'STUDENT':
        return [
          { id: 'dashboard', label: 'Student Dashboard', icon: LayoutDashboard },
          { id: 'results', label: 'My Grades', icon: Award },
          { id: 'attendance', label: 'My Attendance', icon: CalendarCheck },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'helpdesk', label: 'Report an Issue', icon: HelpCircle },
        ];
      default:
        return commonItems;
    }
  };

  const navItems = getNavItems();

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    setSidebarOpen(false); // Close mobile drawer
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside className={`
        fixed inset-y-0 left-0 bg-slate-900 text-slate-100 w-64 z-50 transform lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between border-r border-slate-800
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:sticky lg:h-screen
      `}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="School Logo" 
                  className="w-10 h-10 object-contain rounded-lg shrink-0 bg-white p-0.5" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white text-xl uppercase shrink-0">
                  SG
                </div>
              )}
              <div>
                <h1 className="font-bold text-base text-white leading-none truncate max-w-[120px]" title={schoolName || 'SouthGold'}>
                  {schoolName ? schoolName.split(' ')[0] : 'SouthGold'}
                </h1>
                <p className="text-[10px] text-slate-400 mt-1">Schools Portal</p>
              </div>
            </div>
            <button 
              className="lg:hidden text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Active View Simulator has been removed */}
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase px-3 block mb-3">
            Navigation Menu
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium tracking-wide transition-all duration-150 group
                  ${isActive 
                    ? 'bg-slate-800 text-white font-semibold border-l-4 border-blue-600 shadow-sm' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/30 transition-colors'
                  }
                `}
              >
                <Icon 
                  size={16} 
                  className={`transition-colors duration-150 ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-white'}`} 
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Footer info & Logout simulation */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase border border-blue-500/30 shadow-xs">
              {userEmail.substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{userEmail}</p>
              <span className="text-[10px] text-blue-400 font-bold">Active Mode</span>
            </div>
          </div>
          <button
            onClick={() => {
              if (onLogout) {
                onLogout();
              } else {
                window.location.reload();
              }
            }}
            className="mt-2 w-full flex items-center justify-center gap-2 border border-slate-800 hover:border-red-800 hover:bg-red-950/20 text-slate-400 hover:text-red-400 px-3 py-1.5 rounded text-xs font-medium transition-all cursor-pointer"
          >
            <LogOut size={12} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
