import { DatePicker, Input, type FormRule } from 'antd';
import dayjs from 'dayjs';
import type { FormItemConfig } from '@/components/form-items';
import { DATE_FORMAT } from '@/constants/biz';
import type { PlatformUserStatusAction } from '@/constants/user';
import type { StatusFormValues } from './schemas';

/** 表单项要用到的、页面在运行时才拿得到的处置类型与校验规则 */
interface FormModel {
  action: PlatformUserStatusAction;
  /** 由 createStatusFormSchema 按「原因是否必填」现场生成 */
  getRules: (name: string) => FormRule[];
}

/** 限制 / 停用 / 封禁弹窗的字段配置；只有支持定时的处置才出现截止时间 */
export function getFormItems({
  action,
  getRules,
}: FormModel): Array<FormItemConfig<keyof StatusFormValues>> {
  const expiresAtItems: Array<FormItemConfig<keyof StatusFormValues>> = action.timed
    ? [
        {
          label: '截止时间',
          name: 'expiresAt',
          extra: '不填写表示需要手动恢复；到期后自动恢复为正常。',
          rules: getRules('expiresAt'),
          component: (
            <DatePicker
              disabledDate={(date) => date.isBefore(dayjs(), 'day')}
              format={DATE_FORMAT.Y_M_D_H_M_S}
              placeholder="选择截止时间"
              showTime
              style={{ width: '100%' }}
            />
          ),
        },
      ]
    : [];

  return [
    {
      label: '原因',
      name: 'reason',
      required: action.reasonRequired,
      rules: getRules('reason'),
      tooltip: '原因会在用户登录或操作被拦截时展示给用户本人',
      component: (
        <Input.TextArea
          autoSize={{ minRows: 3, maxRows: 6 }}
          maxLength={255}
          placeholder={action.reasonRequired ? '必填，将展示给用户' : '选填，将展示给用户'}
          showCount
        />
      ),
    },
    ...expiresAtItems,
  ];
}
