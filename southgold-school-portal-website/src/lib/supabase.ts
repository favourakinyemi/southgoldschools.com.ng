import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkrnnfybboiotvtpscmt.supabase.co';
const supabaseAnonKey = 'sb_publishable_jYVX5_4v1FOr9LjuMCnrXA_TWhmdJsB';

const REMEMBER_ME_KEY = 'sg_remember_me';

// "Remember me" preference lives in localStorage (a plain flag, not the
// session itself) so it survives across page loads and lets the mount-time
// session restore in App.tsx know which lifetime to re-request.
export function setRememberMe(remember: boolean) {
  try {
    window.localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false');
  } catch {}
}

export function isRememberMeEnabled(): boolean {
  try {
    return window.localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
  } catch {
    return true;
  }
}

// Routes the actual Supabase session to localStorage (survives closing the
// browser) when "remember me" is on, or sessionStorage (cleared when the
// tab/browser closes) when it's off.
const conditionalStorage = {
  getItem: (key: string) => {
    try {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      if (isRememberMeEnabled()) {
        window.localStorage.setItem(key, value);
        window.sessionStorage.removeItem(key);
      } else {
        window.sessionStorage.setItem(key, value);
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
  removeItem: (key: string) => {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { storage: conditionalStorage },
});
