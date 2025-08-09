import React, { useEffect, useState } from "react";
import { useRisk } from "@/hooks/useRiskData";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Fingerprint } from "lucide-react";
import { motion } from "framer-motion";

export const BiometricDialog: React.FC = () => {
  const { score, lowerRisk } = useRisk();
  const [open, setOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (score >= 70) setOpen(true);
  }, [score]);

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
            We detected elevated risk on your account. Please verify to continue.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center py-4">
          <motion.div
            animate={{ scale: verifying ? [1, 1.05, 1] : 1 }}
            transition={{ repeat: verifying ? Infinity : 0, duration: 1.2 }}
            className="h-16 w-16 rounded-full grid place-items-center bg-gradient-to-br from-primary/20 to-accent/20"
          >
            <Fingerprint className="h-8 w-8 text-primary" />
          </motion.div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={verifying}>Cancel</Button>
          <Button onClick={handleVerify} disabled={verifying}>
            {verifying ? "Verifying..." : "Verify Now"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
