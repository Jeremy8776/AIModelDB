import React, { useContext } from 'react';
import { Brain, Box, AudioLines, Image as ImageIcon, Video, Cpu, Globe, Layers, SlidersHorizontal, Wrench } from 'lucide-react';
import { Domain } from '../types';
import ThemeContext from '../context/ThemeContext';

export function DomainIcon({ d, className }: { d: Domain, className?: string }) {
  switch (d) {
    case "LLM":
      return <Brain className={className || "h-4 w-4 align-middle"} />;
    case "VLM":
      return <Globe className={className || "h-4 w-4 align-middle"} />;
    case "Vision":
      return <Cpu className={className || "h-4 w-4 align-middle"} />;
    case "ImageGen":
      return <ImageIcon className={className || "h-4 w-4 align-middle"} />;
    case "VideoGen":
      return <Video className={className || "h-4 w-4 align-middle"} />;
    case "Audio":
    case "ASR":
    case "TTS":
      return <AudioLines className={className || "h-4 w-4 align-middle"} />;
    case "3D":
      return <Box className={className || "h-4 w-4 align-middle"} />;
    case "LoRA":
      return <SlidersHorizontal className={className || "h-4 w-4 align-middle"} />;
    case "FineTune":
      return <Wrench className={className || "h-4 w-4 align-middle"} />;
    case "BackgroundRemoval":
      return <ImageIcon className={className || "h-4 w-4 align-middle"} />;
    case "Upscaler":
      return <ImageIcon className={className || "h-4 w-4 align-middle"} />;
    default:
      return <Layers className={className || "h-4 w-4 align-middle"} />;
  }
}

export function Badge({ children }: { children: React.ReactNode }) {
  const { theme } = useContext(ThemeContext);
  
  const badgeStyle = theme === 'dark' 
    ? "border-zinc-700/60 bg-zinc-800/60 text-zinc-200" 
    : "border-zinc-300/80 bg-zinc-100/80 text-zinc-700";
  
  return (
    <span className={`inline-flex items-center rounded-xl border px-2 py-0.5 text-xs ${badgeStyle}`}>
      {children}
    </span>
  );
}

export default function YourComponent() {
  const { theme } = useContext(ThemeContext);

  return (
    <div className={`w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border p-4 ${theme === "dark" ? "border-zinc-800 bg-zinc-950" : "border-zinc-200 bg-white"}`}>
      {/* Your component content */}
    </div>
  );
}
