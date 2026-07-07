declare module 'lodash-es' {
  interface DebouncedFunc<Args extends unknown[], Result> {
    (...args: Args): Result | undefined;
    cancel: () => void;
    flush: () => Result | undefined;
  }

  interface DebounceSettings {
    leading?: boolean;
    maxWait?: number;
    trailing?: boolean;
  }

  export function debounce<Args extends unknown[], Result>(
    func: (...args: Args) => Result,
    wait?: number,
    options?: DebounceSettings,
  ): DebouncedFunc<Args, Result>;
}
