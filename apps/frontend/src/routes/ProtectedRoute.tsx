import { Navigate, Outlet } from 'react-router-dom';
import type { UserTypeDto, AuthContextDto } from '@insightful-phish/shared';

import { useAuth } from '../context/useAuth';

type ProtectedRouteProps = Readonly<{
  requiredRole?: UserTypeDto;
  allowedRoles?: readonly UserTypeDto[];
  requireOrganisation?: boolean;
  requiredPermission?: string;
  redirectTo?: string;
}>;

function getDefaultRedirect(
  userRole?: UserTypeDto | null,
  authContext?: AuthContextDto | null,
): string {
  if (authContext?.redirectTo) {
    if (
      userRole === 'ORGANISATION_ADMIN' &&
      !authContext.organisation?.id &&
      authContext.redirectTo.startsWith('/organisation')
    ) {
      return '/';
    }
    return authContext.redirectTo;
  }

  if (userRole === 'IP_ADMIN') {
    return '/platform-administrators';
  }

  if (userRole === 'ORGANISATION_ADMIN') {
    return authContext?.organisation?.id ? '/organisation-information' : '/';
  }

  if (userRole === 'ORGANISATION_TRAINEE' || userRole === 'GENERAL_TRAINEE') {
    return '/campaigns';
  }

  return '/';
}

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

  const hasRequiredRole = !requiredRole || userRole === requiredRole;
  const hasAllowedRole =
    !allowedRoles ||
    allowedRoles.length === 0 ||
    (Boolean(userRole) && allowedRoles.includes(userRole!));
  const hasRequiredOrganisation = !requireOrganisation || Boolean(authContext?.organisation?.id);
  const hasRequiredPermission = !requiredPermission || permissions.includes(requiredPermission);

  const fallbackRedirect = redirectTo ?? getDefaultRedirect(userRole, authContext);

  if (!hasRequiredRole || !hasAllowedRole || !hasRequiredOrganisation || !hasRequiredPermission) {
    return <Navigate to={fallbackRedirect} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
