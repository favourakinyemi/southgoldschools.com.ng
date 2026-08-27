import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  GraduationCap,
  Laptop,
  Lock,
  Mail,
  MapPin,
  Menu,
  Moon,
  Phone,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sun,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { PUBLIC_ROUTES } from '../publicRoutes';
import { SchoolActivity, UserRole } from '../types';

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

interface EnquiryFormState {
  parentName: string;
  phone: string;
  email: string;
  childName: string;
  childAge: string;
  classApplyingFor: string;
  preferredContact: string;
  message: string;
}

const SITE_URL = 'https://southgoldschools.com.ng';
const DEFAULT_SCHOOL_NAME = 'SouthGold Schools';
const DEFAULT_ADDRESS = '3, Fagbeyi Ige, Olusi Crescent, Hopeville Estate, Haruna Bus-Stop, Sangotedo, Lagos, Nigeria';
const DEFAULT_EMAIL = 'southgoldmontessorischools@gmail.com';
const DEFAULT_PHONE = '07067742997, 08025951409';

const fallbackCms = {
  motto: 'Learn and grow together.',
  whatsapp: '+2347067742997',
  facebook: '',
  instagram: '',
  youtube: '',
  website: SITE_URL,
  welcomeTitle: 'Welcome to SouthGold Schools',
  welcomeDesc:
    'SouthGold Schools provides a caring learning environment where pupils are guided to grow in knowledge, confidence, character, and creativity.',
  aboutTitle: 'A calm, purposeful place to learn',
  aboutDesc:
    'We combine strong classroom teaching with attentive guidance, practical learning, and values that help children become capable young people.',
  mission: 'To foster creative thinking, intellectual curiosity, and moral integrity in every student.',
  vision: 'To be a leading educational institution recognised for academic strength and character development.',
  principalMessage:
    'Welcome to our community. At SouthGold, we believe that education should nurture the whole child and prepare every learner for lifelong growth.',
  principalName: '',
  principalPhoto: '',
  heroImages: [],
  gallery: [],
  admissionsTitle: 'Admissions are open',
  admissionsDesc:
    'We welcome enquiries from parents who want a warm, structured, and ambitious school environment for their children.',
  news: [],
  announcements: [],
};

const portalRolesConfig = [
  { role: 'SUPER_ADMIN' as UserRole, title: 'Super Admin', badge: 'Master Access', desc: 'Full administrator control over settings, records, and school operations.', icon: ShieldAlert },
  { role: 'SCHOOL_ADMIN' as UserRole, title: 'Staff Admin', badge: 'Management', desc: 'Manage students, classes, subjects, attendance, and school records.', icon: UserCheck },
  { role: 'TEACHER' as UserRole, title: 'Teacher Portal', badge: 'Academics', desc: 'Record assessments, manage attendance, and follow assigned classes.', icon: BookOpen },
  { role: 'PARENT' as UserRole, title: 'Parent Portal', badge: 'Families', desc: 'Follow your child\'s results, attendance, notices, and support messages.', icon: Users },
  { role: 'STUDENT' as UserRole, title: 'Student Portal', badge: 'Learners', desc: 'View personal academic records and school updates.', icon: GraduationCap },
];

const PATH_TO_ROLE: Record<string, UserRole> = {
  '/login/super-admin': 'SUPER_ADMIN',
  '/login/staff-admin': 'SCHOOL_ADMIN',
  '/login/teacher': 'TEACHER',
  '/login/parent': 'PARENT',
  '/login/student': 'STUDENT',
};

const ROLE_TO_PATH: Record<UserRole, string> = {
  SUPER_ADMIN: '/login/super-admin',
  SCHOOL_ADMIN: '/login/staff-admin',
  TEACHER: '/login/teacher',
  PARENT: '/login/parent',
  STUDENT: '/login/student',
};

const stageSummaries = [
  {
    title: 'Early Years / Montessori',
    kicker: 'A gentle start',
    desc: 'A nurturing foundation where young learners build language, number sense, independence, social confidence, and curiosity through guided activities.',
  },
  {
    title: 'Primary School',
    kicker: 'Strong basics',
    desc: 'Focused teaching in core subjects, reading, writing, numeracy, creative expression, and personal responsibility.',
  },
  {
    title: 'Secondary School',
    kicker: 'Growing confidence',
    desc: 'Structured academic work, wider subject exposure, digital learning, leadership habits, and preparation for the next stage.',
  },
];

const strengths = [
  'Academic excellence',
  'Individual attention',
  'Character development',
  'ICT and digital learning',
  'Safe learning environment',
  'Qualified teachers',
  'Creativity',
  'Extracurricular development',
];

const admissionSteps = [
  'Make an enquiry',
  'Speak with the admissions team',
  'Complete application',
  'Assessment or interview where applicable',
  'Admission confirmation',
  'Enrollment',
];

const requiredProgrammeGroups = [
  { title: 'Pre-School', classes: ['Toddler', 'Preschool 1', 'Preschool 2', 'Reception'] },
  { title: 'Primary School', classes: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'] },
  { title: 'Junior Secondary School', classes: ['JSS 1', 'JSS 2', 'JSS 3'] },
  { title: 'Senior Secondary School', classes: ['SS 1', 'SS 2', 'SS 3'] },
];

const syntheticBulletinTitles = new Set([
  'Inter-House Sports Festival 2026',
  'STEAM Exhibition Day',
  'Resumption for Third Term',
]);

function formatPhoneForWhatsApp(value: string) {
  const digits = value.replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) return `234${digits.slice(1)}`;
  return digits || '2347067742997';
}

