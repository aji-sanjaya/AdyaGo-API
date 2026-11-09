import React from 'react';
import { 
  FileCheck, ShoppingCart, TrendingUp, Warehouse, 
  Activity, Sparkles 
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function FeaturesShowcase() {
  const { isDark } = useTheme();

  return (
    <div className="hidden lg:flex lg:col-span-7 flex-col justify-center space-y-7 pr-4">
      {/* Futuristic Badge */}
      <div
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-mono w-max backdrop-blur-md shadow-lg transition-colors ${
          isDark
            ? 'bg-slate-900/90 border-indigo-500/30 text-indigo-300 shadow-indigo-500/10'
            : 'bg-white/90 border-indigo-200 text-indigo-700 shadow-indigo-500/5'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-cyan-500 animate-spin" />
        <span>ADYAGO NEXT-GEN INDUSTRIAL ERP</span>
      </div>

      {/* Hero Typography */}
      <div className="space-y-3.5">
        <h1
          className={`text-4xl sm:text-5xl font-black tracking-tight leading-tight transition-colors ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Intelligent Factory <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500">
            Operations &amp; Control
          </span>
        </h1>
        <p className={`text-sm sm:text-base max-w-lg leading-relaxed transition-colors ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Unified manufacturing execution system powered by high-speed Go engines and live enterprise core synchronization.
        </p>
      </div>

      {/* Enterprise Modules & Features Grid */}
      <div className="grid grid-cols-2 gap-3.5 max-w-xl pt-1">
        {/* 1. Digital Approval */}
        <div
          className={`p-4 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all group ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
              : 'bg-white/80 border-slate-200/80 shadow-md shadow-slate-100 hover:border-slate-300 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-mono flex items-center gap-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <FileCheck className="w-4 h-4 text-emerald-400" /> Digital Approval
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
              WORKFLOW
            </span>
          </div>
          <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Paperless Sign-off
          </div>
          <div className={`text-[11px] mt-1 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Multi-tier hierarchical authorization &amp; instant document approvals
          </div>
        </div>

        {/* 2. Procurement */}
        <div
          className={`p-4 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all group ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
              : 'bg-white/80 border-slate-200/80 shadow-md shadow-slate-100 hover:border-slate-300 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-mono flex items-center gap-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <ShoppingCart className="w-4 h-4 text-cyan-400" /> Procurement
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-medium">
              PURCHASING
            </span>
          </div>
          <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            End-to-End SCM
          </div>
          <div className={`text-[11px] mt-1 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Requisition pipelines, purchase orders &amp; vendor performance tracking
          </div>
        </div>

        {/* 3. Sales Management */}
        <div
          className={`p-4 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all group ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
              : 'bg-white/80 border-slate-200/80 shadow-md shadow-slate-100 hover:border-slate-300 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-mono flex items-center gap-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <TrendingUp className="w-4 h-4 text-indigo-400" /> Sales Orders
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-medium">
              COMMERCE
            </span>
          </div>
          <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Order Fulfillment
          </div>
          <div className={`text-[11px] mt-1 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Customer order lifecycles, delivery orders &amp; receivable monitoring
          </div>
        </div>

        {/* 4. Warehouse & Inventory */}
        <div
          className={`p-4 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all group ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
              : 'bg-white/80 border-slate-200/80 shadow-md shadow-slate-100 hover:border-slate-300 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-mono flex items-center gap-1.5 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Warehouse className="w-4 h-4 text-amber-400" /> Warehouse
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium">
              INVENTORY
            </span>
          </div>
          <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Multi-Locator Stock
          </div>
          <div className={`text-[11px] mt-1 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Real-time balance, material movements, receipts &amp; stock opname
          </div>
        </div>

        {/* 5. Production Realtime (Full-width showcase) */}
        <div
          className={`col-span-2 p-4 rounded-2xl border backdrop-blur-xl relative overflow-hidden transition-all group ${
            isDark
              ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
              : 'bg-white/80 border-slate-200/80 shadow-md shadow-slate-100 hover:border-slate-300 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[11px] font-mono flex items-center gap-2 uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Activity className="w-4 h-4 text-rose-400 animate-pulse" /> Real-time Production
            </span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-mono text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>LIVE SHOP FLOOR</span>
            </div>
          </div>
          <div className={`text-sm font-bold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>
            Manufacturing Execution &amp; Work Orders
          </div>
          <div className={`text-[11px] mt-1 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Live machine monitoring, work-in-progress (WIP) tracking &amp; automated output reporting
          </div>
        </div>
      </div>
    </div>
  );
}

