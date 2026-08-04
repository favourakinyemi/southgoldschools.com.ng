import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  MessageSquare, 
  Check, 
  Plus, 
  Mail, 
  Smartphone, 
  UserPlus, 
  Users,
  Megaphone,
  ChevronDown
} from 'lucide-react';
import { SchoolNotification, UserRole } from '../types';

interface MessagingSystemProps {
  currentRole: UserRole;
  notifications: SchoolNotification[];
  onSetNotifications: (notif: SchoolNotification[]) => void;
  userEmail: string;
}

export default function MessagingSystem({
  currentRole,
  notifications,
  onSetNotifications,
  userEmail
}: MessagingSystemProps) {
  
  const isAdminOrSuper = currentRole === 'SUPER_ADMIN' || currentRole === 'SCHOOL_ADMIN';

  // Broadcast creation states (Admin only)
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'ALL' | UserRole>('ALL');
  const [broadcastCategory, setBroadcastCategory] = useState<'Announcement' | 'Academic' | 'Billing' | 'System'>('Announcement');

  // Simulated parent teacher direct message threads
  const [chatThreads, setChatThreads] = useState<Array<{
    id: string;
    senderName: string;
    messages: Array<{ sender: string; text: string; date: string }>;
  }>>([]);

  const [activeThreadIdx, setActiveThreadIdx] = useState(0);
  const [messageInput, setMessageInput] = useState('');

  const [notifText, setNotifText] = useState<string | null>(null);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);

  // Email/SMS simulate switches
  const [simulateEmail, setSimulateEmail] = useState(true);
  const [simulateSMS, setSimulateSMS] = useState(false);

  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastContent) return;

    const newBroadcast: SchoolNotification = {
      id: `not_${Date.now()}`,
      title: broadcastTitle,
      content: broadcastContent,
      category: broadcastCategory,
      date: new Date().toISOString().split('T')[0],
      recipientRole: targetAudience
    };

    onSetNotifications([newBroadcast, ...notifications]);
    
    // Simulate SMS/Email API call
    let alertMsg = `Broadcast dispatched inside portal.`;
    if (simulateEmail && simulateSMS) {
      alertMsg += ` (Automatic Dispatch Alert: Dispatched Email notifications & Telco SMS payload.)`;
    } else if (simulateEmail) {
      alertMsg += ` (Automatic Dispatch Alert: Dispatched SMTP server emails.)`;
    } else if (simulateSMS) {
      alertMsg += ` (Automatic Dispatch Alert: Dispatched SMPP SMS payload.)`;
    }

    setBroadcastTitle('');
    setBroadcastContent('');
    showNotice(alertMsg);
  };

  const handleSendDirectMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput) return;

    const updatedThreads = [...chatThreads];
    updatedThreads[activeThreadIdx] = {
      ...updatedThreads[activeThreadIdx],
      messages: [
        ...updatedThreads[activeThreadIdx].messages,
        {
          sender: currentRole === 'TEACHER' ? 'Teacher' : 'You',
          text: messageInput,
          date: 'Just now'
        }
      ]
    };

    setChatThreads(updatedThreads);
    setMessageInput('');
    showNotice('Message transmitted.');
  };

  const showNotice = (msg: string) => {
    setNotifText(msg);
    setTimeout(() => setNotifText(null), 4000);
  };

  const currentThread = chatThreads[activeThreadIdx];

  return (
    <div className="space-y-6">

      {/* Alert tracking */}
      {notifText && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-2">
          <Check size={14} />
          <span>{notifText}</span>
        </div>
      )}

      {/* Split visual Grid */}
      <div className={!isAdminOrSuper ? "max-w-4xl mx-auto" : "grid grid-cols-1 lg:grid-cols-3 gap-6"}>

        {/* Column 1: School Notice Boards Announcements */}
        <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 ${!isAdminOrSuper ? 'col-span-full' : ''}`}>
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-1 border-l-3 border-blue-600 flex items-center gap-2">
            <Megaphone size={16} className="text-blue-600" />
            <span>Notices Board</span>
          </h4>
          <p className="text-[11px] text-slate-400">Broad academic and announcement notices registered inside this session.</p>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {notifications.map((not) => {
              const isExpanded = expandedNoticeId === not.id;
              return (
                <button
                  type="button"
                  key={not.id}
                  onClick={() => setExpandedNoticeId(isExpanded ? null : not.id)}
                  className="w-full text-left p-3 bg-slate-55 dark:bg-slate-850 rounded-lg border border-slate-150 dark:border-slate-800/60 shadow-3xs space-y-2 hover:border-blue-500/40 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className={`px-2 py-0.5 rounded font-extrabold font-mono text-[9px] uppercase ${
                      not.category === 'Academic' ? 'bg-indigo-100 text-indigo-800' :
                      not.category === 'Billing' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-405' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {not.category}
                    </span>
                    <span className="text-slate-400">{not.date}</span>
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-705 dark:text-slate-200 leading-snug">{not.title}</h5>
                      <p className={`text-[11px] text-slate-500 mt-1 ${isExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}`}>
                        {not.content}
                      </p>
                    </div>
                    <ChevronDown size={14} className={`shrink-0 mt-0.5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {isExpanded && (
                    <div className="flex items-center text-[9px] text-slate-400 font-semibold gap-1 border-t border-slate-201 pt-1.5 uppercase">
                      <span>Scope:</span>
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">{not.recipientRole} Audience</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {isAdminOrSuper && (
          /* Column 2: Administration Broadcast composition panel (Admin Only) */
          <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-4 flex flex-col justify-between">
            
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-1 border-l-3 border-blue-600">
                School-wide Broadcast Dispatch
              </h4>
              <p className="text-slate-400 text-[11px]">Compose broadcasts and trigger automated Email and SMS clearance prompts.</p>

              <form onSubmit={handleCreateBroadcast} className="space-y-4 pt-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Notice Headline Title *</label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    className="w-full bg-slate-55 dark:bg-slate-850 px-3 py-2 text-xs rounded border border-slate-201 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    placeholder="e.g. End of term inter-house athletics competition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Target Audience</label>
                    <select
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value as 'ALL' | UserRole)}
                      className="w-full bg-slate-55 dark:bg-slate-850 px-3 py-2 text-xs rounded border border-slate-201 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="ALL">ALL (Everyone)</option>
                      <option value="PARENT">Parents Only</option>
                      <option value="TEACHER">Staff / Teachers Only</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Notice Category</label>
                    <select
                      value={broadcastCategory}
                      onChange={(e) => setBroadcastCategory(e.target.value as any)}
                      className="w-full bg-slate-55 dark:bg-slate-850 px-3 py-2 text-xs rounded border border-slate-201 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                    >
                      <option value="Announcement">General Announcement</option>
                      <option value="Academic">Academic Schedule</option>
                      <option value="Billing">Billing / Fees Reminder</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Broadcasting Content *</label>
                  <textarea
                    required
                    rows={4}
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                    className="w-full bg-slate-55 dark:bg-slate-850 px-3 py-2 text-xs rounded border border-slate-201 dark:border-slate-800 text-slate-800 dark:text-slate-100 resize-none font-medium"
                    placeholder="Provide full details of school notifications..."
                  />
                </div>

                {/* Simulated Outward notification triggers */}
                <div className="bg-slate-55 dark:bg-slate-850 p-3.5 rounded-lg border border-slate-201 dark:border-slate-800 space-y-2">
                  <span className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-widest block font-display">Outward SMS & Email Payloads</span>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={() => setSimulateEmail(!simulateEmail)}
                      className={`text-[11px] font-semibold py-1 px-3 rounded flex items-center gap-1 border transition-all ${
                        simulateEmail 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20' 
                          : 'bg-white text-slate-400 border-slate-205 dark:bg-slate-900'
                      }`}
                    >
                      <Mail size={12} />
                      <span>Simulate Dispatch Emails</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSimulateSMS(!simulateSMS)}
                      className={`text-[11px] font-semibold py-1 px-3 rounded flex items-center gap-1 border transition-all ${
                        simulateSMS 
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/20' 
                          : 'bg-white text-slate-400 border-slate-205 dark:bg-slate-900'
                      }`}
                    >
                      <Smartphone size={12} />
                      <span>Simulate Dispatch SMS</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2 rounded-lg text-xs"
                  >
                    Transmit Broadcast Trigger
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
