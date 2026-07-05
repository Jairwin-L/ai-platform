'use client';

import { useParams } from 'next/navigation';
import { AiProviderForm } from '@/app/(client)/admin/components/ai-provider-form';
import styles from './page.module.scss';

export default function EditAiProviderPage() {
  const params = useParams<{ provider: string }>();

  return <AiProviderForm providerValue={params.provider} styles={styles} />;
}
