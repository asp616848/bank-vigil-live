import React, { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFingerprint } from "@/hooks/useFingerprint";

const HoneypotGuard: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<{ source: string; name?: string } | null>(null);
  const triggeredRef = useRef(false);
  const navigate = useNavigate();
  const { logFingerprintForSecurity } = useFingerprint();

  useEffect(() => {
    const handler = (e: Event) => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      const d = (e as CustomEvent).detail || {};
      setDetails({ source: d.source || "unknown", name: d.name });
      setOpen(true);
      // Log security event
      logFingerprintForSecurity("honeypot_triggered").catch(() => {});
    };
    window.addEventListener("honeypot-trigger" as any, handler as any);
    return () => window.removeEventListener("honeypot-trigger" as any, handler as any);
  }, [logFingerprintForSecurity]);

  const confirmLogout = () => {
    try { sessionStorage.removeItem("currentUser"); } catch {}
    setOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Suspicious automation detected
          </DialogTitle>
          <DialogDescription>
            We detected interaction with hidden elements (honeypot trap). For your security, you will be signed out.
          </DialogDescription>
        </DialogHeader>
        {details?.name && (
          <div className="text-xs text-muted-foreground">Signal: {details.source} - {details.name}</div>
        )}
        <div className="mt-4 flex justify-end">
          <Button onClick={confirmLogout}>OK</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HoneypotGuard;
