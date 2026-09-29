import { useParams } from 'react-router';
import FormPage from './form';

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <FormPage roleId={id} />;
}
