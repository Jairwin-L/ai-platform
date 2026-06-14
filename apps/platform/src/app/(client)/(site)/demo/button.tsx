'use client';

import { useState } from 'react';
import { query } from '@/services/demo';

export default function Button() {
  const [text, setText] = useState<string>('');
  const onQuery = async () => {
    const response = await query();
    setText(response.data);
  };
  return (
    <>
      <div onClick={onQuery}>点我</div>
      <span>{text}</span>
    </>
  );
}
