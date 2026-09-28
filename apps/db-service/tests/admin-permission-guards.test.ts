import { describe, expect, it, vi } from 'vite-plus/test';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import {
  ALLOW_RESTRICTED_KEY,
  ANY_PERMISSIONS_KEY,
  PERMISSIONS_KEY,
  REALM_KEY,
} from '@/common/decorators/metadata';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import { SessionGuard } from '@/common/guards/session.guard';
import { assertGrantable } from '@/common/utils/permission';
import { PermissionsService } from '@/infra/permissions/permissions.service';
import type { UserAuthQueryService, UserAuthSnapshot } from '@/infra/permissions/user-auth.query';
import type { PrismaService } from '@/infra/prisma/prisma.service';
import type { RedisService } from '@/infra/redis/redis.service';
import { getSessionCookieName, type SessionService } from '@/infra/session/session.service';

function createContext(request: object, response: object = {}): ExecutionContext {
  return {
    getHandler: () => createContext,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }),
  } as unknown as ExecutionContext;
}

/** 只实现守卫用到的 getAllAndOverride，按 key 直接返回元数据 */
function createReflector(metadata: Record<string, unknown>): Reflector {
  return { getAllAndOverride: (key: string) => metadata[key] } as unknown as Reflector;
}

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return { userId: 'u1', roles: [], permissions: [], ...overrides };
}

function getStatus(run: () => unknown): number | undefined {
  try {
    run();
  } catch (error) {
    return (error as { getStatus?: () => number }).getStatus?.();
  }
  return undefined;
}

function createSessionMocks(snapshot: UserAuthSnapshot) {
  const session = {
    getSession: vi.fn(async () => ({ userId: 'u1', createdAt: 0 })),
    destroySession: vi.fn(async () => undefined),
    clearSessionCookie: vi.fn(),
  };
  const permissions = { getUserRolesAndPermissions: vi.fn(async () => snapshot) };
  return { session, permissions };
}

describe('PermissionsGuard', () => {
  it('没有声明权限码时直接放行', () => {
    const guard = new PermissionsGuard(createReflector({}));
    expect(guard.canActivate(createContext({}))).toBe(true);
  });

  it('声明了权限码但请求上没有登录用户时返回 401', () => {
    const guard = new PermissionsGuard(createReflector({ [PERMISSIONS_KEY]: ['USER_READ'] }));
    expect(getStatus(() => guard.canActivate(createContext({})))).toBe(401);
  });

  it('RequirePermissions 要求同时拥有全部权限码', () => {
    const guard = new PermissionsGuard(
      createReflector({ [PERMISSIONS_KEY]: ['USER_READ', 'USER_EDIT'] }),
    );
    const allowed = createUser({ permissions: ['USER_READ', 'USER_EDIT'] });
    const partial = createUser({ permissions: ['USER_READ'] });

    expect(guard.canActivate(createContext({ user: allowed }))).toBe(true);
    expect(getStatus(() => guard.canActivate(createContext({ user: partial })))).toBe(403);
  });

  it('RequireAnyPermissions 拥有其中任一权限码即可', () => {
    const guard = new PermissionsGuard(
      createReflector({ [ANY_PERMISSIONS_KEY]: ['PERMISSION_READ', 'ROLE_EDIT'] }),
    );
    const roleEditor = createUser({ permissions: ['ROLE_EDIT'] });
    const outsider = createUser({ permissions: ['SETTINGS_READ'] });

    expect(guard.canActivate(createContext({ user: roleEditor }))).toBe(true);
    expect(getStatus(() => guard.canActivate(createContext({ user: outsider })))).toBe(403);
  });

  it('超级管理员不受权限码限制，停用按钮资源也不会把超管锁在门外', () => {
    const guard = new PermissionsGuard(
      createReflector({
        [PERMISSIONS_KEY]: ['USER_DELETE'],
        [ANY_PERMISSIONS_KEY]: ['SETTINGS_READ'],
      }),
    );
    const superAdmin = createUser({ roles: ['SUPER_ADMIN'], permissions: [] });

    expect(guard.canActivate(createContext({ user: superAdmin }))).toBe(true);
  });
});