function getImage(cms: any, index = 0) {
  const images = [
    ...(Array.isArray(cms.heroImages) ? cms.heroImages : []),
    ...(Array.isArray(cms.gallery) ? cms.gallery : []),
  ].filter(Boolean);
  return images[index % Math.max(images.length, 1)] || '';
}

function isSuitableSchoolPhoto(src?: string) {
  if (!src) return false;
  const lowered = src.toLowerCase();
  return !['summer', 'banner', 'flyer', 'chatgpt', 'promo', 'promotion'].some((term) => lowered.includes(term));
}

function getSchoolPhoto(cms: any, index = 0) {
  const images = [
    ...(Array.isArray(cms.heroImages) ? cms.heroImages : []),
    ...(Array.isArray(cms.gallery) ? cms.gallery : []),
    cms.principalPhoto,
  ].filter(isSuitableSchoolPhoto);
  return images[index % Math.max(images.length, 1)] || '';
}

function classifyProgramme(classId: string) {
  const value = classId.trim().toLowerCase().replace(/\s+/g, ' ');
  if (['toddler', 'preschool 1', 'preschool 2', 'reception'].includes(value)) return 'Pre-School';
  if (/^year\s*[1-5]$/.test(value)) return 'Primary School';
  if (/^jss\s*[1-3]$/.test(value)) return 'Junior Secondary School';
  if (/^ss\s*[1-3]$/.test(value)) return 'Senior Secondary School';
  if (value.includes('preschool') || value.includes('pre-school') || value.includes('reception') || value.includes('toddler')) return 'Pre-School';
  if (value.includes('jss')) return 'Junior Secondary School';
  if (value.includes('ss')) return 'Senior Secondary School';
  return 'Primary School';
}

function buildProgrammeGroups(classes: { classId: string; stage?: string }[]) {
  const groups = requiredProgrammeGroups.map((group) => ({ ...group, classes: [...group.classes] }));
  const seen = new Set(groups.flatMap((group) => group.classes.map((classId) => classId.toLowerCase())));

  classes.forEach((item) => {
    const classId = item.classId?.trim();
    if (!classId || seen.has(classId.toLowerCase())) return;
    const groupTitle = classifyProgramme(classId);
    const group = groups.find((entry) => entry.title === groupTitle);
    if (group) {
      group.classes.push(classId);
      seen.add(classId.toLowerCase());
    }
  });

  return groups;
}

function buildWhatsAppMessage(formState: EnquiryFormState) {
  return [
    'Hello SouthGold Schools,',
    '',
    'I would like to make an admission enquiry.',
    '',
    `Parent / Guardian Name: ${formState.parentName}`,
    `Phone: ${formState.phone}`,
    `Email: ${formState.email}`,
    `Child's Name: ${formState.childName}`,
    `Child's Age: ${formState.childAge}`,
    `Class Interested In: ${formState.classApplyingFor}`,
    `Preferred Contact Method: ${formState.preferredContact}`,
    '',
    'Message:',
    formState.message || 'No additional message supplied.',
    '',
    'Thank you.',
  ].join('\n');
}

function imageAlt(schoolName: string, label: string) {
  return `${label} at ${schoolName}`;
}

function EditorialImage({ src, alt, label, tall = false }: { src?: string; alt: string; label: string; tall?: boolean }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading={tall ? 'eager' : 'lazy'}
        className={`h-full min-h-[260px] w-full object-cover ${tall ? 'lg:min-h-[560px]' : ''}`}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div
      className={`flex h-full min-h-[260px] w-full items-end bg-[linear-gradient(135deg,#07172f_0%,#10294e_52%,#c99a2e_100%)] p-6 text-white ${tall ? 'lg:min-h-[560px]' : ''}`}
      role="img"
      aria-label={alt}
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200">Image placeholder</p>
        <p className="mt-2 max-w-xs text-sm text-white/85">{label}</p>
      </div>
    </div>
  );
}

