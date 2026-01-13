const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) {
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1,-1);
      process.env[m[1]] = v;
    }
  });
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  try {
    const { data, error } = await supabase.from('votes').update({ choice: 'BOOT' }).eq('username', 'demo_user').eq('look_id', 'demo123').select();
    console.log('UPDATE result:', { data, error });
  } catch (err) {
    console.error('UPDATE threw error:', err);
  }
})();
