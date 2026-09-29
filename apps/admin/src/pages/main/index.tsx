import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Card, Col, Empty, Row, Statistic } from 'antd';
import {
  ApiOutlined,
  MenuOutlined,
  RightOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import { getPlatformUsers, getRbacRolePage, getRbacUsers } from '@/api/methods/rbac';
import { getAiProviderOptions } from '@/api/methods/settings';
import { usePermission } from '@/hooks';
import css from './index.module.scss';

const { AI_PROVIDER, PERMISSION, PLATFORM_USER, ROLE, SETTINGS, THIRD_PARTY_SERVICE, USER } =
  PERMISSION_CODE.OPERATION;

interface OverviewMetric {
  key: string;
  title: string;
  description: string;
  /** 查看该统计需要的权限码，与对应列表接口的服务端鉴权一致 */
  permission: string;
  load: () => Promise<number>;
}

interface Shortcut {
  title: string;
  description: string;
  path: string;
  icon: ReactNode;
  permission: string;
}

const METRICS: OverviewMetric[] = [
  {
    key: 'platformUsers',
    title: '平台用户',
    description: '前台注册的用户账号',
    permission: PLATFORM_USER.READ,
    load: async () => (await getPlatformUsers({ page: 1, pageSize: 1 })).data?.total ?? 0,
  },
  {
    key: 'systemUsers',
    title: '系统用户',
    description: '可登录管理端的账号',
    permission: USER.READ,
    load: async () => (await getRbacUsers({ page: 1, pageSize: 1 })).data?.total ?? 0,
  },
  {
    key: 'roles',
    title: '角色',
    description: '可分配的职责与授权集合',
    permission: ROLE.READ,
    load: async () => (await getRbacRolePage({ page: 1, pageSize: 1 })).data?.total ?? 0,
  },
  {
    key: 'providers',
    title: 'AI Provider',
    description: '用户密钥页可选的 Provider',
    permission: AI_PROVIDER.READ,
    load: async () => (await getAiProviderOptions()).data?.length ?? 0,
  },
];

// 按「业务 → 系统 → 配置」的使用频率排序，无权限的入口直接隐藏
const SHORTCUTS: Shortcut[] = [
  {
    title: '平台用户',
    description: '限制、停用或封禁前台账号',
    path: '/business/platform-user',
    icon: <UserOutlined />,
    permission: PLATFORM_USER.READ,
  },
  {
    title: '用户管理',
    description: '维护管理端系统账号',
    path: '/system/user',
    icon: <TeamOutlined />,
    permission: USER.READ,
  },
  {
    title: '角色管理',
    description: '分配菜单与按钮权限',
    path: '/system/role',
    icon: <SafetyCertificateOutlined />,
    permission: ROLE.READ,
  },
  {
    title: '菜单管理',
    description: '维护侧边栏与权限资源',
    path: '/system/menu',
    icon: <MenuOutlined />,
    permission: PERMISSION.READ,
  },
  {
    title: '基础配置',
    description: '站点展示与访问策略',
    path: '/system/settings',
    icon: <ToolOutlined />,
    permission: SETTINGS.READ,
  },
  {
    title: 'AI Provider',
    description: '配置可选的 AI Provider',
    path: '/system/ai-provider',
    icon: <RobotOutlined />,
    permission: AI_PROVIDER.READ,
  },
  {
    title: '第三方服务',
    description: '配置可选的第三方服务',
    path: '/system/third-party-service',
    icon: <ApiOutlined />,
    permission: THIRD_PARTY_SERVICE.READ,
  },
];

export default function Page() {
  const navigate = useNavigate();
  const can = usePermission();
  const metrics = useMemo(() => METRICS.filter((metric) => can(metric.permission)), [can]);
  const visibleShortcuts = SHORTCUTS.filter((item) => can(item.permission));
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // 没有权限的统计直接不请求，否则普通系统用户每次进工作台都会弹一串 403
    async function loadOverview() {
      const results = await Promise.allSettled(metrics.map((metric) => metric.load()));
      if (!active) return;

      // 各统计互不依赖，单项失败按 0 展示，不影响其余卡片
      setCounts(
        Object.fromEntries(
          metrics.map((metric, index) => {
            const result = results[index];
            return [metric.key, result.status === 'fulfilled' ? result.value : 0];
          }),
        ),
      );
      setLoading(false);
    }

    loadOverview().catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [metrics]);

  const onNavigate = (path: string) => {
    void navigate(path);
  };

  return (
    <div className={css.dashboard}>
      <section className={css.welcome}>
        <div>
          <p className={css.eyebrow}>{dayjs().locale('zh-cn').format('YYYY年M月D日 dddd')}</p>
          <h2>欢迎回来</h2>
        </div>
      </section>

      {metrics.length ? (
        <Row gutter={[16, 16]}>
          {metrics.map((metric) => (
            <Col key={metric.key} lg={6} sm={12} xs={24}>
              <Card className={css.metric} variant="borderless">
                <Statistic loading={loading} title={metric.title} value={counts[metric.key] ?? 0} />
                <p>{metric.description}</p>
              </Card>
            </Col>
          ))}
        </Row>
      ) : null}

      <section className={css.shortcuts}>
        <h3 className={css['section-title']}>常用功能</h3>
        {visibleShortcuts.length ? (
          <div className={css.grid}>
            {visibleShortcuts.map((item) => (
              <button
                key={item.path}
                type="button"
                className={css['shortcut-item']}
                onClick={() => onNavigate(item.path)}
              >
                <span className={css.icon}>{item.icon}</span>
                <span className={css.text}>
                  <span className={css.label}>{item.title}</span>
                  <span className={css.description}>{item.description}</span>
                </span>
                <RightOutlined className={css.arrow} />
              </button>
            ))}
          </div>
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无可用功能，请联系超级管理员分配权限"
          />
        )}
      </section>
    </div>
  );
}
