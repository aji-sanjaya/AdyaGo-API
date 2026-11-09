import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';

export default function RecentSalesOrdersTable({ recentOrders, isDark, formatIDR }) {
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
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

  return (
    <div className={`p-6 rounded-3xl border ${
      isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Recent Sales Orders
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Latest sales transactions recorded in Enterprise Core
          </p>
        </div>
        <span className="text-[10px] font-mono px-2.5 py-1 rounded-xl bg-cyan-950/40 text-cyan-400 border border-cyan-500/30">
          {recentOrders.length} Records
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${
              isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'
            }`}>
              <th className="py-3 px-3">Doc No</th>
              <th className="py-3 px-3">Date</th>
              <th className="py-3 px-3">Customer / Partner</th>
              <th className="py-3 px-3 text-right">Grand Total</th>
              <th className="py-3 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 font-mono">
            {recentOrders.map((order) => (
              <tr
                key={order.id}
                className={`transition-colors ${
                  isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                }`}
              >
                <td className="py-3 px-3 font-bold text-cyan-400">
                  {order.documentno}
                </td>
                <td className={`py-3 px-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {order.dateordered ? new Date(order.dateordered).toLocaleDateString() : '-'}
                </td>
                <td className={`py-3 px-3 font-sans font-medium ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {order.customer_name}
                </td>
                <td className={`py-3 px-3 text-right font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {formatIDR(order.grandtotal)}
                </td>
                <td className="py-3 px-3 text-center">
                  {getStatusBadge(order.docstatus)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

