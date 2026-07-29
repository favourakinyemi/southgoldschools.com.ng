import React from 'react';
import { 
  Menu, 
  Sun, 
  Moon, 
  Calendar, 
  User, 
  Bell, 
  ShieldAlert,
  ChevronDown
} from 'lucide-react';
import { UserRole, SchoolTerm } from '../types';

interface HeaderProps {
  currentRole: UserRole;
  activeSessionName: string;
  activeTerm: SchoolTerm;
  onSetSidebarOpen: (open: boolean) => void;
  darkTheme: boolean;
  onToggleTheme: () => void;
  sessions: { id: string; name: string; isActive: boolean }[];
  onSwitchSession: (sessionId: string) => void;
  onSwitchTerm: (term: SchoolTerm) => void;
  notifications?: any[];
  onMarkNotificationRead?: (id: string) => void;
  userEmail?: string;
}

export default function Header({
  currentRole,
  activeSessionName,
  activeTerm,
  onSetSidebarOpen,
  darkTheme,
  onToggleTheme,
  sessions,
  onSwitchSession,
  onSwitchTerm,
  notifications = [],
  onMarkNotificationRead,
  userEmail
}: HeaderProps) {
  const [showNotifDropdown, setShowNotifDropdown] = React.useState(false);

  const userNotifications = React.useMemo(() => {
    return notifications.filter(n => {
      const roleMatch = n.recipientRole === 'ALL' || n.recipientRole === currentRole;
      const emailMatch = !n.recipientId || !userEmail || n.recipientId.toLowerCase() === userEmail.toLowerCase();
      return roleMatch && emailMatch;
    });
  }, [notifications, currentRole, userEmail]);

  const unreadCount = React.useMemo(() => {
    return userNotifications.filter(n => !n.isRead).length;
  }, [userNotifications]);
  
  const getRoleBadgeColor = () => {
    switch (currentRole) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
      case 'SCHOOL_ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'TEACHER':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'PARENT':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'STUDENT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getRoleDisplayName = () => {
    switch (currentRole) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'SCHOOL_ADMIN':
        return 'School Admin';
      case 'TEACHER':
        return 'Teacher Section';
      case 'PARENT':
        return 'Parent Section';
      case 'STUDENT':
        return 'Student View';
      default:
        return 'Guest';
    }
  };

  return (
    <header className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-30 transition-colors duration-200">
      
      {/* Left side: Hamburger (Mobile) + School title visual */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => onSetSidebarOpen(true)}
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 lg:hidden focus:outline-none"
        >
          <Menu size={20} />
        </button>

        <div className="hidden sm:flex items-center gap-2">
          <Calendar className="text-blue-600 dark:text-blue-400" size={16} />
          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Active: {activeSessionName}
            </span>
            <span className="hidden md:inline text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-300 px-2 py-0.5 rounded text-[11px] font-semibold border border-blue-100/50 dark:border-blue-900/30">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
              {activeTerm}
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Session Fast configuration + Theme Toggle + User Status */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* Fast Session & Term Quick Switch for Admins */}
        {(currentRole === 'SCHOOL_ADMIN' || currentRole === 'SUPER_ADMIN') && (
          <div className="hidden md:flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
            {/* Session dropdown */}
            <select
              value={sessions.find(s => s.name === activeSessionName)?.id || ''}
              onChange={(e) => onSwitchSession(e.target.value)}
              className="bg-transparent text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none border-0 cursor-pointer"
              title="Switch Active Session"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-slate-900">
                  Sess: {s.name}
                </option>
              ))}
            </select>
            <span className="text-slate-300 dark:text-slate-800">|</span>
            {/* Term dropdown */}
            <select
              value={activeTerm}
              onChange={(e) => onSwitchTerm(e.target.value as SchoolTerm)}
              className="bg-transparent text-[11px] font-medium text-slate-700 dark:text-slate-300 focus:outline-none border-0 cursor-pointer"
              title="Switch Active Term"
            >
              <option value="First Term" className="dark:bg-slate-900">1st Term</option>
              <option value="Second Term" className="dark:bg-slate-900">2nd Term</option>
              <option value="Third Term" className="dark:bg-slate-900">3rd Term</option>
            </select>
          </div>
        )}

        {/* Live Clock indicator removed */}

        {/* Dynamic Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-800 transition-colors relative cursor-pointer"
            aria-label="Notifications"
            title="Notifications Panel"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-[8px] font-black text-white rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden text-xs">
              <div className="p-3 border-b border-slate-150 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-850">
                <span className="font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">School Alerts</span>
                {unreadCount > 0 && (
                  <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full text-[9px] font-bold">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {userNotifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 italic">
                    No recent notifications
                  </div>
                ) : (
                  userNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 transition-colors flex gap-2.5 items-start ${
                        !n.isRead ? 'bg-blue-50/20 dark:bg-blue-950/10' : ''
                      }`}
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start gap-1">
                          <span className={`font-bold text-[11px] ${!n.isRead ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <button
                              onClick={() => {
                                onMarkNotificationRead?.(n.id);
                              }}
                              className="text-[9px] font-extrabold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                        <p className="text-slate-500 dark:text-slate-450 text-[10px] leading-normal">{n.content}</p>
                        <span className="text-[9px] text-slate-400 block mt-1">{n.date}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
          title="Toggle Color Theme"
        >
          {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Role Badge Indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold uppercase tracking-wider ${getRoleBadgeColor()}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          <span>{getRoleDisplayName()}</span>
        </div>

      </div>
    </header>
  );
}
