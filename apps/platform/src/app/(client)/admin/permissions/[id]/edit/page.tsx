'use client';

import { useParams } from 'next/navigation';
import { PermissionFormPage } from '@/components/admin/permission-form-page';

export default function EditPermissionPage() {
  const params = useParams<{ id: string }>();

  return <PermissionFormPage permissionId={params.id} />;
}
