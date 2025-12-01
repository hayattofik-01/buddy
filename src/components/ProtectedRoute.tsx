import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (loading) return;

      if (!user) {
        navigate('/auth');
        return;
      }

      // Skip profile check if already on onboarding page
      if (location.pathname === '/onboarding') {
        setCheckingProfile(false);
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('date_of_birth, name')
          .eq('id', user.id)
          .maybeSingle();

        // Redirect to onboarding if profile is incomplete (only for authenticated users)
        if (!profile?.date_of_birth || !profile?.name) {
          navigate('/onboarding', { replace: true });
        } else {
          setCheckingProfile(false);
        }
      } catch (error) {
        console.error('Error checking profile:', error);
        setCheckingProfile(false);
      }
    };

    checkProfileCompletion();
  }, [user, loading, navigate, location.pathname]);

  if (loading || checkingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <>{children}</> : null;
};

export default ProtectedRoute;
