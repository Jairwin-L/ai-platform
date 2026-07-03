import { alovaGet } from '@/utils/alova';

export async function query(): Promise<string> {
  return alovaGet<string>('/api/demo');
}
