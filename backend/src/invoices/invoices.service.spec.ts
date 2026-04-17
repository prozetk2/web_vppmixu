import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    invoiceItem: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Create Invoice', () => {
    it('should create invoice with customer snapshot', async () => {
      const createDto = {
        customerId: '1',
        items: [
          {
            productCode: 'SKU001',
            productName: 'Product 1',
            quantity: 2,
            unitPrice: 100,
            discount: 10,
          },
        ],
        totalAmount: 190,
        amountPaid: 190,
        paymentMethod: 'CASH',
      };

      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0123456789',
        address: '123 Street',
      };

      const mockInvoice = {
        id: BigInt(1),
        invoiceNumber: 'INV001',
        ...createDto,
        customerCodeSnapshot: mockCustomer.code,
        customerNameSnapshot: mockCustomer.name,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
          },
          invoice: {
            create: jest.fn().mockResolvedValue(mockInvoice),
          },
          invoiceItem: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      const result = await service.create(createDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('should calculate amountDue correctly', async () => {
      const createDto = {
        items: [
          {
            productCode: 'SKU001',
            productName: 'Product 1',
            quantity: 1,
            unitPrice: 100,
          },
        ],
        totalAmount: 100,
        amountPaid: 60,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          invoice: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(1),
              totalAmount: 100,
              amountPaid: 60,
              amountDue: 40,
            }),
          },
          invoiceItem: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      const result = await service.create(createDto);

      expect(result.amountDue).toBe(40);
    });

    it('should track payment method breakdown', async () => {
      const createDto = {
        items: [
          {
            productCode: 'SKU001',
            productName: 'Product 1',
            quantity: 1,
            unitPrice: 100,
          },
        ],
        totalAmount: 100,
        amountPaid: 100,
        paymentMethod: 'CASH',
        cashAmount: 50,
        cardAmount: 30,
        transferAmount: 20,
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
          invoice: {
            create: jest.fn().mockResolvedValue({
              id: BigInt(1),
              cashAmount: 50,
              cardAmount: 30,
              transferAmount: 20,
            }),
          },
          invoiceItem: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      const result = await service.create(createDto);

      expect(result.cashAmount).toBe(50);
      expect(result.cardAmount).toBe(30);
      expect(result.transferAmount).toBe(20);
    });
  });

  describe('Query Invoices', () => {
    it('should query invoices with all filters', async () => {
      const queryDto = {
        status: 'PAID',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        customerId: '1',
        paymentMethod: 'CASH',
        page: 1,
        limit: 10,
      };

      const mockInvoices = [
        {
          id: BigInt(1),
          invoiceNumber: 'INV001',
          status: 'PAID',
          totalAmount: 100,
          amountPaid: 100,
          amountDue: 0,
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);
      mockPrismaService.invoice.count.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(result).toBeDefined();
      expect(result.data).toEqual(mockInvoices);
      expect(result.total).toBe(1);
    });

    it('should filter by date range', async () => {
      const queryDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.any(Object),
          }),
        }),
      );
    });

    it('should filter by customer', async () => {
      const queryDto = {
        customerId: '1',
      };

      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            customerId: BigInt(1),
          }),
        }),
      );
    });

    it('should filter by payment method', async () => {
      const queryDto = {
        paymentMethod: 'CASH',
      };

      mockPrismaService.invoice.findMany.mockResolvedValue([]);
      mockPrismaService.invoice.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalled();
    });
  });

  describe('Update Invoice', () => {
    it('should update invoice successfully', async () => {
      const invoiceId = '1';
      const updateDto = {
        note: 'Updated note',
        status: 'PAID',
      };

      const mockInvoice = {
        id: BigInt(1),
        invoiceNumber: 'INV001',
        ...updateDto,
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue({ id: BigInt(1) });
      mockPrismaService.invoice.update.mockResolvedValue(mockInvoice);

      const result = await service.update(invoiceId, updateDto);

      expect(result).toEqual(mockInvoice);
      expect(mockPrismaService.invoice.update).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
        data: updateDto,
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.update('999', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('Get Invoice Details', () => {
    it('should return invoice with items', async () => {
      const invoiceId = '1';

      const mockInvoice = {
        id: BigInt(1),
        invoiceNumber: 'INV001',
        totalAmount: 100,
        items: [
          {
            id: BigInt(1),
            productCode: 'SKU001',
            productName: 'Product 1',
            quantity: 1,
            unitPrice: 100,
          },
        ],
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.findOne(invoiceId);

      expect(result).toEqual(mockInvoice);
      expect(result.items).toBeDefined();
      expect(result.items.length).toBe(1);
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Delete Invoice', () => {
    it('should delete invoice successfully', async () => {
      const invoiceId = '1';

      mockPrismaService.invoice.findUnique.mockResolvedValue({ id: BigInt(1) });
      mockPrismaService.invoice.delete.mockResolvedValue({ id: BigInt(1) });

      await service.remove(invoiceId);

      expect(mockPrismaService.invoice.delete).toHaveBeenCalledWith({
        where: { id: BigInt(1) },
      });
    });

    it('should throw NotFoundException when invoice not found', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await expect(service.remove('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('Export to Excel', () => {
    it('should export invoices to Excel format', async () => {
      const queryDto = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      };

      const mockInvoices = [
        {
          id: BigInt(1),
          invoiceNumber: 'INV001',
          totalAmount: 100,
          amountPaid: 100,
          amountDue: 0,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.exportToExcel(queryDto);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Customer Snapshot', () => {
    it('should store customer snapshot at time of invoice creation', async () => {
      const createDto = {
        customerId: '1',
        items: [
          {
            productCode: 'SKU001',
            productName: 'Product 1',
            quantity: 1,
            unitPrice: 100,
          },
        ],
        totalAmount: 100,
      };

      const mockCustomer = {
        id: BigInt(1),
        code: 'CUST001',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '0123456789',
        address: '123 Street',
        area: 'District 1',
        ward: 'Ward 1',
        dateOfBirth: new Date('1990-01-01'),
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          customer: {
            findUnique: jest.fn().mockResolvedValue(mockCustomer),
          },
          invoice: {
            create: jest.fn().mockImplementation((args) => {
              expect(args.data.customerCodeSnapshot).toBe(mockCustomer.code);
              expect(args.data.customerNameSnapshot).toBe(mockCustomer.name);
              expect(args.data.customerEmailSnapshot).toBe(mockCustomer.email);
              expect(args.data.customerPhoneSnapshot).toBe(mockCustomer.phone);
              return Promise.resolve({ id: BigInt(1) });
            }),
          },
          invoiceItem: {
            createMany: jest.fn(),
          },
        };
        return callback(tx);
      });

      await service.create(createDto);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });
});
