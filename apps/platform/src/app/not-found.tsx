'use client';
import { AutoCenter } from '@/components';
import { redirect } from 'next/navigation';

export default function NotFound() {
  const onGoBack = () => {
    redirect('/');
  };
  return (
    <AutoCenter className="flex-col">
      <p className="mt-4 mb-4 text-lg text-gray-600 dark:text-gray-400">
        抱歉，你访问的页面不存在。
      </p>
      <button
        className="cursor-pointer px-6 py-2 rounded-2xl bg-linear-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95"
        onClick={onGoBack}
      >
        返回主页
      </button>
    </AutoCenter>
  );
}
