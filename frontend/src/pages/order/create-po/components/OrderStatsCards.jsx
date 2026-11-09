import React from 'react';
import { ShoppingCart, CheckCircle2, Clock, FileEdit } from 'lucide-react';

export default function OrderStatsCards({ stats, loading, isDark, activeStatus, onSelectStatus }) {
  const cards = [
    {
      key: 'ALL',
      label: 'All Orders (This Month)',
      count: stats?.total_month || 0,
      icon: ShoppingCart,
      color: 'blue',
      desc: 'All active Purchase Orders',
    },
    {
      key: 'CO',
      label: 'Completed',
      count: stats?.completed || 0,
      icon: CheckCircle2,
      color: 'emerald',
      desc: 'Approved & completed POs',
    },
    {
      key: 'IP',
      label: 'In Progress',
      count: stats?.in_progress || 0,
      icon: Clock,
      color: 'amber',
      desc: 'Pending approval / workflow',
    },
    {
      key: 'DR',
      label: 'Draft',
      count: stats?.draft || 0,
      icon: FileEdit,
      color: 'purple',
      desc: 'Under preparation',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 w-full">
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeStatus === card.key;
        return (
          <div
            key={card.key}
            onClick={() => onSelectStatus(isActive ? '' : card.key)}
            className={`p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all duration-300 relative overflow-hidden cursor-pointer ${
              isActive
                ? isDark
                  ? 'bg-slate-800 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40'
                  : 'bg-indigo-50/70 border-indigo-500 shadow-md ring-1 ring-indigo-500/30'
                : isDark
                ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  card.color === 'emerald'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : card.color === 'amber'
                    ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                    : card.color === 'purple'
                    ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                    : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              {isActive && (
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  Active
                </span>
              )}
            </div>
            <div className="mt-2.5 sm:mt-4">
              <span className={`text-[10px] sm:text-[11px] font-mono tracking-wider uppercase block truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {card.label}
              </span>
              <p className={`text-lg sm:text-2xl font-black tracking-tight mt-0.5 sm:mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {loading ? '...' : card.count.toLocaleString()}
              </p>
              <p className="text-[9px] sm:text-[10px] font-mono text-slate-500 mt-0.5 truncate hidden sm:block">
                {card.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
