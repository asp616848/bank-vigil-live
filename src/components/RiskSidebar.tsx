import React from "react";
import GaugeChart from "react-gauge-chart";
import { useRisk } from "@/hooks/useRiskData";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { motion } from "framer-motion";
import { ShieldAlert, WifiOff, Smartphone, Keyboard, MapPin } from "lucide-react";

const IndicatorRow: React.FC<{ label: string; active: boolean; Icon: React.ElementType }>
  = ({ label, active, Icon }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <motion.div
        aria-hidden
        className={`h-5 w-10 rounded-full border flex items-center ${active ? "bg-destructive/80" : "bg-muted"}`}
        animate={{ backgroundColor: active ? "hsl(0 84% 60% / 0.85)" : "hsl(var(--muted))" }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.span
          className="h-4 w-4 rounded-full bg-background shadow-sm"
          initial={false}
          animate={{ x: active ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      </motion.div>
    </div>
  );
};

export const RiskSidebar: React.FC = () => {
  const { score, signals, trend } = useRisk();

  const gaugePercent = Math.max(0, Math.min(1, score / 100));
  const zone = score <= 30 ? "Low" : score < 70 ? "Medium" : "High";
  const zoneColor = score <= 30 ? "text-emerald-400" : score < 70 ? "text-amber-400" : "text-destructive";

  return (
    <aside className="relative h-full w-full">
      <div className="absolute inset-0 bg-ambient animate-gradient-move rounded-xl" />
      <Card className="relative glass-card p-4 md:p-6 rounded-xl h-full overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Fraud Risk</h2>
            <p className="text-xs text-muted-foreground">Live monitoring</p>
          </div>
          <ShieldAlert className="h-5 w-5 text-primary" />
        </div>

        <div className="mt-4">
          <GaugeChart
            id="risk-gauge"
            nrOfLevels={60}
            arcsLength={[0.3, 0.39, 0.31]}
            colors={["#10b981", "#f59e0b", "#ef4444"]}
            percent={gaugePercent}
            arcPadding={0.02}
            textColor="currentColor"
            needleColor="#94a3b8"
            needleBaseColor="#94a3b8"
            animate
          />
          <div className="text-center mt-2">
            <p className={`text-sm font-medium ${zoneColor}`}>{zone} Risk</p>
            <p className="text-xs text-muted-foreground">Score: {Math.round(score)}</p>
          </div>
        </div>

        <Separator className="my-4" />

        <div>
          <h3 className="text-sm font-semibold mb-2">Signals</h3>
          <div className="space-y-2">
            <IndicatorRow label="SIM Swap Detected" active={signals.simSwap} Icon={Smartphone} />
            <IndicatorRow label="VPN / Proxy Use" active={signals.vpn} Icon={WifiOff} />
            <IndicatorRow label="Device Change" active={signals.deviceChange} Icon={Smartphone} />
            <IndicatorRow label="Typing Anomalies" active={signals.typingAnomaly} Icon={Keyboard} />
            <IndicatorRow label="Location Mismatch" active={signals.locationMismatch} Icon={MapPin} />
          </div>
        </div>

        <Separator className="my-4" />

        <div>
          <h3 className="text-sm font-semibold mb-2">Trend</h3>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.map((p) => ({ t: p.t, v: p.v }))} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                <YAxis hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
                  labelFormatter={() => ""}
                  formatter={(value: any) => [Math.round(value as number), "Score"]}
                />
                <Line type="monotone" dataKey="v" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} isAnimationActive />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </aside>
  );
};
