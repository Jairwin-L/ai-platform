'use client';

import { useParams } from 'next/navigation';
import { ThirdPartyServiceForm } from '@/app/(client)/admin/components/third-party-service-form';
import styles from './page.module.scss';

export default function EditThirdPartyServicePage() {
  const params = useParams<{ service: string }>();

  return <ThirdPartyServiceForm serviceValue={params.service} styles={styles} />;
}
