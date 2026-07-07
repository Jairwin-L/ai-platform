'use client';

import { Input, Modal } from 'antd';
import { MODAL_OPTION } from '@/constants/antd';

interface RenameConversationModalProps {
  open: boolean;
  value: string;
  onCancel: () => void;
  onOk: () => void;
  onValueChange: (value: string) => void;
}

export function RenameConversationModal({
  open,
  value,
  onCancel,
  onOk,
  onValueChange,
}: RenameConversationModalProps) {
  return (
    <Modal
      {...MODAL_OPTION}
      okText="保存"
      cancelText="取消"
      open={open}
      title="重命名会话"
      onCancel={onCancel}
      onOk={onOk}
    >
      <Input value={value} onChange={(event) => onValueChange(event.target.value)} />
    </Modal>
  );
}
