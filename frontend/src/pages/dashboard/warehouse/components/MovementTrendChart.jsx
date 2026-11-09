import React from 'react';

export default function MovementTrendChart({ movementTrend, isDark }) {
  const maxMovement = movementTrend.reduce(
    (max, cur) => Math.max(max, cur.inbound_count, cur.outbound_count),
    1
  );

  return (
    <div className={`p-6 rounded-3xl border ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Inbound vs Outbound Movement Trend
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Last 6 months material receipts vs customer dispatches
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Inbound (Receipts)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>Outbound (Shipments)</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        {movementTrend.map((item, idx) => {
          const inPct = Math.min(100, Math.max(6, (item.inbound_count / maxMovement) * 100));
          const outPct = Math.min(100, Math.max(6, (item.outbound_count / maxMovement) * 100));

          return (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {item.month_label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400 font-bold">
                    IN: {item.inbound_count.toLocaleString()}
                  </span>
                  <span className="text-amber-400 font-bold">
                    OUT: {item.outbound_count.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Dual Bar Progress */}
              <div className="grid grid-cols-2 gap-2">
                {/* Inbound Bar */}
                <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                    style={{ width: `${inPct}%` }}
                  />
                </div>
                {/* Outbound Bar */}
                <div className={`h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 transition-all duration-700"
                    style={{ width: `${outPct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

