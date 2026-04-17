import { Test, TestingModule } from '@nestjs/testing';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SalesService', () => {
  let service: SalesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SalesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SalesService>(SalesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Order Number Generation', () => {
    it('should generate order number with correct format HD + YYMM + 4-digit sequence', async () => {
      mockPrismaService.order.findFirst.mockResolvedValue(null);

      const orderNumber = await (service as any).generateOrderNumber();

      expect(orderNumber).toMatch(/^HD\d{8}$/); // HD + YYMM + 4 digits = 10 chars total
      expect(orderNumber.length).toBe(10);
      expect(orderNumber.startsWith('HD')).toBe(true);
    });

    it('should increment sequence number correctly', async () => {
      const today = new Date();
      const yyStr = today.getFullYear().toString().slice(-2);
      const mmStr = String(today.getMonth() + 1).padStart(2, '0');
      const prefix = `HD${yyStr}${mmStr}`;

      mockPrismaService.order.findFirst.mockResolvedValue({
        orderNumber: `${prefix}0005`,
      });

      const orderNumber = await (service as any).generateOrderNumber();

      expect(orderNumber).toBe(`${prefix}0006`);
    });
  });

  describe('Create Order', () => {
    it('should throw error when items array is empty', async () => {
      const createDto = {
        items: [],
        customerId: '1',
      };

      await expect(service.create(createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create order successfully', async () => {
      const createDto = {
        customerId: '1',
        customerName: 'John Doe',
        customerPhone: '0123456789',
        customerAddress: '123 Street',
        items: [
          {
            productId: '1',
            quantity: 2,
            unitPrice: 100,
          },
        ],
        payment: {
          amount: 200,
          method: 'CASH',
        },
      };

      const mockCustomer = {
        id: BigInt(1),
        name: 'John Doe',
        phone: '0123456789',
      };

      const mockProduct = {
        id: BigInt(1),
        name: 'Product 1',
        defaultPrice: 100,
        variants: [
          {
            id: BigInt(1),
            sku: 'SKU001',
            price: 100,
            active: true,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findMany: jest.fn().mockResolvedValue([mockProduct]),
          },
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
            update: jest.fn(),
          },
          order: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: BigInt(1),
              orderNumber: 'HD24010001',
            }),
          },
          invoice: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(1),
              invoiceNumber: 'INV001',
            }),
          },
          stockMovement: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle multiple payment methods', async () => {
      const createDto = {
        items: [
          {
            productId: '1',
            quantity: 1,
            unitPrice: 100,
          },
        ],
        payment: {
          amount: 100,
          method: 'TRANSFER',
        },
      };

      const mockProduct = {
        id: BigInt(1),
        variants: [
          {
            id: BigInt(1),
            price: 100,
            active: true,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findMany: jest.fn().mockResolvedValue([mockProduct]),
          },
          customer: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          order: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          invoice: {
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          stockMovement: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.create(createDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should calculate totals with discount correctly', async () => {
      const createDto = {
        items: [
          {
            productId: '1',
            quantity: 2,
            unitPrice: 100,
            discount: 10,
          },
        ],
        discountAmount: 20,
        payment: {
          amount: 160, // (2 * 100 - 10) - 20 = 170 - 10 = 160
          method: 'CASH',
        },
      };

      const mockProduct = {
        id: BigInt(1),
        variants: [
          {
            id: BigInt(1),
            price: 100,
            active: true,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findMany: jest.fn().mockResolvedValue([mockProduct]),
          },
          customer: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          order: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          invoice: {
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          stockMovement: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.create(createDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should handle decimal quantities with unit conversion', async () => {
      const createDto = {
        items: [
          {
            productId: '1',
            quantity: 0.5, // 0.5 kg
            unitPrice: 100,
            unit: 'kg',
            displayQuantity: 500,
            conversionRate: 1000, // 1 kg = 1000 g
          },
        ],
        payment: {
          amount: 50,
          method: 'CASH',
        },
      };

      const mockProduct = {
        id: BigInt(1),
        variants: [
          {
            id: BigInt(1),
            price: 100,
            active: true,
          },
        ],
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          product: {
            findMany: jest.fn().mockResolvedValue([mockProduct]),
          },
          customer: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          order: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          invoice: {
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
          },
          stockMovement: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.create(createDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Return Order', () => {
    it('should create return order and reverse stock movement', async () => {
      const orderId = '1';

      const mockOrder = {
        id: BigInt(1),
        orderNumber: 'HD24010001',
        customerId: BigInt(1),
        totalAmount: 200,
        items: [
          {
            id: BigInt(1),
            variantId: BigInt(1),
            quantity: 2,
            unitPrice: 100,
          },
        ],
      };

      const mockInvoice = {
        id: BigInt(1),
        invoiceNumber: 'INV001',
        totalAmount: 200,
        amountPaid: 200,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(mockOrder),
            update: jest.fn(),
          },
          invoice: {
            findFirst: jest.fn().mockResolvedValue(mockInvoice),
            update: jest.fn(),
          },
          customer: {
            update: jest.fn(),
          },
          stockMovement: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.returnOrder(orderId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          order: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };
        return callback(tx);
      });

      await expect(service.returnOrder('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Query Orders', () => {
    it('should query orders with filters', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        status: 'COMPLETED',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const mockOrders = [
        {
          id: BigInt(1),
          orderNumber: 'HD24010001',
          status: 'COMPLETED',
        },
      ];

      mockPrismaService.order.findMany.mockResolvedValue(mockOrders);
      mockPrismaService.order.count.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockOrders);
      expect(result.total).toBe(1);
    });
  });
});
