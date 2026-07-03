import crypto from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { createPasswordHash } from './auth-session';

export type CreateEmailUserInput = IServer.CreateEmailUserInput;

export async function createEmailUser(input: CreateEmailUserInput) {
  const passwordHash = await createPasswordHash(input.password);

  return prisma.$transaction(async (tx) => {
    const userRole = await tx.roles.upsert({
      where: { name: 'user' },
      update: { updated_at: new Date() },
      create: { name: 'user', description: 'Default user role', is_system: true },
    });

    const user = await tx.users.create({
      data: {
        id: crypto.randomUUID(),
        email: input.email,
        email_verified: true,
        password_hash: passwordHash,
        status: 'active',
      },
    });

    await tx.userRoles.create({
      data: {
        user_id: user.id,
        role_id: userRole.id,
      },
    });

    return user;
  });
}

export async function findActiveUserByEmail(email: string) {
  return prisma.users.findFirst({
    where: {
      email,
      is_deleted: false,
      status: 'active',
    },
  });
}

export async function findUserByEmail(email: string) {
  return prisma.users.findUnique({
    where: { email },
  });
}
