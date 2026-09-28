import { useCallback } from 'react';
import { hasPermission, useAuthStore } from '@/stores/auth';

/**
 * 按钮级权限判定：返回的函数在当前账号同时拥有全部指定权限码时为 true。
 *
 * 只收敛入口显隐，越权拦截仍以服务端 AdminPermissionAuth 为准。
 */
export function usePermission() {
  const currentUser = useAuthStore((state) => state.currentUser);
  return useCallback((...codes: string[]) => hasPermission(currentUser, codes), [currentUser]);
}
