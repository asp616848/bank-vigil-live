import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, Search, RefreshCw, Eye, Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FingerprintLog {
  timestamp: string;
  action: string;
  email?: string;
  fingerprint: {
    visitorId: string;
    confidence: number;
    browserDetails: {
      browserName: string;
      browserVersion: string;
      os: string;
      osVersion: string;
    };
    requestId: string;
  };
  user_agent?: string;
  client_timestamp?: string;
}

const SecurityLogs: React.FC = () => {
  const [logs, setLogs] = useState<FingerprintLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailFilter, setEmailFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (emailFilter) params.append('email', emailFilter);
      if (actionFilter) params.append('action', actionFilter);
      
      const response = await fetch(`http://localhost:5000/security/fingerprint-logs?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setLogs(data.logs || []);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch logs',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to server',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'login_success':
      case 'biometric_verification_success':
        return 'default';
      case 'login_failed_wrong_password':
      case 'biometric_verification_failed':
      case 'login_attempt_failed_email_not_found':
        return 'destructive';
      case 'email_verification_attempt':
      case 'account_creation_attempt':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Monitor device fingerprinting and security events
        </p>
      </header>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-48">
          <label className="text-sm font-medium">Email Filter</label>
          <Input
            placeholder="Filter by email..."
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
          />
        </div>
        
        <div className="flex-1 min-w-48">
          <label className="text-sm font-medium">Action Filter</label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              <SelectItem value="login_success">Login Success</SelectItem>
              <SelectItem value="login_failed_wrong_password">Login Failed</SelectItem>
              <SelectItem value="biometric_verification_success">Biometric Success</SelectItem>
              <SelectItem value="biometric_verification_failed">Biometric Failed</SelectItem>
              <SelectItem value="email_verification_attempt">Email Verification</SelectItem>
              <SelectItem value="account_creation_attempt">Account Creation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {logs.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                {loading ? 'Loading logs...' : 'No security logs found'}
              </div>
            </CardContent>
          </Card>
        ) : (
          logs.map((log, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {formatAction(log.action)}
                      </Badge>
                      {log.email && (
                        <span className="text-sm font-normal text-muted-foreground">
                          {log.email}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleString()}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {log.fingerprint.confidence > 0.8 ? 'High' : 'Low'} Confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Visitor ID</div>
                    <div className="font-mono text-xs text-muted-foreground break-all">
                      {log.fingerprint.visitorId}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Confidence Score</div>
                    <div className="text-muted-foreground">
                      {(log.fingerprint.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Browser</div>
                    <div className="text-muted-foreground">
                      {log.fingerprint.browserDetails.browserName} {log.fingerprint.browserDetails.browserVersion}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Operating System</div>
                    <div className="text-muted-foreground">
                      {log.fingerprint.browserDetails.os} {log.fingerprint.browserDetails.osVersion}
                    </div>
                  </div>
                </div>
                
                {log.user_agent && (
                  <details className="text-xs">
                    <summary className="cursor-pointer font-medium">User Agent</summary>
                    <div className="mt-2 p-2 bg-muted rounded text-muted-foreground font-mono break-all">
                      {log.user_agent}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default SecurityLogs;
