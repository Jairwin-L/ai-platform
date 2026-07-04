import { notFound } from 'next/navigation';
import { Button, Space, Tag, Typography } from 'antd';
import { DynamicSimpleEditorViewer } from '@/components/editor/dynamic-viewer';
import { DynamicMarkdownEditorViewer } from '@/components/markdown-editor/dynamic-viewer';
import { fetchArticleById } from '../utils/article';
import styles from './page.module.scss';

const { Title, Text } = Typography;

export default async function Page({ params }: IAppPages.ArticleDetailPageProps) {
  const { id } = await params;
  const article = await fetchArticleById(id);

  if (!article) {
    notFound();
  }

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <div className={styles.header}>
          <div className={styles['title-group']}>
            <Space size="small" wrap>
              <Tag color={article.published ? 'green' : 'default'}>
                {article.published ? '已发布' : '草稿'}
              </Tag>
              <Text type="secondary">{article.slug}</Text>
            </Space>
            <Title level={2} className={styles.title}>
              {article.title}
            </Title>
            {article.summary ? <Text type="secondary">{article.summary}</Text> : null}
          </div>
          <Space>
            <Button href="/articles">返回列表</Button>
            <Button type="primary" href={`/articles/${article.id}/edit`}>
              编辑文章
            </Button>
          </Space>
        </div>

        <article className={styles.card}>
          <DynamicSimpleEditorViewer content={article.content} />
        </article>

        {article.note ? (
          <section className={styles.card}>
            <Title level={4} className={styles['section-title']}>
              笔记
            </Title>
            <DynamicMarkdownEditorViewer content={article.note} />
          </section>
        ) : null}
      </section>
    </main>
  );
}
