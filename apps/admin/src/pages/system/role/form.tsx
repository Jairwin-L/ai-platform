import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Input, Select, Skeleton, Switch, TreeSelect } from 'antd';
import {
  createRole,
  getPermissionTree,
  getRole,
  updateRole,
  type AdminPermission,
} from '@/api/methods/rbac';
import { useLiteDebounced } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { EDITABLE_ROLE_CODES, roleFormSchema, type RoleFormValues } from './schemas';
import { getFormFieldErrors } from '@/utils/form';

interface PermissionTreeNode {
  title: string;
  value: string;
  children?: PermissionTreeNode[];
}

const DEFAULT_VALUES: RoleFormValues = {
  code: '',
  name: '',
  description: '',
  is_system: false,
  status: 'ENABLED',
  permissions: [],
};

const ROLE_CODE_OPTIONS = EDITABLE_ROLE_CODES.map((code) => ({ label: code, value: code }));
const LIST_PATH = '/system/role';

function toTreeNodes(nodes: AdminPermission[]): PermissionTreeNode[] {
  return nodes.map((permission) => ({
    title: `${permission.name} · ${permission.code}`,
    value: permission.id,
    children: permission.children?.length ? toTreeNodes(permission.children) : undefined,
  }));
}

export default function RoleForm({ roleId }: { roleId?: string }) {
  const navigate = useNavigate();
  const [form] = Form.useForm<RoleFormValues>();
  const [permissionTree, setPermissionTree] = useState<PermissionTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(roleId);

  useEffect(() => {
    let active = true;

    async function loadForm() {
      setLoading(true);
      const [treeResult, roleResult] = await Promise.allSettled([
        getPermissionTree(),
        roleId ? getRole(roleId) : Promise.resolve(null),
      ]);
      if (!active) return;

      if (treeResult.status === 'fulfilled') {
        setPermissionTree(toTreeNodes(treeResult.value.data));
      }
      if (roleResult.status === 'fulfilled' && roleResult.value) {
        const role = roleResult.value;
        form.setFieldsValue({
          code: role.code,
          name: role.name,
          description: role.description ?? '',
          is_system: role.is_system,
          status: role.status,
          permissions: role.permissions ?? [],
        });
      } else if (!roleId) {
        form.setFieldsValue(DEFAULT_VALUES);
      }
      setLoading(false);
    }

    loadForm().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [form, roleId]);

  const onSubmit = useLiteDebounced(async (values: RoleFormValues) => {
    const parsed = roleFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

    setSaving(true);
    try {
      if (roleId) {
        await updateRole(roleId, parsed.data);
      } else {
        await createRole(parsed.data);
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
          <h1>{isEditing ? '编辑角色' : '新建角色'}</h1>
          <p>{isEditing ? '更新角色信息和授权范围。' : '创建角色并选择对应的权限范围。'}</p>
        </div>
      </section>
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        <Form
          className={loading ? pageCss.hidden : undefined}
          form={form}
          initialValues={DEFAULT_VALUES}
          layout="vertical"
          requiredMark="optional"
          onFinish={onSubmit}
        >
          <Form.Item
            label="角色编码"
            name="code"
            rules={[{ required: true, message: '请选择角色编码' }]}
          >
            <Select options={ROLE_CODE_OPTIONS} placeholder="选择系统定义的角色编码" />
          </Form.Item>
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入角色名称' }]}
          >
            <Input maxLength={80} placeholder="例如：操作员" />
          </Form.Item>
          <Form.Item label="角色说明" name="description">
            <Input.TextArea maxLength={240} rows={3} showCount />
          </Form.Item>
          <Form.Item
            label="系统角色"
            name="is_system"
            valuePropName="checked"
            extra="系统角色不可删除"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item label="状态" name="status">
            <Select
              options={[
                { label: '启用', value: 'ENABLED' },
                { label: '停用', value: 'DISABLED' },
              ]}
            />
          </Form.Item>
          <Form.Item label="权限" name="permissions">
            <TreeSelect
              allowClear
              maxTagCount="responsive"
              multiple
              placeholder="选择此角色可用的权限"
              showCheckedStrategy={TreeSelect.SHOW_ALL}
              treeCheckable
              treeData={permissionTree}
              treeDefaultExpandAll
            />
          </Form.Item>
          <div className={pageCss['form-actions']}>
            <Button onClick={onCancel}>取消</Button>
            <Button htmlType="submit" loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建角色'}
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
