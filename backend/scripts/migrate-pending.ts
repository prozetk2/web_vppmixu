import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { PurchasesService } from '../src/purchases/purchases.service';
import { PrismaService } from '../src/prisma/prisma.service';

async function bootstrap() {
  console.log('Starting migration script...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const purchasesService = app.get(PurchasesService);

  const pendingOrders = await prisma.purchaseOrder.findMany({
    where: { status: 'PENDING' },
    select: { id: true, orderNumber: true }
  });

  console.log(`Found ${pendingOrders.length} PENDING orders to migrate...`);

  for (const order of pendingOrders) {
    try {
      console.log(`Confirming order ${order.orderNumber} (ID ${order.id})...`);
      await purchasesService.confirm(order.id.toString());
      console.log(`Successfully confirmed order ${order.orderNumber}`);
    } catch (error) {
      console.error(`Failed to confirm order ${order.orderNumber}:`, error.message || error);
    }
  }

  console.log('Migration completed.');
  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
