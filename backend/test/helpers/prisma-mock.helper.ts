/**
 * Complete Prisma Mock Helper
 * Based on actual Supabase schema
 */

export const createFullPrismaMock = () => {
  return {
    // Customer
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Customer Payment
    customerPayment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Customer Payment Allocation
    customerPaymentAllocation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Supplier
    supplier: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Supplier Payment
    supplierPayment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Supplier Payment Allocation
    supplierPaymentAllocation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Invoice
    invoice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Invoice Item
    invoiceItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Order
    order: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Order Item
    orderItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Purchase Order
    purchaseOrder: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Purchase Item
    purchaseItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Product
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Product Variant
    productVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Inventory
    inventory: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Stock Movement
    stockMovement: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },

    // Warehouse
    warehouse: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Store
    store: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Category
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // User
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // User Role
    userRole: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Role
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Payment
    payment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Price List
    priceList: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Product Price
    productPrice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Transaction
    transaction: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Accounting Entry
    accountingEntry: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Accounting Line
    accountingLine: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Chart of Account
    chartOfAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Bank Account
    bankAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Audit Log
    auditLog: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Invoice E-Invoice
    invoiceEinvoice: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },

    // Prisma special methods
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
    $use: jest.fn(),
  };
};

/**
 * Create transaction mock that includes all methods
 */
export const createTransactionMock = (baseMock: any) => {
  return {
    ...baseMock,
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRawUnsafe: jest.fn(),
  };
};

/**
 * Mock factory for common test scenarios
 */
export const mockFactories = {
  customer: (overrides = {}) => ({
    id: BigInt(1),
    code: 'CUST001',
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '0123456789',
    address: '123 Test Street',
    currentDebt: 0,
    totalSales: 0,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  invoice: (overrides = {}) => ({
    id: BigInt(1),
    invoiceNumber: 'INV001',
    customerId: BigInt(1),
    totalAmount: 1000,
    amountPaid: 0,
    amountDue: 1000,
    paymentMethod: null,
    cashAmount: 0,
    cardAmount: 0,
    transferAmount: 0,
    status: 'COMPLETED',
    createdAt: new Date(),
    ...overrides,
  }),

  customerPayment: (overrides = {}) => ({
    id: BigInt(1),
    code: 'PAY001',
    customerId: BigInt(1),
    amount: 1000,
    method: 'CASH',
    collector: null,
    note: null,
    createdAt: new Date(),
    ...overrides,
  }),

  supplier: (overrides = {}) => ({
    id: BigInt(1),
    code: 'SUP001',
    name: 'Test Supplier',
    email: 'supplier@example.com',
    phone: '0987654321',
    address: '456 Supplier Street',
    currentDebt: 0,
    totalPurchase: 0,
    active: true,
    createdAt: new Date(),
    ...overrides,
  }),

  purchaseOrder: (overrides = {}) => ({
    id: BigInt(1),
    orderNumber: 'PO001',
    supplierId: BigInt(1),
    warehouseId: BigInt(1),
    totalAmount: 1000,
    amountPaid: 0,
    amountDue: 1000,
    discountAmount: 0,
    status: 'CONFIRMED',
    createdAt: new Date(),
    ...overrides,
  }),

  product: (overrides = {}) => ({
    id: BigInt(1),
    sku: 'SKU001',
    name: 'Test Product',
    description: 'Test Description',
    defaultPrice: 100,
    defaultCost: 50,
    unit: 'pcs',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  productVariant: (overrides = {}) => ({
    id: BigInt(1),
    productId: BigInt(1),
    sku: 'VAR001',
    barcode: 'BAR001',
    price: 100,
    cost: 50,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  inventory: (overrides = {}) => ({
    id: BigInt(1),
    variantId: BigInt(1),
    warehouseId: BigInt(1),
    quantity: 100,
    reserved: 0,
    updatedAt: new Date(),
    ...overrides,
  }),

  stockMovement: (overrides = {}) => ({
    id: BigInt(1),
    variantId: BigInt(1),
    warehouseId: BigInt(1),
    movementType: 'IMPORT',
    quantity: 10,
    reference: null,
    note: null,
    performedAt: new Date(),
    ...overrides,
  }),

  order: (overrides = {}) => ({
    id: BigInt(1),
    orderNumber: 'ORD001',
    customerId: BigInt(1),
    storeId: null,
    totalAmount: 1000,
    subtotal: 1000,
    discountAmount: 0,
    taxAmount: 0,
    status: 'COMPLETED',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: BigInt(1),
    username: 'testuser',
    email: 'user@example.com',
    passwordHash: 'hashedpassword',
    fullName: 'Test User',
    phone: '0123456789',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  role: (overrides = {}) => ({
    id: BigInt(1),
    code: 'ADMIN',
    name: 'Administrator',
    description: 'Full access',
    ...overrides,
  }),

  warehouse: (overrides = {}) => ({
    id: BigInt(1),
    code: 'WH001',
    name: 'Main Warehouse',
    address: '789 Warehouse Street',
    active: true,
    createdAt: new Date(),
    ...overrides,
  }),
};
