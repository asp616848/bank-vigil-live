import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

const Settings: React.FC = () => {
  const [biometric, setBiometric] = useState(true);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold">Settings / Profile</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile Info</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input defaultValue="John Doe" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" defaultValue="john@bank.com" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Phone</Label>
            <Input defaultValue="+91 98765 43210" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Biometric Authentication</div>
              <div className="text-xs text-muted-foreground">Use device biometrics for sensitive actions</div>
            </div>
            <Switch checked={biometric} onCheckedChange={setBiometric} />
          </div>
          <Button>Update Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
