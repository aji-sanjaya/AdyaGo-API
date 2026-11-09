import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, KeyRound, Eye, EyeOff, Loader2, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function ReauthModal({ isOpen, onClose, onSuccess }) {
  const { session, refreshTokenWithPassword } = useAuth();
  const { isDark } = useTheme();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setSuccess(false);
      setTimeout(() => {
        passwordInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newToken = await refreshTokenWithPassword(password.trim());
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.(newToken);
      }, 400);
    } catch (err) {
      console.error('Re-authentication failed:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Authentication failed. Please verify your password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const username = session?.user?.name || session?.user?.username || 'Current User';
  const roleName = session?.contextDetails?.roleName || session?.roleName || 'Active Role';
  const clientName = session?.contextDetails?.clientName || session?.clientName || 'Active Client';

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={() => !loading && onClose?.()}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-6 sm:p-7 overflow-hidden transition-all transform animate-fadeIn font-mono ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-cyan-950/20'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/10'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className={`absolute top-4 right-4 p-1.5 rounded-lg transition-colors ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon & Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0 text-amber-500">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-amber-500 block mb-0.5">
              ERP Token Expired
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Re-authenticate Session
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Your iDempiere connection token has timed out. Enter your password to refresh without losing your form inputs.
            </p>
          </div>
        </div>

        {/* User Context Info Card */}
        <div
          className={`mb-5 p-3 rounded-xl border text-xs space-y-1.5 ${
            isDark
              ? 'bg-slate-950/60 border-slate-800/80'
              : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">User:</span>
            <span className="font-semibold text-slate-200 dark:text-slate-200 text-[11px] truncate max-w-[220px]">
              {username}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-[11px]">Tenant / Role:</span>
            <span className="text-slate-400 text-[11px] truncate max-w-[220px]">
              {clientName} • {roleName}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-slate-400">
              Password
            </label>
            <div className="relative">
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password..."
                disabled={loading || success}
                className={`w-full h-[40px] pl-10 pr-10 text-xs rounded-xl border outline-none transition-all ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs leading-relaxed">
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Token refreshed! Continuing transaction...</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`px-4 py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-indigo-600 to-cyan-500 hover:from-amber-600 hover:to-cyan-600 shadow-md shadow-indigo-500/20 transition-all gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : success ? (
                <span>Unlocked!</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Unlock & Refresh Token</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