describe('SessionGuard 管理端会话域', () => {
  function setup(snapshot: UserAuthSnapshot) {
    const { session, permissions } = createSessionMocks(snapshot);
    const guard = new SessionGuard(
      createReflector({ [REALM_KEY]: 'admin' }),
      session as unknown as SessionService,
      permissions as unknown as PermissionsService,
    );
    const request: { cookies: Record<string, string>; method: string; user?: AuthUser } = {
      cookies: { [getSessionCookieName('admin')]: 'session-id' },
      method: 'GET',
    };
    return { guard, session, permissions, request };
  }

  const activeSnapshot = { roles: [], permissions: [], status: 'active' as const };

  it('角色被收回、已不能进入管理端的账号，admin 会话立即作废并返回 403', async () => {
    const { guard, session, request } = setup({ ...activeSnapshot, canAccessAdmin: false });

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      status: 403,
    });
    expect(session.destroySession).toHaveBeenCalledWith('session-id', 'admin');
    expect(session.clearSessionCookie).toHaveBeenCalledOnce();
    expect(request.user).toBeUndefined();
  });

  it('持有系统角色的账号正常通过，并按 admin 会话域查询权限', async () => {
    const { guard, permissions, request } = setup({
      ...activeSnapshot,
      permissions: ['USER_READ'],
      canAccessAdmin: true,
    });

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user?.permissions).toEqual(['USER_READ']);
    expect(permissions.getUserRolesAndPermissions).toHaveBeenCalledWith('u1', 'admin');
  });

  it('被停用的系统用户会话立即作废', async () => {
    const { guard, session, request } = setup({
      ...activeSnapshot,
      status: 'inactive',
      canAccessAdmin: true,
    });

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      status: 403,
    });
    expect(session.destroySession).toHaveBeenCalledWith('session-id', 'admin');
  });
});

describe('SessionGuard 平台用户账号状态', () => {
  function setup(snapshot: UserAuthSnapshot, method: string, allowRestricted = false) {
    const { session, permissions } = createSessionMocks(snapshot);
    const guard = new SessionGuard(
      createReflector({ [REALM_KEY]: 'user', [ALLOW_RESTRICTED_KEY]: allowRestricted }),
      session as unknown as SessionService,
      permissions as unknown as PermissionsService,
    );
    const request = { cookies: { [getSessionCookieName('user')]: 'session-id' }, method };
    return { guard, session, request };
  }

  const snapshotOf = (status: UserAuthSnapshot['status']): UserAuthSnapshot => ({
    roles: [],
    permissions: [],
    status,
    statusReason: '违规上传',
    statusExpiresAt: null,
    canAccessAdmin: false,
  });

  it('平台用户不要求系统角色', async () => {
    const { guard, session, request } = setup(snapshotOf('active'), 'POST');

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(session.destroySession).not.toHaveBeenCalled();
  });

  it('受限用户保留会话，只读请求放行', async () => {
    const { guard, session, request } = setup(snapshotOf('restricted'), 'GET');

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
    expect(session.destroySession).not.toHaveBeenCalled();
  });

  it('受限用户的写请求被拦截，但不作废会话', async () => {
    const { guard, session, request } = setup(snapshotOf('restricted'), 'PUT');

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      status: 403,
    });
    expect(session.destroySession).not.toHaveBeenCalled();
  });

  it('标注 AllowRestricted 的写接口对受限用户放行', async () => {
    const { guard, request } = setup(snapshotOf('restricted'), 'POST', true);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });

  it.each(['banned', 'inactive'] as const)('%s 用户的会话立即作废', async (status) => {
    const { guard, session, request } = setup(snapshotOf(status), 'GET');

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      status: 403,
    });
    expect(session.destroySession).toHaveBeenCalledWith('session-id', 'user');
  });

  it('用户已不存在时返回 401 并作废会话', async () => {
    const { guard, session, request } = setup(snapshotOf(null), 'GET');

    await expect(guard.canActivate(createContext(request))).rejects.toMatchObject({
      status: 401,
    });
    expect(session.destroySession).toHaveBeenCalledWith('session-id', 'user');
  });
});

