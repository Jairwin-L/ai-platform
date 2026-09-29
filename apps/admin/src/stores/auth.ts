import { create } from 'zustand';
import { ADMIN_ROLE_CODES } from '@ai/constants/roles';
import { fetchCurrentUser, logout, type AuthAccount } from '@/api/methods/auth';

type AdminRoleCode = (typeof ADMIN_ROLE_CODES)[number];

/**
 * 管理端会话状态。
 *
 * 会话是 db-service 下发的 HttpOnly Cookie，前端读不到也删不掉，
 * 这里不存任何 token，只缓存 `/auth/me` 的结果作为「是否已登录」的判据。
 */
interface AuthState {
  currentUser: AuthAccount | null;
  /** 是否已经完成过一次会话探测；未完成前不能判定「未登录」 */
  initialized: boolean;
  loading: boolean;
  fetchCurrentUser: () => Promise<AuthAccount | null>;
  setCurrentUser: (user: AuthAccount | null) => void;
  clearAuth: () => Promise<void>;
}

/** 同一时刻只允许一个 `/auth/me` 在飞，避免多个组件同时挂载时打出一串重复请求 */
let currentUserRequest: Promise<AuthAccount | null> | null = null;

export function isAdminRole(roles?: string[]): boolean {
  return Boolean(roles?.some((role) => ADMIN_ROLE_CODES.includes(role as AdminRoleCode)));
}

/**
 * 当前账号是否同时拥有全部指定权限码。
 *
 * 超级管理员与服务端守卫口径一致，直接放行。只用于收敛入口显隐，越权拦截以服务端为准。
 */
export function hasPermission(account: AuthAccount | null | undefined, codes: string[]): boolean {
  if (!account) return false;
  if (isAdminRole(account.roles)) return true;
  return codes.every((code) => account.permissions.includes(code));
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  initialized: false,
  loading: false,
  fetchCurrentUser: () => {
    if (currentUserRequest) return currentUserRequest;

    set({ loading: true });
    currentUserRequest = fetchCurrentUser()
      .then((response) => {
        const currentUser = response.data ?? null;
        set({ currentUser, initialized: true, loading: false });
        return currentUser;
      })
      .catch(() => {
        set({ currentUser: null, initialized: true, loading: false });
        return null;
      })
      .finally(() => {
        currentUserRequest = null;
      });

    return currentUserRequest;
  },
  setCurrentUser: (currentUser) => {
    set({ currentUser, initialized: true, loading: false });
  },
  clearAuth: async () => {
    // 服务端销毁会话失败也要把本地状态清掉，否则用户会卡在「已登录」的假象里
    await logout().catch(() => undefined);
    set({ currentUser: null, initialized: true, loading: false });
  },
}));
