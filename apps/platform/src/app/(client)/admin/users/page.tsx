'use client';

import {
  CheckCircleFilled,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Alert, App, Avatar, Button, Card, Descriptions, Skeleton, Tag } from 'antd';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '@/services/auth';
import { getUserProfileById, type UserProfile } from '@/services/users';
import styles from '../resource-page.module.scss';
import userStyles from './page.module.scss';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '无法读取当前会话';
}

function getDisplayName(user: UserProfile): string {
  return user.full_name || user.nick_name || user.user_name || user.email || '当前用户';
}

export default function UsersPage() {
  const { message } = App.useApp();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const session = await getCurrentUser();
      const profile = await getUserProfileById(session.user.id);
      setUser(profile);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  let profileContent: ReactNode;
  if (loading) {
    profileContent = <Skeleton active avatar paragraph={{ rows: 6 }} />;
  } else if (user) {
    profileContent = (
      <div className={userStyles.grid}>
        <section className={userStyles.profile}>
          <Avatar
            className={userStyles.avatar}
            size={84}
            src={user.picture || undefined}
            icon={<UserOutlined />}
          />
          <h2>{getDisplayName(user)}</h2>
          <p>{user.email || '未提供邮箱'}</p>
          <div className={userStyles.tags}>
            <Tag color={user.status === 'active' ? 'green' : 'default'}>{user.status}</Tag>
            {user.email_verified && (
              <Tag icon={<CheckCircleFilled />} color="blue">
                邮箱已验证
              </Tag>
            )}
          </div>
        </section>
        <section>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="用户 ID">
              <code>{user.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="用户名">{user.user_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="昵称">{user.nick_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="邮箱">
              <MailOutlined /> {user.email || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="简介">{user.bio || '—'}</Descriptions.Item>
            <Descriptions.Item label="角色">
              {user.roles.length
                ? user.roles.map((role) => (
                    <Tag key={role.id} icon={<SafetyCertificateOutlined />}>
                      {role.name}
                    </Tag>
                  ))
                : '—'}
            </Descriptions.Item>
          </Descriptions>
        </section>
      </div>
    );
  } else {
    profileContent = <div className={userStyles.empty}>登录后可在这里查看当前用户资料。</div>;
  }

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <h1>
            <UserOutlined /> 当前用户
          </h1>
          <p>复用现有会话与用户详情接口展示当前管理员资料，不额外创建用户管理接口。</p>
        </div>
        <Button
          onClick={async () => {
            await loadUser();
          }}
        >
          刷新资料
        </Button>
      </section>

      {error && (
        <Alert
          className={styles.alert}
          description={error}
          title="当前会话不可用"
          showIcon
          type="warning"
          action={
            <Button size="small" onClick={() => message.info('请先登录后再查看用户资料')}>
              了解原因
            </Button>
          }
        />
      )}

      <Card className={userStyles.card} loading={loading} variant="borderless">
        {profileContent}
      </Card>
    </main>
  );
}
