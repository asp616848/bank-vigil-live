import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useFingerprint } from "@/hooks/useFingerprint";

// Replace direct JSON access with backend API endpoints
const ACCOUNTS_API = "http://localhost:5000/accounts";

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
  const { isLoading: fingerprintLoading, fingerprintData, logFingerprintForSecurity, refreshFingerprint } = useFingerprint();
  const [mode, setMode] = useState<"login" | "create" | "enroll">("login");
  const [loginStep, setLoginStep] = useState<"email" | "password" | "otp">("email");
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTypingDNAReady, setIsTypingDNAReady] = useState(false);
  const [enrollmentStep, setEnrollmentStep] = useState(1);
  const [otpSent, setOtpSent] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [otpCooldown, setOtpCooldown] = useState(0); // seconds remaining to resend
  const tdnaRef = useRef<any>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [enrollEmail, setEnrollEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "/typingdna.js";
    script.async = true;
    script.onload = () => {
      tdnaRef.current = new (window as any).TypingDNA();
      setIsTypingDNAReady(true);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const resetLoginState = (opts?: { preservePassword?: boolean }) => {
    setLoginStep("email");
    setIsEmailLocked(false);
    if (!opts?.preservePassword) setPassword("");
    setOtp("");
    setOtpSent(false);
    setOtpCooldown(0);
    setForgotMode(false);
    setNewPassword("");
  };

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const res = await fetch(ACCOUNTS_API);
        if (!res.ok) throw new Error(`Failed to load accounts (${res.status})`);
        const data = await res.json();
        setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      } catch (e) {
        console.error("Failed to load accounts", e);
        toast({ title: "Error", description: "Could not load accounts from server.", variant: "destructive" });
      }
    };
    loadAccounts();
  }, []);

  const saveNewAccount = async (account: Account): Promise<boolean> => {
    try {
      const res = await fetch(ACCOUNTS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(account),
      });

      if (!res.ok) {
        if (res.status === 409) {
          toast({ title: "Account exists", description: "Try signing in instead." });
          return false;
        }
        const msg = await res.text();
        toast({ title: "Error", description: msg || "Failed to save account.", variant: "destructive" });
        return false;
      }

      // Refresh accounts from server to keep state in sync
      try {
        const getRes = await fetch(ACCOUNTS_API);
        const getData = await getRes.json();
        setAccounts(Array.isArray(getData.accounts) ? getData.accounts : []);
      } catch {
        // If refresh fails, at least append locally
        setAccounts(prev => [...prev, account]);
      }

      toast({ title: "Account saved", description: "Your account has been created successfully." });
      return true;
    } catch (e) {
      console.error("Failed to store account on server", e);
      toast({ title: "Error", description: "Failed to save account.", variant: "destructive" });
      return false;
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Log fingerprint for account creation attempt
    await logFingerprintForSecurity('account_creation_attempt', email);
    
    if (!passwordValid(password)) {
      toast({
        title: "Weak password",
        description: "Password must be at least 8 characters long and include letters, numbers, and symbols.",
        variant: "destructive",
      });
      return;
    }

    const exists = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      toast({ title: "Account exists", description: "Try signing in instead." });
      return;
    }
    setMode("enroll");
    // Preserve password so we can POST it after enrollment (3 samples)
    resetLoginState({ preservePassword: true });
    setEnrollEmail(email);
  };

  const handleEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Ensure we have all fields collected from the Create step
    if (!email || !password || !name || !username) {
      toast({ title: "Missing details", description: "Please complete name, username, email and password first.", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!isTypingDNAReady) {
      toast({ title: "Please wait", description: "Biometrics are initializing.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Enforce same email typed across all samples
    if (!enrollEmail) {
      setEnrollEmail(email);
    } else if (email.toLowerCase() !== enrollEmail.toLowerCase()) {
      toast({ title: "Email mismatch", description: `Please type the same email: ${enrollEmail}`, variant: "destructive" });
      setLoading(false);
      return;
    }

    let tp = "";
    try {
      tp = tdnaRef.current.getTypingPattern({ type: 0, text: email });
    } catch (err: any) {
      toast({ title: "Capture failed", description: err?.message || "Could not capture typing pattern.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      // Call verify which auto-enrolls until 3 samples are stored
      const res = await fetch("http://localhost:5000/typingdna/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: email, tp }),
      });
      const data = await res.json();

      const ok = data.status === 'enrolled' || (data.status === 'verified' && data.details?.result === 1);
      if (!ok) {
        toast({ title: "Enrollment Failed", description: data.details?.message || "Could not register typing pattern.", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (enrollmentStep < 3) {
        toast({ title: `Pattern ${enrollmentStep}/3 saved`, description: "Please type your email again." });
        setEnrollmentStep((s) => s + 1);
        setEmail("");
        setTimeout(() => emailInputRef.current?.focus(), 0);
      } else {
        // Third successful sample: now persist account to JSON via backend
        const acc: Account = { email: enrollEmail, password, name, username };
        const saved = await saveNewAccount(acc);
        if (saved) {
          toast({ title: "Account Created!", description: "Your typing pattern is registered. Please sign in." });
          setMode("login");
          resetLoginState();
          setEnrollEmail("");
          setEnrollmentStep(1);
        }
      }
    } catch (e) {
      console.error("Enrollment error", e);
      toast({ title: "Error", description: "An unexpected error occurred during enrollment.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loginStep === 'email') {
      await handleEmailVerification();
    } else {
      await handlePasswordOrOtpVerification();
    }
  };

  const handleEmailVerification = async () => {
    setLoading(true);
    
    // Log fingerprint for email verification attempt
    await logFingerprintForSecurity('email_verification_attempt', email);
    
    if (!isTypingDNAReady) {
      toast({ title: "Please wait", description: "Biometrics are initializing.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const found = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
    if (!found) {
      await logFingerprintForSecurity('login_attempt_failed_email_not_found', email);
      toast({ title: "Invalid credentials", description: "This email is not registered.", variant: "destructive" });
      setLoading(false);
      return;
    }

    let tp = "";
    try {
      // Use pattern from email field for verification
      tp = tdnaRef.current.getTypingPattern({ type: 0, text: email });
    } catch (err: any) {
      toast({ title: "Capture failed", description: err?.message || "Could not capture typing pattern.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/typingdna/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: email, tp }),
      });
      const data = await res.json();

      if ((data.status === 'verified' && data.details?.result === 1) || data.status === 'enrolled') {
        await logFingerprintForSecurity('biometric_verification_success', email);
        toast({ title: "Biometric Scan Passed", description: "Please enter your password." });
        setLoginStep("password");
        setIsEmailLocked(true);
        setOtpSent(false);
        setForgotMode(false);
      } else {
        await logFingerprintForSecurity('biometric_verification_failed', email);
        toast({
          title: "Biometric Mismatch",
          description: "Typing pattern has changed. Please provide both password and OTP.",
          variant: "destructive",
        });
        setLoginStep("otp");
        setIsEmailLocked(true);
        setOtpSent(false);
        setForgotMode(false);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (otpCooldown > 0) return; // cooldown active
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpSent(true);
        setOtpCooldown(30);
        toast({ title: 'OTP sent', description: 'Check your email for the 6-digit code.' });
      } else {
        toast({ title: 'Failed to send OTP', description: data.error || 'Please try again later.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not send OTP.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetPasswordWithOtp = async () => {
    if (!passwordValid(newPassword)) {
      toast({ title: 'Weak password', description: 'Choose a stronger password.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/accounts/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
        // Refresh accounts from server so new password is used for immediate login
        try {
          const getRes = await fetch(ACCOUNTS_API);
          const getData = await getRes.json();
          setAccounts(Array.isArray(getData.accounts) ? getData.accounts : []);
        } catch {
          // If refresh fails, at least update local state
          setAccounts(prev => prev.map(a => a.email.toLowerCase() === email.toLowerCase() ? { ...a, password: newPassword } : a));
        }
        // Pre-fill password field with new password for convenience
        setPassword(newPassword);
        setForgotMode(false);
        setNewPassword('');
        setOtp('');
        setLoginStep('password');
      } else {
        toast({ title: 'Reset failed', description: data.error || 'Invalid OTP.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Could not reset password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordOrOtpVerification = async () => {
    setLoading(true);
    const found = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());

    if (!found) {
      toast({ title: "Error", description: "An unexpected error occurred. Please start over.", variant: "destructive" });
      resetLoginState();
      setLoading(false);
      return;
    }

    if (loginStep === 'password' && !forgotMode) {
      if (password === found.password) {
        await logFingerprintForSecurity('login_success', email);
        sessionStorage.setItem("currentUser", JSON.stringify({ 
          email: found.email, 
          name: found.name, 
          username: found.username,
          fingerprintId: fingerprintData?.visitorId 
        }));
        toast({ title: "Welcome back!", description: `Signed in as ${found.name}` });
        setTimeout(() => navigate("/app/dashboard"), 400);
      } else {
        await logFingerprintForSecurity('login_failed_wrong_password', email);
        toast({ title: "Invalid Password", description: "The password you entered is incorrect.", variant: "destructive" });
      }
    } else if (loginStep === 'otp') {
      // Require both password and OTP on mismatch
      if (!otp || !password) {
        toast({ title: 'Required', description: 'Enter both password and OTP.', variant: 'destructive' });
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('http://localhost:5000/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp }),
        });
        const data = await res.json();
        if (res.ok && data.valid && password === found.password) {
          await logFingerprintForSecurity('login_success_via_otp', email);
          sessionStorage.setItem("currentUser", JSON.stringify({ 
            email: found.email, 
            name: found.name, 
            username: found.username,
            fingerprintId: fingerprintData?.visitorId 
          }));
          toast({ title: "Welcome back!", description: `Signed in via OTP as ${found.name}` });
          setTimeout(() => navigate("/app/dashboard"), 400);
        } else {
          await logFingerprintForSecurity('login_failed_invalid_otp_or_password', email);
          toast({ title: "Invalid details", description: "OTP invalid/expired or wrong password.", variant: "destructive" });
        }
      } catch (e: any) {
        toast({ title: 'Error', description: e.message || 'Could not verify OTP.', variant: 'destructive' });
      }
    } else if (loginStep === 'password' && forgotMode) {
      await resetPasswordWithOtp();
    }
    setLoading(false);
  };

  const renderForm = () => {
    if (mode === 'enroll') {
      return (
        <form onSubmit={handleEnrollment} className="space-y-4">
          <header className="text-center mb-6">
            <h1 className="font-display text-xl font-bold">Register Your Typing Pattern</h1>
            <p className="text-sm text-muted-foreground">
              To secure your account, please type your email address three times.
            </p>
          </header>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input ref={emailInputRef} id="email" type="email" required placeholder="you@bank.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          
          <Button disabled={loading || !isTypingDNAReady} type="submit" className="w-full hover-scale">
            {loading ? <Loader2 className="animate-spin" /> : `Save Pattern ${Math.min(enrollmentStep, 3)}/3`}
          </Button>
           <div className="mt-4 text-center text-sm">
            <button type="button" className="text-primary underline" onClick={() => { setMode("login"); resetLoginState(); setEnrollEmail(""); setEnrollmentStep(1); }}>Cancel</button>
          </div>
        </form>
      );
    }

    return (
      <>
        <header className="text-center mb-6">
          <h1 className="font-display text-2xl font-bold">Bank of India</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </header>

        <form onSubmit={mode === 'login' ? handleLogin : handleCreateAccount} className="space-y-4">
          {mode === "create" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" required placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" required placeholder="jane_doe" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required placeholder="you@bank.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input ref={passwordInputRef} id="password" type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Password must be 8+ chars and include letters, numbers, and symbols.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required placeholder="you@bank.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isEmailLocked} />
              </div>

              {/* Always show Forgot Password link on login screens */}
              <div className="-mt-2 mb-2 text-right text-xs">
                <button
                  type="button"
                  className="underline text-primary"
                  onClick={() => {
                    setForgotMode(true);
                    setLoginStep('password');
                    setIsEmailLocked(!!email);
                    setOtp('');
                    setNewPassword('');
                    setOtpSent(false);
                    setOtpCooldown(0);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {loginStep === 'password' && !forgotMode && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input ref={passwordInputRef} id="password" type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {loginStep === 'otp' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input ref={passwordInputRef} id="password" type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(s => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  <Label htmlFor="otp">One-Time Password</Label>
                  <div className="flex gap-2">
                    <Input id="otp" required placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    <Button type="button" variant="secondary" onClick={sendOtp} disabled={loading || otpCooldown > 0}>
                      {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : (otpSent ? 'Resend OTP' : 'Send OTP')}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Enter both your password and the 6-digit code sent to your email.</p>
                </div>
              )}

              {loginStep === 'password' && forgotMode && (
                <div className="space-y-2">
                  <Label htmlFor="otp">OTP</Label>
                  <div className="flex gap-2">
                    <Input id="otp" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    <Button type="button" variant="secondary" onClick={sendOtp} disabled={loading || otpCooldown > 0}>
                      {otpCooldown > 0 ? `Resend in ${otpCooldown}s` : (otpSent ? 'Resend OTP' : 'Send OTP')}
                    </Button>
                  </div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input id="newPassword" type={showNewPassword ? 'text' : 'password'} placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowNewPassword(s => !s)} aria-label={showNewPassword ? 'Hide password' : 'Show password'}>
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Enter OTP and a strong new password, then press Reset Password.</p>
                </div>
              )}
            </>
          )}
          
          <Button disabled={loading || !isTypingDNAReady} type="submit" className="w-full hover-scale">
            {loading ? <Loader2 className="animate-spin" /> : (
              mode === "login"
                ? (loginStep === 'email' ? 'Verify Email' : (forgotMode && loginStep === 'password' ? 'Reset Password' : 'Sign In'))
                : "Proceed to Biometric Setup"
            )}
            {!isTypingDNAReady && " (Initializing...)"}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          {mode === "login" ? (
            <>
              <button className="text-primary underline" onClick={() => { setMode("create"); resetLoginState(); }}>Create an account</button>
              {isEmailLocked && (
                <button className="text-primary underline ml-4" onClick={() => resetLoginState()}>Use a different email</button>
              )}
            </>
          ) : (
            <button className="text-primary underline" onClick={() => { setMode("login"); resetLoginState(); }}>Back to sign in</button>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="relative min-h-screen grid place-items-center overflow-hidden">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative glass-card w-full max-w-md rounded-2xl p-6 md:p-8"
      >
        {renderForm()}
      </motion.section>
    </div>
  );
};

export default Login;
