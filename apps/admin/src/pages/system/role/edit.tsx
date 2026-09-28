import { useParams } from 'react-router';
import RoleForm from './form';

export default function RoleEditPage() {
  const { id } = useParams<{ id: string }>();
  return <RoleForm roleId={id} />;
}
