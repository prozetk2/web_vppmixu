/**
 * Simple Test Demo
 * 
 * Đây là test đơn giản để demo rằng tests KHÔNG đụng vào database
 */

describe('Simple Math Tests (No Database)', () => {
  it('should add two numbers correctly', () => {
    const result = 2 + 2;
    expect(result).toBe(4);
  });

  it('should multiply numbers correctly', () => {
    const result = 5 * 3;
    expect(result).toBe(15);
  });

  it('should handle string operations', () => {
    const str = 'Hello' + ' ' + 'World';
    expect(str).toBe('Hello World');
  });
});

describe('Payment Logic Tests (Mock - No Database)', () => {
  // Mock payment calculation function
  const calculatePaymentAllocation = (
    paymentAmount: number,
    invoices: Array<{ id: number; amountDue: number }>,
  ) => {
    const allocations: Array<{ invoiceId: number; amount: number }> = [];
    let remaining = paymentAmount;

    for (const invoice of invoices) {
      if (remaining <= 0) break;
      
      const allocatedAmount = Math.min(invoice.amountDue, remaining);
      allocations.push({
        invoiceId: invoice.id,
        amount: allocatedAmount,
      });
      
      remaining -= allocatedAmount;
    }

    return { allocations, remaining };
  };

  it('should allocate payment to single invoice', () => {
    const invoices = [{ id: 1, amountDue: 1000 }];
    const result = calculatePaymentAllocation(500, invoices);

    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].amount).toBe(500);
    expect(result.remaining).toBe(0);
  });

  it('should allocate payment to multiple invoices (FIFO)', () => {
    const invoices = [
      { id: 1, amountDue: 1000 },
      { id: 2, amountDue: 1500 },
    ];
    const result = calculatePaymentAllocation(1800, invoices);

    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0].amount).toBe(1000); // First invoice fully paid
    expect(result.allocations[1].amount).toBe(800);  // Second invoice partially paid
    expect(result.remaining).toBe(0);
  });

  it('should handle payment less than first invoice', () => {
    const invoices = [
      { id: 1, amountDue: 1000 },
      { id: 2, amountDue: 1500 },
    ];
    const result = calculatePaymentAllocation(500, invoices);

    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].amount).toBe(500);
    expect(result.remaining).toBe(0);
  });

  it('should handle zero payment', () => {
    const invoices = [{ id: 1, amountDue: 1000 }];
    const result = calculatePaymentAllocation(0, invoices);

    expect(result.allocations).toHaveLength(0);
    expect(result.remaining).toBe(0);
  });
});

describe('Order Number Generation (Mock - No Database)', () => {
  const generateOrderNumber = (lastSequence: number = 0): string => {
    const today = new Date();
    const yy = today.getFullYear().toString().slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const seq = String(lastSequence + 1).padStart(4, '0');
    return `HD${yy}${mm}${seq}`;
  };

  it('should generate order number with correct format', () => {
    const orderNumber = generateOrderNumber(0);
    
    expect(orderNumber).toMatch(/^HD\d{8}$/);
    expect(orderNumber.length).toBe(10);
    expect(orderNumber.startsWith('HD')).toBe(true);
  });

  it('should increment sequence correctly', () => {
    const order1 = generateOrderNumber(5);
    const order2 = generateOrderNumber(6);
    
    expect(order1).toContain('0006');
    expect(order2).toContain('0007');
  });
});

console.log('✅ These tests run WITHOUT touching any database!');
console.log('✅ Your Supabase data is 100% safe!');
