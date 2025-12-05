import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WarehousesController } from './warehouses.controller';
import { WarehousesService } from './warehouses.service';

@Module({
    controllers: [WarehousesController],
    providers: [WarehousesService, PrismaService],
    exports: [WarehousesService],
})
export class WarehousesModule { }
