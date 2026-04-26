import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

type Step = 'password' | 'otp' | 'force-reset';

const RESEND_COOLDOWN_SEC = 60;

const Login: React.FC = () => {
  const [step, setStep] = useState<Step>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const { login, verifyOtp, resendOtp, forceResetPassword, user } = useAuth();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === 'force-reset' && !resetToken) {
      setStep('password');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
      setInfo('Your reset session expired. Please sign in again.');
    }
  }, [step, resetToken]);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success && result.otpRequired) {
        setStep('otp');
        setResendIn(RESEND_COOLDOWN_SEC);
        setInfo(`A 6-digit code was sent to ${result.email || email}.`);
      } else {
        setError(result.message || 'Invalid email or password');
      }
    } catch {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsLoading(true);

    try {
      const result = await verifyOtp(email, otp);
      if (result.success && result.passwordResetRequired && result.resetToken) {
        setResetToken(result.resetToken);
        setStep('force-reset');
        setInfo('Your password has expired. Please set a new one to continue.');
        return;
      }
      if (!result.success) {
        setError(result.message || 'Invalid or expired OTP');
      }
      // On full-success the user becomes truthy and <Navigate> redirects.
    } catch {
      setError('An error occurred during verification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || isLoading) return;
    setError('');
    setInfo('');
    const result = await resendOtp(email);
    if (result.success) {
      setInfo('A new code has been sent to your email.');
      setResendIn(RESEND_COOLDOWN_SEC);
      setOtp('');
    } else {
      setError(result.message || 'Could not resend code');
      if (result.retryInSec) setResendIn(result.retryInSec);
    }
  };

  const handleBack = () => {
    setStep('password');
    setOtp('');
    setError('');
    setInfo('');
  };

  const handleForceResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError('Password must contain a letter and a number');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      const result = await forceResetPassword(newPassword, resetToken);
      if (!result.success) {
        setError(result.message || 'Could not reset password');
      }
      // On success, <Navigate> redirects to /dashboard.
    } catch {
      setError('An error occurred while resetting password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <img src="/logo192.png" alt="ZellaScreenings Logo" className="w-16 h-16 mx-auto" />
          <CardTitle className="text-2xl text-center">ZellaScreenings - DataHub</CardTitle>
          <CardDescription className="text-center">
            {step === 'password' && 'Enter your credentials to access the portal'}
            {step === 'otp' && 'Enter the 6-digit code sent to your email'}
            {step === 'force-reset' && 'Set a new password to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending code...' : 'Continue'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">One-time code</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              {info && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{info}</div>
              )}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-gray-600 hover:text-gray-900 underline"
                  disabled={isLoading}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendIn > 0 || isLoading}
                  className="text-blue-600 hover:text-blue-800 disabled:text-gray-400 disabled:no-underline underline"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}

          {step === 'force-reset' && (
            <form onSubmit={handleForceResetSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="At least 8 chars, letter + number"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              {info && (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{info}</div>
              )}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Set new password'}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                You cannot reuse any of your last 3 passwords.
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
