import { describe, expect, it } from 'vite-plus/test';
import { getMissingPermissionMessage } from '@/constants/permissions';

describe('permission messages', () => {
  it('maps permission codes to user-facing messages', () => {
    expect(getMissingPermissionMessage(['AI:CHAT:USE'])).toBe('缺少权限：使用 AI Chat');
    expect(getMissingPermissionMessage(['ARTICLES:ADD'])).toBe('缺少权限：新增文章');
    expect(getMissingPermissionMessage(['ARTICLES:VIEW', 'ARTICLES:EDIT'])).toBe(
      '缺少权限：查看文章、编辑文章',
    );
    expect(getMissingPermissionMessage(['UPLOAD:CREATE'])).toBe('缺少权限：上传文件');
  });

  it('does not expose unknown permission codes', () => {
    expect(getMissingPermissionMessage(['UNKNOWN:ACTION'])).toBe('缺少权限：对应操作');
    expect(getMissingPermissionMessage([])).toBe('缺少权限：对应操作');
  });
});
