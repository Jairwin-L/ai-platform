import { Input, Switch, TreeSelect } from 'antd';
import type { RbacPermission } from '@/api/methods/rbac';
import type { FormItemConfig } from '@/components/form-items';
import { getRoleRules, type RoleFormValues } from './schemas';

export interface PermissionTreeNode {
  children?: PermissionTreeNode[];
  title: string;
  value: string;
}

/** 表单项要用到的、页面在运行时才拿得到的数据与权限状态 */
interface FormModel {
  /** 编辑态改启停需要单独的 ROLE_SET_STATE 权限 */
  canToggleState: boolean;
  isEditing: boolean;
  isSuperAdmin: boolean;
  permissionTree: PermissionTreeNode[];
}

export const defaultValues: RoleFormValues = {
  code: '',
  name: '',
  enable: true,
  description: '',
  remark: '',
  permissionIds: [],
};

/** 把服务端返回的权限树转成 TreeSelect 需要的节点结构 */
export function getPermissionTree(nodes: RbacPermission[]): PermissionTreeNode[] {
  return nodes.map((permission) => ({
    title: `${permission.name} · ${permission.code}`,
    value: permission.id,
    children: permission.children?.length ? getPermissionTree(permission.children) : undefined,
  }));
}

/** 角色表单的字段配置，新建与编辑共用一份 */
export function getFormItems({
  canToggleState,
  isEditing,
  isSuperAdmin,
  permissionTree,
}: FormModel): Array<FormItemConfig<keyof RoleFormValues>> {
  return [
    {
      label: '角色编码',
      name: 'code',
      normalize: (value?: string) => value?.toUpperCase(),
      required: true,
      rules: getRoleRules('code'),
      extra: isEditing ? '角色编码参与鉴权，创建后不可修改' : undefined,
      component: <Input disabled={isEditing} maxLength={50} placeholder="例如：CONTENT_REVIEWER" />,
    },
    {
      label: '角色名称',
      name: 'name',
      required: true,
      rules: getRoleRules('name'),
      component: <Input maxLength={50} placeholder="例如：内容审核员" />,
    },
    {
      label: '启用状态',
      name: 'enable',
      full: true,
      valuePropName: 'checked',
      component: (
        <Switch
          checkedChildren="启用"
          disabled={isSuperAdmin || !canToggleState}
          unCheckedChildren="停用"
        />
      ),
    },
    {
      label: '角色说明',
      name: 'description',
      full: true,
      rules: getRoleRules('description'),
      component: (
        <Input.TextArea
          maxLength={255}
          placeholder="说明该角色的职责和授权范围"
          rows={3}
          showCount
        />
      ),
    },
    {
      label: '备注',
      name: 'remark',
      full: true,
      rules: getRoleRules('remark'),
      component: <Input.TextArea maxLength={255} placeholder="选填" rows={2} showCount />,
    },
    {
      label: '资源权限',
      name: 'permissionIds',
      full: true,
      extra: isSuperAdmin
        ? '超级管理员天然拥有全部已启用的权限，这里的勾选不影响鉴权。'
        : '勾选的菜单与按钮会一并保存；非超级管理员只能授予自己已拥有的权限。',
      component: (
        /*
          父子节点都要提交：服务端按按钮权限码逐个鉴权，
          只存父节点（SHOW_PARENT）会让勾满的菜单下所有按钮权限都不生效
        */
        <TreeSelect
          allowClear
          maxTagCount="responsive"
          multiple
          placeholder="选择此角色可用的菜单与按钮"
          showCheckedStrategy={TreeSelect.SHOW_ALL}
          treeCheckable
          treeData={permissionTree}
          treeDefaultExpandAll
        />
      ),
    },
  ];
}
