import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PAGE_SIZE } from '@/constants/biz';

export interface AdminTableQuery {
  page: number;
  pageSize: number;
  searchTerm: string;
}

export interface AdminTableResult<T> {
  list: T[];
  total: number;
}

interface UseTableOptions<T> {
  /** 拉取列表数据；返回 total 用于分页 */
  fetcher: (query: AdminTableQuery) => Promise<AdminTableResult<T>>;
  pageSize?: number;
  /** 除页码与关键字之外的过滤条件；值变化时回到第一页重新拉取，传入方需保证引用稳定 */
  filters?: Record<string, unknown>;
}

/**
 * 后台列表页的公共逻辑：分页、搜索、加载态、错误态，以及「操作后刷新」。
 * 成功 / 失败提示都由全局响应拦截器负责，这里只管数据。
 */
export function useTable<T>({
  fetcher,
  pageSize: initialPageSize = PAGE_SIZE,
  filters,
}: UseTableOptions<T>) {
  const [list, setList] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  /** 最近一次拉取是否失败；页面据此渲染通用异常页 */
  const [loadFailed, setLoadFailed] = useState(false);
  const filtersKey = useMemo(() => JSON.stringify(filters ?? {}), [filters]);
  const [prevFiltersKey, setPrevFiltersKey] = useState(filtersKey);
  // 只有最后发出的那次请求能写回结果：翻页、筛选切得快时，先发的请求可能后返回
  const latestRequestRef = useRef(0);

  // 过滤条件变化时在渲染期间就回到第一页，避免先按「旧页码 + 新条件」多拉一次
  if (filtersKey !== prevFiltersKey) {
    setPrevFiltersKey(filtersKey);
    setPage(1);
  }

  const reload = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isLatest = () => requestId === latestRequestRef.current;

    setLoading(true);
    setLoadFailed(false);
    try {
      const result = await fetcher({ page, pageSize, searchTerm });
      if (!isLatest()) return;
      setList(result.list);
      setTotal(result.total);
    } catch {
      if (!isLatest()) return;
      setList([]);
      setTotal(0);
      setLoadFailed(true);
    } finally {
      if (isLatest()) setLoading(false);
    }
  }, [fetcher, page, pageSize, searchTerm]);

  useEffect(() => {
    reload().catch(() => undefined);
  }, [reload]);

  const submitSearch = useCallback((value: string) => {
    setPage(1);
    setSearchTerm(value.trim());
  }, []);

  const changePagination = useCallback(
    (nextPage: number, nextPageSize: number) => {
      if (nextPageSize !== pageSize) {
        setPageSize(nextPageSize);
        setPage(1);
        return;
      }
      setPage(nextPage);
    },
    [pageSize],
  );

  /** 执行一次会改动数据的操作，成功后自动刷新列表；返回是否成功 */
  const runAction = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        await reload();
        return true;
      } catch {
        return false;
      }
    },
    [reload],
  );

  return {
    list,
    total,
    page,
    pageSize,
    loading,
    loadFailed,
    searchInput,
    setSearchInput,
    submitSearch,
    changePagination,
    reload,
    runAction,
  };
}
