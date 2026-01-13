// pages/api/env-check.js
export default function handler(req, res) {
  res.status(200).json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY,
    hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAdminUsername: !!process.env.ADMIN_USERNAME,
    adminUsername: process.env.NEXT_PUBLIC_ADMIN_USERNAME || null
  });
}