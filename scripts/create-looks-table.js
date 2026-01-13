const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) {
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  });
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(2);
}

const supabase = createClient(url, key);

const sql = `
CREATE TABLE IF NOT EXISTS public.looks (
  id text PRIMARY KEY,
  title text NOT NULL,
  image_url text,
  episode text,
  created_at timestamptz DEFAULT now()
);
`;

(async () => {
  try {
    console.log('Create looks table SQL:');
    console.log(sql);

    if (typeof supabase.postgres?.query === 'function') {
      console.log('Using supabase.postgres.query to run SQL');
      const res = await supabase.postgres.query({ sql });
      console.log('Result:', JSON.stringify(res, null, 2));
      process.exit(0);
    }

    console.log('postgre.query API not available on this client; attempting rpc("sql") fallback');
    try {
      const { data, error } = await supabase.rpc('sql', { sql_text: sql });
      if (error) {
        console.error('RPC error:', error);
        process.exit(3);
      }
      console.log('RPC result:', data);
      process.exit(0);
    } catch (err) {
      console.error('No programmatic SQL method available on this client.');
      console.error('Please run the following SQL in the Supabase SQL editor to create the `looks` table:');
      console.log(sql);
      process.exit(4);
    }
  } catch (err) {
    console.error('Unexpected error creating looks table:', String(err));
    process.exit(5);
  }
})();
