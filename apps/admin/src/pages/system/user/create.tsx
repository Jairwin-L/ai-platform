import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Input, Select, Skeleton, Switch } from 'antd';
import { RoleCode } from '@ai/constants/roles';
import { createRbacUser, getRbacRoles } from '@/api/methods/rbac';
import { useLiteDebounced } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { getFormFieldErrors } from '@/utils/form';
import { createUserFormSchema, type CreateUserFormValues } from './schemas';

const LIST_PATH = '/system/user';

const DEFAULT_VALUES: CreateUserFormValues = {
  username: '',
  account: '',
  password: '',
  roleIds: [],
  remark: '',
  enabled: true,
};

export default function SystemUserCreatePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateUserFormValues>();
  const [roleOptions, setRoleOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRbacRoles()
      .then((roles) =>
        // 超级管理员角色只能通过 bootstrap 分配，服务端也会拒绝
        setRoleOptions(
          roles
            .filter((role) => role.enable && role.code !== RoleCode.SUPER_ADMIN)
            .map((role) => ({ label: role.name, value: role.id })),
        ),
      )
      .catch(() => setRoleOptions([]))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = useLiteDebounced(async (values: CreateUserFormValues) => {
    const parsed = createUserFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

    const { enabled, remark, ...rest } = parsed.data;
    setSaving(true);
    try {
      await createRbacUser({
        ...rest,
        remark: remark || null,
        status: enabled ? 'active' : 'inactive',
      });
      void navigate(LIST_PATH);
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  });

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>新增用户</h1>
          <p>创建管理端系统用户并分配角色；系统用户只用账号登录管理端，与前台注册账号互不通用。</p>
        </div>
      </section>
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        <Form
          autoComplete="off"
          className={loading ? pageCss.hidden : undefined}
          form={form}
          initialValues={DEFAULT_VALUES}
          layout="vertical"
          requiredMark="optional"
          onFinish={onSubmit}
        >
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, whitespace: true, message: '请输入用户名' }]}
          >
            <Input maxLength={100} placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item
            label="账号"
            name="account"
            rules={[{ required: true, whitespace: true, message: '请输入账号' }]}
            extra="用于登录管理端，创建后不建议修改"
          >
            <Input autoComplete="off" maxLength={100} placeholder="字母、数字、_ . @ -" />
          </Form.Item>
          <Form.Item
            label="初始密码"
            name="password"
            rules={[{ required: true, message: '请输入初始密码' }]}
          >
            <Input.Password autoComplete="new-password" maxLength={12} placeholder="至少 6 位" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="roleIds"
            rules={[{ required: true, message: '请至少选择一个角色' }]}
            extra="分配角色等于授出该角色的全部权限，不能超出你自己拥有的权限"
          >
            <Select
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
            <Switch />
          </Form.Item>
          <div className={pageCss['form-actions']}>
            <Button onClick={() => navigate(LIST_PATH)}>取消</Button>
            <Button htmlType="submit" loading={saving} type="primary">
              创建用户
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
