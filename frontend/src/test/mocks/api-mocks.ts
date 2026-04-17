/**
 * API Mock Data
 * Using same mock factories from backend tests
 */

export const mockCustomer = {
  id: '1',
  code: 'CUST001',
  name: 'Test Customer',
  email: 'test@example.com',
  phone: '0123456789',
  address: '123 Test Street',
  currentDebt: 2500,
  totalSales: 10000,
  active: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const mockInvoices = [
  {
    id: '101',
    invoiceNumber: 'INV001',
    customerId: '1',
    totalAmount: 1000,
    amountPaid: 0,
    amountDue: 1000,
    paymentMethod: null,
    cashAmount: 0,
    cardAmount: 0,
    transferAmount: 0,
    status: 'COMPLETED',
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: '102',
    invoiceNumber: 'INV002',
    customerId: '1',
    totalAmount: 1500,
    amountPaid: 0,
    amountDue: 1500,
    paymentMethod: null,
    cashAmount: 0,
    cardAmount: 0,
    transferAmount: 0,
    status: 'COMPLETED',
    createdAt: new Date('2024-01-02').toISOString(),
  },
];

export const mockPayment = {
  id: '1',
  code: 'PAY001',
  customerId: '1',
  amount: 1800,
  method: 'CASH',
  collector: 'John Doe',
  note: null,
  createdAt: new Date().toISOString(),
  allocations: [
    {
      id: '1',
      paymentId: '1',
      invoiceId: '101',
      amount: 1000,
      invoice: {
        invoiceNumber: 'INV001',
        totalAmount: 1000,
      },
    },
    {
      id: '2',
      paymentId: '1',
      invoiceId: '102',
      amount: 800,
      invoice: {
        invoiceNumber: 'INV002',
        totalAmount: 1500,
      },
    },
  ],
};

export const mockPayments = [mockPayment];

export const mockApiResponses = {
  getCustomer: {
    data: mockCustomer,
  },
  getInvoices: {
    data: mockInvoices,
  },
  getPayments: {
    data: mockPayments,
  },
  payDebt: {
    data: mockPayment,
  },
  deletePayment: {
    data: { message: 'Payment deleted successfully' },
  },
};
