'use client';

import { useState } from 'react';
import { query } from '@/api/modules/demo';
import { useDebounced } from '@/hooks/use-debounced';

export default function Button() {
  const [text, setText] = useState<string>('');
  const onQuery = async () => {
    const data = await query();
    setText(data);
  };
  const debouncedQuery = useDebounced(onQuery, 300);
  return (
    <>
      <div onClick={debouncedQuery}>点我</div>
      <span>{text}</span>
    </>
  );
}
