import React, { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface Props {
  score: number; // 0-100
  size?: number;
}

// Choose a color based on safety score (higher is better)
function scoreColor(score: number) {
  if (score >= 80) return "#10b981"; // emerald
  if (score >= 50) return "#f59e0b"; // amber
  return "#ef4444"; // red
}

export const SecurityScoreMeter: React.FC<Props> = ({ score, size = 96 }) => {
  const radius = (size / 2) - 10; // padding for stroke
  const circumference = 2 * Math.PI * radius;

  const raw = useMotionValue(score);
  const spring = useSpring(raw, { stiffness: 120, damping: 20, mass: 0.6 });
  const pct = useTransform(spring, latest => Math.max(0, Math.min(100, latest)) / 100);
  const dash = useTransform(pct, p => `${circumference * p} ${circumference}`);
  const display = useTransform(spring, latest => Math.round(latest).toString());
  const color = scoreColor(score);

  useEffect(() => {
    raw.set(score);
  }, [score, raw]);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={8}
          opacity={0.3}
          fill="none"
        />
        {/* Progress */}
        <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            style={{
                strokeDasharray: dash as any,
                transform: "rotate(-90deg)",
                transformOrigin: "50% 50%",
            }}
        />

      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-xl font-semibold leading-none"
          style={{ color }}
        >{display}</motion.span>
        <span className="text-[10px] tracking-wide text-muted-foreground uppercase">Safety</span>
      </div>
    </div>
  );
};

export default SecurityScoreMeter;
