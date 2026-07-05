'use client';

import { useParams } from 'next/navigation';
import { PermissionForm } from '@/app/(client)/admin/components/permission-form';

export default function EditPermissionPage() {
  const params = useParams<{ id: string }>();

  return <PermissionForm permissionId={params.id} />;
}
