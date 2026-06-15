'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { App, Button, Empty, Image, Input, Progress, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { getFileLink } from '@/utils/link';
import { fileTypeValid } from '@/utils/file';
import { formatFileSize, requestPresignedUrls, uploadWithPresignedUrl } from '@/utils/r2-upload';
import styles from './page.module.scss';

const { Dragger } = Upload;

function getTodayPath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `upload/${year}/${month}/${day}`;
}

function getFileObject(file: UploadFile): File | null {
  return file.originFileObj instanceof File ? file.originFileObj : null;
}

export default function Page() {
  const { message } = App.useApp();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploadPath, setUploadPath] = useState(getTodayPath);
  const [uploading, setUploading] = useState(false);
  const previewUrls = useRef(new Map<string, string>());

  const totalSize = useMemo(
    () => fileList.reduce((size, file) => size + (file.size || 0), 0),
    [fileList],
  );
  const failedCount = fileList.filter((file) => file.status === 'error').length;

  const uploadProps: UploadProps = {
    multiple: true,
    accept: 'image/*',
    fileList,
    showUploadList: false,
    beforeUpload: async (file) => {
      const valid = await fileTypeValid(file);

      if (!valid) {
        message.warning(`不支持的图片格式：${file.name}`);
        return Upload.LIST_IGNORE;
      }

      return false;
    },
    onChange: ({ fileList: nextFileList }) => {
      setFileList(nextFileList);
    },
  };

  function getPreviewUrl(file: UploadFile): string | undefined {
    const fileObject = getFileObject(file);
    if (!fileObject) return undefined;

    let url = previewUrls.current.get(file.uid);

    if (!url) {
      url = URL.createObjectURL(fileObject);
      previewUrls.current.set(file.uid, url);
    }

    return url;
  }

  function revokePreview(uid: string): void {
    const url = previewUrls.current.get(uid);

    if (url) {
      URL.revokeObjectURL(url);
      previewUrls.current.delete(uid);
    }
  }

  function onRemove(uid: string): void {
    revokePreview(uid);
    setFileList((current) => current.filter((file) => file.uid !== uid));
  }

  function onClear(): void {
    previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrls.current.clear();
    setFileList([]);
  }

  function collectEntries(items: UploadFile[]): Array<{ uid: string; file: File }> {
    return items.flatMap((item) => {
      const file = getFileObject(item);
      return file ? [{ uid: item.uid, file }] : [];
    });
  }

  async function runUpload(entries: Array<{ uid: string; file: File }>): Promise<void> {
    if (entries.length === 0) return;

    setUploading(true);

    try {
      setFileList((current) =>
        current.map((item) =>
          entries.some((entry) => entry.uid === item.uid)
            ? { ...item, status: 'uploading', percent: 0, error: undefined }
            : item,
        ),
      );

      const presignedUrls = await requestPresignedUrls(
        entries.map((entry) => entry.file),
        uploadPath,
      );
      const results = await Promise.allSettled(
        entries.map(async ({ uid, file }, index) => {
          const presignedUrl = presignedUrls[index];

          if (!presignedUrl) {
            throw new Error('Missing presigned URL');
          }

          await uploadWithPresignedUrl(file, presignedUrl, ({ progress }) => {
            setFileList((current) =>
              current.map((item) => (item.uid === uid ? { ...item, percent: progress } : item)),
            );
          });

          setFileList((current) =>
            current.map((item) =>
              item.uid === uid
                ? { ...item, status: 'done', percent: 100, response: presignedUrl.key }
                : item,
            ),
          );

          return true;
        }),
      );
      const failedUids = new Set(
        results.flatMap((result, index) =>
          result.status === 'rejected' ? [entries[index].uid] : [],
        ),
      );

      if (failedUids.size > 0) {
        setFileList((current) =>
          current.map((item) =>
            failedUids.has(item.uid)
              ? {
                  ...item,
                  status: 'error',
                  error: new Error('Upload failed'),
                }
              : item,
          ),
        );
        message.warning('部分文件上传失败');
        return;
      }

      message.success('上传完成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }

  function onSubmit(): void {
    runUpload(collectEntries(fileList.filter((item) => item.status !== 'done'))).catch((error) => {
      message.error(error instanceof Error ? error.message : '上传失败');
    });
  }

  function onRetryFailed(): void {
    runUpload(collectEntries(fileList.filter((item) => item.status === 'error'))).catch((error) => {
      message.error(error instanceof Error ? error.message : '上传失败');
    });
  }

  function onRetryItem(uid: string): void {
    const target = fileList.find((item) => item.uid === uid);
    if (!target) return;

    runUpload(collectEntries([target])).catch((error) => {
      message.error(error instanceof Error ? error.message : '上传失败');
    });
  }

  useEffect(
    () => () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    },
    [],
  );

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>R2 直传</h1>
          <p>选择图片后生成预签名地址，浏览器直接 PUT 到 Cloudflare R2。</p>
        </div>
      </header>

      <div className={styles.options}>
        <label className={styles.option}>
          <span>上传路径</span>
          <Input
            value={uploadPath}
            disabled={uploading}
            onChange={(event) => setUploadPath(event.target.value)}
            placeholder={getTodayPath()}
          />
        </label>
      </div>

      <Dragger {...uploadProps} className={styles.dragger}>
        <div className={styles.dropzone}>
          <p className={styles.dropTitle}>拖拽图片到这里</p>
          <p className={styles.dropDescription}>
            支持 jpg、png、gif、webp、avif，单批最多 20 个文件。
          </p>
          <Button type="primary">选择文件</Button>
        </div>
      </Dragger>

      <div className={styles.toolbar}>
        <div className={styles.summary}>
          <span>已选 {fileList.length} 个文件</span>
          <span>总大小 {formatFileSize(totalSize)}</span>
        </div>
        <div className={styles.actions}>
          <Button disabled={fileList.length === 0 || uploading} onClick={onClear}>
            清空
          </Button>
          {failedCount > 0 ? (
            <Button danger loading={uploading} onClick={onRetryFailed}>
              重试失败项
            </Button>
          ) : null}
          <Button
            type="primary"
            loading={uploading}
            disabled={fileList.length === 0 || !uploadPath.trim()}
            onClick={onSubmit}
          >
            开始上传
          </Button>
        </div>
      </div>

      {fileList.length > 0 ? (
        <ul className={styles.list}>
          {fileList.map((file) => {
            const uploadedUrl = typeof file.response === 'string' ? getFileLink(file.response) : '';
            const previewUrl = uploadedUrl || getPreviewUrl(file);

            return (
              <li key={file.uid} className={styles.item}>
                <div className={styles.itemMain}>
                  {previewUrl ? (
                    <div className={styles.thumb}>
                      <Image src={previewUrl} alt={file.name} width={64} height={64} />
                    </div>
                  ) : null}
                  <div className={styles.info}>
                    <p>{file.name}</p>
                    <span>{formatFileSize(file.size)}</span>
                    {uploadedUrl ? (
                      <em>
                        <a href={uploadedUrl} target="_blank" rel="noreferrer">
                          {uploadedUrl}
                        </a>
                      </em>
                    ) : null}
                  </div>
                </div>
                <div className={styles.itemSide}>
                  {typeof file.percent === 'number' && file.status !== 'done' ? (
                    <Progress
                      type="circle"
                      percent={Math.round(file.percent)}
                      size={42}
                      status={file.status === 'error' ? 'exception' : 'active'}
                    />
                  ) : null}
                  {file.status === 'done' ? <span className={styles.done}>完成</span> : null}
                  {file.status === 'error' ? (
                    <Button type="text" disabled={uploading} onClick={() => onRetryItem(file.uid)}>
                      重试
                    </Button>
                  ) : null}
                  <Button type="text" disabled={uploading} onClick={() => onRemove(file.uid)}>
                    移除
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className={styles.empty}>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待上传文件" />
        </div>
      )}
    </section>
  );
}
