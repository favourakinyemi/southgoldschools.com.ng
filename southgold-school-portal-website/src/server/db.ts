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
  supabaseServiceKey ?? 'service-role-key-missing',
  {
    global: {
      // Next.js patches the server-side global fetch() with its own Data
      // Cache. Without this, supabase-js's internal REST calls can get
      // cached by that layer -- independent of any Cache-Control header we
      // set on our own route responses -- causing reads to return stale
      // data right after a write that already landed in Postgres.
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  }
);

export const SUPABASE_CONFIGURED = Boolean(supabaseUrl && supabaseServiceKey);
