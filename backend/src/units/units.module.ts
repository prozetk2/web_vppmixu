import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { UnitsController } from './units.controller';
import { UnitsService } from './units.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UnitsController],
  providers: [UnitsService],
})
export class UnitsModule {}
