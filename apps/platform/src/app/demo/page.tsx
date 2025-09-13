import { query } from '@/services/demo';
import Button from './button';

export default async function Page() {
  const response = await query();
  const nodeEnv = process.env.NODE_ENV;
  const appEnv = process.env.APP_ENV;
  console.log(`Page.nodeEnv----->：`, nodeEnv);
  console.log(`Page.appEnv----->：`, appEnv);
  const baseURL = process.env.NEXT_PUBLIC_API_URL!;
  console.log(`Page.baseURL----->：`, baseURL);

  return (
    <div>
      <h1>demo page - · - {response.data}</h1>
      <Button />
    </div>
  );
}
