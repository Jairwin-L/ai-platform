import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Input, InputNumber, Select, Skeleton, Switch } from 'antd';
import {
  createRbacPermission,
  getRbacPermission,
  getRbacPermissions,
  updateRbacPermission,
  type RbacPermission,
} from '@/api/methods/rbac';
import { LEAF_PERMISSION_TYPES, PERMISSION_TYPE_OPTIONS } from '@/constants/permission';
import { useLiteDebounced } from '@/hooks';
import { MENU_CHANGED_EVENT } from '@/layout/menus';
import pageCss from '@/styles/page.module.scss';
import { getFormFieldErrors } from '@/utils/form';
import { permissionFormSchema, type PermissionFormValues } from './schemas';

const LIST_PATH = '/system/menu';
const TYPE_OPTIONS = PERMISSION_TYPE_OPTIONS.map(({ label, value }) => ({ label, value }));

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

/** 新建时的初始值；从「新增下级」进来会带上父级并默认建按钮 */
function getDefaultValues(parentId?: string): PermissionFormValues {
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

interface MenuFormProps {
  permissionId?: string;
  parentId?: string;
}

export default function MenuForm({ permissionId, parentId }: MenuFormProps) {
  const navigate = useNavigate();
  const [form] = Form.useForm<PermissionFormValues>();
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(permissionId);

  const parentOptions = useMemo(() => {
    const flat = flattenPermissions(permissions);
    const excluded = permissionId ? collectDescendantIds(flat, permissionId) : new Set<string>();
    return flat
      .filter((permission) => !excluded.has(permission.id))
      .filter((permission) => !LEAF_PERMISSION_TYPES.includes(permission.type))
      .map((permission) => ({
        label: `${permission.name} · ${permission.code}`,
        value: permission.id,
      }));
  }, [permissionId, permissions]);

  useEffect(() => {
    let active = true;

    async function loadForm() {
      setLoading(true);
      const [treeResult, permissionResult] = await Promise.allSettled([
        getRbacPermissions({ tree: true }),
        permissionId ? getRbacPermission(permissionId) : Promise.resolve(null),
      ]);
      if (!active) return;

      if (treeResult.status === 'fulfilled') {
        setPermissions(treeResult.value.data);
      }
      if (permissionResult.status === 'fulfilled' && permissionResult.value) {
        const permission = permissionResult.value;
        form.setFieldsValue({
          name: permission.name,
          code: permission.code,
          type: permission.type,
          parentId: permission.parentId,
          path: permission.path ?? '',
          icon: permission.icon ?? '',
          sort: permission.sort,
          isShow: permission.isShow,
          enable: permission.enable,
          keepAlive: permission.keepAlive,
          description: permission.description ?? '',
        });
      } else if (!permissionId) {
        form.setFieldsValue(getDefaultValues(parentId));
      }
      setLoading(false);
    }

    loadForm().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [form, parentId, permissionId]);

  const onSubmit = useLiteDebounced(async (values: PermissionFormValues) => {
    const parsed = permissionFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

    setSaving(true);
    try {
      if (permissionId) {
        await updateRbacPermission(permissionId, parsed.data);
      } else {
        await createRbacPermission(parsed.data);
      }
      // 菜单资源变了要通知外壳重建菜单，否则侧边栏还是旧的
      window.dispatchEvent(new Event(MENU_CHANGED_EVENT));
      void navigate(LIST_PATH);
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  });

  const onCancel = () => {
    void navigate(LIST_PATH);
  };

  return (
    <div className={pageCss.page}>
      <section className={pageCss.heading}>
        <div>
          <h1>{isEditing ? '编辑菜单资源' : '新建菜单资源'}</h1>
          <p>
            {isEditing
              ? '更新资源名称、层级、路由与显示状态。'
              : '创建目录、菜单或按钮级权限；按钮权限码需与接口鉴权使用的编码一致。'}
          </p>
        </div>
      </section>
      <section className={pageCss['form-panel']}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        <Form
          className={loading ? pageCss.hidden : undefined}
          form={form}
          initialValues={getDefaultValues(parentId)}
          layout="vertical"
          requiredMark="optional"
          onFinish={onSubmit}
        >
          <Form.Item
            label="权限名称"
            name="name"
            rules={[{ required: true, whitespace: true, message: '请输入权限名称' }]}
          >
            <Input maxLength={100} placeholder="例如：用户管理" />
          </Form.Item>
          <Form.Item
            label="权限编码"
            name="code"
            normalize={(value?: string) => value?.toUpperCase()}
            rules={[{ required: true, whitespace: true, message: '请输入权限编码' }]}
            extra={isEditing ? '权限编码参与接口鉴权，只有超级管理员可以修改' : undefined}
          >
            <Input maxLength={100} placeholder="例如：SYSTEM_ROLES 或 ROLE_READ" />
          </Form.Item>
          <Form.Item
            label="权限类型"
            name="type"
            rules={[{ required: true, message: '请选择权限类型' }]}
          >
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item label="上级资源" name="parentId">
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              options={parentOptions}
              placeholder="作为根资源创建"
            />
          </Form.Item>
          <Form.Item
            label="路由地址"
            name="path"
            extra="菜单填写管理端的实际页面路径，如 /system/user；按钮留空"
          >
            <Input maxLength={255} placeholder="例如：/system/user" />
          </Form.Item>
          <Form.Item label="菜单图标" name="icon">
            <Input maxLength={100} placeholder="例如：TeamOutlined" />
          </Form.Item>
          <Form.Item label="排序" name="sort" rules={[{ required: true, message: '请输入排序' }]}>
            <InputNumber
              min={0}
              precision={0}
              placeholder="数值越小越靠前"
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="是否显示" name="isShow" valuePropName="checked">
            <Switch checkedChildren="显示" unCheckedChildren="隐藏" />
          </Form.Item>
          <Form.Item label="是否启用" name="enable" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
          <Form.Item label="页面缓存" name="keepAlive" valuePropName="checked">
            <Switch checkedChildren="缓存" unCheckedChildren="不缓存" />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea maxLength={255} rows={3} showCount />
          </Form.Item>
          <div className={pageCss['form-actions']}>
            <Button onClick={onCancel}>取消</Button>
            <Button htmlType="submit" loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建资源'}
            </Button>
          </div>
        </Form>
      </section>
    </div>
  );
}
