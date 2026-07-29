import 'dotenv/config';
console.log('Environment keys:', Object.keys(process.env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('PASS')));
