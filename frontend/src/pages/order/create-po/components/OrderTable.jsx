import React from 'react';
import { Eye, Printer, ArrowUpDown, ChevronLeft, ChevronRight, FileText, ShoppingCart } from 'lucide-react';

export default function OrderTable({
  orders,
  loading,
  isDark,
  page,
  limit,
  total,
  sortBy,
  sortDir,
  onSort,
  onPageChange,
  onLimitChange,
  onView,
  onPrint,
  printLoadingId,
}) {
  const totalPages = Math.ceil(total / limit) || 1;

  const getStatusBadge = (status, label) => {
    switch (status) {
      case 'CO':
      case 'CL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {label || 'Completed'}
          </span>
        );
      case 'IP':
      case 'AP':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            {label || 'In Progress'}
          </span>
        );
      case 'DR':
      case 'IN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {label || 'Draft'}
          </span>
        );
      case 'VO':
      case 'RE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            {label || 'Voided'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            {label || status}
          </span>
        );
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <div
      className={`rounded-3xl border overflow-hidden transition-all duration-300 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className={`border-b text-[11px] font-mono uppercase tracking-wider ${
                isDark ? 'border-slate-800 bg-slate-900/90 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'
              }`}
            >
              <th
                onClick={() => onSort('documentno')}
                className="py-3.5 px-4 font-bold cursor-pointer hover:text-cyan-400 transition-colors select-none"
              >
                <div className="flex items-center space-x-1.5">
                  <span>Document No</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => onSort('dateordered')}
                className="py-3.5 px-4 font-bold cursor-pointer hover:text-cyan-400 transition-colors select-none"
              >
                <div className="flex items-center space-x-1.5">
                  <span>Date Ordered</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3.5 px-4 font-bold">Vendor / Supplier</th>
              <th className="py-3.5 px-4 font-bold">Warehouse & Org</th>
              <th
                onClick={() => onSort('grandtotal')}
                className="py-3.5 px-4 font-bold cursor-pointer hover:text-cyan-400 transition-colors select-none text-right"
              >
                <div className="flex items-center justify-end space-x-1.5">
                  <span>Grand Total</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th
                onClick={() => onSort('docstatus')}
                className="py-3.5 px-4 font-bold cursor-pointer hover:text-cyan-400 transition-colors select-none text-center"
              >
                <div className="flex items-center justify-center space-x-1.5">
                  <span>Status</span>
                  <ArrowUpDown className="w-3 h-3 opacity-60" />
                </div>
              </th>
              <th className="py-3.5 px-4 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y text-xs font-medium ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-28"></div></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-24"></div></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-36"></div></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-800 rounded w-32"></div></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-800 rounded w-24 ml-auto"></div></td>
                  <td className="py-4 px-4 text-center"><div className="h-4 bg-slate-800 rounded w-20 mx-auto"></div></td>
                  <td className="py-4 px-4 text-center"><div className="h-4 bg-slate-800 rounded w-16 mx-auto"></div></td>
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <span>No purchase orders found matching your criteria.</span>
                </td>
              </tr>
            ) : (
              orders.map((po) => (
                <tr
                  key={po.c_order_id}
                  className={`transition-colors group ${
                    isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <td className="py-3.5 px-4 font-mono font-bold">
                    <button
                      onClick={() => onView(po)}
                      className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors flex items-center space-x-1.5"
                    >
                      <span>{po.documentno}</span>
                    </button>
                    {po.description && (
                      <span className="text-[10px] text-slate-500 block truncate max-w-xs mt-0.5">
                        {po.description}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span>{formatDate(po.dateordered)}</span>
                    {po.datepromised && (
                      <span className="text-[10px] text-slate-500 block">
                        Promised: {formatDate(po.datepromised)}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold block truncate max-w-xs text-slate-200">
                      {po.bpartner_name || '-'}
                    </span>
                    {po.bpartner_value && (
                      <span className="text-[10px] font-mono text-slate-500 block">
                        {po.bpartner_value}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="block font-medium truncate max-w-[180px]">
                      {po.warehouse_name || '-'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 block truncate max-w-[180px]">
                      {po.org_name}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                    {formatCurrency(po.grandtotal)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {getStatusBadge(po.docstatus, po.status_label)}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center space-x-1.5">
                      <button
                        onClick={() => onView(po)}
                        title="View & Edit"
                        className={`p-2 rounded-xl transition-all ${
                          isDark
                            ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400'
                            : 'bg-slate-100 hover:bg-slate-200 text-indigo-600'
                        }`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onPrint(po)}
                        disabled={printLoadingId === po.c_order_id}
                        title="Print Preview"
                        className={`p-2 rounded-xl transition-all ${
                          isDark
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        className={`px-6 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs ${
          isDark ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-slate-100 bg-slate-50 text-slate-600'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span>Rows per page:</span>
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className={`px-2.5 py-1 rounded-lg border text-xs outline-none ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {[10, 25, 50, 100].map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">
            Showing {total === 0 ? 0 : (page - 1) * limit + 1} -{' '}
            {Math.min(page * limit, total)} of {total.toLocaleString()} records
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 hover:bg-white text-slate-700'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>
            Page <strong className="text-cyan-400">{page}</strong> of{' '}
            <strong>{totalPages}</strong>
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className={`p-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 hover:bg-white text-slate-700'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
