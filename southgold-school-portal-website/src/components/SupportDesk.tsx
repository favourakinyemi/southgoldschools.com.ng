import React, { useState, useMemo } from 'react';
import { 
  HelpCircle, 
  Plus, 
  Check, 
  MessageSquare, 
  AlertCircle, 
  ChevronDown, 
  Send, 
  Search,
  User,
  Inbox,
  Mail
} from 'lucide-react';
import { SupportTicket, UserRole, Teacher } from '../types';

const FAQ_DATA = [
  { q: 'How do I generate result transcripts?', a: 'Parents can view and click the "Print/Download PDF Report" on their child\'s academic results screen.' },
  { q: 'What is the maximum marks for Tests and Exams?', a: 'Continuous Assessment Tests are 15 marks, Assignments/Homework are 15 marks, Projects/Midterm are 10 marks, and Terminal Examinations are 60 marks, yielding a total score out of 100.' },
  { q: 'How can a teacher request result approvals?', a: 'Upon uploading scores, they are automatically sent to the Admin queue for review and publishing approval.' },
  { q: 'How are admission numbers generated?', a: 'Admission numbers are automatically generated when a student profile is created using the format ADM/[CurrentSessionYear]/[IncrementalID].' }
];

interface SupportDeskProps {
  currentRole: UserRole;
  tickets: SupportTicket[];
  onSetTickets: (tickets: SupportTicket[]) => void;
  userEmail: string;
  teachers?: Teacher[];
}

