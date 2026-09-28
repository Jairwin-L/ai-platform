import { z } from 'zod';

/** 一次最多签这么多个文件，与迁移前一致 */
export const MAX_FILE_COUNT = 5;

/**
 * R2 预签名上传请求。
 *
 * path / expiresIn 传了非法值一律按未传处理，由 service 回落到默认值；
 * files 数量不对这个请求根本没法执行，必须拒绝。
 */
export const presignedRequestSchema = z.object({
  files: z
    .array(
      z.object({
        fileName: z.string().max(255).optional(),
        fileType: z.string().max(100).optional(),
      }),
      'files 不能为空',
    )
    .min(1, 'files 不能为空')
    .max(MAX_FILE_COUNT, `每次请求最多允许 ${MAX_FILE_COUNT} 个文件`),
  path: z.string().max(200).optional().catch(undefined),
  expiresIn: z.number().optional().catch(undefined),
});

export type PresignedRequestInput = z.infer<typeof presignedRequestSchema>;
