import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from 'react-router-dom';

export default function ThemeToggle({ inline = false }) {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();

  // If not inline and on /home or module dashboard pages, don't show the fixed floating button (header has it)
  if (!inline && (location.pathname === '/home' || location.pathname.includes('-dashboard'))) {
    return null;
  }

  if (inline) {
    return (
      <button
        onClick={toggleTheme}
        type="button"
        title="Toggle theme mode"
        aria-label="Toggle theme mode"
        className={`flex items-center gap-1.5 py-2 px-3 text-xs font-mono font-semibold rounded-xl border transition cursor-pointer ${
          isDark
            ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-700 border-slate-700 hover:text-white'
            : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200 hover:text-slate-900'
        }`}
      >
        <div className="relative w-3.5 h-3.5 flex items-center justify-center">
          {isDark ? (
            <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-90" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-indigo-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
          )}
        </div>
        <span>{isDark ? 'DARK' : 'LIGHT'}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title="Toggle theme mode"
      aria-label="Toggle theme mode"
      className="fixed top-5 right-5 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-300 shadow-lg cursor-pointer bg-slate-900/80 border-slate-700/80 text-slate-200 hover:border-slate-500 hover:text-white dark:bg-slate-900/80 dark:border-slate-700/80 dark:text-slate-200 dark:hover:border-cyan-400/50 light:bg-white/90 light:border-slate-200 light:text-slate-700 light:hover:border-slate-300"
      style={{
        boxShadow: isDark
          ? '0 0 20px rgba(99, 102, 241, 0.15)'
          : '0 4px 15px rgba(0, 0, 0, 0.08)',
      }}
    >
      <div className="relative w-4 h-4 flex items-center justify-center">
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-90" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 -rotate-12 hover:rotate-0" />
        )}
      </div>
      <span className="text-xs font-mono font-medium tracking-wider select-none text-slate-300 dark:text-slate-300 light:text-slate-700">
        {isDark ? 'DARK' : 'LIGHT'}
      </span>
    </button>
  );
}
