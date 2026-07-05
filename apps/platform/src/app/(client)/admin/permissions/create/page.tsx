'use client';

import { useSearchParams } from 'next/navigation';
import { PermissionForm } from '@/app/(client)/admin/components/permission-form';

export default function CreatePermissionPage() {
  const searchParams = useSearchParams();

  return <PermissionForm parentId={searchParams.get('parentId') ?? undefined} />;
}
