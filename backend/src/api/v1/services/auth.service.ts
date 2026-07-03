import { prisma } from '../../../config/prisma.js';
import { hashPassword } from '../../../utils/password.util.js';
import type { RegisterInput } from '../validators/auth/auth.validate.js';

export async function registerUser(input: RegisterInput) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (existingUser) {
    return {
      success: false,
      message: 'Email đã được sử dụng',
    };
  }

  const hashedPassword = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
    },
  });

  return {
    success: true,
    user,
  };
}
