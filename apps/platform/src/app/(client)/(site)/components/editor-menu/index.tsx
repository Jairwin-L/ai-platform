'use client';

import { DownOutlined } from '@ant-design/icons';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { EDITOR_MENU_ITEMS } from '@/constants/editor';
import styles from '../ai-menu/index.module.scss';

const menuItems: MenuProps['items'] = EDITOR_MENU_ITEMS.map((item) => ({
  key: item.type,
  label: <Link href={item.href}>{item.label}</Link>,
}));

function getSelectedEditorType(pathname: string) {
  return EDITOR_MENU_ITEMS.find((item) => pathname === item.href)?.type;
}

export function EditorMenu() {
  const pathname = usePathname();
  const selectedEditorType = getSelectedEditorType(pathname);
  const isActive = pathname.startsWith('/editor');

  return (
    <Dropdown
      classNames={{ root: styles['menu-panel'] }}
      menu={{
        items: menuItems,
        selectable: true,
        selectedKeys: selectedEditorType ? [selectedEditorType] : [],
      }}
      placement="bottom"
      trigger={['click']}
    >
      <button className={styles.trigger} data-active={isActive} type="button">
        <span>Editor</span>
        <DownOutlined className={styles.chevron} />
      </button>
    </Dropdown>
  );
}
