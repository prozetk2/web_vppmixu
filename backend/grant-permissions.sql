-- Grant permissions on schema public
-- Run this in Supabase SQL Editor
-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO postgres,
    anon,
    authenticated,
    service_role;
-- Grant all privileges on all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres,
    anon,
    authenticated,
    service_role;
-- Grant all privileges on all sequences
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres,
    anon,
    authenticated,
    service_role;
-- Grant all privileges on all functions
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres,
    anon,
    authenticated,
    service_role;
-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON TABLES TO postgres,
    anon,
    authenticated,
    service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON SEQUENCES TO postgres,
    anon,
    authenticated,
    service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL ON FUNCTIONS TO postgres,
    anon,
    authenticated,
    service_role;
-- Verify permissions
SELECT schemaname,
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;