import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import 'dayjs/locale/zh-cn';
import { createAdminRouter } from './routes';

/**
 * antd 的浮层默认挂到 body，表格横向滚动时下拉会脱离容器，
 * 这里把选择器/时间选择器的浮层挂到内容区，跟随滚动。
 */
function getPopupContainer(node?: HTMLElement): HTMLElement {
  const popupContainer = document.querySelector<HTMLElement>('.popup-container');
  if (
    node &&
    (node.className.includes('ant-select-selector') || node.className.includes('ant-picker'))
  ) {
    return popupContainer || document.body;
  }
  return document.body;
}

export default function App() {
  // 路由表是静态的，只建一次
  const [router] = useState(createAdminRouter);

  return (
    <ConfigProvider locale={zhCN} getPopupContainer={getPopupContainer}>
      <AntdApp>
        <RouterProvider router={router} />
      </AntdApp>
    </ConfigProvider>
  );
}
