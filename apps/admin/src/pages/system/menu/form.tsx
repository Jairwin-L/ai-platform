import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Form, Skeleton } from 'antd';
import { ArrowLeftOutlined, MenuOutlined, SaveOutlined } from '@ant-design/icons';
import {
  createRbacPermission,
  getRbacPermission,
  getRbacPermissions,
  updateRbacPermission,
  type RbacPermission,
} from '@/api/methods/rbac';
import { MENU_CHANGED_EVENT } from '@/layout/menus';
import FormItems from '@/components/form-items';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { getDefaultValues, getFormItems, getParentOptions } from './form-item-config';
import { permissionFormSchema, type PermissionFormValues } from './schemas';

const MENU_LIST_PATH = '/system/menu';

interface FormPageProps {
  permissionId?: string;
  parentId?: string;
}

export default function FormPage({ permissionId, parentId }: FormPageProps) {
  const navigate = useNavigate();
  const [form] = Form.useForm<PermissionFormValues>();
  const [permissions, setPermissions] = useState<RbacPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const isEditing = Boolean(permissionId);

  const parentOptions = useMemo(
    () => getParentOptions(permissions, permissionId),
    [permissionId, permissions],
  );
  const formItems = useMemo(
    () => getFormItems({ isEditing, parentOptions }),
    [isEditing, parentOptions],
  );

  const loadForm = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);

    const [treeResult, permissionResult] = await Promise.allSettled([
      getRbacPermissions({ tree: true }),
      permissionId ? getRbacPermission(permissionId) : Promise.resolve(null),
    ]);

    if (treeResult.status === 'fulfilled') {
      setPermissions(treeResult.value.data);
    } else {
      setLoadFailed(true);
    }

    if (!permissionId) {
      form.setFieldsValue(getDefaultValues(parentId));
      setLoading(false);
      return;
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
    } else {
      setLoadFailed(true);
    }

    setLoading(false);
  }, [form, parentId, permissionId]);

  useEffect(() => {
    loadForm().catch(() => undefined);
  }, [loadForm]);

  const onBackToMenus = () => {
    void navigate(MENU_LIST_PATH);
  };

  const onFinish = async (values: PermissionFormValues) => {
    // 字段规则已逐项校验过，这里再整体解析一次拿到归一化后的提交值（空串转 null 等）
    const parsed = permissionFormSchema.safeParse(values);
    if (!parsed.success) return;

    setSaving(true);
    try {
      if (permissionId) {
        await updateRbacPermission(permissionId, parsed.data);
      } else {
        await createRbacPermission(parsed.data);
      }
      // 菜单资源变了要通知外壳重建菜单，否则侧边栏还是旧的
      window.dispatchEvent(new Event(MENU_CHANGED_EVENT));
      onBackToMenus();
    } catch {
      // 接口错误已由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  };

  if (loadFailed) return <Exception onClick={loadForm} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <Button icon={<ArrowLeftOutlined />} type="text" onClick={onBackToMenus}>
            返回菜单列表
          </Button>
          <h1>
            <MenuOutlined /> {isEditing ? '编辑菜单资源' : '新建菜单资源'}
          </h1>
          <p>
            {isEditing
              ? '更新资源名称、层级、路由与显示状态。'
              : '创建目录、菜单或按钮级权限；按钮权限码需与接口鉴权使用的编码一致。'}
          </p>
        </div>
      </section>

      <section className={css.panel}>
        {loading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        <Form
          className={loading ? css.hidden : undefined}
          form={form}
          initialValues={getDefaultValues(parentId)}
          layout="vertical"
          onFinish={onFinish}
        >
          <div className={css['form-grid']}>
            <FormItems items={formItems} />
          </div>
          <div className={css['form-actions']}>
            <Button onClick={onBackToMenus}>取消</Button>
            <Button htmlType="submit" icon={<SaveOutlined />} loading={saving} type="primary">
              {isEditing ? '保存更改' : '创建资源'}
            </Button>
          </div>
        </Form>
      </section>
    </main>
  );
}
