import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { motion } from "framer-motion";
import axios from "axios";

const ProfileSecurity: React.FC = () => {
  const user = React.useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem("currentUser") || "null"); } catch { return null; }
  }, []);

  const { features, setFeature, safetyScore } = useSecuritySettings();
  const [phone, setPhone] = React.useState(user?.phone || "");
  const [otp, setOtp] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  // const sendOtp = async () => {
  //   setLoading(true);
  //   try {
  //     await axios.post("http://localhost:8000/api/send-otp", { phone })
  //     setOtpSent(true);
  //   } catch (err) {
  //     console.error("Error sending OTP", err);
  //   }
  //   setLoading(false);
  // };

  // const verifyOtp = async () => {
  //   setLoading(true);
  //   try {
  //     await axios.post("http://localhost:8000/api/verify-otp", { phone, otp });
  //     toast({ title: "Verified", description: "Phone number verified successfully!" });
  //   } catch (err) {
  //     console.error("Invalid OTP", err);
  //   }
  //   setLoading(false);
  // };

  const [phoneVerified, setPhoneVerified] = React.useState(false);

// On phone change, reset verification:
const onPhoneChange = (newPhone: string) => {
  setPhone(newPhone);
  setPhoneVerified(false);
  setOtpSent(false);
  setOtp("");
};

const sendOtp = async () => {
  setLoading(true);
  try {
    await axios.post("http://localhost:8000/api/send-otp", { phone });
    setOtpSent(true);
  } catch (err) {
    console.error("Error sending OTP", err);
  }
  setLoading(false);
};

const verifyOtp = async () => {
  setLoading(true);
  try {
    await axios.post("http://localhost:8000/api/verify-otp", { phone, otp });
    toast({ title: "Verified", description: "Phone number verified successfully!" });
    setPhoneVerified(true);  // Mark as verified
    setOtpSent(false);      // Hide OTP inputs
    setOtp("");
  } catch (err) {
    console.error("Invalid OTP", err);
  }
  setLoading(false);
};
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
                        <div className="space-y-2 md:col-span-2 relative">
              <Label>Phone Number</Label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => onPhoneChange(e.target.value)}
                placeholder="Enter your phone number"
              />
              {phoneVerified && (
                <span className="absolute right-2 top-9 text-green-600" title="Phone verified">
                  ✅
                </span>
              )}

              {!phoneVerified && (
                <>
                  {!otpSent ? (
                    <Button onClick={sendOtp} disabled={!phone || loading} type="button" className="mt-2">
                      {loading ? "Sending..." : "Send OTP"}
                    </Button>
                  ) : (
                    <>
                      <Label>Enter OTP</Label>
                      <Input
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter OTP"
                      />
                      <Button onClick={verifyOtp} disabled={!otp || loading} type="button" className="mt-2">
                        {loading ? "Verifying..." : "Verify OTP"}
                      </Button>
                    </>
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
