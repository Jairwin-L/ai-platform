import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { AuthUser } from './types';

export interface AuthPayload {
  permissions: string[];
  roles: string[];
  user: {
    email: string | null;
    emailVerified: boolean | null;
    id: string;
    nickName: string | null;
    picture: string | null;
    status: string;
  };
}

const scryptAsync = promisify(crypto.scrypt);
const SESSION_COOKIE_NAME = 'auth_session';
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

function createTokenHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function createSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function getSessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE_NAME;
}

export async function createPasswordHash(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;

  return `scrypt:${salt}:${derived.toString('base64url')}`;
}

export async function verifyPassword(
  password: string,
  passwordHash?: string | null,
): Promise<boolean> {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, salt, stored] = passwordHash.split(':');

  if (algorithm !== 'scrypt' || !salt || !stored) {
    return false;
  }

  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(stored, 'base64url');

  return storedBuffer.length === derived.length && crypto.timingSafeEqual(storedBuffer, derived);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function toAuthPayload(user: AuthUser): AuthPayload {
  return {
    user: {
      id: user.userId,
      email: user.email ?? null,
      emailVerified: user.emailVerified ?? null,
      nickName: user.nickName ?? null,
      picture: user.picture ?? null,
      status: user.status ?? 'active',
    },
    roles: user.roles ?? [],
    permissions: user.permissions ?? [],
  };
}

export async function getAuthPayloadBySessionToken(
  token?: string | null,
): Promise<AuthPayload | null> {
  const user = await getAuthUserBySessionToken(token);

  return user ? toAuthPayload(user) : null;
}

export async function createUserSession(userId: string): Promise<string> {
  const token = createSessionToken();

  await prisma.userSessions.create({
    data: {
      user_id: userId,
      token_hash: createTokenHash(token),
      expires_at: getSessionExpiresAt(),
    },
  });

  await prisma.users.update({
    where: { id: userId },
    data: { last_login_at: new Date(), updated_at: new Date() },
  });

  return token;
}

export async function revokeUserSession(token?: string | null): Promise<void> {
  if (!token) {
    return;
  }

  await prisma.userSessions.updateMany({
    where: {
      token_hash: createTokenHash(token),
      revoked_at: null,
    },
    data: { revoked_at: new Date() },
  });
}

export async function getAuthUserBySessionToken(token?: string | null): Promise<AuthUser | null> {
  if (!token) {
    return null;
  }

  const session = await prisma.userSessions.findFirst({
    where: {
      token_hash: createTokenHash(token),
      revoked_at: null,
      expires_at: { gt: new Date() },
    },
    include: {
      user: {
        include: {
          user_roles: {
            include: {
              role: {
                include: {
                  role_permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!session || session.user.is_deleted || session.user.status !== 'active') {
    return null;
  }

  const roles = new Set<string>();
  const permissions = new Set<string>();

  for (const userRole of session.user.user_roles) {
    roles.add(userRole.role.name);

    for (const rolePermission of userRole.role.role_permissions) {
      permissions.add(rolePermission.permission.code);
    }
  }

  return {
    userId: session.user.id,
    email: session.user.email ?? undefined,
    emailVerified: session.user.email_verified ?? undefined,
    nickName: session.user.nick_name ?? undefined,
    picture: session.user.picture ?? undefined,
    status: session.user.status,
    roles: Array.from(roles),
    permissions: Array.from(permissions),
  };
}
