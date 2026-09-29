import { useEffect, useMemo } from 'react';
import { Alert, Form, Modal } from 'antd';
import type { PlatformUser, PlatformUserStatusPayload } from '@/api/methods/rbac';
import { MODAL_OPTION } from '@/constants/antd';
import type { PlatformUserStatusAction } from '@/constants/user';
import FormItems from '@/components/form-items';
import { createZodFormRules } from '@/utils/zod-form-rule';
import { getFormItems } from './form-item-config';
import { createStatusFormSchema, type StatusFormValues } from './schemas';

interface StatusModalProps {
  action: PlatformUserStatusAction | null;
  saving: boolean;
  user: PlatformUser | null;
  onCancel: () => void;
  onSubmit: (payload: PlatformUserStatusPayload) => void;
}

/** 限制 / 停用 / 封禁平台用户：填写原因与可选的截止时间 */
export default function StatusModal({
  action,
  saving,
  user,
  onCancel,
  onSubmit,
}: StatusModalProps) {
  const [form] = Form.useForm<StatusFormValues>();
  const open = Boolean(action && user);
  const reasonRequired = Boolean(action?.reasonRequired);
  const getRules = useMemo(
    () => createZodFormRules(createStatusFormSchema(reasonRequired)),
    [reasonRequired],
  );

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open]);

  const onFinish = (values: StatusFormValues) => {
    if (!action) return;
    const parsed = createStatusFormSchema(action.reasonRequired).safeParse(values);
    if (!parsed.success) return;

    onSubmit({
      status: action.status,
      reason: parsed.data.reason?.trim() || null,
      expiresAt: action.timed ? (parsed.data.expiresAt?.toISOString() ?? null) : null,
    });
  };

  const displayName = user ? user.nickname || user.email : '';

  return (
    <Modal
      destroyOnHidden
      {...MODAL_OPTION}
      cancelText="取消"
      confirmLoading={saving}
      okButtonProps={{ danger: action?.danger }}
      okText={`确认${action?.action ?? ''}`}
      open={open}
      title={action && user ? `${action.action}用户：${displayName}` : '修改账号状态'}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      {action ? (
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Alert showIcon style={{ marginBottom: 16 }} title={action.description} type="warning" />
          <FormItems items={getFormItems({ action, getRules })} />
        </Form>
      ) : null}
    </Modal>
  );
}
