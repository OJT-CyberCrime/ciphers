import { ReactNode, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { supabase } from './supa';
import Cookies from 'js-cookie';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const isLoggedIn = !!Cookies.get('user_token'); // Check if user token exists

  useEffect(() => {
    const checkAuth = async () => {
      const userToken = Cookies.get('user_token');
      const userData = Cookies.get('user_data');
      
      if (!userToken || !userData) {
        // No token or user data found, redirect to login
        navigate('/login');
        return;
      }

      // Verify with Supabase if the session is still valid
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        // Clear cookies if session is invalid
        Cookies.remove('user_token');
        Cookies.remove('user_data');
        navigate('/login');
        return;
      }
    };

    checkAuth();
  }, [navigate]);

  return isLoggedIn ? <>{children}</> : <Navigate to="/login" />;
};

export default ProtectedRoute; 