describe('授权越权校验', () => {
  function createService(ownedCodes: string[], rolePermissionCodes: string[] = []) {
    const userAuthQuery = {
      queryUserPermissionResources: vi.fn(async () => ownedCodes.map((code) => ({ code }))),
    };
    const prisma = {
      rolePermission: {
        findMany: vi.fn(async () => rolePermissionCodes.map((code) => ({ permission: { code } }))),
      },
    };
    const service = new PermissionsService(
      prisma as unknown as PrismaService,
      {} as unknown as RedisService,
      userAuthQuery as unknown as UserAuthQueryService,
    );
    return { service, userAuthQuery };
  }

  it('非超管不能授出自己没有的权限，重复编码只报一次', async () => {
    const { service } = createService(['SYSTEM', 'SYSTEM_ROLES', 'ROLE_EDIT']);
    const user = createUser({ permissions: ['ROLE_EDIT'] });

    await expect(
      service.findUngrantablePermissionCodes(user, ['SYSTEM_ROLES', 'USER_DELETE', 'USER_DELETE']),
    ).resolves.toEqual(['USER_DELETE']);
  });

  it('分配角色时，角色的权限集合必须是操作者权限的子集', async () => {
    const { service } = createService(['ROLE_ASSIGN_USER'], ['ROLE_ASSIGN_USER', 'SETTINGS_WRITE']);
    const user = createUser({ permissions: ['ROLE_ASSIGN_USER'] });

    await expect(service.findUngrantableRolePermissionCodes(user, ['r1'])).resolves.toEqual([
      'SETTINGS_WRITE',
    ]);
  });

  it('超级管理员不做越权校验，也不查库', async () => {
    const { service, userAuthQuery } = createService([]);
    const superAdmin = createUser({ roles: ['SUPER_ADMIN'] });

    await expect(
      service.findUngrantablePermissionCodes(superAdmin, ['USER_DELETE']),
    ).resolves.toEqual([]);
    expect(userAuthQuery.queryUserPermissionResources).not.toHaveBeenCalled();
  });

  it('assertGrantable 在存在越权编码时返回 403', () => {
    expect(() => assertGrantable([])).not.toThrow();
    expect(getStatus(() => assertGrantable(['USER_DELETE']))).toBe(403);
  });
});

describe('权限缓存兼容', () => {
  it('缺少 canAccessAdmin 的缓存按未命中重新计算，并按会话域查询', async () => {
    const fresh: UserAuthSnapshot = {
      roles: ['EDITOR'],
      permissions: ['USER_READ'],
      status: 'active',
      canAccessAdmin: true,
    };
    const client = {
      get: vi.fn(async () =>
        JSON.stringify({ roles: ['EDITOR'], permissions: [], status: 'active' }),
      ),
      set: vi.fn(async () => 'OK'),
    };
    const userAuthQuery = { queryUserRolesAndPermissions: vi.fn(async () => fresh) };
    const service = new PermissionsService(
      {} as unknown as PrismaService,
      { getClient: async () => client } as unknown as RedisService,
      userAuthQuery as unknown as UserAuthQueryService,
    );

    await expect(service.getUserRolesAndPermissions('u1', 'admin')).resolves.toEqual(fresh);
    expect(userAuthQuery.queryUserRolesAndPermissions).toHaveBeenCalledExactlyOnceWith(
      'u1',
      'admin',
    );
    expect(client.set).toHaveBeenCalledOnce();
  });
});
