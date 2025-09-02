import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFingerprint } from '@/hooks/useFingerprint';
import { Fingerprint, RefreshCw, Shield, Monitor, Globe } from 'lucide-react';

const FingerprintDisplay: React.FC = () => {
  const { isLoading, fingerprintData, refreshFingerprint, error } = useFingerprint();

  if (error) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Fingerprint Error
          </CardTitle>
          <CardDescription>
            Failed to load device fingerprint
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-blue-600" />
          Device Fingerprint
        </CardTitle>
        <CardDescription>
          Unique identifier for enhanced security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading fingerprint data...</span>
          </div>
        ) : fingerprintData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Visitor ID:</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {fingerprintData.visitorId}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence:</span>
              <Badge 
                variant={fingerprintData.confidence > 0.8 ? "default" : "secondary"}
                className="text-xs"
              >
                {(fingerprintData.confidence * 100).toFixed(1)}%
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Browser Details:</span>
              </div>
              <div className="ml-6 space-y-1 text-sm text-gray-600">
                <div>Browser: {fingerprintData.browserDetails.browserName} {fingerprintData.browserDetails.browserVersion}</div>
                <div>OS: {fingerprintData.browserDetails.os} {fingerprintData.browserDetails.osVersion}</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">IP Address:</span>
              <Badge variant="secondary" className="font-mono text-xs">
                {fingerprintData.ip || 'N/A'}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Coordinates:</span>
              <span className="text-xs font-mono text-gray-600">
                {fingerprintData.coords ? `${fingerprintData.coords.lat.toFixed(5)}, ${fingerprintData.coords.lon.toFixed(5)}${fingerprintData.coords.accuracy ? ` (±${Math.round(fingerprintData.coords.accuracy)}m)` : ''}` : 'Permission not granted'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Request ID:</span>
              <span className="text-xs font-mono text-gray-600">
                {fingerprintData.requestId}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Generated:</span>
              <span className="text-xs text-gray-600">
                {new Date(fingerprintData.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            No fingerprint data available
          </div>
        )}

        <div className="pt-4 border-t">
          <Button 
            onClick={refreshFingerprint} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Fingerprint
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FingerprintDisplay;
