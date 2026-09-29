import { Input, InputNumber, Select, Switch } from 'antd';
import type { RbacPermission } from '@/api/methods/rbac';
import type { FormItemConfig, OptionItem } from '@/components/form-items';
import { LEAF_PERMISSION_TYPES, PERMISSION_TYPE_OPTIONS } from '@/constants/permission';
import { getPermissionRules, type PermissionFormValues } from './schemas';

const TYPE_OPTIONS = PERMISSION_TYPE_OPTIONS.map(({ label, value }) => ({ label, value }));

/** 表单项要用到的、页面在运行时才拿得到的数据 */
interface FormModel {
  isEditing: boolean;
  /** 上级资源下拉选项，已排除自身及子孙 */
  parentOptions: OptionItem[];
}

function flattenPermissions(permissions: RbacPermission[]): RbacPermission[] {
  return permissions.flatMap((permission) => [
    permission,
    ...(permission.children?.length ? flattenPermissions(permission.children) : []),
  ]);
}

/** 自己及其全部子孙都不能作为上级，否则会形成循环 */
function collectDescendantIds(permissions: RbacPermission[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const permission of permissions) {
      if (permission.parentId && ids.has(permission.parentId) && !ids.has(permission.id)) {
        ids.add(permission.id);
        changed = true;
      }
    }
  }
  return ids;
}

/** 从资源树生成上级下拉选项：排除自身及子孙，按钮 / 操作是叶子权限，不能挂下级 */
export function getParentOptions(permissions: RbacPermission[], excludeId?: string): OptionItem[] {
  const flat = flattenPermissions(permissions);
  const excluded = excludeId ? collectDescendantIds(flat, excludeId) : new Set<string>();
  return flat
    .filter((permission) => !excluded.has(permission.id))
    .filter((permission) => !LEAF_PERMISSION_TYPES.includes(permission.type))
    .map((permission) => ({
      label: `${permission.name} · ${permission.code}`,
      value: permission.id,
    }));
}

/** 新建时的初始值；从「新增下级」进来会带上父级并默认建按钮 */
export function getDefaultValues(parentId?: string): PermissionFormValues {
  return {
    name: '',
    code: '',
    type: parentId ? 'button' : 'directory',
    parentId: parentId ?? null,
    path: '',
    icon: '',
    sort: 0,
    isShow: true,
    enable: true,
    keepAlive: false,
    description: '',
  };
}

/** 菜单资源表单的字段配置，新建与编辑共用一份 */
export function getFormItems({
  isEditing,
  parentOptions,
}: FormModel): Array<FormItemConfig<keyof PermissionFormValues>> {
  return [
    {
      label: '权限名称',
      name: 'name',
      required: true,
      rules: getPermissionRules('name'),
      component: <Input maxLength={100} placeholder="例如：用户管理" />,
    },
    {
      label: '权限编码',
      name: 'code',
      normalize: (value?: string) => value?.toUpperCase(),
      required: true,
      rules: getPermissionRules('code'),
      extra: isEditing ? '权限编码参与接口鉴权，只有超级管理员可以修改' : undefined,
      component: <Input maxLength={100} placeholder="例如：SYSTEM_ROLES 或 ROLE_READ" />,
    },
    {
      label: '权限类型',
      name: 'type',
      required: true,
      rules: getPermissionRules('type'),
      component: <Select options={TYPE_OPTIONS} placeholder="选择权限类型" />,
    },
    {
      label: '上级资源',
      name: 'parentId',
      component: (
        <Select
          allowClear
          options={parentOptions}
          placeholder="作为根资源创建"
          showSearch={{ optionFilterProp: 'label' }}
        />
      ),
    },
    {
      label: '路由地址',
      name: 'path',
      rules: getPermissionRules('path'),
      extra: '菜单填写管理端的实际页面路径，如 /system/user；按钮留空',
      component: <Input maxLength={255} placeholder="例如：/system/user" />,
    },
    {
      label: '菜单图标',
      name: 'icon',
      rules: getPermissionRules('icon'),
      component: <Input maxLength={100} placeholder="例如：TeamOutlined" />,
    },
    {
      label: '排序',
      name: 'sort',
      required: true,
      rules: getPermissionRules('sort'),
      component: (
        <InputNumber min={0} placeholder="数值越小越靠前" precision={0} style={{ width: '100%' }} />
      ),
    },
    {
      label: '是否显示',
      name: 'isShow',
      valuePropName: 'checked',
      component: <Switch checkedChildren="显示" unCheckedChildren="隐藏" />,
    },
    {
      label: '是否启用',
      name: 'enable',
      valuePropName: 'checked',
      component: <Switch checkedChildren="启用" unCheckedChildren="停用" />,
    },
    {
      label: '页面缓存',
      name: 'keepAlive',
      valuePropName: 'checked',
      component: <Switch checkedChildren="缓存" unCheckedChildren="不缓存" />,
    },
    {
      label: '说明',
      name: 'description',
      full: true,
      rules: getPermissionRules('description'),
      component: (
        <Input.TextArea maxLength={255} placeholder="说明这个权限控制的范围" rows={3} showCount />
      ),
    },
  ];
}
