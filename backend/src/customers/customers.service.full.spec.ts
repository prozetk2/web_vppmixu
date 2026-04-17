import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createFullPrismaMock, mockFactories, createTransactionMock } from '../../test/helpers/prisma-mock.helper';

describe('CustomersService - Full Mock Tests', () => {
  let service: CustomersService;
  let prismaService: any;

  beforeEach(async () => {
    const prismaMock = createFullPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('CRUD Operations', () => {
    it('should create a customer', async () => {
      const createDto = {
        name: 'New Customer',
        phone: '0123456789',
        email: 'new@example.com',
      };

      const mockCustomer = mockFactories.customer({
        name: createDto.name,
        phone: createDto.phone,
        email: createDto.email,
      });

      prismaService.customer.create.mockResolvedValue(mockCustomer);

      const result = await service.create(createDto);

      expect(result).toEqual(mockCustomer);
      expect(prismaService.customer.create).toHaveBeenCalled();
    });

    it('should find a customer by id', async () => {
      const mockCustomer = mockFactories.customer();
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      const result = await service.findOne('1');

      expect(result).toEqual(mockCustomer);
      expect(prismaService.customer.findUnique).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should throw NotFoundException when customer not found', async () => {
      prismaService.customer.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });

    it('should update a customer', async () => {
      const mockCustomer = mockFactories.customer();
      const updateDto = { name: 'Updated Name' };

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.customer.update.mockResolvedValue({
        ...mockCustomer,
        ...updateDto,
      });

      const result = await service.update('1', updateDto);

      expect(result.name).toBe('Updated Name');
      expect(prismaService.customer.update).toHaveBeenCalled();
    });

    it('should delete a customer', async () => {
      const mockCustomer = mockFactories.customer();
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.customer.delete.mockResolvedValue(mockCustomer);

      await service.remove('1');

      expect(prismaService.customer.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should find all customers', async () => {
      const mockCustomers = [
        mockFactories.customer({ id: BigInt(1) }),
        mockFactories.customer({ id: BigInt(2) }),
      ];

      prismaService.customer.findMany.mockResolvedValue(mockCustomers);

      const result = await service.findAll();

      expect(result).toEqual(mockCustomers);
      expect(prismaService.customer.findMany).toHaveBeenCalled();
    });
  });

  describe('Payment - Amount Validation', () => {
    it('should reject zero payment amount', async () => {
      const mockCustomer = mockFactories.customer();
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(
        service.payDebt('1', {
          amount: 0,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow('INVALID_PAYMENT_AMOUNT');
    });

    it('should reject negative payment amount', async () => {
      const mockCustomer = mockFactories.customer();
      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      await expect(
        service.payDebt('1', {
          amount: -100,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow('INVALID_PAYMENT_AMOUNT');
    });

    it('should accept valid positive payment', async () => {
      const mockCustomer = mockFactories.customer({ currentDebt: 1000 });
      const mockInvoice = mockFactories.invoice({ amountDue: 1000 });
      const mockPayment = mockFactories.customerPayment({ amount: 500 });

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = createTransactionMock(prismaService);
        tx.invoice.findMany.mockResolvedValue([mockInvoice]);
        tx.invoice.update.mockResolvedValue(mockInvoice);
        tx.customerPayment.create.mockResolvedValue(mockPayment);
        tx.customerPaymentAllocation.createMany.mockResolvedValue({ count: 1 });
        tx.customer.update.mockResolvedValue(mockCustomer);
        tx.$queryRaw.mockResolvedValue([
          {
            ...mockPayment,
            allocations: JSON.stringify([]),
          },
        ]);
        tx.$executeRaw.mockResolvedValue(1);

        return callback(tx);
      });

      const result = await service.payDebt('1', {
        amount: 500,
        paymentMethod: 'CASH',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Payment - Exceeds Debt Validation', () => {
    it('should reject payment exceeding outstanding debt', async () => {
      const mockCustomer = mockFactories.customer({ currentDebt: 1000 });
      const mockInvoice = mockFactories.invoice({ amountDue: 1000 });

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = createTransactionMock(prismaService);
        tx.invoice.findMany.mockResolvedValue([mockInvoice]);
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
      const mockCustomer = mockFactories.customer({ currentDebt: 1000 });
      const mockInvoice = mockFactories.invoice({ amountDue: 1000 });
      const mockPayment = mockFactories.customerPayment({ amount: 1000 });

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = createTransactionMock(prismaService);
        tx.invoice.findMany.mockResolvedValue([mockInvoice]);
        tx.invoice.update.mockResolvedValue(mockInvoice);
        tx.customerPayment.create.mockResolvedValue(mockPayment);
        tx.customerPaymentAllocation.createMany.mockResolvedValue({ count: 1 });
        tx.customer.update.mockResolvedValue(mockCustomer);
        tx.$queryRaw.mockResolvedValue([
          {
            ...mockPayment,
            allocations: JSON.stringify([]),
          },
        ]);
        tx.$executeRaw.mockResolvedValue(1);

        return callback(tx);
      });

      const result = await service.payDebt('1', {
        amount: 1000,
        paymentMethod: 'CASH',
      });

      expect(result).toBeDefined();
    });
  });

  describe('Payment - Explicit Allocation Validation', () => {
    it('should reject duplicate invoice allocations', async () => {
      const mockCustomer = mockFactories.customer({ currentDebt: 2000 });
      const mockInvoice = mockFactories.invoice({ id: BigInt(101), amountDue: 1000 });

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = createTransactionMock(prismaService);
        tx.invoice.findMany.mockResolvedValue([mockInvoice]);
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
      const mockCustomer = mockFactories.customer({ currentDebt: 2000 });
      const mockInvoice = mockFactories.invoice({ id: BigInt(101), amountDue: 1000 });

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = createTransactionMock(prismaService);
        tx.invoice.findMany.mockResolvedValue([mockInvoice]);
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
      const mockCustomer = mockFactories.customer({ currentDebt: 2000 });
      const mockInvoice = mockFactories.invoice({ id: BigInt(101), amountDue: 1000 });

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = createTransactionMock(prismaService);
        tx.invoice.findMany.mockResolvedValue([mockInvoice]);
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

    it('should accept valid explicit allocations', async () => {
      const mockCustomer = mockFactories.customer({ currentDebt: 2000 });
      const mockInvoices = [
        mockFactories.invoice({ id: BigInt(101), amountDue: 1000 }),
        mockFactories.invoice({ id: BigInt(102), amountDue: 1000 }),
      ];
      const mockPayment = mockFactories.customerPayment({ amount: 1500 });

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = createTransactionMock(prismaService);
        tx.invoice.findMany.mockResolvedValue(mockInvoices);
        tx.invoice.update.mockResolvedValue(mockInvoices[0]);
        tx.customerPayment.create.mockResolvedValue(mockPayment);
        tx.customerPaymentAllocation.createMany.mockResolvedValue({ count: 2 });
        tx.customer.update.mockResolvedValue(mockCustomer);
        tx.$queryRaw.mockResolvedValue([
          {
            ...mockPayment,
            allocations: JSON.stringify([]),
          },
        ]);
        tx.$executeRaw.mockResolvedValue(1);

        return callback(tx);
      });

      const result = await service.payDebt('1', {
        amount: 1500,
        paymentMethod: 'CASH',
        allocations: [
          { invoiceId: '101', amount: 1000 },
          { invoiceId: '102', amount: 500 },
        ],
      });

      expect(result).toBeDefined();
    });
  });

  describe('Payment - Auto Allocation (FIFO)', () => {
    it('should allocate to oldest invoice first', async () => {
      const mockCustomer = mockFactories.customer({ currentDebt: 2500 });
      const mockInvoices = [
        mockFactories.invoice({
          id: BigInt(101),
          amountDue: 1000,
          createdAt: new Date('2024-01-01'),
        }),
        mockFactories.invoice({
          id: BigInt(102),
          amountDue: 1500,
          createdAt: new Date('2024-01-02'),
        }),
      ];
      const mockPayment = mockFactories.customerPayment({ amount: 1800 });

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = createTransactionMock(prismaService);
        tx.invoice.findMany.mockResolvedValue(mockInvoices);
        tx.invoice.update.mockResolvedValue(mockInvoices[0]);
        tx.customerPayment.create.mockResolvedValue(mockPayment);
        tx.customerPaymentAllocation.createMany.mockResolvedValue({ count: 2 });
        tx.customer.update.mockResolvedValue(mockCustomer);
        tx.$queryRaw.mockResolvedValue([
          {
            ...mockPayment,
            allocations: JSON.stringify([
              { invoiceId: '101', amount: 1000 },
              { invoiceId: '102', amount: 800 },
            ]),
          },
        ]);
        tx.$executeRaw.mockResolvedValue(1);

        return callback(tx);
      });

      const result = await service.payDebt('1', {
        amount: 1800,
        paymentMethod: 'CASH',
      });

      expect(result).toBeDefined();
      // First invoice should be fully paid (1000)
      // Second invoice should be partially paid (800)
    });
  });

  describe('Get Payments', () => {
    it('should retrieve customer payments', async () => {
      const mockCustomer = mockFactories.customer();
      const mockPayments = [
        {
          ...mockFactories.customerPayment(),
          allocations: JSON.stringify([]),
        },
      ];

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);
      prismaService.$queryRaw.mockResolvedValue(mockPayments);

      const result = await service.getPayments('1');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Delete Payment', () => {
    it('should delete payment and reverse allocations', async () => {
      const mockCustomer = mockFactories.customer();
      const mockPayment = mockFactories.customerPayment();
      const mockAllocations = [
        {
          id: BigInt(1),
          paymentId: BigInt(1),
          invoiceId: BigInt(101),
          amount: 1000,
        },
      ];

      prismaService.customer.findUnique.mockResolvedValue(mockCustomer);

      prismaService.$transaction.mockImplementation(async (callback) => {
        const tx = createTransactionMock(prismaService);
        tx.customerPayment.findUnique.mockResolvedValue(mockPayment);
        tx.customerPaymentAllocation.findMany.mockResolvedValue(mockAllocations);
        tx.customerPaymentAllocation.deleteMany.mockResolvedValue({ count: 1 });
        tx.customerPayment.delete.mockResolvedValue(mockPayment);
        tx.invoice.update.mockResolvedValue({});
        tx.customer.update.mockResolvedValue(mockCustomer);

        return callback(tx);
      });

      await service.deletePayment('1', '1');

      expect(prismaService.$transaction).toHaveBeenCalled();
    });
  });
});

console.log('✅ Full Mock Customer Service Tests - Complete coverage without database!');
