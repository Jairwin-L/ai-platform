'use client';

import {
  LockOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Button, Card, Col, Row, Skeleton, Statistic, Tag } from 'antd';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePermission } from '@/hooks/use-permission';
import { getPermissions, getRoles } from '@/services/admin';
import styles from './page.module.scss';

interface OverviewData {
  permissionCount: number;
  roleCount: number;
}

const initialData: OverviewData = { permissionCount: 0, roleCount: 0 };

export default function AdminPage() {
  const [data, setData] = useState<OverviewData>(initialData);
  const [loading, setLoading] = useState(true);
  const { isReady, user } = usePermission();
  const currentUserStatus = user ? '已验证' : '查看会话';

  useEffect(() => {
    async function loadOverview() {
      const results = await Promise.allSettled([
        getRoles({ page: 1, pageSize: 1 }),
        getPermissions({ page: 1, pageSize: 1 }),
      ]);
      const [rolesResult, permissionsResult] = results;

      setData({
        roleCount: rolesResult.status === 'fulfilled' ? rolesResult.value.total : 0,
        permissionCount:
          permissionsResult.status === 'fulfilled' ? permissionsResult.value.total : 0,
      });
      setLoading(false);
    }

    loadOverview();
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.intro}>
        <div>
          <Tag color="blue">ADMIN</Tag>
          <h1>访问控制</h1>
          <p>集中维护项目中的角色和权限。所有数据均来自当前项目的现有接口。</p>
        </div>
      </section>

      <Row gutter={[20, 20]}>
        <Col lg={12} md={12} xs={24}>
          <Card className={styles.metric} variant="borderless">
            <Statistic
              prefix={<TeamOutlined />}
              title="角色"
              value={loading ? undefined : data.roleCount}
              valueRender={() =>
                loading ? <Skeleton.Input active size="small" /> : data.roleCount
              }
            />
            <p>定义可分配的职责集合与授权范围。</p>
            <Link href="/admin/roles">
              <Button type="primary">管理角色</Button>
            </Link>
          </Card>
        </Col>
        <Col lg={12} md={12} xs={24}>
          <Card className={styles.metric} variant="borderless">
            <Statistic
              prefix={<SafetyCertificateOutlined />}
              title="权限"
              value={loading ? undefined : data.permissionCount}
              valueRender={() =>
                loading ? <Skeleton.Input active size="small" /> : data.permissionCount
              }
            />
            <p>维护页面、模块和操作级别的访问边界。</p>
            <Link href="/admin/permissions">
              <Button icon={<LockOutlined />}>管理权限</Button>
            </Link>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} className={styles['secondary-row']}>
        <Col lg={12} md={12} xs={24}>
          <Card className={styles.metric} variant="borderless">
            <Statistic
              prefix={<UserOutlined />}
              title="当前用户"
              value={isReady ? currentUserStatus : undefined}
              valueRender={() =>
                isReady ? currentUserStatus : <Skeleton.Input active size="small" />
              }
            />
            <p />
            <Link href="/admin/users">
              <Button>查看用户</Button>
            </Link>
          </Card>
        </Col>
        <Col lg={12} md={12} xs={24}>
          <Card className={styles.metric} variant="borderless">
            <Statistic prefix={<SettingOutlined />} title="系统设置" value="已接入" />
            <p>通过安全白名单字段持久化展示和访问策略，不会暴露生产配置。</p>
            <Link href="/admin/settings">
              <Button>打开设置</Button>
            </Link>
          </Card>
        </Col>
      </Row>
    </main>
  );
}
