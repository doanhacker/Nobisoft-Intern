import { prisma } from '../../../config/prisma.js';
import type { LoginServiceResult, RegisterServiceResult } from '../../../types/auth.type.js';
import { generateAccessToken } from '../../../utils/jwt.util.js';
import { comparePassword, hashPassword } from '../../../utils/password.util.js';
import type { LoginInput, RegisterInput } from '../validators/auth/auth.validate.js';

export async function registerUser(input: RegisterInput): Promise<RegisterServiceResult> {
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
    data: {
      user,
    },
  };
}

export async function loginUser(input: LoginInput): Promise<LoginServiceResult> {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      role: true,
    },
  });

  if (!user) {
    return {
      success: false,
      message: 'Email hoặc mật khẩu không đúng',
    };
  }

  const isPasswordValid = await comparePassword(input.password, user.password);

  if (!isPasswordValid) {
    return {
      success: false,
      message: 'Email hoặc mật khẩu không đúng',
    };
  }

  const accessToken = generateAccessToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    },
  };
}
