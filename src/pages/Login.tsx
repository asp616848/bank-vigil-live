import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ACCOUNTS_OLD_URL = "/old-accounts.json";
const ACCOUNTS_NEW_URL = "/new-accounts.json";

type Account = { email: string; password: string; name: string; username: string };

const passwordValid = (pwd: string) => {
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
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  // TypingDNA refs and state
  const tdnaRef = useRef<any>(null);
  const [isTypingDNAReady, setTypingDNAReady] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/typingdna.js";
    script.async = true;
    script.onload = () => {
      if ((window as any).TypingDNA) {
        tdnaRef.current = new (window as any).TypingDNA();
        setTypingDNAReady(true);
      } else {
        toast({ title: "Biometrics failed", description: "Could not load TypingDNA.", variant: "destructive" });
      }
    };
    script.onerror = () => {
      toast({ title: "Biometrics failed", description: "Could not load TypingDNA script.", variant: "destructive" });
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const [oldRes, neuRes] = await Promise.all([
          fetch(ACCOUNTS_OLD_URL),
          fetch(ACCOUNTS_NEW_URL),
        ]);
        const old = (await oldRes.json()) as Account[];
        const neu = (await neuRes.json()) as Account[];
        const localV2 = JSON.parse(localStorage.getItem("newAccountsV2") || "[]") as Account[];
        
        const allAccounts = [...(old || []), ...(neu || []), ...localV2];
        const uniqueAccounts = Array.from(new Map(allAccounts.map(acc => [acc.email.toLowerCase(), acc])).values());
        setAccounts(uniqueAccounts);
      } catch (e) {
        console.error("Failed to load accounts", e);
      }
    };
    loadAccounts();
  }, []);

  const saveNewAccount = async (acc: Account) => {
    try {
      const key = "newAccountsV2";
      const existing = JSON.parse(localStorage.getItem(key) || "[]");
      const next = [...existing, acc];
      localStorage.setItem(key, JSON.stringify(next));
      setAccounts((prev) => [...prev, acc]);
    } catch (e) {
      console.error("Failed to store account locally", e);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isTypingDNAReady) {
      toast({ title: "Please wait", description: "Biometrics are initializing.", variant: "destructive" });
      setLoading(false);
      return;
    }

    let tp = "";
    try {
      tp = tdnaRef.current.getTypingPattern({ type: 1, text: password });
    } catch (err: any) {
      toast({ title: "Capture failed", description: err?.message || "Could not capture typing pattern.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      if (mode === "create") {
        if (!name.trim() || !username.trim()) {
          toast({ title: "Missing details", description: "Enter name and username.", variant: "destructive" });
          return;
        }
        if (!passwordValid(password)) {
          toast({ title: "Weak password", description: "Use at least 8 chars with letters, numbers, and symbols.", variant: "destructive" });
          return;
        }
        const exists = accounts.some((a) => a.email.toLowerCase() === email.toLowerCase());
        if (exists) {
          toast({ title: "Account exists", description: "Try signing in instead." });
          return;
        }

        // Enroll typing pattern
        const res = await fetch("http://localhost:5000/typingdna/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: email, tp }),
        });
        const data = await res.json();

        if (data.status === 'enrolled' && data.details?.success) {
          const acc: Account = { email, password, name, username };
          await saveNewAccount(acc);
          toast({ title: "Account created", description: "Your typing pattern is registered. Please sign in." });
          setMode("login");
        } else {
          toast({ title: "Creation Failed", description: data.details?.message || "Could not register typing pattern.", variant: "destructive" });
        }
        return;
      }

      // Login mode
      const found = accounts.find(
        (a) => a.email.toLowerCase() === email.toLowerCase() && a.password === password
      );
      if (!found) {
        toast({ title: "Invalid credentials", description: "Check email and password.", variant: "destructive" });
        return;
      }

      // Verify typing pattern
      const res = await fetch("http://localhost:5000/typingdna/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: email, tp }),
      });
      const data = await res.json();

      if (data.status === 'verified' && data.details?.result === 1) {
        sessionStorage.setItem("currentUser", JSON.stringify({ email: found.email, name: found.name, username: found.username }));
        toast({ title: "Welcome back!", description: `Signed in as ${found.name}` });
        setTimeout(() => navigate("/app/dashboard"), 400);
      } else if (data.status === 'enrolled') {
        // User has less than 3 patterns, but password is correct. Enroll and log in.
        sessionStorage.setItem("currentUser", JSON.stringify({ email: found.email, name: found.name, username: found.username }));
        toast({ title: "Pattern Saved", description: `Signed in as ${found.name}. More patterns will improve security.` });
        setTimeout(() => navigate("/app/dashboard"), 400);
      } else {
        toast({
          title: "Biometric Mismatch",
          description: "Typing pattern has changed. Please login via secured OTP sent to your mail.",
          variant: "destructive",
          duration: 6000,
        });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
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
          {mode === "create" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" required placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" required placeholder="jane_doe" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required placeholder="you@bank.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input ref={passwordInputRef} id="password" type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            {mode === "create" && (
              <p className="text-xs text-muted-foreground">
                Password must be 8+ chars and include letters, numbers, and symbols.
              </p>
            )}
          </div>
          <Button disabled={loading || !isTypingDNAReady} type="submit" className="w-full hover-scale">
            {loading ? <Loader2 className="animate-spin" /> : (mode === "login" ? "Sign In" : "Create Account")}
            {!isTypingDNAReady && " (Initializing Biometrics...)"}
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
