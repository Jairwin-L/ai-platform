import crypto from 'node:crypto';
import { promisify } from 'node:util';
import type { NextResponse } from 'next/server';
import { AUTH_SESSION_COOKIE_NAME } from '@/constants/auth';
import { SITE_PERMISSION_CODES } from '@/constants/permissions';
import { RoleCode } from '@/constants/roles';
import { prisma } from '@/lib/prisma';
import type { AuthUser } from './types';

export type AuthPayload = IServer.AuthPayload;

const scryptAsync = promisify(crypto.scrypt);
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
  return AUTH_SESSION_COOKIE_NAME;
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
  if (!isSupportedPasswordHash(passwordHash)) {
    return false;
  }

  const parts = passwordHash.split(':');
  const salt = parts[1] as string;
  const stored = parts[2] as string;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const storedBuffer = Buffer.from(stored, 'base64url');

  return storedBuffer.length === derived.length && crypto.timingSafeEqual(storedBuffer, derived);
}

export function isSupportedPasswordHash(passwordHash?: string | null): passwordHash is string {
  if (!passwordHash) {
    return false;
  }

  const [algorithm, salt, stored] = passwordHash.split(':');

  return algorithm === 'scrypt' && Boolean(salt && stored);
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge: SESSION_TTL_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_SESSION_COOKIE_NAME, '', {
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

async function ensureSiteRoleForUser(userId: string): Promise<boolean> {
  let changed = false;
  const siteRole = await prisma.roles.upsert({
    where: { code: RoleCode.SITE_USER },
    update: { updated_at: new Date() },
    create: {
      code: RoleCode.SITE_USER,
      name: '站点用户',
      description: '默认拥有站点全部功能权限',
      is_system: true,
      status: 'ENABLED',
    },
    select: { id: true },
  });
  const sitePermissions = await prisma.permissions.findMany({
    where: { code: { in: SITE_PERMISSION_CODES } },
    select: { id: true },
  });

  if (sitePermissions.length > 0) {
    const existingRolePermissions = await prisma.rolePermissions.findMany({
      where: {
        role_id: siteRole.id,
        permission_id: { in: sitePermissions.map((permission) => permission.id) },
      },
      select: { permission_id: true },
    });
    const existingPermissionIds = new Set(
      existingRolePermissions.map((rolePermission) => rolePermission.permission_id),
    );
    const missingRolePermissions = sitePermissions.filter(
      (permission) => !existingPermissionIds.has(permission.id),
    );

    if (missingRolePermissions.length > 0) {
      await prisma.rolePermissions.createMany({
        data: missingRolePermissions.map((permission) => ({
          role_id: siteRole.id,
          permission_id: permission.id,
        })),
      });
      changed = true;
    }
  }

  const existingSiteRole = await prisma.userRoles.findFirst({
    where: {
      user_id: userId,
      role_id: siteRole.id,
      revoked_at: null,
    },
    select: { id: true },
  });

  if (existingSiteRole) {
    return changed;
  }

  await prisma.userRoles.create({
    data: {
      user_id: userId,
      role_id: siteRole.id,
    },
  });

  return true;
}

export async function getAuthUserBySessionToken(token?: string | null): Promise<AuthUser | null> {
  if (!token) {
    return null;
  }

  const now = new Date();
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
            where: {
              revoked_at: null,
              AND: [
                { OR: [{ valid_from: null }, { valid_from: { lte: now } }] },
                { OR: [{ valid_until: null }, { valid_until: { gt: now } }] },
              ],
              role: { status: 'ENABLED' },
            },
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

  const currentPermissionCodes = new Set(
    session.user.user_roles.flatMap((userRole) =>
      userRole.role.role_permissions.map((rolePermission) => rolePermission.permission.code),
    ),
  );
  const hasSiteRole = session.user.user_roles.some(
    (userRole) => userRole.role.code === RoleCode.SITE_USER,
  );
  const hasSitePermissions = SITE_PERMISSION_CODES.every((code) =>
    currentPermissionCodes.has(code),
  );

  if (!hasSiteRole || !hasSitePermissions) {
    const assigned = await ensureSiteRoleForUser(session.user.id);

    if (assigned) {
      return getAuthUserBySessionToken(token);
    }
  }

  const roles = new Set<string>();
  const permissions = new Set<string>();

  for (const userRole of session.user.user_roles) {
    roles.add(userRole.role.code);

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
