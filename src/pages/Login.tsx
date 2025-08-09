import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const ACCOUNTS_OLD_URL = "/old-accounts.json";
const ACCOUNTS_NEW_URL = "/new-accounts.json";

const passwordValid = (pwd: string) => {
  // at least 8 chars, includes letters, numbers, and symbols
  const hasLen = pwd.length >= 8;
  const hasLetter = /[A-Za-z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
  return hasLen && hasLetter && hasNumber && hasSymbol;
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "create">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Array<{ email: string; password: string }>>([]);

  useEffect(() => {
    // fetch both old and new accounts and merge in-memory
    const load = async () => {
      try {
        const [oldRes, neuRes] = await Promise.all([
          fetch(ACCOUNTS_OLD_URL),
          fetch(ACCOUNTS_NEW_URL),
        ]);
        const old = (await oldRes.json()) as Array<{ email: string; password: string }>;
        const neu = (await neuRes.json()) as Array<{ email: string; password: string }>;
        setAccounts([...(old || []), ...(neu || [])]);
      } catch (e) {
        console.error(e);
      }
    };
    load();
  }, []);

  const saveNewAccount = async (acc: { email: string; password: string }) => {
    // Since public assets are static, attempt to use localStorage as a fallback to persist created accounts in the browser.
    try {
      const key = "newAccounts";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [...existing, acc];
      localStorage.setItem(key, JSON.stringify(next));
      // reflect in memory
      setAccounts((prev) => [...prev, acc]);
    } catch (e) {
      console.error("Failed to store account locally", e);
    }
  };

  useEffect(() => {
    // also merge locally created accounts (if any) on mount
    try {
      const local = JSON.parse(localStorage.getItem("newAccounts") || "[]");
      if (Array.isArray(local) && local.length) {
        setAccounts((prev) => {
          const map = new Map(prev.map((p) => [p.email, p.password]));
          local.forEach((l: any) => map.set(l.email, l.password));
          return Array.from(map.entries()).map(([email, password]) => ({ email, password }));
        });
      }
    } catch {}
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "create") {
        if (!passwordValid(password)) {
          toast({ title: "Weak password", description: "Use at least 8 chars with letters, numbers, and symbols.", variant: "destructive" });
          return;
        }
        const exists = accounts.some((a) => a.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          toast({ title: "Account exists", description: "Try signing in instead." });
          return;
        }
        await saveNewAccount({ email, password });
        toast({ title: "Account created", description: "Proceed to sign in." });
        setMode("login");
        return;
      }

      // login mode: verify credentials
      const found = accounts.find(
        (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
      );
      if (!found) {
        toast({ title: "Invalid credentials", description: "Check email and password.", variant: "destructive" });
        return;
      }

      // mark pending 2FA and go to verify page
      sessionStorage.setItem("pending2FA", JSON.stringify({ email, ts: Date.now() }));
      toast({ title: "2FA required", description: "Verify your identity to continue." });
      setTimeout(() => navigate("/verify-2fa"), 300);
    } finally {
      setLoading(false);
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
          <h1 className="font-display text-2xl font-bold">Bank of India</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required placeholder="you@bank.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "create" && (
              <p className="text-xs text-muted-foreground">
                Password must be 8+ chars and include letters, numbers, and symbols.
              </p>
            )}
          </div>
          <Button disabled={loading} type="submit" className="w-full hover-scale">
            {mode === "login" ? (loading ? "Signing in..." : "Sign In") : (loading ? "Creating..." : "Create Account")}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <button className="text-primary underline" onClick={() => setMode("create")}>Create an account</button>
          ) : (
            <button className="text-primary underline" onClick={() => setMode("login")}>Back to sign in</button>
          )}
        </div>
      </motion.section>
    </div>
  );
};

export default Login;
