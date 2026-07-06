import { prisma } from '@/lib/prisma';

export type UserProfile = IApiUsers.UserProfile;
export type UserProfileRole = IApiUsers.UserProfileRole;

function serializeDate(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export async function getUserProfile(
  userId: string,
  currentUserId?: string,
): Promise<UserProfile | null> {
  const now = new Date();
  const user = await prisma.users.findFirst({
    where: {
      id: userId,
      is_deleted: false,
    },
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
        select: {
          role: {
            select: {
              code: true,
              id: true,
              name: true,
              description: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    full_name: user.full_name,
    nick_name: user.nick_name,
    user_name: user.user_name,
    picture: user.picture,
    email: user.email,
    email_verified: user.email_verified,
    bio: user.bio,
    status: user.status,
    is_me: currentUserId === user.id,
    last_login_at: serializeDate(user.last_login_at),
    created_at: user.created_at.toISOString(),
    updated_at: user.updated_at.toISOString(),
    roles: user.user_roles.map((userRole) => userRole.role),
  };
}
