import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";

const Settings: React.FC = () => {
  const { features, setFeature, safetyScore, allOn } = useSecuritySettings();
  const user = React.useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("currentUser") || "null"); } catch { return null; }
  }, []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Settings / Profile</h1>
        <div className="text-sm text-muted-foreground">Safety Score: {Math.round(safetyScore)}</div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input defaultValue={user?.name || ""} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" defaultValue={user?.email || ""} placeholder="you@example.com" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Username</Label>
            <Input defaultValue={user?.username || ""} placeholder="username" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "simSwap", label: "SIM Swap Detection", desc: "Monitor SIM changes to prevent account takeover." },
            { key: "vpnProxy", label: "VPN / Proxy Detection", desc: "Detect anonymized network access that may indicate fraud." },
            { key: "deviceChange", label: "Device Change Detection", desc: "Identify logins from new or risky devices." },
            { key: "typingAnomaly", label: "Typing Anomaly Detection", desc: "Analyze keystroke patterns for anomalies." },
            { key: "locationMismatch", label: "Location Mismatch Detection", desc: "Compare login location to typical behavior." },
            { key: "biometric", label: "Biometric Verification", desc: "Require biometrics for sensitive actions." },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-muted-foreground">{item.desc}</div>
              </div>
              <Switch checked={(features as any)[item.key]} onCheckedChange={(v) => setFeature(item.key as any, v)} />
            </div>
          ))}
          <div className="text-xs text-muted-foreground">{allOn ? "All protections are enabled." : "Enable all protections to maximize your Safety Score."}</div>
          <Button>Update Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
