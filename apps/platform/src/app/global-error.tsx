'use client';
import { AutoCenter } from '@/components';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <AutoCenter className="flex-col items-center">
					<h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
            出错了
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            很抱歉，应用运行时出现了问题。
          </p>
					<p>{error.message}</p>
					<p>{error.digest}</p>
          <button className="cursor-pointer px-6 py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95" onClick={() => reset()}>重试</button>
        </AutoCenter>
      </body>
    </html>
  );
}
