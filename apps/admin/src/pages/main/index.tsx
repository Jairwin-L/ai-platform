import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Card, Col, Row, Skeleton, Statistic } from 'antd';
import {
  RobotOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { getPermissions, getRoles, getUsers } from '@/api/methods/rbac';
import { getAiProviderOptions } from '@/api/methods/settings';
import pageCss from '@/styles/page.module.scss';

interface OverviewData {
  userCount: number;
  roleCount: number;
  permissionCount: number;
  providerCount: number;
}

const OVERVIEW_CARDS: Array<{
  key: keyof OverviewData;
  title: string;
  description: string;
  icon: ReactNode;
  link: string;
  action: string;
}> = [
  {
    key: 'userCount',
    title: '用户',
    description: '查看账号状态、资料与角色分配。',
    icon: <UserOutlined />,
    link: '/system/user',
    action: '管理用户',
  },
  {
    key: 'roleCount',
    title: '角色',
    description: '定义可分配的职责集合与授权范围。',
    icon: <TeamOutlined />,
    link: '/system/role',
    action: '管理角色',
  },
  {
    key: 'permissionCount',
    title: '权限',
    description: '维护页面、模块和操作级别的访问边界。',
    icon: <SafetyCertificateOutlined />,
    link: '/system/permission',
    action: '管理权限',
  },
  {
    key: 'providerCount',
    title: 'AI Provider',
    description: '配置用户 AI 密钥页可选择的 Provider。',
    icon: <RobotOutlined />,
    link: '/system/ai-provider',
    action: '管理 Provider',
  },
];

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      // 各统计互不依赖，单项失败按 0 展示，不影响其余卡片
      const [usersResult, rolesResult, permissionsResult, providersResult] =
        await Promise.allSettled([
          getUsers({ page: 1, pageSize: 1 }),
          getRoles({ page: 1, pageSize: 1 }),
          getPermissions({ page: 1, pageSize: 1 }),
          getAiProviderOptions(),
        ]);
      if (!active) return;

      setData({
        userCount: usersResult.status === 'fulfilled' ? usersResult.value.total : 0,
        roleCount: rolesResult.status === 'fulfilled' ? rolesResult.value.total : 0,
        permissionCount:
          permissionsResult.status === 'fulfilled' ? permissionsResult.value.total : 0,
        providerCount: providersResult.status === 'fulfilled' ? providersResult.value.length : 0,
      });
    }

    loadOverview().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>工作台</h1>
          <p>集中维护用户、角色、权限与 AI 相关配置。</p>
        </div>
      </section>
      <Row gutter={[20, 20]}>
        {OVERVIEW_CARDS.map((card) => (
          <Col key={card.key} lg={6} md={12} xs={24}>
            <Card variant="borderless">
              {data ? (
                <Statistic prefix={card.icon} title={card.title} value={data[card.key]} />
              ) : (
                <Skeleton active paragraph={{ rows: 1 }} />
              )}
              <p className={pageCss.muted}>{card.description}</p>
              <Link to={card.link}>
                <Button>{card.action}</Button>
              </Link>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
