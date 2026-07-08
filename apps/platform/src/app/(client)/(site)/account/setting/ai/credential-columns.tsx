import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Tag, Tooltip, type TableColumnsType } from 'antd';
import type {
  AiCredential,
  AiCredentialProvider,
  AiCredentialStatus,
  AiProviderOption,
} from '@/api/modules/ai-credentials';
import styles from './page.module.scss';

const statusOptions: Array<{ color: string; label: string; value: AiCredentialStatus }> = [
  { color: 'success', label: '可用', value: 'active' },
  { color: 'warning', label: '已禁用', value: 'disabled' },
  { color: 'error', label: '已过期', value: 'expired' },
  { color: 'error', label: '无效', value: 'invalid' },
];

interface AiCredentialColumnsInput {
  deletingId: string | null;
  providerOptions: AiProviderOption[];
  onDeleteConfirm: (credential: AiCredential) => Promise<void>;
  onOverwriteClick: (credential: AiCredential) => void;
}

function getProviderOption(providerOptions: AiProviderOption[], provider: AiCredentialProvider) {
  return providerOptions.find((item) => item.value === provider);
}

function getStatusOption(status: AiCredentialStatus) {
  return statusOptions.find((item) => item.value === status);
}

function formatDate(value?: string): string {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) {
    return '已过期';
  }

  const days = Math.floor(seconds / 86400);

  if (days >= 1) {
    return `${days} 天`;
  }

  const hours = Math.floor(seconds / 3600);

  if (hours >= 1) {
    return `${hours} 小时`;
  }

  const minutes = Math.max(1, Math.floor(seconds / 60));

  return `${minutes} 分钟`;
}

export function buildAiCredentialColumns({
  deletingId,
  providerOptions,
  onDeleteConfirm,
  onOverwriteClick,
}: AiCredentialColumnsInput): TableColumnsType<AiCredential> {
  return [
    {
      title: '密钥',
      key: 'label',
      width: 260,
      fixed: 'left',
      render: (_, credential) => (
        <div className={styles['credential-title']}>
          <strong>{credential.label}</strong>
          <span className={styles.code}>{credential.keyHint}</span>
        </div>
      ),
    },
    {
      title: 'Provider',
      dataIndex: 'provider',
      width: 140,
      render: (provider: AiCredentialProvider) => {
        const option = getProviderOption(providerOptions, provider);

        return <Tag>{option?.label ?? provider}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 112,
      render: (status: AiCredentialStatus) => {
        const option = getStatusOption(status);

        return <Tag color={option?.color ?? 'default'}>{option?.label ?? status}</Tag>;
      },
    },
    {
      title: '剩余有效期',
      dataIndex: 'remainingSeconds',
      width: 136,
      render: (seconds: number) => (
        <span className={styles.muted}>{formatRemainingTime(seconds)}</span>
      ),
    },
    {
      title: '过期时间',
      dataIndex: 'expiresAt',
      width: 180,
      render: (value: string) => <span className={styles.muted}>{formatDate(value)}</span>,
    },
    {
      title: '最近使用',
      dataIndex: 'lastUsedAt',
      width: 180,
      render: (value?: string) => <span className={styles.muted}>{formatDate(value)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 112,
      fixed: 'right',
      render: (_, credential) => (
        <div className={styles.actions}>
          <Tooltip title="覆盖密钥">
            <Button
              aria-label={`覆盖 ${credential.label}`}
              icon={<EditOutlined />}
              size="small"
              type="text"
              onClick={() => onOverwriteClick(credential)}
            />
          </Tooltip>
          <Popconfirm
            cancelText="取消"
            description="删除后需要重新保存密钥才能继续使用。"
            okText="删除"
            okType="danger"
            title={`删除“${credential.label}”吗？`}
            onConfirm={async () => {
              await onDeleteConfirm(credential);
            }}
          >
            <Button
              aria-label={`删除 ${credential.label}`}
              danger
              icon={<DeleteOutlined />}
              loading={deletingId === credential.credentialId}
              size="small"
              type="text"
            />
          </Popconfirm>
        </div>
      ),
    },
  ];
}
