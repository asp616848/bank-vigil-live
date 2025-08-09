import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { motion } from "framer-motion";

const ProfileSecurity: React.FC = () => {
  const { features, setFeature, safetyScore } = useSecuritySettings();
  const user = React.useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("currentUser") || "null"); } catch { return null; }
  }, []);

  useEffect(() => {
    document.title = "Profile & Security — Bank of India";
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Saved", description: "Your profile and security settings have been updated." });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Profile & Security</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Safety Score</div>
          <div className="relative h-10 w-10">
            <svg viewBox="0 0 36 36" className="h-10 w-10">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
              <motion.path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                strokeDasharray={`${safetyScore}, 100`}
                initial={false}
                animate={{ strokeDasharray: `${safetyScore}, 100` }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center text-xs font-medium">{Math.round(safetyScore)}</div>
          </div>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
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
            <div className="space-y-2 md:col-span-2">
              <Label>Phone</Label>
              <Input defaultValue={user?.phone || ""} placeholder="Your phone number" />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Enable Biometric Authentication</div>
                <div className="text-xs text-muted-foreground">Use biometrics when high risk is detected.</div>
              </div>
              <Switch checked={features.biometric} onCheckedChange={(v) => setFeature("biometric", v)} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" className="hover-scale">Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileSecurity;
