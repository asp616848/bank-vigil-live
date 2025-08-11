import React, { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFingerprint } from "@/hooks/useFingerprint";

interface BotDResult {
  requestId?: string;
  bot?: {
    probability?: number;
    name?: string;
    type?: string; // generic field fallback
    classification?: string; // fallback
    result?: string; // fallback
  };
  browser?: {
    webdriver?: boolean;
  };
  [key: string]: any;
}

const BotDetector: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<BotDResult | null>(null);
  const loggedRef = useRef(false);
  const { logFingerprintForSecurity } = useFingerprint();

  const isWebdriver = useMemo(() => {
    try {
      return Boolean((navigator as any).webdriver);
    } catch {
      return false;
    }
  }, []);

  const isSuspicious = useMemo(() => {
    if (!result) return isWebdriver;
    const p = Number(result?.bot?.probability ?? 0);
    const hasNameOrType = Boolean(result?.bot?.name || result?.bot?.type || result?.bot?.classification || result?.bot?.result === "bad");
    const wd = Boolean(result?.browser?.webdriver) || isWebdriver;
    return wd || hasNameOrType || p >= 0.7;
  }, [result, isWebdriver]);

  useEffect(() => {
    let cancelled = false;

    const loadAndDetect = async () => {
      try {
        // @ts-ignore - external ESM URL, runtime-resolved by Vite
        const mod: any = await import(/* @vite-ignore */ "https://openfpcdn.io/botd/v1");
        const agent = await mod.load();
        const res: BotDResult = await agent.detect();
        if (!cancelled) setResult(res);
      } catch (e) {
        // If CDN fails, still use webdriver heuristic
        if (!cancelled) setResult({ browser: { webdriver: isWebdriver } });
      }
    };

    loadAndDetect();
    return () => {
      cancelled = true;
    };
  }, [isWebdriver]);

  useEffect(() => {
    if (isSuspicious) {
      setOpen(true);
      if (!loggedRef.current) {
        loggedRef.current = true;
        // Fire-and-forget security log
        logFingerprintForSecurity("bot_detected").catch(() => {});
      }
    }
  }, [isSuspicious, logFingerprintForSecurity]);

  if (!isSuspicious) return null;

  const prob = result?.bot?.probability;
  const label = result?.bot?.name || result?.bot?.type || result?.bot?.classification || (isWebdriver ? "webdriver" : undefined) || "automation suspected";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Potential automated activity detected
          </DialogTitle>
          <DialogDescription>
            We noticed signals consistent with automated tools. If this is unexpected, try refreshing or switching browsers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          {typeof prob === "number" && (
            <div>Detection confidence: {(prob * 100).toFixed(0)}%</div>
          )}
          {label && (
            <div>Signal: {label}</div>
          )}
          {result?.requestId && <div className="text-xs">Ref: {result.requestId}</div>}
        </div>
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>Dismiss</Button>
          <Button asChild>
            <a href="https://fingerprint.com/bot-detection/" target="_blank" rel="noreferrer">Learn more</a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BotDetector;
