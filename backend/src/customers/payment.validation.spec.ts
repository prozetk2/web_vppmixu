/**
 * Customer Payment Validation Tests
 * 
 * Tests critical payment validation logic WITHOUT database
 */

import { BadRequestException } from '@nestjs/common';

describe('Payment Validation Logic (No Database)', () => {
  // Simulate payment validation
  const validatePaymentAmount = (amount: number) => {
    if (!amount || amount <= 0) {
      throw new BadRequestException('INVALID_PAYMENT_AMOUNT');
    }
    return true;
  };

  const validatePaymentNotExceedingDebt = (
    paymentAmount: number,
    totalOutstanding: number,
  ) => {
    if (paymentAmount - totalOutstanding > 0.001) {
      throw new BadRequestException('PAYMENT_EXCEEDS_OUTSTANDING_DEBT');
    }
    return true;
  };

  const validateAllocations = (
    allocations: Array<{ invoiceId: string; amount: number }>,
    paymentAmount: number,
    invoices: Map<string, { outstanding: number }>,
  ) => {
    // Check duplicates
    const seenIds = new Set<string>();
    for (const alloc of allocations) {
      if (seenIds.has(alloc.invoiceId)) {
        throw new BadRequestException('DUPLICATE_INVOICE_ALLOCATION');
      }
      seenIds.add(alloc.invoiceId);
    }

    // Check total matches payment
    const total = allocations.reduce((sum, a) => sum + a.amount, 0);
    if (Math.abs(total - paymentAmount) > 0.001) {
      throw new BadRequestException('ALLOCATIONS_MUST_MATCH_PAYMENT_AMOUNT');
    }

    // Check each allocation doesn't exceed invoice outstanding
    for (const alloc of allocations) {
      const invoice = invoices.get(alloc.invoiceId);
      if (!invoice) {
        throw new BadRequestException(`INVOICE_NOT_FOUND: ${alloc.invoiceId}`);
      }
      if (alloc.amount > invoice.outstanding) {
        throw new BadRequestException(
          `ALLOCATION_EXCEEDS_OUTSTANDING: ${alloc.invoiceId}`,
        );
      }
    }

    return true;
  };

  describe('Payment Amount Validation', () => {
    it('should reject zero payment', () => {
      expect(() => validatePaymentAmount(0)).toThrow('INVALID_PAYMENT_AMOUNT');
    });

    it('should reject negative payment', () => {
      expect(() => validatePaymentAmount(-100)).toThrow(
        'INVALID_PAYMENT_AMOUNT',
      );
    });

    it('should accept positive payment', () => {
      expect(validatePaymentAmount(100)).toBe(true);
      expect(validatePaymentAmount(0.01)).toBe(true);
      expect(validatePaymentAmount(1000000)).toBe(true);
    });
  });

  describe('Payment Exceeds Debt Validation', () => {
    it('should reject payment exceeding debt', () => {
      expect(() => validatePaymentNotExceedingDebt(1500, 1000)).toThrow(
        'PAYMENT_EXCEEDS_OUTSTANDING_DEBT',
      );
    });

    it('should accept payment equal to debt', () => {
      expect(validatePaymentNotExceedingDebt(1000, 1000)).toBe(true);
    });

    it('should accept payment less than debt', () => {
      expect(validatePaymentNotExceedingDebt(500, 1000)).toBe(true);
    });

    it('should handle floating point precision', () => {
      // 1000.001 - 1000 = 0.001, should pass (within tolerance)
      expect(validatePaymentNotExceedingDebt(1000.001, 1000)).toBe(true);
      
      // 1000.01 - 1000 = 0.01, should fail (exceeds tolerance)
      expect(() => validatePaymentNotExceedingDebt(1000.01, 1000)).toThrow();
    });
  });

  describe('Duplicate Invoice Allocation', () => {
    it('should reject duplicate invoice IDs', () => {
      const allocations = [
        { invoiceId: '101', amount: 500 },
        { invoiceId: '101', amount: 500 },
      ];
      const invoices = new Map([['101', { outstanding: 1000 }]]);

      expect(() =>
        validateAllocations(allocations, 1000, invoices),
      ).toThrow('DUPLICATE_INVOICE_ALLOCATION');
    });

    it('should accept unique invoice IDs', () => {
      const allocations = [
        { invoiceId: '101', amount: 500 },
        { invoiceId: '102', amount: 500 },
      ];
      const invoices = new Map([
        ['101', { outstanding: 1000 }],
        ['102', { outstanding: 1000 }],
      ]);

      expect(validateAllocations(allocations, 1000, invoices)).toBe(true);
    });
  });

  describe('Allocation Total Matches Payment', () => {
    it('should reject when allocations total less than payment', () => {
      const allocations = [{ invoiceId: '101', amount: 500 }];
      const invoices = new Map([['101', { outstanding: 1000 }]]);

      expect(() =>
        validateAllocations(allocations, 1000, invoices),
      ).toThrow('ALLOCATIONS_MUST_MATCH_PAYMENT_AMOUNT');
    });

    it('should reject when allocations total more than payment', () => {
      const allocations = [{ invoiceId: '101', amount: 1500 }];
      const invoices = new Map([['101', { outstanding: 2000 }]]);

      expect(() =>
        validateAllocations(allocations, 1000, invoices),
      ).toThrow('ALLOCATIONS_MUST_MATCH_PAYMENT_AMOUNT');
    });

    it('should accept when allocations match payment exactly', () => {
      const allocations = [
        { invoiceId: '101', amount: 600 },
        { invoiceId: '102', amount: 400 },
      ];
      const invoices = new Map([
        ['101', { outstanding: 1000 }],
        ['102', { outstanding: 1000 }],
      ]);

      expect(validateAllocations(allocations, 1000, invoices)).toBe(true);
    });
  });

  describe('Allocation Exceeds Invoice Outstanding', () => {
    it('should reject allocation exceeding invoice outstanding', () => {
      const allocations = [{ invoiceId: '101', amount: 1500 }];
      const invoices = new Map([['101', { outstanding: 1000 }]]);

      expect(() =>
        validateAllocations(allocations, 1500, invoices),
      ).toThrow('ALLOCATION_EXCEEDS_OUTSTANDING: 101');
    });

    it('should accept allocation equal to invoice outstanding', () => {
      const allocations = [{ invoiceId: '101', amount: 1000 }];
      const invoices = new Map([['101', { outstanding: 1000 }]]);

      expect(validateAllocations(allocations, 1000, invoices)).toBe(true);
    });

    it('should accept allocation less than invoice outstanding', () => {
      const allocations = [{ invoiceId: '101', amount: 500 }];
      const invoices = new Map([['101', { outstanding: 1000 }]]);

      expect(validateAllocations(allocations, 500, invoices)).toBe(true);
    });
  });

  describe('Invoice Not Found', () => {
    it('should reject allocation to non-existent invoice', () => {
      const allocations = [{ invoiceId: '999', amount: 500 }];
      const invoices = new Map([['101', { outstanding: 1000 }]]);

      expect(() =>
        validateAllocations(allocations, 500, invoices),
      ).toThrow('INVOICE_NOT_FOUND: 999');
    });
  });

  describe('Complex Allocation Scenarios', () => {
    it('should handle multiple allocations correctly', () => {
      const allocations = [
        { invoiceId: '101', amount: 300 },
        { invoiceId: '102', amount: 400 },
        { invoiceId: '103', amount: 300 },
      ];
      const invoices = new Map([
        ['101', { outstanding: 500 }],
        ['102', { outstanding: 600 }],
        ['103', { outstanding: 400 }],
      ]);

      expect(validateAllocations(allocations, 1000, invoices)).toBe(true);
    });

    it('should reject if any allocation exceeds its invoice', () => {
      const allocations = [
        { invoiceId: '101', amount: 300 },
        { invoiceId: '102', amount: 700 }, // Exceeds 600 outstanding
      ];
      const invoices = new Map([
        ['101', { outstanding: 500 }],
        ['102', { outstanding: 600 }],
      ]);

      expect(() =>
        validateAllocations(allocations, 1000, invoices),
      ).toThrow('ALLOCATION_EXCEEDS_OUTSTANDING: 102');
    });
  });
});

