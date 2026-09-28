import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Alert, Button, Form, Input, Select, Skeleton } from 'antd';
import { RoleCode } from '@ai/constants/roles';
import {
  getRoles,
  getUser,
  updateUser,
  type AdminRole,
  type UserProfile,
} from '@/api/methods/rbac';
import { USER_STATUS_OPTIONS } from '@/constants/user';
import { useLiteDebounced } from '@/hooks';
import { isSuperAdmin, useAuthStore } from '@/stores/auth';
import pageCss from '@/styles/page.module.scss';
import { userFormSchema, type UserFormValues } from './schemas';
import { getFormFieldErrors } from '@/utils/form';

const STATUS_OPTIONS = USER_STATUS_OPTIONS.map(({ label, value }) => ({ label, value }));

export default function UserEditPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [form] = Form.useForm<UserFormValues>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isTargetSuperAdmin = Boolean(
    user?.roles.some((role) => role.code === RoleCode.SUPER_ADMIN),
  );
  // SUPER_ADMIN 的资料只有 SUPER_ADMIN 能改，角色绑定则谁都不能通过后台改（只能 bootstrap）
  const readOnly = isTargetSuperAdmin && !isSuperAdmin(currentUser);

  const roleOptions = useMemo(
    () =>
      roles
        .filter((role) => role.code !== RoleCode.SUPER_ADMIN && role.status === 'ENABLED')
        .map((role) => ({ label: role.name, value: Number(role.id) })),
    [roles],
  );

  useEffect(() => {
    let active = true;

    async function loadForm() {
      setLoading(true);
      const [userResult, rolesResult] = await Promise.allSettled([
        getUser(id),
        getRoles({ page: 1, pageSize: 100 }),
      ]);
      if (!active) return;

      if (userResult.status === 'fulfilled') {
        const result = userResult.value;
        setUser(result);
        form.setFieldsValue({
          full_name: result.full_name ?? '',
          nick_name: result.nick_name ?? '',
          user_name: result.user_name ?? '',
          bio: result.bio ?? '',
          status: result.status as UserFormValues['status'],
          roleIds: result.roles.map((role) => Number(role.id)),
        });
      }
      if (rolesResult.status === 'fulfilled') {
        setRoles(rolesResult.value.data);
      }
      setLoading(false);
    }

    loadForm().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [form, id]);

  const onSubmit = useLiteDebounced(async (values: UserFormValues) => {
    const parsed = userFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

    setSaving(true);
    try {
      const { roleIds, ...profile } = parsed.data;
      await updateUser(id, { ...profile, ...(isTargetSuperAdmin ? {} : { roleIds }) });
      void navigate(`/system/user/detail/${id}`);
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  });

  const onCancel = () => {
    void navigate(`/system/user/detail/${id}`);
  };

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>编辑用户</h1>
          <p>更新用户的资料、角色和账号状态。</p>
        </div>
      </section>
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {readOnly ? (
          <Alert
            showIcon
            type="warning"
            title="SUPER_ADMIN 用户只能由 SUPER_ADMIN 编辑"
            style={{ marginBottom: 16 }}
          />
        ) : null}
        <Form
          className={loading || !user ? pageCss.hidden : undefined}
          disabled={readOnly}
          form={form}
          layout="vertical"
          requiredMark="optional"
          onFinish={onSubmit}
        >
          <Form.Item label="姓名" name="full_name">
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item label="昵称" name="nick_name">
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item label="用户名" name="user_name">
            <Input maxLength={120} />
          </Form.Item>
          <Form.Item label="邮箱">
            <Input disabled value={user?.email ?? ''} />
          </Form.Item>
          <Form.Item label="简介" name="bio">
            <Input.TextArea maxLength={500} rows={3} showCount />
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择用户状态' }]}
          >
            <Select options={STATUS_OPTIONS} />
          </Form.Item>
          <Form.Item
            label="角色"
            name="roleIds"
            extra={isTargetSuperAdmin ? 'SUPER_ADMIN 的角色绑定只能通过 bootstrap 配置' : undefined}
          >
            <Select
              disabled={isTargetSuperAdmin}
              maxTagCount="responsive"
              mode="multiple"
              options={roleOptions}
              placeholder="选择用户角色"
            />
          </Form.Item>
          <div className={pageCss['form-actions']}>
            <Button disabled={false} onClick={onCancel}>
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
