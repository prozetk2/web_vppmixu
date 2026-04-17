import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CustomersService } from '../../src/customers/customers.service';
import { InvoicesService } from '../../src/invoices/invoices.service';
import { SalesService } from '../../src/sales/sales.service';

/**
 * Integration Tests for Payment Flow
 * 
 * Tests the complete flow:
 * 1. Create customer
 * 2. Create sales order (generates invoice)
 * 3. Pay debt (allocate payment to invoices)
 * 4. Verify debt calculation
 * 5. Delete payment (reverse allocation)
 */
describe('Payment Flow Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let customersService: CustomersService;
  let invoicesService: InvoicesService;
  let salesService: SalesService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        PrismaService,
        CustomersService,
        InvoicesService,
        SalesService,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    customersService = moduleFixture.get<CustomersService>(CustomersService);
    invoicesService = moduleFixture.get<InvoicesService>(InvoicesService);
    salesService = moduleFixture.get<SalesService>(SalesService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Payment Flow', () => {
    let customerId: string;
    let invoice1Id: string;
    let invoice2Id: string;
    let paymentId: string;

    it('should create a customer', async () => {
      const customer = await customersService.create({
        name: 'Test Customer',
        phone: '0123456789',
        email: 'test@example.com',
      });

      customerId = customer.id.toString();
      expect(customer).toBeDefined();
      expect(customer.name).toBe('Test Customer');
      expect(customer.currentDebt).toBe(0);
    });

    it('should create first invoice with outstanding balance', async () => {
      const invoice = await invoicesService.create({
        customerId,
        items: [
          {
            productCode: 'SKU001',
            productName: 'Product 1',
            quantity: 2,
            unitPrice: 500,
          },
        ],
        totalAmount: 1000,
        amountPaid: 0,
        amountDue: 1000,
      });

      invoice1Id = invoice.id.toString();
      expect(invoice.amountDue).toBe(1000);
    });

    it('should create second invoice with outstanding balance', async () => {
      const invoice = await invoicesService.create({
        customerId,
        items: [
          {
            productCode: 'SKU002',
            productName: 'Product 2',
            quantity: 1,
            unitPrice: 1500,
          },
        ],
        totalAmount: 1500,
        amountPaid: 0,
        amountDue: 1500,
      });

      invoice2Id = invoice.id.toString();
      expect(invoice.amountDue).toBe(1500);
    });

    it('should calculate total customer debt correctly', async () => {
      const customer = await customersService.findOne(customerId);
      
      // Total debt should be 1000 + 1500 = 2500
      expect(customer.currentDebt).toBe(2500);
    });

    it('should pay debt with auto-allocation (FIFO)', async () => {
      const payment = await customersService.payDebt(customerId, {
        amount: 1800, // Pay 1800 out of 2500
        paymentMethod: 'CASH',
        collector: 'John Doe',
      });

      paymentId = payment.id.toString();
      expect(payment).toBeDefined();
      expect(payment.amount).toBe(1800);

      // Verify first invoice is fully paid (1000)
      const invoice1 = await invoicesService.findOne(invoice1Id);
      expect(invoice1.amountPaid).toBe(1000);
      expect(invoice1.amountDue).toBe(0);

      // Verify second invoice is partially paid (800 out of 1500)
      const invoice2 = await invoicesService.findOne(invoice2Id);
      expect(invoice2.amountPaid).toBe(800);
      expect(invoice2.amountDue).toBe(700);
    });

    it('should update customer debt after payment', async () => {
      const customer = await customersService.findOne(customerId);
      
      // Remaining debt should be 2500 - 1800 = 700
      expect(customer.currentDebt).toBe(700);
    });

    it('should retrieve payment history with allocations', async () => {
      const payments = await customersService.getPayments(customerId);

      expect(payments).toBeDefined();
      expect(payments.length).toBeGreaterThan(0);
      
      const payment = payments.find(p => p.id.toString() === paymentId);
      expect(payment).toBeDefined();
      expect(payment.allocations).toBeDefined();
      expect(payment.allocations.length).toBe(2); // Allocated to 2 invoices
    });

    it('should delete payment and reverse allocations', async () => {
      await customersService.deletePayment(customerId, paymentId);

      // Verify first invoice is back to unpaid
      const invoice1 = await invoicesService.findOne(invoice1Id);
      expect(invoice1.amountPaid).toBe(0);
      expect(invoice1.amountDue).toBe(1000);

      // Verify second invoice is back to unpaid
      const invoice2 = await invoicesService.findOne(invoice2Id);
      expect(invoice2.amountPaid).toBe(0);
      expect(invoice2.amountDue).toBe(1500);

      // Verify customer debt is restored
      const customer = await customersService.findOne(customerId);
      expect(customer.currentDebt).toBe(2500);
    });

    it('should pay debt with explicit allocation', async () => {
      const payment = await customersService.payDebt(customerId, {
        amount: 1500,
        paymentMethod: 'TRANSFER',
        allocations: [
          {
            invoiceId: invoice2Id,
            amount: 1500, // Pay second invoice fully
          },
        ],
      });

      expect(payment).toBeDefined();

      // Verify first invoice is still unpaid
      const invoice1 = await invoicesService.findOne(invoice1Id);
      expect(invoice1.amountPaid).toBe(0);
      expect(invoice1.amountDue).toBe(1000);

      // Verify second invoice is fully paid
      const invoice2 = await invoicesService.findOne(invoice2Id);
      expect(invoice2.amountPaid).toBe(1500);
      expect(invoice2.amountDue).toBe(0);

      // Verify customer debt
      const customer = await customersService.findOne(customerId);
      expect(customer.currentDebt).toBe(1000);
    });
  });

  describe('Payment Validation', () => {
    let customerId: string;
    let invoiceId: string;

    beforeEach(async () => {
      const customer = await customersService.create({
        name: 'Validation Test Customer',
        phone: '0987654321',
      });
      customerId = customer.id.toString();

      const invoice = await invoicesService.create({
        customerId,
        items: [
          {
            productCode: 'SKU003',
            productName: 'Product 3',
            quantity: 1,
            unitPrice: 1000,
          },
        ],
        totalAmount: 1000,
        amountPaid: 0,
        amountDue: 1000,
      });
      invoiceId = invoice.id.toString();
    });

    it('should reject payment exceeding outstanding debt', async () => {
      await expect(
        customersService.payDebt(customerId, {
          amount: 1500, // More than 1000 debt
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow();
    });

    it('should reject zero or negative payment amount', async () => {
      await expect(
        customersService.payDebt(customerId, {
          amount: 0,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow();

      await expect(
        customersService.payDebt(customerId, {
          amount: -100,
          paymentMethod: 'CASH',
        }),
      ).rejects.toThrow();
    });

    it('should reject allocations not matching payment amount', async () => {
      await expect(
        customersService.payDebt(customerId, {
          amount: 1000,
          paymentMethod: 'CASH',
          allocations: [
            {
              invoiceId,
              amount: 500, // Only 500, but payment is 1000
            },
          ],
        }),
      ).rejects.toThrow();
    });

    it('should reject allocation exceeding invoice outstanding', async () => {
      await expect(
        customersService.payDebt(customerId, {
          amount: 1500,
          paymentMethod: 'CASH',
          allocations: [
            {
              invoiceId,
              amount: 1500, // Invoice only has 1000 outstanding
            },
          ],
        }),
      ).rejects.toThrow();
    });

    it('should reject duplicate invoice allocations', async () => {
      await expect(
        customersService.payDebt(customerId, {
          amount: 1000,
          paymentMethod: 'CASH',
          allocations: [
            {
              invoiceId,
              amount: 500,
            },
            {
              invoiceId, // Duplicate
              amount: 500,
            },
          ],
        }),
      ).rejects.toThrow();
    });
  });

  describe('Multiple Payments to Same Invoice', () => {
    let customerId: string;
    let invoiceId: string;

    beforeEach(async () => {
      const customer = await customersService.create({
        name: 'Multiple Payments Customer',
        phone: '0111222333',
      });
      customerId = customer.id.toString();

      const invoice = await invoicesService.create({
        customerId,
        items: [
          {
            productCode: 'SKU004',
            productName: 'Product 4',
            quantity: 1,
            unitPrice: 3000,
          },
        ],
        totalAmount: 3000,
        amountPaid: 0,
        amountDue: 3000,
      });
      invoiceId = invoice.id.toString();
    });

    it('should handle multiple partial payments to same invoice', async () => {
      // First payment: 1000
      await customersService.payDebt(customerId, {
        amount: 1000,
        paymentMethod: 'CASH',
      });

      let invoice = await invoicesService.findOne(invoiceId);
      expect(invoice.amountPaid).toBe(1000);
      expect(invoice.amountDue).toBe(2000);

      // Second payment: 1000
      await customersService.payDebt(customerId, {
        amount: 1000,
        paymentMethod: 'CARD',
      });

      invoice = await invoicesService.findOne(invoiceId);
      expect(invoice.amountPaid).toBe(2000);
      expect(invoice.amountDue).toBe(1000);

      // Third payment: 1000 (final)
      await customersService.payDebt(customerId, {
        amount: 1000,
        paymentMethod: 'TRANSFER',
      });

      invoice = await invoicesService.findOne(invoiceId);
      expect(invoice.amountPaid).toBe(3000);
      expect(invoice.amountDue).toBe(0);

      // Verify customer debt is zero
      const customer = await customersService.findOne(customerId);
      expect(customer.currentDebt).toBe(0);
    });

    it('should track payment method breakdown correctly', async () => {
      // Pay with mixed methods
      await customersService.payDebt(customerId, {
        amount: 1000,
        paymentMethod: 'CASH',
      });

      await customersService.payDebt(customerId, {
        amount: 1000,
        paymentMethod: 'CARD',
      });

      await customersService.payDebt(customerId, {
        amount: 1000,
        paymentMethod: 'TRANSFER',
      });

      const invoice = await invoicesService.findOne(invoiceId);
      expect(invoice.cashAmount).toBe(1000);
      expect(invoice.cardAmount).toBe(1000);
      expect(invoice.transferAmount).toBe(1000);
    });
  });
});
