import { useSearchParams } from 'react-router';
import PermissionForm from './form';

export default function PermissionCreatePage() {
  const [searchParams] = useSearchParams();
  return <PermissionForm parentId={searchParams.get('parentId') ?? undefined} />;
}
