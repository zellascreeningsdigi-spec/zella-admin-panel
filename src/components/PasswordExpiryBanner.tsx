import { useAuth } from '@/contexts/AuthContext';
import React, { useState } from 'react';

const WARNING_DAYS = 7;

const daysUntil = (iso?: string): number | null => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
};

const PasswordExpiryBanner: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isAuthenticated || !user || dismissed) return null;

  const days = daysUntil(user.passwordExpiresAt);
  if (days === null || days > WARNING_DAYS) return null;

  const label = days <= 0
    ? 'Your password has expired — you will be asked to reset it on your next sign-in.'
    : days === 1
      ? 'Your password expires tomorrow.'
      : `Your password expires in ${days} days.`;

  return (
    <div className="w-full bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <span>
        <strong>Heads up:</strong> {label} You can change it anytime from your account settings.
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-amber-700 hover:text-amber-900 font-medium"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
};

export default PasswordExpiryBanner;
