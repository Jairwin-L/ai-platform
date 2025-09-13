import { query } from '@/services/demo';
import Button from './button';

export default async function Page() {
  const response = await query();

  return (
    <div>
      <h1>demo page - · - {response.data}</h1>
      <Button />
    </div>
  );
}
