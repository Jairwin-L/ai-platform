import { useEffect, useState } from 'react';
import { Form, Input, Modal } from 'antd';
import { resetRbacUserPassword, type RbacUser } from '@/api/methods/rbac';
import { getFormFieldErrors } from '@/utils/form';
import { getDisplayName } from './columns';
import { resetPasswordFormSchema, type ResetPasswordFormValues } from './schemas';

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
    const parsed = resetPasswordFormSchema.safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

    setSaving(true);
    try {
      await resetRbacUserPassword(user.id, parsed.data.password);
      onClose();
    } catch {
      // 请求错误由全局响应拦截器提示
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      destroyOnHidden
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
        <Form.Item
          label="新密码"
          name="password"
          rules={[{ required: true, message: '请输入新密码' }]}
        >
          <Input.Password autoComplete="new-password" maxLength={128} placeholder="至少 6 位" />
        </Form.Item>
        <Form.Item
          dependencies={['password']}
          label="确认密码"
          name="confirmPassword"
          rules={[{ required: true, message: '请再次输入新密码' }]}
        >
          <Input.Password autoComplete="new-password" maxLength={128} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
