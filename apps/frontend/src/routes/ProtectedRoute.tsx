import { Navigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

type Props = {
  children: React.ReactNode;
};

function ProtectedRoute({ children }: Props) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
