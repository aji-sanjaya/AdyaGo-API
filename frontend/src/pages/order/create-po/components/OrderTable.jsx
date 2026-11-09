import React, { useState, useMemo } from 'react';
import {
  Eye,
  Printer,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Search,
  SlidersHorizontal,
  RotateCcw,
  Plus,
  Loader2,
} from 'lucide-react';

export default function OrderTable({
  orders = [],
  loading = false,
  total = 0,
  page = 1,
  limit = 10,
  onPageChange,
  onLimitChange,
  sortBy: externalSortBy,
  sortDir: externalSortDir,
  onSortChange,
  onView,
  onPrint,
  printLoadingId,
  search = '',
  onSearchChange,
  onOpenFilterModal,
  activeFilterCount = 0,
  onResetFilters,
  onOpenCreate,
  isDark = true,
}) {
  const [internalSortField, setInternalSortField] = useState('dateordered');
  const [internalSortDirection, setInternalSortDirection] = useState('desc');

  const currentSortField = externalSortBy !== undefined ? externalSortBy : internalSortField;
  const currentSortDirection = externalSortDir !== undefined ? externalSortDir : internalSortDirection;

  const handleSort = (field) => {
    const nextDir = currentSortField === field && currentSortDirection === 'asc' ? 'desc' : 'asc';
    if (onSortChange) {
      onSortChange(field, nextDir);
    } else {
      setInternalSortField(field);
      setInternalSortDirection(nextDir);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (page <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (page >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
      }
    }
    return pages;
  };

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
      maximumFractionDigits: 0,
    }).format(num);
  };

  const renderSortHeader = (label, field, align = 'left') => {
    const isSorted = currentSortField === field;
    return (
      <th
        onClick={() => handleSort(field)}
        className={`px-4 py-3.5 font-semibold cursor-pointer select-none transition-colors ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        } ${isSorted ? (isDark ? 'text-cyan-400' : 'text-indigo-600') : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
      >
        <div
          className={`inline-flex items-center gap-1.5 ${
            align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
          }`}
        >
          <span>{label}</span>
          {isSorted ? (
            currentSortDirection === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-cyan-400" />
            ) : (
              <ArrowDown className="w-3 h-3 text-cyan-400" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 opacity-40" />
          )}
        </div>
      </th>
    );
  };

  const startEntry = total === 0 ? 0 : (page - 1) * limit + 1;
  const endEntry = Math.min(page * limit, total);

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden w-full min-w-0 max-w-full ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      {/* Integrated Card Header */}
      <div className="p-3.5 sm:p-5 border-b border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        {/* Title area */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <h3 className={`text-sm sm:text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Purchase Orders
          </h3>
        </div>

        {/* Search, Filter, and Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 flex-1 md:justify-end">
          {/* Search Box */}
          <div className="relative w-full sm:min-w-[220px] md:min-w-[260px] sm:max-w-xs md:max-w-sm flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Search document no, supplier, desc..."
              className={`w-full pl-9 pr-3.5 py-2 rounded-xl sm:rounded-2xl text-xs font-mono border outline-none transition ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              onClick={onOpenFilterModal}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-2xl border text-xs font-mono font-semibold transition cursor-pointer whitespace-nowrap ${
                activeFilterCount > 0
                  ? isDark
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                    : 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : isDark
                  ? 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border-slate-800'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 flex-shrink-0" />
              <span>Filter</span>
              {activeFilterCount > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-cyan-500 text-slate-950">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && onResetFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                title="Reset active filters"
                className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl sm:rounded-2xl border text-xs font-mono transition cursor-pointer ${
                  isDark
                    ? 'border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 bg-slate-950/50'
                    : 'border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-300 bg-white'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCreate}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-mono font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span>New Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto w-full max-w-full touch-pan-x min-h-[300px]">
        <table className="w-full text-left text-xs min-w-[700px] border-collapse">
          <thead>
            <tr
              className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-200 text-slate-500 bg-slate-50/70'
              }`}
            >
              <th className="px-4 py-3.5 font-semibold text-center w-24">Action</th>
              {renderSortHeader('Document No', 'documentno')}
              {renderSortHeader('Date Ordered', 'dateordered')}
              <th className="px-4 py-3.5 font-semibold">Vendor / Supplier</th>
              <th className="px-4 py-3.5 font-semibold">Created By</th>
              {renderSortHeader('Grand Total', 'grandtotal', 'right')}
              {renderSortHeader('Status', 'docstatus', 'center')}
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                  Loading purchase orders...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <span>No purchase orders found matching current filters.</span>
                </td>
              </tr>
            ) : (
              orders.map((po) => (
                <tr
                  key={po.c_order_id}
                  className={`transition-colors ${
                    isDark ? 'hover:bg-slate-800/40' : 'hover:bg-[rgb(238_242_255_/_0.7)]'
                  }`}
                >
                  {/* Action (Far Left) */}
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onView(po)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer ${
                          isDark
                            ? 'bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border-slate-700/80 hover:border-cyan-500/40'
                            : 'bg-white hover:bg-slate-100 text-indigo-600 hover:text-indigo-700 border-slate-200 shadow-sm'
                        }`}
                        title="View & Edit Order Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onPrint?.(po)}
                        disabled={printLoadingId === po.c_order_id}
                        className={`p-1.5 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
                          isDark
                            ? 'bg-slate-800/80 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border-slate-700/80 hover:border-amber-500/40'
                            : 'bg-white hover:bg-slate-100 text-amber-600 hover:text-amber-700 border-slate-200 shadow-sm'
                        }`}
                        title="Print Order PDF Preview"
                      >
                        {printLoadingId === po.c_order_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                        ) : (
                          <Printer className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </td>

                  {/* Document No */}
                  <td className="px-4 py-2 font-mono font-bold text-blue-500 dark:text-cyan-400">
                    <button
                      type="button"
                      onClick={() => onView(po)}
                      className="hover:underline text-left cursor-pointer"
                    >
                      <span>{po.documentno}</span>
                    </button>
                    {po.description && (
                      <span className="text-[10px] text-slate-500 block truncate max-w-xs mt-0.5 font-normal">
                        {po.description}
                      </span>
                    )}
                  </td>

                  {/* Date Ordered */}
                  <td className="px-4 py-2 font-mono whitespace-nowrap text-slate-400">
                    <span>{formatDate(po.dateordered)}</span>
                    {po.datepromised && (
                      <span className="text-[10px] text-slate-500 block">
                        Promised: {formatDate(po.datepromised)}
                      </span>
                    )}
                  </td>

                  {/* Vendor / Supplier */}
                  <td className="px-4 py-2 font-mono text-slate-400">
                    <span className="block truncate max-w-xs">
                      {po.bpartner_name || '-'}
                    </span>
                    {po.bpartner_value && (
                      <span className="text-[10px] text-slate-500 block">
                        {po.bpartner_value}
                      </span>
                    )}
                  </td>

                  {/* Created By */}
                  <td className="px-4 py-2 font-mono whitespace-nowrap text-slate-500">
                    <span className="block truncate max-w-[180px]">
                      {po.createdby_name || '-'}
                    </span>
                  </td>

                  {/* Grand Total */}
                  <td className="px-4 py-2 text-right font-mono text-slate-400 whitespace-nowrap">
                    {formatCurrency(po.grandtotal)}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    {getStatusBadge(po.docstatus, po.status_label)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div
        className={`px-4 sm:px-6 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs ${
          isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{startEntry}</strong> to{' '}
            <strong className={isDark ? 'text-white' : 'text-slate-900'}>{endEntry}</strong> of{' '}
            <strong className={isDark ? 'text-white' : 'text-slate-900'}>{total}</strong> orders
          </span>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[11px] text-slate-500 hidden sm:inline">Rows:</span>
            <select
              value={limit}
              onChange={(e) => onLimitChange?.(Number(e.target.value))}
              className={`px-2 py-1 rounded-lg border text-xs font-mono outline-none cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Page Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`dots-${idx}`} className="px-2 py-1 text-slate-500">
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange?.(p)}
                className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                  page === p
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-sm'
                    : isDark
                    ? 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-sm'
            }`}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
