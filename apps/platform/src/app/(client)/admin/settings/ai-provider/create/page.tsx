'use client';

import { AiProviderForm } from '@/app/(client)/admin/components/ai-provider-form';
import styles from './page.module.scss';

export default function CreateAiProviderPage() {
  return <AiProviderForm styles={styles} />;
}
