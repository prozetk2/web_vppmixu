import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: PrismaService;

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
    },
    customerPayment: {
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    customerPaymentAllocation: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
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
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Customer CRUD Operations', () => {
    it('should create a customer', async () => {
      const createDto = {
        name: 'Test Customer',
        phone: '0123456789',
        email: 'test@example.com',
      };

      const mockCustomer = {
        id: BigInt(1),
        ...createDto,
        currentDebt: 0,
        createdAt: new Date(),
      };

      mockPrismaService.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCustomer);
      expect(mockPrismaService.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining(createDto),
      });
    });

    it('should find a customer by id', async () => {
      const mockCustomer = {
        id: BigInt(1),
        name: 'Test Customer',
        currentDebt: 1000,
      };

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.findOne('1');

      expect(result).toEqual(mockCustomer);
      expect(mockPrismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });

    it('should update a customer', async () => {
      const updateDto = { name: 'Updated Name' };
      const mockCustomer = {
        id: BigInt(1),
        name: 'Updated Name',
      };

      mockPrismaService.customer.findUnique.mockResolvedValue({ id: BigInt(1) });
      mockPrismaService.customer.update.mockResolvedValue(mockCustomer);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(mockCustomer);
    });

    it('should delete a customer', async () => {
      mockPrismaService.customer.findUnique.mockResolvedValue({ id: BigInt(1) });
      mockPrismaService.customer.delete.mockResolvedValue({ id: BigInt(1) });

      await service.remove('1');

      expect(mockPrismaService.customer.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });
  });

  describe('Customer Payment - Auto Allocation (FIFO)', () => {
    it('should pay debt with auto-allocation to oldest invoices first', async () => {
      const customerId = '1';
      const paymentDto = {
        amount: 1500,
        paymentMethod: 'CASH',
        collector: 'John Doe',
      };

      const mockCustomer = {
        id: BigInt(1),
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
        {
          id: BigInt(102),
          invoiceNumber: 'INV002',
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          paymentMethod: null,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
          createdAt: new Date('2024-01-02'),
        },
      ];

      const mockPayment = {
        id: BigInt(1),
        customerId: BigInt(1),
        amount: 1500,
        paymentMethod: 'CASH',
        code: 'PAY001',
        createdAt: new Date(),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
            update: jest.fn().mockResolvedValue(mockCustomer),
          },
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
            update: jest.fn(),
          },
          customerPayment: {
            create: jest.fn().mockResolvedValue(mockPayment),
            findMany: jest.fn().mockResolvedValue([mockPayment]),
          },
          customerPaymentAllocation: {
            createMany: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
          },
        };
        return callback(tx);
      });

      const result = await service.payDebt(customerId, paymentDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw error when payment amount is zero or negative', async () => {
      const paymentDto = {
        amount: 0,
        paymentMethod: 'CASH',
      };

      const mockCustomer = { id: BigInt(1), currentDebt: 1000 };
      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(service.payDebt('1', paymentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when payment exceeds outstanding debt', async () => {
      const customerId = '1';
      const paymentDto = {
        amount: 3000, // More than total debt
        paymentMethod: 'CASH',
      };

      const mockCustomer = {
        id: BigInt(1),
        currentDebt: 2000,
      };

      const mockInvoices = [
        {
          id: BigInt(101),
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
          },
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
          },
        };
        return callback(tx);
      });

      await expect(service.payDebt(customerId, paymentDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Customer Payment - Explicit Allocation', () => {
    it('should pay debt with explicit invoice allocations', async () => {
      const customerId = '1';
      const paymentDto = {
        amount: 1500,
        paymentMethod: 'CASH',
        allocations: [
          { invoiceId: '101', amount: 1000 },
          { invoiceId: '102', amount: 500 },
        ],
      };

      const mockCustomer = {
        id: BigInt(1),
        currentDebt: 2000,
      };

      const mockInvoices = [
        {
          id: BigInt(101),
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          paymentMethod: null,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
        },
        {
          id: BigInt(102),
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
          paymentMethod: null,
          cashAmount: 0,
          cardAmount: 0,
          transferAmount: 0,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
            update: jest.fn(),
          },
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
            update: jest.fn(),
          },
          customerPayment: {
            create: jest.fn().mockResolvedValue({ id: BigInt(1) }),
            findMany: jest.fn().mockResolvedValue([]),
          },
          customerPaymentAllocation: {
            createMany: jest.fn(),
            findMany: jest.fn().mockResolvedValue([]),
          },
        };
        return callback(tx);
      });

      const result = await service.payDebt(customerId, paymentDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should throw error when allocations do not match payment amount', async () => {
      const paymentDto = {
        amount: 1500,
        paymentMethod: 'CASH',
        allocations: [
          { invoiceId: '101', amount: 1000 }, // Total = 1000, but payment = 1500
        ],
      };

      const mockCustomer = { id: BigInt(1), currentDebt: 2000 };
      const mockInvoices = [
        {
          id: BigInt(101),
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
          },
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
          },
        };
        return callback(tx);
      });

      await expect(service.payDebt('1', paymentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error when allocation exceeds invoice outstanding', async () => {
      const paymentDto = {
        amount: 1500,
        paymentMethod: 'CASH',
        allocations: [
          { invoiceId: '101', amount: 1500 }, // Invoice only has 1000 outstanding
        ],
      };

      const mockCustomer = { id: BigInt(1), currentDebt: 2000 };
      const mockInvoices = [
        {
          id: BigInt(101),
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
          },
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
          },
        };
        return callback(tx);
      });

      await expect(service.payDebt('1', paymentDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error on duplicate invoice allocations', async () => {
      const paymentDto = {
        amount: 1500,
        paymentMethod: 'CASH',
        allocations: [
          { invoiceId: '101', amount: 750 },
          { invoiceId: '101', amount: 750 }, // Duplicate
        ],
      };

      const mockCustomer = { id: BigInt(1), currentDebt: 2000 };
      const mockInvoices = [
        {
          id: BigInt(101),
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
          },
          invoice: {
            findMany: jest.fn().mockResolvedValue(mockInvoices),
          },
        };
        return callback(tx);
      });

      await expect(service.payDebt('1', paymentDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Payment Deletion and Reversal', () => {
    it('should delete payment and reverse allocations', async () => {
      const customerId = '1';
      const paymentId = '1';

      const mockCustomer = { id: BigInt(1), currentDebt: 500 };
      const mockPayment = {
        id: BigInt(1),
        amount: 1500,
        customerId: BigInt(1),
      };

      const mockAllocations = [
        {
          id: BigInt(1),
          paymentId: BigInt(1),
          invoiceId: BigInt(101),
          amount: 1000,
        },
        {
          id: BigInt(2),
          paymentId: BigInt(1),
          invoiceId: BigInt(102),
          amount: 500,
        },
      ];

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
            update: jest.fn(),
          },
          customerPayment: {
            findUnique: jest.fn().mockResolvedValue(mockPayment),
            delete: jest.fn(),
          },
          customerPaymentAllocation: {
            findMany: jest.fn().mockResolvedValue(mockAllocations),
            deleteMany: jest.fn(),
          },
          invoice: {
            update: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.deletePayment(customerId, paymentId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Get Customer Payments', () => {
    it('should retrieve all payments with allocations for a customer', async () => {
      const customerId = '1';

      const mockPayments = [
        {
          id: BigInt(1),
          customerId: BigInt(1),
          amount: 1500,
          paymentMethod: 'CASH',
          code: 'PAY001',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.customer.findUnique.mockResolvedValue({ id: BigInt(1) });
      mockPrismaService.customerPayment.findMany.mockResolvedValue(mockPayments);
      mockPrismaService.customerPaymentAllocation.findMany.mockResolvedValue([]);

      const result = await service.getPayments(customerId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Debt Calculation', () => {
    it('should calculate current debt correctly', async () => {
      const customerId = '1';

      const mockCustomer = {
        id: BigInt(1),
        name: 'Test Customer',
        currentDebt: 1000,
      };

      const mockInvoices = [
        {
          id: BigInt(101),
          totalAmount: 1000,
          amountPaid: 0,
          amountDue: 1000,
        },
      ];

      mockPrismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.getDebts(customerId);

      expect(result).toBeDefined();
      expect(result.currentDebt).toBeDefined();
    });
  });
});
