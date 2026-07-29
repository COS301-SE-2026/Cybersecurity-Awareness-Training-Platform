import { Navigate, Outlet } from 'react-router-dom';
import type { UserTypeDto } from '@insightful-phish/shared';

import { useAuth } from '../context/useAuth';

type ProtectedRouteProps = Readonly<{
  requiredRole?: UserTypeDto;
  requireOrganisation?: boolean;
  requiredPermission?: string;
}>;

function ProtectedRoute({
  requiredRole,
  requireOrganisation,
  requiredPermission,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAuthLoading, authContext, permissions } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const hasRequiredRole = !requiredRole || authContext?.role === requiredRole;
  const hasRequiredOrganisation = !requireOrganisation || Boolean(authContext?.organisation?.id);
  const hasRequiredPermission = !requiredPermission || permissions.includes(requiredPermission);

  if (!hasRequiredRole || !hasRequiredOrganisation || !hasRequiredPermission) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
