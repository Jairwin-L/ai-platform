'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { App, Button, Form, Input, Space, Switch, Typography } from 'antd';
import {
  type Article,
  type ArticleFormValues,
  createArticle,
  updateArticle,
} from '@/services/articles';
import styles from './article-form.module.scss';

const { Title, Text } = Typography;

interface ArticleFormProps {
  mode: 'create' | 'edit';
  article?: Article;
}

export default function ArticleForm({ mode, article }: ArticleFormProps) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<ArticleFormValues>();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const onFinish = async (values: ArticleFormValues) => {
    setSubmitting(true);

    try {
      const payload = {
        ...values,
        summary: values.summary?.trim() || null,
        published: Boolean(values.published),
      };

      if (isEdit && article) {
        await updateArticle(article.id, payload);
        message.success('文章已更新');
      } else {
        await createArticle(payload);
        message.success('文章已创建');
      }

      router.push('/articles');
      router.refresh();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存文章失败');
    } finally {
      setSubmitting(false);
    }
  };

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

        <div className={styles.card}>
          <Form<ArticleFormValues>
            form={form}
            layout="vertical"
            initialValues={{
              title: article?.title ?? '',
              slug: article?.slug ?? '',
              summary: article?.summary ?? null,
              content: article?.content ?? '',
              published: article?.published ?? false,
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
                <Button type="primary" htmlType="submit" loading={submitting}>
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
