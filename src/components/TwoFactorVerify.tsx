import React, { useState } from 'react';
import { authenticator } from '@otplib/preset-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Loader, KeyRound } from 'lucide-react';

interface TwoFactorVerifyProps {
  userEmail: string;
  secret: string;
  onVerificationComplete: () => void;
  onCancel: () => void;
}

export default function TwoFactorVerify({ 
  userEmail, 
  secret, 
  onVerificationComplete, 
  onCancel 
}: TwoFactorVerifyProps) {
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Verify the code matches
      const isValid = authenticator.verify({
        token: verificationCode,
        secret
      });

      if (!isValid) {
        setError('Invalid verification code. Please try again.');
        return;
      }

      onVerificationComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to verify code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <KeyRound className="h-12 w-12 text-blue-900 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-600">
          Enter the 6-digit code from your Google Authenticator app
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="text"
          placeholder="Enter 6-digit code"
          value={verificationCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            if (value.length <= 6) {
              setVerificationCode(value);
            }
          }}
          maxLength={6}
          className="text-center tracking-widest"
        />

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
            type="button"
            className="flex-1 bg-blue-900 hover:bg-blue-800"
            onClick={handleVerify}
            disabled={verificationCode.length !== 6 || isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="animate-spin h-4 w-4 mr-2" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 