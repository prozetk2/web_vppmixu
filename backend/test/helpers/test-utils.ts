import { PrismaService } from '../../src/prisma/prisma.service';

/**
 * Test Utilities
 * 
 * Helper functions for testing
 */

/**
 * Generate unique test identifier
 */
export function generateTestId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Create test customer
 */
export async function createTestCustomer(prisma: PrismaService, overrides = {}) {
  const testId = generateTestId();
  
  return prisma.customer.create({
    data: {
      name: `Test Customer ${testId}`,
      phone: `0${Math.floor(Math.random() * 1000000000)}`,
      email: `test_${testId}@example.com`,
      code: `CUST_${testId}`,
      currentDebt: 0,
      ...overrides,
    },
  });
}

/**
 * Create test supplier
 */
export async function createTestSupplier(prisma: PrismaService, overrides = {}) {
  const testId = generateTestId();
  
  return prisma.supplier.create({
    data: {
      name: `Test Supplier ${testId}`,
      phone: `0${Math.floor(Math.random() * 1000000000)}`,
      email: `supplier_${testId}@example.com`,
      code: `SUP_${testId}`,
      currentDebt: 0,
      totalPurchase: 0,
      ...overrides,
    },
  });
}

/**
 * Create test product with variant
 */
export async function createTestProduct(prisma: PrismaService, overrides = {}) {
  const testId = generateTestId();
  
  const product = await prisma.product.create({
    data: {
      name: `Test Product ${testId}`,
      sku: `SKU_${testId}`,
      defaultPrice: 100,
      unit: 'pcs',
      ...overrides,
    },
  });

  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      sku: `VAR_${testId}`,
      price: product.defaultPrice,
      active: true,
    },
  });

  return { product, variant };
}

/**
 * Create test warehouse
 */
export async function createTestWarehouse(prisma: PrismaService, overrides = {}) {
  const testId = generateTestId();
  
  return prisma.warehouse.create({
    data: {
      name: `Test Warehouse ${testId}`,
      code: `WH_${testId}`,
      address: '123 Test Street',
      ...overrides,
    },
  });
}

/**
 * Create test invoice
 */
export async function createTestInvoice(
  prisma: PrismaService,
  customerId: bigint,
  overrides = {},
) {
  const testId = generateTestId();
  
  return prisma.invoice.create({
    data: {
      invoiceNumber: `INV_${testId}`,
      customerId,
      totalAmount: 1000,
      amountPaid: 0,
      amountDue: 1000,
      paymentMethod: 'CASH',
      customerNameSnapshot: 'Test Customer',
      ...overrides,
    },
  });
}

/**
 * Create test order
 */
