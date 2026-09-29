import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Table } from 'antd';
import { ApiOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import { PERMISSION_CODE } from '@ai/constants/permissions';
import {
  deleteThirdPartyServiceOption,
  getThirdPartyServiceOptions,
  updateThirdPartyServiceOption,
  type ThirdPartyServiceOption,
} from '@/api/methods/settings';
import { usePermission, useTableScrollHeight } from '@/hooks';
import Exception from '@/components/exception';
import css from '@/components/resource-page/index.module.scss';
import { getColumns } from './columns';

/** 服务数量有限、接口一次返回全部，搜索在前端完成 */
function filterOptions(
  options: ThirdPartyServiceOption[],
  searchTerm: string,
): ThirdPartyServiceOption[] {
  const keyword = searchTerm.trim().toLowerCase();
  if (!keyword) return options;

  return options.filter((option) =>
    [option.value, option.label, option.apiKeyUrl ?? ''].some((value) =>
      value.toLowerCase().includes(keyword),
    ),
  );
}

export default function Page() {
  const navigate = useNavigate();
  const can = usePermission();
  // 只读账号能看列表，但新增、编辑、启停、删除都要 THIRD_PARTY_SERVICE_WRITE
  const canWrite = can(PERMISSION_CODE.OPERATION.THIRD_PARTY_SERVICE.WRITE);
  const { scrollY, tableRef } = useTableScrollHeight();
  const [options, setOptions] = useState<ThirdPartyServiceOption[]>([]);
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
      setOptions(await getThirdPartyServiceOptions());
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

  const onToggleEnabled = async (option: ThirdPartyServiceOption, enabled: boolean) => {
    setUpdating(option.value);
    try {
      const next = await updateThirdPartyServiceOption(option.value, { ...option, enabled });
      setOptions((current) => current.map((item) => (item.value === option.value ? next : item)));
    } catch {
      // 接口错误已由全局响应拦截器提示
    } finally {
      setUpdating(null);
    }
  };

  const onRemove = async (option: ThirdPartyServiceOption) => {
    try {
      await deleteThirdPartyServiceOption(option.value);
      setOptions((current) => current.filter((item) => item.value !== option.value));
    } catch {
      // 接口错误已由全局响应拦截器提示
    }
  };

  const onEdit = (option: ThirdPartyServiceOption) => {
    void navigate(`/system/third-party-service/edit/${encodeURIComponent(option.value)}`);
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
            <ApiOutlined /> 第三方服务
          </h1>
          <p>配置用户第三方服务 API 凭据页面可选择的服务。</p>
        </div>
        {canWrite ? (
          <Button
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => navigate('/system/third-party-service/create')}
          >
            新增服务
          </Button>
        ) : null}
      </section>

      <section className={css.panel}>
        <div className={css.filters}>
          <Input.Search
            allowClear
            className={css.search}
            enterButton={<SearchOutlined />}
            placeholder="按标识、名称或 API Key 链接搜索"
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
          <Table<ThirdPartyServiceOption>
            rowKey="value"
            columns={columns}
            dataSource={filteredOptions}
            loading={loading}
            pagination={false}
            scroll={{ x: 900, y: scrollY }}
          />
        </div>
      </section>
    </main>
  );
}
