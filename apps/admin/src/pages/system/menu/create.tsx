import { useSearchParams } from 'react-router';
import FormPage from './form';

export default function Page() {
  const [searchParams] = useSearchParams();
  return <FormPage parentId={searchParams.get('parentId') ?? undefined} />;
}
