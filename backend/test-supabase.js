require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

async function testSupabase() {
    console.log('=== Testing Supabase Connection ===\n');

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    console.log('SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');
    console.log('');

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing Supabase credentials in .env file');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test 1: Check if admin user exists
    console.log('=== Checking Admin User ===');
    const { data: users, error: userError } = await supabase
        .from('app_user')
        .select('*')
        .eq('username', 'admin');

    if (userError) {
        console.error('❌ Error fetching user:', userError.message);
        return;
    }

    if (!users || users.length === 0) {
        console.log('❌ Admin user NOT found in database');
        console.log('   You need to run the migration SQL in Supabase');
        return;
    }

    const user = users[0];
    console.log('✓ Admin user found');
    console.log('  - ID:', user.id);
    console.log('  - Username:', user.username);
    console.log('  - Email:', user.email);
    console.log('  - Password Hash:', user.password_hash);
    console.log('  - Hash Length:', user.password_hash ? user.password_hash.length : 0);
    console.log('');

    // Test 2: Check password hash
    console.log('=== Testing Password Hash ===');
    const testPassword = 'admin123';

    if (!user.password_hash) {
        console.log('❌ Password hash is NULL or empty');
        return;
    }

    try {
        const isValid = await bcrypt.compare(testPassword, user.password_hash);
        console.log('Password "admin123" validation:', isValid ? '✓ VALID' : '✗ INVALID');

        if (!isValid) {
            console.log('\n❌ Password hash does not match!');
            console.log('   Current hash in DB:', user.password_hash);
            console.log('   Expected hash should be 60 characters long');
            console.log('\nGenerating new hash for "admin123"...');
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log('   New hash:', newHash);
            console.log('\nRun this SQL in Supabase to fix:');
            console.log(`   UPDATE app_user SET password_hash = '${newHash}' WHERE username = 'admin';`);
        }
    } catch (err) {
        console.error('❌ Error comparing password:', err.message);
    }

    console.log('');

    // Test 3: Check roles
    console.log('=== Checking User Roles ===');
    const { data: userRoles, error: roleError } = await supabase
        .from('user_role')
        .select(`
            *,
            role (
                id,
                code,
                name
            )
        `)
        .eq('user_id', user.id);

    if (roleError) {
        console.error('❌ Error fetching roles:', roleError.message);
    } else if (!userRoles || userRoles.length === 0) {
        console.log('❌ No roles assigned to admin user');
    } else {
        console.log('✓ Roles found:');
        userRoles.forEach(ur => {
            console.log(`  - ${ur.role.code} (${ur.role.name})`);
        });
    }
}

testSupabase().catch(console.error);
