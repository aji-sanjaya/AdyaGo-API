import React from 'react';
import { Truck, CheckCircle2, Clock, ShieldCheck, TrendingUp, TrendingDown } from 'lucide-react';

export default function DeliveryKpiMetrics({ kpis, loading, isDark }) {
  const completionRate = kpis?.total_shipments
    ? Math.round((kpis.completed_shipments / kpis.total_shipments) * 1000) / 10
    : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Shipments This Month */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Truck className="w-5 h-5" />
          </div>
          {kpis && kpis.shipment_change_pct !== 0 && (
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              kpis.shipment_change_pct > 0
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {kpis.shipment_change_pct > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(kpis.shipment_change_pct)}% MoM</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Shipments This Month
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : (kpis?.shipments_current_month?.toLocaleString() || 0)}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Last Month: {loading ? '...' : (kpis?.shipments_last_month?.toLocaleString() || 0)}
          </p>
        </div>
      </div>

      {/* Card 2: Completed Shipments */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            {loading ? '...' : (kpis?.total_shipments?.toLocaleString() || 0)} Total
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Completed Shipments
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : (kpis?.completed_shipments?.toLocaleString() || 0)}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            All-time delivered goods
          </p>
        </div>
      </div>

      {/* Card 3: Pending Deliveries */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            In Pipeline
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Pending Deliveries
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : (kpis?.pending_deliveries?.toLocaleString() || 0)}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Draft or in-transit status
          </p>
        </div>
      </div>

      {/* Card 4: Delivery Fulfillment Rate */}
      <div className={`p-5 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-between">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            completionRate >= 90
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
          }`}>
            Target 95%
          </span>
        </div>
        <div className="mt-4">
          <span className={`text-[11px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Fulfillment Rate
          </span>
          <p className={`text-xl sm:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {loading ? '...' : `${completionRate}%`}
          </p>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Completed vs total logged
          </p>
        </div>
      </div>
    </div>
  );
}

