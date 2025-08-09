import React, { useEffect, useMemo, useState } from "react";
import { useRisk } from "@/hooks/useRiskData";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Fingerprint, ScanFace } from "lucide-react";
import { motion } from "framer-motion";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";

export const BiometricDialog: React.FC = () => {
  const { score, lowerRisk } = useRisk();
  const { features } = useSecuritySettings();
  const [open, setOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const isDesktop = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches,
    []
  );

  // Show immediately post-login
  useEffect(() => {
    const justLoggedIn = sessionStorage.getItem("justLoggedIn");
    if (justLoggedIn === "true" && features.biometric) {
      setOpen(true);
      sessionStorage.removeItem("justLoggedIn");
    }
  }, [features.biometric]);

  // Re-open every 10 minutes during session
  useEffect(() => {
    if (!features.biometric) return;
    const id = window.setInterval(() => setOpen(true), 10 * 60 * 1000);
    return () => clearInterval(id);
  }, [features.biometric]);

  // Also open if risk spikes high
  useEffect(() => {
    if (features.biometric && score >= 70) setOpen(true);
  }, [score, features.biometric]);

  const handleVerify = async () => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 1600));
    lowerRisk();
    setVerifying(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Biometric Verification Required</DialogTitle>
          <DialogDescription>
            Please complete a quick biometric check to continue your session
            securely.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-4">
          <motion.div
            animate={{ scale: verifying ? [1, 1.05, 1] : 1 }}
            transition={{ repeat: verifying ? Infinity : 0, duration: 1.2 }}
            className="h-16 w-16 rounded-full grid place-items-center bg-gradient-to-br from-primary/20 to-accent/20"
          >
            {isDesktop ? (
              <ScanFace className="h-8 w-8 text-primary" />
            ) : (
              <Fingerprint className="h-8 w-8 text-primary" />
            )}
          </motion.div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={verifying}
          >
            Cancel
          </Button>
          <Button onClick={handleVerify} disabled={verifying}>
            {verifying ? "Verifying..." : "Verify Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
