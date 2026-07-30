import { Navigate, Outlet } from 'react-router-dom';

import { useAuth } from '../context/useAuth';

type ProtectedRouteProps = {
  allowedRoles?: string[];
};

function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, isAuthLoading, authContext, user, redirectTo } = useAuth();

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
          color: '#C98FFF',
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

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = authContext?.role || user?.userType;
    if (userRole && !allowedRoles.includes(userRole)) {
      return <Navigate to={redirectTo || '/campaigns'} replace />;
    }
  }

  return <Outlet />;
}

export default ProtectedRoute;
