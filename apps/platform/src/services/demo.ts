import { alovaGet } from '@/utils/alova';

export interface DemoResponse {
  data: string;
}

export async function query(): Promise<DemoResponse> {
  const response = await alovaGet('/demo');
  return response as DemoResponse;
}
