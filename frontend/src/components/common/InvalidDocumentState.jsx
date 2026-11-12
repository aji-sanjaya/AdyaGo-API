import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileX2,
  Link2Off,
  ArrowLeft,
  Plus,
  Home,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function InvalidDocumentState({
  moduleName = 'Document',
  backUrl = '/home',
  backLabel = 'Back to List',
  createUrl = null,
  createLabel = 'Create New Record',
  rawToken = '',
  onRetry = null,
  fullscreen = false,
}) {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { session } = useAuth();
  const [copied, setCopied] = useState(false);

  const handleCopyToken = () => {
    if (!rawToken) return;
    navigator.clipboard?.writeText(rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clientName = session?.contextDetails?.clientName || session?.clientName || 'Active Client';
  const roleName = session?.contextDetails?.roleName || String(session?.roleId || 'Active Role');

  const containerClasses = fullscreen
    ? 'min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-mono'
    : 'w-full py-12 px-4 sm:px-6 flex flex-col items-center justify-center font-mono';

  return (
    <div className={containerClasses}>
      {/* Background Cyber Ambient Glow */}
      <div
        className={`absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] blur-[130px] pointer-events-none -z-10 transition-all ${
          isDark
            ? 'bg-gradient-to-b from-rose-500/15 via-amber-500/10 to-transparent'
            : 'bg-gradient-to-b from-rose-400/15 via-amber-400/10 to-transparent'
        }`}
      />

      {/* Main Glass Card */}
      <div
        className={`w-full max-w-xl rounded-3xl border shadow-2xl p-7 sm:p-9 text-center relative overflow-hidden transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/80 border-slate-800 shadow-rose-950/20 text-slate-100'
            : 'bg-white border-slate-200 shadow-slate-900/10 text-slate-800'
        }`}
      >
        {/* Top Accent Gradient Line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />

        {/* Animated Radar Icon Container */}
        <div className="relative mx-auto w-20 h-20 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-rose-500/10 border border-rose-500/20 animate-pulse" />
          <div className="absolute -inset-1 rounded-2xl border border-dashed border-rose-500/30 animate-[spin_10s_linear_infinite]" />
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-600/20 to-amber-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/10">
            <Link2Off className="w-7 h-7" />
          </div>
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border mb-3 bg-rose-500/10 text-rose-400 border-rose-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Invalid or Expired Link</span>
        </div>

        {/* Heading */}
        <h2
          className={`text-xl sm:text-2xl font-black tracking-tight mb-2 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          {moduleName} Not Found
        </h2>

        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto mb-6">
          The document link or security token is invalid, has expired, or references a record that has been moved or purged.
        </p>

        {/* Diagnostics & Token Details */}
        <div
          className={`rounded-2xl border p-4 sm:p-5 text-left mb-6 space-y-2.5 text-xs ${
            isDark
              ? 'bg-slate-950/70 border-slate-800 text-slate-300'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          {rawToken && (
            <div className="flex items-center justify-between py-1 border-b border-slate-800/40 gap-2">
              <span className="text-slate-400 font-medium flex-shrink-0">Document Token:</span>
              <div className="flex items-center gap-1.5 overflow-hidden">
                <span className="font-mono text-[11px] text-rose-400 truncate max-w-[200px] sm:max-w-[260px]">
                  {rawToken}
                </span>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  title="Copy Token"
                  className={`p-1 rounded transition-colors ${
                    isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
            <span className="text-slate-400 font-medium">Target Module:</span>
            <span className="font-bold text-cyan-400">{moduleName}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/40">
            <span className="text-slate-400 font-medium">Active Role:</span>
            <span className="font-medium text-slate-300">{roleName}</span>
          </div>

          <div className="flex items-center justify-between py-1">
            <span className="text-slate-400 font-medium">Client / Tenant:</span>
            <span className="font-medium text-slate-400">{clientName}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Back to List */}
          <button
            type="button"
            onClick={() => navigate(backUrl)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{backLabel}</span>
          </button>

          {/* Create New Record (Optional) */}
          {createUrl && (
            <button
              type="button"
              onClick={() => navigate(createUrl)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{createLabel}</span>
            </button>
          )}

          {/* Retry / Home */}
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/home')}
              title="Return to Main Dashboard"
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

