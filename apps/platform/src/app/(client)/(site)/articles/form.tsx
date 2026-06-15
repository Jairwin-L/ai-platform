'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Alert, Button, Form, Input, Space, Switch, Typography } from 'antd';
import {
  type Article,
  type ArticleFormValues,
  createArticle,
  getArticle,
  updateArticle,
} from '@/services/articles';
import styles from './form.module.scss';

const { Title, Text } = Typography;

interface ArticleFormProps {
  mode: 'create' | 'edit';
  article?: Article;
  articleId?: string;
}

export default function ArticleForm(props: ArticleFormProps) {
  const { mode, article, articleId } = props;
  const router = useRouter();
  const [form] = Form.useForm<ArticleFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const [currentArticle, setCurrentArticle] = useState(article);
  const [loadingArticle, setLoadingArticle] = useState(mode === 'edit' && !article);
  const [errorMessage, setErrorMessage] = useState('');
  const isEdit = mode === 'edit';

  const onFinish = async (values: ArticleFormValues) => {
    setSubmitting(true);

    try {
      const payload = {
        ...values,
        summary: values.summary?.trim() || null,
        published: Boolean(values.published),
      };

      if (isEdit) {
        if (!currentArticle) {
          setErrorMessage('文章尚未加载完成');
          return;
        }

        await updateArticle(currentArticle.id, payload);
      } else {
        await createArticle(payload);
      }

      router.push('/articles');
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '保存文章失败');
    } finally {
      setSubmitting(false);
    }
  };
  useEffect(() => {
    async function fetchArticle() {
      if (!isEdit || currentArticle || !articleId) {
        return;
      }

      setLoadingArticle(true);
      setErrorMessage('');

      try {
        const nextArticle = await getArticle(articleId);
        setCurrentArticle(nextArticle);
        form.setFieldsValue({
          title: nextArticle.title,
          slug: nextArticle.slug,
          summary: nextArticle.summary,
          content: nextArticle.content,
          published: nextArticle.published,
        });
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : '文章加载失败');
      } finally {
        setLoadingArticle(false);
      }
    }
    fetchArticle();
  }, [articleId, currentArticle, form, isEdit]);

  return (
    <main className={styles.page}>
      <section className={styles.container}>
        <div className={styles.header}>
          <div>
            <Title level={2} className={styles.title}>
              {isEdit ? '编辑文章' : '新增文章'}
            </Title>
            <Text type="secondary">
              {isEdit
                ? '修改文章标题、Slug、正文和发布状态。'
                : '创建一篇新文章并保存到 PostgreSQL。'}
            </Text>
          </div>
          <Button href="/articles">返回列表</Button>
        </div>

        {errorMessage ? <Alert showIcon type="error" title={errorMessage} /> : null}

        <div className={styles.card}>
          <Form<ArticleFormValues>
            form={form}
            layout="vertical"
            disabled={loadingArticle || (isEdit && !currentArticle)}
            initialValues={{
              title: currentArticle?.title ?? '',
              slug: currentArticle?.slug ?? '',
              summary: currentArticle?.summary ?? null,
              content: currentArticle?.content ?? '',
              published: currentArticle?.published ?? false,
            }}
            onFinish={onFinish}
          >
            <Form.Item
              label="标题"
              name="title"
              rules={[
                { required: true, message: '请输入标题' },
                { max: 120, message: '标题最多 120 个字符' },
              ]}
            >
              <Input placeholder="请输入文章标题" />
            </Form.Item>

            <Form.Item
              label="Slug"
              name="slug"
              rules={[
                { required: true, message: '请输入 Slug' },
                {
                  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                  message: 'Slug 只能包含小写字母、数字和连字符',
                },
                { max: 160, message: 'Slug 最多 160 个字符' },
              ]}
            >
              <Input placeholder="hello-world" />
            </Form.Item>

            <Form.Item
              label="摘要"
              name="summary"
              rules={[{ max: 240, message: '摘要最多 240 个字符' }]}
            >
              <Input.TextArea rows={3} placeholder="可选，用于列表展示" />
            </Form.Item>

            <Form.Item
              label="内容"
              name="content"
              rules={[{ required: true, message: '请输入内容' }]}
            >
              <Input.TextArea rows={10} placeholder="请输入文章正文" />
            </Form.Item>

            <Form.Item label="发布状态" name="published" valuePropName="checked">
              <Switch checkedChildren="发布" unCheckedChildren="草稿" />
            </Form.Item>

            <Form.Item className={styles.formActions}>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={submitting || loadingArticle}
                  disabled={isEdit && !currentArticle}
                >
                  {isEdit ? '保存修改' : '创建文章'}
                </Button>
                <Button href="/articles">取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </div>
      </section>
    </main>
  );
}
