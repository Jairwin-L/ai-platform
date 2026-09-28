/**
 * @file Standard Schema 校验错误的格式化工具。
 *       入参校验由 AppStandardSchemaValidationPipe 在参数装饰器上完成
 *       （`@Body({ schema })` / `@Query({ schema })` / `@Param(name, { schema })`），
 *       这里只负责把 issues 压成可直接展示的接口文案。
 */
import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * @func formatIssuePath
 * @desc 把单个 issue 的字段路径拼成点号路径。路径段可能是裸键，也可能是 `{ key }` 包装对象。
 * @param {StandardSchemaV1.Issue} issue 单条校验问题。
 * @returns {string} 点号分隔的字段路径；顶层错误返回空串。
 */
function formatIssuePath(issue: StandardSchemaV1.Issue): string {
  if (!issue.path?.length) return '';
  return issue.path
    .map((segment) =>
      typeof segment === 'object' && segment !== null ? String(segment.key) : String(segment),
    )
    .join('.');
}

/**
 * @func formatSchemaIssues
 * @desc 把校验问题压成一行可读文案。字段上声明了中文文案时直接使用，不再拼字段路径。
 * @param {readonly StandardSchemaV1.Issue[]} issues 校验问题列表。
 * @returns {string} 单行错误描述。
 */
export function formatSchemaIssues(issues: readonly StandardSchemaV1.Issue[]): string {
  return issues
    .map((issue) => {
      const path = formatIssuePath(issue);
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('；');
}

/**
 * @func getFirstIssueMessage
 * @desc 取第一条校验问题的文案，给只展示一句提示的接口用。
 * @param {unknown} issues 异常里携带的 issues，可能不是数组。
 * @returns {string | undefined} 第一条文案，取不到时为 undefined。
 */
export function getFirstIssueMessage(issues: unknown): string | undefined {
  if (!Array.isArray(issues)) return undefined;
  const [first] = issues as StandardSchemaV1.Issue[];
  return typeof first?.message === 'string' ? first.message : undefined;
}
