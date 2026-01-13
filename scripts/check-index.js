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

(async () => {
  try {
    console.log('Attempting supabase.postgres.query if available');
    if (typeof supabase.postgres?.query === 'function') {
      const sql = `SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'votes';`;
      const res = await supabase.postgres.query({ sql });
      console.log('postgres.query result:', JSON.stringify(res, null, 2));
    } else {
      console.log('supabase.postgres.query not available, trying FROM pg_indexes select');
      try {
        const { data, error } = await supabase.from('pg_indexes').select('indexname, indexdef').eq('tablename', 'votes');
        console.log('from pg_indexes select:', { error, rowCount: data?.length, data });
      } catch (err) {
        console.error('select from pg_indexes failed:', String(err));
      }
    }

    // Also try pg_constraint for unique constraints
    try {
      const { data: cons, error: consErr } = await supabase.from('pg_constraint').select('*');
      console.log('pg_constraint select result:', { error: consErr, rowCount: cons?.length });
    } catch (err) {
      console.error('select from pg_constraint failed:', String(err));
    }

    process.exit(0);
  } catch (err) {
    console.error('Unexpected error checking indexes:', String(err));
    process.exit(1);
  }
})();
