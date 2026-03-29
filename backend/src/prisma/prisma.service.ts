import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const directUrl = process.env.DIRECT_URL?.trim();
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const runtimeUrl = directUrl || databaseUrl;

    super(
      runtimeUrl
        ? {
            datasources: {
              db: {
                url: runtimeUrl,
              },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log(`Prisma connected using ${process.env.DIRECT_URL ? 'DIRECT_URL' : 'DATABASE_URL'}.`);
    } catch (error) {
      console.error('Prisma connection failed.');
      throw error;
    }
  }
}
