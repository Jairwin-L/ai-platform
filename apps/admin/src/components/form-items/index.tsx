import { Fragment, type ReactNode } from 'react';
import { Divider, Form, type FormItemProps, type FormRule } from 'antd';
import css from '@/components/resource-page/index.module.scss';

/** antd 的字段路径：顶层字段名，或指向嵌套结构的路径数组 */
type FieldPath = string | number | Array<string | number>;

/** 下拉 / 树选择等控件的选项 */
export interface OptionItem {
  label: string;
  value: string;
}

/** 单个表单项的配置，页面按此数组渲染 Form.Item，不再逐个手写 */
export interface FormItemConfig<Name extends FieldPath = FieldPath> {
  /** 受控的表单控件 */
  component: ReactNode;
  /** 依赖的其他字段，值变化时重新校验（如确认密码） */
  dependencies?: string[];
  /** 在该项之前插一条分隔线；只适用于垂直排列的表单，栅格里会占掉一格 */
  dividerBefore?: boolean;
  /** 渲染在控件下方的补充说明 */
  extra?: ReactNode;
  /** 占满整行；缺省时与相邻项共用 .form-grid 的两列 */
  full?: boolean;
  /** 字段初始值；表单整体的初始值优先用 Form 的 initialValues */
  initialValue?: FormItemProps['initialValue'];
  label: string;
  name: Name;
  /** 写回 store 前归一化字段值，如编码统一转大写 */
  normalize?: FormItemProps['normalize'];
  /** 只控制必填星号；校验一律走各模块 schemas.ts 的 zod 规则 */
  required?: boolean;
  rules?: FormRule[];
  /** label 旁的问号提示 */
  tooltip?: FormItemProps['tooltip'];
  /** Switch / Checkbox 这类以 checked 取值的控件需要显式声明 */
  valuePropName?: string;
}

/**
 * 按配置数组渲染 Form.Item。
 *
 * 外层需要自带 .form-grid 容器：默认每项占一列，`full` 的项跨满两列；弹窗等单列表单可以不包。
 *
 * 入参刻意收成 `FormItemConfig[]` 而不是泛型：Form.Item 的 `name` 会反推它自己的
 * Values 泛型，喂未实例化的类型参数会让 antd 的 DeepNamePath 条件类型无法求值。
 * 各模块仍按 `FormItemConfig<keyof FormValues>[]` 声明，字段名的校验在那一层。
 */
export default function FormItems({ items }: { items: FormItemConfig[] }) {
  return (
    <>
      {items.map((item) => (
        <Fragment key={Array.isArray(item.name) ? item.name.join('.') : item.name}>
          {item.dividerBefore ? <Divider /> : null}
          <Form.Item
            className={item.full ? css['form-item-full'] : undefined}
            dependencies={item.dependencies}
            extra={item.extra}
            initialValue={item.initialValue}
            label={item.label}
            name={item.name}
            normalize={item.normalize}
            required={item.required}
            rules={item.rules}
            tooltip={item.tooltip}
            valuePropName={item.valuePropName}
          >
            {item.component}
          </Form.Item>
        </Fragment>
      ))}
    </>
  );
}
