import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  // '/app/security-logs',    // security logs
]);

export const BiometricGate: React.FC = () => {
  const loc = useLocation();
  const { features } = useSecuritySettings();
  const [supported, setSupported] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hoverTimer = useRef<number | null>(null);

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
        // don't auto-prompt; show a floating bubble that verifies on hover/click
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

  // If device doesn't support biometrics, we already auto-mark verified; render nothing.
  if (!supported) return null;

  // Floating bubble that verifies on hover or click
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Card className="px-3 py-2 shadow-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onMouseEnter={() => {
            if (hoverTimer.current) return;
            hoverTimer.current = window.setTimeout(async () => {
              setError(null);
              setBusy(true);
              const res = await authenticateWithPlatform();
              setBusy(false);
              hoverTimer.current = null;
              if (res.ok) {
                sessionStorage.setItem('bio:verified:' + loc.pathname, '1');
                window.dispatchEvent(new CustomEvent('bio-verified', { detail: { path: loc.pathname } }));
              } else {
                setError(res.error || 'Authentication failed');
              }
            }, 800); // verify after short hover
          }}
          onMouseLeave={() => {
            if (hoverTimer.current) {
              clearTimeout(hoverTimer.current);
              hoverTimer.current = null;
            }
          }}
          onClick={async () => {
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
          }}
          title={busy ? 'Verifying…' : 'Hover or click to verify with biometrics'}
        >
          <Fingerprint className={`h-5 w-5 ${busy ? 'animate-pulse text-primary' : 'text-muted-foreground'}`} />
          <span className="text-sm">
            {busy ? 'Verifying…' : (error ? 'Try again' : 'Verify biometrics')}
          </span>
          {!busy && (
            <Button size="sm" variant="ghost" className="h-7 px-2">Verify</Button>
          )}
        </div>
        {error && (
          <div className="mt-2 text-xs text-destructive">{error}</div>
        )}
      </Card>
    </div>
  );
};
