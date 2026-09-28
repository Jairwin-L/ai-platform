import { useEffect } from 'react';
import { Alert, DatePicker, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import type { PlatformUser, PlatformUserStatusPayload } from '@/api/methods/rbac';
import type { PlatformUserStatusAction } from '@/constants/user';
import { getFormFieldErrors } from '@/utils/form';
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

  useEffect(() => {
    if (open) form.resetFields();
  }, [form, open]);

  const onFinish = (values: StatusFormValues) => {
    if (!action) return;
    const parsed = createStatusFormSchema(action.reasonRequired).safeParse(values);
    if (!parsed.success) {
      form.setFields(getFormFieldErrors(parsed.error.issues));
      return;
    }

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
          <Form.Item
            label="原因"
            name="reason"
            rules={action.reasonRequired ? [{ required: true, message: '请填写原因' }] : undefined}
            tooltip="原因会在用户登录或操作被拦截时展示给用户本人"
          >
            <Input.TextArea
              autoSize={{ minRows: 3, maxRows: 6 }}
              maxLength={255}
              placeholder={action.reasonRequired ? '必填，将展示给用户' : '选填，将展示给用户'}
              showCount
            />
          </Form.Item>
          {action.timed ? (
            <Form.Item
              label="截止时间"
              name="expiresAt"
              extra="不填写表示需要手动恢复；到期后自动恢复为正常。"
            >
              <DatePicker
                disabledDate={(date) => date.isBefore(dayjs(), 'day')}
                placeholder="选择截止时间"
                showTime
                style={{ width: '100%' }}
              />
            </Form.Item>
          ) : null}
        </Form>
      ) : null}
    </Modal>
  );
}
