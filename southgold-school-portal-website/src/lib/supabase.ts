import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bkrnnfybboiotvtpscmt.supabase.co';
const supabaseAnonKey = 'sb_publishable_jYVX5_4v1FOr9LjuMCnrXA_TWhmdJsB';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
