import React from 'react';
import { CheckCircle2, Clock, ArrowDownLeft, ArrowUpRight, FileText } from 'lucide-react';

export default function RecentMovementsTable({ recentMovements, isDark }) {
  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'CO' || s === 'CL') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Completed</span>
        </span>
      );
    }
    if (s === 'IP') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <Clock className="w-2.5 h-2.5" />
          <span>In Progress</span>
        </span>
      );
    }
    if (s === 'DR') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
          <span>Draft</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950/40 text-cyan-400 border border-cyan-500/30">
        {s}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`p-6 rounded-3xl border ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Recent Warehouse Movements
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Latest internal warehouse inbound receipts and outbound shipments
          </p>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-xl bg-purple-950/40 text-purple-400 border border-purple-500/30">
          {recentMovements.length} Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}>
              <th className="pb-3 font-semibold">Document No</th>
              <th className="pb-3 font-semibold">Movement Type</th>
              <th className="pb-3 font-semibold">Partner</th>
              <th className="pb-3 font-semibold">Warehouse</th>
              <th className="pb-3 font-semibold">Date</th>
              <th className="pb-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {recentMovements.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                  No warehouse movements recorded.
                </td>
              </tr>
            ) : (
              recentMovements.map((mov) => {
                const isOutbound = mov.issotrx === 'Y';
                return (
                  <tr
                    key={mov.id}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-3 font-mono font-bold text-blue-400">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>{mov.documentno}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      {isOutbound ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          <ArrowUpRight className="w-2.5 h-2.5" />
                          <span>Outbound</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <ArrowDownLeft className="w-2.5 h-2.5" />
                          <span>Inbound</span>
                        </span>
                      )}
                    </td>
                    <td className={`py-3 font-medium max-w-[200px] truncate ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {mov.partner_name}
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {mov.warehouse_name}
                    </td>
                    <td className="py-3 font-mono text-slate-400">
                      {formatDate(mov.movementdate)}
                    </td>
                    <td className="py-3 text-right">
                      {getStatusBadge(mov.docstatus)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

