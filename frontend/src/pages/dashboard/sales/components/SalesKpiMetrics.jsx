import React from 'react';
import { DollarSign, ShoppingBag, CheckCircle2, Truck, TrendingUp, TrendingDown } from 'lucide-react';

export default function SalesKpiMetrics({ kpis, loading, isDark, formatIDR }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Monthly Revenue (SO) */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
          {kpis && kpis.revenue_change_pct !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              kpis.revenue_change_pct > 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {kpis.revenue_change_pct > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(kpis.revenue_change_pct)}% MoM</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Monthly Revenue (SO)
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : formatIDR(kpis?.current_month_revenue)}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Last Month: {loading ? '...' : formatIDR(kpis?.last_month_revenue)}
          </p>
        </div>
      </div>

      {/* Card 2: Total Sales Orders */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            {loading ? '...' : (kpis?.total_sos || 0)} Total
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Total Sales Orders
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : kpis?.total_sos || 0}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            All-time registered sales orders
          </p>
        </div>
      </div>

      {/* Card 3: Active Orders */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Active
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Active Orders
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : kpis?.active_sos || 0}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Completed: {kpis?.so_stats?.CO || 0} &bull; In Progress: {kpis?.so_stats?.IP || 0}
          </p>
        </div>
      </div>

      {/* Card 4: Pending Shipments */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Truck className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            To Deliver
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Pending Shipments
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : kpis?.pending_shipment_count || 0}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Orders with remaining delivery quantities
          </p>
        </div>
      </div>
    </div>
  );
}

