import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { authenticator } from '@otplib/preset-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/utils/supa';
import { Alert } from '@/components/ui/alert';
import { Loader } from 'lucide-react';

interface TwoFactorSetupProps {
  userEmail: string;
  onVerificationComplete: () => void;
  onCancel: () => void;
}

export default function TwoFactorSetup({ userEmail, onVerificationComplete, onCancel }: TwoFactorSetupProps) {
  const [secret] = useState(() => authenticator.generateSecret());
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const otpAuthUrl = authenticator.keyuri(userEmail, 'CRIMS', secret);

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

      // Store the secret in Supabase
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          two_factor_secret: secret,
          two_factor_enabled: true 
        })
        .eq('email', userEmail);

      if (updateError) throw updateError;

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
        <h3 className="text-xl font-semibold mb-2">Set Up Two-Factor Authentication</h3>
        <p className="text-sm text-gray-600 mb-4">
          Scan the QR code with your Google Authenticator app to get started
        </p>
      </div>

      <div className="flex justify-center mb-6">
        <QRCodeSVG value={otpAuthUrl} size={200} />
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Can't scan the QR code? Use this secret key instead:
          </p>
          <code className="block p-2 bg-gray-100 rounded text-center select-all">
            {secret}
          </code>
        </div>

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
            Cancel
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
              'Verify & Enable'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
} 