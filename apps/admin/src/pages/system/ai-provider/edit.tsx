import { useParams } from 'react-router';
import AiProviderForm from './form';

export default function AiProviderEditPage() {
  const { value } = useParams<{ value: string }>();
  return <AiProviderForm providerValue={value} />;
}
