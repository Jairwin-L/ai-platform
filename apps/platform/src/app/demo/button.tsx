'use client';

import { useState } from 'react';
import { query } from '@/services/demo';

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
