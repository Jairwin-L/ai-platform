import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button, Descriptions, Skeleton, Tag } from 'antd';
import { EditOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { getRbacUser, type RbacUser } from '@/api/methods/rbac';
import { EMPTY_PLACEHOLDER } from '@/constants/biz';
import { usePermission } from '@/hooks';
import pageCss from '@/styles/page.module.scss';
import { formatDateTime } from '@/utils';
import { getDisplayName, renderStatusTag } from './columns';

export default function SystemUserDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const can = usePermission();
  const [user, setUser] = useState<RbacUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getRbacUser(id)
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
          <p>查看系统用户的资料、角色和账号状态。</p>
        </div>
        {user && can(PERMISSION_CODE.OPERATION.USER.EDIT) ? (
          <Link to={`/system/user/edit/${user.id}`}>
            <Button icon={<EditOutlined />} type="primary">
              编辑用户
            </Button>
          </Link>
        ) : null}
      </section>
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {!loading && user ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="用户">{getDisplayName(user)}</Descriptions.Item>
            <Descriptions.Item label="账号">{user.account}</Descriptions.Item>
            <Descriptions.Item label="用户 ID">
              <code>{user.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="昵称">{user.nickname || EMPTY_PLACEHOLDER}</Descriptions.Item>
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
            <Descriptions.Item label="备注">{user.remark || EMPTY_PLACEHOLDER}</Descriptions.Item>
            <Descriptions.Item label="最近登录">
              {formatDateTime(user.lastLoginAt)}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">{formatDateTime(user.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="更新时间">{formatDateTime(user.updatedAt)}</Descriptions.Item>
          </Descriptions>
        ) : null}
      </section>
    </div>
  );
}
