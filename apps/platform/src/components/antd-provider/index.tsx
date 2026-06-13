'use client';

import { type ReactNode } from 'react';
import { App, ConfigProvider } from 'antd';

export default function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 8,
          colorPrimary: '#1677ff',
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
