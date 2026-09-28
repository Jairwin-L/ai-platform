import { create } from 'zustand';
import { RoleCode } from '@ai/constants/roles';
import { fetchCurrentUser, logout, type AuthPayload } from '@/api/methods/auth';

/**
 * 管理后台会话状态。
 *
 * 会话是 db-service 下发的 HttpOnly Cookie，前端读不到也删不掉，
 * 这里不存任何 token，只缓存 `/auth/me` 的结果作为「是否已登录」的判据。
 */
interface AuthState {
  currentUser: AuthPayload | null;
  /** 是否已经完成过一次会话探测；未完成前不能判定「未登录」 */
  initialized: boolean;
  loading: boolean;
  fetchCurrentUser: () => Promise<AuthPayload | null>;
  clearAuth: () => Promise<void>;
}

/** 同一时刻只允许一个 `/auth/me` 在飞，避免多个组件同时挂载时打出一串重复请求 */
let currentUserRequest: Promise<AuthPayload | null> | null = null;

export function isSuperAdmin(payload: AuthPayload | null | undefined): boolean {
  return Boolean(payload?.roles.includes(RoleCode.SUPER_ADMIN));
}

export const useAuthStore = create<AuthState>((set) => ({
  currentUser: null,
  initialized: false,
  loading: false,
  fetchCurrentUser: () => {
    if (currentUserRequest) return currentUserRequest;

    set({ loading: true });
    currentUserRequest = fetchCurrentUser()
      .then((currentUser) => {
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
  clearAuth: async () => {
    // 服务端销毁会话失败也要把本地状态清掉，否则用户会卡在「已登录」的假象里
    await logout().catch(() => undefined);
    set({ currentUser: null, initialized: true, loading: false });
  },
}));
