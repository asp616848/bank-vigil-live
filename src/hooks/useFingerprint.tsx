import { useVisitorData } from '@fingerprintjs/fingerprintjs-pro-react';
import { useEffect, useState } from 'react';

export interface FingerprintData {
  visitorId: string;
  confidence: number;
  browserDetails: {
    browserName: string;
    browserVersion: string;
    os: string;
    osVersion: string;
  };
  requestId: string;
  timestamp: number;
  ip?: string;
  coords?: { lat: number; lon: number; accuracy?: number };
}

export const useFingerprint = () => {
  const { isLoading, error, data, getData } = useVisitorData(
    { extendedResult: true },
    { immediate: true }
  );
  
  const [fingerprintData, setFingerprintData] = useState<FingerprintData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const enrich = async () => {
      if (!data || error) return;
      const base: FingerprintData = {
        visitorId: data.visitorId,
        confidence: data.confidence?.score || 0,
        browserDetails: {
          browserName: data.browserName || 'Unknown',
          browserVersion: data.browserVersion || 'Unknown',
          os: data.os || 'Unknown',
          osVersion: data.osVersion || 'Unknown',
        },
        requestId: data.requestId,
        timestamp: Date.now(),
      };
      try {
        // Get server-observed IP (no external calls)
        const res = await fetch('http://localhost:8000/whoami');
        if (res.ok) {
          const info = await res.json();
          base.ip = info?.ip;
        }
      } catch {}
      // Try browser geolocation (user permission required)
      try {
        if (navigator.geolocation) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                if (!cancelled) {
                  base.coords = {
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                  };
                }
                resolve();
              },
              () => resolve(),
              { maximumAge: 60000, timeout: 5000, enableHighAccuracy: false }
            );
          });
        }
      } catch {}
      if (!cancelled) setFingerprintData(base);
    };
    enrich();
    return () => { cancelled = true; };
  }, [data, error]);

  const refreshFingerprint = async () => {
    try {
      await getData({ ignoreCache: true });
    } catch (err) {
      console.error('Failed to refresh fingerprint:', err);
    }
  };

  const refreshCoords = async (): Promise<FingerprintData['coords'] | undefined> => {
    try {
      if (!navigator.geolocation) return undefined;
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { maximumAge: 0, timeout: 8000, enableHighAccuracy: true }
        );
      });
      const coords = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
      } as const;
      setFingerprintData(prev => prev ? { ...prev, coords } : prev);
      return coords;
    } catch (e) {
      console.warn('Geolocation refresh failed', e);
      return undefined;
    }
  };

  const logFingerprintForSecurity = async (action: string, email?: string) => {
    if (!fingerprintData) return;

    const securityLog = {
      action,
      email,
      fingerprint: fingerprintData,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
  coords: fingerprintData.coords
    };

    try {
      // Send to your backend for security logging
  await fetch('http://localhost:8000/security/log-fingerprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(securityLog),
      });
    } catch (err) {
      console.error('Failed to log fingerprint for security:', err);
    }
  };

  return {
    isLoading,
    error,
    fingerprintData,
    refreshFingerprint,
  refreshCoords,
    logFingerprintForSecurity,
    rawData: data,
  };
};
