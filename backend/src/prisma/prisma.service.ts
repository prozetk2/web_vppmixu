import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    // Use DATABASE_URL (pooled) for runtime, DIRECT_URL only for migrations
    const databaseUrl = process.env.DATABASE_URL?.trim();
    const directUrl = process.env.DIRECT_URL?.trim();
    const runtimeUrl = databaseUrl || directUrl;

    super(
      runtimeUrl
        ? {
            datasources: {
              db: {
                url: runtimeUrl,
              },
            },
            // Limit connection pool size for Supabase free tier
            // Free tier: 200 pooled connections total
            // Set conservative limit per instance
            log: ['error', 'warn'],
          }
        : undefined,
    );
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log(`✅ Prisma connected using ${process.env.DATABASE_URL ? 'DATABASE_URL (pooled)' : 'DIRECT_URL'}`);
    } catch (error) {
      console.error('❌ Prisma connection failed:', error.message);
      throw error;
    }
  }
}
