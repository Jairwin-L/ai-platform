'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, Input, message, Space, Switch, Typography } from 'antd';
import { DynamicSimpleEditor } from '@/components/editor/dynamic-editor';
import { DynamicMarkdownEditor } from '@/components/markdown-editor/dynamic-editor';
import {
  type Article,
  type ArticleFormValues,
  createArticle,
  getArticle,
  updateArticle,
} from '@/api/modules/articles';
import styles from './form.module.scss';

const { Title } = Typography;

function getEditorText(html?: string): string {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

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
  const isEdit = mode === 'edit';

  const onFinish = async (values: ArticleFormValues) => {
    setSubmitting(true);

    try {
      const payload = {
        ...values,
        summary: values.summary?.trim() || null,
        note: values.note?.trim() || null,
        published: Boolean(values.published),
      };

      if (isEdit) {
        if (!currentArticle) {
          message.error('文章尚未加载完成');
          return;
        }

        await updateArticle(currentArticle.id, payload);
      } else {
        await createArticle(payload);
      }

      router.push('/articles');
      router.refresh();
    } catch {
      // 请求错误由 alova 全局提示处理。
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
      try {
        const nextArticle = await getArticle(articleId);
        setCurrentArticle(nextArticle);
        form.setFieldsValue({
          title: nextArticle.title,
          slug: nextArticle.slug,
          summary: nextArticle.summary,
          content: nextArticle.content,
          note: nextArticle.note,
          published: nextArticle.published,
        });
      } catch {
        // 请求错误由 alova 全局提示处理。
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
          <Title level={2} className={styles.title}>
            {isEdit ? '编辑文章' : '新增文章'}
          </Title>
          <Button href="/articles">返回列表</Button>
        </div>
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
              note: currentArticle?.note ?? '',
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
              className={styles['editor-item']}
              rules={[
                {
                  validator: async (_, value?: string) => {
                    if (!getEditorText(value)) {
                      throw new Error('请输入内容');
                    }
                  },
                },
              ]}
            >
              <DynamicSimpleEditor />
            </Form.Item>

            <Form.Item label="笔记" name="note" className={styles['editor-item']}>
              <DynamicMarkdownEditor />
            </Form.Item>

            <Form.Item label="发布状态" name="published" valuePropName="checked">
              <Switch checkedChildren="发布" unCheckedChildren="草稿" />
            </Form.Item>

            <Form.Item className={styles['form-actions']}>
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
