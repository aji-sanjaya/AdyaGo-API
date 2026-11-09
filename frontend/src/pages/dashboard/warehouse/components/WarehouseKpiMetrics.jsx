import React from 'react';
import { Warehouse, Boxes, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export default function WarehouseKpiMetrics({ kpis, loading, isDark }) {
  const formatNumber = (val) => {
    if (!val || isNaN(val)) return '0';
    return Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Active Warehouses */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Warehouse className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Locations
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Active Warehouses
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : (kpis?.total_warehouses || 0)}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Registered active facilities
          </p>
        </div>
      </div>

      {/* Card 2: Products in Stock */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Boxes className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            {loading ? '...' : `${formatNumber(kpis?.total_stock_qty)} Units`}
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Products in Stock
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : (kpis?.products_in_stock?.toLocaleString() || 0)}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Distinct SKUs with stock &gt; 0
          </p>
        </div>
      </div>

      {/* Card 3: Inbound This Month */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Receipts
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Inbound This Month
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : (kpis?.inbound_this_month?.toLocaleString() || 0)}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Material receipts completed
          </p>
        </div>
      </div>

      {/* Card 4: Outbound This Month */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Shipments
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Outbound This Month
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : (kpis?.outbound_this_month?.toLocaleString() || 0)}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Customer shipments dispatched
          </p>
        </div>
      </div>
    </div>
  );
}

