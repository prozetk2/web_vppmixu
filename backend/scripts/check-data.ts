import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
    console.log('=== Kiểm tra dữ liệu Dashboard ===\n');

    // 1. Check Invoice table
    const invoiceCount = await prisma.invoice.count();
    const recentInvoices = await prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            invoiceNumber: true,
            customerName: true,
            totalAmount: true,
            status: true,
            createdAt: true,
        },
    });

    console.log(`📋 Invoice: ${invoiceCount} records`);
    if (recentInvoices.length > 0) {
        console.log('  Recent invoices:');
        recentInvoices.forEach(inv => {
            console.log(`    - ${inv.invoiceNumber}: ${inv.customerName} | ${inv.totalAmount} | ${inv.createdAt}`);
        });
    }

    // 2. Check InvoiceItem table
    const itemCount = await prisma.invoiceItem.count();
    console.log(`\n📦 InvoiceItem: ${itemCount} records`);

    // 3. Check Order table 
    const orderCount = await prisma.order.count();
    console.log(`\n🛒 Order: ${orderCount} records`);

    // 4. Check Inventory table
    const inventoryCount = await prisma.inventory.count();
    console.log(`\n📊 Inventory: ${inventoryCount} records`);

    // 5. Check Product table
    const productCount = await prisma.product.count();
    console.log(`\n📱 Product: ${productCount} records`);

    // 6. Check today's data
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayInvoices = await prisma.invoice.count({
        where: {
            createdAt: { gte: today, lt: tomorrow },
        },
    });
    console.log(`\n📅 Today's invoices: ${todayInvoices} records`);

    // 7. Check this month's data
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthInvoices = await prisma.invoice.count({
        where: {
            createdAt: { gte: monthStart },
        },
    });
    console.log(`📅 This month's invoices: ${monthInvoices} records`);

    // 8. Get total revenue from Invoice
    const totalRevenue = await prisma.invoice.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
    });
    console.log(`\n💰 Total revenue (all time): ${totalRevenue._sum.totalAmount || 0}`);

    await prisma.$disconnect();
}

checkData().catch(console.error);
