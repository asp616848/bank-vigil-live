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
import { toast } from "@/hooks/use-toast"; 

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

  // Helper function to safely convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Helper function to safely convert base64 to Uint8Array
  const base64ToUint8Array = (base64: string): Uint8Array => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  };

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

  // --- WebAuthn start ---
  const registerBiometric = async () => {
    try {
      if (!window.PublicKeyCredential) {
        toast({ title: "Error", description: "WebAuthn is not supported in this browser." });
        return;
      }

      const challengeResp = await fetch("/webauthn/register-challenge");
      if (!challengeResp.ok) {
        throw new Error(`Challenge request failed: ${challengeResp.status}`);
      }

      const publicKeyOptions = await challengeResp.json();
      
      // Safely convert challenge
      if (!publicKeyOptions.challenge) {
        throw new Error("No challenge received from server");
      }
      publicKeyOptions.challenge = base64ToUint8Array(publicKeyOptions.challenge);
      
      // Safely convert user ID
      if (!publicKeyOptions.user?.id) {
        throw new Error("No user ID received from server");
      }
      publicKeyOptions.user.id = base64ToUint8Array(publicKeyOptions.user.id);

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions,
      });

      if (!credential) {
        throw new Error("Failed to create credential");
      }

      const publicKeyCredential = credential as PublicKeyCredential;
      const response = publicKeyCredential.response as AuthenticatorAttestationResponse;

      if (!publicKeyCredential.rawId || !response.attestationObject || !response.clientDataJSON) {
        throw new Error("Incomplete credential data received");
      }

      const registrationData = {
        id: publicKeyCredential.id,
        rawId: arrayBufferToBase64(publicKeyCredential.rawId),
        type: publicKeyCredential.type,
        response: {
          attestationObject: arrayBufferToBase64(response.attestationObject),
          clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
        },
      };

      const registerResp = await fetch("/webauthn/register-credential", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationData),
      });

      if (!registerResp.ok) {
        throw new Error(`Registration failed: ${registerResp.status}`);
      }

      toast({ title: "Biometric Registered", description: "Biometric credential saved successfully." });
    } catch (err) {
      console.error("Biometric registration failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      toast({ title: "Error", description: `Biometric registration failed: ${errorMessage}` });
    }
  };

  const authenticateBiometric = async () => {
    try {
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn is not supported in this browser");
      }

      const challengeResp = await fetch("/webauthn/authenticate-challenge");
      if (!challengeResp.ok) {
        throw new Error(`Challenge request failed: ${challengeResp.status}`);
      }

      const publicKeyOptions = await challengeResp.json();
      
      // Safely convert challenge
      if (!publicKeyOptions.challenge) {
        throw new Error("No challenge received from server");
      }
      publicKeyOptions.challenge = base64ToUint8Array(publicKeyOptions.challenge);
      
      // Safely convert allowCredentials if present
      if (publicKeyOptions.allowCredentials && Array.isArray(publicKeyOptions.allowCredentials)) {
        publicKeyOptions.allowCredentials = publicKeyOptions.allowCredentials.map((cred: any) => {
          if (!cred.id) {
            console.warn("Credential missing ID, skipping");
            return null;
          }
          return {
            ...cred,
            id: base64ToUint8Array(cred.id),
          };
        }).filter(Boolean); // Remove any null entries
      }

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions,
      });

      if (!assertion) {
        throw new Error("No assertion received from authenticator");
      }

      const publicKeyCredential = assertion as PublicKeyCredential;
      const response = publicKeyCredential.response as AuthenticatorAssertionResponse;

      if (!publicKeyCredential.rawId || !response.authenticatorData || !response.clientDataJSON || !response.signature) {
        throw new Error("Incomplete assertion data received");
      }

      const assertionData = {
        id: publicKeyCredential.id,
        rawId: arrayBufferToBase64(publicKeyCredential.rawId),
        type: publicKeyCredential.type,
        response: {
          authenticatorData: arrayBufferToBase64(response.authenticatorData),
          clientDataJSON: arrayBufferToBase64(response.clientDataJSON),
          signature: arrayBufferToBase64(response.signature),
          userHandle: response.userHandle ? arrayBufferToBase64(response.userHandle) : null,
        },
      };

      const verifyResp = await fetch("/webauthn/verify-assertion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertionData),
      });

      if (verifyResp.ok) {
        toast({ title: "Success", description: "Biometric verification passed." });
        lowerRisk();
        setOpen(false);
      } else {
        const errorData = await verifyResp.json().catch(() => ({}));
        const errorMessage = errorData.message || `Verification failed: ${verifyResp.status}`;
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error("Biometric authentication failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      toast({ title: "Error", description: `Biometric authentication failed: ${errorMessage}` });
    }
  };
  // --- WebAuthn end ---

  const handleVerify = async () => {
    if (!window.PublicKeyCredential) {
      toast({ title: "Error", description: "WebAuthn is not supported in this browser." });
      return;
    }
    setVerifying(true);
    try {
      await authenticateBiometric();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Biometric Verification Required</DialogTitle>
          <DialogDescription>
            Please complete a quick biometric check to continue your session securely.
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

        {/* Optional register button for first-time setup */}
        <div className="flex justify-center mt-4">
          <Button variant="outline" onClick={registerBiometric} disabled={verifying}>
            Register Biometric
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};