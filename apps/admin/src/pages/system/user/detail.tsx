import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Avatar, Button, Descriptions, Skeleton, Space, Tag, Typography } from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { getRbacUser, type RbacUser } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import { usePermission } from '@/hooks';
import { isAdminRole, useAuthStore } from '@/stores/auth';
import { formatDateTime } from '@/utils/date';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { getDisplayName, isBootstrapAdmin, renderStatusBadge } from './columns';

const USER_LIST_PATH = '/system/user';

export default function Page() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const can = usePermission();
  const currentUser = useAuthStore((state) => state.currentUser);
  const [user, setUser] = useState<RbacUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  // 超管账号只有超管自己能改，与服务端 UsersService 的口径一致
  const lockedForOperator =
    Boolean(user && isBootstrapAdmin(user)) && !isAdminRole(currentUser?.roles);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      setUser(await getRbacUser(id));
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser().catch(() => undefined);
  }, [loadUser]);

  const onBackToUsers = () => {
    void navigate(USER_LIST_PATH);
  };

  const onEdit = () => {
    void navigate(`/system/user/edit/${id}`);
  };

  if (loadFailed) return <Exception onClick={loadUser} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBackToUsers}>
            返回用户列表
          </Button>
          <h1>
            <UserOutlined /> 用户详情
          </h1>
          <p>查看系统用户的资料、角色分配与账号状态。</p>
        </div>
        {user && can(PERMISSION_CODE.OPERATION.USER.EDIT) ? (
          <Button
            disabled={lockedForOperator}
            icon={<EditOutlined />}
            type="primary"
            onClick={onEdit}
          >
            编辑用户
          </Button>
        ) : null}
      </section>

      <section className={css.panel}>
        {loading ? <Skeleton active avatar paragraph={{ rows: 6 }} /> : null}
        {!loading && user ? (
          <>
            <Space align="center" size={16} style={{ marginBottom: 24 }}>
              <Avatar icon={<UserOutlined />} size={64} src={user.avatar || undefined} />
              <Space orientation="vertical" size={4}>
                <Typography.Title level={4} style={{ margin: 0 }}>
                  {getDisplayName(user)}
                </Typography.Title>
                <Space size={8}>
                  {renderStatusBadge(user.status)}
                  <span className={css.muted}>
                    <UserOutlined /> {user.account}
                  </span>
                </Space>
              </Space>
            </Space>
            <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="small">
              <Descriptions.Item label="用户 ID">
                <code className={css.code}>{user.id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="登录账号">{user.account}</Descriptions.Item>
              <Descriptions.Item label="用户名">
                {user.username || EMPTY_PLACEHOLDER}
              </Descriptions.Item>
              <Descriptions.Item label="昵称">
                {user.nickname || EMPTY_PLACEHOLDER}
              </Descriptions.Item>
              <Descriptions.Item label="角色" span={2}>
                {user.roles.length ? (
                  <Space size={[4, 4]} wrap>
                    {user.roles.map((role) => (
                      <Tag key={role.id} icon={<SafetyCertificateOutlined />}>
                        {role.name}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  EMPTY_PLACEHOLDER
                )}
              </Descriptions.Item>
              <Descriptions.Item label="最近登录">
                {formatDateTime(user.lastLoginAt)}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDateTime(user.createdAt)}
              </Descriptions.Item>
              <Descriptions.Item label="更新时间">
                {formatDateTime(user.updatedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>
                {user.remark || EMPTY_PLACEHOLDER}
              </Descriptions.Item>
            </Descriptions>
          </>
        ) : null}
        {!loading && !user ? <div className={css.empty}>用户不存在</div> : null}
      </section>
    </main>
  );
}
