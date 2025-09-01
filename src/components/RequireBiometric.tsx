import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BiometricGate, BIOMETRIC_REQUIRED_PATHS } from './BiometricGate';
import { useSecuritySettings } from '@/hooks/useSecuritySettings';

// Route wrapper that renders the gate when needed; otherwise renders outlet
export const RequireBiometric: React.FC = () => {
  const loc = useLocation();
  const { features } = useSecuritySettings();
  const [version, setVersion] = useState(0);
  // Listen for biometric completion and re-render
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener('bio-verified', handler as EventListener);
    return () => window.removeEventListener('bio-verified', handler as EventListener);
  }, [loc.pathname]);
  const needs = BIOMETRIC_REQUIRED_PATHS.has(loc.pathname) && !!features.biometric;
  const verified = useMemo(() => sessionStorage.getItem('bio:verified:' + loc.pathname) === '1', [loc.pathname, version]);
  // Always render the page; show a non-blocking biometric prompt when needed and not yet verified.
  return (
    <div className="relative">
      {/* Blur content when biometric required and not verified */}
      <div className={needs && !verified ? 'pointer-events-none select-none blur-sm md:blur-md' : ''}>
        <Outlet />
      </div>
      {needs && !verified && <BiometricGate />}
    </div>
  );
};

export default RequireBiometric;
