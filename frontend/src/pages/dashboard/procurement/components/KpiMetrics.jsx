import React from 'react';
import { DollarSign, FileText, ShoppingCart, PackageCheck, TrendingUp, TrendingDown } from 'lucide-react';

export default function KpiMetrics({ kpis, loading, isDark, formatIDR }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Monthly PO Spend */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
          {kpis && kpis.spend_change_pct !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              kpis.spend_change_pct > 0
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              {kpis.spend_change_pct > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(kpis.spend_change_pct)}% MoM</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Monthly Spend (PO)
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : formatIDR(kpis?.current_month_spend)}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Last Month: {loading ? '...' : formatIDR(kpis?.last_month_spend)}
          </p>
        </div>
      </div>

      {/* Card 2: Requisitions (PR) */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <FileText className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            {loading ? '...' : (kpis?.pr_stats?.CO || 0)} Approved
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Requisitions (PR)
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : Object.values(kpis?.pr_stats || {}).reduce((a, b) => a + b, 0)} Total
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            In Progress: {kpis?.pr_stats?.IP || 0} &bull; Draft: {kpis?.pr_stats?.DR || 0}
          </p>
        </div>
      </div>

      {/* Card 3: Purchase Orders (PO) */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {loading ? '...' : (kpis?.po_stats?.CO || 0)} Completed
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Purchase Orders (PO)
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : Object.values(kpis?.po_stats || {}).reduce((a, b) => a + b, 0)} Total
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Pending Approval: {kpis?.po_stats?.IP || 0} POs
          </p>
        </div>
      </div>

      {/* Card 4: Pending Delivery (GR) */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <PackageCheck className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            Awaiting GR
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Pending Delivery (GR)
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : kpis?.pending_delivery_count || 0}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            POs with remaining delivery items
          </p>
        </div>
      </div>
    </div>
  );
}

