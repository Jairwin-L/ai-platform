import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Input, Select, Skeleton } from 'antd';
import {
  createPermission,
  getPermission,
  getPermissionTree,
  updatePermission,
  type AdminPermission,
} from '@/api/methods/rbac';
import { PERMISSION_TYPE_OPTIONS } from '@/constants/permission';
import { useLiteDebounced } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { permissionFormSchema, type PermissionFormValues } from './schemas';
import { getFormFieldErrors } from '@/utils/form';

const LIST_PATH = '/system/permission';
const TYPE_OPTIONS = PERMISSION_TYPE_OPTIONS.map(({ label, value }) => ({ label, value }));

function flattenPermissions(permissions: AdminPermission[]): AdminPermission[] {
  return permissions.flatMap((permission) => [
    permission,
    ...(permission.children?.length ? flattenPermissions(permission.children) : []),
  ]);
}

/** 自己及其全部子孙都不能作为上级，否则会形成循环 */
function collectDescendantIds(permissions: AdminPermission[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const permission of permissions) {
      if (permission.parent_id && ids.has(permission.parent_id) && !ids.has(permission.id)) {
        ids.add(permission.id);
        changed = true;
      }
    }
  }
  return ids;
}

interface PermissionFormProps {
  permissionId?: string;
  parentId?: string;
}

export default function PermissionForm({ permissionId, parentId }: PermissionFormProps) {
  const navigate = useNavigate();
  const [form] = Form.useForm<PermissionFormValues>();
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(permissionId);

  const parentOptions = useMemo(() => {
    const flat = flattenPermissions(permissions);
    const excluded = permissionId ? collectDescendantIds(flat, permissionId) : new Set<string>();
    return flat
      .filter((permission) => !excluded.has(permission.id))
      .map((permission) => ({
        label: `${permission.name} · ${permission.code}`,
        value: permission.id,
      }));
  }, [permissionId, permissions]);

  useEffect(() => {
    let active = true;

    async function loadForm() {
      setLoading(true);
      const [treeResult, permissionResult] = await Promise.allSettled([
        getPermissionTree(),
        permissionId ? getPermission(permissionId) : Promise.resolve(null),
      ]);
      if (!active) return;

      if (treeResult.status === 'fulfilled') {
        setPermissions(treeResult.value.data);
      }
      if (permissionResult.status === 'fulfilled' && permissionResult.value) {
        const permission = permissionResult.value;
        form.setFieldsValue({
          name: permission.name,
          code: permission.code,
          type: permission.type,
          description: permission.description ?? '',
          parent_id: permission.parent_id ?? undefined,
        });
      } else if (!permissionId) {
        form.setFieldsValue({
          name: '',
          code: '',
          description: '',
          parent_id: parentId,
          type: parentId ? 'operation' : 'page',
        });
      }
      setLoading(false);
    }

    loadForm().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [form, parentId, permissionId]);

  const onSubmit = useLiteDebounced(async (values: PermissionFormValues) => {
    const parsed = permissionFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

    setSaving(true);
    try {
      if (permissionId) {
        await updatePermission(permissionId, parsed.data);
      } else {
        await createPermission(parsed.data);
      }
      void navigate(LIST_PATH);
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  });

  const onCancel = () => {
    void navigate(LIST_PATH);
  };

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>{isEditing ? '编辑权限' : '新建权限'}</h1>
          <p>
            {isEditing ? '更新权限名称、层级及访问类型。' : '创建页面、模块、操作或数据级权限。'}
          </p>
        </div>
      </section>
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        <Form
          className={loading ? pageCss.hidden : undefined}
          form={form}
          layout="vertical"
          requiredMark="optional"
          onFinish={onSubmit}
        >
          <Form.Item
            label="权限名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入权限名称' }]}
          >
            <Input maxLength={80} placeholder="例如：查看文章" />
          </Form.Item>
          <Form.Item
            label="权限编码"
            name="code"
            rules={[{ required: true, whitespace: true, message: '请输入权限编码' }]}
          >
            <Input maxLength={120} placeholder="例如：ARTICLES:VIEW" />
          </Form.Item>
          <Form.Item
            label="权限类型"
            name="type"
            rules={[{ required: true, message: '请选择权限类型' }]}
          >
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="上级权限" name="parent_id">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={parentOptions}
              placeholder="作为根权限创建"
            />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea maxLength={240} rows={3} showCount />
          </Form.Item>
          <div className={pageCss['form-actions']}>
            <Button onClick={onCancel}>取消</Button>
            <Button htmlType="submit" loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建权限'}
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
