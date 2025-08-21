import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BiometricGate, BIOMETRIC_REQUIRED_PATHS } from './BiometricGate';

// Route wrapper that renders the gate when needed; otherwise renders outlet
export const RequireBiometric: React.FC = () => {
  const loc = useLocation();
  const [version, setVersion] = useState(0);
  // Listen for biometric completion and re-render
  useEffect(() => {
    const handler = () => setVersion((v) => v + 1);
    window.addEventListener('bio-verified', handler as EventListener);
    return () => window.removeEventListener('bio-verified', handler as EventListener);
  }, [loc.pathname]);
  const needs = BIOMETRIC_REQUIRED_PATHS.has(loc.pathname);
  const verified = useMemo(() => sessionStorage.getItem('bio:verified:' + loc.pathname) === '1', [loc.pathname, version]);
  // Always render the page; show a non-blocking biometric prompt when needed and not yet verified.
  return (
    <>
      <Outlet />
      {needs && !verified && <BiometricGate />}
    </>
  );
};

export default RequireBiometric;
