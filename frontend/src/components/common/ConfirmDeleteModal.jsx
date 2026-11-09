import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, AlertTriangle, Loader2, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Line Item?',
  message = 'Are you sure you want to delete this record? This action cannot be undone.',
  itemName = '',
  loading = false,
}) {
  const { isDark } = useTheme();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={() => !loading && onClose?.()}
      />

      {/* Modal Dialog Box */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-md rounded-2xl sm:rounded-3xl border shadow-2xl p-6 sm:p-7 overflow-hidden transition-all transform animate-fadeIn font-mono ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-rose-950/30'
            : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/15'
        }`}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className={`absolute top-4 right-4 p-2 rounded-xl transition-colors cursor-pointer ${
            isDark
              ? 'text-slate-400 hover:text-white hover:bg-slate-800'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <X className="w-4 h-4" />
        </button>

        {/* SweetAlert-style Center Warning Graphic */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-4 flex items-center justify-center">
            {/* Outer pulsating ring */}
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/25 flex items-center justify-center animate-pulse">
              {/* Inner accent circle */}
              <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/20">
                <Trash2 className="w-7 h-7" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-bold tracking-tight mb-2">
            {title}
          </h3>

          {/* Description */}
          <p className="text-xs text-slate-400 leading-relaxed mb-2 max-w-sm">
            {message}
          </p>

          {/* Highlighted item name badge if provided */}
          {itemName && (
            <div
              className={`w-full my-2.5 px-3.5 py-2 rounded-xl border text-xs font-bold text-center truncate ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-rose-400'
                  : 'bg-rose-50/70 border-rose-200 text-rose-700'
              }`}
              title={itemName}
            >
              {itemName}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 w-full mt-5 pt-3 border-t border-slate-800/40">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className={`flex-1 px-4 py-2.5 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white text-xs font-mono font-bold shadow-lg shadow-rose-500/25 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 flex-shrink-0" />
                  <span>Yes, Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

