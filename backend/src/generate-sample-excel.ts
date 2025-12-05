/**
 * Sample Excel Data Generator
 * 
 * This script generates a sample data.xlsx file with example data
 * Run: npm run generate:sample-data
 */

import * as XLSX from 'xlsx';
import * as path from 'path';

// Sample data for each sheet
const sampleData = {
  roles: [
    { code: 'ADMIN', name: 'Administrator', description: 'Full system access' },
    { code: 'MANAGER', name: 'Manager', description: 'Store manager access' },
    { code: 'STAFF', name: 'Staff', description: 'Basic staff access' },
    { code: 'CASHIER', name: 'Cashier', description: 'Cashier access' },
  ],

  users: [
    { username: 'admin', email: 'admin@store.com', password: 'admin123', full_name: 'System Admin', phone: '0901234567', enabled: true },
    { username: 'manager1', email: 'manager1@store.com', password: 'pass123', full_name: 'Nguyen Van A', phone: '0901234568', enabled: true },
    { username: 'staff1', email: 'staff1@store.com', password: 'pass123', full_name: 'Tran Thi B', phone: '0901234569', enabled: true },
  ],

  user_roles: [
    { username: 'admin', role_code: 'ADMIN' },
    { username: 'manager1', role_code: 'MANAGER' },
    { username: 'staff1', role_code: 'STAFF' },
  ],

  stores: [
    { code: 'ST001', name: 'Store Ho Chi Minh', address: '123 Nguyen Hue, District 1, HCM', tax_number: '0123456789', phone: '0281234567', email: 'hcm@store.com' },
    { code: 'ST002', name: 'Store Ha Noi', address: '456 Ba Trieu, Hoan Kiem, Hanoi', tax_number: '0987654321', phone: '0241234567', email: 'hn@store.com' },
  ],

  categories: [
    { code: 'CAT001', name: 'Electronics', description: 'Electronic devices' },
    { code: 'CAT002', name: 'Phones', description: 'Mobile phones', parent_code: 'CAT001' },
    { code: 'CAT003', name: 'Laptops', description: 'Laptop computers', parent_code: 'CAT001' },
    { code: 'CAT004', name: 'Fashion', description: 'Fashion products' },
    { code: 'CAT005', name: 'Men Fashion', description: 'Men fashion items', parent_code: 'CAT004' },
  ],

  customers: [
    { code: 'CUS001', name: 'Nguyen Van C', email: 'nvc@email.com', phone: '0901111111', address: '789 Le Loi, HCM' },
    { code: 'CUS002', name: 'Tran Thi D', email: 'ttd@email.com', phone: '0902222222', address: '321 Hai Ba Trung, HN' },
    { code: 'CUS003', name: 'Company ABC', email: 'abc@company.com', phone: '0903333333', address: '555 Nguyen Trai, HCM', tax_number: '0123456789' },
  ],

  suppliers: [
    { code: 'SUP001', name: 'Supplier A', email: 'supa@email.com', phone: '0904444444', address: '111 Street A, HCM', tax_number: '1111111111' },
    { code: 'SUP002', name: 'Supplier B', email: 'supb@email.com', phone: '0905555555', address: '222 Street B, HN', tax_number: '2222222222' },
  ],

  warehouses: [
    { code: 'WH001', name: 'Warehouse HCM Main', address: '999 Xa Lo Hanoi, Thu Duc, HCM', store_code: 'ST001' },
    { code: 'WH002', name: 'Warehouse HN Main', address: '888 Giai Phong, Hai Ba Trung, Hanoi', store_code: 'ST002' },
  ],

  chart_of_accounts: [
    { code: '100', name: 'Tai san', type: 'ASSET' },
    { code: '110', name: 'Tien mat', type: 'ASSET', parent_code: '100' },
    { code: '111', name: 'Tien Viet Nam', type: 'ASSET', parent_code: '110' },
    { code: '112', name: 'Ngoai te', type: 'ASSET', parent_code: '110' },
    { code: '200', name: 'Nguon von', type: 'LIABILITY' },
    { code: '210', name: 'Von chu so huu', type: 'EQUITY', parent_code: '200' },
  ],

  bank_accounts: [
    { store_code: 'ST001', bank_name: 'Vietcombank', account_number: '0011001234567', currency: 'VND' },
    { store_code: 'ST001', bank_name: 'Techcombank', account_number: '19123456789', currency: 'VND' },
    { store_code: 'ST002', bank_name: 'BIDV', account_number: '12345678901', currency: 'VND' },
  ],

  products: [
    { sku: 'PHONE001', name: 'iPhone 15 Pro', description: 'iPhone 15 Pro 256GB', category_code: 'CAT002', default_price: 29990000, default_cost: 25000000 },
    { sku: 'PHONE002', name: 'Samsung Galaxy S24', description: 'Samsung Galaxy S24 Ultra', category_code: 'CAT002', default_price: 22990000, default_cost: 19000000 },
    { sku: 'LAP001', name: 'MacBook Pro M3', description: 'MacBook Pro 14" M3 Chip', category_code: 'CAT003', default_price: 45990000, default_cost: 40000000 },
    { sku: 'LAP002', name: 'Dell XPS 15', description: 'Dell XPS 15 Intel i7', category_code: 'CAT003', default_price: 35990000, default_cost: 30000000 },
    { sku: 'SHIRT001', name: 'Men T-Shirt', description: 'Cotton T-Shirt', category_code: 'CAT005', default_price: 299000, default_cost: 150000 },
  ],

  product_variants: [
    { product_sku: 'PHONE001', sku: 'PHONE001-BLK', barcode: '8901234567890', attributes: '{"color":"Black"}', price: 29990000, cost: 25000000, active: true },
    { product_sku: 'PHONE001', sku: 'PHONE001-WHT', barcode: '8901234567891', attributes: '{"color":"White"}', price: 29990000, cost: 25000000, active: true },
    { product_sku: 'PHONE002', sku: 'PHONE002-BLK', barcode: '8901234567892', attributes: '{"color":"Black"}', price: 22990000, cost: 19000000, active: true },
    { product_sku: 'LAP001', sku: 'LAP001-SLV', barcode: '8901234567893', attributes: '{"color":"Silver"}', price: 45990000, cost: 40000000, active: true },
    { product_sku: 'LAP002', sku: 'LAP002-BLK', barcode: '8901234567894', attributes: '{"color":"Black"}', price: 35990000, cost: 30000000, active: true },
    { product_sku: 'SHIRT001', sku: 'SHIRT001-M', barcode: '8901234567895', attributes: '{"size":"M","color":"Blue"}', price: 299000, cost: 150000, active: true },
    { product_sku: 'SHIRT001', sku: 'SHIRT001-L', barcode: '8901234567896', attributes: '{"size":"L","color":"Blue"}', price: 299000, cost: 150000, active: true },
  ],

  inventory: [
    { variant_sku: 'PHONE001-BLK', warehouse_code: 'WH001', quantity: 50, reserved: 5 },
    { variant_sku: 'PHONE001-WHT', warehouse_code: 'WH001', quantity: 30, reserved: 2 },
    { variant_sku: 'PHONE002-BLK', warehouse_code: 'WH001', quantity: 40, reserved: 0 },
    { variant_sku: 'LAP001-SLV', warehouse_code: 'WH001', quantity: 20, reserved: 3 },
    { variant_sku: 'LAP002-BLK', warehouse_code: 'WH001', quantity: 25, reserved: 2 },
    { variant_sku: 'SHIRT001-M', warehouse_code: 'WH001', quantity: 100, reserved: 10 },
    { variant_sku: 'SHIRT001-L', warehouse_code: 'WH001', quantity: 80, reserved: 5 },
    { variant_sku: 'PHONE001-BLK', warehouse_code: 'WH002', quantity: 30, reserved: 2 },
    { variant_sku: 'LAP001-SLV', warehouse_code: 'WH002', quantity: 15, reserved: 1 },
  ],
};

function generateExcelFile() {
  console.log('🔨 Generating sample Excel file...\n');

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Add each sheet
  Object.entries(sampleData).forEach(([sheetName, data]) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    console.log(`✓ Added sheet: ${sheetName} (${data.length} rows)`);
  });

  // Save the file
  const outputPath = path.join(__dirname, '..', '..', 'data.xlsx');
  XLSX.writeFile(workbook, outputPath);

  console.log('\n✓ Sample Excel file generated successfully!');
  console.log(`📁 Location: ${outputPath}`);
  console.log('\nNext steps:');
  console.log('  1. Review the generated data.xlsx file');
  console.log('  2. Modify the data as needed');
  console.log('  3. Run: npm run validate:excel');
  console.log('  4. Run: npm run seed:data');
}

function main() {
  try {
    generateExcelFile();
  } catch (error) {
    console.error('❌ Error generating Excel file:', error);
    throw error;
  }
}

main();
