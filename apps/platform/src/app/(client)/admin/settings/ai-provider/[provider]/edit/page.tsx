'use client';

import { useParams } from 'next/navigation';
import { AiProviderFormPage } from '@/components/admin/ai-provider-form-page';
import styles from './page.module.scss';

export default function EditAiProviderPage() {
  const params = useParams<{ provider: string }>();

  return <AiProviderFormPage providerValue={params.provider} styles={styles} />;
}
