/**
 * @file 接口地址配置。
 *       统一从环境变量读取 db-service 地址；本地开发缺省走 /api，由 vite 代理转发。
 */
import { VITE_ENV } from '@/constants/env';

/** db-service 接口基址，去掉末尾斜杠后与接口路径直接拼接 */
export const BASE_API_URL: string = (VITE_ENV.VITE_BASE_API_URL || '/api').replace(/\/+$/, '');
