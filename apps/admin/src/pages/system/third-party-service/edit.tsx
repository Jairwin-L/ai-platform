import { useParams } from 'react-router';
import ThirdPartyServiceForm from './form';

export default function ThirdPartyServiceEditPage() {
  const { value } = useParams<{ value: string }>();
  return <ThirdPartyServiceForm serviceValue={value} />;
}
