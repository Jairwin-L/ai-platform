import { describe, expect, it } from 'vite-plus/test';
import { isArray } from '@/utils';

describe('isArray', () => {
  it('detects arrays', () => {
    expect(isArray([])).toBe(true);
    expect(isArray([1, 2, 3])).toBe(true);
  });

  it('rejects non-arrays', () => {
    expect(isArray({ length: 0 })).toBe(false);
    expect(isArray('value')).toBe(false);
    expect(isArray(null)).toBe(false);
  });
});
