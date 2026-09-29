/**
 * @file 并发任务结果的取值工具。
 *       项目约定并发一律用 Promise.allSettled，由调用方按业务语义决定失败时是中断还是降级；
 *       这里只提供「这一项失败就中断」的取值方式，让调用点把这个决定写在明面上。
 */

/**
 * @func getSettledValue
 * @desc 取出 Promise.allSettled 单项的结果：成功返回值，失败原样抛出失败原因。
 *       用于缺了任何一项结果都没有意义的并发查询（如列表的总数与当页数据）。
 * @param {PromiseSettledResult<T>} result Promise.allSettled 返回数组中的一项。
 * @returns {T} 该项成功时的值。
 * @throws 该项 rejected 时抛出其失败原因。
 * @example
 * const [totalResult, listResult] = await Promise.allSettled([countQuery, listQuery]);
 * const total = getSettledValue(totalResult);
 */
export function getSettledValue<T>(result: PromiseSettledResult<T>): T {
  if (result.status === 'rejected') throw result.reason;
  return result.value;
}
