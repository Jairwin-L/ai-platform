import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Skeleton } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UserAddOutlined } from '@ant-design/icons';
import { RoleCode } from '@ai/constants/roles';
import { createRbacUser, getRbacRoles } from '@/api/methods/rbac';
import FormItems, { type OptionItem } from '@/components/form-items';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { defaultValues, getFormItems } from './form-item-config';
import { createUserFormSchema, type CreateUserFormValues } from './schemas';

const USER_LIST_PATH = '/system/user';

export default function Page() {
  const navigate = useNavigate();
  const [form] = Form.useForm<CreateUserFormValues>();
  const [roleOptions, setRoleOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const formItems = useMemo(
    () =>
      getFormItems({
        isEditing: false,
        roleExtra: '分配角色等于授出该角色的全部权限，不能超出你自己拥有的权限',
        roleOptions,
      }),
    [roleOptions],
  );

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await getRbacRoles();
      // 超级管理员角色只能通过 bootstrap 分配，服务端也会拒绝
      setRoleOptions(
        (response.data ?? [])
          .filter((role) => role.enable && role.code !== RoleCode.SUPER_ADMIN)
          .map((role) => ({ label: role.name, value: role.id })),
      );
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles().catch(() => undefined);
  }, [loadRoles]);

  const onBackToUsers = () => {
    void navigate(USER_LIST_PATH);
  };

  const onFinish = async (values: CreateUserFormValues) => {
    // 字段规则已逐项校验过，这里再整体解析一次拿到 trim 后的值
    const parsed = createUserFormSchema.safeParse(values);
    if (!parsed.success) return;

    const { enabled, remark, ...rest } = parsed.data;
    setSaving(true);
    try {
      await createRbacUser({
        ...rest,
        remark: remark || null,
        status: enabled ? 'active' : 'inactive',
      });
      onBackToUsers();
    } catch {
      // 接口错误已由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  };

  if (loadFailed) return <Exception onClick={loadRoles} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBackToUsers}>
            返回用户列表
          </Button>
          <h1>
            <UserAddOutlined /> 新增用户
          </h1>
          <p>创建管理端系统用户并分配角色；系统用户只用账号登录管理端，与前台注册账号互不通用。</p>
        </div>
      </section>

      <section className={css.panel}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        <Form
          autoComplete="off"
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
            <Button onClick={onBackToUsers}>取消</Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              创建用户
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
