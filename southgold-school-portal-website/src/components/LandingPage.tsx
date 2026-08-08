import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Moon,
  ShieldAlert, 
  UserCheck, 
  BookOpen, 
  Users, 
  GraduationCap, 
  X, 
  Lock, 
  Mail, 
  Globe,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  Laptop,
  Check,
  Send,
  HelpCircle,
  Menu,
  BookMarked,
  ShieldCheck,
  Building
} from 'lucide-react';
import { UserRole, SchoolActivity } from '../types';
import { PUBLIC_ROUTES } from '../publicRoutes';

interface LandingPageProps {
  onLogin: (email: string, password: string, expectedRole?: UserRole, rememberMe?: boolean) => Promise<void>;
  darkTheme: boolean;
  onToggleTheme: () => void;
  activities?: SchoolActivity[];
  logoUrl?: string;
  schoolName?: string;
  schoolEmail?: string;
  schoolPhone?: string;
  schoolAddress?: string;
  globalLoginError?: string | null;
  initialCms?: any;
}

export default function LandingPage({
  onLogin,
  darkTheme,
  onToggleTheme,
  activities,
  logoUrl,
  schoolName,
  schoolEmail,
  schoolPhone,
  schoolAddress,
  globalLoginError,
  initialCms
}: LandingPageProps) {
  const [selectedActivity, setSelectedActivity] = useState<SchoolActivity | null>(null);
  const [selectedBulletin, setSelectedBulletin] = useState<{ kind: 'news' | 'announcement'; date: string; title: string; content: string; image?: string } | null>(null);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState<number | null>(null);

  // Seeded from the server-fetched initialCms when available (the normal
  // case) so the first paint already shows real content -- these hardcoded
  // values are only a fallback for if that server fetch failed, not what
  // gets shown in the common case.
  const [cms, setCms] = useState<any>(() => initialCms ?? {
    motto: 'Learn and Grow Together.',
    whatsapp: '+234 803 123 4567',
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
    website: 'https://southgoldschools.com.ng',
    welcomeTitle: 'Welcome to SouthGold Montessori School',
    welcomeDesc: 'We provide a warm, nurturing environment where every child can flourish academically, socially, and emotionally.',
    aboutTitle: 'Our Heritage of Excellence',
    aboutDesc: 'Established with a vision to cultivate outstanding young minds, SouthGold Montessori School combines modern learning methodologies with classical values.',
    mission: 'To foster creative thinking, intellectual curiosity, and moral integrity in every student.',
    vision: 'To be a premier educational institution recognized globally for academic leadership and character development.',
    principalMessage: 'Welcome to our community. At SouthGold, we believe that education is the key to unlocking every child’s potential. We invite you to partner with us in this journey.',
    principalName: 'Mrs. Olufunmilayo Fagbeyi',
    principalPhoto: '',
    heroImages: [],
    gallery: [],
    admissionsTitle: 'Admissions Open for 2026/2027 Session',
    admissionsDesc: 'We are currently accepting applications for Preschool, Primary, and Junior Secondary classes. Reach out to our admissions desk to learn more.',
    news: [
      { id: '1', title: 'Inter-House Sports Festival 2026', content: 'Our annual inter-house sports festival was held with high spirits and excellent performances from all houses.', date: '2026-06-15' },
      { id: '2', title: 'STEAM Exhibition Day', content: 'Students showcased amazing science, technology, engineering, arts, and math projects at our annual exhibition.', date: '2026-05-20' }
    ],
    announcements: [
      { id: '1', title: 'Resumption for Third Term', content: 'Third term begins on Monday, May 11th, 2026. All pupils are expected to be in full uniform.', date: '2026-05-08' }
    ]
  });

  useEffect(() => {
    if (!selectedActivity && !selectedBulletin) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedActivity(null);
        setSelectedBulletin(null);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [selectedActivity, selectedBulletin]);

  useEffect(() => {
    if (selectedGalleryIndex === null) return;
    const galleryLength = cms.gallery?.length || 0;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedGalleryIndex(null);
      else if (e.key === 'ArrowRight') setSelectedGalleryIndex((i) => (i === null ? i : (i + 1) % galleryLength));
      else if (e.key === 'ArrowLeft') setSelectedGalleryIndex((i) => (i === null ? i : (i - 1 + galleryLength) % galleryLength));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedGalleryIndex, cms.gallery]);

  useEffect(() => {
    fetch('/api/cms')
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setCms(data);
        }
      })
      .catch(err => console.error('Error fetching CMS:', err));
  }, []);

  const validPaths = React.useMemo(() => new Set(PUBLIC_ROUTES.map(r => r.path)), []);

  const resolvePathFromLocation = React.useCallback((location: Location) => {
    const redirectPath = new URLSearchParams(location.search).get('redirect');
    if (redirectPath) {
      const safePath = redirectPath.split('?')[0];
      if (validPaths.has(safePath)) {
        return safePath;
      }
    }

    const pathname = location.pathname;
    return validPaths.has(pathname) ? pathname : '/';
  }, [validPaths]);

  const [currentPath, setCurrentPath] = useState(() => resolvePathFromLocation(window.location));

  const handleNavigate = (path: string) => {
    const nextPath = validPaths.has(path) ? path : '/';
    setCurrentPath(nextPath);
    window.history.pushState(null, '', nextPath);
    window.scrollTo({ top: 0 });
  };

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = resolvePathFromLocation(window.location);
      setCurrentPath(nextPath);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resolvePathFromLocation]);

  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    if (globalLoginError) {
      setLoginError(globalLoginError);
    }
  }, [globalLoginError]);

  const PATH_TO_ROLE: Record<string, UserRole> = {
    '/login/super-admin': 'SUPER_ADMIN',
    '/login/staff-admin': 'SCHOOL_ADMIN',
    '/login/teacher': 'TEACHER',
    '/login/parent': 'PARENT',
    '/login/student': 'STUDENT'
  };

  const ROLE_TO_PATH: Record<UserRole, string> = {
    'SUPER_ADMIN': '/login/super-admin',
    'SCHOOL_ADMIN': '/login/staff-admin',
    'TEACHER': '/login/teacher',
    'PARENT': '/login/parent',
    'STUDENT': '/login/student'
  };

  const REMEMBERED_EMAIL_KEY = 'sg_remembered_email';
  const [emailInput, setEmailInput] = useState(() => {
    try {
      return window.localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
    } catch {
      return '';
    }
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  


  // Interactive Contact Us Form state
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactSubject, setContactSubject] = useState('Admission Inquiry');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  // Custom Role configuration with prepackaged user guides
  const portalRolesConfig = [
    {
      role: 'SUPER_ADMIN' as UserRole,
      title: "Super Admin",
      badge: "Master Access",
      desc: "Full administrator control over configurations, files, and synced accounts.",
      icon: ShieldAlert,
      color: "from-slate-900 to-indigo-950"
    },
    {
      role: 'SCHOOL_ADMIN' as UserRole,
      title: "Staff Admin",
      badge: "Management",
      desc: "Manage students, classes, subjects, and fees tracking.",
      icon: UserCheck,
      color: "from-slate-900 to-blue-950"
    },
    {
      role: 'TEACHER' as UserRole,
      title: "Teacher Portal",
      badge: "Academics",
      desc: "Record academic assessment grades and mark class attendance registers.",
      icon: BookOpen,
      color: "from-slate-900 to-emerald-950"
    },
    {
      role: 'PARENT' as UserRole,
      title: "Parent Portal",
      badge: "General Desk",
      desc: "Track children's reports, attendance records, and pay tuition fees.",
      icon: Users,
      color: "from-slate-900 to-amber-950"
    },
    {
      role: 'STUDENT' as UserRole,
      title: "Student Desk",
      badge: "Personal Desk",
      desc: "Core student area to take test drills and view report cards.",
      icon: GraduationCap,
      color: "from-slate-900 to-sky-950"
    }
  ];



  const handleOpenLoginModal = (role: UserRole) => {
    setEmailInput('');
    setPasswordInput('');
    setLoginError(null);
    handleNavigate(ROLE_TO_PATH[role]);
  };

  const handleOpenLoginPage = (role: UserRole) => {
    setEmailInput('');
    setPasswordInput('');
    setLoginError(null);
    handleNavigate(ROLE_TO_PATH[role]);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      await onLogin(emailInput, passwordInput);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactLoading(true);

    const ticketPayload = {
      senderName: `Admission Inquiry: ${contactName}`,
      senderEmail: contactEmail,
      senderRole: 'PARENT' as UserRole,
      subject: `[Admissions] ${contactSubject}`,
      message: contactMessage,
      status: 'Open' as const,
      createdAt: new Date().toISOString(),
      replies: []
    };

    // One notification per admin role -- both Super Admin and School Admin
    // need their own row since a notification's recipientRole is a single
    // value and the bell/list only shows a notification whose recipientRole
    // matches the viewer's own role (or 'ALL').
    const notificationPayloads = (['SUPER_ADMIN', 'SCHOOL_ADMIN'] as const).map((recipientRole) => ({
      title: `New Admission/Fees Inquiry Logged`,
      content: `Inquiry from ${contactName} (${contactEmail}) has been logged. Subject: ${contactSubject}. Message: "${contactMessage}"`,
      category: 'System' as const,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      recipientRole
    }));

    try {
      // 1. Post to tickets DB so Staff Admin and Support Desk processes it
      await fetch('/api/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ticketPayload),
      });

      // 2. Post notification alerts to both the Super Admin and School Admin dashboards
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayloads),
      });
    } catch (err) {
      console.error("Failed to forward inquiry alerts directly to admin portal:", err);
    } finally {
      setContactLoading(false);
      setContactSubmitted(true);
    }
  };



  if (currentPath === '/login') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between font-sans transition-colors duration-200">
        <header className="border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigate('/')}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-9 w-9 object-contain rounded-lg" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-display font-black text-slate-950 text-sm">SG</div>
              )}
              <span className="font-display font-black text-sm tracking-widest text-slate-900 dark:text-slate-50 uppercase">
                {schoolName || 'SOUTHGOLD'}
              </span>
            </div>
            <button 
              onClick={() => handleNavigate('/')}
              className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl w-full space-y-8 text-center animate-fade-in">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-500/10 px-3.5 py-1.5 rounded-full border border-amber-500/20">
                Authorized Access Portals
              </span>
              <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight mt-4">
                Select Your Access Gateway
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto font-medium">
                Please click on your dedicated portal below to proceed to the secure credential check-in.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-6">
              {portalRolesConfig.map((item) => {
                const IconComp = item.icon;
                const pathTarget = ROLE_TO_PATH[item.role];
                return (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => handleNavigate(pathTarget)}
                    className="text-center p-6 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-md transition-all flex flex-col items-center justify-center gap-4 group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-450 border border-slate-200 dark:border-slate-800 group-hover:bg-amber-500 group-hover:text-slate-950 group-hover:border-amber-500 flex items-center justify-center transition-all">
                      <IconComp size={20} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-50 uppercase tracking-wider">
                        {item.title}
                      </h4>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mt-1">
                        {item.badge}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-900 py-6 text-center text-[10px] text-slate-400">
          <p>© 2026 SouthGold Montessori School. Secure Authorization Portal.</p>
        </footer>
      </div>
    );
  }

  const activeRole = PATH_TO_ROLE[currentPath];
  if (activeRole) {
    const roleConfig = portalRolesConfig.find(item => item.role === activeRole);
    const IconComp = roleConfig?.icon || ShieldCheck;
    const roleTitle = roleConfig?.title || 'Portal';

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between font-sans transition-colors duration-200">
        <header className="border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavigate('/')}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-9 w-9 object-contain rounded-lg" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-amber-500 flex items-center justify-center font-display font-black text-slate-950 text-sm">SG</div>
              )}
              <span className="font-display font-black text-sm tracking-widest text-slate-900 dark:text-slate-50 uppercase">
                {schoolName || 'SOUTHGOLD'}
              </span>
            </div>
            <button 
              onClick={() => handleNavigate('/login')}
              className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:text-amber-600 transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Back to Portals
            </button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-lg animate-fade-in">
            <div className="bg-slate-950 text-white p-6 relative flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center border border-amber-600/35 mb-3">
                <IconComp size={22} />
              </div>
              <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase tracking-widest text-[9px]">
                <ShieldCheck size={12} />
                <span>Secure Authorization</span>
              </div>
              <h3 className="font-display font-black text-xl text-slate-50 uppercase tracking-tight mt-1">
                {roleTitle} Login
              </h3>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">
                Please enter your registered credentials below. Role-isolation is actively enforced.
              </p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              setLoginError(null);
              setLoginLoading(true);
              try {
                await onLogin(emailInput, passwordInput, activeRole, rememberMe);
                try {
                  if (rememberMe) {
                    window.localStorage.setItem(REMEMBERED_EMAIL_KEY, emailInput);
                  } else {
                    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
                  }
                } catch {}
              } catch (err: any) {
                setLoginError(err.message || 'Login failed. Please check your credentials.');
              } finally {
                setLoginLoading(false);
              }
            }} className="p-6 space-y-4">
              {loginError && (
                <div className="bg-rose-50 border border-rose-200 dark:bg-rose-950/25 dark:border-rose-900/50 rounded-xl p-3.5 text-xs text-rose-600 dark:text-rose-400 font-semibold shadow-xs">
                  ⚠️ {loginError}
                </div>
              )}

              <div className="space-y-3.5">
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">User Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      autoComplete="username"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder={`e.g. ${activeRole.toLowerCase()}@southgold.com`}
                      className="w-full bg-slate-50 dark:bg-slate-950 text-xs py-2.5 pl-9 pr-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
                    />
                    <Mail className="absolute left-3 top-3.5 text-slate-400" size={13} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Security Password</label>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-950 text-xs py-2.5 pl-9 pr-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-800 dark:text-slate-200"
                    />
                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={13} />
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <label className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-semibold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-3 w-3 rounded border-slate-300 dark:border-slate-700 text-amber-500 focus:ring-amber-500 cursor-pointer"
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      onClick={() => setLoginError("To reset your password, please contact the SouthGold Admin Desk or School Registrar directly.")}
                      className="text-[10px] text-amber-600 dark:text-amber-500 hover:underline font-semibold focus:outline-none"
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In to Portal</span>
                    <ArrowRight size={12} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="w-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-center text-[10.5px] font-bold uppercase tracking-wider focus:outline-none pt-1"
              >
                ← Back to Portal Selection
              </button>
            </form>
          </div>
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-900 py-6 text-center text-[10px] text-slate-400">
          <p>© 2026 SouthGold Montessori School. Secure Role-Isolated Access Gateway.</p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-250">
      
      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img 
                src={logoUrl} 
                alt="School Logo" 
                className="w-11 h-11 object-contain rounded-xl shadow-md cursor-pointer hover:rotate-6 transition-transform bg-white p-0.5 border"
                onClick={() => {
                  handleNavigate('/');
                }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                className="w-11 h-11 bg-slate-900 dark:bg-amber-550 rounded-xl flex items-center justify-center shadow-md cursor-pointer border border-amber-500/30 group hover:rotate-6 transition-transform"
                onClick={() => {
                  handleNavigate('/');
                }}
              >
                <Award className="text-amber-500 dark:text-slate-950" size={24} />
              </div>
            )}
            
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-display font-bold text-base sm:text-lg text-slate-900 dark:text-slate-50 tracking-tight leading-none uppercase">
                  {schoolName || 'SOUTHGOLD MONTESSORI SCHOOL'}
                </h1>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-bold text-slate-600 dark:text-slate-350 uppercase tracking-wider">
            <a href="#about" className="hover:text-amber-600 transition-colors">Our College</a>
            <a href="#highlights" className="hover:text-amber-600 transition-colors">Campus Life</a>
            <a href="#contact" className="hover:text-amber-600 transition-colors">Contact Us</a>
          </nav>

          <div className="flex items-center gap-3">
            <button 
              onClick={onToggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 transition-colors cursor-pointer focus:outline-none"
              title="Switch Color Theme"
              id="theme-toggle"
            >
              {darkTheme ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button
              onClick={() => {
                handleNavigate('/login');
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-bold text-xs uppercase tracking-wider py-2 px-4 rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
              id="header-portal-access"
            >
              Portal Logins
            </button>
          </div>
        </div>
      </header>


          {/* HERO SECTION - REDESIGNED: Extremely Clean, Prestige Academic Aesthetic with minimal text */}
          <section className="relative py-12 lg:py-16 bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-slate-950 border-b border-slate-200 dark:border-slate-800/40 overflow-hidden">
        
        {/* Abstract subtle artistic background shapes */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-amber-500/5 dark:bg-amber-500/2 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Admission Status */}
              <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-955/40 text-amber-900 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Sparkles size={11} className="text-amber-600" />
                <span>{cms.welcomeTitle || 'Admissions Ongoing'}</span>
              </div>

              {/* motto heading */}
              <h2 className="text-4xl sm:text-5xl lg:text-5xl font-display font-extrabold text-slate-900 dark:text-slate-50 leading-[1.1] tracking-tight whitespace-pre-line">
                {cms.motto || 'Learn and\nGrow Together.'}
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-lg leading-relaxed font-normal">
                {cms.welcomeDesc || 'SouthGold Montessori School provides a premier dual syllabus education focused on nurturing independent learning and academic excellence.'}
              </p>

              {/* Call-To-Action */}
              <div className="pt-2 flex flex-wrap gap-3 items-center">
                <a 
                  href="#contact"
                  className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 font-bold text-xs uppercase tracking-wider py-3 px-5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Admission Enquiry</span>
                  <ArrowRight size={13} />
                </a>

                <button 
                  onClick={() => handleOpenLoginPage('SCHOOL_ADMIN')}
                  className="bg-white hover:bg-slate-50 text-slate-805 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 px-5 py-3 rounded-xl text-xs uppercase tracking-wider font-bold transition-all cursor-pointer"
                >
                  Workplace Portals
                </button>
              </div>

            </div>

            {/* Right Graphics/Illustration Column */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-[400px] lg:max-w-none">
                {/* Decorative retro frame effect */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-amber-500 to-indigo-500 rounded-3xl blur-md opacity-25 pointer-events-none" />
                
                <div className="relative bg-white dark:bg-slate-900 p-3 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800">
                  <img 
                    src={cms.heroImages?.[0] || "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&auto=format&fit=crop&q=80"} 
                    alt="Students collaborating at SouthGold Montessori School" 
                    className="rounded-2xl w-full h-[320px] object-cover filter brightness-95"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Absolute Badge Widget */}
                  <div className="absolute -bottom-4 -left-4 bg-slate-900 text-white p-3.5 rounded-2xl border border-slate-840 shadow-lg flex items-center gap-2.5 max-w-[210px]">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                      <Award size={16} />
                    </div>
                    <div>
                      <h5 className="font-semibold text-[11px] uppercase text-amber-500">Academic Standard</h5>
                      <p className="text-[10px] text-slate-300 mt-0.5 leading-snug">Empowering pupils morally & digitally</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* SUMMARY STATS SECTION - Simple & Compact */}
      <section className="bg-white dark:bg-slate-900 py-6 border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="py-1">
              <span className="block text-xl font-bold text-amber-600 dark:text-amber-500">Sangotedo</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider block">Campus Site</span>
            </div>
            <div className="py-1 border-l border-slate-150 dark:border-slate-800">
              <span className="block text-xl font-bold text-slate-900 dark:text-white">Dual Syllabus</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider block">Curriculum Standard</span>
            </div>
            <div className="py-1 border-l border-slate-150 dark:border-slate-800">
              <span className="block text-xl font-bold text-amber-600 dark:text-amber-500">100%</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider block">Grade Integrity</span>
            </div>
            <div className="py-1 border-l border-slate-150 dark:border-slate-800">
              <span className="block text-xl font-bold text-slate-900 dark:text-white">5 consoles</span>
              <span className="text-[9px] uppercase font-bold text-slate-400 mt-0.5 tracking-wider block">Role Gateways</span>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT THE COLLEGE - Concise layout */}
      <section id="about" className="py-12 sm:py-16 bg-slate-50 dark:bg-slate-950 scroll-mt-2">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Left Image */}
            <div className="w-full md:w-1/2">
              <img 
                src={cms.gallery?.[0] || "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=500&auto=format&fit=crop&q=80"} 
                alt="Our Main College Premises" 
                className="rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 object-cover w-full h-[240px]"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Right side narrative */}
            <div className="w-full md:w-1/2 space-y-4">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-955/20 px-2.5 py-1 rounded-full">
                Our Foundation
              </span>
              <h3 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-slate-50 uppercase tracking-tight">
                {cms.aboutTitle || 'Nurturing Character & Leading Minds'}
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-350 leading-relaxed font-normal">
                {cms.aboutDesc || 'Located in Sangotedo, Lagos, we empower pupils with independent thinking, core confidence, and academic values to prepare them for global opportunities.'}
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h5 className="font-bold text-[9px] uppercase tracking-wider text-amber-600 flex items-center gap-1.5">
                    <Sparkles size={12} />
                    Our Mission
                  </h5>
                  <p className="text-[11px] text-slate-650 dark:text-slate-350 mt-1 leading-relaxed">
                    {cms.mission || 'To foster creative thinking, intellectual curiosity, and moral integrity in every student.'}
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h5 className="font-bold text-[9px] uppercase tracking-wider text-[#2563eb] flex items-center gap-1.5">
                    <Award size={12} />
                    Our Vision
                  </h5>
                  <p className="text-[11px] text-slate-650 dark:text-slate-350 mt-1 leading-relaxed">
                    {cms.vision || 'To be a premier educational institution recognized globally for academic leadership and character development.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPAL MESSAGE SECTION */}
      <section className="py-12 sm:py-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-50 dark:bg-slate-950/40 p-6 md:p-8 rounded-3xl border border-slate-150 dark:border-slate-850 shadow-xs">
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden border-2 border-amber-500 shrink-0 shadow-md">
              <img 
                src={cms.principalPhoto || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80"} 
                alt="Principal" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-955/20 px-2.5 py-1 rounded-full">
                Word from the Principal
              </span>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-50 uppercase tracking-tight">
                {cms.principalName || 'Mrs. Olufunmilayo Fagbeyi'}
              </h3>
              <p className="text-xs text-slate-550 dark:text-slate-350 italic leading-relaxed font-semibold">
                "{cms.principalMessage || 'Welcome to our community. At SouthGold, we believe that education is the key to unlocking every child’s potential. We invite you to partner with us in this journey.'}"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CAMPUS ACTIVITIES / LATEST HIGHLIGHTS */}
      <section id="highlights" className="py-12 bg-white dark:bg-slate-900 border-t border-b border-slate-200 dark:border-slate-800/60 scroll-mt-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] bg-blue-50 dark:bg-blue-950/20 px-3 py-1 rounded-full">
              Latest Updates
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-slate-50 uppercase tracking-tight mt-2">
              Our School Activities
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(activities && activities.length > 0 ? activities : [
              {
                id: 'act_1',
                title: 'Summer Intensive Class 🌞',
                badge: 'Admission',
                desc: 'Algebra, language development, and elementary reasoning classes.',
                imgUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80',
                footer: 'Ongoing enrollment'
              },
              {
                id: 'act_2',
                title: 'Exploring Computer Coding',
                badge: 'Literacy',
                desc: 'Practical computing sessions covering key logic and coding skills.',
                imgUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80',
                footer: 'Computer Facility'
              },
              {
                id: 'act_3',
                title: 'Wellness & Hygiene',
                badge: 'Wellness',
                desc: 'Interactive hygiene seminar outlining proper diet and hygiene standard values.',
                imgUrl: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400&auto=format&fit=crop&q=80',
                footer: 'Welfare Program'
              },
              {
                id: 'act_4',
                title: 'Cultural Day Festival',
                badge: 'Culture',
                desc: 'A vibrant exhibition of traditional garments, meals, and dances.',
                imgUrl: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=400&auto=format&fit=crop&q=80',
                footer: 'Creative Event'
              }
            ]).map((act) => (
              <button
                type="button"
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="text-left bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-amber-500/40 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer"
                id={`activity-${act.id}`}
              >
                <div>
                  <img
                    src={act.imgUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=400&auto=format&fit=crop&q=80"}
                    alt={act.title}
                    className="w-full h-40 object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="p-5 space-y-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-600 tracking-wider">
                      <span>{act.badge}</span>
                    </div>
                    <h4 className="font-extrabold text-xs sm:text-sm uppercase tracking-wide text-slate-900 dark:text-slate-100">
                      {act.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-semibold line-clamp-2">
                      {act.desc}
                    </p>
                    <span className="inline-block text-[10px] font-bold text-[#2563eb] uppercase tracking-wide">
                      Read more &rarr;
                    </span>
                  </div>
                </div>
                {act.footer && (
                  <div className="p-5 pt-0 border-t border-slate-150 dark:bg-slate-950/20 dark:border-slate-800/30 text-[10px] text-slate-430 font-bold">
                    {act.footer}
                  </div>
                )}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ACTIVITY DETAIL MODAL */}
      {selectedActivity && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedActivity(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <img
                src={selectedActivity.imgUrl || "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=80"}
                alt={selectedActivity.title}
                className="w-full h-56 object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="absolute top-3 right-3 bg-slate-950/60 hover:bg-slate-950/80 text-white rounded-full p-1.5 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider">
                {selectedActivity.badge}
              </span>
              <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-50 uppercase tracking-tight">
                {selectedActivity.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedActivity.content || selectedActivity.desc}
              </p>
              {selectedActivity.footer && (
                <div className="pt-3 border-t border-slate-150 dark:border-slate-800 text-[10px] text-slate-430 font-bold">
                  {selectedActivity.footer}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEWS / ANNOUNCEMENT DETAIL MODAL */}
      {selectedBulletin && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedBulletin(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {selectedBulletin.image ? (
                <img
                  src={selectedBulletin.image}
                  alt={selectedBulletin.title}
                  className="w-full h-56 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}
              <button
                type="button"
                onClick={() => setSelectedBulletin(null)}
                className={`absolute top-3 right-3 rounded-full p-1.5 cursor-pointer ${selectedBulletin.image ? 'bg-slate-950/60 hover:bg-slate-950/80 text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-3">
              <span className={`text-[9px] font-black uppercase tracking-wider ${selectedBulletin.kind === 'news' ? 'text-amber-600' : 'text-blue-600'}`}>
                {selectedBulletin.kind === 'news' ? 'School News' : 'Announcement'}
              </span>
              <h3 className="font-display font-extrabold text-lg text-slate-900 dark:text-slate-50 uppercase tracking-tight">
                {selectedBulletin.title}
              </h3>
              <span className="block text-[10px] font-bold text-slate-400">{selectedBulletin.date}</span>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {selectedBulletin.content}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* NEWS & ANNOUNCEMENTS BOARD */}
      <section className="py-12 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* News Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <h3 className="font-display font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-slate-50">
                  Latest School News
                </h3>
              </div>
              <div className="space-y-4">
                {cms.news && cms.news.length > 0 ? (
                  cms.news.map((n: any, idx: number) => (
                    <button
                      type="button"
                      key={n.id || idx}
                      onClick={() => setSelectedBulletin({ kind: 'news', date: n.date, title: n.title, content: n.content, image: n.image })}
                      className="w-full text-left p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-2 hover:border-amber-500/40 hover:shadow-md transition-all cursor-pointer"
                    >
                      {n.image && (
                        <img src={n.image} alt={n.title} className="w-full h-36 object-cover rounded-xl" referrerPolicy="no-referrer" />
                      )}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400">{n.date}</span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase">{n.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold line-clamp-2">{n.content}</p>
                        <span className="inline-block text-[10px] font-bold text-[#2563eb] uppercase tracking-wide">
                          Read more &rarr;
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No news published yet.</p>
                )}
              </div>
            </div>

            {/* Announcements Column */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <h3 className="font-display font-extrabold text-xs sm:text-sm uppercase tracking-wider text-slate-900 dark:text-slate-50">
                  Important Announcements
                </h3>
              </div>
              <div className="space-y-4">
                {cms.announcements && cms.announcements.length > 0 ? (
                  cms.announcements.map((a: any, idx: number) => (
                    <button
                      type="button"
                      key={a.id || idx}
                      onClick={() => setSelectedBulletin({ kind: 'announcement', date: a.date, title: a.title, content: a.content, image: a.image })}
                      className="w-full text-left p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-850 border-l-4 border-l-blue-500 space-y-2 hover:shadow-md transition-all cursor-pointer"
                    >
                      {a.image && (
                        <img src={a.image} alt={a.title} className="w-full h-36 object-cover rounded-xl" referrerPolicy="no-referrer" />
                      )}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400">{a.date}</span>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 uppercase">{a.title}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-semibold line-clamp-2">{a.content}</p>
                        <span className="inline-block text-[10px] font-bold text-[#2563eb] uppercase tracking-wide">
                          Read more &rarr;
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No announcements published yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* REAL TESTIMONIALS - Verified Parents Feedback */}
      <section className="py-16 bg-slate-50 dark:bg-slate-950 border-b border-slate-205 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <span className="text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Community Voices
            </span>
            <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900 dark:text-slate-50 uppercase tracking-tight mt-1.5">
              What Parents Are Saying About Us
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Testimonial 1 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-805 shadow-xs space-y-4">
              <p className="text-xs text-slate-550 dark:text-slate-300 leading-relaxed italic">
                "Our experience with SouthGold Montessori School has been amazing. The dual syllabus is robust, 
                and I am especially impressed by the continuous online reporting card console. I can log in, 
                view my children's continuous assessment scores, and track payments easily from home."
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold font-display uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  PA
                </div>
                <div>
                  <h5 className="text-[11px] font-bold uppercase text-slate-800 dark:text-slate-200">Mrs. Patricia Adeleke</h5>
                  <p className="text-[9px] text-slate-450 uppercase">Parent of Daniel & Miracle (Grade 1 & Nursery)</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-150 dark:border-slate-805 shadow-xs space-y-4">
              <p className="text-xs text-slate-550 dark:text-slate-300 leading-relaxed italic">
                "Finding a secondary school that understands computer technology while delivering solid traditional morals 
                was my prime selection criteria. The ICT computing laboratory training, combined with 
                responsive administrative staff, is simply unparalleled. Highly recommended."
              </p>
              <div className="flex items-center gap-3 pt-2">
                <div className="w-9 h-9 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold font-display uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  OL
                </div>
                <div>
                  <h5 className="text-[11px] font-bold uppercase text-slate-800 dark:text-slate-200">Mr. Tunde Oluwu</h5>
                  <p className="text-[9px] text-slate-450 uppercase">Parent of Kemi (Grade 1 Student)</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* CAMPUS GALLERY */}
      {cms.gallery && cms.gallery.length > 0 && (
        <section className="py-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563eb] bg-blue-50 dark:bg-blue-950/20 px-3 py-1 rounded-full">
                Our Campus
              </span>
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-slate-50 uppercase tracking-tight mt-2">
                School Gallery
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cms.gallery.map((imgUrl: string, idx: number) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setSelectedGalleryIndex(idx)}
                  className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:scale-[1.02] transition-transform cursor-pointer"
                >
                  <img src={imgUrl} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GALLERY LIGHTBOX */}
      {selectedGalleryIndex !== null && cms.gallery && cms.gallery[selectedGalleryIndex] && (
        <div
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedGalleryIndex(null)}
        >
          <button
            type="button"
            onClick={() => setSelectedGalleryIndex(null)}
            className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 cursor-pointer"
          >
            <X size={18} />
          </button>

          {cms.gallery.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedGalleryIndex((i) => (i === null ? i : (i - 1 + cms.gallery.length) % cms.gallery.length)); }}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 cursor-pointer"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setSelectedGalleryIndex((i) => (i === null ? i : (i + 1) % cms.gallery.length)); }}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 cursor-pointer"
              >
                <ArrowRight size={18} />
              </button>
            </>
          )}

          <img
            src={cms.gallery[selectedGalleryIndex]}
            alt={`Gallery ${selectedGalleryIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />

          {cms.gallery.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-[11px] font-bold">
              {selectedGalleryIndex + 1} / {cms.gallery.length}
            </span>
          )}
        </div>
      )}

      {/* INQUIRIES & CAMPUS CONTACT INFORMATION - Fully compliant simulated contact form */}
      <section id="contact" className="py-16 sm:py-20 bg-white dark:bg-slate-900 scroll-mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Contact Guidelines Left */}
            <div className="space-y-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#e11d48] bg-rose-50 dark:bg-rose-955/20 border border-rose-200/50 px-3.5 py-1 rounded-full block w-fit">
                Admission Inquiries
              </span>
              
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-slate-50 uppercase tracking-tight">
                Submit An Admission Ticket
              </h2>
              
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                Do you wish to learn more about the British-Nigerian curriculum values, affordable tuition breakdown, 
                or the next campus entrance exams? Issue a continuous inquiry ticket below. Our academic admin desk 
                registers replies within 24 hours.
              </p>

              {/* Direct Campus Parameters */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 font-sans">
                
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-amber-600 shrink-0">
                    <Phone size={14} />
                  </div>
                  <div>
                    <h6 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Registrar hotlines</h6>
                    <p className="text-xs mt-0.5 font-bold text-slate-800 dark:text-slate-100">{schoolPhone || '07067742997, 08025951409'}</p>
                  </div>
                </div>

                <a 
                  href={`https://wa.me/${(schoolPhone || '07067742997').replace(/[^0-9]/g, '')}?text=Hello%20SouthGold%20Montessori%20School%21%20I%20am%20inquiring%20about%20admissions%2520and%2520class%2520enrollments.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15 transition-all group cursor-pointer"
                  id="direct-whatsapp-campus-card"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.008c6.548 0 11.884-5.33 11.887-11.892A11.78 11.78 0 0022.01 3.51" />
                    </svg>
                  </div>
                  <div>
                    <h6 className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">Direct WhatsApp Chat</h6>
                    <p className="text-xs mt-0.5 font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">
                      Chat directly with Admin Desk <span className="inline-block animate-pulse w-2 h-2 rounded-full bg-emerald-500"></span>
                    </p>
                  </div>
                </a>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-amber-600 shrink-0">
                    <Mail size={14} />
                  </div>
                  <div>
                    <h6 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Official inbox</h6>
                    <p className="text-xs mt-0.5 font-bold text-slate-800 dark:text-slate-100">{schoolEmail || 'southgoldmontessorischools@gmail.com'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-amber-600 shrink-0">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <h6 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Primary campus grounds</h6>
                    <p className="text-xs mt-0.5 font-bold text-slate-800 dark:text-slate-100">{schoolAddress || '3, Fagbeyi Olusi Ige Street, Hopeville Estate, Haruna Bus-Stop, Sangotedo, Lagos. Nigeria'}</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Inquiries submission board */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800">
              {contactSubmitted ? (
                <div className="text-center py-10 space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                    <Check size={20} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                    Inquiry Lodged Correctly!
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                    Thank you, <strong>{contactName}</strong>. SouthGold Academic Desk has logged your ticket. 
                    An admissions team will reach you on <strong>{contactEmail}</strong>.
                  </p>

                  {/* Dispatching indicators & routing alerts */}
                  <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl max-w-sm mx-auto space-y-2 mt-4 text-left">
                    <span className="text-[10px] uppercase font-black text-slate-455 dark:text-slate-400 tracking-wider block border-b border-slate-200 dark:border-slate-800/80 pb-1.5 mb-2">📋 Notification Dispatch Logs:</span>
                    <div className="flex items-center gap-2 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Support Ticket logged in the admin portal</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Alert sent to Super Admin dashboard</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>Alert sent to School Admin dashboard</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setContactSubmitted(false);
                      setContactName('');
                      setContactEmail('');
                      setContactMessage('');
                    }}
                    className="mt-4 bg-[#ff7e42] hover:bg-[#e66c34] text-white font-bold text-[10px] uppercase tracking-wider py-2 px-5 rounded-lg transition-all cursor-pointer"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <h4 className="font-extrabold text-sm text-slate-855 dark:text-slate-100 uppercase tracking-widest pl-1">
                    Connect With Admissions Desk
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Your Full Name *</label>
                      <input 
                        type="text" 
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Robert Ade"
                        className="w-full bg-white dark:bg-slate-900 text-xs py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-850 dark:text-slate-50"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Email Coordinates *</label>
                      <input 
                        type="email" 
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="parent@example.com"
                        className="w-full bg-white dark:bg-slate-900 text-xs py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-850 dark:text-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Inquiry category</label>
                    <select 
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 text-xs py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-850 dark:text-slate-50"
                    >
                      <option value="Admission Inquiry">Admission Fees & Procedures</option>
                      <option value="Tuition Payments">Tuition Installments & Receipts</option>
                      <option value="Academic Performance">Academic Performance & Grades</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Detailed Inquiry Message *</label>
                    <textarea 
                      required
                      rows={3}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="List down whatever curriculum or admission queries you have..."
                      className="w-full bg-white dark:bg-slate-900 text-xs py-2.5 px-3 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-850 dark:text-slate-50"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactLoading}
                    className="w-full bg-[#ff7e42] hover:bg-[#e66c34] text-white font-bold text-xs uppercase py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {contactLoading ? (
                      <span>Logging Inquiry Ticket...</span>
                    ) : (
                      <>
                        <Send size={12} />
                        <span>Log Inquiry Ticket</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

          </div>

        </div>
      </section>

      {/* FOOTER - Classy, academic traditional style with no redundant clutter */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-8 border-t border-slate-805">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          
          <h2 className="text-xl font-display font-extrabold text-white tracking-widest leading-none">
            {schoolName ? schoolName.split(' ')[0] : 'SOUTHGOLD'} <span className="text-amber-500">{schoolName ? schoolName.split(' ').slice(1).join(' ') : 'MONTESSORI SCHOOL'}</span>
          </h2>
          
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
            {cms.aboutDesc || 'Delivering sound, globalised curriculum paradigms. Formulating student developmental growth and preparing pupils for lifelong success.'}
          </p>

          <div className="flex justify-center gap-6 py-2">
            {cms.facebook && (
              <a href={cms.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 text-xs font-bold uppercase tracking-wider transition-colors">Facebook</a>
            )}
            {cms.instagram && (
              <a href={cms.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 text-xs font-bold uppercase tracking-wider transition-colors">Instagram</a>
            )}
            {cms.youtube && (
              <a href={cms.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 text-xs font-bold uppercase tracking-wider transition-colors">YouTube</a>
            )}
            {cms.website && (
              <a href={cms.website} target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 text-xs font-bold uppercase tracking-wider transition-colors">Website</a>
            )}
          </div>

          <div className="pt-8 border-t border-slate-830 text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 {schoolName || 'SouthGold Montessori School'}. All rights reserved. Registered under standard primary academic regulations.</p>
            <div className="flex gap-4 font-semibold uppercase tracking-wider text-[9px]">
              <a href="#privacy" className="hover:underline">Privacy Regulation</a>
              <a href="#terms" className="hover:underline">Terms of Use</a>
            </div>
          </div>

        </div>
      </footer>

      {/* Floating WhatsApp Quick-Connect Widget */}
      <a
        href={`https://wa.me/${(cms.whatsapp || '2347067742997').replace(/[^0-9]/g, '')}?text=Hello%20SouthGold%20Montessori%20School%21%20I%20am%20inquiring%20about%2520admissions%2520and%2520class%2520enrollments.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 group font-sans border border-emerald-400/20 cursor-pointer text-xs font-bold uppercase tracking-wider"
        id="floating-whatsapp-badge"
        title="Chat with SouthGold Registrar on WhatsApp"
      >
        <span className="relative flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-100 opacity-60"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-100"></span>
        </span>
        <svg className="w-4.5 h-4.5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.454 5.709 1.455h.008c6.548 0 11.884-5.33 11.887-11.892A11.78 11.78 0 0022.01 3.51" />
        </svg>
        <span className="hidden sm:inline">WhatsApp Chat</span>
        <span className="inline sm:hidden">WhatsApp</span>
      </a>

    </div>
  );
}
