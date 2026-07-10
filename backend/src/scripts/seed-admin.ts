import { prisma } from '../config/prisma.js';
import { hashPassword } from '../utils/password.util.js';
import { removeVietnameseDiacritics } from '../utils/normalize.util.js';

const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin@gmail.com';
const adminName = process.env.ADMIN_NAME?.trim() || 'Admin';
const adminPassword = process.env.ADMIN_PASSWORD;

async function seedAdmin() {
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD is required');
  }

  const existingAdmin = await prisma.user.findUnique({
    where: {
      email: adminEmail,
    },
  });

  if (existingAdmin) {
    console.log(`Admin already exists: ${adminEmail}`);
    return;
  }

  const hashedPassword = await hashPassword(adminPassword);

  await prisma.user.create({
    data: {
      email: adminEmail,
      name: adminName,
      nameSearch: removeVietnameseDiacritics(adminName),
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log(`Admin created successfully: ${adminEmail}`);
}

try {
  await seedAdmin();
} catch (error) {
  console.error('Failed to seed admin:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
