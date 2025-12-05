import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';
import * as path from 'path';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

interface ExcelData {
  [key: string]: any[];
}

async function readExcelFile(filePath: string): Promise<ExcelData> {
  const workbook = XLSX.readFile(filePath);
  const data: ExcelData = {};

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    data[sheetName] = jsonData;
  });

  return data;
}

async function seedRoles(roles: any[]) {
  if (!roles || roles.length === 0) return;
  
  console.log('Seeding roles...');
  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: {
        name: role.name,
        description: role.description,
      },
      create: {
        code: role.code,
        name: role.name,
        description: role.description,
      },
    });
  }
  console.log(`✓ Seeded ${roles.length} roles`);
}

async function seedUsers(users: any[]) {
  if (!users || users.length === 0) return;
  
  console.log('Seeding users...');
  for (const user of users) {
    const hashedPassword = user.password 
      ? await bcrypt.hash(user.password, 10)
      : await bcrypt.hash('123456', 10);

    await prisma.user.upsert({
      where: { username: user.username },
      update: {
        email: user.email,
        passwordHash: hashedPassword,
        fullName: user.full_name || user.fullName,
        phone: user.phone,
        enabled: user.enabled !== false,
      },
      create: {
        username: user.username,
        email: user.email,
        passwordHash: hashedPassword,
        fullName: user.full_name || user.fullName,
        phone: user.phone,
        enabled: user.enabled !== false,
      },
    });
  }
  console.log(`✓ Seeded ${users.length} users`);
}

async function seedUserRoles(userRoles: any[]) {
  if (!userRoles || userRoles.length === 0) return;
  
  console.log('Seeding user roles...');
  for (const ur of userRoles) {
    const user = await prisma.user.findUnique({
      where: { username: ur.username },
    });
    const role = await prisma.role.findUnique({
      where: { code: ur.role_code || ur.roleCode },
    });

    if (user && role) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: user.id,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }
  }
  console.log(`✓ Seeded ${userRoles.length} user roles`);
}

async function seedStores(stores: any[]) {
  if (!stores || stores.length === 0) return;
  
  console.log('Seeding stores...');
  for (const store of stores) {
    await prisma.store.upsert({
      where: { code: store.code },
      update: {
        name: store.name,
        address: store.address,
        taxNumber: store.tax_number || store.taxNumber,
        phone: store.phone,
        email: store.email,
        settings: store.settings ? JSON.parse(store.settings) : null,
      },
      create: {
        code: store.code,
        name: store.name,
        address: store.address,
        taxNumber: store.tax_number || store.taxNumber,
        phone: store.phone,
        email: store.email,
        settings: store.settings ? JSON.parse(store.settings) : null,
      },
    });
  }
  console.log(`✓ Seeded ${stores.length} stores`);
}

async function seedWarehouses(warehouses: any[]) {
  if (!warehouses || warehouses.length === 0) return;
  
  console.log('Seeding warehouses...');
  for (const wh of warehouses) {
    const store = wh.store_code
      ? await prisma.store.findUnique({ where: { code: wh.store_code } })
      : null;

    await prisma.warehouse.create({
      data: {
        code: wh.code,
        name: wh.name,
        address: wh.address,
        storeId: store?.id,
      },
    });
  }
  console.log(`✓ Seeded ${warehouses.length} warehouses`);
}

async function seedCategories(categories: any[]) {
  if (!categories || categories.length === 0) return;
  
  console.log('Seeding categories...');
  
  // First, create all categories without parent
  for (const cat of categories) {
    if (!cat.parent_code && !cat.parentCode) {
      await prisma.category.upsert({
        where: { code: cat.code },
        update: {
          name: cat.name,
          description: cat.description,
        },
        create: {
          code: cat.code,
          name: cat.name,
          description: cat.description,
        },
      });
    }
  }

  // Then, create categories with parent
  for (const cat of categories) {
    if (cat.parent_code || cat.parentCode) {
      const parent = await prisma.category.findUnique({
        where: { code: cat.parent_code || cat.parentCode },
      });

      await prisma.category.upsert({
        where: { code: cat.code },
        update: {
          name: cat.name,
          description: cat.description,
          parentId: parent?.id,
        },
        create: {
          code: cat.code,
          name: cat.name,
          description: cat.description,
          parentId: parent?.id,
        },
      });
    }
  }
  console.log(`✓ Seeded ${categories.length} categories`);
}

async function seedCustomers(customers: any[]) {
  if (!customers || customers.length === 0) return;
  
  console.log('Seeding customers...');
  for (const customer of customers) {
    await prisma.customer.upsert({
      where: { code: customer.code },
      update: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        taxNumber: customer.tax_number || customer.taxNumber,
      },
      create: {
        code: customer.code,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        taxNumber: customer.tax_number || customer.taxNumber,
      },
    });
  }
  console.log(`✓ Seeded ${customers.length} customers`);
}

async function seedSuppliers(suppliers: any[]) {
  if (!suppliers || suppliers.length === 0) return;
  
  console.log('Seeding suppliers...');
  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { code: supplier.code },
      update: {
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        taxNumber: supplier.tax_number || supplier.taxNumber,
      },
      create: {
        code: supplier.code,
        name: supplier.name,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        taxNumber: supplier.tax_number || supplier.taxNumber,
      },
    });
  }
  console.log(`✓ Seeded ${suppliers.length} suppliers`);
}

