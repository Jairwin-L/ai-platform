import { debounce } from 'lodash-es';
import { useEffect, useMemo, useRef } from 'react';

export function useDebounced<Args extends unknown[], R>(
  callback: (...args: Args) => R,
  wait = 300,
) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useMemo(
    () =>
      debounce((...args: Args) => callbackRef.current(...args), wait, {
        leading: true,
        trailing: false,
      }),
    [wait],
  );

  useEffect(() => {
    return () => debouncedCallback.cancel();
  }, [debouncedCallback]);

  return debouncedCallback;
}
