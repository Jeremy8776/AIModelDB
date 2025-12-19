import React, { useContext } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import ThemeContext from '../context/ThemeContext';
import { RiskScore } from '../types';

interface RiskBadgeProps {
  level: "Green" | "Amber" | "Red";
  reason: string;
}

export function RiskBadge({ level, reason }: RiskBadgeProps) {
  const { theme } = useContext(ThemeContext);
  
  let color;
  if (theme === 'dark') {
    color = level === "Green" 
      ? "text-emerald-300 border-emerald-700/60 bg-emerald-900/20" 
      : level === "Amber" 
        ? "text-amber-300 border-amber-700/60 bg-amber-900/20" 
        : "text-rose-300 border-rose-700/60 bg-rose-900/20";
  } else {
    color = level === "Green" 
      ? "text-emerald-800 border-emerald-300 bg-emerald-50" 
      : level === "Amber" 
        ? "text-amber-800 border-amber-300 bg-amber-50" 
        : "text-rose-800 border-rose-300 bg-rose-50";
  }
  
  return (
    <span 
      title={reason} 
      className={`inline-flex items-center gap-1 rounded-xl border px-2 py-0.5 text-xs ${color}`}
    >
      {level === "Green" ? <ShieldCheck className="size-3" /> : <AlertTriangle className="size-3" />}
      {level}
    </span>
  );
}
