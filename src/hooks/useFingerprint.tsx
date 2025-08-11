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
}

export const useFingerprint = () => {
  const { isLoading, error, data, getData } = useVisitorData(
    { extendedResult: true },
    { immediate: true }
  );
  
  const [fingerprintData, setFingerprintData] = useState<FingerprintData | null>(null);

  useEffect(() => {
    if (data && !error) {
      const fingerprintInfo: FingerprintData = {
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
      setFingerprintData(fingerprintInfo);
    }
  }, [data, error]);

  const refreshFingerprint = async () => {
    try {
      await getData({ ignoreCache: true });
    } catch (err) {
      console.error('Failed to refresh fingerprint:', err);
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
    };

    try {
      // Send to your backend for security logging
      await fetch('http://localhost:5000/security/log-fingerprint', {
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
    logFingerprintForSecurity,
    rawData: data,
  };
};
