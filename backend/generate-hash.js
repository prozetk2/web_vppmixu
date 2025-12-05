const bcrypt = require('bcrypt');

async function generateHash() {
    const password = 'admin123';
    const hash = await bcrypt.hash(password, 10);
    console.log('Password:', password);
    console.log('Hash:', hash);
    console.log('\nCopy this hash and replace $2b$10$YourHashedPasswordHere in supabase-migration.sql');
}

generateHash();
