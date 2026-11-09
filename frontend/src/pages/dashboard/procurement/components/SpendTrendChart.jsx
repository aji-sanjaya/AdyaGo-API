import React from 'react';

export default function SpendTrendChart({ spendTrend, isDark, formatIDR }) {
  const maxSpend = spendTrend.reduce((max, cur) => Math.max(max, cur.total_spend), 1);

  return (
    <div className={`p-6 rounded-3xl border ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Monthly Spend Trend
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Last 6 months cumulative purchasing volume
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          6 MONTHS
        </span>
      </div>

      <div className="space-y-4 pt-2">
        {spendTrend.map((item, idx) => {
          const percent = Math.min(100, Math.max(8, (item.total_spend / maxSpend) * 100));
          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{item.month_label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">({item.po_count} POs)</span>
                  <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`}>
                    {formatIDR(item.total_spend)}
                  </span>
                </div>
              </div>
              <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-700"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

