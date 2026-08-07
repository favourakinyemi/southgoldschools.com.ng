import { ensureSuperAdmin } from '../src/server/auth';

// Idempotent: creates the default Super Admin auth user + profile if
// missing (southgold@gmail.com), or leaves the existing one untouched.
// Requires SUPABASE_URL and SUPABASE_SECRET_KEY (service_role key) in
// the environment. Run with:  npm run setup-admin

ensureSuperAdmin()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Failed to set up Super Admin:', err);
    process.exit(1);
  });
