const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfill() {
  const suppliers = await prisma.supplier.findMany();
  console.log(`Found ${suppliers.length} suppliers to update.`);
  
  for (const supplier of suppliers) {
    // Sum up all confirmed/paid/partial purchase orders
    const orders = await prisma.purchaseOrder.findMany({
      where: {
        supplierId: supplier.id,
        status: { in: ['CONFIRMED', 'PAID', 'PARTIAL'] }
      }
    });
    
    // Sum up all payments made to this supplier
    const payments = await prisma.supplierPayment.findMany({
      where: {
        supplierId: supplier.id
      }
    });
    
    const totalPurchase = orders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    
    // Debt = Total confirmed purchases - Total payments
    const currentDebt = totalPurchase - totalPaid;
    
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
          totalPurchase: totalPurchase,
          currentDebt: currentDebt > 0 ? currentDebt : 0,
          totalPurchaseAfterReturn: totalPurchase // Assume no returns for now
      }
    });
    
    console.log(`Updated supplier ${supplier.name} (ID: ${supplier.id}):`);
    console.log(`  - totalPurchase: ${totalPurchase}`);
    console.log(`  - currentDebt: ${currentDebt}`);
  }
}

backfill()
  .catch(e => {
    console.error('Error during backfill:');
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
