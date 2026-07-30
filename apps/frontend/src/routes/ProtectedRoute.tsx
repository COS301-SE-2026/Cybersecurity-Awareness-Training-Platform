import { Navigate, Outlet } from 'react-router-dom';
import type { UserTypeDto } from '@insightful-phish/shared';

import { useAuth } from '../context/useAuth';

type ProtectedRouteProps = Readonly<{
  requiredRole?: UserTypeDto;
  allowedRoles?: readonly UserTypeDto[];
  requireOrganisation?: boolean;
  requiredPermission?: string;
  redirectTo?: string;
}>;

function ProtectedRoute({
  requiredRole,
  allowedRoles,
  requireOrganisation,
  requiredPermission,
  redirectTo,
}: ProtectedRouteProps) {
  const { isAuthenticated, isAuthLoading, authContext, permissions, user } = useAuth();

  if (isAuthLoading) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0E0020',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgb(201, 143, 255)',
          fontFamily: 'Jost',
          fontSize: '1.5rem',
        }}
      >
        Loading current user...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const userRole = authContext?.role ?? user?.userType;

  const hasRequiredRole = !requiredRole || authContext?.role === requiredRole;
  const hasRequiredOrganisation = !requireOrganisation || Boolean(authContext?.organisation?.id);
  const hasRequiredPermission = !requiredPermission || permissions.includes(requiredPermission);

  if (!hasRequiredRole || !hasRequiredOrganisation || !hasRequiredPermission) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to={redirectTo ?? '/campaigns'} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
