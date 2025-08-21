import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Fingerprint } from 'lucide-react';
import { authenticateWithPlatform, isPlatformAuthenticatorAvailable } from '@/hooks/useWebAuthn';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';

// Pages that should be gated by biometrics
export const BIOMETRIC_REQUIRED_PATHS = new Set([
  '/app/dashboard',        // home
  '/app/transfers',        // transactions
  '/app/statements',       // viewing statements
  '/app/cards',            // cards
  '/app/profile-security', // profile/security
  '/app/security-logs',    // security logs
]);

export const BiometricGate: React.FC = () => {
  const nav = useNavigate();
  const loc = useLocation();
  const { features } = useSecuritySettings();
  const [supported, setSupported] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showGate = useMemo(() => {
    if (!features.biometric) return false; // feature disabled
    return BIOMETRIC_REQUIRED_PATHS.has(loc.pathname);
  }, [loc.pathname, features.biometric]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!showGate) return;
      const available = await isPlatformAuthenticatorAvailable();
      if (mounted) setSupported(!!available);
      if (available) {
        setBusy(true);
        const res = await authenticateWithPlatform();
        setBusy(false);
        if (res.ok) {
          // mark page as verified in this tab until route changes
          sessionStorage.setItem('bio:verified:' + loc.pathname, '1');
          window.dispatchEvent(new CustomEvent('bio-verified', { detail: { path: loc.pathname } }));
          return; // let outlet render
        }
        setError(res.error || 'Authentication failed');
      } else {
        // Not supported -> don't block. Mark verified and continue.
        sessionStorage.setItem('bio:verified:' + loc.pathname, '1');
        window.dispatchEvent(new CustomEvent('bio-verified', { detail: { path: loc.pathname } }));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [showGate, loc.pathname]);

  // Already verified for this path during this session
  if (sessionStorage.getItem('bio:verified:' + loc.pathname) === '1' || !showGate) {
    return null; // allow route to render
  }

  // If device doesn't support biometrics, we auto-mark verified in the effect above.
  // While we wait or if unsupported, render nothing to avoid flicker.
  if (!supported && !error) return null;

  return (
    <div className="mx-auto max-w-md p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Fingerprint className="h-5 w-5"/> Biometric verification</CardTitle>
          <CardDescription>Touch the fingerprint sensor or use your device unlock method.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex gap-2">
            <Button disabled={busy} onClick={async () => {
              setError(null);
              setBusy(true);
              const res = await authenticateWithPlatform();
              setBusy(false);
              if (res.ok) {
                sessionStorage.setItem('bio:verified:' + loc.pathname, '1');
                window.dispatchEvent(new CustomEvent('bio-verified', { detail: { path: loc.pathname } }));
              } else {
                setError(res.error || 'Authentication failed');
              }
            }}>{busy ? 'Waiting…' : 'Unlock with biometrics'}</Button>
            <Button
              variant="secondary"
              onClick={() => {
                sessionStorage.setItem('bio:verified:' + loc.pathname, '1');
                window.dispatchEvent(new CustomEvent('bio-verified', { detail: { path: loc.pathname } }));
              }}
            >
              Skip for now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
