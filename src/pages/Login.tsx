import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const Login: React.FC = () => {
  const navigate = useNavigate();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Welcome back", description: "Secure session started." });
    setTimeout(() => navigate("/app/dashboard"), 400);
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
          <p className="text-sm text-muted-foreground">Sign in to your account</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required placeholder="you@bank.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full hover-scale">Sign In</Button>
        </form>
      </motion.section>
    </div>
  );
};

export default Login;
