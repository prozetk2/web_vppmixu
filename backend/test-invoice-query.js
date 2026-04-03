const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testQuery() {
  try {
    console.log('=== Testing Invoice Query ===');
    
    // Simulate the query from InvoiceList with thisMonth filter
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const dateFrom = new Date(Date.UTC(year, month, 1)).toISOString().split('T')[0];
    const dateTo = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)).toISOString().split('T')[0];
    
    console.log('Date range:', { dateFrom, dateTo });
    console.log('dateFrom as Date:', new Date(dateFrom));
    console.log('dateTo as Date:', new Date(dateTo));
    
    // Query with date range like the API does
    const where = {
      createdAt: {
        gte: new Date(dateFrom),
        lte: (() => {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          return endDate;
        })()
      },
      status: 'COMPLETED'
    };
    
    console.log('\nWhere clause:', JSON.stringify(where, null, 2));
    
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        customerName: true,
        totalAmount: true,
        status: true
      }
    });
    
    console.log('\nFound invoices:', invoices.length);
    console.log(JSON.stringify(invoices.map(inv => ({
      ...inv,
      id: inv.id.toString(),
      totalAmount: inv.totalAmount.toString()
    })), null, 2));
    
    // Also test without date filter
    console.log('\n=== Testing without date filter ===');
    const allInvoices = await prisma.invoice.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        invoiceNumber: true,
        createdAt: true,
        customerName: true,
        totalAmount: true,
        status: true
      }
    });
    
    console.log('Found invoices (no date filter):', allInvoices.length);
    console.log(JSON.stringify(allInvoices.map(inv => ({
      ...inv,
      id: inv.id.toString(),
      totalAmount: inv.totalAmount.toString()
    })), null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testQuery();
