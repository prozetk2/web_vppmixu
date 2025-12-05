import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkData() {
  console.log('🔍 Checking database data...');

  try {
    // Check categories
    const { data: categories, error: catError } = await supabase
      .from('category')
      .select('id, name, code')
      .limit(10);

    if (catError) {
      console.error('❌ Error fetching categories:', catError);
    } else {
      console.log(
        `📂 Found ${categories?.length || 0} categories (showing first 10):`,
      );
      categories?.forEach((cat) =>
        console.log(`  - ${cat.name} (${cat.code})`),
      );
    }

    // Check products
    const { data: products, error: prodError } = await supabase
      .from('product')
      .select('id, name, sku, category_id')
      .limit(10);

    if (prodError) {
      console.error('❌ Error fetching products:', prodError);
    } else {
      console.log(
        `📦 Found ${products?.length || 0} products (showing first 10):`,
      );
      products?.forEach((prod) =>
        console.log(`  - ${prod.name} (${prod.sku})`),
      );
    }

    // Check users
    const { data: users, error: userError } = await supabase
      .from('app_user')
      .select('id, username, email')
      .limit(5);

    if (userError) {
      console.error('❌ Error fetching users:', userError);
    } else {
      console.log(`👤 Found ${users?.length || 0} users (showing first 5):`);
      users?.forEach((user) =>
        console.log(`  - ${user.username} (${user.email})`),
      );
    }

    // Check roles
    const { data: roles, error: roleError } = await supabase
      .from('role')
      .select('id, code, name');

    if (roleError) {
      console.error('❌ Error fetching roles:', roleError);
    } else {
      console.log(`🔐 Found ${roles?.length || 0} roles:`);
      roles?.forEach((role) => console.log(`  - ${role.name} (${role.code})`));
    }
  } catch (error) {
    console.error('❌ Error checking data:', error);
    process.exit(1);
  }
}

// Run the check
void checkData();
