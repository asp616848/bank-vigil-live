import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const ProfileSecurity: React.FC = () => {
  const [biometric, setBiometric] = useState(true);

  useEffect(() => {
    document.title = "Profile & Security — Bank of India";
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Saved", description: "Your profile and security settings have been updated." });
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Profile & Security</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input defaultValue="John Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" defaultValue="john.doe@example.com" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Phone</Label>
              <Input defaultValue="+91 98765 43210" />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Enable Biometric Authentication</div>
                <div className="text-xs text-muted-foreground">Use biometrics when high risk is detected.</div>
              </div>
              <Switch checked={biometric} onCheckedChange={setBiometric} />
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
