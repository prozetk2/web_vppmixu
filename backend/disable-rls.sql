-- Disable Row Level Security for authentication tables
-- Run this in Supabase SQL Editor
-- Disable RLS on app_user table
ALTER TABLE app_user DISABLE ROW LEVEL SECURITY;
-- Disable RLS on role table
ALTER TABLE role DISABLE ROW LEVEL SECURITY;
-- Disable RLS on user_role table
ALTER TABLE user_role DISABLE ROW LEVEL SECURITY;
-- Disable RLS on other tables (optional, for full access)
ALTER TABLE category DISABLE ROW LEVEL SECURITY;
ALTER TABLE product DISABLE ROW LEVEL SECURITY;
ALTER TABLE store DISABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer DISABLE ROW LEVEL SECURITY;
ALTER TABLE supplier DISABLE ROW LEVEL SECURITY;
-- Verify RLS is disabled
SELECT tablename,
    rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;