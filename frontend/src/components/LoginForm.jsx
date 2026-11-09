import React, { useState, useEffect } from 'react';
import { 
  User, Lock, Eye, EyeOff, ArrowRight, AlertCircle, 
  Clock, Cpu, Radio 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function LoginForm({ onSubmit, onLoginSuccess, isLoading, error, lockoutSeconds, onLockoutExpire }) {
  const { isDark } = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (lockoutSeconds && lockoutSeconds > 0) {
      setCountdown(lockoutSeconds);
    }
  }, [lockoutSeconds]);

  useEffect(() => {
    if (countdown <= 0) {
      if (lockoutSeconds > 0 && onLockoutExpire) {
        onLockoutExpire();
      }
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (onLockoutExpire) onLockoutExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, lockoutSeconds, onLockoutExpire]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (countdown > 0) return;
    if (!username.trim() || !password) return;

    const submitFn = onSubmit || onLoginSuccess;
    if (submitFn) {
      submitFn({ username: username.trim(), password, remember });
    }
  };

  const isLocked = countdown > 0;

  return (
    <div className="relative w-full max-w-md">
      {/* High-Tech Glowing Aura / Ambient Lighting */}
      <div
        className={`absolute -top-10 -left-10 w-64 h-64 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse ${
          isDark ? 'bg-indigo-500/20' : 'bg-indigo-500/15'
        }`}
      />
      <div
        className={`absolute -bottom-10 -right-10 w-64 h-64 rounded-full blur-3xl pointer-events-none -z-10 ${
          isDark ? 'bg-cyan-500/15' : 'bg-cyan-400/15'
        }`}
      />

      {/* Main Glassmorphism High-Tech Card */}
      <div
        className={`relative backdrop-blur-2xl rounded-3xl border transition-all duration-300 p-8 sm:p-10 overflow-hidden ${
          isDark
            ? 'bg-slate-900/80 border-slate-800/80 shadow-[0_20px_50px_rgba(8,11,20,0.8)]'
            : 'bg-white/95 border-slate-200/90 shadow-[0_20px_50px_rgba(99,102,241,0.12)]'
        }`}
      >
        {/* Futuristic HUD Corner Brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500 rounded-br-xl pointer-events-none" />

        {/* Top Status & System Badge */}
        <div className="flex items-center justify-between mb-8">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-mono transition-colors ${
              isDark
                ? 'bg-slate-800/80 border-slate-700/60 text-cyan-400'
                : 'bg-indigo-50/80 border-indigo-200/80 text-indigo-700 font-semibold'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>CORE NODE ONLINE</span>
          </div>
          <div
            className={`text-[11px] font-mono flex items-center gap-1 ${
              isDark ? 'text-slate-500' : 'text-slate-400 font-medium'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            <span>v2.5 // SECURE</span>
          </div>
        </div>

        {/* Brand Title */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/30 mb-4">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <h1
            className={`text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            AdyaGo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">ERP</span>
          </h1>
          <p className={`text-xs sm:text-sm mt-1 font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Autonomous Manufacturing Orchestration Interface
          </p>
        </div>

        {/* Security Lockout Alert HUD */}
        {isLocked && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs animate-fadeIn backdrop-blur-md ${
              isDark
                ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-500 animate-pulse" />
              <div>
                <div className="font-mono font-bold tracking-wider uppercase">
                  SECURITY LOCKOUT PROTOCOL ACTIVE
                </div>
                <div className="mt-1">
                  Access held due to 3 failed attempts. Cooldown remaining:{' '}
                  <strong className="font-mono px-2 py-0.5 rounded ml-1 bg-amber-500/20">
                    {countdown}s
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Standard Error Alert */}
        {error && !isLocked && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs font-medium flex items-start gap-3 backdrop-blur-md animate-fadeIn ${
              isDark
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className={`text-xs font-mono font-semibold tracking-wider flex items-center gap-1.5 uppercase ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                <User className="w-3.5 h-3.5 text-indigo-500" /> Username
              </label>
              <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                AUTH.IDENTITY
              </span>
            </div>
            <div className="relative group">
              <input
                type="text"
                required
                disabled={isLocked}
                maxLength={50}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter identity username"
                className={`w-full pl-4 pr-4 py-3 rounded-xl border text-sm font-medium focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 group-hover:border-slate-700'
                    : 'bg-slate-50/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white group-hover:border-slate-300'
                }`}
              />
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 group-focus-within:bg-indigo-500 transition" />
              </div>
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                className={`text-xs font-mono font-semibold tracking-wider flex items-center gap-1.5 uppercase ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-indigo-500" /> Access Key
              </label>
              <span className={`text-[10px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                ENCRYPTED
              </span>
            </div>
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                disabled={isLocked}
                maxLength={128}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full pl-4 pr-11 py-3 rounded-xl border text-sm font-medium focus:outline-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-100 placeholder-slate-600 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 group-hover:border-slate-700'
                    : 'bg-slate-50/80 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white group-hover:border-slate-300'
                }`}
              />
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute inset-y-0 right-0 pr-3.5 flex items-center transition ${
                  isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Credentials Checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none group">
              <input
                type="checkbox"
                disabled={isLocked}
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span
                className={`text-xs transition ${
                  isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-600 group-hover:text-slate-900'
                }`}
              >
                Retain session credentials
              </span>
            </label>
          </div>

          {/* High-Tech Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isLocked}
            className="group relative w-full mt-2 py-3.5 px-5 rounded-xl font-semibold text-sm text-white overflow-hidden shadow-lg shadow-indigo-600/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-[0.99]"
          >
            {/* Shimmer light effect */}
            <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:left-[100%] transition-all duration-1000 pointer-events-none" />

            <div className="relative flex items-center justify-center gap-2">
              {isLocked ? (
                <>
                  <Clock className="w-4 h-4 text-amber-300 animate-spin" />
                  <span>Lockout Active ({countdown}s)</span>
                </>
              ) : isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating Identity...</span>
                </>
              ) : (
                <>
                  <span>Initialize Context Access</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </div>
          </button>
        </form>

        {/* Telemetry Micro Footer */}
        <div
          className={`mt-8 pt-5 border-t flex items-center justify-between text-[10px] font-mono transition-colors ${
            isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-100 text-slate-400'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span>SSL: TLS 1.3</span>
          </div>
          <div>AES-256 GCM</div>
          <div className={isDark ? 'text-slate-400 font-semibold' : 'text-slate-600 font-semibold'}>
            LATENCY: &lt;12ms
          </div>
        </div>
      </div>
    </div>
  );
}
