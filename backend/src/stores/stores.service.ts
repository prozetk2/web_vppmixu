import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
    constructor(private readonly prisma: PrismaService) { }

    async findAll() {
        const stores = await this.prisma.store.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                code: true,
                name: true,
                address: true,
                phone: true,
                email: true,
                createdAt: true,
            },
        });

        return { data: stores };
    }
}
