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
  const user = await prisma.users.findFirst({
    where: {
      id: userId,
      is_deleted: false,
    },
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
