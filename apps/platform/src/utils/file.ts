/**
 * @file
 * 文件格式检测工具。
 */

import type { FileTypeResult } from 'file-type';
import { ALLOW_FILE_TYPE } from '@/constants';

/**
 * @func detectFileType
 * @desc 通过文件内容检测真实格式，避免只依赖文件扩展名或浏览器 MIME。
 * @param {File} file 待检测文件。
 * @returns {Promise<FileTypeResult | undefined>} 检测到的文件格式，无法检测时返回 undefined。
 */
async function detectFileType(file: File): Promise<FileTypeResult | undefined> {
  try {
    const { fileTypeFromBlob } = await import('file-type');
    return await fileTypeFromBlob(file);
  } catch {
    return undefined;
  }
}

/**
 * @func fileTypeValid
 * @desc 判断文件真实格式是否在允许上传的图片格式白名单中。
 * @param {File | undefined} file 待校验文件。
 * @returns {Promise<boolean>} 文件格式是否允许上传。
 */
export async function fileTypeValid(file?: File): Promise<boolean> {
  if (!file) return false;

  const fileType = await detectFileType(file);

  return ALLOW_FILE_TYPE.some((item) => item.ext === fileType?.ext && item.mime === fileType?.mime);
}
