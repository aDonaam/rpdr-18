// lib/supabaseServer.js
import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client (use the service role key stored in .env.local)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;
