import { Client } from 'pg';
import 'dotenv/config';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log('No DATABASE_URL found.');
    return;
  }

  // Parse using PG's connection parser or generic URL parsing
  const redacted = url.replace(/:[^:@/]+@/, ':***@');
  console.log('Original Redacted:', redacted);

  let targetUrl = url;
  if (url.includes('bkrnnfybboiotvtpscmt.supabase.co')) {
    targetUrl = url.replace('bkrnnfybboiotvtpscmt.supabase.co', 'db.bkrnnfybboiotvtpscmt.supabase.co');
  }
  const redactedTarget = targetUrl.replace(/:[^:@/]+@/, ':***@');
  console.log('Target Redacted:', redactedTarget);

  const client = new Client({ connectionString: targetUrl, ssl: { rejectUnauthorized: false } });
  
  try {
    await client.connect();
    console.log('SUCCESS!');
    const res = await client.query('SELECT NOW();');
    console.log('Now:', res.rows[0]);
  } catch (e: any) {
    console.error('Failed:', e.message);
  } finally {
    await client.end();
  }
}

main();
