import { supabase } from '../src/server/db';

async function main() {
  console.log('Testing Supabase connection...');
  const { data, error } = await supabase.from('early_years_results').select('*').limit(1);
  if (error) {
    console.error('Error fetching from early_years_results:', error.message);
    console.log('Full error:', error);
  } else {
    console.log('SUCCESS! early_years_results exists. Rows:', data);
  }
}

main();
