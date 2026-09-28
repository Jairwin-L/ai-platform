import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Input, Skeleton, Switch, TreeSelect } from 'antd';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { RoleCode } from '@ai/constants/roles';
import {
  createRbacRole,
  getRbacPermissions,
  getRbacRoles,
  updateRbacRole,
  type RbacPermission,
  type RbacRole,
} from '@/api/methods/rbac';
import { useLiteDebounced, usePermission } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { getFormFieldErrors } from '@/utils/form';
import { roleFormSchema, type RoleFormValues } from './schemas';

interface PermissionTreeNode {
  title: string;
  value: string;
  children?: PermissionTreeNode[];
}

const DEFAULT_VALUES: RoleFormValues = {
  code: '',
  name: '',
  enable: true,
  description: '',
  remark: '',
  permissionIds: [],
};

const LIST_PATH = '/system/role';

function toTreeNodes(nodes: RbacPermission[]): PermissionTreeNode[] {
  return nodes.map((permission) => ({
    title: `${permission.name} · ${permission.code}`,
    value: permission.id,
    children: permission.children?.length ? toTreeNodes(permission.children) : undefined,
  }));
}

export default function RoleForm({ roleId }: { roleId?: string }) {
  const navigate = useNavigate();
  const can = usePermission();
  const [form] = Form.useForm<RoleFormValues>();
  const [permissionTree, setPermissionTree] = useState<PermissionTreeNode[]>([]);
  const [isSuperAdminRole, setIsSuperAdminRole] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(roleId);
  // 编辑时改启停需要单独的 ROLE_SET_STATE，新建时随表单一起提交即可
  const canToggleState = !isEditing || can(PERMISSION_CODE.OPERATION.ROLE.SET_STATE);

  useEffect(() => {
    let active = true;

    async function loadForm() {
      setLoading(true);
      const [treeResult, rolesResult] = await Promise.allSettled([
        getRbacPermissions({ tree: true }),
        roleId ? getRbacRoles() : Promise.resolve<RbacRole[]>([]),
      ]);
      if (!active) return;

      if (treeResult.status === 'fulfilled') {
        setPermissionTree(toTreeNodes(treeResult.value.data));
      }
      const role =
        rolesResult.status === 'fulfilled'
          ? rolesResult.value.find((item) => item.id === roleId)
          : undefined;
      if (role) {
        setIsSuperAdminRole(role.code === RoleCode.SUPER_ADMIN);
        form.setFieldsValue({
          code: role.code,
          name: role.name,
          enable: role.enable,
          description: role.description ?? '',
          remark: role.remark ?? '',
          permissionIds: role.permissions.map((permission) => permission.id),
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
        // 角色编码创建后不可修改，不再提交；没有启停权限时不提交 enable，否则服务端会再要求一次 ROLE_SET_STATE
        const { name, description, remark, permissionIds, enable } = parsed.data;
        const profile = { name, description, remark, permissionIds };
        await updateRbacRole(roleId, canToggleState ? { ...profile, enable } : profile);
      } else {
        await createRbacRole(parsed.data);
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
          <p>
            {isEditing
              ? '更新角色信息和菜单、按钮授权范围。'
              : '创建角色并选择可访问的菜单与按钮。'}
          </p>
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
            normalize={(value?: string) => value?.toUpperCase()}
            rules={[{ required: true, whitespace: true, message: '请输入角色编码' }]}
            extra={isEditing ? '角色编码参与鉴权，创建后不可修改' : undefined}
          >
            <Input disabled={isEditing} maxLength={50} placeholder="例如：CONTENT_REVIEWER" />
          </Form.Item>
          <Form.Item
            label="角色名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入角色名称' }]}
          >
            <Input maxLength={50} placeholder="例如：内容审核员" />
          </Form.Item>
          <Form.Item label="启用状态" name="enable" valuePropName="checked">
            <Switch
              checkedChildren="启用"
              disabled={isSuperAdminRole || !canToggleState}
              unCheckedChildren="停用"
            />
          </Form.Item>
          <Form.Item label="角色说明" name="description">
            <Input.TextArea maxLength={255} rows={3} showCount />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea maxLength={255} rows={2} showCount />
          </Form.Item>
          <Form.Item
            label="资源权限"
            name="permissionIds"
            extra={
              isSuperAdminRole
                ? '超级管理员天然拥有全部已启用的权限，这里的勾选不影响鉴权。'
                : '勾选的菜单与按钮会一并保存；非超级管理员只能授予自己已拥有的权限。'
            }
          >
            {/*
              父子节点都要提交：服务端按按钮权限码逐个鉴权，
              只存父节点（SHOW_PARENT）会让勾满的菜单下所有按钮权限都不生效
            */}
            <TreeSelect
              allowClear
              maxTagCount="responsive"
              multiple
              placeholder="选择此角色可用的菜单与按钮"
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
