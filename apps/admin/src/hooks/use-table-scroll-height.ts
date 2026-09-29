import { useCallback, useLayoutEffect, useState } from 'react';

const MIN_SCROLL_HEIGHT = 160;

/**
 * 量出内容区留给表体的高度上限：行数撑满时表头固定、只有表体滚动，行数少时表体按内容收缩。
 *
 * antd 的 `scroll.y` 只接受具体像素值，拿不到「剩余空间」这种相对值，
 * 因此这里手动量一次内容区底部与表格顶部的距离。
 *
 * 表格容器用 state 存而不是 ref：异常页重试后表格是新挂载的节点，
 * 只有让副作用随节点变化重跑，ResizeObserver 才会盯到新节点上。
 */
export function useTableScrollHeight() {
  const [tableElement, setTableElement] = useState<HTMLDivElement | null>(null);
  const [scrollY, setScrollY] = useState(MIN_SCROLL_HEIGHT);

  const updateScrollHeight = useCallback(() => {
    const mainElement = tableElement?.closest<HTMLElement>('.table-layout-main');
    if (!tableElement || !mainElement) return;

    const mainStyle = window.getComputedStyle(mainElement);
    const headerElement =
      tableElement.querySelector<HTMLElement>('.ant-table-header') ||
      tableElement.querySelector<HTMLElement>('.ant-table-thead');
    const paginationElement = tableElement.querySelector<HTMLElement>('.ant-pagination');
    const paginationStyle = paginationElement && window.getComputedStyle(paginationElement);
    const paginationHeight =
      (paginationElement?.getBoundingClientRect().height || 0) +
      Number.parseFloat(paginationStyle?.marginTop || '0') +
      Number.parseFloat(paginationStyle?.marginBottom || '0');
    const contentBottom =
      mainElement.getBoundingClientRect().bottom -
      Number.parseFloat(mainStyle.paddingBottom || '0');
    const availableHeight =
      contentBottom -
      tableElement.getBoundingClientRect().top -
      (headerElement?.getBoundingClientRect().height || 0) -
      paginationHeight;

    setScrollY((currentHeight) => {
      const nextHeight = Math.max(MIN_SCROLL_HEIGHT, Math.floor(availableHeight));
      return Math.abs(nextHeight - currentHeight) > 1 ? nextHeight : currentHeight;
    });
  }, [tableElement]);

  useLayoutEffect(() => {
    const mainElement = tableElement?.closest<HTMLElement>('.table-layout-main');
    if (!tableElement || !mainElement) return;

    const observer = new ResizeObserver(updateScrollHeight);
    observer.observe(tableElement);
    observer.observe(mainElement);
    window.addEventListener('resize', updateScrollHeight);
    const frameId = window.requestAnimationFrame(updateScrollHeight);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updateScrollHeight);
      observer.disconnect();
    };
  }, [tableElement, updateScrollHeight]);

  return { scrollY, tableRef: setTableElement };
}
