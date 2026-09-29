import { useEffect, useState } from 'react';
import { Form, Modal } from 'antd';
import { resetRbacUserPassword, type RbacUser } from '@/api/methods/rbac';
import { MODAL_OPTION } from '@/constants/antd';
import FormItems from '@/components/form-items';
import { getDisplayName } from './columns';
import { getResetPasswordItems } from './form-item-config';
import type { ResetPasswordFormValues } from './schemas';

interface ResetPasswordModalProps {
  /** 为空时弹窗关闭 */
  user: RbacUser | null;
  onClose: () => void;
}

/** 管理员重置系统用户密码：重置后该账号已登录的管理端会话全部作废 */
export default function ResetPasswordModal({ user, onClose }: ResetPasswordModalProps) {
  const [form] = Form.useForm<ResetPasswordFormValues>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) form.resetFields();
  }, [form, user]);

  const onFinish = async (values: ResetPasswordFormValues) => {
    if (!user) return;
    setSaving(true);
    try {
      await resetRbacUserPassword(user.id, values.password);
      onClose();
    } catch {
      // 接口错误已由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      destroyOnHidden
      {...MODAL_OPTION}
      cancelText="取消"
      confirmLoading={saving}
      okText="确认重置"
      open={Boolean(user)}
      title={user ? `重置密码：${getDisplayName(user)}` : '重置密码'}
      onCancel={onClose}
      onOk={() => form.submit()}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          onFinish(values).catch(() => undefined);
        }}
      >
        <FormItems items={getResetPasswordItems()} />
      </Form>
    </Modal>
  );
}
