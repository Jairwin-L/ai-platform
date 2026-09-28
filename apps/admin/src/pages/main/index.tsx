import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Card, Col, Empty, Row, Skeleton, Statistic } from 'antd';
import {
  RobotOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { getPlatformUsers, getRbacRolePage, getRbacUsers } from '@/api/methods/rbac';
import { getAiProviderOptions } from '@/api/methods/settings';
import { usePermission } from '@/hooks';
import pageCss from '@/styles/page.module.scss';

const { AI_PROVIDER, PLATFORM_USER, ROLE, USER } = PERMISSION_CODE.OPERATION;

interface OverviewCard {
  key: string;
  title: string;
  description: string;
  icon: ReactNode;
  link: string;
  action: string;
  /** 查看该卡片需要的权限码，与对应列表接口的服务端鉴权一致 */
  permission: string;
  load: () => Promise<number>;
}

const OVERVIEW_CARDS: OverviewCard[] = [
  {
    key: 'platformUsers',
    title: '平台用户',
    description: '查看前台注册用户，处理限制、停用与封禁。',
    icon: <UserOutlined />,
    link: '/business/platform-user',
    action: '管理平台用户',
    permission: PLATFORM_USER.READ,
    load: async () => (await getPlatformUsers({ page: 1, pageSize: 1 })).total,
  },
  {
    key: 'systemUsers',
    title: '系统用户',
    description: '维护管理端账号、状态与角色分配。',
    icon: <TeamOutlined />,
    link: '/system/user',
    action: '管理系统用户',
    permission: USER.READ,
    load: async () => (await getRbacUsers({ page: 1, pageSize: 1 })).total,
  },
  {
    key: 'roles',
    title: '角色',
    description: '定义可分配的职责集合与菜单、按钮授权范围。',
    icon: <SafetyCertificateOutlined />,
    link: '/system/role',
    action: '管理角色',
    permission: ROLE.READ,
    load: async () => (await getRbacRolePage({ page: 1, pageSize: 1 })).total,
  },
  {
    key: 'providers',
    title: 'AI Provider',
    description: '配置用户 AI 密钥页可选择的 Provider。',
    icon: <RobotOutlined />,
    link: '/system/ai-provider',
    action: '管理 Provider',
    permission: AI_PROVIDER.READ,
    load: async () => (await getAiProviderOptions()).length,
  },
];

export default function DashboardPage() {
  const can = usePermission();
  const cards = useMemo(() => OVERVIEW_CARDS.filter((card) => can(card.permission)), [can]);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    let active = true;

    async function loadOverview() {
      // 各统计互不依赖，单项失败按 0 展示，不影响其余卡片
      const results = await Promise.allSettled(cards.map((card) => card.load()));
      if (!active) return;

      setCounts(
        Object.fromEntries(
          cards.map((card, index) => {
            const result = results[index];
            return [card.key, result.status === 'fulfilled' ? result.value : 0];
          }),
        ),
      );
    }

    loadOverview().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [cards]);

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>工作台</h1>
          <p>集中维护平台用户、系统用户、角色权限与 AI 相关配置。</p>
        </div>
      </section>
      {cards.length === 0 ? (
        <Empty description="当前账号暂无可访问的管理模块，请联系超级管理员分配权限" />
      ) : (
        <Row gutter={[20, 20]}>
          {cards.map((card) => (
            <Col key={card.key} lg={6} md={12} xs={24}>
              <Card variant="borderless">
                {counts ? (
                  <Statistic prefix={card.icon} title={card.title} value={counts[card.key] ?? 0} />
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
      )}
    </div>
  );
}