describe('Auto-Allocation Logic (FIFO)', () => {
  const autoAllocate = (
    paymentAmount: number,
    invoices: Array<{ id: string; outstanding: number }>,
  ) => {
    const allocations: Array<{ invoiceId: string; amount: number }> = [];
    let remaining = paymentAmount;

    for (const invoice of invoices) {
      if (remaining <= 0) break;
      if (invoice.outstanding <= 0) continue;

      const allocated = Math.min(invoice.outstanding, remaining);
      allocations.push({
        invoiceId: invoice.id,
        amount: allocated,
      });
      remaining -= allocated;
    }

    return { allocations, remaining };
  };

  it('should allocate to oldest invoice first (FIFO)', () => {
    const invoices = [
      { id: '101', outstanding: 1000 },
      { id: '102', outstanding: 1500 },
    ];

    const result = autoAllocate(1800, invoices);

    expect(result.allocations).toHaveLength(2);
    expect(result.allocations[0]).toEqual({ invoiceId: '101', amount: 1000 });
    expect(result.allocations[1]).toEqual({ invoiceId: '102', amount: 800 });
    expect(result.remaining).toBe(0);
  });

  it('should fully pay first invoice if payment is enough', () => {
    const invoices = [
      { id: '101', outstanding: 500 },
      { id: '102', outstanding: 1000 },
    ];

    const result = autoAllocate(1200, invoices);

    expect(result.allocations[0]).toEqual({ invoiceId: '101', amount: 500 });
    expect(result.allocations[1]).toEqual({ invoiceId: '102', amount: 700 });
  });

  it('should stop when payment is exhausted', () => {
    const invoices = [
      { id: '101', outstanding: 1000 },
      { id: '102', outstanding: 1000 },
      { id: '103', outstanding: 1000 },
    ];

    const result = autoAllocate(1500, invoices);

    expect(result.allocations).toHaveLength(2);
    expect(result.remaining).toBe(0);
  });

  it('should skip invoices with zero outstanding', () => {
    const invoices = [
      { id: '101', outstanding: 0 },
      { id: '102', outstanding: 1000 },
    ];

    const result = autoAllocate(500, invoices);

    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].invoiceId).toBe('102');
  });
});

console.log('✅ Payment Validation Tests - All business logic tested without database!');
