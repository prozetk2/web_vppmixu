require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkTables() {
    console.log('=== Checking Supabase Tables ===\n');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials');
        return;
    }

    console.log('✓ Supabase URL:', supabaseUrl);
    console.log('✓ Service Role Key:', supabaseKey.substring(0, 20) + '...\n');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: List all tables
    console.log('=== Checking if app_user table exists ===');
    const { data: tables, error: tableError } = await supabase
        .from('app_user')
        .select('*')
        .limit(1);

    if (tableError) {
        console.error('❌ Error accessing app_user table:');
        console.error('   Code:', tableError.code);
        console.error('   Message:', tableError.message);
        console.error('   Details:', tableError.details);
        console.error('   Hint:', tableError.hint);
        console.error('\n⚠️  The table might not exist. You need to run the migration SQL in Supabase SQL Editor.');
        console.error('   File: backend/supabase-migration.sql\n');
        return;
    }

    console.log('✓ app_user table exists');
    console.log('  Records found:', tables?.length || 0);

    if (tables && tables.length > 0) {
        console.log('\n=== Users in database ===');
        tables.forEach(user => {
            console.log(`  - Username: ${user.username}`);
            console.log(`    Email: ${user.email}`);
            console.log(`    Has password: ${!!user.password_hash}`);
        });
    } else {
        console.log('\n⚠️  No users found in database');
        console.log('   You need to run the INSERT statements from supabase-migration.sql');
    }

    // Test 2: Check all users
    console.log('\n=== Checking all users ===');
    const { data: allUsers, error: allError } = await supabase
        .from('app_user')
        .select('id, username, email, password_hash');

    if (allError) {
        console.error('❌ Error:', allError.message);
    } else {
        console.log(`Found ${allUsers?.length || 0} users`);
        allUsers?.forEach(u => {
            console.log(`  - ${u.username} (${u.email}) - Hash length: ${u.password_hash?.length || 0}`);
        });
    }
}

checkTables().catch(err => {
    console.error('Fatal error:', err);
});
