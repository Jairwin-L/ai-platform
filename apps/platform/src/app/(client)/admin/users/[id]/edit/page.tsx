'use client';

import { ArrowLeftOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, Select, Skeleton } from 'antd';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getRoles, type AdminRole } from '@/services/admin';
import {
  getUserProfileById,
  updateUser,
  type UserProfile,
  type UserStatus,
} from '@/services/users';
import styles from '@/components/admin/admin-form-page.module.scss';

interface UserFormValues {
  bio?: string;
  full_name?: string;
  nick_name?: string;
  roleIds?: number[];
  status: UserStatus;
  user_name?: string;
}

const statusOptions: Array<{ label: string; value: UserStatus }> = [
  { label: '正常', value: 'active' },
  { label: '待激活', value: 'pending' },
  { label: '受限', value: 'restricted' },
  { label: '已封禁', value: 'banned' },
  { label: '已停用', value: 'inactive' },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '请求未能完成';
}

function getRoleIds(user: UserProfile): number[] {
  return user.roles.map((role) => role.id);
}

export default function EditUserPage() {
  const { message } = App.useApp();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form] = Form.useForm<UserFormValues>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadForm = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);
    const [userResult, rolesResult] = await Promise.allSettled([
      getUserProfileById(id),
      getRoles({ page: 1, pageSize: 100 }),
    ]);

    if (userResult.status === 'fulfilled') {
      const result = userResult.value;
      setUser(result);
      form.setFieldsValue({
        full_name: result.full_name ?? '',
        nick_name: result.nick_name ?? '',
        user_name: result.user_name ?? '',
        bio: result.bio ?? '',
        status: result.status as UserStatus,
        roleIds: getRoleIds(result),
      });
    } else {
      setError(getErrorMessage(userResult.reason));
    }

    if (rolesResult.status === 'fulfilled') {
      setRoles(rolesResult.value.data);
    } else if (userResult.status === 'fulfilled') {
      setError(`无法加载角色：${getErrorMessage(rolesResult.reason)}`);
    }

    setLoading(false);
  }, [form, id]);

  useEffect(() => {
    loadForm().catch(() => undefined);
  }, [loadForm]);

  async function onFinish(values: UserFormValues) {
    if (!id) {
      return;
    }

    setSaving(true);
    try {
      await updateUser(id, {
        full_name: values.full_name,
        nick_name: values.nick_name,
        user_name: values.user_name,
        bio: values.bio,
        status: values.status,
        roleIds: values.roleIds ?? [],
      });
      message.success('用户已更新');
      router.push(`/admin/users/${id}`);
    } catch (requestError) {
      message.error(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <Link href={`/admin/users/${id}`}>
          <Button icon={<ArrowLeftOutlined />} type="text">
            返回用户详情
          </Button>
        </Link>
        <h1>
          <UserOutlined /> 编辑用户
        </h1>
        <p>更新用户的资料、角色和账号状态。</p>
      </section>

      {error && (
        <Alert
          className={styles.alert}
          description={error}
          showIcon
          title="无法加载编辑表单"
          type="error"
        />
      )}

      <section className={styles.panel}>
        {loading && <Skeleton active paragraph={{ rows: 8 }} />}
        <Form
          className={loading || !user ? styles.hidden : undefined}
          form={form}
          layout="vertical"
          preserve={false}
          requiredMark="optional"
          onFinish={onFinish}
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
            <Input disabled value={user?.email ?? '—'} />
          </Form.Item>
          <Form.Item label="简介" name="bio">
            <Input.TextArea maxLength={500} rows={3} showCount />
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true, message: '请选择用户状态' }]}
          >
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item label="角色" name="roleIds">
            <Select
              maxTagCount="responsive"
              mode="multiple"
              options={roles.map((role) => ({ label: role.name, value: Number(role.id) }))}
              placeholder="选择用户角色"
            />
          </Form.Item>
          <div className={styles.actions}>
            <Link href={`/admin/users/${id}`}>
              <Button>取消</Button>
            </Link>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              保存更改
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
