import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
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

interface ExcelProduct {
  'Loại hàng': string;
  'Nhóm hàng(3 Cấp)': string;
  'Mã hàng': string;
  'Mã vạch': string;
  'Tên hàng': string;
  'Thương hiệu': string;
  'Giá bán': number;
  'Giá vốn': number;
  'Tồn kho': number;
  'KH đặt': number;
  'Dự kiến hết hàng': string;
  'Tồn nhỏ nhất': number;
  'Tồn lớn nhất': number;
  ĐVT: string;
  'Mã ĐVT Cơ bản': string;
  'Quy đổi': number;
  'Thuộc tính': string;
  'Mã HH Liên quan': string;
  'Hình ảnh (url1,url2...)': string;
  'Đang kinh doanh': string;
  'Được bán trực tiếp': string;
  'Mô tả': string;
  'Mẫu ghi chú': string;
  'Vị trí': string;
  'Hàng thành phần': string;
}

async function seedData() {
  console.log('🚀 Starting data seeding with Supabase...');

  try {
    // Read Excel file
    const excelPath = path.join(__dirname, '../../data.xlsx');
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel file not found at: ${excelPath}`);
    }

    console.log(`📖 Reading Excel file: ${excelPath}`);
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: ExcelProduct[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`📊 Found ${data.length} products in Excel`);

    // Process categories
    console.log('🏷️  Processing categories...');
    const categories = new Map<string, number>();
    const categoryNames = [
      ...new Set(data.map((row) => row['Nhóm hàng(3 Cấp)']).filter(Boolean)),
    ];

    for (const categoryName of categoryNames) {
      // Check if category exists
      let { data: existingCategory } = await supabase
        .from('category')
        .select('id')
        .eq('name', categoryName)
        .single();

      if (!existingCategory) {
        // Insert new category
        const { data: newCategory, error } = await supabase
          .from('category')
          .insert({
            name: categoryName,
            code: categoryName.replace(/\s+/g, '_').toUpperCase(),
          })
          .select('id')
          .single();

        if (error) {
          console.error(`❌ Error inserting category ${categoryName}:`, error);
          continue;
        }
        existingCategory = newCategory;
      }

      categories.set(categoryName, existingCategory.id as number);
    }

    console.log(`✅ Processed ${categories.size} categories`);

    // Process products
    console.log('📦 Processing products...');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < Math.min(data.length, 5); i++) {
      // Test with first 5 products
      const row = data[i];
      try {
        const categoryId = categories.get(row['Nhóm hàng(3 Cấp)']);

        // Check if product exists
        const { data: existingProduct } = await supabase
          .from('product')
          .select('id')
          .eq('sku', row['Mã hàng'])
          .single();

        if (existingProduct) {
          console.log(`⏭️  Skipping existing product: ${row['Mã hàng']}`);
          continue;
        }

        // Insert product
        const { error } = await supabase.from('product').insert({
          name: row['Tên hàng'],
          sku: row['Mã hàng'],
          description: row['Mô tả'] || null,
          category_id: categoryId || null,
          default_price: row['Giá bán'] || 0,
          default_cost: row['Giá vốn'] || 0,
        });

        if (error) {
          console.error(`❌ Error inserting product ${row['Mã hàng']}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(
          `❌ Unexpected error processing product ${row['Mã hàng']}:`,
          err,
        );
        errorCount++;
      }
    }

    console.log(`✅ Successfully inserted ${successCount} products`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} products failed to insert`);
    }

    console.log('🎉 Data seeding completed!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run the seeding
void seedData();
