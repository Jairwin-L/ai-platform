'use client';

import { useSearchParams } from 'next/navigation';
import { PermissionFormPage } from '@/components/admin/permission-form-page';

export default function CreatePermissionPage() {
  const searchParams = useSearchParams();

  return <PermissionFormPage parentId={searchParams.get('parentId') ?? undefined} />;
}
