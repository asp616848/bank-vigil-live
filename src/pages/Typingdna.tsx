import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function TypingDNAForm() {
  const tdnaRef = useRef<any>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [isTypingDNAReady, setTypingDNAReady] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const retryLoading = () => {
    setLoadingTimeout(false);
    setTypingDNAReady(false);
    window.location.reload();
  };

  useEffect(() => {
    if ((window as any).TypingDNA) {
      tdnaRef.current = new (window as any).TypingDNA();
      setTypingDNAReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "/typingdna.js"; // put typingdna.js in /public
    script.async = true;
    script.onload = () => {
      if ((window as any).TypingDNA) {
        tdnaRef.current = new (window as any).TypingDNA();
        setTypingDNAReady(true);
      } else {
        toast({ title: "Initialization failed", description: "TypingDNA library not available.", variant: "destructive" });
      }
    };
    script.onerror = () => {
      toast({ title: "Failed to load TypingDNA", description: "Please refresh and try again.", variant: "destructive" });
    };
    document.body.appendChild(script);

    const timeoutId = setTimeout(() => {
      if (!isTypingDNAReady) {
        setLoadingTimeout(true);
        toast({ title: "Loading timeout", description: "TypingDNA is taking too long to load.", variant: "destructive" });
      }
    }, 10000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isTypingDNAReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isTypingDNAReady) return;

    const email = emailRef.current?.value?.trim() || "";
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email.", variant: "destructive" });
      return;
    }

    let tp = "";
    let textid = "";
    try {
      textid = (window as any).TypingDNA.getTextId(email);
      tp = tdnaRef.current.getTypingPattern({ type: 1, text: email });
    } catch (err: any) {
      toast({ title: "Capture failed", description: err?.message || "Could not capture typing pattern.", variant: "destructive" });
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("http://localhost:5000/typingdna/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: email, tp, textid }),
      });
      const data = await res.json();

      if (data.status === "enrolled") {
        toast({ title: `Pattern ${data.details?.count || 1} Saved`, description: `Enroll more for better accuracy.` });
        emailRef.current!.value = "";
      } else if (data.status === "verified") {
        if (data.details?.result === 1) {
          toast({ title: "Match ✅", description: "Typing pattern verified" });
        } else {
          toast({ title: "Mismatch ❌", description: "Typing pattern did not match", variant: "destructive" });
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Network error.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="relative min-h-screen grid place-items-center p-4">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-lg">
        <Card>
          <CardHeader><CardTitle>TypingDNA Verification</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input ref={emailRef} id="email" type="email" required disabled={!isTypingDNAReady || verifying} />
              </div>
              <Button type="submit" disabled={!isTypingDNAReady || verifying}>
                {verifying ? <Loader2 className="animate-spin" /> : "Verify"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.section>
    </div>
  );
}
