import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

export type FraudSignalKeys =
  | "simSwap"
  | "vpn"
  | "deviceChange"
  | "typingAnomaly"
  | "locationMismatch";

export type FraudSignals = Record<FraudSignalKeys, boolean>;

export interface RiskPoint {
  t: number; // timestamp
  v: number; // value 0-100
}

export interface RiskState {
  score: number; // 0-100
  signals: FraudSignals;
  trend: RiskPoint[]; // small time series for sparkline
}

interface RiskController extends RiskState {
  setSignal: (k: FraudSignalKeys, val: boolean) => void;
  lowerRisk: () => void;
}

const defaultSignals: FraudSignals = {
  simSwap: false,
  vpn: false,
  deviceChange: false,
  typingAnomaly: false,
  locationMismatch: false,
};

function bounded(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function computeScoreFromSignals(base: number, signals: FraudSignals) {
  let score = base;
  if (signals.vpn) score += 15;
  if (signals.deviceChange) score += 20;
  if (signals.simSwap) score += 20;
  if (signals.typingAnomaly) score += 10;
  if (signals.locationMismatch) score += 15;
  return bounded(score);
}

function useProvideRiskData(): RiskController {
  const [score, setScore] = useState<number>(randomBetween(10, 25));
  const [signals, setSignals] = useState<FraudSignals>({ ...defaultSignals });
  const [trend, setTrend] = useState<RiskPoint[]>(() => {
    const now = Date.now();
    return Array.from({ length: 20 }).map((_, i) => ({
      t: now - (20 - i) * 3000,
      v: bounded(score + randomBetween(-5, 5)),
    }));
  });

  const tickRef = useRef<number | null>(null);

  const setSignal = useCallback((k: FraudSignalKeys, val: boolean) => {
    setSignals((prev) => ({ ...prev, [k]: val }));
  }, []);

  const lowerRisk = useCallback(() => {
    setSignals({ ...defaultSignals });
    setScore((s) => bounded(s * 0.5 + randomBetween(5, 15)));
  }, []);

  useEffect(() => {
    // recalc score when signals change
    setScore((s) => computeScoreFromSignals(s, signals));
  }, [signals]);

  useEffect(() => {
    // mock stream: every 3s mutate base score slightly and occasionally toggle a signal
    tickRef.current = window.setInterval(() => {
      setScore((s) => {
        const drift = randomBetween(-6, 6);
        const base = bounded(s + drift);
        return computeScoreFromSignals(base, signals);
      });

      setSignals((prev) => {
        // 15% chance to flip a random signal
        if (Math.random() < 0.15) {
          const keys: FraudSignalKeys[] = [
            "simSwap",
            "vpn",
            "deviceChange",
            "typingAnomaly",
            "locationMismatch",
          ];
          const k = keys[Math.floor(Math.random() * keys.length)];
          return { ...prev, [k]: !prev[k] };
        }
        return prev;
      });

      setTrend((ts) => {
        const next = [...ts, { t: Date.now(), v: bounded(score) }];
        return next.slice(-30);
      });
    }, 3000) as unknown as number;

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [score, signals]);

  return useMemo(
    () => ({ score, signals, trend, setSignal, lowerRisk }),
    [score, signals, trend, setSignal, lowerRisk]
  );
}

const RiskContext = createContext<RiskController | null>(null);

export const RiskProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const risk = useProvideRiskData();
  return <RiskContext.Provider value={risk}>{children}</RiskContext.Provider>;
};

export function useRisk() {
  const ctx = useContext(RiskContext);
  if (!ctx) throw new Error("useRisk must be used within RiskProvider");
  return ctx;
}
