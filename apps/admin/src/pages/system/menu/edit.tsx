import { useParams } from 'react-router';
import MenuForm from './form';

export default function MenuEditPage() {
  const { id } = useParams<{ id: string }>();
  return <MenuForm permissionId={id} />;
}
