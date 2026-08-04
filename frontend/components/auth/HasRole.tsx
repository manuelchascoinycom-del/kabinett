// components/auth/HasRole.tsx
'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';

interface HasRoleProps {
  children: React.ReactNode;
  allowedRoles?: string | string[];
  canEdit?: boolean;
  canDelete?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Componente helper para renderizado condicional basado en roles y permisos.
 */
export const HasRole: React.FC<HasRoleProps> = ({
  children,
  allowedRoles,
  canEdit: checkEdit,
  canDelete: checkDelete,
  fallback = null,
}) => {
  const { hasRole, canEdit, canDelete, isLoading } = useAuth();

  if (isLoading) return null;

  let isAllowed = true;

  if (allowedRoles) {
    isAllowed = isAllowed && hasRole(allowedRoles);
  }

  if (checkEdit) {
    isAllowed = isAllowed && canEdit();
  }

  if (checkDelete) {
    isAllowed = isAllowed && canDelete();
  }

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};