export async function createTestOrder(
  prisma: PrismaService,
  customerId: bigint | null,
  variantId: bigint,
  overrides = {},
) {
  const testId = generateTestId();
  
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD_${testId}`,
      customerId,
      totalAmount: 1000,
      discountAmount: 0,
      finalAmount: 1000,
      status: 'COMPLETED',
      ...overrides,
    },
  });

  await prisma.orderItem.create({
    data: {
      orderId: order.id,
      variantId,
      quantity: 10,
      unitPrice: 100,
      discount: 0,
      subtotal: 1000,
    },
  });

  return order;
}

/**
 * Create test purchase order
 */
export async function createTestPurchaseOrder(
  prisma: PrismaService,
  supplierId: bigint,
  variantId: bigint,
  overrides = {},
) {
  const testId = generateTestId();
  
  const purchase = await prisma.purchaseOrder.create({
    data: {
      orderNumber: `PO_${testId}`,
      supplierId,
      totalAmount: 1000,
      discountAmount: 0,
      finalAmount: 1000,
      amountPaid: 0,
      status: 'CONFIRMED',
      ...overrides,
    },
  });

  await prisma.purchaseItem.create({
    data: {
      purchaseOrderId: purchase.id,
      variantId,
      quantity: 10,
      unitCost: 100,
      subtotal: 1000,
    },
  });

  return purchase;
}

/**
 * Add stock to inventory
 */
export async function addTestStock(
  prisma: PrismaService,
  variantId: bigint,
  warehouseId: bigint,
  quantity: number,
) {
  await prisma.inventory.upsert({
    where: {
      variantId_warehouseId: {
        variantId,
        warehouseId,
      },
    },
    create: {
      variantId,
      warehouseId,
      quantity,
    },
    update: {
      quantity: {
        increment: quantity,
      },
    },
  });

  await prisma.stockMovement.create({
    data: {
      variantId,
      warehouseId,
      quantity,
      movementType: 'IMPORT',
      note: 'Test stock',
    },
  });
}

/**
 * Clean up test data
 */
export async function cleanupTestData(prisma: PrismaService, testId: string) {
  // Delete in reverse order of dependencies
  await prisma.stockMovement.deleteMany({
    where: {
      note: {
        contains: testId,
      },
    },
  });

  await prisma.inventory.deleteMany({
    where: {
      variant: {
        sku: {
          contains: testId,
        },
      },
    },
  });

  await prisma.orderItem.deleteMany({
    where: {
      order: {
        orderNumber: {
          contains: testId,
        },
      },
    },
  });

  await prisma.order.deleteMany({
    where: {
      orderNumber: {
        contains: testId,
      },
    },
  });

  await prisma.purchaseItem.deleteMany({
    where: {
      purchaseOrder: {
        orderNumber: {
          contains: testId,
        },
      },
    },
  });

  await prisma.purchaseOrder.deleteMany({
    where: {
      orderNumber: {
        contains: testId,
      },
    },
  });

  await prisma.invoiceItem.deleteMany({
    where: {
      invoice: {
        invoiceNumber: {
          contains: testId,
        },
      },
    },
  });

  await prisma.invoice.deleteMany({
    where: {
      invoiceNumber: {
        contains: testId,
      },
    },
  });

  await prisma.productVariant.deleteMany({
    where: {
      sku: {
        contains: testId,
      },
    },
  });

  await prisma.product.deleteMany({
    where: {
      sku: {
        contains: testId,
      },
    },
  });

  await prisma.customer.deleteMany({
    where: {
      code: {
        contains: testId,
      },
    },
  });

  await prisma.supplier.deleteMany({
    where: {
      code: {
        contains: testId,
      },
    },
  });

  await prisma.warehouse.deleteMany({
    where: {
      code: {
        contains: testId,
      },
    },
  });
}

/**
 * Wait for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random number in range
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate random decimal
 */
export function randomDecimal(min: number, max: number, decimals = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

/**
 * Assert BigInt equality
 */
export function assertBigIntEqual(actual: bigint, expected: bigint | number) {
  const expectedBigInt = typeof expected === 'bigint' ? expected : BigInt(expected);
  expect(actual.toString()).toBe(expectedBigInt.toString());
}

/**
 * Assert decimal equality with tolerance
 */
export function assertDecimalEqual(
  actual: number,
  expected: number,
  tolerance = 0.01,
) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}

/**
 * Create mock Prisma transaction
 */
export function createMockTransaction(prisma: any) {
  return {
    ...prisma,
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(prisma);
    }),
  };
}

/**
 * Mock date for consistent testing
 */
export function mockDate(date: Date) {
  const originalDate = Date;
  global.Date = class extends originalDate {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(date.getTime());
      } else {
        super(...args);
      }
    }
    
    static now() {
      return date.getTime();
    }
  } as any;

  return () => {
    global.Date = originalDate;
  };
}

/**
 * Generate test JWT token
 */
export function generateTestToken(payload: any): string {
  // Simple base64 encoding for testing
  // In real tests, use actual JWT service
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Create test user
 */
export async function createTestUser(prisma: PrismaService, overrides = {}) {
  const testId = generateTestId();
  const bcrypt = require('bcrypt');
  
  const user = await prisma.user.create({
    data: {
      username: `testuser_${testId}`,
      email: `testuser_${testId}@example.com`,
      passwordHash: await bcrypt.hash('password123', 10),
      fullName: 'Test User',
      enabled: true,
      ...overrides,
    },
  });

  return user;
}

/**
 * Assign role to user
 */
export async function assignTestRole(
  prisma: PrismaService,
  userId: bigint,
  roleName: string,
) {
  const role = await prisma.role.findFirst({
    where: { name: roleName },
  });

  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  return prisma.userRole.create({
    data: {
      userId,
      roleId: role.id,
    },
  });
}
