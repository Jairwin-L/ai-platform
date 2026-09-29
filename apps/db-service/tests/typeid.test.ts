import { describe, expect, it } from 'vite-plus/test';
import { ID_PREFIX, createId, encodeTypeIdSuffix } from '../prisma/data/id';

describe('createId', () => {
  it('generates a prefixed 26-char base32 suffix', () => {
    const id = createId(ID_PREFIX.rolePermission);

    // 规范要求首字符 ≤ 7，字母表不含 i / l / o / u
    expect(id).toMatch(/^role_permission_[0-7][0-9a-hjkmnp-tv-z]{25}$/);
  });

  it('keeps ids strictly increasing within one process', () => {
    const ids = Array.from({ length: 1000 }, () => createId(ID_PREFIX.role));

    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });
});

describe('encodeTypeIdSuffix', () => {
  it('matches the TypeID spec test vectors', () => {
    const nil = new Uint8Array(16);
    const max = new Uint8Array(16).fill(0xff);

    expect(encodeTypeIdSuffix(nil)).toBe('00000000000000000000000000');
    expect(encodeTypeIdSuffix(max)).toBe('7zzzzzzzzzzzzzzzzzzzzzzzzz');
  });
});
