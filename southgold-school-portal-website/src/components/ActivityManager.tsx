import React, { useState } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit, 
  Save, 
  X, 
  Image, 
  Tag, 
  Globe, 
  FileText, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { SchoolActivity, UserRole } from '../types';

interface ActivityManagerProps {
  currentRole: UserRole;
  activities: SchoolActivity[];
  onSetActivities: (newActivities: SchoolActivity[]) => void;
}

export default function ActivityManager({ 
  currentRole, 
  activities, 
  onSetActivities 
}: ActivityManagerProps) {
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [badge, setBadge] = useState('');
  const [desc, setDesc] = useState('');
  const [imgUrl, setImgUrl] = useState('');
  const [footer, setFooter] = useState('');
  const [content, setContent] = useState('');

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setBadge('');
    setDesc('');
    setImgUrl('');
    setFooter('');
    setContent('');
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !desc) return;

    const defaultImages = [
      'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=600&auto=format&fit=crop&q=80'
    ];

    const randomDefaultImg = defaultImages[Math.floor(Math.random() * defaultImages.length)];

    const newActivity: SchoolActivity = {
      id: `act_${Date.now()}`,
      title,
      badge: badge || 'General Update',
      desc,
      imgUrl: imgUrl.trim() || randomDefaultImg,
      footer: footer || 'School Activity',
      content: content.trim() || undefined
    };

    onSetActivities([...activities, newActivity]);
    resetForm();
    setIsAdding(false);
    showSuccess('School activity added successfully!');
  };

  const handleStartEdit = (act: SchoolActivity) => {
    setEditingId(act.id);
    setTitle(act.title);
    setBadge(act.badge);
    setDesc(act.desc);
    setImgUrl(act.imgUrl);
    setFooter(act.footer);
    setContent(act.content || '');
    setIsAdding(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !title || !desc) return;

    const updatedActivities = activities.map(act => {
      if (act.id === editingId) {
        return {
          ...act,
          title,
          badge: badge || 'Update',
          desc,
          imgUrl: imgUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
          footer: footer || 'School Activity',
          content: content.trim() || undefined
        };
      }
      return act;
    });

    onSetActivities(updatedActivities);
    setEditingId(null);
    resetForm();
    showSuccess('School activity updated successfully!');
  };

  const handleDelete = (id: string) => {
    const updated = activities.filter(act => act.id !== id);
    onSetActivities(updated);
    setDeleteConfirmId(null);
    showSuccess('School activity deleted successfully!');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 dark:bg-amber-955/20 border border-amber-200/50 px-2.5 py-0.5 rounded-full">
            Administrative Powers
          </span>
          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-slate-50 uppercase tracking-tight mt-1">
            School Activities Manager
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Add, edit, or delete activities published on the public landing page hero block dynamically.
          </p>
        </div>

        {!isAdding && !editingId && (
          <button
            onClick={() => {
              resetForm();
              setIsAdding(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            id="add-activity-btn"
          >
            <Plus size={14} />
            Add New Activity
          </button>
        )}
      </div>

      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-emerald-100/60 dark:bg-emerald-955/20 border border-emerald-200/50 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400 text-xs font-bold rounded-lg animate-fade-in">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Adding / Editing Form Section */}
      {(isAdding || editingId) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in max-w-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-display font-black text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles size={15} className="text-amber-500" />
              {isAdding ? 'Post Fresh Activity' : 'Edit Existing Activity Record'}
            </h3>
            <button
              onClick={() => {
                setEditingId(null);
                setIsAdding(false);
                resetForm();
              }}
              className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              <X size={15} />
            </button>
          </div>

          <form onSubmit={isAdding ? handleCreate : handleSaveEdit} className="space-y-4 text-xs font-semibold">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Activity Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-550 dark:text-slate-350 flex items-center gap-1">
                  <FileText size={11} className="text-slate-400" />
                  Activity Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Science Fair & Tech Day"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  id="activity-title-input"
                />
              </div>

              {/* Tag/Badge Category */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-550 dark:text-slate-350 flex items-center gap-1">
                  <Tag size={11} className="text-slate-400" />
                  Category Badge
                </label>
                <input
                  type="text"
                  placeholder="e.g. Extracurricular, General, Science"
                  value={badge}
                  onChange={e => setBadge(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  id="activity-badge-input"
                />
              </div>
            </div>

            {/* Description Details */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-550 dark:text-slate-350 flex items-center gap-1">
                <FileText size={11} className="text-slate-400" />
                Card Summary (short teaser shown on the activity card) <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="A brief one or two line summary shown on the activity card itself."
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 leading-relaxed font-normal"
                id="activity-desc-input"
              />
            </div>

            {/* Full Details for the read-more popup */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-550 dark:text-slate-350 flex items-center gap-1">
                <FileText size={11} className="text-slate-400" />
                Full Details (optional -- shown when a visitor clicks the card to read more)
              </label>
              <textarea
                rows={5}
                placeholder="Write the full story here: schedule, requirements, background, anything worth reading beyond the short summary. Leave empty to just show the card summary above."
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 leading-relaxed font-normal"
                id="activity-content-input"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Unsplash Background Photo URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-550 dark:text-slate-350 flex items-center gap-1">
                  <Image size={11} className="text-slate-400" />
                  Background Image URL (Unsplash, etc.)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... (optional)"
                  value={imgUrl}
                  onChange={e => setImgUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500 font-normal text-slate-600 dark:text-slate-300"
                  id="activity-image-input"
                />
                <p className="text-[9px] text-slate-400 normal-case font-medium">Leave empty to use a beautifully seeded educational photo automatically.</p>
              </div>

              {/* Status Footer text */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-550 dark:text-slate-350 flex items-center gap-1">
                  <Globe size={11} className="text-slate-400" />
                  Footer Tag Line
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terminal Event, Registration Closed"
                  value={footer}
                  onChange={e => setFooter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                  id="activity-footer-input"
                />
              </div>
            </div>

            {/* Submit layout buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setIsAdding(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg uppercase tracking-wider text-[10px] font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg uppercase tracking-wider text-[10px] font-bold shadow-xs"
                id="save-activity-submit"
              >
                <Save size={12} />
                {isAdding ? 'Create Activity' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid List of current activities managed */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
          <span>Active Campus Highlights ({activities.length})</span>
        </h3>

        {activities.length === 0 ? (
          <div className="bg-slate-100 dark:bg-slate-950 p-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80">
            <AlertCircle className="mx-auto text-slate-400 mb-2" size={24} />
            <p className="text-slate-550 dark:text-slate-450 font-semibold text-xs">No active campus activities posted.</p>
            <p className="text-slate-400 text-[11px] mt-1">Click the "Add New Activity" button above to publish your first announcement.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map((act) => (
              <div 
                key={act.id} 
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Image container */}
                  <div className="relative h-40 bg-slate-100 dark:bg-slate-950">
                    <img 
                      src={act.imgUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80'} 
                      alt={act.title} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="text-[9px] font-black uppercase tracking-wider bg-amber-600 text-white px-2.5 py-1 rounded-full shadow-sm">
                        {act.badge}
                      </span>
                    </div>
                  </div>

                  {/* Text details */}
                  <div className="p-5 space-y-2">
                    <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-50 uppercase tracking-wide leading-snug">
                      {act.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                      {act.desc}
                    </p>
                  </div>
                </div>

                {/* Footer and interactive quick actions */}
                <div className="p-4 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-440 font-bold tracking-tight">
                    {act.footer || 'General Update'}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {deleteConfirmId === act.id ? (
                      <div className="flex items-center gap-1 animate-fade-in text-[10px]">
                        <button
                          onClick={() => handleDelete(act.id)}
                          className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white font-bold uppercase rounded-md"
                          id={`confirm-delete-${act.id}`}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-2 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-705 text-slate-700 dark:text-slate-300 font-bold uppercase rounded-md"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStartEdit(act)}
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                          title="Edit Activity Detail"
                          id={`edit-activity-btn-${act.id}`}
                        >
                          <Edit size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(act.id)}
                          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-350 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          title="Remove Activity"
                          id={`delete-activity-btn-${act.id}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
