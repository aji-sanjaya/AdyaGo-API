import React from 'react';
import { Cpu, Loader2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function PageLoader({ 
  message = 'Synchronizing ERP Data Stream...', 
  subtext = 'Connecting to Enterprise Data Engine & establishing secure handshake',
  fullscreen = false 
}) {
  const { isDark } = useTheme();

  const containerClasses = fullscreen
    ? 'fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-2xl transition-all duration-300'
    : 'min-h-[450px] w-full flex flex-col items-center justify-center py-16 transition-all duration-300';

  const bgClasses = fullscreen
    ? isDark
      ? 'bg-[#080c14]/90 text-white'
      : 'bg-white/90 text-slate-800'
    : '';

  return (
    <div className={`${containerClasses} ${bgClasses}`}>
      {/* High-Tech Animated Radar / Core Icon */}
      <div className="relative flex items-center justify-center">
        {/* Outer Pulsing Glow */}
        <div className="absolute w-28 h-28 rounded-full bg-cyan-500/20 blur-xl animate-pulse" />
        
        {/* Rotating Outer Ring */}
        <div className="w-20 h-20 rounded-full border-2 border-dashed border-cyan-500/40 animate-[spin_6s_linear_infinite]" />

        {/* Counter-Rotating Inner Ring */}
        <div className="absolute w-14 h-14 rounded-full border-2 border-t-indigo-500 border-r-cyan-400 border-b-transparent border-l-transparent animate-[spin_2s_linear_infinite]" />

        {/* Center Glowing Chip Icon */}
        <div className="absolute w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
          <Cpu className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {/* High-Tech Status Label */}
      <div className="mt-6 text-center space-y-1.5 px-4 max-w-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-semibold tracking-wider uppercase border bg-cyan-950/40 text-cyan-400 border-cyan-500/30">
          <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
          <span>INITIALIZING</span>
        </div>
        <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          {message}
        </h3>
        {subtext && (
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {subtext}
          </p>
        )}
      </div>

      {/* Cyber Stream Progress Line */}
      <div className="mt-6 w-48 h-1 rounded-full overflow-hidden bg-slate-800/40 border border-slate-700/40">
        <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 animate-[pulse_1.5s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

