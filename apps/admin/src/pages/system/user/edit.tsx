import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Button, Form, Input, Select, Skeleton, Switch } from 'antd';
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
import { useLiteDebounced, usePermission } from '@/hooks';
import { isAdminRole, useAuthStore } from '@/stores/auth';
import pageCss from '@/styles/page.module.scss';
import { getFormFieldErrors } from '@/utils/form';
import { isBootstrapAdmin } from './columns';
import { editUserFormSchema, type EditUserFormValues } from './schemas';

const { USER } = PERMISSION_CODE.OPERATION;

export default function SystemUserEditPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const can = usePermission();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [form] = Form.useForm<EditUserFormValues>();
  const [user, setUser] = useState<RbacUser | null>(null);
  const [roles, setRoles] = useState<RbacRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    let active = true;

    async function loadForm() {
      setLoading(true);
      const [userResult, rolesResult] = await Promise.allSettled([getRbacUser(id), getRbacRoles()]);
      if (!active) return;

      if (userResult.status === 'fulfilled') {
        const result = userResult.value;
        setUser(result);
        form.setFieldsValue({
          username: result.username ?? '',
          remark: result.remark ?? '',
          roleIds: result.roles.map((role) => role.id),
          enabled: result.status === 'active',
        });
      }
      if (rolesResult.status === 'fulfilled') setRoles(rolesResult.value);
      setLoading(false);
    }

    loadForm().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [form, id]);

  const onSubmit = useLiteDebounced(async (values: EditUserFormValues) => {
    if (!user) return;
    const parsed = editUserFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

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
      void navigate(detailPath);
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>编辑用户</h1>
          <p>更新系统用户的资料、角色和账号状态。</p>
        </div>
      </section>
      {lockedForOperator ? (
        <Alert
          showIcon
          style={{ marginBottom: 16 }}
          title="超级管理员账号只能由超级管理员修改"
          type="warning"
        />
      ) : null}
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        <Form
          className={loading || !user ? pageCss.hidden : undefined}
          disabled={lockedForOperator}
          form={form}
          layout="vertical"
          requiredMark="optional"
          onFinish={onSubmit}
        >
          <Form.Item label="账号">
            <Input disabled value={user?.account} />
          </Form.Item>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, whitespace: true, message: '请输入用户名' }]}
          >
            <Input maxLength={100} />
          </Form.Item>
          <Form.Item
            label="角色"
            name="roleIds"
            extra={
              targetIsSuperAdmin
                ? '超级管理员的角色只能通过 bootstrap 配置调整'
                : '新增的角色不能超出你自己拥有的权限'
            }
          >
            <Select
              disabled={roleDisabled}
              maxTagCount="responsive"
              mode="multiple"
              options={roleOptions}
              placeholder="选择角色"
            />
          </Form.Item>
          <Form.Item label="备注" name="remark">
            <Input.TextArea maxLength={255} rows={3} showCount />
          </Form.Item>
          <Form.Item label="启用" name="enabled" valuePropName="checked">
            <Switch disabled={enableDisabled} />
          </Form.Item>
          <div className={pageCss['form-actions']}>
            {/* Form 的 disabled 会传导给内部按钮，取消要显式放行，否则锁定时无路可退 */}
            <Button disabled={false} onClick={() => navigate(detailPath)}>
              取消
            </Button>
            <Button htmlType="submit" loading={saving} type="primary">
              保存更改
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
