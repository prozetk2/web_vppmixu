import * as XLSX from 'xlsx';
import * as path from 'path';

// Script to validate Excel file structure before seeding

const REQUIRED_SHEETS = {
  // Essential sheets (recommended to have)
  recommended: [
    'roles',
    'Roles',
    'stores',
    'Stores',
    'categories',
    'Categories',
    'products',
    'Products',
  ],
  // Optional sheets
  optional: [
    'users',
    'Users',
    'user_roles',
    'UserRoles',
    'customers',
    'Customers',
    'suppliers',
    'Suppliers',
    'warehouses',
    'Warehouses',
    'chart_of_accounts',
    'ChartOfAccounts',
    'bank_accounts',
    'BankAccounts',
    'product_variants',
    'ProductVariants',
    'inventory',
    'Inventory',
  ],
};

const SHEET_COLUMNS = {
  roles: ['code', 'name', 'description'],
  users: ['username', 'email', 'password', 'full_name', 'phone', 'enabled'],
  user_roles: ['username', 'role_code'],
  stores: ['code', 'name', 'address', 'tax_number', 'phone', 'email'],
  categories: ['code', 'name', 'description', 'parent_code'],
  customers: ['code', 'name', 'email', 'phone', 'address', 'tax_number'],
  suppliers: ['code', 'name', 'email', 'phone', 'address', 'tax_number'],
  warehouses: ['code', 'name', 'address', 'store_code'],
  chart_of_accounts: ['code', 'name', 'type', 'parent_code'],
  bank_accounts: ['store_code', 'bank_name', 'account_number', 'currency'],
  products: ['sku', 'name', 'description', 'category_code', 'default_price', 'default_cost'],
  product_variants: ['product_sku', 'sku', 'barcode', 'attributes', 'price', 'cost', 'active'],
  inventory: ['variant_sku', 'warehouse_code', 'quantity', 'reserved'],
};

function validateExcelFile(filePath: string) {
  console.log('🔍 Validating Excel file...\n');
  console.log(`File path: ${filePath}\n`);

  try {
    // Check if file exists
    const workbook = XLSX.readFile(filePath);
    console.log('✓ File found and readable\n');

    // Get all sheet names
    const sheetNames = workbook.SheetNames;
    console.log(`📊 Found ${sheetNames.length} sheet(s):`);
    sheetNames.forEach((name) => console.log(`   - ${name}`));
    console.log('');

    // Check for recommended sheets
    const hasRecommended = REQUIRED_SHEETS.recommended.some((sheet) =>
      sheetNames.includes(sheet),
    );

    if (!hasRecommended) {
      console.warn('⚠️  Warning: No recommended sheets found!');
      console.warn('   Recommended sheets: ' + REQUIRED_SHEETS.recommended.join(', '));
      console.log('');
    }

    // Validate each sheet
    console.log('📋 Sheet validation:\n');
    
    sheetNames.forEach((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`Sheet: "${sheetName}"`);
      console.log(`   Rows: ${data.length}`);

      if (data.length > 0) {
        const columns = Object.keys(data[0] as object);
        console.log(`   Columns: ${columns.join(', ')}`);

        // Check if expected columns exist (case-insensitive)
        const sheetNameLower = sheetName.toLowerCase();
        const expectedColumns = SHEET_COLUMNS[sheetNameLower as keyof typeof SHEET_COLUMNS];
        
        if (expectedColumns) {
          const columnsLower = columns.map((c) => c.toLowerCase());
          const missingColumns = expectedColumns.filter(
            (col) => !columnsLower.some((c) => 
              c === col.toLowerCase() || 
              c === col.toLowerCase().replace(/_/g, '') ||
              col.toLowerCase().replace(/_/g, '') === c
            ),
          );

          if (missingColumns.length > 0) {
            console.log(`   ⚠️  Missing columns: ${missingColumns.join(', ')}`);
          } else {
            console.log(`   ✓ All expected columns present`);
          }
        }

        // Sample first row
        console.log(`   Sample data:`, JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
      } else {
        console.log(`   ⚠️  Sheet is empty`);
      }
      console.log('');
    });

    // Summary
    console.log('\n📝 Summary:');
    console.log(`   Total sheets: ${sheetNames.length}`);
    console.log(`   Total records: ${sheetNames.reduce((sum, name) => {
      const sheet = workbook.Sheets[name];
      const data = XLSX.utils.sheet_to_json(sheet);
      return sum + data.length;
    }, 0)}`);

    console.log('\n✓ Validation complete!');
    console.log('\nNext steps:');
    console.log('   1. Review any warnings above');
    console.log('   2. Fix any missing columns or data issues');
    console.log('   3. Run: npm run seed:data');

  } catch (error) {
    console.error('❌ Error validating file:', error);
    console.log('\nTroubleshooting:');
    console.log('   1. Ensure data.xlsx exists in the root directory');
    console.log('   2. Check file is not open in another application');
    console.log('   3. Verify file is a valid Excel file (.xlsx)');
    console.log('   4. See EXCEL_TEMPLATE.md for correct structure');
    throw error;
  }
}

async function main() {
  const excelPath = path.join(__dirname, '..', '..', 'data.xlsx');
  validateExcelFile(excelPath);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
