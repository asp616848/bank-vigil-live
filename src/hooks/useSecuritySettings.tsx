import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type SecurityFeatureKey =
  | "simSwap"
  | "vpnProxy"
  | "deviceChange"
  | "typingAnomaly"
  | "locationMismatch"
  | "biometric";

export type SecurityFeatures = Record<SecurityFeatureKey, boolean>;

type Ctx = {
  features: SecurityFeatures;
  setFeature: (k: SecurityFeatureKey, v: boolean) => void;
  toggle: (k: SecurityFeatureKey) => void;
  safetyScore: number; // 0-100, 100 = best
  allOn: boolean;
};

const defaultFeatures: SecurityFeatures = {
  simSwap: true,
  vpnProxy: true,
  deviceChange: true,
  typingAnomaly: true,
  locationMismatch: true,
  biometric: true,
};

const LS_KEY = "security:features";

function computeSafetyScore(f: SecurityFeatures) {
  let score = 100;
  if (!f.simSwap) score -= 20;
  if (!f.vpnProxy) score -= 15;
  if (!f.deviceChange) score -= 15;
  if (!f.typingAnomaly) score -= 10;
  if (!f.locationMismatch) score -= 15;
  if (!f.biometric) score -= 10;
  return Math.max(0, Math.min(100, score));
}

const SecuritySettingsContext = createContext<Ctx | null>(null);

export const SecuritySettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<SecurityFeatures>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? { ...defaultFeatures, ...JSON.parse(raw) } : defaultFeatures;
    } catch {
      return defaultFeatures;
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(features));
  }, [features]);

  const setFeature = (k: SecurityFeatureKey, v: boolean) => setFeatures((s) => ({ ...s, [k]: v }));
  const toggle = (k: SecurityFeatureKey) => setFeatures((s) => ({ ...s, [k]: !s[k] }));

  const value = useMemo(() => {
    const safetyScore = computeSafetyScore(features);
    const allOn = safetyScore === 100;
    return { features, setFeature, toggle, safetyScore, allOn };
  }, [features]);

  return (
    <SecuritySettingsContext.Provider value={value}>{children}</SecuritySettingsContext.Provider>
  );
};

export function useSecuritySettings() {
  const ctx = useContext(SecuritySettingsContext);
  if (!ctx) throw new Error("useSecuritySettings must be used within SecuritySettingsProvider");
  return ctx;
}
