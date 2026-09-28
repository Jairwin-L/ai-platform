import { useSearchParams } from 'react-router';
import MenuForm from './form';

export default function MenuCreatePage() {
  const [searchParams] = useSearchParams();
  return <MenuForm parentId={searchParams.get('parentId') ?? undefined} />;
}
