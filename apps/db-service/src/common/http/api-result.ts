/**
 * 控制器返回值的统一载体。
 *
 * Nest 的控制器返回普通对象时无法同时表达「业务 message」与「HTTP 状态码」，
 * 这里用一个显式载体带上这两项，再由 ResponseInterceptor 组装成与迁移前 Next 版本
 * 完全一致的响应体（code / success / message / data / timestamp）。
 */
export class ApiResult<T> {
  constructor(
    readonly data: T,
    readonly message: string,
    readonly code: number,
  ) {}
}

/** 创建成功响应 */
export function success<T>(data: T, message = '操作成功', code = 200): ApiResult<T> {
  return new ApiResult(data, message, code);
}

export interface PaginatedPayload<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** 创建分页响应 */
export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  message = '查询成功',
): ApiResult<PaginatedPayload<T>> {
  return new ApiResult({ data, total, page, pageSize }, message, 200);
}
