'use client';

// Imports
// ========================================================
import { useEffect, useState } from 'react';

// Page
// ========================================================
export default function ClientSideOnly({ children }: IComponent.ChildrenProps) {
  // State / Props
  const [hasMounted, setHasMounted] = useState(false);

  // Hooks
  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Render
  if (!hasMounted) return null;

  return <>{children}</>;
}
