'use client';

import { ArrowLeftOutlined, SaveOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Form, Input, Skeleton, Switch, TreeSelect } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createRole,
  getPermissions,
  getRole,
  updateRole,
  type AdminPermission,
  type RolePayload,
} from '@/services/admin';
import styles from './admin-form-page.module.scss';

interface RoleFormValues {
  description?: string;
  is_system?: boolean;
  name: string;
  permissions?: string[];
}

interface PermissionTreeNode {
  children?: PermissionTreeNode[];
  title: string;
  value: string;
}

const defaultRoleValues: RoleFormValues = {
  description: '',
  is_system: false,
  name: '',
  permissions: [],
};

function getPermissionTree(nodes: AdminPermission[]): PermissionTreeNode[] {
  return nodes.map((permission) => ({
    title: `${permission.name} · ${permission.code}`,
    value: permission.id,
    children: permission.children ? getPermissionTree(permission.children) : undefined,
  }));
}

export function RoleFormPage({ roleId }: { roleId?: string }) {
  const router = useRouter();
  const [form] = Form.useForm<RoleFormValues>();
  const [permissionTree, setPermissionTree] = useState<PermissionTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(roleId);

  const loadForm = useCallback(async () => {
    setLoading(true);
    if (!roleId) {
      const [permissionResult] = await Promise.allSettled([
        getPermissions({ page: 1, pageSize: 1000, tree: true }),
      ]);

      if (permissionResult.status === 'fulfilled') {
        setPermissionTree(getPermissionTree(permissionResult.value.data));
      }
      form.setFieldsValue(defaultRoleValues);
    } else {
      const [roleResult, permissionResult] = await Promise.allSettled([
        getRole(roleId),
        getPermissions({ page: 1, pageSize: 1000, tree: true }),
      ]);

      if (roleResult.status === 'fulfilled') {
        const role = roleResult.value;
        form.setFieldsValue({
          name: role.name,
          description: role.description ?? '',
          is_system: role.is_system,
          permissions: role.permissions ?? [],
        });
      }

      if (permissionResult.status === 'fulfilled') {
        setPermissionTree(getPermissionTree(permissionResult.value.data));
      }
    }

    setLoading(false);
  }, [form, roleId]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  async function onFinish(values: RoleFormValues) {
    const payload: RolePayload = {
      name: values.name.trim(),
      description: values.description?.trim() || undefined,
      is_system: values.is_system ?? false,
      permissions: values.permissions ?? [],
    };

    setSaving(true);
    try {
      if (roleId) {
        await updateRole(roleId, payload);
      } else {
        await createRole(payload);
      }
      router.push('/admin/roles');
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => router.push('/admin/roles')}
        >
          返回角色列表
        </Button>
        <h1>
          <TeamOutlined /> {isEditing ? '编辑角色' : '新建角色'}
        </h1>
        <p>{isEditing ? '更新角色信息和授权范围。' : '创建角色并选择对应的权限范围。'}</p>
      </section>
      <section className={styles.panel}>
        {loading && <Skeleton active paragraph={{ rows: 8 }} />}
        <Form
          className={loading ? styles.hidden : undefined}
          form={form}
          initialValues={defaultRoleValues}
          layout="vertical"
          requiredMark="optional"
          onFinish={onFinish}
        >
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入角色名称' }]}
          >
            <Input maxLength={80} placeholder="例如：内容审核员" />
          </Form.Item>
          <Form.Item label="角色说明" name="description">
            <Input.TextArea
              maxLength={240}
              placeholder="说明该角色的职责和授权范围"
              rows={3}
              showCount
            />
          </Form.Item>
          <Form.Item label="系统角色" name="is_system" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item label="权限" name="permissions">
            <TreeSelect
              allowClear
              maxTagCount="responsive"
              multiple
              placeholder="选择此角色可用的权限"
              showCheckedStrategy={TreeSelect.SHOW_PARENT}
              treeCheckable
              treeData={permissionTree}
              treeDefaultExpandAll
            />
          </Form.Item>
          <p className={styles.help}>
            授权数据通过项目的权限接口读取，保存后会更新该角色关联的权限。
          </p>
          <div className={styles.actions}>
            <Button onClick={() => router.push('/admin/roles')}>取消</Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建角色'}
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
