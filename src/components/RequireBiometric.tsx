import React, { useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BiometricGate, BIOMETRIC_REQUIRED_PATHS } from './BiometricGate';

// Route wrapper that renders the gate when needed; otherwise renders outlet
export const RequireBiometric: React.FC = () => {
  const loc = useLocation();
  const needs = BIOMETRIC_REQUIRED_PATHS.has(loc.pathname);
  const verified = useMemo(() => sessionStorage.getItem('bio:verified:' + loc.pathname) === '1', [loc.pathname]);
  if (!needs) return <Outlet />;
  return verified ? <Outlet /> : <BiometricGate />;
};

export default RequireBiometric;
