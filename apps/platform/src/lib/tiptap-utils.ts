/**
 * @file
 * Tiptap 富文本编辑器工具函数。
 */

import type { Editor } from '@tiptap/react';
import { compressImage } from '@/utils/compress-image';
import { getFileLink } from '@/utils/link';
import { requestPresignedUrls, uploadWithPresignedUrl } from '@/utils/r2-upload';

export const MAX_FILE_SIZE = 20 * 1024 * 1024;

const DEFAULT_EDITOR_PAGE = 'unknown';
const IMAGE_LOAD_TIMEOUT = 10_000;

/**
 * @func isMarkInSchema
 * @desc 判断编辑器 schema 中是否存在指定 mark。
 * @param {string} markName mark 名称。
 * @param {Editor | null} editor Tiptap 编辑器实例。
 * @returns {boolean} mark 是否存在。
 */
export function isMarkInSchema(markName: string, editor: Editor | null): boolean {
  return editor?.schema.spec.marks.get(markName) !== undefined;
}

/**
 * @func isNodeInSchema
 * @desc 判断编辑器 schema 中是否存在指定 node。
 * @param {string} nodeName node 名称。
 * @param {Editor | null} editor Tiptap 编辑器实例。
 * @returns {boolean} node 是否存在。
 */
export function isNodeInSchema(nodeName: string, editor: Editor | null): boolean {
  return editor?.schema.spec.nodes.get(nodeName) !== undefined;
}

/**
 * @func getCurrentEditorPage
 * @desc 根据当前浏览器路径生成编辑器上传目录片段。
 * @returns {string} 当前页面路径片段；服务端或空路径时返回 unknown。
 */
export function getCurrentEditorPage(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_EDITOR_PAGE;
  }

  const page = window.location.pathname
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^\w/-]/g, '')
    .replace(/\//g, '-');

  return page || DEFAULT_EDITOR_PAGE;
}

/**
 * @func buildEditorUploadPath
 * @desc 生成编辑器图片上传目录。
 * @param {string} page 页面路径片段。
 * @param {Date} date 用于生成日期目录的时间。
 * @returns {string} R2 对象目录路径。
 */
export function buildEditorUploadPath(page = getCurrentEditorPage(), date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `/editor/${page}/${year}/${month}/${day}`;
}

/**
 * @func buildLoadableImageUrl
 * @desc 给图片 URL 添加一次性参数，避免刚上传后命中旧缓存。
 * @param {string} url 图片公开访问地址。
 * @returns {string} 可立即加载的图片地址。
 */
export function buildLoadableImageUrl(url: string): string {
  const version = Date.now().toString(36);

  try {
    const imageUrl = new URL(url);
    imageUrl.searchParams.set('editorImage', version);
    return imageUrl.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}editorImage=${version}`;
  }
}

/**
 * @func waitForImageLoad
 * @desc 等待浏览器确认上传后的图片可访问。
 * @param {string} url 图片公开访问地址。
 * @param {AbortSignal} [abortSignal] 上传取消信号。
 * @returns {Promise<void>} 图片加载成功后 resolve。
 * @throws 图片无法加载、加载超时或上传被取消时抛出错误。
 */
export function waitForImageLoad(url: string, abortSignal?: AbortSignal): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  if (abortSignal?.aborted) {
    return Promise.reject(new Error('上传已取消'));
  }

  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('上传后的图片无法访问'));
    }, IMAGE_LOAD_TIMEOUT);

    function abortLoad(): void {
      cleanup();
      reject(new Error('上传已取消'));
    }

    function cleanup(): void {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      abortSignal?.removeEventListener('abort', abortLoad);
    }

    image.onload = () => {
      cleanup();
      resolve();
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('上传后的图片无法访问'));
    };

    abortSignal?.addEventListener('abort', abortLoad, { once: true });
    image.referrerPolicy = 'no-referrer';
    image.src = url;
  });
}

/**
 * @func handleImageUpload
 * @desc 压缩编辑器图片并通过现有 R2 预签名地址流程上传。
 * @param {File} file 待上传图片文件。
 * @param {(event: { progress: number }) => void} [onProgress] 上传进度回调。
 * @param {AbortSignal} [abortSignal] 上传取消信号。
 * @returns {Promise<string>} 图片公开访问地址。
 * @throws 文件缺失、预签名地址生成失败、上传失败或上传被取消时抛出错误。
 */
export async function handleImageUpload(
  file: File,
  onProgress?: (event: { progress: number }) => void,
  abortSignal?: AbortSignal,
): Promise<string> {
  if (!file) {
    throw new Error('未提供文件');
  }

  if (abortSignal?.aborted) {
    throw new Error('上传已取消');
  }

  const compressed = await compressImage(file, 'sharp');

  if (abortSignal?.aborted) {
    throw new Error('上传已取消');
  }

  const [presignedUrl] = await requestPresignedUrls([compressed], buildEditorUploadPath());

  if (!presignedUrl) {
    throw new Error('生成上传地址失败');
  }

  await uploadWithPresignedUrl(
    compressed,
    presignedUrl,
    ({ progress }) => {
      if (abortSignal?.aborted) return;
      onProgress?.({ progress });
    },
    abortSignal,
  );

  if (abortSignal?.aborted) {
    throw new Error('上传已取消');
  }

  const imageUrl = buildLoadableImageUrl(getFileLink(presignedUrl.key));
  await waitForImageLoad(imageUrl, abortSignal);

  return imageUrl;
}
