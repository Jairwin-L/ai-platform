import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Table } from 'antd';
import { PlusOutlined, ReloadOutlined, RobotOutlined, SearchOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  deleteAiProviderOption,
  getAiProviderOptions,
  updateAiProviderOption,
  type AiProviderOption,
} from '@/api/methods/settings';
import { usePermission, useTableScrollHeight } from '@/hooks';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { getColumns } from './columns';

/** Provider 数量有限、接口一次返回全部，搜索在前端完成 */
function filterOptions(options: AiProviderOption[], searchTerm: string): AiProviderOption[] {
  const keyword = searchTerm.trim().toLowerCase();
  if (!keyword) return options;

  return options.filter((option) =>
    [option.value, option.label, option.protocol, option.chatBaseUrl, ...option.models].some(
      (value) => value.toLowerCase().includes(keyword),
    ),
  );
}

export default function Page() {
  const navigate = useNavigate();
  const can = usePermission();
  // 只读账号能看列表，但新增、编辑、启停、删除都要 AI_PROVIDER_WRITE
  const canWrite = can(PERMISSION_CODE.OPERATION.AI_PROVIDER.WRITE);
  const { scrollY, tableRef } = useTableScrollHeight();
  const [options, setOptions] = useState<AiProviderOption[]>([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const filteredOptions = useMemo(() => filterOptions(options, searchTerm), [options, searchTerm]);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const response = await getAiProviderOptions();
      setOptions(response.data ?? []);
    } catch {
      setOptions([]);
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions().catch(() => undefined);
  }, [loadOptions]);

  const onToggleEnabled = async (option: AiProviderOption, enabled: boolean) => {
    setUpdating(option.value);
    try {
      const response = await updateAiProviderOption(option.value, { ...option, enabled });
      const next = response.data ?? { ...option, enabled };
      setOptions((current) => current.map((item) => (item.value === option.value ? next : item)));
    } catch {
      // 接口错误已由全局响应拦截器提示
    } finally {
      setUpdating(null);
    }
  };

  const onRemove = async (option: AiProviderOption) => {
    try {
      await deleteAiProviderOption(option.value);
      setOptions((current) => current.filter((item) => item.value !== option.value));
    } catch {
      // 接口错误已由全局响应拦截器提示
    }
  };

  const onEdit = (option: AiProviderOption) => {
    void navigate(`/system/ai-provider/edit/${encodeURIComponent(option.value)}`);
  };

  const onSearch = (value: string) => {
    setSearchTerm(value.trim());
  };

  const columns = getColumns({ canWrite, updating, onEdit, onRemove, onToggleEnabled });

  if (loadFailed) return <Exception onClick={loadOptions} />;

  return (
    <main className={css.page}>
      <section className={css.heading}>
        <div>
          <h1>
            <RobotOutlined /> AI Provider
          </h1>
          <p>配置用户 AI 密钥页面可选择的 Provider。</p>
        </div>
        {canWrite ? (
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => navigate('/system/ai-provider/create')}
          >
            新增 Provider
          </Button>
        ) : null}
      </section>

      <section className={css.panel}>
        <div className={css.filters}>
          <Input.Search
            allowClear
            className={css.search}
            enterButton={<SearchOutlined />}
            placeholder="按标识、名称、协议、模型或调用地址搜索"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={onSearch}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              loadOptions().catch(() => undefined);
            }}
          >
            刷新
          </Button>
        </div>
        <div ref={tableRef} className="table-viewport">
          <Table<AiProviderOption>
            rowKey="value"
            columns={columns}
            dataSource={filteredOptions}
            loading={loading}
            pagination={false}
            scroll={{ x: 1100, y: scrollY }}
          />
        </div>
      </section>
    </main>
  );
}
