import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const adminUsername = 'admin';

    // Check if admin exists
    const existing = await prisma.user.findUnique({
        where: { username: adminUsername }
    });

    if (existing) {
        console.log('Admin user already exists');
        return;
    }

    const passwordHash = await bcrypt.hash('admin123', 10);

    // Create or get ADMIN role
    const adminRole = await prisma.role.upsert({
        where: { code: 'ADMIN' },
        update: {},
        create: { code: 'ADMIN', name: 'Administrator' },
    });

    // Create admin user
    const user = await prisma.user.create({
        data: {
            username: adminUsername,
            email: 'admin@example.com',
            passwordHash,
            fullName: 'Administrator',
        },
    });

    // Link user to role
    await prisma.userRole.create({
        data: {
            userId: user.id,
            roleId: adminRole.id,
        },
    });

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: admin123');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
