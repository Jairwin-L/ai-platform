'use client';

import { useState } from 'react';
import { query } from '@/api/modules/demo';

export default function Button() {
  const [text, setText] = useState<string>('');
  const onQuery = async () => {
    const data = await query();
    setText(data);
  };
  return (
    <>
      <div onClick={onQuery}>点我</div>
      <span>{text}</span>
    </>
  );
}
