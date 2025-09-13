'use client';

import { useState } from 'react';
import { query } from '@/services/demo';

const nodeEnv = process.env.NODE_ENV;
const appEnv = process.env.APP_ENV;
console.log(`Page.nodeEnv----->：`, nodeEnv);
console.log(`Page.appEnv----->：`, appEnv);
const baseURL = process.env.NEXT_PUBLIC_API_URL!;
console.log(`Page.baseURL----->：`, baseURL);

export default function Button() {
  const [text, setText] = useState<string>('');
  const onQuery = async () => {
    console.log('query');
    const response: any = await query();
    setText(response.data as string);
  };
  return (
    <>
      <div onClick={onQuery}>点我</div>
      <span>{text}</span>
    </>
  );
}
