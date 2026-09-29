import { useParams } from 'react-router';
import FormPage from './form';

export default function Page() {
  const { value } = useParams<{ value: string }>();
  return <FormPage serviceValue={value} />;
}
