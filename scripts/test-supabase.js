const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load .env.local manually (avoid adding dotenv as a dependency)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) {
      let val = m[2];
      // Strip surrounding quotes
      if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[m[1]] = val;
    }
  });
}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
  process.exit(2);
}

const supabase = createClient(url, key);

(async () => {
  try {
    const { data, error } = await supabase.from('votes').select('id').limit(1);
    if (error) {
      console.error('Supabase returned error:', error.message || error);
      process.exit(3);
    }
    console.log('OK - rows returned:', (data && data.length) || 0);
  } catch (err) {
    console.error('Unexpected error:', err.message || err);
    process.exit(4);
  }
})();
