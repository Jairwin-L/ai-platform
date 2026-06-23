'use client';

import { useParams } from 'next/navigation';
import { RoleFormPage } from '@/components/admin/role-form-page';

export default function EditRolePage() {
  const params = useParams<{ id: string }>();

  return <RoleFormPage roleId={params.id} />;
}
