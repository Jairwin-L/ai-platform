import { Input, Select, Switch } from 'antd';
import type { FormItemConfig, OptionItem } from '@/components/form-items';
import {
  PASSWORD_MAX_LENGTH,
  getCreateUserRules,
  getEditUserRules,
  getResetPasswordRules,
  type CreateUserFormValues,
  type ResetPasswordFormValues,
} from './schemas';

/** 新建与编辑共用一份字段配置；编辑态没有账号、密码两个可写字段 */
type FormValues = CreateUserFormValues;

/** 表单项要用到的、页面在运行时才拿得到的数据与权限状态 */
interface FormModel {
  /** 不允许改启停时只读 */
  enableDisabled?: boolean;
  /** 编辑态：账号只读、不出现密码项、校验走 editUserFormSchema */
  isEditing: boolean;
  /** 无分配角色权限，或目标是超级管理员时只读 */
  roleDisabled?: boolean;
  /** 角色框下方的说明，按编辑对象不同给出不同提示 */
  roleExtra?: string;
  roleOptions: OptionItem[];
}

export const defaultValues: CreateUserFormValues = {
  username: '',
  account: '',
  password: '',
  roleIds: [],
  remark: '',
  enabled: true,
};

/** 用户表单的字段配置，新建与编辑共用一份 */
export function getFormItems({
  enableDisabled,
  isEditing,
  roleDisabled,
  roleExtra,
  roleOptions,
}: FormModel): Array<FormItemConfig<keyof FormValues>> {
  const getRules = isEditing ? getEditUserRules : getCreateUserRules;

  // 账号是后台登录凭据，创建后不允许修改；初始密码只在新建时设置，编辑走独立的重置密码入口
  const credentialItems: Array<FormItemConfig<keyof FormValues>> = isEditing
    ? [
        {
          // 只做展示：editUserFormSchema 不含账号，提交时会被剔除
          label: '账号',
          name: 'account',
          component: <Input disabled />,
        },
      ]
    : [
        {
          label: '账号',
          name: 'account',
          required: true,
          rules: getCreateUserRules('account'),
          extra: '用于登录管理端，创建后不可修改',
          component: <Input autoComplete="off" maxLength={100} placeholder="字母、数字、_ . @ -" />,
        },
        {
          label: '初始密码',
          name: 'password',
          full: true,
          required: true,
          rules: getCreateUserRules('password'),
          component: (
            <Input.Password
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              placeholder="至少 6 位"
            />
          ),
        },
      ];

  return [
    {
      label: '用户名',
      name: 'username',
      required: true,
      rules: getRules('username'),
      component: <Input maxLength={100} placeholder="请输入用户名" />,
    },
    ...credentialItems,
    {
      label: '角色',
      name: 'roleIds',
      full: true,
      required: !isEditing,
      rules: getRules('roleIds'),
      extra: roleExtra,
      component: (
        <Select
          disabled={roleDisabled}
          maxTagCount="responsive"
          mode="multiple"
          options={roleOptions}
          placeholder="选择角色"
        />
      ),
    },
    {
      label: '备注',
      name: 'remark',
      full: true,
      rules: getRules('remark'),
      component: <Input.TextArea maxLength={255} placeholder="选填" rows={3} showCount />,
    },
    {
      label: '启用',
      name: 'enabled',
      full: true,
      valuePropName: 'checked',
      component: <Switch disabled={enableDisabled} />,
    },
  ];
}

/** 重置密码弹窗的字段配置，两次输入是否一致由 resetPasswordFormSchema 的 refine 判定 */
export function getResetPasswordItems(): Array<FormItemConfig<keyof ResetPasswordFormValues>> {
  return [
    {
      label: '新密码',
      name: 'password',
      required: true,
      rules: getResetPasswordRules('password'),
      component: (
        <Input.Password
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          placeholder="至少 6 位"
        />
      ),
    },
    {
      label: '确认密码',
      name: 'confirmPassword',
      // 改了新密码要让确认密码重新走一遍 refine
      dependencies: ['password'],
      required: true,
      rules: getResetPasswordRules('confirmPassword'),
      component: (
        <Input.Password
          autoComplete="new-password"
          maxLength={PASSWORD_MAX_LENGTH}
          placeholder="再次输入新密码"
        />
      ),
    },
  ];
}
