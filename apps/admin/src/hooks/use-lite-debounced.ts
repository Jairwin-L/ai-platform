import { useCallback, useEffect, useRef } from 'react';

const DEFAULT_WAIT_MS = 300;

/**
 * 轻量防抖：只用于按钮点击这类「连点保护」场景，不引入额外依赖。
 */
export function useLiteDebounced<A extends unknown[]>(
  handler: (...args: A) => void,
  wait = DEFAULT_WAIT_MS,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        handler(...args);
      }, wait);
    },
    [handler, wait],
  );
}
