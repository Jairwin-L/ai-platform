'use client';

import { type ReactNode, useEffect } from 'react';
import { App, ConfigProvider } from 'antd';
import { setAlovaMessageApi } from '@/utils/alova';

function AlovaMessageBridge() {
  const { message } = App.useApp();

  useEffect(() => {
    setAlovaMessageApi(message);

    return () => {
      setAlovaMessageApi(null);
    };
  }, [message]);

  return null;
}

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
      <App>
        <AlovaMessageBridge />
        {children}
      </App>
    </ConfigProvider>
  );
}
