import { alovaGet } from '@/utils/alova';

export async function query() {
  const response = await alovaGet('/demo');
  return response;
}
