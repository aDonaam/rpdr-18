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
    const looksPath = path.join(process.cwd(), 'scripts', 'looks.json');
    let looks = [];
    if (fs.existsSync(looksPath)) {
      const content = JSON.parse(fs.readFileSync(looksPath, 'utf8'));
      looks = content.looks || [];
    }
    if (!looks.length) {
      // Default to L1..L14
      looks = Array.from({ length: 14 }, (_, i) => ({ id: `L${i+1}`, title: `Look ${i+1}`, image_url: null, episode: null }));
    }

    console.log('Seeding looks:', looks.map(l => l.id).join(', '));

    // Upsert so seed is safe to re-run
    const { data, error } = await supabase.from('looks').upsert(looks, { onConflict: 'id' }).select();
    if (error) {
      console.error('Upsert error:', error);
      console.error('If the `looks` table does not exist, run scripts/create-looks-table.js or create the table in the Supabase SQL editor');
      process.exit(3);
    }

    console.log('Upserted looks:', Array.isArray(data) ? data.length : (data ? 1 : 0));
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', String(err));
    process.exit(4);
  }
})();
