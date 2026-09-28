/**
 * @file 表单与 zod 校验结果之间的转换工具。
 */
import type { FormInstance } from 'antd';
import type { ZodError } from 'zod';

/** antd `form.setFields` 接收的字段数组，按表单值类型推导字段路径 */
type FormFieldData<Values> = Parameters<FormInstance<Values>['setFields']>[0];

/**
 * @func getFormFieldErrors
 * @desc 把 zod 校验失败的 issues 转成 antd `form.setFields` 可直接回填的字段错误。
 * @param {ZodError['issues']} issues zod `safeParse` 失败时的 `error.issues`。
 * @returns {FormFieldData<Values>} 可传给 `form.setFields` 的字段错误数组。
 * @example
 *
 * const parsed = schema.safeParse(values);
 * if (!parsed.success) form.setFields(getFormFieldErrors(parsed.error.issues));
 *
 */
export function getFormFieldErrors<Values>(issues: ZodError['issues']): FormFieldData<Values> {
  return issues.map((issue) => ({
    // zod 的路径可能含 symbol 键，antd 的 NamePath 只认 string | number；
    // 路径由同一份 schema 产生，与表单字段一一对应，这里只做类型收窄
    name: issue.path.filter(
      (key) => typeof key !== 'symbol',
    ) as unknown as FormFieldData<Values>[number]['name'],
    errors: [issue.message],
  }));
}
