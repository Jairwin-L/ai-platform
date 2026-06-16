'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import {
  type Article,
  type ArticleListData,
  deleteArticle,
  listArticles,
} from '@/services/articles';
import styles from './articles.module.scss';

const { Title, Text } = Typography;

const DEFAULT_LIMIT = 10;

interface ArticlesClientProps {
  initialData: ArticleListData;
  initialKeyword: string;
}

export default function ArticlesClient({ initialData, initialKeyword }: ArticlesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [articles, setArticles] = useState<Article[]>(initialData.data);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [cursor, setCursor] = useState<string | null>(initialData.pagination.nextCursor);
  const [limit, setLimit] = useState(initialData.pagination.limit);
  const [hasMore, setHasMore] = useState(initialData.pagination.hasMore);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(false);

  const refreshArticles = useCallback(
    async (nextKeyword: string) => {
      if (requestRef.current) {
        return;
      }

      requestRef.current = true;
      setIsRefreshing(true);

      try {
        const data = await listArticles({
          limit,
          keyword: nextKeyword,
        });

        setArticles(data.data);
        setCursor(data.pagination.nextCursor);
        setLimit(data.pagination.limit);
        setHasMore(data.pagination.hasMore);
      } catch (error) {
        console.error(`error----->：`, error);
        setArticles([]);
        setCursor(null);
        setHasMore(false);
      } finally {
        setIsRefreshing(false);
        requestRef.current = false;
      }
    },
    [limit],
  );

  const fetchMoreArticles = useCallback(async () => {
    if (!hasMore || !cursor || requestRef.current) {
      return;
    }

    requestRef.current = true;
    setIsLoadingMore(true);

    try {
      const data = await listArticles({
        cursor,
        limit,
        keyword: keyword.trim(),
      });

      setArticles((prevArticles) => [...prevArticles, ...data.data]);
      setCursor(data.pagination.nextCursor);
      setLimit(data.pagination.limit);
      setHasMore(data.pagination.hasMore);
    } catch (error) {
      console.error(`error----->：`, error);
    } finally {
      setIsLoadingMore(false);
      requestRef.current = false;
    }
  }, [cursor, hasMore, keyword, limit]);

  const updateRoute = (nextKeyword: string) => {
    const search = new URLSearchParams();

    if (limit !== DEFAULT_LIMIT) {
      search.set('limit', String(limit));
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
    updateRoute(keyword.trim());
  };

  const onDelete = async (article: Article) => {
    try {
      await deleteArticle(article.id);
      await refreshArticles(keyword.trim());
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
  useEffect(() => {
    const loader = loaderRef.current;

    if (!loader) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchMoreArticles().catch((error: unknown) => {
            console.error(`error----->：`, error);
          });
        }
      },
      { rootMargin: '100px' },
    );

    observer.observe(loader);

    return () => {
      observer.unobserve(loader);
    };
  }, [fetchMoreArticles]);

  useEffect(() => {
    setKeyword(initialKeyword);
    setArticles(initialData.data);
    setCursor(initialData.pagination.nextCursor);
    setLimit(initialData.pagination.limit);
    setHasMore(initialData.pagination.hasMore);
  }, [
    initialData.data,
    initialData.pagination.hasMore,
    initialData.pagination.limit,
    initialData.pagination.nextCursor,
    initialKeyword,
  ]);

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <div className={styles.header}>
          <div>
            <Title level={2} className={styles.title}>
              文章管理
            </Title>
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
          loading={isPending || isRefreshing}
          pagination={false}
        />
        <div ref={loaderRef} className={styles.loader} />
        <div className={styles['load-status']}>
          {isLoadingMore ? <Text type="secondary">加载中...</Text> : null}
          {!hasMore && !isLoadingMore ? <Text type="secondary">没有更多文章了</Text> : null}
        </div>
      </section>
    </main>
  );
}
