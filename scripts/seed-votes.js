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
    // Read seeds.json if present
    const seedsPath = path.join(process.cwd(), 'scripts', 'seeds.json');
    let users = ['demo_user_a', 'demo_user_b'];
    let lookIds = Array.from({ length: 14 }, (_, i) => `L${i+1}`);

    if (fs.existsSync(seedsPath)) {
      const content = JSON.parse(fs.readFileSync(seedsPath, 'utf8'));
      if (Array.isArray(content.users) && content.users.length) users = content.users;
      if (Array.isArray(content.lookIds) && content.lookIds.length) lookIds = content.lookIds;
    }

    console.log(`Seeding votes for users: ${users.join(', ')} and ${lookIds.length} looks`);

    const rows = [];
    // Alternate choices for diversity
    for (const u of users) {
      for (let i = 0; i < lookIds.length; i++) {
        const look = lookIds[i];
        const choice = (i % 2 === 0) ? 'TOOT' : 'BOOT';
        rows.push({ username: u, look_id: look, choice });
      }
    }

    // Delete any existing votes for these users/looks so the seed is idempotent
    console.log('Deleting existing votes for these users/looks (idempotent seed)');
    const { data: delData, error: delErr } = await supabase
      .from('votes')
      .delete()
      .in('username', users)
      .in('look_id', lookIds);
    if (delErr) {
      console.error('Delete error:', delErr);
      process.exit(3);
    }
    console.log('Deleted rows:', delData?.length ?? 0);

    // Bulk insert (ask PostgREST to return rows with .select())
    const { data, error } = await supabase.from('votes').insert(rows).select();
    if (error) {
      console.error('Insert error:', error);
      process.exit(4);
    }
    const insertedCount = Array.isArray(data) ? data.length : (data ? 1 : 0);
    console.log('Inserted rows (returned by select):', insertedCount);

    // If the insert returned zero rows, try inserting one row individually to get a diagnostic
    if (insertedCount === 0) {
      console.log('Bulk insert returned zero rows; inserting one row individually for diagnostic');
      const sample = rows[0];
      const { data: sdata, error: serror } = await supabase.from('votes').insert([sample]).select();
      if (serror) {
        console.error('Single insert error:', serror);
        process.exit(5);
      }
      console.log('Single insert returned rows:', sdata?.length ?? 0);
    }

    // Report counts for verification
    try {
      const { data: userRows, count, error: countErr } = await supabase.from('votes').select('id', { count: 'exact' }).in('username', users);
      if (countErr) {
        console.error('Count query error:', countErr);
      } else {
        console.log('Total votes for seeded users:', count);
      }
    } catch (err) {
      console.error('Count query threw:', String(err));
    }

    process.exit(0);
  } catch (err) {
    console.error('Unexpected error:', String(err));
    process.exit(4);
  }
})();
