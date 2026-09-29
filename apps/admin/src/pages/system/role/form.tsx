import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Skeleton } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { RoleCode } from '@ai/constants/roles';
import {
  createRbacRole,
  getRbacPermissions,
  getRbacRoles,
  updateRbacRole,
} from '@/api/methods/rbac';
import { usePermission } from '@/hooks';
import FormItems from '@/components/form-items';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import {
  defaultValues,
  getFormItems,
  getPermissionTree,
  type PermissionTreeNode,
} from './form-item-config';
import { roleFormSchema, type RoleFormValues } from './schemas';

const ROLE_LIST_PATH = '/system/role';

export default function FormPage({ roleId }: { roleId?: string }) {
  const navigate = useNavigate();
  const can = usePermission();
  const [form] = Form.useForm<RoleFormValues>();
  const [permissionTree, setPermissionTree] = useState<PermissionTreeNode[]>([]);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const isEditing = Boolean(roleId);
  // 编辑时改启停需要单独的 ROLE_SET_STATE，新建时随表单一起提交即可
  const canToggleState = !isEditing || can(PERMISSION_CODE.OPERATION.ROLE.SET_STATE);

  const formItems = useMemo(
    () => getFormItems({ canToggleState, isEditing, isSuperAdmin, permissionTree }),
    [canToggleState, isEditing, isSuperAdmin, permissionTree],
  );

  const loadForm = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);

    const [treeResult, rolesResult] = await Promise.allSettled([
      getRbacPermissions({ tree: true }),
      roleId ? getRbacRoles() : Promise.resolve(null),
    ]);

    if (treeResult.status === 'fulfilled') {
      setPermissionTree(getPermissionTree(treeResult.value.data?.data ?? []));
    } else {
      setLoadFailed(true);
    }

    if (!roleId) {
      form.setFieldsValue(defaultValues);
      setLoading(false);
      return;
    }

    if (rolesResult.status === 'fulfilled') {
      const role = rolesResult.value?.data?.find((item) => item.id === roleId);
      if (role) {
        setIsSuperAdmin(role.code === RoleCode.SUPER_ADMIN);
        form.setFieldsValue({
          code: role.code,
          name: role.name,
          enable: role.enable,
          description: role.description ?? '',
          remark: role.remark ?? '',
          permissionIds: role.permissions.map((permission) => permission.id),
        });
      } else {
        // 角色可能已被删除，停在空表单上只会让用户误以为在新建
        setLoadFailed(true);
      }
    } else {
      setLoadFailed(true);
    }

    setLoading(false);
  }, [form, roleId]);

  useEffect(() => {
    loadForm().catch(() => undefined);
  }, [loadForm]);

  const onBackToRoles = () => {
    void navigate(ROLE_LIST_PATH);
  };

  const onFinish = async (values: RoleFormValues) => {
    const parsed = roleFormSchema.safeParse(values);
    if (!parsed.success) return;

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
      onBackToRoles();
    } catch {
      // 接口错误已由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  };

  if (loadFailed) return <Exception onClick={loadForm} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBackToRoles}>
            返回角色列表
          </Button>
          <h1>
            <SafetyCertificateOutlined /> {isEditing ? '编辑角色' : '新建角色'}
          </h1>
          <p>
            {isEditing
              ? '更新角色信息和菜单、按钮授权范围。'
              : '创建角色并选择可访问的菜单与按钮。'}
          </p>
        </div>
      </section>

      <section className={css.panel}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        <Form
          className={loading ? css.hidden : undefined}
          form={form}
          initialValues={defaultValues}
          layout="vertical"
          onFinish={onFinish}
        >
          <div className={css['form-grid']}>
            <FormItems items={formItems} />
          </div>
          <div className={css['form-actions']}>
            <Button onClick={onBackToRoles}>取消</Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建角色'}
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
