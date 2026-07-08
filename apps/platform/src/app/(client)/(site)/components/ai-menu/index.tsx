'use client';

import { DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './index.module.scss';

const menuItems: MenuProps['items'] = [
  {
    key: 'CHAT',
    label: <Link href="/ai/chat">Chat</Link>,
  },
];

export function AiMenu() {
  const pathname = usePathname();
  const isActive = pathname.startsWith('/ai');

  return (
    <Dropdown
      classNames={{ root: styles['menu-panel'] }}
      menu={{
        items: menuItems,
        selectable: true,
        selectedKeys: pathname.startsWith('/ai/chat') ? ['CHAT'] : [],
      }}
      placement="bottom"
      trigger={['click']}
    >
      <button className={styles.trigger} data-active={isActive} type="button">
        <span>AI</span>
        <DownOutlined className={styles.chevron} />
      </button>
    </Dropdown>
  );
}
