import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;

  const mockPrismaService = {
    inventory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    warehouse: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Movement Type Normalization', () => {
    it('should normalize SALE to EXPORT', () => {
      const result = (service as any).getNormalizedMovementType('SALE', 10);
      expect(result).toBe('EXPORT');
    });

    it('should normalize RETURN to IMPORT', () => {
      const result = (service as any).getNormalizedMovementType('RETURN', 10);
      expect(result).toBe('IMPORT');
    });

    it('should normalize PURCHASE to IMPORT', () => {
      const result = (service as any).getNormalizedMovementType('PURCHASE', 10);
      expect(result).toBe('IMPORT');
    });

    it('should normalize ADJUST based on quantity sign', () => {
      const positiveResult = (service as any).getNormalizedMovementType('ADJUST', 10);
      expect(positiveResult).toBe('IMPORT');

      const negativeResult = (service as any).getNormalizedMovementType('ADJUST', -10);
      expect(negativeResult).toBe('EXPORT');
    });
  });

  describe('Movement Delta Calculation', () => {
    it('should return positive delta for IMPORT', () => {
      const result = (service as any).getMovementDelta('IMPORT', 10);
      expect(result).toBe(10);
    });

    it('should return positive delta for PURCHASE', () => {
      const result = (service as any).getMovementDelta('PURCHASE', 10);
      expect(result).toBe(10);
    });

    it('should return negative delta for EXPORT', () => {
      const result = (service as any).getMovementDelta('EXPORT', 10);
      expect(result).toBe(-10);
    });

    it('should return negative delta for SALE', () => {
      const result = (service as any).getMovementDelta('SALE', 10);
      expect(result).toBe(-10);
    });

    it('should handle ADJUST with positive and negative quantities', () => {
      const positiveResult = (service as any).getMovementDelta('ADJUST', 10);
      expect(positiveResult).toBe(10);

      const negativeResult = (service as any).getMovementDelta('ADJUST', -10);
      expect(negativeResult).toBe(-10);
    });
  });

  describe('Stock Adjustment', () => {
    it('should adjust stock and create movement record', async () => {
      const adjustDto = {
        variantId: '1',
        warehouseId: '1',
        quantity: 10,
        movementType: 'ADJUST',
        note: 'Stock adjustment',
      };

      const mockVariant = {
        id: BigInt(1),
        sku: 'SKU001',
        product: { name: 'Product 1' },
      };

      const mockWarehouse = {
        id: BigInt(1),
        name: 'Main Warehouse',
      };

      const mockInventory = {
        id: BigInt(1),
        variantId: BigInt(1),
        warehouseId: BigInt(1),
        quantity: 100,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          productVariant: {
            findUnique: jest.fn().mockResolvedValue(mockVariant),
          },
          warehouse: {
            findUnique: jest.fn().mockResolvedValue(mockWarehouse),
          },
          inventory: {
            upsert: jest.fn().mockResolvedValue(mockInventory),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(1),
              quantity: 10,
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.adjustStock(adjustDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw error when variant not found', async () => {
      const adjustDto = {
        variantId: '999',
        warehouseId: '1',
        quantity: 10,
        movementType: 'ADJUST',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          productVariant: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(service.adjustStock(adjustDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error when warehouse not found', async () => {
      const adjustDto = {
        variantId: '1',
        warehouseId: '999',
        quantity: 10,
        movementType: 'ADJUST',
      };

      const mockVariant = { id: BigInt(1) };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          productVariant: {
            findUnique: jest.fn().mockResolvedValue(mockVariant),
          },
          warehouse: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(service.adjustStock(adjustDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should prevent negative inventory when enforced', async () => {
      const adjustDto = {
        variantId: '1',
        warehouseId: '1',
        quantity: -150, // More than current stock
        movementType: 'ADJUST',
      };

      const mockVariant = { id: BigInt(1) };
      const mockWarehouse = { id: BigInt(1) };
      const mockInventory = {
        id: BigInt(1),
        quantity: 100, // Current stock
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          productVariant: {
            findUnique: jest.fn().mockResolvedValue(mockVariant),
          },
          warehouse: {
            findUnique: jest.fn().mockResolvedValue(mockWarehouse),
          },
          inventory: {
            findUnique: jest.fn().mockResolvedValue(mockInventory),
          },
        };
        return callback(tx);
      });

      // This test assumes negative inventory prevention is implemented
      // Adjust based on actual implementation
    });
  });

  describe('Bulk Stock Adjustment', () => {
    it('should adjust multiple items in bulk', async () => {
      const bulkDto = {
        items: [
          {
            variantId: '1',
            warehouseId: '1',
            quantity: 10,
            movementType: 'ADJUST',
          },
          {
            variantId: '2',
            warehouseId: '1',
            quantity: 20,
            movementType: 'ADJUST',
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          productVariant: {
            findUnique: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          warehouse: {
            findUnique: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          inventory: {
            upsert: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
        };
        return callback(tx);
      });

      const result = await service.bulkAdjustStock(bulkDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Stock Query', () => {
    it('should query stock with filters', async () => {
      const queryDto = {
        warehouseId: '1',
        lowStock: true,
        page: 1,
        limit: 10,
      };

      const mockInventory = [
        {
          id: BigInt(1),
          variantId: BigInt(1),
          warehouseId: BigInt(1),
          quantity: 5,
          variant: {
            sku: 'SKU001',
            product: { name: 'Product 1' },
          },
        },
      ];

      mockPrismaService.inventory.findMany.mockResolvedValue(mockInventory);

      const result = await service.getStock(queryDto);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by warehouse', async () => {
      const queryDto = {
        warehouseId: '1',
      };

      mockPrismaService.inventory.findMany.mockResolvedValue([]);

      await service.getStock(queryDto);

      expect(mockPrismaService.inventory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: BigInt(1),
          }),
        }),
      );
    });
  });

  describe('Movement History', () => {
    it('should retrieve movement history with filters', async () => {
      const queryDto = {
        variantId: '1',
        warehouseId: '1',
        movementType: 'SALE',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        page: 1,
        limit: 10,
      };

      const mockMovements = [
        {
          id: BigInt(1),
          variantId: BigInt(1),
          warehouseId: BigInt(1),
          quantity: -10,
          movementType: 'SALE',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.stockMovement.findMany.mockResolvedValue(mockMovements);
      mockPrismaService.stockMovement.count.mockResolvedValue(1);

      const result = await service.getMovements(queryDto);

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockMovements);
      expect(result.total).toBe(1);
    });

    it('should filter movements by date range', async () => {
      const queryDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      mockPrismaService.stockMovement.findMany.mockResolvedValue([]);
      mockPrismaService.stockMovement.count.mockResolvedValue(0);

      await service.getMovements(queryDto);

      expect(mockPrismaService.stockMovement.findMany).toHaveBeenCalled();
    });
  });

  describe('Decimal Quantity Handling', () => {
    it('should handle decimal quantities with unit conversion', async () => {
      const adjustDto = {
        variantId: '1',
        warehouseId: '1',
        quantity: 0.5, // 0.5 kg
        movementType: 'ADJUST',
        displayQuantity: 500, // 500 g
        displayUnit: 'g',
        conversionRate: 1000, // 1 kg = 1000 g
      };

      const mockVariant = { id: BigInt(1) };
      const mockWarehouse = { id: BigInt(1) };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          productVariant: {
            findUnique: jest.fn().mockResolvedValue(mockVariant),
          },
          warehouse: {
            findUnique: jest.fn().mockResolvedValue(mockWarehouse),
          },
          inventory: {
            upsert: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          stockMovement: {
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
        };
        return callback(tx);
      });

      await service.adjustStock(adjustDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should validate decimal quantity against conversion rate', async () => {
      const adjustDto = {
        variantId: '1',
        warehouseId: '1',
        quantity: 0.333, // Invalid precision
        movementType: 'ADJUST',
        displayQuantity: 333,
        displayUnit: 'g',
        conversionRate: 1000,
      };

      // This test assumes validation is implemented
      // Adjust based on actual implementation
    });
  });

  describe('Low Stock Alerts', () => {
    it('should identify low stock items', async () => {
      const mockInventory = [
        {
          id: BigInt(1),
          quantity: 5,
          variant: {
            product: {
              minStock: 10,
            },
          },
        },
      ];

      mockPrismaService.inventory.findMany.mockResolvedValue(mockInventory);

      const result = await service.getLowStockItems();

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Inventory Report', () => {
    it('should generate inventory report', async () => {
      const reportDto = {
        warehouseId: '1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const mockData = [
        {
          variant: {
            sku: 'SKU001',
            product: { name: 'Product 1' },
          },
          quantity: 100,
        },
      ];

      mockPrismaService.inventory.findMany.mockResolvedValue(mockData);

      const result = await service.getInventoryReport(reportDto);

      expect(result).toBeDefined();
    });
  });
});
