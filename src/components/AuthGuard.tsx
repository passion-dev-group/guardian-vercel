
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [isClient, setIsClient] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!user && !isLoading && isClient && !redirectAttempted) {
      setRedirectAttempted(true);
      setShouldRedirect(true);
    }
  }, [user, isLoading, isClient, redirectAttempted]);

  if (!isClient || isLoading) {
    return <LoadingSpinner fullScreen />;
  }
  if (shouldRedirect) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  if (!user) {
    return <LoadingSpinner fullScreen />;
  }

  return <>{children}</>;
};

export default AuthGuard;
