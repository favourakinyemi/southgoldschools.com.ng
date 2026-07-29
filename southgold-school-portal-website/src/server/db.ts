import { createClient, SupabaseClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn(
    '[Supabase] SUPABASE_URL and SUPABASE_SECRET_KEY are not set. ' +
    'The API will start but database calls will fail until they are provided in .env.'
  );
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseServiceKey ?? 'service-role-key-missing'
);

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseServiceKey);
