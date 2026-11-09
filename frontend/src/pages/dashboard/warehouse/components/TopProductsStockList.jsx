import React from 'react';
import { Package, Layers } from 'lucide-react';

export default function TopProductsStockList({ topProducts, isDark }) {
  const formatNumber = (val) => {
    if (!val || isNaN(val)) return '0';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className={`p-6 rounded-3xl border flex flex-col justify-between ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-400" />
            <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Top Products
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-400 uppercase">Stock On Hand</span>
        </div>

        <div className="space-y-3">
          {topProducts.map((product, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold flex-shrink-0 ${
                    idx === 0
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40'
                      : idx === 1
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : idx === 2
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <p className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {product.product_name}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono mt-1.5 pl-7.5">
                <div className="flex items-center gap-1 text-slate-500">
                  <Package className="w-3 h-3 text-slate-400" />
                  <span>Available Qty</span>
                </div>
                <span className={`font-bold ${isDark ? 'text-cyan-400' : 'text-purple-600'}`}>
                  {formatNumber(product.total_qty)} Units
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

