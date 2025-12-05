import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface ProductRow {
  'Loại hàng': string;
  'Nhóm hàng(3 Cấp)': string;
  'Mã hàng': string;
  'Mã vạch': string;
  'Tên hàng': string;
  'Thương hiệu': string;
  'Giá bán': number;
  'Giá vốn': number;
  'Tồn kho': number;
  'ĐVT': string;
  'Mô tả': string;
  'Đang kinh doanh': string;
}

async function readExcelFile(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);
  return data as ProductRow[];
}

async function seedDefaultData() {
  console.log('Creating default data...\n');

  // 1. Create default role
  console.log('Creating default role...');
  const adminRole = await prisma.role.upsert({
    where: { code: 'ADMIN' },
    update: {},
    create: {
      code: 'ADMIN',
      name: 'Administrator',
      description: 'System Administrator',
    },
  });
  console.log('✓ Role created');

  // 2. Create default user
  console.log('Creating default admin user...');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@store.com',
      passwordHash: hashedPassword,
      fullName: 'Administrator',
      enabled: true,
    },
  });
  console.log('✓ Admin user created');

  // 3. Assign role to user
  console.log('Assigning role to user...');
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRole.id,
    },
  });
  console.log('✓ User role assigned');

  // 4. Create default store
  console.log('Creating default store...');
  const defaultStore = await prisma.store.upsert({
    where: { code: 'STORE001' },
    update: {},
    create: {
      code: 'STORE001',
      name: 'Cửa hàng chính',
      address: 'Việt Nam',
    },
  });
  console.log('✓ Store created');

  // 5. Create default warehouse
  console.log('Creating default warehouse...');
  const defaultWarehouse = await prisma.warehouse.upsert({
    where: { id: 1 },
    update: {},
    create: {
      code: 'WH001',
      name: 'Kho chính',
      storeId: defaultStore.id,
    },
  });
  console.log('✓ Warehouse created\n');

  return { defaultWarehouse };
}

async function seedCategoriesFromProducts(products: ProductRow[]) {
  console.log('Creating categories from product data...');
  
  // Extract unique categories
  const categoryNames = new Set<string>();
  products.forEach(p => {
    const category = p['Nhóm hàng(3 Cấp)'];
    if (category && category.trim()) {
      categoryNames.add(category.trim());
    }
  });

  console.log(`Found ${categoryNames.size} unique categories`);

  // Create categories
  let count = 0;
  for (const categoryName of categoryNames) {
    try {
      await prisma.category.upsert({
        where: { 
          code: `CAT_${categoryName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}` 
        },
        update: {
          name: categoryName,
        },
        create: {
          code: `CAT_${categoryName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}`,
          name: categoryName,
        },
      });
      count++;
    } catch (error) {
      console.error(`Error creating category ${categoryName}:`, error);
    }
  }

  console.log(`✓ Created ${count} categories\n`);
}

async function seedProducts(products: ProductRow[], warehouseId: bigint) {
  console.log(`Seeding ${products.length} products...`);
  
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < products.length; i++) {
    const row = products[i];
    
    // Show progress every 100 products
    if ((i + 1) % 100 === 0) {
      console.log(`  Progress: ${i + 1}/${products.length} products processed...`);
    }

    try {
      // Skip if no product code
      if (!row['Mã hàng'] || !row['Tên hàng']) {
        skippedCount++;
        continue;
      }

      const sku = row['Mã hàng'].toString().trim();
      const name = row['Tên hàng'].toString().trim();
      
      // Get category
      const categoryName = row['Nhóm hàng(3 Cấp)'];
      let categoryId: bigint | null = null;
      
      if (categoryName && categoryName.trim()) {
        const category = await prisma.category.findFirst({
          where: { name: categoryName.trim() },
        });
        if (category) {
          categoryId = category.id;
        }
      }

      // Parse prices
      const defaultPrice = parseFloat(row['Giá bán']?.toString() || '0') || 0;
      const defaultCost = parseFloat(row['Giá vốn']?.toString() || '0') || 0;

      // Create product
      const product = await prisma.product.upsert({
        where: { sku },
        update: {
          name,
          description: row['Mô tả'] || null,
          categoryId,
          defaultPrice,
          defaultCost,
        },
        create: {
          sku,
          name,
          description: row['Mô tả'] || null,
          categoryId,
          defaultPrice,
          defaultCost,
        },
      });

      // Create product variant
      const barcode = row['Mã vạch']?.toString().trim() || null;
      
      // Check if variant exists
      let variant = await prisma.productVariant.findFirst({
        where: { 
          productId: product.id,
          sku: sku
        },
      });

      if (variant) {
        // Update existing variant
        variant = await prisma.productVariant.update({
          where: { id: variant.id },
          data: {
            barcode,
            price: defaultPrice,
            cost: defaultCost,
            active: row['Đang kinh doanh'] !== 'False',
          },
        });
      } else {
        // Create new variant
        variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: sku,
            barcode,
            price: defaultPrice,
            cost: defaultCost,
            active: row['Đang kinh doanh'] !== 'False',
          },
        });
      }

      // Create inventory record
      const quantity = parseInt(row['Tồn kho']?.toString() || '0') || 0;
      
      if (quantity > 0) {
        // Check if inventory exists
        const existingInventory = await prisma.inventory.findFirst({
          where: {
            variantId: variant.id,
            warehouseId: warehouseId,
          },
        });

        if (existingInventory) {
          await prisma.inventory.update({
            where: { id: existingInventory.id },
            data: {
              quantity: BigInt(quantity),
            },
          });
        } else {
          await prisma.inventory.create({
            data: {
              variantId: variant.id,
              warehouseId: warehouseId,
              quantity: BigInt(quantity),
              reserved: BigInt(0),
            },
          });
        }
      }

      successCount++;
    } catch (error: any) {
      errorCount++;
      if (errorCount <= 5) { // Only show first 5 errors
        console.error(`  Error with product ${row['Mã hàng']}: ${error.message}`);
      }
    }
  }

  console.log(`\n✓ Products seeding complete:`);
  console.log(`  - Success: ${successCount}`);
  console.log(`  - Errors: ${errorCount}`);
  console.log(`  - Skipped: ${skippedCount}`);
  console.log(`  - Total: ${products.length}\n`);
}

async function main() {
  try {
    console.log('========================================');
    console.log('   Seed Data from Excel (Custom)');
    console.log('========================================\n');

    // 1. Read Excel file
    console.log('Reading Excel file...');
    const excelPath = path.join(__dirname, '..', '..', 'data.xlsx');
    const products = await readExcelFile(excelPath);
    console.log(`✓ Found ${products.length} products in Excel\n`);

    // 2. Create default data (roles, users, store, warehouse)
    const { defaultWarehouse } = await seedDefaultData();

    // 3. Create categories from product data
    await seedCategoriesFromProducts(products);

    // 4. Seed products
    await seedProducts(products, defaultWarehouse.id);

    console.log('========================================');
    console.log('   ✓ Seed Completed Successfully!');
    console.log('========================================\n');

    console.log('Next steps:');
    console.log('1. Open Prisma Studio: npx prisma studio');
    console.log('2. Start backend: npm run start:dev');
    console.log('3. Login with:');
    console.log('   - Username: admin');
    console.log('   - Password: admin123\n');

  } catch (error) {
    console.error('\n❌ Error seeding data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
