import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, RotateCcw, Home, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function AccessDeniedPage({ attemptedPath, roleName }) {
  const navigate = useNavigate();
  const { session, prepareSwitchRole } = useAuth();
  const { isDark } = useTheme();

  const handleSwitchRole = () => {
    if (prepareSwitchRole()) {
      navigate('/select-role');
    } else {
      navigate('/home');
    }
  };

  const clientName = session?.contextDetails?.clientName || session?.clientName || 'Active Client';
  const displayRole = roleName || session?.contextDetails?.roleName || String(session?.roleId || 'Unknown Role');
  const displayUser = session?.user?.name || session?.user?.username || 'Current User';

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-mono transition-colors duration-300 ${
        isDark ? 'bg-[#080c14] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Background Ambient Cyber Glow */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] blur-[140px] pointer-events-none -z-10 ${
          isDark
            ? 'bg-gradient-to-b from-rose-600/20 via-amber-500/10 to-transparent'
            : 'bg-gradient-to-b from-rose-400/20 via-amber-400/15 to-transparent'
        }`}
      />

      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl p-7 sm:p-9 text-center relative overflow-hidden transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/90 border-rose-500/30 shadow-rose-950/20'
            : 'bg-white border-rose-200 shadow-slate-900/10'
        }`}
      >
        {/* Cyber Top Accent Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse" />

        {/* Shield Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 mb-6 shadow-lg shadow-rose-500/10">
          <ShieldAlert className="w-8 h-8 animate-bounce" />
        </div>

        {/* Title */}
        <span className="text-xs uppercase tracking-widest font-black text-rose-500 block mb-2">
          403 // Access Denied
        </span>
        <h1
          className={`text-xl sm:text-2xl font-black tracking-tight mb-3 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Unauthorized Menu Route
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto mb-6">
          Your current active role does not have authorization to access this menu module in iDempiere ERP.
        </p>

        {/* Metadata Details Card */}
        <div
          className={`rounded-2xl border p-4 sm:p-5 text-left mb-6 space-y-2.5 text-xs ${
            isDark
              ? 'bg-slate-950/70 border-slate-800 text-slate-300'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
            <span className="text-slate-400 font-medium">Attempted Path:</span>
            <span className="font-bold font-mono text-rose-400">{attemptedPath || location.pathname}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
            <span className="text-slate-400 font-medium">Active Role:</span>
            <span className="font-bold text-cyan-400">{displayRole}</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
            <span className="text-slate-400 font-medium">Tenant / Client:</span>
            <span className="font-bold">{clientName}</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400 font-medium">User:</span>
            <span className="font-medium text-slate-400">{displayUser}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchRole}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>Switch Role</span>
          </button>
        </div>
      </div>
    </div>
  );
}
