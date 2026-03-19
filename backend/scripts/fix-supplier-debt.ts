import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
  console.log('Starting DB fix script...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  console.log('1. Fixing NULL fields in Supplier table...');
  await prisma.$executeRaw`UPDATE supplier SET total_purchase = 0 WHERE total_purchase IS NULL;`;
  await prisma.$executeRaw`UPDATE supplier SET current_debt = 0 WHERE current_debt IS NULL;`;
  await prisma.$executeRaw`UPDATE supplier SET total_purchase_after_return = 0 WHERE total_purchase_after_return IS NULL;`;
  
  console.log('2. Recalculating supplier debts from confirmed/partial/paid orders...');
  
  // Get all active suppliers to recalculate
  const suppliers = await prisma.supplier.findMany({
    select: { id: true }
  });
  
  for (const supplier of suppliers) {
    // Calculate total purchases for this supplier
    const orders = await prisma.purchaseOrder.findMany({
      where: { 
        supplierId: supplier.id,
        status: { in: ['CONFIRMED', 'PARTIAL', 'PAID'] }
      }
    });
    
    let totalPurchase = 0;
    let totalPaid = 0;
    
    for (const order of orders) {
      totalPurchase += Number(order.totalAmount);
      totalPaid += Number(order.amountPaid || 0);
    }
    
    // Calculate total standalone payments
    const payments = await prisma.supplierPayment.findMany({
      where: { supplierId: supplier.id }
    });
    
    for (const payment of payments) {
      if (payment.note && !payment.note.includes('Thanh toán trước cho')) {
          totalPaid += Number(payment.amount);
      }
    }
    
    const currentDebt = totalPurchase - totalPaid;
    
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        totalPurchase,
        currentDebt
      }
    });
  }

  console.log('Fix completed successfully.');
  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
