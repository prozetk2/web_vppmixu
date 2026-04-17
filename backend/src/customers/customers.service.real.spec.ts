import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CustomersService - Real Implementation Tests', () => {
  let service: CustomersService;
  let prismaService: PrismaService;

  // Mock PrismaService
  const mockPrismaService = {
    customer: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    invoice: {
      findMany: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    customerPayment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    customerPaymentAllocation: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Payment Amount Validation', () => {
    it('should reject zero payment amount', async () => {
      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'Test Customer',
        currentDebt: 1000,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(
        service.payDebt('1', {
          amount: 0,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow(BadRequestException);
      
      await expect(
        service.payDebt('1', {
          amount: 0,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow('INVALID_PAYMENT_AMOUNT');
    });

    it('should reject negative payment amount', async () => {
      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'Test Customer',
        currentDebt: 1000,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(
        service.payDebt('1', {
          amount: -100,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow('INVALID_PAYMENT_AMOUNT');
    });

    it('should accept valid positive payment amount', async () => {
      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'Test Customer',
        currentDebt: 1000,
      };

      const mockInvoices = [
        {
          id: BigInt(101),
          invoiceNumber: 'INV001',
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          paymentMethod: null,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
          createdAt: new Date('2024-01-01'),
        },
      ];

      const mockPayment = {
        id: BigInt(1),
        code: 'PAY001',
        customerId: BigInt(1),
        amount: 500,
        paymentMethod: 'CASH',
        createdAt: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
            update: jest.fn().mockResolvedValue({}),
          },
          customerPayment: {
            create: jest.fn().mockResolvedValue(mockPayment),
          },
          customerPaymentAllocation: {
            createMany: jest.fn().mockResolvedValue({}),
          },
          customer: {
            update: jest.fn().mockResolvedValue(mockCustomer),
          },
          $queryRaw: jest.fn().mockResolvedValue([
            {
              ...mockPayment,
              allocations: [],
            },
          ]),
        };
        return callback(tx);
      });

      const result = await service.payDebt('1', {
        amount: 500,
        paymentMethod: 'CASH',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Payment Exceeds Debt Validation', () => {
    it('should reject payment exceeding total outstanding debt', async () => {
      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'Test Customer',
        currentDebt: 1000,
      };

      const mockInvoices = [
        {
          id: BigInt(101),
          invoiceNumber: 'INV001',
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          paymentMethod: null,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
          },
        };
        return callback(tx);
      });

      await expect(
        service.payDebt('1', {
          amount: 1500, // More than 1000 outstanding
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow('PAYMENT_EXCEEDS_OUTSTANDING_DEBT');
    });

    it('should accept payment equal to outstanding debt', async () => {
      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'Test Customer',
        currentDebt: 1000,
      };

      const mockInvoices = [
        {
          id: BigInt(101),
          invoiceNumber: 'INV001',
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          paymentMethod: null,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
          createdAt: new Date('2024-01-01'),
        },
      ];

      const mockPayment = {
        id: BigInt(1),
        code: 'PAY001',
        customerId: BigInt(1),
        amount: 1000,
        paymentMethod: 'CASH',
        createdAt: new Date(),
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
            update: jest.fn().mockResolvedValue({}),
          },
          customerPayment: {
            create: jest.fn().mockResolvedValue(mockPayment),
          },
          customerPaymentAllocation: {
            createMany: jest.fn().mockResolvedValue({}),
          },
          customer: {
            update: jest.fn().mockResolvedValue(mockCustomer),
          },
          $queryRaw: jest.fn().mockResolvedValue([
            {
              ...mockPayment,
              allocations: [],
            },
          ]),
        };
        return callback(tx);
      });

      const result = await service.payDebt('1', {
        amount: 1000,
        paymentMethod: 'CASH',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Explicit Allocation Validation', () => {
    it('should reject duplicate invoice allocations', async () => {
      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'Test Customer',
        currentDebt: 2000,
      };

      const mockInvoices = [
        {
          id: BigInt(101),
          invoiceNumber: 'INV001',
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          paymentMethod: null,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
          },
        };
        return callback(tx);
      });

      await expect(
        service.payDebt('1', {
          amount: 1000,
          paymentMethod: 'CASH',
          allocations: [
            { invoiceId: '101', amount: 500 },
            { invoiceId: '101', amount: 500 }, // Duplicate
          ],
        }),
      ).rejects.toThrow('DUPLICATE_INVOICE_ALLOCATION');
    });

    it('should reject allocations not matching payment amount', async () => {
      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'Test Customer',
        currentDebt: 2000,
      };

      const mockInvoices = [
        {
          id: BigInt(101),
          invoiceNumber: 'INV001',
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          paymentMethod: null,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
          },
        };
        return callback(tx);
      });

      await expect(
        service.payDebt('1', {
          amount: 1000,
          paymentMethod: 'CASH',
          allocations: [
            { invoiceId: '101', amount: 500 }, // Only 500, but payment is 1000
          ],
        }),
      ).rejects.toThrow('ALLOCATIONS_MUST_MATCH_PAYMENT_AMOUNT');
    });

    it('should reject allocation exceeding invoice outstanding', async () => {
      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'Test Customer',
        currentDebt: 2000,
      };

      const mockInvoices = [
        {
          id: BigInt(101),
          invoiceNumber: 'INV001',
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          paymentMethod: null,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          ...mockPrismaService,
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
          },
        };
        return callback(tx);
      });

      await expect(
        service.payDebt('1', {
          amount: 1500,
          paymentMethod: 'CASH',
          allocations: [
            { invoiceId: '101', amount: 1500 }, // Invoice only has 1000 outstanding
          ],
        }),
      ).rejects.toThrow('ALLOCATION_EXCEEDS_OUTSTANDING');
    });
  });

  describe('Customer Not Found', () => {
    it('should throw NotFoundException when customer does not exist', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(
        service.payDebt('999', {
          amount: 100,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Payment Method Normalization', () => {
    it('should normalize payment method to uppercase', () => {
      const normalized = (service as any).normalizePaymentMethod('cash');
      expect(normalized).toBe('CASH');
    });

    it('should default to CASH for invalid method', () => {
      const normalized = (service as any).normalizePaymentMethod('invalid');
      expect(normalized).toBe('CASH');
    });

    it('should handle TRANSFER method', () => {
      const normalized = (service as any).normalizePaymentMethod('TRANSFER');
      expect(normalized).toBe('TRANSFER');
    });

    it('should handle CARD method', () => {
      const normalized = (service as any).normalizePaymentMethod('CARD');
      expect(normalized).toBe('CARD');
    });
  });
});

console.log('✅ Customer Payment Tests - Testing business logic without database');
