import React from 'react';
import { useTheme } from '../../../context/ThemeContext';

export default function HomeSkeleton() {
  const { isDark } = useTheme();

  const shimmerClass = `relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r ${
    isDark
      ? 'before:from-transparent before:via-white/[0.07] before:to-transparent bg-slate-800/40'
      : 'before:from-transparent before:via-slate-400/[0.15] before:to-transparent bg-slate-200/70'
  }`;

  const containerBg = isDark
    ? 'bg-slate-900/80 border-slate-800/80'
    : 'bg-white/95 border-slate-200 shadow-sm';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* 1. Top Bar Skeleton */}
      <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${containerBg}`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-2xl ${shimmerClass}`} />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-36 h-5 rounded-lg ${shimmerClass}`} />
              <div className={`w-20 h-4 rounded-full ${shimmerClass}`} />
            </div>
            <div className={`w-44 h-3 rounded ${shimmerClass}`} />
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className={`w-20 h-8 rounded-xl ${shimmerClass}`} />
          <div className={`w-28 h-8 rounded-xl ${shimmerClass}`} />
          <div className={`w-24 h-8 rounded-xl ${shimmerClass}`} />
        </div>
      </div>

      {/* 2. Welcome Banner Skeleton */}
      <div className={`p-5 rounded-3xl border ${containerBg}`}>
        <div className="space-y-2.5">
          <div className={`w-28 h-3.5 rounded-full ${shimmerClass}`} />
          <div className={`w-64 sm:w-80 h-7 rounded-xl ${shimmerClass}`} />
          <div className={`w-72 sm:w-96 h-3 rounded ${shimmerClass}`} />
        </div>
      </div>

      {/* 3. Main Modules Grid Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className={`w-48 h-5 rounded-lg ${shimmerClass}`} />
          <div className={`w-28 h-4 rounded ${shimmerClass}`} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className={`rounded-3xl border p-6 space-y-4 ${containerBg}`}
            >
              <div className="flex items-start gap-4">
                {/* Icon box */}
                <div className={`w-14 h-14 rounded-2xl flex-shrink-0 ${shimmerClass}`} />

                {/* Title & Description */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className={`w-32 h-5 rounded-lg ${shimmerClass}`} />
                    <div className={`w-6 h-4 rounded-full ${shimmerClass}`} />
                  </div>
                  <div className={`w-full h-3 rounded ${shimmerClass}`} />
                  <div className={`w-3/4 h-3 rounded ${shimmerClass}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

