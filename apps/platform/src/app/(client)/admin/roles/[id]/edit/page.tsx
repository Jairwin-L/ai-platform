'use client';

import { useParams } from 'next/navigation';
import { RoleForm } from '@/app/(client)/admin/components/role-form';

export default function EditRolePage() {
  const params = useParams<{ id: string }>();

  return <RoleForm roleId={params.id} />;
}
