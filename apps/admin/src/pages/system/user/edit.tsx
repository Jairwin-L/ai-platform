import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Button, Form, Skeleton } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { RoleCode } from '@ai/constants/roles';
import {
  getRbacRoles,
  getRbacUser,
  updateRbacUser,
  updateRbacUserRoles,
  type RbacRole,
  type RbacUser,
  type UserStatus,
} from '@/api/methods/rbac';
import { usePermission } from '@/hooks';
import { isAdminRole, useAuthStore } from '@/stores/auth';
import FormItems from '@/components/form-items';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { isBootstrapAdmin } from './columns';
import { getFormItems } from './form-item-config';
import { editUserFormSchema, type EditUserFormValues } from './schemas';

const { USER } = PERMISSION_CODE.OPERATION;

/** 编辑页额外展示只读账号，schema 解析时会被剔除 */
type FormValues = EditUserFormValues & { account?: string };

export default function Page() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const can = usePermission();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [form] = Form.useForm<FormValues>();
  const [user, setUser] = useState<RbacUser | null>(null);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const targetIsSuperAdmin = user ? isBootstrapAdmin(user) : false;
  // 超管账号只有超管自己能改，与服务端 UsersService 的口径一致
  const lockedForOperator = targetIsSuperAdmin && !isAdminRole(currentUser?.roles);
  const roleDisabled = targetIsSuperAdmin || !can(USER.ASSIGN_ROLE);
  // 会话守卫只放行 active，服务端不允许停用超管与当前登录用户
  const enableDisabled = targetIsSuperAdmin || user?.id === currentUser?.id || !can(USER.SET_STATE);
  const detailPath = `/system/user/detail/${id}`;

  // 超级管理员角色只能通过 bootstrap 分配；已分配的要保留选项，否则只读的角色框只能显示 id
  const roleOptions = useMemo(() => {
    const assignedRoleIds = new Set(user?.roles.map((role) => role.id));
    return roles
      .filter((role) => assignedRoleIds.has(role.id) || role.code !== RoleCode.SUPER_ADMIN)
      .map((role) => ({ label: role.name, value: role.id }));
  }, [roles, user]);

  const formItems = useMemo(
    () =>
      getFormItems({
        enableDisabled,
        isEditing: true,
        roleDisabled,
        roleExtra: targetIsSuperAdmin
          ? '超级管理员的角色只能通过 bootstrap 配置调整'
          : '新增的角色不能超出你自己拥有的权限',
        roleOptions,
      }),
    [enableDisabled, roleDisabled, roleOptions, targetIsSuperAdmin],
  );

  const loadForm = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    const [userResult, rolesResult] = await Promise.allSettled([getRbacUser(id), getRbacRoles()]);

    if (userResult.status === 'fulfilled') {
      const result = userResult.value;
      setUser(result);
      form.setFieldsValue({
        account: result.account,
        username: result.username ?? '',
        remark: result.remark ?? '',
        roleIds: result.roles.map((role) => role.id),
        enabled: result.status === 'active',
      });
    } else {
      setLoadFailed(true);
    }

    if (rolesResult.status === 'fulfilled') {
      setRoles(rolesResult.value);
    } else {
      setLoadFailed(true);
    }

    setLoading(false);
  }, [form, id]);

  useEffect(() => {
    loadForm().catch(() => undefined);
  }, [loadForm]);

  const onBackToUser = () => {
    void navigate(detailPath);
  };

  const onFinish = async (values: FormValues) => {
    if (!user) return;
    const parsed = editUserFormSchema.safeParse(values);
    if (!parsed.success) return;

    // 只在开关真正变化时提交状态：原状态可能是封禁 / 受限，开关的「关」不能把它覆盖成停用
    const { enabled, remark, roleIds, username } = parsed.data;
    const enabledChanged = enabled !== (user.status === 'active');
    let status: UserStatus | undefined;
    if (enabledChanged && !enableDisabled) status = enabled ? 'active' : 'inactive';

    setSaving(true);
    try {
      // 资料与角色是两个独立接口，任一失败都要让用户知道当前状态可能只改了一半
      const requests: Array<Promise<unknown>> = [
        updateRbacUser(id, { username, remark: remark || null, status }),
      ];
      // 没有分配角色的权限就不提交角色，避免资料保存成功、角色接口却 403 的半成功状态
      if (!roleDisabled) requests.push(updateRbacUserRoles(id, roleIds));

      const results = await Promise.allSettled(requests);
      // 具体失败原因已由全局响应拦截器提示，这里只负责留在当前页
      if (results.some((result) => result.status === 'rejected')) return;
      onBackToUser();
    } finally {
      setSaving(false);
    }
  };

  if (loadFailed) return <Exception onClick={loadForm} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBackToUser}>
            返回用户详情
          </Button>
          <h1>
            <UserOutlined /> 编辑用户
          </h1>
          <p>更新系统用户的资料、角色和账号状态。</p>
        </div>
      </section>

      {lockedForOperator ? (
        <Alert
          className={css.alert}
          showIcon
          title="超级管理员账号只能由超级管理员修改"
          type="warning"
        />
      ) : null}

      <section className={css.panel}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        <Form
          className={loading || !user ? css.hidden : undefined}
          disabled={lockedForOperator}
          form={form}
          layout="vertical"
          onFinish={onFinish}
        >
          <div className={css['form-grid']}>
            <FormItems items={formItems} />
          </div>
          <div className={css['form-actions']}>
            {/* Form 的 disabled 会传导给内部按钮，取消要显式放行，否则锁定时无路可退 */}
            <Button disabled={false} onClick={onBackToUser}>
              取消
            </Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              保存更改
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
