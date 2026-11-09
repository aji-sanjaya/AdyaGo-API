import React from 'react';
import { Warehouse, Boxes } from 'lucide-react';

export default function StockDistributionByWarehouse({ stockPerWarehouse, isDark }) {
  const formatNumber = (val) => {
    if (!val || isNaN(val)) return '0';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const maxQty = stockPerWarehouse.reduce((max, cur) => Math.max(max, cur.total_qty), 1);

  return (
    <div className={`p-6 rounded-3xl border ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Stock Distribution by Warehouse
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Inventory allocation across active warehouse locations
          </p>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
          {stockPerWarehouse.length} Locations
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {stockPerWarehouse.map((wh, idx) => {
          const percent = Math.min(100, Math.max(8, (wh.total_qty / maxQty) * 100));
          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
                    <Warehouse className="w-3.5 h-3.5" />
                  </div>
                  <h4 className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {wh.warehouse_name}
                  </h4>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Boxes className="w-3 h-3 text-slate-400" />
                    <span>{wh.product_count} SKUs</span>
                  </div>
                  <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-blue-600'}`}>
                    {formatNumber(wh.total_qty)}
                  </span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                    style={{ width: `${percent}%` }}
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

