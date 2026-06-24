'use client';

import { type ReactNode, useEffect } from 'react';
import { App, ConfigProvider } from 'antd';
import type { AuthPayload } from '@/services/auth';
import { useAuthSessionStore } from '@/stores/auth-session';
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

function AuthSessionInitializer({ initialPayload }: { initialPayload: AuthPayload | null }) {
  const setPayload = useAuthSessionStore((state) => state.setPayload);

  useEffect(() => {
    setPayload(initialPayload);
  }, [initialPayload, setPayload]);

  return null;
}

export default function AntdProvider({
  children,
  initialAuthPayload,
}: {
  children: ReactNode;
  initialAuthPayload: AuthPayload | null;
}) {
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
        <AuthSessionInitializer initialPayload={initialAuthPayload} />
        {children}
      </App>
    </ConfigProvider>
  );
}
