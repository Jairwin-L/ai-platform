import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Avatar, Button, Descriptions, Skeleton, Space, Tag } from 'antd';
import { EditOutlined, SafetyCertificateOutlined, UserOutlined } from '@ant-design/icons';
import { getUser, type UserProfile } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import pageCss from '@/styles/page.module.scss';
import { formatDateTime } from '@/utils';
import { getDisplayName, renderStatusTag } from './columns';

export default function UserDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getUser(id)
      .then((result) => {
        if (active) setUser(result);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>用户详情</h1>
          <p>查看用户的资料、角色和账号状态。</p>
        </div>
        {user ? (
          <Link to={`/system/user/edit/${user.id}`}>
            <Button icon={<EditOutlined />} type="primary">
              编辑用户
            </Button>
          </Link>
        ) : null}
      </section>
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active avatar paragraph={{ rows: 8 }} /> : null}
        {!loading && user ? (
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
            <Descriptions.Item label="用户名">
              {user.user_name || EMPTY_PLACEHOLDER}
            </Descriptions.Item>
            <Descriptions.Item label="昵称">
              {user.nick_name || EMPTY_PLACEHOLDER}
            </Descriptions.Item>
            <Descriptions.Item label="邮箱">{user.email || EMPTY_PLACEHOLDER}</Descriptions.Item>
            <Descriptions.Item label="简介">{user.bio || EMPTY_PLACEHOLDER}</Descriptions.Item>
            <Descriptions.Item label="状态">{renderStatusTag(user.status)}</Descriptions.Item>
            <Descriptions.Item label="角色">
              {user.roles.length
                ? user.roles.map((role) => (
                    <Tag key={role.id} icon={<SafetyCertificateOutlined />}>
                      {role.name}
                    </Tag>
                  ))
                : EMPTY_PLACEHOLDER}
            </Descriptions.Item>
            <Descriptions.Item label="最近登录">
              {formatDateTime(user.last_login_at)}
            </Descriptions.Item>
            <Descriptions.Item label="注册时间">
              {formatDateTime(user.created_at)}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </section>
    </div>
  );
}
