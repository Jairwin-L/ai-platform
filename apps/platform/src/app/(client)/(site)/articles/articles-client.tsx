'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { TablePaginationConfig, TableProps } from 'antd';
import {
  type Article,
  type ArticleListData,
  deleteArticle,
  listArticles,
} from '@/services/articles';
import styles from './articles-client.module.scss';

const { Title, Text } = Typography;

const DEFAULT_PAGE_SIZE = 10;

interface ArticlesClientProps {
  initialData: ArticleListData;
  initialKeyword: string;
}

export default function ArticlesClient({ initialData, initialKeyword }: ArticlesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [articles, setArticles] = useState<Article[]>(initialData.data);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [page, setPage] = useState(initialData.page);
  const [pageSize, setPageSize] = useState(initialData.pageSize);
  const [total, setTotal] = useState(initialData.total);
  const [isLoading, setIsLoading] = useState(false);

  const fetchArticles = useCallback(
    async (nextPage: number, nextPageSize: number, nextKeyword: string) => {
      setIsLoading(true);
      try {
        const data = await listArticles({
          page: nextPage,
          pageSize: nextPageSize,
          keyword: nextKeyword,
        });

        setArticles(data.data);
        setPage(data.page);
        setPageSize(data.pageSize);
        setTotal(data.total);
      } catch (error) {
        console.error(`error----->：`, error);
        setArticles([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setPage(initialData.page);
    setPageSize(initialData.pageSize);
    setKeyword(initialKeyword);
    fetchArticles(initialData.page, initialData.pageSize, initialKeyword).then(() => undefined);
  }, [fetchArticles, initialData.page, initialData.pageSize, initialKeyword]);

  const refreshArticles = async () => {
    await fetchArticles(page, pageSize, keyword.trim());
  };

  const updateRoute = (nextPage: number, nextPageSize: number, nextKeyword: string) => {
    const search = new URLSearchParams();

    if (nextPage > 1) {
      search.set('page', String(nextPage));
    }

    if (nextPageSize !== DEFAULT_PAGE_SIZE) {
      search.set('pageSize', String(nextPageSize));
    }

    if (nextKeyword) {
      search.set('keyword', nextKeyword);
    }

    const queryString = search.toString();
    startTransition(() => {
      router.push(queryString ? `/articles?${queryString}` : '/articles');
    });
  };

  const onSearch = () => {
    updateRoute(1, pageSize, keyword.trim());
  };

  const onTableChange = (pagination: TablePaginationConfig) => {
    const nextPage = pagination.current ?? 1;
    const nextPageSize = pagination.pageSize ?? DEFAULT_PAGE_SIZE;
    updateRoute(nextPage, nextPageSize, keyword.trim());
  };

  const onDelete = async (article: Article) => {
    try {
      await deleteArticle(article.id);

      if (articles.length === 1 && page > 1) {
        updateRoute(page - 1, pageSize, keyword.trim());
        return;
      }

      await refreshArticles();
    } catch (error) {
      console.error(`error----->：`, error);
    }
  };

  const columns: TableProps<Article>['columns'] = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, article) => (
        <Space orientation="vertical" size={2}>
          <Text strong>{title}</Text>
          <Text type="secondary">{article.slug}</Text>
        </Space>
      ),
    },
    {
      title: '摘要',
      dataIndex: 'summary',
      key: 'summary',
      responsive: ['md'],
      render: (summary: string | null) => summary || <Text type="secondary">未填写</Text>,
    },
    {
      title: '状态',
      dataIndex: 'published',
      key: 'published',
      width: 100,
      render: (published: boolean) => (
        <Tag color={published ? 'green' : 'default'}>{published ? '已发布' : '草稿'}</Tag>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      responsive: ['lg'],
      render: (updatedAt: string) => new Date(updatedAt).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, article) => (
        <Space>
          <Button type="link" href={`/articles/${article.id}/edit`}>
            编辑
          </Button>
          <Popconfirm
            title="删除文章"
            description="删除后不可恢复，确认继续？"
            okText="删除"
            cancelText="取消"
            onConfirm={() => onDelete(article)}
          >
            <Button danger type="link">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <div className={styles.header}>
          <div>
            <Title level={2} className={styles.title}>
              文章管理
            </Title>
            <Text type="secondary">基于 PostgreSQL、Prisma、Zod 与 Ant Design 的文章 CRUD。</Text>
          </div>
          <Button type="primary" href="/articles/new">
            新增文章
          </Button>
        </div>
        <div className={styles.toolbar}>
          <Input.Search
            allowClear
            className={styles.search}
            placeholder="搜索标题、Slug 或摘要"
            value={keyword}
            enterButton="搜索"
            onChange={(event) => setKeyword(event.target.value)}
            onSearch={onSearch}
          />
        </div>

        <Table<Article>
          rowKey="id"
          columns={columns}
          dataSource={articles}
          loading={isPending || isLoading}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (value) => `共 ${value} 篇文章`,
          }}
          onChange={onTableChange}
        />
      </section>
    </main>
  );
}
