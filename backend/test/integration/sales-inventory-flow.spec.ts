import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SalesService } from '../../src/sales/sales.service';
import { InventoryService } from '../../src/inventory/inventory.service';
import { ProductsService } from '../../src/products/products.service';

/**
 * Integration Tests for Sales and Inventory Flow
 * 
 * Tests the complete flow:
 * 1. Create product with variant
 * 2. Add initial stock
 * 3. Create sales order
 * 4. Verify stock movement
 * 5. Verify inventory update
 * 6. Return order
 * 7. Verify stock reversal
 */
describe('Sales and Inventory Flow Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let salesService: SalesService;
  let inventoryService: InventoryService;
  let productsService: ProductsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        SalesService,
        InventoryService,
        ProductsService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    salesService = moduleFixture.get<SalesService>(SalesService);
    inventoryService = moduleFixture.get<InventoryService>(InventoryService);
    productsService = moduleFixture.get<ProductsService>(ProductsService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Sales Flow with Inventory Tracking', () => {
    let productId: string;
    let variantId: string;
    let warehouseId: string;
    let orderId: string;

    it('should create a product with variant', async () => {
      const product = await productsService.create({
        name: 'Test Product',
        sku: 'TEST001',
        defaultPrice: 100,
        categoryId: '1',
      });

      productId = product.id.toString();
      variantId = product.variants[0].id.toString();

      expect(product).toBeDefined();
      expect(product.variants).toBeDefined();
      expect(product.variants.length).toBeGreaterThan(0);
    });

    it('should add initial stock to warehouse', async () => {
      warehouseId = '1'; // Assume default warehouse exists

      const adjustment = await inventoryService.adjustStock({
        variantId,
        warehouseId,
        quantity: 100,
        movementType: 'IMPORT',
        note: 'Initial stock',
      });

      expect(adjustment).toBeDefined();

      // Verify inventory
      const stock = await inventoryService.getStock({
        variantId,
        warehouseId,
      });

      expect(stock[0].quantity).toBe(100);
    });

    it('should create sales order and reduce stock', async () => {
      const order = await salesService.create({
        items: [
          {
            productId,
            quantity: 10,
            unitPrice: 100,
          },
        ],
        payment: {
          amount: 1000,
          method: 'CASH',
        },
        warehouseId,
      });

      orderId = order.id.toString();
      expect(order).toBeDefined();

      // Verify stock reduced
      const stock = await inventoryService.getStock({
        variantId,
        warehouseId,
      });

      expect(stock[0].quantity).toBe(90); // 100 - 10 = 90
    });

    it('should create stock movement record for sale', async () => {
      const movements = await inventoryService.getMovements({
        variantId,
        warehouseId,
        movementType: 'SALE',
      });

      expect(movements.data.length).toBeGreaterThan(0);
      
      const saleMovement = movements.data.find(
        m => m.movementType === 'SALE' || m.movementType === 'EXPORT',
      );
      
      expect(saleMovement).toBeDefined();
      expect(Math.abs(saleMovement.quantity)).toBe(10);
    });

    it('should return order and restore stock', async () => {
      await salesService.returnOrder(orderId);

      // Verify stock restored
      const stock = await inventoryService.getStock({
        variantId,
        warehouseId,
      });

      expect(stock[0].quantity).toBe(100); // Back to 100
    });

    it('should create return movement record', async () => {
      const movements = await inventoryService.getMovements({
        variantId,
        warehouseId,
        movementType: 'RETURN',
      });

      expect(movements.data.length).toBeGreaterThan(0);
      
      const returnMovement = movements.data.find(
        m => m.movementType === 'RETURN',
      );
      
      expect(returnMovement).toBeDefined();
      expect(returnMovement.quantity).toBe(10);
    });
  });

  describe('Multi-Unit Conversion in Sales', () => {
    let productId: string;
    let variantId: string;
    let warehouseId: string;

    beforeEach(async () => {
      const product = await productsService.create({
        name: 'Rice',
        sku: 'RICE001',
        defaultPrice: 50000, // 50,000 VND per kg
        unit: 'kg',
      });

      productId = product.id.toString();
      variantId = product.variants[0].id.toString();
      warehouseId = '1';

      // Add 100 kg stock
      await inventoryService.adjustStock({
        variantId,
        warehouseId,
        quantity: 100,
        movementType: 'IMPORT',
      });
    });

    it('should handle decimal quantity with unit conversion', async () => {
      // Sell 2.5 kg (2500 g)
      const order = await salesService.create({
        items: [
          {
            productId,
            quantity: 2.5, // Base unit: kg
            unitPrice: 50000,
            unit: 'kg',
            displayQuantity: 2500, // Display unit: g
            conversionRate: 1000, // 1 kg = 1000 g
          },
        ],
        payment: {
          amount: 125000, // 2.5 * 50000
          method: 'CASH',
        },
        warehouseId,
      });

      expect(order).toBeDefined();

      // Verify stock reduced by 2.5 kg
      const stock = await inventoryService.getStock({
        variantId,
        warehouseId,
      });

      expect(stock[0].quantity).toBe(97.5); // 100 - 2.5 = 97.5
    });

    it('should store movement with display unit metadata', async () => {
      await salesService.create({
        items: [
          {
            productId,
            quantity: 1.5,
            unitPrice: 50000,
            unit: 'kg',
            displayQuantity: 1500,
            conversionRate: 1000,
          },
        ],
        payment: {
          amount: 75000,
          method: 'CASH',
        },
        warehouseId,
      });

      const movements = await inventoryService.getMovements({
        variantId,
        warehouseId,
      });

      const latestMovement = movements.data[0];
      expect(latestMovement.displayQuantity).toBe(1500);
      expect(latestMovement.displayUnit).toBe('g');
    });
  });

  describe('Low Stock Alerts', () => {
    let productId: string;
    let variantId: string;
    let warehouseId: string;

    beforeEach(async () => {
      const product = await productsService.create({
        name: 'Low Stock Product',
        sku: 'LOW001',
        defaultPrice: 100,
        minStock: 20, // Minimum stock threshold
      });

      productId = product.id.toString();
      variantId = product.variants[0].id.toString();
      warehouseId = '1';

      // Add stock just above minimum
      await inventoryService.adjustStock({
        variantId,
        warehouseId,
        quantity: 25,
        movementType: 'IMPORT',
      });
    });

    it('should trigger low stock alert when below threshold', async () => {
      // Sell 10 items (25 - 10 = 15, below minStock of 20)
      await salesService.create({
        items: [
          {
            productId,
            quantity: 10,
            unitPrice: 100,
          },
        ],
        payment: {
          amount: 1000,
          method: 'CASH',
        },
        warehouseId,
      });

      const lowStockItems = await inventoryService.getLowStockItems();

      const lowStockItem = lowStockItems.find(
        item => item.variantId.toString() === variantId,
      );

      expect(lowStockItem).toBeDefined();
      expect(lowStockItem.quantity).toBe(15);
      expect(lowStockItem.variant.product.minStock).toBe(20);
    });
  });

  describe('Inventory Report Generation', () => {
    it('should generate inventory report with movements', async () => {
      const report = await inventoryService.getInventoryReport({
        warehouseId: '1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(report).toBeDefined();
      expect(Array.isArray(report)).toBe(true);
    });

    it('should filter report by date range', async () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const report = await inventoryService.getInventoryReport({
        warehouseId: '1',
        startDate: yesterday.toISOString(),
        endDate: today.toISOString(),
      });

      expect(report).toBeDefined();
    });
  });

  describe('Bulk Stock Adjustment', () => {
    let variant1Id: string;
    let variant2Id: string;
    let warehouseId: string;

    beforeEach(async () => {
      const product1 = await productsService.create({
        name: 'Bulk Product 1',
        sku: 'BULK001',
        defaultPrice: 100,
      });

      const product2 = await productsService.create({
        name: 'Bulk Product 2',
        sku: 'BULK002',
        defaultPrice: 200,
      });

      variant1Id = product1.variants[0].id.toString();
      variant2Id = product2.variants[0].id.toString();
      warehouseId = '1';
    });

    it('should adjust multiple items in bulk', async () => {
      const result = await inventoryService.bulkAdjustStock({
        items: [
          {
            variantId: variant1Id,
            warehouseId,
            quantity: 50,
            movementType: 'IMPORT',
          },
          {
            variantId: variant2Id,
            warehouseId,
            quantity: 30,
            movementType: 'IMPORT',
          },
        ],
      });

      expect(result).toBeDefined();

      // Verify both stocks updated
      const stock1 = await inventoryService.getStock({
        variantId: variant1Id,
        warehouseId,
      });
      expect(stock1[0].quantity).toBe(50);

      const stock2 = await inventoryService.getStock({
        variantId: variant2Id,
        warehouseId,
      });
      expect(stock2[0].quantity).toBe(30);
    });
  });

  describe('Negative Inventory Prevention', () => {
    let productId: string;
    let variantId: string;
    let warehouseId: string;

    beforeEach(async () => {
      const product = await productsService.create({
        name: 'Limited Stock Product',
        sku: 'LIM001',
        defaultPrice: 100,
      });

      productId = product.id.toString();
      variantId = product.variants[0].id.toString();
      warehouseId = '1';

      // Add only 5 items
      await inventoryService.adjustStock({
        variantId,
        warehouseId,
        quantity: 5,
        movementType: 'IMPORT',
      });
    });

    it('should prevent sale exceeding available stock', async () => {
      // Try to sell 10 items when only 5 available
      await expect(
        salesService.create({
          items: [
            {
              productId,
              quantity: 10,
              unitPrice: 100,
            },
          ],
          payment: {
            amount: 1000,
            method: 'CASH',
          },
          warehouseId,
        }),
      ).rejects.toThrow();
    });

    it('should prevent negative adjustment', async () => {
      // Try to adjust by -10 when only 5 available
      await expect(
        inventoryService.adjustStock({
          variantId,
          warehouseId,
          quantity: -10,
          movementType: 'ADJUST',
        }),
      ).rejects.toThrow();
    });
  });
});
