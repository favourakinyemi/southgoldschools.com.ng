import 'dotenv/config';
const url = process.env.DATABASE_URL;
if (url) {
  try {
    const parsed = new URL(url.replace('postgresql://', 'http://'));
    console.log('Host:', parsed.hostname);
    console.log('Port:', parsed.port);
    console.log('Username:', parsed.username);
  } catch (e: any) {
    console.log('Parse error:', e.message);
  }
} else {
  console.log('DATABASE_URL is not set.');
}
