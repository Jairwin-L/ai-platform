/**
 * @file Prisma 已知错误码的判定工具。
 *       接口层要把唯一约束冲突、记录不存在等转成对应的 409 / 404，而不是统一的 500。
 */

/**
 * @func getPrismaErrorCode
 * @desc 读取 Prisma 已知请求错误的错误码（如 P2002、P2025）。
 * @param {unknown} error 捕获到的异常。
 * @returns {string | undefined} 错误码；不是 Prisma 已知错误时为 undefined。
 */
export function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const { code } = error as { code: unknown };
  return typeof code === 'string' ? code : undefined;
}

/**
 * @func isUniqueConstraintError
 * @desc 判断是否违反唯一约束（P2002）。
 * @param {unknown} error 捕获到的异常。
 * @returns {boolean} 是唯一约束冲突时为 true。
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return getPrismaErrorCode(error) === 'P2002';
}

/**
 * @func isRecordNotFoundError
 * @desc 判断是否为更新 / 删除时找不到目标记录（P2025）。
 * @param {unknown} error 捕获到的异常。
 * @returns {boolean} 目标记录不存在时为 true。
 */
export function isRecordNotFoundError(error: unknown): boolean {
  return getPrismaErrorCode(error) === 'P2025';
}
