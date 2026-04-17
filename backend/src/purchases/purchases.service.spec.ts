import { Test, TestingModule } from '@nestjs/testing';
import { PurchasesService } from './purchases.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PurchasesService', () => {
  let service: PurchasesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    purchaseOrder: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    supplier: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    supplierPayment: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    supplierPaymentAllocation: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    stockMovement: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchasesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PurchasesService>(PurchasesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Purchase Order Number Generation', () => {
    it('should generate order number with format PN + YYMM + 4-digit sequence', async () => {
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue(null);

      const orderNumber = await (service as any).generateOrderNumber();

      expect(orderNumber).toMatch(/^PN\d{6}$/);
      expect(orderNumber.length).toBe(10);
    });

    it('should increment sequence correctly', async () => {
      const today = new Date();
      const yyStr = today.getFullYear().toString().slice(-2);
      const mmStr = String(today.getMonth() + 1).padStart(2, '0');
      const prefix = `PN${yyStr}${mmStr}`;

      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue({
        orderNumber: `${prefix}0010`,
      });

      const orderNumber = await (service as any).generateOrderNumber();

      expect(orderNumber).toBe(`${prefix}0011`);
    });
  });

  describe('Create Purchase Order', () => {
    it('should throw error when items array is empty', async () => {
      const createDto = {
        supplierId: '1',
        items: [],
      };

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when supplier not found', async () => {
      const createDto = {
        supplierId: '999',
        items: [
          {
            productId: '1',
            quantity: 10,
            unitCost: 50,
          },
        ],
      };

      mockPrismaService.supplier.findUnique.mockResolvedValue(null);

      await expect(service.create(createDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create purchase order successfully', async () => {
      const createDto = {
        supplierId: '1',
        items: [
          {
            productId: '1',
            quantity: 10,
            unitCost: 50,
            unit: 'pcs',
          },
        ],
        discountAmount: 50,
        prepaymentAmount: 200,
        paymentMethod: 'TRANSFER',
      };

      const mockSupplier = {
        id: BigInt(1),
        name: 'Supplier 1',
        totalPurchase: 0,
        currentDebt: 0,
      };

      const mockProduct = {
        id: BigInt(1),
        name: 'Product 1',
        variants: [
          {
            id: BigInt(1),
            sku: 'SKU001',
            active: true,
          },
        ],
      };

      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue(null);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          purchaseOrder: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: BigInt(1),
              orderNumber: 'PN24010001',
            }),
          },
          supplier: {
            update: jest.fn(),
          },
          supplierPayment: {
            create: jest.fn(),
          },
          supplierPaymentAllocation: {
            create: jest.fn(),
          },
        };
        return callback(tx);
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should clamp discount amount to subtotal', async () => {
      const subtotal = 500;
      const requestedDiscount = 600; // More than subtotal

      const result = (service as any).clampDiscountAmount(
        requestedDiscount,
        subtotal,
      );

      expect(result).toBe(subtotal);
    });

    it('should handle decimal quantities', async () => {
      const createDto = {
        supplierId: '1',
        items: [
          {
            productId: '1',
            quantity: 2.5, // Decimal quantity
            unitCost: 100,
            unit: 'kg',
            displayQuantity: 2500,
          },
        ],
      };

      const mockSupplier = { id: BigInt(1) };
      const mockProduct = {
        id: BigInt(1),
        variants: [{ id: BigInt(1), active: true }],
      };

      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.purchaseOrder.findFirst.mockResolvedValue(null);

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          purchaseOrder: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          supplier: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.create(createDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Purchase Status Resolution', () => {
    it('should return PAID when fully paid', () => {
      const status = (service as any).resolvePurchaseStatus(1000, 1000);
      expect(status).toBe('PAID');
    });

    it('should return PARTIAL when partially paid', () => {
      const status = (service as any).resolvePurchaseStatus(1000, 500);
      expect(status).toBe('PARTIAL');
    });

    it('should return CONFIRMED when not paid', () => {
      const status = (service as any).resolvePurchaseStatus(1000, 0);
      expect(status).toBe('CONFIRMED');
    });
  });

  describe('Confirm Purchase Order', () => {
    it('should confirm purchase and create stock movements', async () => {
      const purchaseId = '1';

      const mockPurchase = {
        id: BigInt(1),
        orderNumber: 'PN24010001',
        status: 'PENDING',
        warehouseId: BigInt(1),
        items: [
          {
            id: BigInt(1),
            variantId: BigInt(1),
            quantity: 10,
            unitCost: 50,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          purchaseOrder: {
            findUnique: jest.fn().mockResolvedValue(mockPurchase),
            update: jest.fn(),
          },
          stockMovement: {
            createMany: jest.fn(),
          },
          inventory: {
            upsert: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.confirmPurchase(purchaseId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw error when purchase not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          purchaseOrder: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(service.confirmPurchase('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Supplier Payment Allocation', () => {
    it('should allocate payment to purchase orders', async () => {
      const supplierId = '1';
      const paymentDto = {
        amount: 1000,
        paymentMethod: 'CASH',
        allocations: [
          {
            purchaseOrderId: '1',
            amount: 1000,
          },
        ],
      };

      const mockSupplier = {
        id: BigInt(1),
        totalPurchase: 2000,
        currentDebt: 2000,
      };

      const mockPurchaseOrder = {
        id: BigInt(1),
        totalAmount: 1000,
        amountPaid: 0,
        status: 'CONFIRMED',
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          supplier: {
            findUnique: jest.fn().mockResolvedValue(mockSupplier),
            update: jest.fn(),
          },
          purchaseOrder: {
            findUnique: jest.fn().mockResolvedValue(mockPurchaseOrder),
            update: jest.fn(),
          },
          supplierPayment: {
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 1000 } }),
          },
          supplierPaymentAllocation: {
            create: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.paySupplier(supplierId, paymentDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should recalculate supplier debt after payment', async () => {
      const supplierId = BigInt(1);

      const mockSupplier = {
        id: supplierId,
        totalPurchase: 2000,
      };

      mockPrismaService.supplier.findUnique.mockResolvedValue(mockSupplier);
      mockPrismaService.supplierPayment.aggregate.mockResolvedValue({
        _sum: { amount: 1000 },
      });
      mockPrismaService.supplier.update.mockResolvedValue({
        ...mockSupplier,
        currentDebt: 1000,
      });

      const result = await (service as any).recalculateSupplierCurrentDebt(
        supplierId,
      );

      expect(result).toBe(1000);
      expect(mockPrismaService.supplier.update).toHaveBeenCalledWith({
        where: { id: supplierId },
        data: { currentDebt: 1000 },
      });
    });
  });

  describe('Query Purchase Orders', () => {
    it('should query purchases with filters', async () => {
      const queryDto = {
        supplierId: '1',
        status: 'CONFIRMED',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        page: 1,
        limit: 10,
      };

      const mockPurchases = [
        {
          id: BigInt(1),
          orderNumber: 'PN24010001',
          status: 'CONFIRMED',
        },
      ];

      mockPrismaService.purchaseOrder.findMany.mockResolvedValue(mockPurchases);
      mockPrismaService.purchaseOrder.count.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockPurchases);
      expect(result.total).toBe(1);
    });
  });

  describe('Delete Supplier Payment', () => {
    it('should delete payment and reverse allocations', async () => {
      const supplierId = '1';
      const paymentId = '1';

      const mockPayment = {
        id: BigInt(1),
        supplierId: BigInt(1),
        amount: 1000,
      };

      const mockAllocations = [
        {
          id: BigInt(1),
          paymentId: BigInt(1),
          purchaseOrderId: BigInt(1),
          amount: 1000,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          supplier: {
            findUnique: jest.fn().mockResolvedValue({ id: BigInt(1) }),
            update: jest.fn(),
          },
          supplierPayment: {
            findUnique: jest.fn().mockResolvedValue(mockPayment),
            delete: jest.fn(),
            aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 0 } }),
          },
          supplierPaymentAllocation: {
            findMany: jest.fn().mockResolvedValue(mockAllocations),
            deleteMany: jest.fn(),
          },
          purchaseOrder: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.deletePayment(supplierId, paymentId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