async function seedProducts(products: any[]) {
  if (!products || products.length === 0) return;
  
  console.log('Seeding products...');
  for (const product of products) {
    const category = product.category_code
      ? await prisma.category.findUnique({ where: { code: product.category_code } })
      : null;

    await prisma.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        description: product.description,
        categoryId: category?.id,
        defaultPrice: product.default_price || product.defaultPrice || 0,
        defaultCost: product.default_cost || product.defaultCost || 0,
      },
      create: {
        sku: product.sku,
        name: product.name,
        description: product.description,
        categoryId: category?.id,
        defaultPrice: product.default_price || product.defaultPrice || 0,
        defaultCost: product.default_cost || product.defaultCost || 0,
      },
    });
  }
  console.log(`✓ Seeded ${products.length} products`);
}

async function seedProductVariants(variants: any[]) {
  if (!variants || variants.length === 0) return;
  
  console.log('Seeding product variants...');
  for (const variant of variants) {
    const product = await prisma.product.findUnique({
      where: { sku: variant.product_sku || variant.productSku },
    });

    if (product) {
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: variant.sku,
          barcode: variant.barcode,
          attributes: variant.attributes ? JSON.parse(variant.attributes) : null,
          price: variant.price || product.defaultPrice,
          cost: variant.cost || product.defaultCost,
          active: variant.active !== false,
        },
      });
    }
  }
  console.log(`✓ Seeded ${variants.length} product variants`);
}

async function seedInventory(inventoryData: any[]) {
  if (!inventoryData || inventoryData.length === 0) return;
  
  console.log('Seeding inventory...');
  for (const inv of inventoryData) {
    const variant = await prisma.productVariant.findFirst({
      where: { sku: inv.variant_sku || inv.variantSku },
    });
    const warehouse = await prisma.warehouse.findFirst({
      where: { code: inv.warehouse_code || inv.warehouseCode },
    });

    if (variant && warehouse) {
      await prisma.inventory.create({
        data: {
          variantId: variant.id,
          warehouseId: warehouse.id,
          quantity: BigInt(inv.quantity || 0),
          reserved: BigInt(inv.reserved || 0),
        },
      });
    }
  }
  console.log(`✓ Seeded ${inventoryData.length} inventory records`);
}

async function seedChartOfAccounts(accounts: any[]) {
  if (!accounts || accounts.length === 0) return;
  
  console.log('Seeding chart of accounts...');
  
  // First pass: create accounts without parent
  for (const acc of accounts) {
    if (!acc.parent_code && !acc.parentCode) {
      await prisma.chartOfAccount.upsert({
        where: { code: acc.code },
        update: {
          name: acc.name,
          type: acc.type,
        },
        create: {
          code: acc.code,
          name: acc.name,
          type: acc.type,
        },
      });
    }
  }

  // Second pass: create accounts with parent
  for (const acc of accounts) {
    if (acc.parent_code || acc.parentCode) {
      const parent = await prisma.chartOfAccount.findUnique({
        where: { code: acc.parent_code || acc.parentCode },
      });

      await prisma.chartOfAccount.upsert({
        where: { code: acc.code },
        update: {
          name: acc.name,
          type: acc.type,
          parentId: parent?.id,
        },
        create: {
          code: acc.code,
          name: acc.name,
          type: acc.type,
          parentId: parent?.id,
        },
      });
    }
  }
  console.log(`✓ Seeded ${accounts.length} chart of accounts`);
}

async function seedBankAccounts(bankAccounts: any[]) {
  if (!bankAccounts || bankAccounts.length === 0) return;
  
  console.log('Seeding bank accounts...');
  for (const ba of bankAccounts) {
    const store = ba.store_code
      ? await prisma.store.findUnique({ where: { code: ba.store_code } })
      : null;

    await prisma.bankAccount.create({
      data: {
        storeId: store?.id,
        bankName: ba.bank_name || ba.bankName,
        accountNumber: ba.account_number || ba.accountNumber,
        currency: ba.currency || 'VND',
      },
    });
  }
  console.log(`✓ Seeded ${bankAccounts.length} bank accounts`);
}

async function main() {
  try {
    console.log('Starting seed process...');
    console.log('Reading Excel file...');

    const excelPath = path.join(__dirname, '..', '..', 'data.xlsx');
    const data = await readExcelFile(excelPath);

    console.log('Available sheets:', Object.keys(data));

    // Seed data in the correct order (respecting foreign key constraints)
    // 1. Independent tables (no foreign keys)
    await seedRoles(data['roles'] || data['Roles']);
    await seedStores(data['stores'] || data['Stores']);
    await seedCategories(data['categories'] || data['Categories']);
    await seedCustomers(data['customers'] || data['Customers']);
    await seedSuppliers(data['suppliers'] || data['Suppliers']);
    await seedChartOfAccounts(data['chart_of_accounts'] || data['ChartOfAccounts']);

    // 2. Users (depends on nothing)
    await seedUsers(data['users'] || data['Users']);
    
    // 3. UserRoles (depends on users and roles)
    await seedUserRoles(data['user_roles'] || data['UserRoles']);

    // 4. Warehouses (depends on stores)
    await seedWarehouses(data['warehouses'] || data['Warehouses']);

    // 5. Bank Accounts (depends on stores)
    await seedBankAccounts(data['bank_accounts'] || data['BankAccounts']);

    // 6. Products (depends on categories)
    await seedProducts(data['products'] || data['Products']);

    // 7. Product Variants (depends on products)
    await seedProductVariants(data['product_variants'] || data['ProductVariants']);

    // 8. Inventory (depends on product variants and warehouses)
    await seedInventory(data['inventory'] || data['Inventory']);

    console.log('\n✓ Seed completed successfully!');
  } catch (error) {
    console.error('Error seeding data:', error);
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
