import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Loader, Mail } from 'lucide-react';
import { supabase } from '@/utils/supa';
import HCaptcha from "@hcaptcha/react-hcaptcha";

interface TwoFactorResetProps {
  onCancel: () => void;
}

export default function TwoFactorReset({ onCancel }: TwoFactorResetProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (!captchaToken) {
      setError('Please complete the captcha verification');
      setIsLoading(false);
      return;
    }

    try {
      // First, verify the email exists in our system
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, email, two_factor_enabled')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        setError('Email not found in our system.');
        return;
      }

      if (!userData.two_factor_enabled) {
        setError('Two-factor authentication is not enabled for this account.');
        return;
      }

      // Generate a reset token
      const resetToken = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
      const expiryTime = new Date();
      expiryTime.setHours(expiryTime.getHours() + 2); // Token expires in 2 hours

      // Store the reset token
      const { error: updateError } = await supabase
        .from('users')
        .update({
          two_factor_reset_token: resetToken,
          two_factor_reset_expires: expiryTime.toISOString()
        })
        .eq('email', email);

      if (updateError) throw updateError;

      // Send magic link email
      const emailRedirectTo = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const { error: emailError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${emailRedirectTo}/2fa-reset`,
          shouldCreateUser: false,
          captchaToken
        }
      });

      if (emailError) throw emailError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
      if (captchaRef.current) {
        captchaRef.current.resetCaptcha();
      }
      setCaptchaToken(null);
    }
  };

  const handleVerificationSuccess = (token: string) => {
    setCaptchaToken(token);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Mail className="h-12 w-12 text-blue-900 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Reset Two-Factor Authentication</h3>
        <p className="text-sm text-gray-600">
          Enter your email address to receive a reset link
        </p>
      </div>

      {success ? (
        <div className="space-y-4">
          <Alert>
            Reset link sent! Please check your email and follow the instructions to reset your 2FA.
            <br /><br />
            Note: If you don't see the email, please check your spam folder.
          </Alert>
          <Button
            type="button"
            className="w-full"
            onClick={onCancel}
          >
            Back to Login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleResetRequest} className="space-y-4">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <div className="flex justify-center">
            <HCaptcha
              sitekey="2028db5a-e45c-418a-bb88-cd600e04402c"
              onVerify={handleVerificationSuccess}
              ref={captchaRef}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              {error}
            </Alert>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onCancel}
            >
              Back to Login
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-900 hover:bg-blue-800"
              disabled={isLoading || !email || !captchaToken}
            >
              {isLoading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
} 