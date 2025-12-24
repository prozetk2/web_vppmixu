import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';



import { WarehousesModule } from './warehouses/warehouses.module';
import { CustomersModule } from './customers/customers.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SupabaseModule } from './supabase/supabase.module';
import { InventoryModule } from './inventory/inventory.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SalesModule } from './sales/sales.module';
import { PurchasesModule } from './purchases/purchases.module';
import { InvoicesModule } from './invoices/invoices.module';
import { StoresModule } from './stores/stores.module';
import { PriceListsModule } from './price-lists/price-lists.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    SupabaseModule,
    PrismaModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    WarehousesModule,
    CustomersModule,
    SuppliersModule,
    InventoryModule,
    DashboardModule,
    SalesModule,
    PurchasesModule,
    InvoicesModule,
    StoresModule,
    PriceListsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
