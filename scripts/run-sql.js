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
    const sql = `CREATE UNIQUE INDEX IF NOT EXISTS votes_one_per_user_per_look ON public.votes (username, look_id);`;
    console.log('Running SQL:', sql);
    // Use the Postgres query helper
    if (typeof supabase.postgres?.query === 'function') {
      const res = await supabase.postgres.query({ sql });
      console.log('Result:', res);
      process.exit(0);
    }

    // Fallback: try the admin SQL function via RPC if available
    // Note: this will probably fail if not supported. We'll try calling a raw SQL via the REST 'rpc' with function 'sql' (not standard)
    try {
      const { data, error } = await supabase.rpc('sql', { sql_text: sql });
      if (error) {
        console.error('RPC error:', error);
        process.exit(3);
      }
      console.log('RPC result:', data);
      process.exit(0);
    } catch (err) {
      console.error('No supported method for running raw SQL found on this client. Error:', String(err));
      process.exit(4);
    }
  } catch (err) {
    console.error('Unexpected error running SQL:', String(err));
    process.exit(5);
  }
})();
