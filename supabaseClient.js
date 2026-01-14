const { createClient } = require('@supabase/supabase-js');

// Replace these with your actual Supabase project credentials
// Get them from: Supabase Dashboard > Settings > API
const supabaseUrl = process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;
