import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Award, 
  CalendarCheck, 
  HelpCircle, 
  MessageSquare, 
  Bell, 
  Settings,
  LogOut,
  BookOpen,
  IdCard,
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

  const roleLabel: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Admin',
    SCHOOL_ADMIN: 'Staff Admin',
    TEACHER: 'Teacher',
    PARENT: 'Parent',
    STUDENT: 'Student'
  };

  type NavItem = { id: string; label: string; icon: React.ElementType };
  type NavGroup = { title: string; items: NavItem[] };

  // Navigation Items per Role
  const getNavGroups = (): NavGroup[] => {
    const commonGroups = [
      {
        title: 'Overview',
        items: [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'announcements', label: 'Announcements', icon: Bell },
          { id: 'helpdesk', label: 'Help & Support', icon: HelpCircle },
        ]
      }
    ];

    switch (currentRole) {
      case 'SUPER_ADMIN':
      case 'SCHOOL_ADMIN':
        return [
          {
            title: 'Overview',
            items: [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }]
          },
          {
            title: 'Academic Management',
            items: [
              { id: 'students', label: 'Student Directory', icon: Users },
              { id: 'staff', label: 'Staff Directory', icon: GraduationCap },
              { id: 'classes', label: 'Classes & Subjects', icon: BookOpen },
              { id: 'activities', label: 'School Activities', icon: Sparkles },
            ]
          },
          {
            title: 'Academic Operations',
            items: [
              { id: 'results', label: 'Process Results', icon: Award },
              { id: 'attendance', label: 'Attendance Logs', icon: CalendarCheck },
              { id: 'session', label: 'Academic Term Settings', icon: Settings },
            ]
          },
          {
            title: 'Communication',
            items: [
              { id: 'messaging', label: 'Parent Messages', icon: MessageSquare },
              { id: 'helpdesk', label: 'Support Tickets', icon: HelpCircle },
              { id: 'announcements', label: 'Announcements', icon: Bell },
            ]
          },
          {
            title: 'Tools',
            items: [{ id: 'idcards', label: 'Print ID Cards', icon: IdCard }]
          },
        ];
      case 'TEACHER':
        return [
          {
            title: 'Teaching',
            items: [
              { id: 'dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard },
              { id: 'attendance', label: 'Mark Attendance', icon: CalendarCheck },
              { id: 'results', label: 'Process Scores & Results', icon: Award },
            ]
          },
          {
            title: 'Account',
            items: [
              { id: 'announcements', label: 'Announcements', icon: Bell },
              { id: 'profile', label: 'My Profile', icon: User },
            ]
          }
        ];
      case 'PARENT':
        return [
          {
            title: 'Family',
            items: [
              { id: 'dashboard', label: 'Parent Dashboard', icon: LayoutDashboard },
              { id: 'results', label: 'Children Report Cards', icon: Award },
              { id: 'attendance', label: 'Children Attendance', icon: CalendarCheck },
            ]
          },
          {
            title: 'Communication',
            items: [
              { id: 'announcements', label: 'Announcements', icon: Bell },
              { id: 'helpdesk', label: 'Help Tickets', icon: HelpCircle },
            ]
          }
        ];
      case 'STUDENT':
        return [
          {
            title: 'Academics',
            items: [
              { id: 'dashboard', label: 'Student Dashboard', icon: LayoutDashboard },
              { id: 'results', label: 'My Grades', icon: Award },
              { id: 'attendance', label: 'My Attendance', icon: CalendarCheck },
            ]
          },
          {
            title: 'Support',
            items: [
              { id: 'announcements', label: 'Announcements', icon: Bell },
              { id: 'helpdesk', label: 'Report an Issue', icon: HelpCircle },
            ]
          }
        ];
      default:
        return commonGroups;
    }
  };

  const navGroups = getNavGroups();
  const userInitials = userEmail
    .split('@')[0]
    .split(/[._\-\s]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'SG';

  /*
    Kept for prop compatibility with the parent component. Role switching is no
    longer exposed in the production sidebar.
  */
  void onChangeRole;

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
        fixed inset-y-0 left-0 bg-portal-sidebar text-slate-100 w-72 z-50 transform lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col justify-between border-r border-white/10 shadow-2xl shadow-slate-950/20
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:sticky lg:h-screen
      `}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/10 flex flex-col gap-3 bg-portal-sidebar-soft/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="School Logo" 
                  className="w-11 h-11 object-contain rounded-md shrink-0 bg-white p-1 ring-1 ring-white/20" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-11 h-11 bg-white text-portal-heading rounded-md flex items-center justify-center font-extrabold text-sm uppercase shrink-0 ring-1 ring-white/20">
                  SG
                </div>
              )}
              <div>
                <h1 className="font-extrabold text-base text-white leading-tight truncate max-w-[160px]" title={schoolName || 'SouthGold'}>
                  {schoolName ? schoolName.split(' ')[0] : 'SouthGold'}
                </h1>
                <p className="text-xs text-[#d9b65f] font-semibold leading-tight">Schools Portal</p>
              </div>
            </div>
            <button 
              className="lg:hidden text-slate-300 hover:text-white p-2 rounded-md hover:bg-white/10"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          </div>

          {/* Active View Simulator has been removed */}
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1.5">
              <span className="text-[10px] text-slate-400/80 font-bold tracking-[0.18em] uppercase px-3 block">
                {group.title}
              </span>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`
                      relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-semibold transition-colors duration-150 group
                      ${isActive 
                        ? 'bg-white/10 text-white ring-1 ring-white/10' 
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }
                    `}
                  >
                    {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-portal-gold" />}
                    <Icon 
                      size={17} 
                      strokeWidth={2}
                      className={`shrink-0 transition-colors duration-150 ${isActive ? 'text-portal-gold' : 'text-slate-400 group-hover:text-white'}`} 
                    />
                    <span className="text-left leading-snug">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer info & Logout simulation */}
        <div className="p-4 border-t border-white/10 bg-slate-950/35 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-portal-gold text-portal-heading flex items-center justify-center font-extrabold text-xs uppercase ring-2 ring-white/10">
              {userInitials}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">{userEmail}</p>
              <span className="text-[10px] text-slate-400 font-bold">{roleLabel[currentRole]}</span>
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
            className="w-full flex items-center justify-center gap-2 border border-white/10 hover:border-red-500/40 hover:bg-red-950/25 text-slate-300 hover:text-red-200 px-3 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut size={12} />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