function LogoMark({ logoUrl, schoolName, invert = false }: { logoUrl?: string; schoolName: string; invert?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {logoUrl ? (
        <img src={logoUrl} alt={`${schoolName} logo`} className="h-10 w-10 object-contain" referrerPolicy="no-referrer" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center bg-[#c99a2e] text-sm font-black text-[#07172f]">SG</div>
      )}
      <div className="leading-tight">
        <p className={`text-sm font-extrabold uppercase tracking-[0.16em] ${invert ? 'text-white' : 'text-[#07172f] dark:text-white'}`}>SouthGold</p>
        <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${invert ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}`}>Schools</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">
        {label}
        {required ? ' *' : ''}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c99a2e] focus:ring-2 focus:ring-[#c99a2e]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
    </div>
  );
}

export default function LandingPage({
  onLogin,
  darkTheme,
  onToggleTheme,
  activities = [],
  logoUrl,
  schoolName,
  schoolEmail,
  schoolPhone,
  schoolAddress,
  globalLoginError,
  initialCms,
}: LandingPageProps) {
  const [cms, setCms] = useState<any>(() => ({ ...fallbackCms, ...(initialCms ?? {}) }));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<SchoolActivity | null>(null);
  const [selectedBulletin, setSelectedBulletin] = useState<any | null>(null);
  const [classes, setClasses] = useState<{ classId: string; stage?: string }[]>([]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [formState, setFormState] = useState<EnquiryFormState>({
    parentName: '',
    phone: '',
    email: '',
    childName: '',
    childAge: '',
    classApplyingFor: '',
    preferredContact: 'Phone call',
    message: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [whatsappFallbackMessage, setWhatsappFallbackMessage] = useState<string | null>(null);

  const validPaths = useMemo(() => new Set(PUBLIC_ROUTES.map((route) => route.path)), []);
  const resolvePathFromLocation = useCallback((location: Location) => {
    const redirectPath = new URLSearchParams(location.search).get('redirect');
    if (redirectPath) {
      const safePath = redirectPath.split('?')[0];
      if (validPaths.has(safePath)) return safePath;
    }
    return validPaths.has(location.pathname) ? location.pathname : '/';
  }, [validPaths]);
  const [currentPath, setCurrentPath] = useState(() => resolvePathFromLocation(window.location));

  const displayName = schoolName || cms.schoolName || DEFAULT_SCHOOL_NAME;
  const displayEmail = schoolEmail || DEFAULT_EMAIL;
  const displayPhone = schoolPhone || DEFAULT_PHONE;
  const displayAddress = schoolAddress || DEFAULT_ADDRESS;
  const whatsappNumber = formatPhoneForWhatsApp(cms.whatsapp || displayPhone);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayAddress)}`;
  const recentNews = [...(cms.news || []), ...(cms.announcements || [])]
    .filter((item) => item && !syntheticBulletinTitles.has(item.title))
    .slice(0, 3);
  const programmeGroups = useMemo(() => buildProgrammeGroups(classes), [classes]);
  const programmeOptions = useMemo(() => programmeGroups.flatMap((group) => group.classes), [programmeGroups]);
  const heroPhoto = getSchoolPhoto(cms, 0);
  const welcomePhoto = getSchoolPhoto(cms, 1);

  useEffect(() => {
    fetch('/api/cms')
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setCms((existing: any) => ({ ...existing, ...data }));
      })
      .catch((err) => console.error('Error fetching CMS:', err));

    fetch('/api/classes-subjects')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    const handlePopState = () => setCurrentPath(resolvePathFromLocation(window.location));
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resolvePathFromLocation]);

  useEffect(() => {
    if (globalLoginError) setLoginError(globalLoginError);
  }, [globalLoginError]);

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

  const handleNavigate = (path: string) => {
    const nextPath = validPaths.has(path) ? path : '/';
    setCurrentPath(nextPath);
    setMobileOpen(false);
    window.history.pushState(null, '', nextPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateForm = (key: keyof EnquiryFormState, value: string) => {
    setFormState((state) => ({ ...state, [key]: value }));
  };

  const validateForm = () => {
    if (!formState.parentName.trim()) return 'Please enter the parent or guardian name.';
    if (!formState.phone.trim()) return 'Please enter a phone number.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formState.email.trim())) return 'Please enter a valid email address.';
    if (!formState.childName.trim()) return 'Please enter the child\'s name.';
    if (!formState.childAge.trim()) return 'Please enter the child\'s age.';
    if (!formState.classApplyingFor.trim()) return 'Please select or enter the class applying for.';
    return null;
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setFormError(null);
    setWhatsappFallbackMessage(null);
    setContactLoading(true);
    const whatsappWindow = window.open('', '_blank');

    const message = [
      `Parent/Guardian: ${formState.parentName}`,
      `Phone: ${formState.phone}`,
      `Email: ${formState.email}`,
      `Child: ${formState.childName}`,
      `Age: ${formState.childAge}`,
      `Class Applying For: ${formState.classApplyingFor}`,
      `Preferred Contact: ${formState.preferredContact}`,
      `Message: ${formState.message || 'No additional message supplied.'}`,
    ].join('\n');

    const ticketPayload = {
      senderName: `Admission Inquiry: ${formState.parentName}`,
      senderEmail: formState.email,
      senderRole: 'PARENT' as UserRole,
      subject: `[Admissions] ${formState.classApplyingFor}`,
      message,
      status: 'Open' as const,
      createdAt: new Date().toISOString(),
      replies: [],
    };

    const notificationPayloads = (['SUPER_ADMIN', 'SCHOOL_ADMIN'] as const).map((recipientRole) => ({
      title: 'New Admission Enquiry',
      content: `${formState.parentName} submitted an admission enquiry for ${formState.childName} (${formState.classApplyingFor}).`,
      category: 'System' as const,
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      recipientRole,
    }));

    try {
      const ticketRes = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticketPayload),
      });
      if (!ticketRes.ok) throw new Error('The enquiry could not be saved. Please try again or contact the school directly.');

      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notificationPayloads),
      });

      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(buildWhatsAppMessage(formState))}`;
      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      } else {
        setWhatsappFallbackMessage(`Your enquiry was received, but WhatsApp did not open automatically. Please message ${cms.whatsapp || displayPhone}.`);
      }

      setContactSubmitted(true);
      setFormState({
        parentName: '',
        phone: '',
        email: '',
        childName: '',
        childAge: '',
        classApplyingFor: '',
        preferredContact: 'Phone call',
        message: '',
      });
    } catch (err: any) {
      if (whatsappWindow) whatsappWindow.close();
      setFormError(err.message || 'The enquiry could not be sent. Please try again.');
    } finally {
      setContactLoading(false);
    }
  };

  const submitLogin = async (e: React.FormEvent, role?: UserRole) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      await onLogin(emailInput, passwordInput, role, rememberMe);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  const JsonLd = () => (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'EducationalOrganization',
          name: displayName,
          url: SITE_URL,
          logo: logoUrl || undefined,
          telephone: displayPhone,
          email: displayEmail,
          address: {
            '@type': 'PostalAddress',
            streetAddress: displayAddress,
            addressLocality: 'Sangotedo',
            addressRegion: 'Lagos',
            addressCountry: 'NG',
          },
          sameAs: [cms.facebook, cms.instagram, cms.youtube].filter(Boolean),
        }),
      }}
    />
  );

  const PublicNav = () => (
    <header className={`${currentPath === '/' ? 'absolute border-white/15 bg-transparent text-white' : 'sticky border-slate-200/80 bg-white/95 text-slate-900 dark:border-slate-800 dark:bg-slate-950/95 dark:text-white'} top-0 z-50 w-full border-b backdrop-blur`}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => handleNavigate('/')} className="text-left">
          <LogoMark logoUrl={logoUrl} schoolName={displayName} invert={currentPath === '/'} />
        </button>

        <nav className={`hidden items-center gap-8 text-sm font-semibold lg:flex ${currentPath === '/' ? 'text-white/90' : 'text-slate-700 dark:text-slate-200'}`}>
          <button onClick={() => handleNavigate('/')} className={currentPath === '/' ? 'text-[#c99a2e]' : 'hover:text-[#c99a2e]'}>Home</button>
          <button onClick={() => handleNavigate('/about')} className={currentPath === '/about' ? 'text-[#c99a2e]' : 'hover:text-[#c99a2e]'}>About & Academics</button>
          <button onClick={() => handleNavigate('/admissions')} className={currentPath === '/admissions' ? 'text-[#c99a2e]' : 'hover:text-[#c99a2e]'}>Admissions</button>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <button type="button" onClick={onToggleTheme} className={`flex h-10 w-10 items-center justify-center border transition hover:border-[#c99a2e] hover:text-[#c99a2e] ${currentPath === '/' ? 'border-white/30 text-white' : 'border-slate-200 text-slate-700 dark:border-slate-800 dark:text-slate-200'}`} aria-label="Toggle theme">
            {darkTheme ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button onClick={() => handleNavigate('/login')} className={`border px-4 py-2 text-sm font-bold transition ${currentPath === '/' ? 'border-white/50 text-white hover:border-[#c99a2e] hover:text-[#c99a2e]' : 'border-[#07172f] text-[#07172f] hover:bg-[#07172f] hover:text-white dark:border-white dark:text-white'}`}>Portal Login</button>
          <button onClick={() => handleNavigate('/admissions')} className="bg-[#c99a2e] px-4 py-2 text-sm font-bold text-[#07172f] transition hover:bg-[#b38928]">Apply / Enquire</button>
        </div>

        <button type="button" onClick={() => setMobileOpen((open) => !open)} className={`flex h-10 w-10 items-center justify-center border lg:hidden ${currentPath === '/' ? 'border-white/30 text-white' : 'border-slate-200 text-[#07172f] dark:border-slate-800 dark:text-white'}`} aria-label="Open menu" aria-expanded={mobileOpen}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-2 text-sm font-semibold">
            {[
              ['Home', '/'],
              ['About & Academics', '/about'],
              ['Admissions', '/admissions'],
              ['Portal Login', '/login'],
            ].map(([label, path]) => (
              <button key={path} onClick={() => handleNavigate(path)} className="px-2 py-3 text-left text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">{label}</button>
            ))}
            <button onClick={onToggleTheme} className="flex items-center gap-2 px-2 py-3 text-left text-slate-700 dark:text-slate-200">
              {darkTheme ? <Sun size={16} /> : <Moon size={16} />} Theme
            </button>
          </div>
        </div>
      )}
    </header>
  );

  const Footer = () => (
    <footer className="bg-[#07172f] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_0.8fr_1fr] lg:px-8">
        <div>
          <LogoMark logoUrl={logoUrl} schoolName={displayName} />
          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">{cms.aboutDesc || fallbackCms.aboutDesc}</p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Navigation</h2>
          <div className="mt-5 grid gap-3 text-sm">
            <button onClick={() => handleNavigate('/')} className="w-fit hover:text-[#c99a2e]">Home</button>
            <button onClick={() => handleNavigate('/about')} className="w-fit hover:text-[#c99a2e]">About & Academics</button>
            <button onClick={() => handleNavigate('/admissions')} className="w-fit hover:text-[#c99a2e]">Admissions</button>
            <button onClick={() => handleNavigate('/login')} className="w-fit hover:text-[#c99a2e]">Portal Login</button>
          </div>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-white">Contact</h2>
          <div className="mt-5 space-y-3 text-sm leading-6">
            <p>{displayAddress}</p>
            <p><a href={`tel:${displayPhone.replace(/[^0-9+]/g, '')}`} className="hover:text-[#c99a2e]">{displayPhone}</a></p>
            <p><a href={`mailto:${displayEmail}`} className="hover:text-[#c99a2e]">{displayEmail}</a></p>
            <div className="flex flex-wrap gap-4 pt-2 text-xs font-bold uppercase tracking-[0.14em]">
              {cms.facebook && <a href={cms.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-[#c99a2e]">Facebook</a>}
              {cms.instagram && <a href={cms.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-[#c99a2e]">Instagram</a>}
              {cms.youtube && <a href={cms.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-[#c99a2e]">YouTube</a>}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-slate-400">Copyright {new Date().getFullYear()} {displayName}. All rights reserved.</div>
    </footer>
  );

  const HomePage = () => (
    <>
      <section className="relative flex min-h-[82vh] items-end overflow-hidden bg-[#07172f] text-white sm:min-h-[88vh]">
        {heroPhoto ? (
          <img src={heroPhoto} alt={imageAlt(displayName, 'Students learning')} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#07172f_0%,#10294e_55%,#c99a2e_140%)]" role="img" aria-label={imageAlt(displayName, 'Hero image placeholder')} />
        )}
        <div className="absolute inset-0 bg-[#07172f]/55" />
        <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#07172f] to-transparent" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-6 sm:pb-20 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="max-w-4xl text-4xl font-extrabold leading-[1.08] sm:text-6xl lg:text-7xl">Nurturing Excellence. Building Tomorrow's Leaders.</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">{cms.welcomeDesc || fallbackCms.welcomeDesc}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => handleNavigate('/admissions')} className="bg-[#c99a2e] px-6 py-3 text-sm font-bold text-[#07172f] transition hover:bg-[#d8aa3f]">Apply for Admission</button>
              <button onClick={() => handleNavigate('/about')} className="border border-white/70 px-6 py-3 text-sm font-bold text-white transition hover:border-[#c99a2e] hover:text-[#c99a2e]">Explore Our School</button>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-950">
        <div className={`mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-8 ${welcomePhoto ? 'lg:grid-cols-[0.95fr_1.05fr]' : ''}`}>
          {welcomePhoto && (
            <div className="min-h-[420px] overflow-hidden lg:-mt-28">
              <EditorialImage src={welcomePhoto} alt={imageAlt(displayName, 'School welcome')} label="Add a real welcome, classroom, or campus image." tall />
            </div>
          )}
          <div className="flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold text-[#07172f] dark:text-white">Welcome to SouthGold Schools</h2>
            <p className="mt-6 text-base leading-8 text-slate-700 dark:text-slate-300">{cms.aboutDesc || fallbackCms.aboutDesc}</p>
            <button onClick={() => handleNavigate('/about')} className="mt-7 w-fit border-b-2 border-[#c99a2e] pb-1 text-sm font-bold text-[#07172f] dark:text-white">Read About SouthGold</button>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f4ed] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Academic Stages</p>
            <h2 className="mt-4 text-3xl font-extrabold text-[#07172f]">A clear path from early learning to confident scholarship</h2>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {stageSummaries.map((stage, index) => (
              <article key={stage.title} className="bg-white">
                <div className="aspect-[4/3] overflow-hidden"><EditorialImage src={getSchoolPhoto(cms, index + 4)} alt={imageAlt(displayName, stage.title)} label={`Replace with a real ${stage.title} photograph.`} /></div>
                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9f7622]">{stage.kicker}</p>
                  <h3 className="mt-3 text-xl font-extrabold text-[#07172f]">{stage.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{stage.desc}</p>
                  <button onClick={() => handleNavigate('/about')} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#07172f] hover:text-[#9f7622]">Learn more <ArrowRight size={16} /></button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.7fr_1fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Why SouthGold</p>
            <h2 className="mt-4 text-3xl font-extrabold text-[#07172f] dark:text-white">A school experience built around the whole child</h2>
          </div>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {strengths.map((item) => (
              <div key={item} className="flex items-start gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
                <Check size={18} className="mt-1 shrink-0 text-[#c99a2e]" />
                <p className="font-semibold text-slate-800 dark:text-slate-200">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#07172f] py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="overflow-hidden"><EditorialImage src={getSchoolPhoto(cms, 7)} alt={imageAlt(displayName, 'School activities')} label="Use a real image of ICT, science, art, sports, or school activities." /></div>
          <div className="flex flex-col justify-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Learning Experience</p>
            <h2 className="mt-4 text-3xl font-extrabold">Lessons that connect knowledge with character</h2>
            <p className="mt-5 text-base leading-8 text-slate-300">SouthGold's public content highlights classroom learning, ICT, creativity, practical activities, and school events. The site uses real CMS-managed images when administrators upload them.</p>
            <div className="mt-8 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
              {['Classroom learning', 'ICT', 'Creative arts', 'Sports', 'School events', 'Practical activities'].map((item) => <span key={item} className="border border-white/15 px-4 py-3">{item}</span>)}
            </div>
          </div>
        </div>
      </section>

      {cms.principalMessage && (
        <section className="bg-white py-16 dark:bg-slate-950">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 lg:grid-cols-[220px_1fr] lg:px-8">
            <div className="overflow-hidden bg-slate-100"><EditorialImage src={cms.principalPhoto} alt={imageAlt(displayName, 'Principal')} label="Principal photograph placeholder." /></div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Principal's Message</p>
              <blockquote className="mt-4 text-xl leading-9 text-slate-800 dark:text-slate-200">"{cms.principalMessage}"</blockquote>
              {cms.principalName && <p className="mt-5 font-bold text-[#07172f] dark:text-white">{cms.principalName}</p>}
            </div>
          </div>
        </section>
      )}

      {(activities.length > 0 || recentNews.length > 0) && (
        <section className="bg-[#f7f4ed] py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Latest News / Activities</p>
              <h2 className="mt-4 text-3xl font-extrabold text-[#07172f]">What is happening at SouthGold</h2>
            </div>
            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {(activities.length ? activities.slice(0, 3) : recentNews).map((item: any, index: number) => (
                <article key={item.id || item.title} className="bg-white">
                  <div className="aspect-[4/3] overflow-hidden"><EditorialImage src={isSuitableSchoolPhoto(item.imgUrl || item.image) ? item.imgUrl || item.image : getSchoolPhoto(cms, index + 8)} alt={imageAlt(displayName, item.title)} label="Activity image placeholder." /></div>
                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9f7622]">{item.badge || item.date || 'School Update'}</p>
                    <h3 className="mt-3 text-lg font-extrabold text-[#07172f]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">{item.desc || item.content}</p>
                    <button onClick={() => (item.desc ? setSelectedActivity(item) : setSelectedBulletin(item))} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#07172f] hover:text-[#9f7622]">Read more <ArrowRight size={16} /></button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Admissions</p>
          <h2 className="mt-4 text-3xl font-extrabold text-[#07172f] dark:text-white">Give your child the foundation to excel</h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-700 dark:text-slate-300">{cms.admissionsDesc || fallbackCms.admissionsDesc}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={() => handleNavigate('/admissions')} className="bg-[#c99a2e] px-6 py-3 text-sm font-bold text-[#07172f] transition hover:bg-[#b38928]">Start Admission</button>
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="border border-[#07172f] px-6 py-3 text-sm font-bold text-[#07172f] transition hover:bg-[#07172f] hover:text-white dark:border-white dark:text-white">Speak With Us</a>
          </div>
        </div>
      </section>
    </>
  );

  const AboutPage = () => (
    <>
      <section className="relative flex min-h-[58vh] items-end overflow-hidden bg-[#07172f] text-white">
        {getSchoolPhoto(cms, 2) ? (
          <img src={getSchoolPhoto(cms, 2)} alt={imageAlt(displayName, 'School community')} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#07172f_0%,#10294e_65%,#c99a2e_145%)]" role="img" aria-label={imageAlt(displayName, 'About page image placeholder')} />
        )}
        <div className="absolute inset-0 bg-[#07172f]/62" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">About & Academics</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-6xl">About SouthGold Schools</h1>
            <p className="mt-6 text-base leading-8 text-white/85">{cms.aboutDesc || fallbackCms.aboutDesc}</p>
          </div>
        </div>
      </section>
      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          <div><h2 className="text-3xl font-extrabold text-[#07172f] dark:text-white">School Story</h2></div>
          <div className="space-y-6 text-base leading-8 text-slate-700 dark:text-slate-300 lg:col-span-2">
            <p>{cms.aboutDesc || fallbackCms.aboutDesc}</p>
            <p>{cms.welcomeDesc || fallbackCms.welcomeDesc}</p>
          </div>
        </div>
      </section>
      <section className="bg-[#f7f4ed] py-16">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="bg-white p-8"><h2 className="text-2xl font-extrabold text-[#07172f]">Mission</h2><p className="mt-4 leading-8 text-slate-700">{cms.mission || fallbackCms.mission}</p></div>
          <div className="bg-white p-8"><h2 className="text-2xl font-extrabold text-[#07172f]">Vision</h2><p className="mt-4 leading-8 text-slate-700">{cms.vision || fallbackCms.vision}</p></div>
        </div>
      </section>
      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Educational Philosophy</p><h2 className="mt-4 text-3xl font-extrabold text-[#07172f] dark:text-white">Confident learners, thoughtful character, practical skills</h2></div>
          <div className="space-y-5 text-base leading-8 text-slate-700 dark:text-slate-300">
            <p>SouthGold's approach is grounded in attentive teaching, steady academic expectations, creativity, character development, digital awareness, and confidence-building.</p>
            <p>Children are encouraged to ask questions, practise skills, work with others, and develop habits that support lifelong learning.</p>
          </div>
        </div>
      </section>
      <section className="bg-[#f7f4ed] py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Academics</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-extrabold text-[#07172f]">Programmes for each stage of growth</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {stageSummaries.map((stage) => <article key={stage.title} className="border-t-4 border-[#c99a2e] bg-white p-7"><h3 className="text-xl font-extrabold text-[#07172f]">{stage.title}</h3><p className="mt-4 text-sm leading-7 text-slate-700">{stage.desc}</p></article>)}
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="bg-white p-8"><h3 className="text-xl font-extrabold text-[#07172f]">Curriculum</h3><p className="mt-4 leading-8 text-slate-700">The project confirms Montessori, preschool, primary, and junior secondary public positioning. Specific curriculum claims should be edited by the school administrator in the CMS if more detail is required.</p></div>
            <div className="bg-white p-8"><h3 className="flex items-center gap-3 text-xl font-extrabold text-[#07172f]"><Laptop size={22} /> ICT & Digital Learning</h3><p className="mt-4 leading-8 text-slate-700">Digital literacy is presented as part of SouthGold's learning priorities, supporting pupils with technology awareness and modern learning confidence.</p></div>
          </div>
        </div>
      </section>
      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="overflow-hidden"><EditorialImage src={getSchoolPhoto(cms, 5)} alt={imageAlt(displayName, 'Beyond academics')} label="Use a real school activity or facilities image." /></div>
          <div className="flex flex-col justify-center"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Beyond Academics</p><h2 className="mt-4 text-3xl font-extrabold text-[#07172f] dark:text-white">Room for creativity, leadership, and discovery</h2><p className="mt-5 text-base leading-8 text-slate-700 dark:text-slate-300">The site reflects confirmed school activities such as sports, creative arts, events, practical learning, and excursions when these are supplied through the activities manager or CMS gallery.</p></div>
        </div>
      </section>
    </>
  );

  const AdmissionsPage = () => (
    <>
      <section className="relative flex min-h-[62vh] items-end overflow-hidden bg-[#07172f] text-white">
        {getSchoolPhoto(cms, 3) ? (
          <img src={getSchoolPhoto(cms, 3)} alt={imageAlt(displayName, 'Admissions')} className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#07172f_0%,#10294e_65%,#c99a2e_145%)]" role="img" aria-label={imageAlt(displayName, 'Admissions image placeholder')} />
        )}
        <div className="absolute inset-0 bg-[#07172f]/62" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-14 pt-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-200">Admissions & Contact</p>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-6xl">Begin Your Child's Journey at SouthGold</h1>
            <p className="mt-6 text-base leading-8 text-white/85">{cms.admissionsDesc || fallbackCms.admissionsDesc}</p>
          </div>
        </div>
      </section>
      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Admission Process</p><h2 className="mt-4 text-3xl font-extrabold text-[#07172f] dark:text-white">Simple steps, personal guidance</h2></div>
          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {admissionSteps.map((step, index) => <div key={step} className="border border-slate-200 p-6 dark:border-slate-800"><span className="text-sm font-extrabold text-[#c99a2e]">{String(index + 1).padStart(2, '0')}</span><h3 className="mt-3 font-bold text-[#07172f] dark:text-white">{step}</h3></div>)}
          </div>
        </div>
      </section>
      <section className="bg-[#f7f4ed] py-16">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.75fr_1fr] lg:px-8">
          <div><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Classes / Programmes</p><h2 className="mt-4 text-3xl font-extrabold text-[#07172f]">Available programmes</h2><p className="mt-5 leading-8 text-slate-700">Classes are grouped for parents using the school structure, with portal/database classes merged into the correct category where available.</p></div>
          <div className="space-y-5">
            {programmeGroups.map((group) => (
              <section key={group.title} className="border-l-4 border-[#c99a2e] bg-white p-5">
                <h3 className="text-lg font-extrabold text-[#07172f]">{group.title}</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {group.classes.map((classId) => <span key={classId} className="border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">{classId}</span>)}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
      <section className="bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Send An Enquiry</p>
            <h2 className="mt-4 text-3xl font-extrabold text-[#07172f] dark:text-white">Speak with admissions</h2>
            <div className="mt-8 space-y-5 text-sm leading-6 text-slate-700 dark:text-slate-300">
              <p className="flex gap-3"><Phone size={18} className="shrink-0 text-[#c99a2e]" /> <a href={`tel:${displayPhone.replace(/[^0-9+]/g, '')}`}>{displayPhone}</a></p>
              <p className="flex gap-3"><Mail size={18} className="shrink-0 text-[#c99a2e]" /> <a href={`mailto:${displayEmail}`}>{displayEmail}</a></p>
              <p className="flex gap-3"><MapPin size={18} className="shrink-0 text-[#c99a2e]" /> <a href={mapUrl} target="_blank" rel="noopener noreferrer">{displayAddress}</a></p>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700">WhatsApp Admissions</a>
            </div>
          </div>
          <div className="border border-slate-200 p-5 sm:p-8 dark:border-slate-800">
            {contactSubmitted ? (
              <div className="py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center bg-emerald-100 text-emerald-700"><Check size={22} /></div>
                <h3 className="mt-5 text-xl font-extrabold text-[#07172f] dark:text-white">Thank you. Your enquiry has been received.</h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600 dark:text-slate-300">The admissions team can now follow up from the school portal.</p>
                {whatsappFallbackMessage && <p className="mx-auto mt-4 max-w-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">{whatsappFallbackMessage}</p>}
                <button onClick={() => setContactSubmitted(false)} className="mt-6 border border-[#07172f] px-5 py-3 text-sm font-bold text-[#07172f] dark:border-white dark:text-white">Send another enquiry</button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-5" noValidate>
                {formError && <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{formError}</p>}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Parent / Guardian Name" required value={formState.parentName} onChange={(value) => updateForm('parentName', value)} />
                  <Field label="Phone" required type="tel" value={formState.phone} onChange={(value) => updateForm('phone', value)} />
                  <Field label="Email" required type="email" value={formState.email} onChange={(value) => updateForm('email', value)} />
                  <Field label="Child's Name" required value={formState.childName} onChange={(value) => updateForm('childName', value)} />
                  <Field label="Child's Age" required value={formState.childAge} onChange={(value) => updateForm('childAge', value)} />
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Class Applying For *</label>
                    <input list="class-options" required value={formState.classApplyingFor} onChange={(e) => updateForm('classApplyingFor', e.target.value)} className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c99a2e] focus:ring-2 focus:ring-[#c99a2e]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                    <datalist id="class-options">{programmeOptions.map((item) => <option key={item} value={item} />)}</datalist>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Preferred Contact Method</label>
                    <select value={formState.preferredContact} onChange={(e) => updateForm('preferredContact', e.target.value)} className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c99a2e] focus:ring-2 focus:ring-[#c99a2e]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <option>Phone call</option><option>WhatsApp</option><option>Email</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-slate-600 dark:text-slate-300">Message</label>
                  <textarea rows={5} value={formState.message} onChange={(e) => updateForm('message', e.target.value)} className="w-full border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#c99a2e] focus:ring-2 focus:ring-[#c99a2e]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                </div>
                <button type="submit" disabled={contactLoading} className="inline-flex w-full items-center justify-center gap-2 bg-[#c99a2e] px-6 py-3 text-sm font-bold text-[#07172f] transition hover:bg-[#b38928] disabled:cursor-not-allowed disabled:opacity-70">{contactLoading ? 'Sending Enquiry...' : <><Send size={16} /> Send Enquiry</>}</button>
              </form>
            )}
          </div>
        </div>
      </section>
      <section className="bg-[#f7f4ed] py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">FAQ</p>
          <h2 className="mt-4 text-3xl font-extrabold text-[#07172f]">Admissions questions</h2>
          <div className="mt-8 space-y-3">
            {[
              ['How do I start an admission enquiry?', 'Complete the enquiry form on this page or contact the school by phone, WhatsApp, or email.'],
              ['Which classes are available?', classes.length ? 'Available classes are listed above from the school portal configuration.' : 'Administrators should update the class list in the portal so exact classes appear here.'],
              ['Is an assessment required?', 'The school admissions team will confirm whether an assessment or interview applies to the child and class.'],
            ].map(([question, answer]) => <details key={question} className="group bg-white p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-[#07172f]">{question}<ChevronDown size={18} className="transition group-open:rotate-180" /></summary><p className="mt-3 text-sm leading-7 text-slate-700">{answer}</p></details>)}
          </div>
        </div>
      </section>
    </>
  );

  const LoginIndex = () => (
    <main className="min-h-[calc(100vh-80px)] bg-[#f7f4ed] px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl text-center">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Secure Portal</p>
        <h1 className="mt-4 text-4xl font-extrabold text-[#07172f]">Choose your portal</h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-700">Select the correct access point for your role. Role isolation is enforced after login.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {portalRolesConfig.map((item) => {
            const Icon = item.icon;
            return <button key={item.role} type="button" onClick={() => handleNavigate(ROLE_TO_PATH[item.role])} className="bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-lg"><Icon size={24} className="text-[#c99a2e]" /><p className="mt-5 text-lg font-extrabold text-[#07172f]">{item.title}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{item.badge}</p><p className="mt-4 text-sm leading-6 text-slate-600">{item.desc}</p></button>;
          })}
        </div>
      </div>
    </main>
  );

  const RoleLogin = ({ role }: { role: UserRole }) => {
    const roleConfig = portalRolesConfig.find((item) => item.role === role);
    const Icon = roleConfig?.icon || ShieldCheck;
    return (
      <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-[#f7f4ed] px-4 py-12">
        <div className="w-full max-w-md bg-white p-6 shadow-xl sm:p-8">
          <button type="button" onClick={() => handleNavigate('/login')} className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[#07172f] hover:text-[#9f7622]"><ArrowLeft size={16} /> Back to portals</button>
          <div className="text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center bg-[#07172f] text-[#c99a2e]"><Icon size={24} /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.22em] text-[#9f7622]">Secure Authorization</p><h1 className="mt-2 text-2xl font-extrabold text-[#07172f]">{roleConfig?.title || 'Portal'} Login</h1></div>
          <form onSubmit={(e) => submitLogin(e, role)} className="mt-8 space-y-5">
            {loginError && <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{loginError}</p>}
            <Field label="Email Address" required type="email" value={emailInput} onChange={setEmailInput} />
            <Field label="Password" required type="password" value={passwordInput} onChange={setPasswordInput} />
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 accent-[#c99a2e]" /> Remember me</label>
            <button type="submit" disabled={loginLoading} className="inline-flex w-full items-center justify-center gap-2 bg-[#07172f] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#10294e] disabled:opacity-70"><Lock size={16} /> {loginLoading ? 'Signing in...' : 'Sign in'}</button>
          </form>
        </div>
      </main>
    );
  };

  const activeRole = PATH_TO_ROLE[currentPath];

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <JsonLd />
      {PublicNav()}
      {currentPath === '/login' && LoginIndex()}
      {activeRole && RoleLogin({ role: activeRole })}
      {!activeRole && currentPath === '/' && HomePage()}
      {!activeRole && currentPath === '/about' && AboutPage()}
      {!activeRole && currentPath === '/admissions' && AdmissionsPage()}
      {!activeRole && currentPath !== '/login' && Footer()}

      {(selectedActivity || selectedBulletin) && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4" onClick={() => { setSelectedActivity(null); setSelectedBulletin(null); }}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-auto bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => { setSelectedActivity(null); setSelectedBulletin(null); }} className="ml-auto flex h-9 w-9 items-center justify-center border border-slate-200 dark:border-slate-700" aria-label="Close"><X size={18} /></button>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[#9f7622]">{selectedActivity?.badge || selectedBulletin?.date || 'School Update'}</p>
            <h2 className="mt-3 text-2xl font-extrabold text-[#07172f] dark:text-white">{selectedActivity?.title || selectedBulletin?.title}</h2>
            <p className="mt-5 whitespace-pre-line text-sm leading-8 text-slate-700 dark:text-slate-300">{selectedActivity?.content || selectedActivity?.desc || selectedBulletin?.content}</p>
          </div>
        </div>
      )}

      {!activeRole && currentPath !== '/login' && <a href={`https://wa.me/${whatsappNumber}?text=Hello%20SouthGold%20Schools.%20I%20am%20inquiring%20about%20admissions.`} target="_blank" rel="noopener noreferrer" className="fixed bottom-5 right-5 z-50 bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700">WhatsApp</a>}
    </div>
  );
}
