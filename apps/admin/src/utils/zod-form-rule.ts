/**
 * @file zod schema 与 Ant Design Form 校验规则之间的适配工具。
 *       表单校验规则统一由 zod schema 描述，antd 只负责触发时机与错误展示，
 *       避免同一份规则在 `rules` 与 schema 里各写一遍后逐渐不一致。
 *       本文件只有类型层面依赖 zod / antd。
 */
import type { FormRule } from 'antd';
import type { z } from 'zod';

/** antd 的字段路径：顶层字段名或嵌套路径数组 */
type FieldPath = string | number | Array<string | number>;

/**
 * @func isIssueOfField
 * @desc 判断 zod 问题是否落在指定字段上；问题路径比字段路径更深（如数组元素）时同样算作该字段。
 * @param {PropertyKey[]} issuePath zod 问题路径。
 * @param {(string | number)[]} fieldPath antd 字段路径。
 * @returns {boolean} 是否属于该字段。
 */
function isIssueOfField(issuePath: PropertyKey[], fieldPath: Array<string | number>): boolean {
  return (
    fieldPath.length <= issuePath.length &&
    fieldPath.every((key, index) => String(issuePath[index]) === String(key))
  );
}

/**
 * @func createZodFormRules
 * @desc 基于整份表单 schema 生成按字段取用的 antd 校验规则。
 *       每次校验都解析整份表单值、只取落在该字段上的第一个问题：
 *       解析整份表单而不是单字段 schema，确认密码这类依赖其他字段的规则才能写在同一份 schema 里。
 *       跨字段的 `refine` 需要配合 {@link runWhenFieldsValid}，否则其他字段未填时 zod 会跳过它。
 *       规则里不带 `required`，必填标记需在 `Form.Item` 上显式声明 `required`。
 * @param {z.ZodType} schema 整份表单的 zod schema。
 * @returns {(name: FieldPath) => FormRule[]} 传入字段路径，返回该字段的 antd rules。
 * @example
 *
 * const getRules = createZodFormRules(loginSchema);
 *
 * <Form.Item name="email" required rules={getRules('email')} />
 *
 */
export function createZodFormRules(schema: z.ZodType) {
  return function getRules(name: FieldPath): FormRule[] {
    const fieldPath = Array.isArray(name) ? name : [name];

    // form 的类型交给 FormRule 推断：antd 导出的 FormInstance 比规则回调实际拿到的多出若干成员，直接标注会不兼容
    const rule: FormRule = function createRule(form) {
      return {
        async validator() {
          // 校验触发时字段值已写回 store，这里读到的就是当前输入
          const result = await schema.safeParseAsync(form.getFieldsValue(true));
          if (result.success) return;
          const issue = result.error.issues.find((item) => isIssueOfField(item.path, fieldPath));
          if (issue) throw new Error(issue.message);
        },
      };
    };

    return [rule];
  };
}

/**
 * @func runWhenFieldsValid
 * @desc 生成 zod `refine` 的 `when` 选项：只要指定字段自身没有问题就执行该 refine。
 *       zod 默认在对象内任一字段存在不可继续的问题（如未填写）时跳过对象级 refine，
 *       表单逐字段校验时会导致「确认密码不一致」要等所有字段都填完才出现。
 * @param {string[]} fields 该 refine 依赖、且自身需先通过校验的字段名。
 * @returns {(payload: z.core.ParsePayload) => boolean} 传给 refine 的 `when`。
 * @example
 *
 * schema.refine((values) => values.password === values.confirmPassword, {
 *   path: ['confirmPassword'],
 *   error: '两次输入的密码不一致',
 *   when: runWhenFieldsValid(['confirmPassword']),
 * });
 *
 */
export function runWhenFieldsValid(fields: string[]) {
  return function when(payload: z.core.ParsePayload): boolean {
    return (
      typeof payload.value === 'object' &&
      payload.value !== null &&
      !payload.issues.some((issue) => fields.includes(String(issue.path?.[0])))
    );
  };
}
