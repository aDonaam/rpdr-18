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
    const { data, error } = await supabase.from('looks').select('*').order('id', { ascending: true });
    if (error) {
      console.error('Query error:', error);
      process.exit(3);
    }
    console.log('Found looks:', (data || []).length);
    console.log((data || []).map(l => ({ id: l.id, title: l.title })).slice(0, 20));
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', String(err));
    process.exit(4);
  }
})();
