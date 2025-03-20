import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/utils/supa';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Loader, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';

export default function TwoFactorResetPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuthAndReset = async () => {
      try {
        // Parse the URL fragment
        const hashParams = new URLSearchParams(location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        // If we have tokens from the URL, set them
        if (accessToken && refreshToken) {
          const { data: { session }, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (setSessionError) throw setSessionError;
          if (!session?.user?.email) {
            throw new Error('Authentication failed');
          }

          // Get user data and verify reset token
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('two_factor_reset_token, two_factor_reset_expires')
            .eq('email', session.user.email)
            .single();

          if (userError) throw userError;
          if (!userData?.two_factor_reset_token || !userData?.two_factor_reset_expires) {
            throw new Error('No valid reset token found');
          }

          // Check if token is expired
          const expiryTime = new Date(userData.two_factor_reset_expires);
          if (expiryTime < new Date()) {
            throw new Error('Reset token has expired');
          }
        } else {
          // If no tokens in URL, check for existing session
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session?.user?.email) {
            throw new Error('Invalid or expired reset link. Please request a new one.');
          }
        }

      } catch (err: any) {
        setError(err.message || 'Failed to verify reset token');
        console.error('Reset verification error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndReset();
  }, [location, navigate]);

  const handleReset = async () => {
    try {
      setIsLoading(true);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        throw new Error('No authenticated session found');
      }

      // Reset 2FA settings
      const { error: updateError } = await supabase
        .from('users')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          two_factor_reset_token: null,
          two_factor_reset_expires: null
        })
        .eq('email', session.user.email);

      if (updateError) throw updateError;

      // Show success message
      toast.success('Two-factor authentication has been reset successfully');

      // Sign out the user
      await supabase.auth.signOut();

      // Redirect to login
      navigate('/login');

    } catch (err: any) {
      setError(err.message || 'Failed to reset two-factor authentication');
      console.error('Reset error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-900" />
          <p className="text-gray-600">Verifying reset request...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive">
            {error}
          </Alert>
          <Button
            className="w-full"
            onClick={() => navigate('/login')}
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <ShieldOff className="h-16 w-16 mx-auto text-blue-900" />
        <h1 className="text-2xl font-bold text-gray-900">Reset Two-Factor Authentication</h1>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
          <p className="text-yellow-800">
            Warning: This will disable two-factor authentication for your account. 
            You will need to set it up again the next time you log in.
          </p>
        </div>

        <div className="space-y-4">
          <Button
            className="w-full bg-blue-900 hover:bg-blue-800"
            onClick={handleReset}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin h-4 w-4 mr-2" />
                Resetting...
              </>
            ) : (
              'Reset 2FA and Sign Out'
            )}
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate('/login')}
            disabled={isLoading}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
} 