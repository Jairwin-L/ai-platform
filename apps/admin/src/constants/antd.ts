/** 列表筛选下拉：可清空，按 label 搜索；未选中即不按该条件筛选 */
export const SELECT_OPTION = {
  allowClear: true,
  showSearch: { optionFilterProp: 'label' },
};

/** 表单弹窗：禁止 Esc / 点遮罩误关，已填内容不会因误触丢失 */
export const MODAL_OPTION = {
  centered: true,
  forceRender: true,
  keyboard: false,
  maskClosable: false,
} as const;
