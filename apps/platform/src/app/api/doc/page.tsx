import { notFound } from 'next/navigation';
import { ApiReferenceReact } from '@scalar/api-reference-react';
import { getApiDocs } from '@/lib/swagger';

import '@scalar/api-reference-react/style.css';

/**
 * Scalar 渲染的 API 参考文档页面。
 * - 开发环境读取 public/openapi.json，缺失时动态生成
 * - 生产环境通过 ENABLE_API_DOCS 环境变量控制是否暴露，默认隐藏
 */
export default async function ApiDocPage() {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd && process.env.ENABLE_API_DOCS !== 'true') {
    notFound();
  }

  const spec = await getApiDocs();

  return (
    <ApiReferenceReact
      configuration={{
        content: spec,
        theme: 'default',
        layout: 'modern',
      }}
    />
  );
}
