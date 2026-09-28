import { useParams } from 'react-router';
import PermissionForm from './form';

export default function PermissionEditPage() {
  const { id } = useParams<{ id: string }>();
  return <PermissionForm permissionId={id} />;
}
