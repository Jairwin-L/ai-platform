'use client';

import { ArrowLeftOutlined, SafetyCertificateOutlined, SaveOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Skeleton } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPermission,
  getPermission,
  getPermissions,
  updatePermission,
  type AdminPermission,
  type PermissionPayload,
  type PermissionType,
} from '@/api/modules/admin';
import styles from './admin-form-page.module.scss';

interface PermissionFormValues {
  code: string;
  description?: string;
  name: string;
  parent_id?: string;
  type: PermissionType;
}

const typeLabel: Record<PermissionType, string> = {
  system: '系统',
  page: '页面',
  module: '模块',
  operation: '操作',
  data: '数据',
};

function flattenPermissions(permissions: AdminPermission[]): AdminPermission[] {
  return permissions.flatMap((permission) => [
    permission,
    ...(permission.children?.length ? flattenPermissions(permission.children) : []),
  ]);
}

export function PermissionFormPage({
  permissionId,
  parentId,
}: {
  permissionId?: string;
  parentId?: string;
}) {
  const router = useRouter();
  const [form] = Form.useForm<PermissionFormValues>();
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(permissionId);
  const flatPermissions = useMemo(() => flattenPermissions(permissions), [permissions]);

  const loadForm = useCallback(async () => {
    setLoading(true);

    if (!permissionId) {
      const [permissionsResult] = await Promise.allSettled([
        getPermissions({ page: 1, pageSize: 1000, tree: true }),
      ]);

      if (permissionsResult.status === 'fulfilled') {
        setPermissions(permissionsResult.value.data);
      }
      form.setFieldsValue({
        name: '',
        code: '',
        description: '',
        parent_id: parentId,
        type: parentId ? 'operation' : 'page',
      });
    } else {
      const [permissionResult, permissionsResult] = await Promise.allSettled([
        getPermission(permissionId),
        getPermissions({ page: 1, pageSize: 1000, tree: true }),
      ]);

      if (permissionResult.status === 'fulfilled') {
        const permission = permissionResult.value;
        form.setFieldsValue({
          name: permission.name,
          code: permission.code,
          description: permission.description ?? '',
          parent_id: permission.parent_id ?? undefined,
          type: permission.type,
        });
      }

      if (permissionsResult.status === 'fulfilled') {
        setPermissions(permissionsResult.value.data);
      }
    }

    setLoading(false);
  }, [form, parentId, permissionId]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  async function onFinish(values: PermissionFormValues) {
    const payload: PermissionPayload = {
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      description: values.description?.trim() || undefined,
      parent_id: values.parent_id ? Number(values.parent_id) : null,
      type: values.type,
    };

    setSaving(true);
    try {
      if (permissionId) {
        await updatePermission(permissionId, payload);
      } else {
        await createPermission(payload);
      }
      router.push('/admin/permissions');
    } catch {
      // 请求错误由 alova 全局提示处理。
    } finally {
      setSaving(false);
    }
  }

  const parentOptions = flatPermissions
    .filter((permission) => permission.id !== permissionId)
    .map((permission) => ({
      label: `${permission.name} · ${permission.code}`,
      value: permission.id,
    }));

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => router.push('/admin/permissions')}
        >
          返回权限列表
        </Button>
        <h1>
          <SafetyCertificateOutlined /> {isEditing ? '编辑权限' : '新建权限'}
        </h1>
        <p>{isEditing ? '更新权限名称、层级及访问类型。' : '创建页面、模块、操作或数据级权限。'}</p>
      </section>
      <section className={styles.panel}>
        {loading && <Skeleton active paragraph={{ rows: 8 }} />}
        <Form
          className={loading ? styles.hidden : undefined}
          form={form}
          layout="vertical"
          requiredMark="optional"
          onFinish={onFinish}
        >
          <Form.Item
            label="权限名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入权限名称' }]}
          >
            <Input maxLength={80} placeholder="例如：查看角色" />
          </Form.Item>
          <Form.Item
            label="权限编码"
            name="code"
            rules={[{ required: true, whitespace: true, message: '请输入权限编码' }]}
          >
            <Input maxLength={120} placeholder="例如：ACCOUNTS:ROLES:READ" />
          </Form.Item>
          <Form.Item label="权限类型" name="type" rules={[{ required: true }]}>
            <Select
              options={Object.entries(typeLabel).map(([value, label]) => ({ label, value }))}
            />
          </Form.Item>
          <Form.Item label="上级权限" name="parent_id">
            <Select
              allowClear
              optionFilterProp="label"
              options={parentOptions}
              placeholder="作为根权限创建"
              showSearch
            />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea
              maxLength={240}
              placeholder="说明这个权限控制的范围"
              rows={3}
              showCount
            />
          </Form.Item>
          <div className={styles.actions}>
            <Button onClick={() => router.push('/admin/permissions')}>取消</Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建权限'}
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
