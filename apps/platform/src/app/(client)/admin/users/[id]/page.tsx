'use client';

import {
  ArrowLeftOutlined,
  EditOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Descriptions, Skeleton, Space, Tag } from 'antd';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getUserProfileById, type UserProfile } from '@/api/modules/users';
import styles from '../../resource-page.module.scss';

const statusLabels: Record<string, { color: string; label: string }> = {
  active: { color: 'green', label: '正常' },
  pending: { color: 'gold', label: '待激活' },
  restricted: { color: 'orange', label: '受限' },
  banned: { color: 'red', label: '已封禁' },
  inactive: { color: 'default', label: '已停用' },
};

function getDisplayName(user: UserProfile): string {
  return user.full_name || user.nick_name || user.user_name || user.email || '未命名用户';
}

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      setUser(await getUserProfileById(id));
    } catch {
      setUser(null);
      // 请求错误由 alova 全局提示处理。
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser().catch(() => undefined);
  }, [loadUser]);

  const status = user
    ? (statusLabels[user.status] ?? { color: 'default', label: user.status })
    : null;

  return (
    <main className={styles.page}>
      <section className={styles.heading}>
        <div>
          <Link href="/admin/users">
            <Button icon={<ArrowLeftOutlined />} type="text">
              返回用户列表
            </Button>
          </Link>
          <h1>
            <UserOutlined /> 用户详情
          </h1>
          <p>查看用户的资料、角色和账号状态。</p>
        </div>
        {user && (
          <Link href={`/admin/users/${user.id}/edit`}>
            <Button icon={<EditOutlined />} type="primary">
              编辑用户
            </Button>
          </Link>
        )}
      </section>
      <section className={styles.panel}>
        {loading && <Skeleton active avatar paragraph={{ rows: 8 }} />}
        {user && !loading && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="用户">
              <Space>
                <Avatar icon={<UserOutlined />} src={user.picture || undefined} />
                {getDisplayName(user)}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="用户 ID">
              <code>{user.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="用户名">{user.user_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="昵称">{user.nick_name || '—'}</Descriptions.Item>
            <Descriptions.Item label="邮箱">
              <MailOutlined /> {user.email || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="简介">{user.bio || '—'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={status?.color}>{status?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              {user.roles.length
                ? user.roles.map((role) => (
                    <Tag key={role.id} icon={<SafetyCertificateOutlined />}>
                      {role.name}
                    </Tag>
                  ))
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="最近登录">{formatDate(user.last_login_at)}</Descriptions.Item>
            <Descriptions.Item label="注册时间">{formatDate(user.created_at)}</Descriptions.Item>
          </Descriptions>
        )}
      </section>
    </main>
  );
}
