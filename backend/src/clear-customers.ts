import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearCustomers() {
    try {
        // Delete all customers
        const result = await prisma.customer.deleteMany({});

        console.log(`✅ Đã xóa ${result.count} khách hàng`);
    } catch (error) {
        console.error('❌ Lỗi:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearCustomers();
