import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registerPlatformPasskey, isPlatformAuthenticatorAvailable } from "@/hooks/useWebAuthn";

const ProfileSecurity: React.FC = () => {
  const { features, setFeature, safetyScore } = useSecuritySettings();
  const user = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("currentUser") || "null"); } catch { return null; }
  }, []);
  const [countryCode, setCountryCode] = useState<string>("+91");
  const [phoneLocal, setPhoneLocal] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [existingPhone, setExistingPhone] = useState<string | undefined>(() => user?.phone as string | undefined);
  const [isEditingPhone, setIsEditingPhone] = useState<boolean>(false);

  useEffect(() => {
    document.title = "Profile & Security — Bank of India";
  }, []);

  // Passkey (WebAuthn) status for current origin
  const rpId = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const passkeyKey = user?.email ? `passkey:${user.email}:${rpId}` : undefined;
  const [hasPasskey, setHasPasskey] = useState<boolean>(() => {
    if (!passkeyKey) return false;
    try { return localStorage.getItem(passkeyKey) === '1'; } catch { return false; }
  });
  const [webauthnSupported, setWebauthnSupported] = useState<boolean>(false);
  useEffect(() => {
    (async () => setWebauthnSupported(await isPlatformAuthenticatorAvailable()))();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Saved", description: "Your profile and security settings have been updated." });
  };

  // Basic local validation to E.164 format after combining
  const toE164 = (cc: string, local: string) => {
    const digits = (local || "").replace(/[^0-9]/g, "");
    const cleanCc = (cc || "").replace(/\s/g, "");
    const e164 = `${cleanCc}${digits}`;
    if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
    return e164;
  };

  const sendPhoneOtp = async () => {
    if (!user?.email) {
      toast({ title: "Sign in required", description: "Please sign in again.", variant: "destructive" });
      return;
    }
    if (!isEditingPhone && existingPhone) {
      toast({ title: "Phone already linked", description: existingPhone });
      return;
    }
    const e164 = toE164(countryCode, phoneLocal);
    if (!e164) {
      toast({ title: "Invalid phone", description: "Enter a valid phone number.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/phone/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, phone: e164 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
        toast({ title: "OTP sent", description: "Check backend logs for the code (demo)." });
      } else {
        toast({ title: "Failed", description: data.error || "Could not send OTP.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not send OTP.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneOtp = async () => {
    if (!user?.email || !otp) {
      toast({ title: "Required", description: "Enter the OTP.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/phone/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, otp }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        // Persist in sessionStorage currentUser as well
        const updated = { ...user, phone: data.phone };
        sessionStorage.setItem("currentUser", JSON.stringify(updated));
        setExistingPhone(data.phone);
        toast({ title: "Phone linked", description: `Linked ${data.phone}.` });
        setOtp("");
        setOtpSent(false);
        setIsEditingPhone(false);
      } else {
        toast({ title: "Invalid OTP", description: data.error || "Try again.", variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not verify OTP.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createPasskey = async () => {
    if (!user?.email) {
      toast({ title: "Sign in required", description: "Please sign in again.", variant: "destructive" });
      return;
    }
    if (!webauthnSupported) {
      toast({ title: "Not supported", description: "This device doesn't support platform passkeys.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const res = await registerPlatformPasskey({ id: user.email, name: user.email, displayName: user.name || user.username || user.email });
    setLoading(false);
    if (res.ok) {
      try { if (passkeyKey) localStorage.setItem(passkeyKey, '1'); } catch {}
      setHasPasskey(true);
      toast({ title: "Passkey created", description: `Passkey bound to ${rpId}.` });
    } else {
      const err = (res as any).error as string | undefined;
      toast({ title: "Failed", description: err || "Could not create passkey.", variant: "destructive" });
    }
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
              {!isEditingPhone && existingPhone ? (
                <div className="flex items-center gap-3">
                  <Input value={existingPhone} readOnly className="bg-muted/50" />
                  <Button type="button" variant="secondary" onClick={() => { setIsEditingPhone(true); setOtpSent(false); setOtp(""); setPhoneLocal(""); }}>Change</Button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="w-28">
                        <SelectValue placeholder="Code" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+1">+1 (US)</SelectItem>
                        <SelectItem value="+44">+44 (UK)</SelectItem>
                        <SelectItem value="+61">+61 (AU)</SelectItem>
                        <SelectItem value="+81">+81 (JP)</SelectItem>
                        <SelectItem value="+91">+91 (IN)</SelectItem>
                        <SelectItem value="+971">+971 (AE)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input value={phoneLocal} onChange={(e) => setPhoneLocal(e.target.value)} placeholder={existingPhone || "Phone number"} />
                    <Button type="button" variant="secondary" onClick={sendPhoneOtp} disabled={loading}>Send OTP</Button>
                  </div>
                  {otpSent && (
                    <div className="mt-2 flex gap-2">
                      <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="Enter OTP" />
                      <Button type="button" onClick={verifyPhoneOtp} disabled={loading}>Verify</Button>
                      {existingPhone && (
                        <Button type="button" variant="ghost" onClick={() => { setIsEditingPhone(false); setOtpSent(false); setOtp(""); }}>Cancel</Button>
                      )}
                    </div>
                  )}
                  {!otpSent && existingPhone && (
                    <div className="mt-1">
                      <Button type="button" variant="ghost" onClick={() => { setIsEditingPhone(false); setPhoneLocal(""); }}>Cancel</Button>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Enable Biometric Authentication</div>
                <div className="text-xs text-muted-foreground">Use biometrics when high risk is detected.</div>
              </div>
              <Switch checked={features.biometric} onCheckedChange={(v) => setFeature("biometric", v)} />
            </div>

            <div className="md:col-span-2 flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Passkey for this device</div>
                <div className="text-xs text-muted-foreground">
                  {hasPasskey ? `Passkey is set up for ${rpId}.` : (webauthnSupported ? `No passkey found for ${rpId}.` : 'Passkeys not supported on this device.')}
                </div>
              </div>
              <Button type="button" onClick={createPasskey} disabled={loading || !webauthnSupported} variant={hasPasskey ? 'secondary' : 'default'}>
                {hasPasskey ? 'Re-create' : 'Create Passkey'}
              </Button>
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
