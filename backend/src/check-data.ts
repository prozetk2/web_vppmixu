import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCustomerData() {
    try {
        // Get first customer with data
        const customer = await prisma.customer.findFirst({
            where: {
                code: { not: null }
            },
            select: {
                code: true,
                name: true,
                currentDebt: true,
                totalSales: true,
                totalSalesAfterReturn: true,
                debtDays: true,
            }
        });

        console.log('Sample customer from database:');
        console.log(JSON.stringify(customer, null, 2));

        // Count customers with debt data
        const withDebt = await prisma.customer.count({
            where: {
                currentDebt: { gt: 0 }
            }
        });

        console.log(`\nCustomers with currentDebt > 0: ${withDebt}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkCustomerData();
