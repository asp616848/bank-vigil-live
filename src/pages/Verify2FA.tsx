import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

// Mock TypingDNA verify2FA API call
async function verify2FA(code: string, email: string): Promise<boolean> {
  const res = await fetch("/api/verify2fa/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, email }),
  });

  const data = await res.json();
  // TypingDNA returns { success: 1 } when verified
  return data.success === 1;
}

const Verify2FA: React.FC = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const pending = sessionStorage.getItem("pending2FA");
    if (!pending) {
      navigate("/");
      return;
    }
    try {
      const data = JSON.parse(pending);
      setEmail(data.email);
    } catch {
      navigate("/");
    }
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const ok = await verify2FA(code, email);
      if (!ok) {
        toast({ title: "Verification failed", description: "Try again.", variant: "destructive" });
        return;
      }
      // mark authenticated
      sessionStorage.removeItem("pending2FA");
      sessionStorage.setItem("auth", JSON.stringify({ email, ts: Date.now() }));
      toast({ title: "Verified", description: "You're now signed in." });
      setTimeout(() => navigate("/app/dashboard"), 300);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen grid place-items-center overflow-hidden">
      <div className="absolute inset-0 bg-ambient animate-gradient-move" aria-hidden />
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative glass-card w-full max-w-md rounded-2xl p-6 md:p-8"
      >
        <header className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold">Verify 2FA</h1>
          <p className="text-sm text-muted-foreground">Enter the code sent to your device</p>
        </header>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">6-digit code</Label>
            <Input id="code" inputMode="numeric" pattern="[0-9]*" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <Button disabled={submitting || code.length < 6} className="w-full" type="submit">
            {submitting ? "Verifying..." : "Verify"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          <button className="text-primary underline" onClick={() => navigate("/")}>Back to login</button>
        </div>
      </motion.section>
    </div>
  );
};

export default Verify2FA;
