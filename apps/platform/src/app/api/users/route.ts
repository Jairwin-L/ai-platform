import type { NextRequest } from 'next/server';
import { UserStatusType, type Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import {
  DATA_ERROR,
  createErrorResponse,
  createPaginatedResponse,
  type ApiHandler,
  withRoleApiHandler,
} from '@/lib/server';

function getPositiveInteger(value: string | null, fallback: number): number {
  const parsed = value ? Number.parseInt(value, 10) : fallback;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const userStatuses = new Set(['active', 'pending', 'restricted', 'banned', 'inactive']);

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get user list
 */
const getUsersHandler: ApiHandler = async (request: NextRequest) => {
  const { searchParams } = request.nextUrl;
  const page = getPositiveInteger(searchParams.get('page'), 1);
  const pageSize = Math.min(getPositiveInteger(searchParams.get('pageSize'), 10), 100);
  const searchTerm = searchParams.get('searchTerm')?.trim() || '';
  const role = searchParams.get('role')?.trim() || '';
  const status = searchParams.get('status')?.trim() || '';
  const skip = (page - 1) * pageSize;
  const where: Prisma.UsersWhereInput = { is_deleted: false };

  if (searchTerm) {
    where.OR = [
      { full_name: { contains: searchTerm, mode: 'insensitive' } },
      { nick_name: { contains: searchTerm, mode: 'insensitive' } },
      { user_name: { contains: searchTerm, mode: 'insensitive' } },
      { email: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (userStatuses.has(status)) {
    where.status = status as UserStatusType;
  }

  if (role) {
    where.user_roles = { some: { role: { name: role } } };
  }

  try {
    const total = await prisma.users.count({ where });
    const users = await prisma.users.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { created_at: 'desc' },
      include: {
        user_roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    const data = users.map((user) => ({
      id: user.id,
      full_name: user.full_name,
      nick_name: user.nick_name,
      user_name: user.user_name,
      picture: user.picture,
      email: user.email,
      email_verified: user.email_verified,
      status: user.status,
      last_login_at: user.last_login_at?.toISOString() ?? null,
      created_at: user.created_at.toISOString(),
      roles: user.user_roles.map((userRole) => userRole.role),
    }));

    return createPaginatedResponse(data, total, page, pageSize, '用户列表查询成功');
  } catch (error) {
    return createErrorResponse(DATA_ERROR.QUERY_FAILED, '用户列表查询失败', error, 500);
  }
};

export const GET = withRoleApiHandler(['admin'], getUsersHandler);
