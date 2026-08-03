import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Check, 
  Plus, 
  Archive, 
  RefreshCw, 
  Calendar,
  Pencil,
  Power,
  CalendarCheck,
  Upload,
  Image,
  Building,
  Mail,
  Phone,
  MapPin,
  Trash2,
  Globe
} from 'lucide-react';
import { AcademicSession, SchoolTerm, Student } from '../types';

interface AcademicTermManagerProps {
  sessions: AcademicSession[];
  onSetSessions: (sess: AcademicSession[]) => void;
  activeSessionName: string;
  onSwitchSession: (sessionId: string) => void;
  activeTerm: SchoolTerm | null;
  onSwitchTerm: (term: SchoolTerm | null) => void;
  config: {
    resumptionDate: string;
    closingDate: string;
    logoUrl?: string;
    schoolName?: string;
    schoolAddress?: string;
    schoolEmail?: string;
    schoolPhone?: string;
  };
  onUpdateConfig: (updatedConfig: any) => void;
  students?: Student[];
  onSetStudents?: (students: Student[]) => void;
}

export default function AcademicTermManager({
  sessions,
  onSetSessions,
  activeSessionName,
  onSwitchSession,
  activeTerm,
  onSwitchTerm,
  config,
  onUpdateConfig,
  students = [],
  onSetStudents
}: AcademicTermManagerProps) {

  // Create session states
  const [newSessionName, setNewSessionName] = useState('');
  const [newStartDate, setNewStartDate] = useState('2026-09-07');
  const [newEndDate, setNewEndDate] = useState('2027-07-20');

  // Edit session states
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');

  const [resDate, setResDate] = useState(config?.resumptionDate ?? '');
  const [clsDate, setClsDate] = useState(config?.closingDate ?? '');

  // School profile states
  const [schName, setSchName] = useState(config?.schoolName ?? 'SOUTHGOLD MONTESSORI SCHOOL');
  const [schAddress, setSchAddress] = useState(config?.schoolAddress ?? '3, Fagbeyi Ige, Olusi crescent, Hopeville Estate, Haruna B/Stop. Sangotedo, Lagos, Nigeria');
  const [schEmail, setSchEmail] = useState(config?.schoolEmail ?? 'southgoldmontessorischools@gmail.com');
  const [schPhone, setSchPhone] = useState(config?.schoolPhone ?? '+234 803 123 4567');
  const [logoPreview, setLogoPreview] = useState(config?.logoUrl ?? '');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [notif, setNotif] = useState<string | null>(null);

  // Landing Page CMS States & Handlers
  const [cms, setCms] = useState<any>({
    motto: '',
    whatsapp: '',
    facebook: '',
    instagram: '',
    youtube: '',
    website: '',
    welcomeTitle: '',
    welcomeDesc: '',
    aboutTitle: '',
    aboutDesc: '',
    mission: '',
    vision: '',
    principalMessage: '',
    principalName: '',
    principalPhoto: '',
    heroImages: [],
    gallery: [],
    admissionsTitle: '',
    admissionsDesc: '',
    news: [],
    announcements: []
  });
  const [loadingCms, setLoadingCms] = useState(true);
  const [uploadingCmsImage, setUploadingCmsImage] = useState(false);

  // States for adding news/announcements
  const [newNewsTitle, setNewNewsTitle] = useState('');
  const [newNewsContent, setNewNewsContent] = useState('');
  const [newNewsDate, setNewNewsDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNewsImage, setNewNewsImage] = useState('');

  const [newAnnounceTitle, setNewAnnounceTitle] = useState('');
  const [newAnnounceContent, setNewAnnounceContent] = useState('');
  const [newAnnounceDate, setNewAnnounceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAnnounceImage, setNewAnnounceImage] = useState('');

  useEffect(() => {
    fetch('/api/cms')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setCms(data);
        }
        setLoadingCms(false);
      })
      .catch(err => {
        console.error('Error fetching CMS:', err);
        setLoadingCms(false);
      });
  }, []);

  const handleSaveCms = async () => {
    if (uploadingCmsImage) {
      alert('An image is still uploading -- please wait for it to finish before saving.');
      return;
    }
    try {
      const res = await fetch('/api/cms', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cms)
      });
      const data = await res.json();
      if (data.success) {
        showNotice('Landing page CMS configurations applied successfully.');
      } else {
        alert('Failed to save CMS: ' + data.error);
      }
    } catch (err: any) {
      alert('Failed to save CMS: ' + err.message);
    }
  };

  const handleCmsImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: 'principalPhoto' | 'heroImages' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCmsImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/school/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            fileName: file.name,
            folderName: 'cms'
          })
        });
        const data = await res.json();
        if (data.success && data.publicUrl) {
          if (targetField === 'principalPhoto') {
            setCms((prev: any) => ({ ...prev, principalPhoto: data.publicUrl }));
          } else if (targetField === 'heroImages') {
            setCms((prev: any) => ({ ...prev, heroImages: [...(prev.heroImages || []), data.publicUrl] }));
          } else if (targetField === 'gallery') {
            setCms((prev: any) => ({ ...prev, gallery: [...(prev.gallery || []), data.publicUrl] }));
          }
          showNotice('CMS image uploaded successfully. Click "Save All CMS Configurations" to publish it.');
        } else {
          alert('Upload failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err: any) {
        alert('Upload failed: ' + err.message);
      } finally {
        setUploadingCmsImage(false);
      }
    };
    reader.onerror = () => setUploadingCmsImage(false);
    reader.readAsDataURL(file);
  };

  const handleDraftImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCmsImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch('/api/school/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64,
            fileName: file.name,
            folderName: 'cms'
          })
        });
        const data = await res.json();
        if (data.success && data.publicUrl) {
          setter(data.publicUrl);
        } else {
          alert('Upload failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err: any) {
        alert('Upload failed: ' + err.message);
      } finally {
        setUploadingCmsImage(false);
      }
    };
    reader.onerror = () => setUploadingCmsImage(false);
    reader.readAsDataURL(file);
  };

  const handleAddNews = () => {
    if (uploadingCmsImage) {
      alert('The image is still uploading -- please wait for it to finish first.');
      return;
    }
    if (!newNewsTitle || !newNewsContent) {
      alert('Please fill in both title and content for the news article.');
      return;
    }
    const newItem = {
      id: `news_${Date.now()}`,
      title: newNewsTitle,
      content: newNewsContent,
      date: newNewsDate,
      image: newNewsImage || undefined
    };
    setCms((prev: any) => ({
      ...prev,
      news: [...(prev.news || []), newItem]
    }));
    setNewNewsTitle('');
    setNewNewsContent('');
    setNewNewsImage('');
    showNotice('News item added (click Save at the bottom to apply).');
  };

  const handleRemoveNews = (id: string) => {
    setCms((prev: any) => ({
      ...prev,
      news: (prev.news || []).filter((n: any) => n.id !== id)
    }));
    showNotice('News item removed (click Save at the bottom to apply).');
  };

  const handleAddAnnouncement = () => {
    if (uploadingCmsImage) {
      alert('The image is still uploading -- please wait for it to finish first.');
      return;
    }
    if (!newAnnounceTitle || !newAnnounceContent) {
      alert('Please fill in both title and content for the announcement.');
      return;
    }
    const newItem = {
      id: `ann_${Date.now()}`,
      title: newAnnounceTitle,
      content: newAnnounceContent,
      date: newAnnounceDate,
      image: newAnnounceImage || undefined
    };
    setCms((prev: any) => ({
      ...prev,
      announcements: [...(prev.announcements || []), newItem]
    }));
    setNewAnnounceTitle('');
    setNewAnnounceContent('');
    setNewAnnounceImage('');
    showNotice('Announcement item added (click Save at the bottom to apply).');
  };

  const handleRemoveAnnouncement = (id: string) => {
    setCms((prev: any) => ({
      ...prev,
      announcements: (prev.announcements || []).filter((a: any) => a.id !== id)
    }));
    showNotice('Announcement item removed (click Save at the bottom to apply).');
  };

  // Batch promotions state
  const uniqueClassesList = Array.from(new Set(students.map(s => s.classId))).filter(Boolean);
  const [promoSourceClass, setPromoSourceClass] = useState(() => uniqueClassesList[0] || '');
  const [promoTargetClass, setPromoTargetClass] = useState('');

  const handleExecutePromotion = () => {
    if (!onSetStudents) return;
    if (!promoSourceClass || !promoTargetClass) {
      alert('Please specify both Source and Target classes for batch promotion.');
      return;
    }
    if (promoSourceClass === promoTargetClass) {
      alert('Source and Target classes must be different.');
      return;
    }

    const eligibleStudents = students.filter(s => s.classId === promoSourceClass);
    if (eligibleStudents.length === 0) {
      alert(`There are no active students enrolled in ${promoSourceClass}.`);
      return;
    }

    const confirmMsg = `Are you sure you want to promote all ${eligibleStudents.length} students from ${promoSourceClass} to ${promoTargetClass}?`;
    const isConfirmed = window.confirm ? window.confirm(confirmMsg) : true;
    if (!isConfirmed) return;

    const updatedStudents = students.map(s => {
      if (s.classId === promoSourceClass) {
        return { ...s, classId: promoTargetClass };
      }
      return s;
    });

    onSetStudents(updatedStudents);
    showNotice(`Successfully promoted ${eligibleStudents.length} students from ${promoSourceClass} to ${promoTargetClass}!`);
  };

  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      alert('Please upload a valid JPEG or PNG logo image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Logo file size exceeds the 5MB limit.');
      return;
    }

    setUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const res = await fetch('/api/school/logo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            logoBase64: base64,
            fileName: `logo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
          })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setLogoPreview(data.logoUrl);
        showNotice('School branding logo uploaded and saved.');
        
        // Let App.tsx know
        onUpdateConfig({
          ...config,
          logoUrl: data.logoUrl
        });
      } catch (err: any) {
        alert(`Logo upload failed: ${err.message}`);
      } finally {
        setUploadingLogo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    // Check duplicate
    if (sessions.some(s => s.name.toLowerCase() === newSessionName.trim().toLowerCase())) {
      alert('Academic session name already exists.');
      return;
    }

    const nextSession: AcademicSession = {
      id: `sess_${Date.now()}`,
      name: newSessionName.trim(),
      isActive: false,
      startDate: newStartDate,
      endDate: newEndDate
    };

    onSetSessions([...sessions, nextSession]);
    setNewSessionName('');
    showNotice(`Added new academic session: ${nextSession.name}`);
  };

  const handleUpdateSession = (id: string) => {
    if (!editSessionName.trim()) return;
    
    // Check duplicate among other sessions
    if (sessions.some(s => s.id !== id && s.name.toLowerCase() === editSessionName.trim().toLowerCase())) {
      alert('Academic session name already exists.');
      return;
    }

    const updated = sessions.map(s => {
      if (s.id === id) {
        return {
          ...s,
          name: editSessionName.trim(),
          startDate: editStartDate,
          endDate: editEndDate
        };
      }
      return s;
    });

    onSetSessions(updated);
    setEditingSessionId(null);
    showNotice('Academic session updated successfully.');
  };

  const handleStartEditing = (session: AcademicSession) => {
    setEditingSessionId(session.id);
    setEditSessionName(session.name);
    setEditStartDate(session.startDate);
    setEditEndDate(session.endDate);
  };

  const handleSaveDates = () => {
    onUpdateConfig({
      resumptionDate: resDate,
      closingDate: clsDate
    });
    showNotice('Academic resumption and closing dates updated.');
  };

  const handleToggleActiveSession = (id: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      // Deactivate
      const updated = sessions.map(s => ({ ...s, isActive: false }));
      onSetSessions(updated);
      showNotice('Academic session deactivated.');
    } else {
      // Activate this one, deactivate others
      const updated = sessions.map(s => ({ ...s, isActive: s.id === id }));
      onSetSessions(updated);
      showNotice('Active academic session updated.');
    }
  };

  const handleToggleTerm = (term: SchoolTerm, currentlyActive: boolean) => {
    if (currentlyActive) {
      // Deactivate
      onSwitchTerm(null);
      showNotice(`${term} deactivated.`);
    } else {
      // Activate
      onSwitchTerm(term);
      showNotice(`${term} activated.`);
    }
  };

  const showNotice = (msg: string) => {
    setNotif(msg);
    setTimeout(() => setNotif(null), 3500);
  };

  const termsList: SchoolTerm[] = ['First Term', 'Second Term', 'Third Term'];

  return (
    <div className="space-y-6">
      
      {/* Toast notification (fixed so it's visible regardless of scroll position) */}
      {notif && (
        <div className="fixed top-5 right-5 z-50 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-300 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xl">
          <Check size={14} />
          <span>{notif}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 1. SESSION MANAGEMENT (Left) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
            <Settings size={16} className="text-blue-600" />
            <span>Create Academic Session</span>
          </h4>
          <p className="text-slate-450 text-[11px]">Deploy new academic years and calendars.</p>

          <form onSubmit={handleCreateSession} className="space-y-3.5 pt-2">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Session Code *</label>
              <input
                type="text"
                required
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-850 text-xs py-2 px-3 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100"
                placeholder="e.g. 2026/2027"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Calendar Start</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 text-[11px] py-1.5 px-2 border border-slate-200 dark:border-slate-800 rounded"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Calendar End</label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 text-[11px] py-1.5 px-2 border border-slate-200 dark:border-slate-800 rounded"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus size={14} />
              <span>Initialize New Session</span>
            </button>
          </form>
        </div>

        {/* 2. TERM CONFIGURATION & SESSION ARCHIVES (Right / Mid) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <Archive size={16} className="text-blue-600" />
              <span>Academic Years ({sessions.length})</span>
            </h4>
            <span className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 font-bold px-2 py-0.5 rounded">
              Active: {activeSessionName || 'None'}
            </span>
          </div>

          {/* Session List with edit inline form */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="py-3 flex flex-col gap-2.5 first:pt-0">
                {editingSessionId === s.id ? (
                  <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Session Name</label>
                        <input
                          type="text"
                          value={editSessionName}
                          onChange={(e) => setEditSessionName(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 text-xs py-1.5 px-2 border border-slate-200 dark:border-slate-800 rounded"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Start Date</label>
                        <input
                          type="date"
                          value={editStartDate}
                          onChange={(e) => setEditStartDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 text-xs py-1.5 px-2 border border-slate-200 dark:border-slate-800 rounded"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">End Date</label>
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 text-xs py-1.5 px-2 border border-slate-200 dark:border-slate-800 rounded"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 text-xs">
                      <button
                        onClick={() => setEditingSessionId(null)}
                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleUpdateSession(s.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.name}</span>
                        {s.isActive ? (
                          <span className="text-[9px] uppercase font-extrabold tracking-wider bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full border border-emerald-100 dark:bg-emerald-950/20">
                            Active
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase tracking-wider bg-slate-100 text-slate-400 px-2 py-0.5 rounded dark:bg-slate-800 dark:text-slate-550">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Runs from {s.startDate} to {s.endDate}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleStartEditing(s)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all"
                        title="Edit Session"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleToggleActiveSession(s.id, s.isActive)}
                        className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded transition-all border ${
                          s.isActive 
                            ? 'text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-950/10' 
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-900/40 dark:hover:bg-emerald-950/10'
                        }`}
                      >
                        <Power size={11} />
                        <span>{s.isActive ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Terms Section */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <h5 className="text-[11px] uppercase tracking-widest font-bold text-slate-400 mb-3">Academic Terms (Only one active)</h5>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {termsList.map((term) => {
                const isActive = activeTerm === term;
                return (
                  <div 
                    key={term} 
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      isActive 
                        ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/50' 
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <h6 className="font-bold text-xs text-slate-800 dark:text-slate-100">{term}</h6>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {isActive ? 'Currently actively grading' : 'Inactive calendar step'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleTerm(term, isActive)}
                      className={`w-full text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 transition-all ${
                        isActive
                          ? 'bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      <Power size={10} />
                      <span>{isActive ? 'Deactivate' : 'Activate'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Term Dates boundaries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/20 p-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Resumption Day</label>
              <input
                type="date"
                value={resDate}
                onChange={(e) => setResDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Closing Day</label>
              <input
                type="date"
                value={clsDate}
                onChange={(e) => setClsDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
            
            <div className="sm:col-span-2 flex justify-end pt-2">
              <button
                type="button"
                onClick={handleSaveDates}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-5 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Apply Term Boundaries
              </button>
            </div>
          </div>

          {/* School Profile & Logo Settings Section (Phase 4 & 5) */}
          <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Building size={16} className="text-blue-600 dark:text-blue-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                School Profile & Branding Logo
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50 dark:bg-slate-800/10 p-5 border border-slate-200 dark:border-slate-800 rounded-xl">
              
              {/* Logo upload (Col span 5) */}
              <div className="md:col-span-5 space-y-3">
                <label className="text-[9px] uppercase font-bold text-slate-400 block">School Official Logo</label>
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleLogoUpload(file);
                  }}
                  className={`border-2 border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center min-h-[140px] cursor-pointer ${
                    dragOver 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                  }`}
                  onClick={() => document.getElementById('school-logo-input')?.click()}
                >
                  <input
                    type="file"
                    id="school-logo-input"
                    className="hidden"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                  />
                  
                  {uploadingLogo ? (
                    <div className="space-y-2">
                      <RefreshCw size={24} className="animate-spin text-blue-600 mx-auto" />
                      <span className="text-[10px] text-slate-400 block font-medium">Uploading logo to Supabase...</span>
                    </div>
                  ) : logoPreview ? (
                    <div className="space-y-2 relative group">
                      <img
                        src={logoPreview}
                        alt="School Logo Preview"
                        className="w-20 h-20 object-contain rounded-lg border border-slate-200 dark:border-slate-700 mx-auto bg-white p-1"
                        referrerPolicy="no-referrer"
                      />
                      <span className="text-[9px] text-blue-600 dark:text-blue-400 block font-bold group-hover:underline">Click/Drag to Replace</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload size={24} className="text-slate-400 mx-auto" />
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                        Drag & Drop or <span className="text-blue-600 dark:text-blue-400 underline">Browse Logo</span>
                      </div>
                      <span className="text-[8px] text-slate-400 block">Supports JPEG, PNG (Max 5MB)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* School settings inputs (Col span 7) */}
              <div className="md:col-span-7 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-450 block mb-1">School Official Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={schName}
                        onChange={(e) => setSchName(e.target.value)}
                        placeholder="e.g. SOUTHGOLD MONTESSORI SCHOOL"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 pl-8 pr-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                      <Building size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-450 block mb-1">Office Contact Email</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={schEmail}
                        onChange={(e) => setSchEmail(e.target.value)}
                        placeholder="e.g. contact@school.com"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 pl-8 pr-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                      <Mail size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold text-slate-450 block mb-1">Support Hotlines</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={schPhone}
                        onChange={(e) => setSchPhone(e.target.value)}
                        placeholder="e.g. +234 803 123 4567"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 pl-8 pr-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                      <Phone size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[9px] uppercase font-bold text-slate-450 block mb-1">Campus Physical Address</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={schAddress}
                        onChange={(e) => setSchAddress(e.target.value)}
                        placeholder="e.g. 3, Fagbeyi Ige, Sangotedo, Lagos"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 pl-8 pr-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                      />
                      <MapPin size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateConfig({
                        ...config,
                        schoolName: schName,
                        schoolAddress: schAddress,
                        schoolEmail: schEmail,
                        schoolPhone: schPhone
                      });
                      showNotice('School profile settings applied successfully.');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Save School Profile Details
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Pupil Batch Promotion Center */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Pupil Batch Promotion Rule Center
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Establish automatic batch promotion rules to move students from their current class arm up to their next academic level for the new session.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-450 block mb-1">Source Class (Current)</label>
                <select
                  value={promoSourceClass}
                  onChange={(e) => setPromoSourceClass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 rounded text-xs py-2 px-3 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer font-bold"
                >
                  <option value="">-- Select Source Class --</option>
                  {uniqueClassesList.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-450 block mb-1">Target Class (Promotion Level)</label>
                <select
                  value={promoTargetClass}
                  onChange={(e) => setPromoTargetClass(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-850 rounded text-xs py-2 px-3 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 cursor-pointer font-bold"
                >
                  <option value="">-- Select Target Class --</option>
                  <option value="Primary 1">Primary 1</option>
                  <option value="Primary 2">Primary 2</option>
                  <option value="Primary 3">Primary 3</option>
                  <option value="Primary 4">Primary 4</option>
                  <option value="Primary 5">Primary 5</option>
                  <option value="Primary 6">Primary 6</option>
                  <option value="JSS 1">JSS 1</option>
                  <option value="JSS 2">JSS 2</option>
                  <option value="JSS 3">JSS 3</option>
                  <option value="SSS 1">SSS 1</option>
                  <option value="SSS 2">SSS 2</option>
                  <option value="SSS 3">SSS 3</option>
                  <option value="Graduated">Graduated / Alumni</option>
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={handleExecutePromotion}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer text-center"
                >
                  Execute Batch Promotions
                </button>
              </div>
            </div>
          </div>

          {/* Landing Page CMS Management Center */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-850 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Public Landing Page CMS Management Center
                </h3>
                <p className="text-[11px] text-slate-400 mt-1">
                  Fully customize all text, sections, news, announcements, and images displayed on your public landing page.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveCms}
                disabled={uploadingCmsImage}
                className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold text-xs py-1.5 px-4 rounded-lg shadow transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingCmsImage ? 'Uploading image...' : 'Save Landing Page CMS'}
              </button>
            </div>

            {loadingCms ? (
              <div className="text-xs text-slate-400 text-center py-4">
                Loading CMS configurations from database...
              </div>
            ) : (
              <div className="space-y-6">
                {/* 1. Hero & Branding Details */}
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-600">1. Hero & Branding Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-450 block mb-1">Landing Page Motto</label>
                      <input
                        type="text"
                        value={cms.motto}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, motto: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        placeholder="e.g. Learn and Grow Together"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Welcome Badge Text</label>
                      <input
                        type="text"
                        value={cms.welcomeTitle}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, welcomeTitle: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        placeholder="e.g. Admissions Ongoing"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Welcome Description</label>
                      <textarea
                        value={cms.welcomeDesc}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, welcomeDesc: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        rows={2}
                        placeholder="Welcome introduction..."
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Foundation, Mission & Vision */}
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#2563eb]">2. Foundation, Mission & Vision</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">About Section Title</label>
                      <input
                        type="text"
                        value={cms.aboutTitle}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, aboutTitle: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        placeholder="e.g. Nurturing Character & Leading Minds"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">About Section Narrative</label>
                      <textarea
                        value={cms.aboutDesc}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, aboutDesc: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        rows={2}
                        placeholder="About narrative..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Our Mission Statement</label>
                      <textarea
                        value={cms.mission}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, mission: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        rows={2}
                        placeholder="To foster creative thinking..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Our Vision Statement</label>
                      <textarea
                        value={cms.vision}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, vision: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        rows={2}
                        placeholder="To be a premier educational..."
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Principal's Word & Photo */}
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-purple-600">3. Principal's Address</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Principal's Name</label>
                      <input
                        type="text"
                        value={cms.principalName}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, principalName: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-805 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        placeholder="Mrs. Olufunmilayo Fagbeyi"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Principal Official Photo</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCmsImageUpload(e, 'principalPhoto')}
                          className="hidden"
                          id="principal-photo-upload"
                        />
                        <label
                          htmlFor="principal-photo-upload"
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer border border-slate-200 dark:border-slate-700"
                        >
                          <Upload size={11} /> Upload Photo
                        </label>
                        {cms.principalPhoto ? (
                          <img src={cms.principalPhoto} alt="Principal Preview" className="h-9 w-9 object-cover rounded-lg border border-amber-500" />
                        ) : (
                          <span className="text-[10px] text-slate-400">No Photo Uploaded</span>
                        )}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Word from the Principal</label>
                      <textarea
                        value={cms.principalMessage}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, principalMessage: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-805 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        rows={3}
                        placeholder="Welcome message from the principal..."
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Hero Slider & Campus Gallery Images */}
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-rose-600">4. Hero & Gallery Media Assets</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Hero Images list */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] uppercase font-bold text-slate-455">Hero Cover Images</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCmsImageUpload(e, 'heroImages')}
                          className="hidden"
                          id="hero-img-upload"
                        />
                        <label
                          htmlFor="hero-img-upload"
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[9px] py-1 px-2 rounded-lg flex items-center gap-1 cursor-pointer border border-slate-200"
                        >
                          <Plus size={10} /> Add Hero Cover
                        </label>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {cms.heroImages && cms.heroImages.length > 0 ? (
                          cms.heroImages.map((img: string, idx: number) => (
                            <div key={idx} className="relative group border rounded-lg overflow-hidden aspect-video">
                              <img src={img} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setCms((prev: any) => ({ ...prev, heroImages: prev.heroImages.filter((_: any, i: number) => i !== idx) }))}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700"
                              >
                                <Trash2 size={8} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400">None uploaded</span>
                        )}
                      </div>
                    </div>

                    {/* Gallery Images list */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] uppercase font-bold text-slate-455">Campus Gallery</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCmsImageUpload(e, 'gallery')}
                          className="hidden"
                          id="gallery-img-upload"
                        />
                        <label
                          htmlFor="gallery-img-upload"
                          className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[9px] py-1 px-2 rounded-lg flex items-center gap-1 cursor-pointer border border-slate-200"
                        >
                          <Plus size={10} /> Add Campus Photo
                        </label>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {cms.gallery && cms.gallery.length > 0 ? (
                          cms.gallery.map((img: string, idx: number) => (
                            <div key={idx} className="relative group border rounded-lg overflow-hidden aspect-video">
                              <img src={img} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setCms((prev: any) => ({ ...prev, gallery: prev.gallery.filter((_: any, i: number) => i !== idx) }))}
                                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700"
                              >
                                <Trash2 size={8} />
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400">None uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. Social & Contact Links */}
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-600">5. Social Media & Communication Channels</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">WhatsApp Registrar Number</label>
                      <input
                        type="text"
                        value={cms.whatsapp}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, whatsapp: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        placeholder="e.g. +2348031234567"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Facebook URL</label>
                      <input
                        type="text"
                        value={cms.facebook}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, facebook: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        placeholder="https://facebook.com/..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Instagram URL</label>
                      <input
                        type="text"
                        value={cms.instagram}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, instagram: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        placeholder="https://instagram.com/..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">YouTube URL</label>
                      <input
                        type="text"
                        value={cms.youtube}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, youtube: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        placeholder="https://youtube.com/..."
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold text-slate-455 block mb-1">Website URL</label>
                      <input
                        type="text"
                        value={cms.website}
                        onChange={(e) => setCms((prev: any) => ({ ...prev, website: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-800 dark:text-slate-100 focus:outline-none"
                        placeholder="https://southgoldschools.com"
                      />
                    </div>
                  </div>
                </div>

                {/* 6. Dynamic News Panel */}
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-500">6. Latest School News Articles</h4>
                  
                  {/* Create News Item */}
                  <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-lg border dark:border-slate-800 space-y-2">
                    <span className="text-[9px] font-bold uppercase text-slate-455">Publish New News Article</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="News Title..."
                        value={newNewsTitle}
                        onChange={(e) => setNewNewsTitle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1 px-2.5 text-slate-850 dark:text-slate-100 focus:outline-none"
                      />
                      <input
                        type="date"
                        value={newNewsDate}
                        onChange={(e) => setNewNewsDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1 px-2.5 text-slate-850 dark:text-slate-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddNews}
                        disabled={uploadingCmsImage}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] py-1 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingCmsImage ? 'Uploading...' : 'Publish Draft Article'}
                      </button>
                    </div>
                    <textarea
                      placeholder="Article content here..."
                      value={newNewsContent}
                      onChange={(e) => setNewNewsContent(e.target.value)}
                      rows={2}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-850 dark:text-slate-100 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleDraftImageUpload(e, setNewNewsImage)}
                        className="hidden"
                        id="news-img-upload"
                      />
                      <label
                        htmlFor="news-img-upload"
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[9px] py-1 px-2 rounded-lg flex items-center gap-1 cursor-pointer border border-slate-200"
                      >
                        <Image size={10} /> {newNewsImage ? 'Change Image' : 'Add Image (optional)'}
                      </label>
                      {newNewsImage && (
                        <div className="relative">
                          <img src={newNewsImage} className="h-8 w-8 object-cover rounded border" />
                          <button
                            type="button"
                            onClick={() => setNewNewsImage('')}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700"
                          >
                            <Trash2 size={8} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* List News Items */}
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-slate-455 block">Published News Articles</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {cms.news && cms.news.length > 0 ? (
                        cms.news.map((item: any) => (
                          <div key={item.id} className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.image && (
                                <img src={item.image} className="h-8 w-8 object-cover rounded border flex-shrink-0" />
                              )}
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-bold text-slate-400">{item.date}</span>
                                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase">{item.title}</h5>
                                <p className="text-[10px] text-slate-455 truncate max-w-lg">{item.content}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveNews(item.id)}
                              className="text-red-600 hover:text-red-750 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex-shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400">No published news articles</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 7. Announcements Panel */}
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-4">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-blue-500">7. Important Announcements</h4>
                  
                  {/* Create Announcement */}
                  <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-lg border dark:border-slate-800 space-y-2">
                    <span className="text-[9px] font-bold uppercase text-slate-455">Publish New Announcement</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        placeholder="Announcement Title..."
                        value={newAnnounceTitle}
                        onChange={(e) => setNewAnnounceTitle(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1 px-2.5 text-slate-850 dark:text-slate-100 focus:outline-none"
                      />
                      <input
                        type="date"
                        value={newAnnounceDate}
                        onChange={(e) => setNewAnnounceDate(e.target.value)}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs py-1 px-2.5 text-slate-850 dark:text-slate-100 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddAnnouncement}
                        disabled={uploadingCmsImage}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] py-1 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingCmsImage ? 'Uploading...' : 'Publish Draft Alert'}
                      </button>
                    </div>
                    <textarea
                      placeholder="Announcement message..."
                      value={newAnnounceContent}
                      onChange={(e) => setNewAnnounceContent(e.target.value)}
                      rows={2}
                      className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded text-xs py-1.5 px-2.5 text-slate-850 dark:text-slate-100 focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleDraftImageUpload(e, setNewAnnounceImage)}
                        className="hidden"
                        id="announce-img-upload"
                      />
                      <label
                        htmlFor="announce-img-upload"
                        className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[9px] py-1 px-2 rounded-lg flex items-center gap-1 cursor-pointer border border-slate-200"
                      >
                        <Image size={10} /> {newAnnounceImage ? 'Change Image' : 'Add Image (optional)'}
                      </label>
                      {newAnnounceImage && (
                        <div className="relative">
                          <img src={newAnnounceImage} className="h-8 w-8 object-cover rounded border" />
                          <button
                            type="button"
                            onClick={() => setNewAnnounceImage('')}
                            className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full p-0.5 shadow-md hover:bg-red-700"
                          >
                            <Trash2 size={8} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* List Announcements */}
                  <div className="space-y-2">
                    <label className="text-[9px] uppercase font-bold text-slate-455 block">Active Alerts</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {cms.announcements && cms.announcements.length > 0 ? (
                        cms.announcements.map((item: any) => (
                          <div key={item.id} className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-lg flex justify-between items-center gap-4">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.image && (
                                <img src={item.image} className="h-8 w-8 object-cover rounded border flex-shrink-0" />
                              )}
                              <div className="space-y-0.5 min-w-0">
                                <span className="text-[9px] font-bold text-slate-400">{item.date}</span>
                                <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase">{item.title}</h5>
                                <p className="text-[10px] text-slate-455 truncate max-w-lg">{item.content}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAnnouncement(item.id)}
                              className="text-red-600 hover:text-red-750 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex-shrink-0"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-400">No active alerts</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Save bottom bar */}
                <div className="flex justify-end items-center gap-3 pt-2 border-t dark:border-slate-800">
                  {uploadingCmsImage && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold">Uploading image, please wait...</span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCms}
                    disabled={uploadingCmsImage}
                    className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingCmsImage ? 'Uploading image...' : 'Save All CMS Configurations'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
