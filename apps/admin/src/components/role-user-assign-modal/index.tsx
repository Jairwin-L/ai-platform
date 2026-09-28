import { useEffect, useState } from 'react';
import { Modal, Select, Space, Tag, Typography } from 'antd';
import { RoleCode } from '@ai/constants/roles';
import {
  getRbacUsers,
  getRoleUsers,
  setRoleUsers,
  type RbacRole,
  type RbacUser,
} from '@/api/methods/rbac';

interface RoleUserAssignModalProps {
  /** 为空时弹窗关闭 */
  role: RbacRole | null;
  onClose: (saved: boolean) => void;
}

function getDisplayName(user: Pick<RbacUser, 'account' | 'nickname' | 'username'>): string {
  return user.username || user.nickname || user.account || '未命名用户';
}

function isSuperAdminUser(user: RbacUser): boolean {
  return user.roles.some((role) => role.code === RoleCode.SUPER_ADMIN);
}

/** 角色成员维护：保存时服务端按差集增量新增 / 移除 */
export default function RoleUserAssignModal({ role, onClose }: RoleUserAssignModalProps) {
  const [users, setUsers] = useState<RbacUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!role) return;
    let active = true;

    async function loadRoleUsers(roleId: string) {
      setLoading(true);
      setSelectedIds([]);
      const [usersResult, roleUsersResult] = await Promise.allSettled([
        getRbacUsers({ page: 1, pageSize: 100 }),
        getRoleUsers(roleId),
      ]);
      if (!active) return;

      setUsers(usersResult.status === 'fulfilled' ? usersResult.value.data : []);
      setSelectedIds(
        roleUsersResult.status === 'fulfilled' ? roleUsersResult.value.map((user) => user.id) : [],
      );
      setLoading(false);
    }

    loadRoleUsers(role.id).catch(() => setLoading(false));
    return () => {
      active = false;
    };
  }, [role]);

  const onSave = async () => {
    if (!role) return;
    setSaving(true);
    try {
      await setRoleUsers(role.id, selectedIds);
      onClose(true);
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      destroyOnHidden
      cancelText="取消"
      confirmLoading={saving}
      okButtonProps={{ disabled: loading }}
      okText="保存"
      open={Boolean(role)}
      title={
        <Space>
          分配用户
          {role ? <Tag color="processing">{role.name}</Tag> : null}
        </Space>
      }
      onCancel={() => onClose(false)}
      onOk={() => {
        onSave().catch(() => undefined);
      }}
    >
      <Select
        allowClear
        loading={loading}
        mode="multiple"
        optionFilterProp="label"
        // 超管的角色只能由 bootstrap 配置，选了也会被接口拒绝；已在角色内的历史数据仍保留可见，便于移除
        options={users
          .filter((user) => selectedIds.includes(user.id) || !isSuperAdminUser(user))
          .map((user) => ({ label: `${getDisplayName(user)}（${user.account}）`, value: user.id }))}
        placeholder="选择要加入该角色的系统用户"
        style={{ width: '100%' }}
        value={selectedIds}
        onChange={setSelectedIds}
      />
      <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }} type="secondary">
        保存后会增量新增 / 移除该角色下的用户；加入角色等于授出该角色的全部权限，
        不能超出你自己拥有的权限。
      </Typography.Paragraph>
    </Modal>
  );
}