export default function SupportDesk({
  currentRole,
  tickets,
  onSetTickets,
  userEmail,
  teachers = []
}: SupportDeskProps) {
  const isAdminOrSuper = currentRole === 'SUPER_ADMIN' || currentRole === 'SCHOOL_ADMIN';
  const isParent = currentRole === 'PARENT';
  const isTeacher = currentRole === 'TEACHER';

  // Support desk tab: 'message_teacher' or 'tickets'
  const [activeTab, setActiveTab] = useState<'message_teacher' | 'tickets'>(() => {
    return (isParent || isTeacher) ? 'message_teacher' : 'tickets';
  });

  // Toggle state
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [faqSearch, setFaqSearch] = useState('');

  // General Ticket submissions states
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');

  // Active support ticket selector for conversations
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(() => {
    const defaultTickets = tickets.filter(t => !t.subject.startsWith('[Teacher:'));
    return defaultTickets[0]?.id || null;
  });
  const [adminReply, setAdminReply] = useState('');

  const [notif, setNotif] = useState<string | null>(null);

  // Parent-Teacher messaging states
  const [targetTeacherEmail, setTargetTeacherEmail] = useState(() => teachers[0]?.email || '');
  const [parentMessageSubject, setParentMessageSubject] = useState('');
  const [parentMessageContent, setParentMessageContent] = useState('');
  const [selectedPTTicketId, setSelectedPTTicketId] = useState<string | null>(null);
  const [ptReplyContent, setPtReplyContent] = useState('');

  const filteredFaqs = FAQ_DATA.filter(f => 
    f.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
    f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const showNotice = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3000);
  };

  // --------------------------------------------------------------------------
  // Parent-Teacher Messaging Logic
  // --------------------------------------------------------------------------
  
  // Create Parent -> Teacher message ticket
  const handleSendParentMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentMessageSubject || !parentMessageContent || !targetTeacherEmail) return;

    const selectedTeacher = teachers.find(t => t.email === targetTeacherEmail);
    const teacherName = selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : 'Class Teacher';

    const newTicket: SupportTicket = {
      id: `tkt_${Date.now()}`,
      senderName: `Parent (${userEmail})`,
      senderEmail: userEmail,
      senderRole: 'PARENT',
      // We pack target teacher's email/name inside the subject prefix so they can query it securely
      subject: `[Teacher: ${targetTeacherEmail}] [TeacherName: ${teacherName}] ${parentMessageSubject}`,
      message: parentMessageContent,
      status: 'Open',
      createdAt: new Date().toISOString(),
      replies: []
    };

    onSetTickets([newTicket, ...tickets]);
    setParentMessageSubject('');
    setParentMessageContent('');
    setSelectedPTTicketId(newTicket.id);
    showNotice(`Message successfully sent to ${teacherName}.`);
  };

  // Reply to Parent-Teacher conversation thread
  const handlePostPTReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ptReplyContent || !selectedPTTicketId) return;

    const senderDisplayName = isTeacher 
      ? `Teacher (${userEmail})` 
      : `Parent (${userEmail})`;

    const updated = tickets.map(t => {
      if (t.id === selectedPTTicketId) {
        return {
          ...t,
          status: 'In Progress' as const,
          replies: [
            ...t.replies,
            {
              senderName: senderDisplayName,
              message: ptReplyContent,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
      return t;
    });

    onSetTickets(updated);
    setPtReplyContent('');
    showNotice('Message reply sent.');
  };

  // Filter messages for parent: they only see parent-teacher tickets they sent
  const parentsPTTickets = useMemo(() => {
    return tickets.filter(t => 
      t.senderEmail === userEmail && 
      t.subject.startsWith('[Teacher:')
    );
  }, [tickets, userEmail]);

  // Filter messages for teacher: they see parent-teacher tickets addressed to them
  const teachersPTTickets = useMemo(() => {
    return tickets.filter(t => 
      t.subject.startsWith(`[Teacher: ${userEmail}]`)
    );
  }, [tickets, userEmail]);

  // Currently reviewed PT ticket
  const activePTTicket = useMemo(() => {
    const tId = selectedPTTicketId || (isTeacher ? teachersPTTickets[0]?.id : parentsPTTickets[0]?.id);
    return tickets.find(t => t.id === tId);
  }, [tickets, selectedPTTicketId, isTeacher, teachersPTTickets, parentsPTTickets]);

  // Clean subject display for parent teacher messages (removes the prefix tag)
  const getCleanSubject = (subjectStr: string) => {
    return subjectStr.replace(/^\[Teacher:.*?\]\s*(\[TeacherName:.*?\])?\s*/, '');
  };

  const getTeacherNameFromSubject = (subjectStr: string) => {
    const match = subjectStr.match(/\[TeacherName:\s*(.*?)\s*\]/);
    return match ? match[1] : 'Class Teacher';
  };

  // --------------------------------------------------------------------------
  // General Support Ticket Logic
  // --------------------------------------------------------------------------
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;

    const newTicket: SupportTicket = {
      id: `tkt_${Date.now()}`,
      senderName: currentRole === 'PARENT' ? `Guardian (${userEmail})` : `User (${userEmail})`,
      senderEmail: userEmail,
      senderRole: currentRole,
      subject: ticketSubject,
      message: ticketMessage,
      status: 'Open',
      createdAt: new Date().toISOString(),
      replies: []
    };

    onSetTickets([newTicket, ...tickets]);
    setTicketSubject('');
    setTicketMessage('');
    setSelectedTicketId(newTicket.id);
    showNotice('Your help desk ticket has been logged. Admin will review shortly.');
  };

  const handlePostReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminReply || !selectedTicketId) return;

    const updated = tickets.map(t => {
      if (t.id === selectedTicketId) {
        return {
          ...t,
          status: 'In Progress' as const,
          replies: [
            ...t.replies,
            {
              senderName: isAdminOrSuper ? 'SouthGold School Admin' : 'Support Desk',
              message: adminReply,
              createdAt: new Date().toISOString()
            }
          ]
        };
      }
      return t;
    });

    onSetTickets(updated);
    setAdminReply('');
    showNotice('Reply updated inside ticket dossier.');
  };

  const handleResolveTicket = (id: string) => {
    const updated = tickets.map(t => {
      if (t.id === id) {
        return { ...t, status: 'Resolved' as const };
      }
      return t;
    });
    onSetTickets(updated);
    showNotice('Help Desk ticket status marked as RESOLVED.');
  };

  const activeReviewTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="space-y-6">
      {/* Alert bar */}
      {notif && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-250 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-2">
          <Check size={14} />
          <span>{notif}</span>
        </div>
      )}

      {/* Role specific tab bars */}
      {(isParent || isTeacher) && (
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
          <button
            onClick={() => setActiveTab('message_teacher')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-colors ${
              activeTab === 'message_teacher'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-705'
            }`}
          >
            {isParent ? 'Message Class Teacher' : 'Parent Mailbox'}
          </button>
          <button
            onClick={() => setActiveTab('tickets')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-colors ${
              activeTab === 'tickets'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-705'
            }`}
          >
            Help & Support Tickets
          </button>
        </div>
      )}

      {activeTab === 'message_teacher' ? (
        // --------------------------------------------------------------------
        // PARENT-TEACHER MESSAGING TAB INTERFACE
        // --------------------------------------------------------------------
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: parent compose form / list of messages */}
          <div className="space-y-6 lg:col-span-1">
            {isParent && (
              <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-805 dark:text-slate-100 uppercase tracking-wider border-b pb-2">
                  Send Message to Teacher
                </h4>
                <form onSubmit={handleSendParentMessage} className="space-y-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Select Target Instructor</label>
                    <select
                      value={targetTeacherEmail}
                      onChange={(e) => setTargetTeacherEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-850 text-xs py-2 px-3 rounded text-slate-800 dark:text-slate-200 font-semibold cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      {teachers.map(t => (
                        <option key={t.id} value={t.email}>
                          {t.firstName} {t.lastName} ({t.staffId})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={parentMessageSubject}
                      onChange={(e) => setParentMessageSubject(e.target.value)}
                      placeholder="e.g. Inquiries on Class homework assignments"
                      className="w-full bg-slate-50 dark:bg-slate-850 text-xs py-2 px-3 rounded text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Message Content</label>
                    <textarea
                      required
                      rows={4}
                      value={parentMessageContent}
                      onChange={(e) => setParentMessageContent(e.target.value)}
                      placeholder="Type details regarding what you wish to coordinate with the instructor..."
                      className="w-full bg-slate-50 dark:bg-slate-850 text-xs py-2 px-3 rounded text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 rounded text-xs transition-colors cursor-pointer"
                  >
                    Send Private Message
                  </button>
                </form>
              </div>
            )}

            {/* List of active PT message chains */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
                <span>Active Correspondence Threads</span>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 py-0.5 px-2 rounded-full">
                  {(isParent ? parentsPTTickets : teachersPTTickets).length}
                </span>
              </h4>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {(isParent ? parentsPTTickets : teachersPTTickets).length === 0 ? (
                  <div className="text-center text-slate-400 text-xs py-6 italic">
                    No active chat threads found.
                  </div>
                ) : (
                  (isParent ? parentsPTTickets : teachersPTTickets).map(t => {
                    const isSelected = t.id === (activePTTicket?.id || selectedPTTicketId);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedPTTicketId(t.id)}
                        className={`w-full p-3 rounded-lg text-left text-xs border transition-colors block ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400'
                            : 'bg-slate-55 border-transparent hover:bg-slate-100 dark:bg-slate-850 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1 font-bold">
                          <span className="truncate max-w-[150px]">
                            {isParent 
                              ? `To: ${getTeacherNameFromSubject(t.subject)}` 
                              : `From: ${t.senderName}`}
                          </span>
                          <span className="text-[9px] bg-white dark:bg-slate-900 border px-1.5 py-0.5 rounded-full">
                            {t.replies.length} replies
                          </span>
                        </div>
                        <p className="font-extrabold truncate text-slate-800 dark:text-slate-200 mb-0.5">
                          {getCleanSubject(t.subject)}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate leading-relaxed">
                          {t.message}
                        </p>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right panel: Active chat conversation */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-4 flex flex-col justify-between min-h-[450px]">
            {activePTTicket ? (
              <div className="flex flex-col h-full justify-between flex-1">
                <div className="space-y-4 flex-1">
                  {/* Top Bar info */}
                  <div className="flex justify-between items-center border-b pb-3 border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-xs font-black text-slate-805 dark:text-slate-100 uppercase tracking-wider">
                        {getCleanSubject(activePTTicket.subject)}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isParent 
                          ? `Teacher Correspondence with: ${getTeacherNameFromSubject(activePTTicket.subject)}` 
                          : `Incoming Message from Parent: ${activePTTicket.senderName}`}
                      </p>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">{activePTTicket.createdAt.substring(0,10)}</span>
                  </div>

                  {/* Thread messages logs */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 py-1">
                    {/* Primary sender message block */}
                    <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-150 dark:border-slate-800 max-w-[85%]">
                      <span className="text-[9px] font-black text-indigo-605 block mb-1">
                        {activePTTicket.senderName} (Author)
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                        {activePTTicket.message}
                      </p>
                    </div>

                    {/* Replies list */}
                    {activePTTicket.replies.map((reply, idx) => {
                      const isMe = reply.senderName.includes(userEmail);
                      return (
                        <div 
                          key={idx} 
                          className={`p-3 rounded-lg max-w-[85%] border ${
                            isMe 
                              ? 'bg-blue-50/50 dark:bg-blue-950/15 border-blue-100 dark:border-blue-900/30 self-end ml-auto' 
                              : 'bg-indigo-50/40 dark:bg-indigo-950/15 border-indigo-100 dark:border-indigo-900/30 mr-auto'
                          }`}
                        >
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold mb-1">
                            <span>{reply.senderName}</span>
                            <span className="font-mono">{reply.createdAt.substring(11, 16)}</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {reply.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reply composer at the bottom */}
                <form onSubmit={handlePostPTReply} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <textarea
                    required
                    rows={2}
                    value={ptReplyContent}
                    onChange={(e) => setPtReplyContent(e.target.value)}
                    placeholder="Type message reply to coordinate details..."
                    className="w-full bg-slate-50 dark:bg-slate-850 text-xs py-2 px-3 rounded text-slate-800 dark:text-slate-200 border"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-4 rounded text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send size={12} />
                      <span>Send Reply</span>
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-20 text-slate-400 italic space-y-2">
                <Mail size={32} className="text-slate-300" />
                <p className="text-xs">Select a message thread from the sidebar to view the correspondence dockets.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // --------------------------------------------------------------------
        // ORIGINAL HELP DESK & SUPPORT TICKETS TAB
        // --------------------------------------------------------------------
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Side Column: Interactive FAQ Panel & Ticket logger */}
          <div className="space-y-6">
            
            {/* FAQ Accordion list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-1 border-l-3 border-blue-600">
                Frequently Asked FAQs
              </h4>

              <div className="relative">
                <Search size={14} className="absolute left-3 inset-y-0 text-slate-400 top-3.5" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search FAQ archives..."
                  className="w-full bg-slate-50 dark:bg-slate-850 rounded text-xs pl-8 pr-3 py-2 border-0 text-slate-700 focus:outline-none"
                />
              </div>

              <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-850">
                {filteredFaqs.map((faq, idx) => {
                  const isOpen = activeFaq === idx;
                  return (
                    <div key={idx} className="pt-2">
                      <button
                        onClick={() => setActiveFaq(isOpen ? null : idx)}
                        className="w-full flex justify-between items-center text-left text-xs font-bold text-slate-700 dark:text-slate-300 py-1.5"
                      >
                        <span>{faq.q}</span>
                        <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isOpen && (
                        <div className="p-2.5 pt-0 text-[11px] text-slate-500 italic border-t border-dashed border-slate-105">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* New Help Ticket Form */}
            {!isAdminOrSuper && (
              <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-1 border-l-3 border-blue-600">
                  Submit Support Ticket
                </h4>
                <p className="text-slate-400 text-[10px]">Describe your login, grade book, or billing issue.</p>

                <form onSubmit={handleCreateTicket} className="space-y-3 pt-2">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Subject Subject *</label>
                    <input
                      type="text"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-855 text-xs py-2 px-3 rounded text-slate-800 dark:text-slate-200 border"
                      placeholder="e.g. Card payment failure"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Detailed Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-855 text-xs py-2 px-3 rounded text-slate-800 dark:text-slate-200 border"
                      placeholder="Provide as much context as possible..."
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded text-xs transition-colors cursor-pointer"
                  >
                    Log Support Dossier
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Side Column (2 cols width): Administration Active Tickets reviewing */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-4 flex flex-col justify-between">
            
            <div className="space-y-4 flex-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest pl-1 border-l-3 border-blue-600">
                In-Session Support Tickets Bureau ({tickets.filter(t => !t.subject.startsWith('[Teacher:')).length} Registered)
              </h4>

              {/* List selector */}
              <div className="flex gap-2.5 overflow-x-auto pb-2 border-b border-slate-100 dark:border-slate-850">
                {tickets.filter(t => !t.subject.startsWith('[Teacher:')).map(t => {
                  const isSelected = t.id === selectedTicketId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`py-2 px-3.5 rounded-lg border text-left text-xs shrink-0 transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40 font-bold' 
                          : 'bg-slate-50 border-transparent dark:bg-slate-850 hover:bg-slate-100 hover:text-slate-800 text-slate-700 dark:text-slate-350'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{t.senderName}</span>
                        <span className={`text-[9px] font-extrabold px-1.8 rounded font-mono ${
                          t.status === 'Open' ? 'bg-red-100 text-red-800' :
                          t.status === 'In Progress' ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {t.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-455 mt-0.5 truncate max-w-[150px]">{t.subject}</p>
                    </button>
                  );
                })}
              </div>

              {/* Selected active Ticket review detail board */}
              {activeReviewTicket ? (
                <div className="space-y-4 pt-2">
                  <div className="bg-slate-55 dark:bg-slate-850 p-4 rounded-xl border border-dashed border-slate-202 dark:border-slate-800">
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400">Lodged By:</span>
                        <p className="font-bold text-slate-750 dark:text-slate-100">{activeReviewTicket.senderName} ({activeReviewTicket.senderRole})</p>
                        <p className="text-[10px] text-slate-400">{activeReviewTicket.senderEmail}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Date Lodged</span>
                        <span className="text-[11px] font-mono text-slate-700 dark:text-slate-355">{activeReviewTicket.createdAt.substring(0, 10)}</span>
                      </div>
                    </div>

                    <div className="pt-3">
                      <span className="text-[9px] uppercase font-bold text-slate-400">Subject Inquiry:</span>
                      <h5 className="font-bold text-slate-800 dark:text-slate-100 text-xs mt-0.5">{activeReviewTicket.subject}</h5>
                      <p className="text-slate-655 dark:text-slate-300 text-xs mt-2 leading-relaxed bg-white dark:bg-slate-900 border p-3 rounded-lg font-medium">
                        {activeReviewTicket.message}
                      </p>
                    </div>
                  </div>

                  {/* Conversation threads replies list */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Official replies archive ({activeReviewTicket.replies.length}):</span>
                    {activeReviewTicket.replies.map((reply, index) => (
                      <div key={index} className="bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-lg">
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                          <span>{reply.senderName}</span>
                          <span className="font-mono">{reply.createdAt.substring(0, 10)}</span>
                        </div>
                        <p className="text-xs mt-1 text-slate-700 dark:text-slate-300">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 italic">
                  No tickets selected for administrative review.
                </div>
              )}
            </div>

            {/* Action replying Form (Admin view only toggle) */}
            {activeReviewTicket && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                {isAdminOrSuper ? (
                  <form onSubmit={handlePostReply} className="space-y-2.5">
                    <div className="relative">
                      <textarea
                        required
                        rows={2}
                        value={adminReply}
                        onChange={(e) => setAdminReply(e.target.value)}
                        className="w-full bg-slate-55 dark:bg-slate-850 p-2.5 text-xs rounded-lg text-slate-805 dark:text-slate-205 border"
                        placeholder="Type official communication reply details..."
                      />
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <p className="text-[10px] text-slate-400">Post reply automatically shifts status to *In Progress*.</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolveTicket(activeReviewTicket.id)}
                          className="border border-emerald-500 hover:bg-emerald-500/5 text-emerald-600 px-4 py-1.5 rounded font-semibold text-[11px]"
                        >
                          Mark Active as RESOLVED
                        </button>
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1.5 rounded text-[11px] flex items-center gap-1.5"
                        >
                          <Send size={11} />
                          <span>Send Official Dossier</span>
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="bg-slate-55 dark:bg-slate-850 p-2 text-center rounded text-[11px] text-slate-400 font-medium">
                    ✏ You are currently viewing help desk files inside Pupil/Parent mode.
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
