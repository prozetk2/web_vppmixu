const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkInvoices() {
  try {
    console.log('=== Checking invoices created today ===');
    console.log('Current time:', new Date().toISOString());
    
    // Get all invoices from March 31, 2026
    const invoices = await prisma.$queryRaw`
      SELECT 
        id::text,
        invoice_number,
        created_at,
        issued_at,
        customer_name,
        total_amount::text,
        status
      FROM invoice 
      WHERE created_at >= '2026-03-31 00:00:00'::timestamp
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    
    console.log('\nInvoices created on 2026-03-31:');
    console.log('Total found:', invoices.length);
    console.log(JSON.stringify(invoices, null, 2));
    
    // Also check last 10 invoices regardless of date
    const lastInvoices = await prisma.$queryRaw`
      SELECT 
        id::text,
        invoice_number,
        created_at,
        issued_at,
        customer_name,
        total_amount::text,
        status
      FROM invoice 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    console.log('\n=== Last 10 invoices (any date) ===');
    console.log(JSON.stringify(lastInvoices, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInvoices();
