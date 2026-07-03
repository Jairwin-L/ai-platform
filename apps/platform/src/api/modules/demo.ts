import { alovaGet } from '@/api/alova';

export async function query(): Promise<string> {
  return alovaGet<string>('/demo');
}
