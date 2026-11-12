import React, { useState, useEffect, useMemo } from 'react';
import {
  PackageCheck,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  Building2,
  Warehouse,
  User,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileText,
} from 'lucide-react';
import { orderApi } from '../../../../api/order';

export default function LinkedReceiptsTab({ orderId, isDark, onTotalCountChange }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadReceipts = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await orderApi.getLinkedReceipts(orderId);
      if (res && res.data) {
        setReceipts(res.data);
        if (onTotalCountChange) {
          onTotalCountChange(res.data.length);
        }
      }
    } catch (err) {
      console.error('Failed to load linked receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [orderId]);

  const getStatusBadge = (docStatus, label) => {
    let bg = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    let icon = <Clock className="w-3.5 h-3.5 mr-1" />;

    if (docStatus === 'CO' || docStatus === 'CL') {
      bg = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      icon = <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />;
    } else if (docStatus === 'DR' || docStatus === 'IN') {
      bg = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
      icon = <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-500" />;
    } else if (docStatus === 'VO' || docStatus === 'RE') {
      bg = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50';
      icon = <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${bg}`}>
        {icon}
        {label || docStatus}
      </span>
    );
  };

  const filteredReceipts = useMemo(() => {
    if (!searchQuery.trim()) return receipts;
    const q = searchQuery.toLowerCase();
    return receipts.filter((r) => {
      return (
        r.documentno?.toLowerCase().includes(q) ||
        r.poreference?.toLowerCase().includes(q) ||
        r.doreference?.toLowerCase().includes(q) ||
        r.sppno?.toLowerCase().includes(q) ||
        r.vendor_name?.toLowerCase().includes(q) ||
        r.warehouse_name?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
      );
    });
  }, [receipts, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Bar: Search & Refresh */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search receipt no, SPP, DO ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadReceipts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && receipts.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading linked material receipts...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredReceipts.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <PackageCheck className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-base font-medium text-slate-800 dark:text-slate-200">
            {searchQuery ? 'No matching material receipts found' : 'No material receipts yet'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            {searchQuery
              ? 'Try modifying your search criteria.'
              : 'There are no material receipts (GRN / Surat Jalan) recorded for this purchase order yet.'}
          </p>
        </div>
      )}

      {/* Receipts Container with Mobile Card View & Desktop Table View */}
      {filteredReceipts.length > 0 && (
        <div
          className={`rounded-xl border transition-all duration-300 overflow-hidden w-full min-w-0 max-w-full ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          {/* Mobile Receipts Card View (Visible only on < md screens) */}
          <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredReceipts.map((rcpt) => (
              <div
                key={rcpt.m_inout_id}
                className={`p-4 space-y-3 transition-colors ${
                  isDark ? 'bg-slate-900/30 hover:bg-slate-900/70' : 'bg-white hover:bg-slate-50/80'
                }`}
              >
                {/* Header: Doc Number & Status */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                      <PackageCheck className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono font-bold text-sm text-blue-500 dark:text-cyan-400 block truncate">
                        {rcpt.documentno}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block truncate">
                        {rcpt.doctype_name || 'Material Receipt'}
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {getStatusBadge(rcpt.docstatus, rcpt.docstatus_label)}
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {/* Movement Date */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                      isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 font-semibold">
                      <Calendar className="w-3 h-3 text-cyan-400" />
                      <span>Movement</span>
                    </span>
                    <span className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {rcpt.movementdate || '-'}
                    </span>
                  </div>

                  {/* Warehouse */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                      isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 font-semibold">
                      <Warehouse className="w-3 h-3 text-indigo-400" />
                      <span>Warehouse</span>
                    </span>
                    <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {rcpt.warehouse_name || '-'}
                    </span>
                  </div>

                  {/* SPP No */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                      isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      SPP No
                    </span>
                    <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {rcpt.sppno || '-'}
                    </span>
                  </div>

                  {/* DO Reference */}
                  <div
                    className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                      isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      DO Ref
                    </span>
                    <span className={`font-bold text-xs truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                      {rcpt.doreference || '-'}
                    </span>
                  </div>
                </div>

                {/* Vendor & Creator Info */}
                <div
                  className={`text-xs font-mono p-2.5 rounded-xl border space-y-1 ${
                    isDark
                      ? 'bg-slate-950/30 border-slate-800/60 text-slate-300'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600'
                  }`}
                >
                  {rcpt.vendor_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-indigo-400" /> Vendor:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                        {rcpt.vendor_name}
                      </span>
                    </div>
                  )}
                  {rcpt.creator_name && (
                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-1">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <User className="w-3 h-3 text-cyan-400" /> Created By:
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                        {rcpt.creator_name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Description Note */}
                {rcpt.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 font-mono">
                    "{rcpt.description}"
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop / Tablet Table View (Visible only on md+ screens) */}
          <div className="hidden md:block overflow-x-auto w-full max-w-full touch-pan-x">
            <table className="w-full text-xs text-left min-w-[700px] border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold font-mono text-[10px] uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Doc Type</th>
                  <th className="py-3 px-4">Movement Date</th>
                  <th className="py-3 px-4">DO Ref / SPP</th>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4">Vendor / Supplier</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                {filteredReceipts.map((rcpt) => (
                  <tr
                    key={rcpt.m_inout_id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Document No */}
                    <td className="py-3 px-4 font-bold text-blue-500 dark:text-cyan-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <PackageCheck className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span>{rcpt.documentno}</span>
                      </div>
                      {rcpt.description && (
                        <span className="text-[10px] text-slate-400 block truncate max-w-xs font-normal">
                          {rcpt.description}
                        </span>
                      )}
                    </td>

                    {/* Doc Type */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {rcpt.doctype_name || 'Material Receipt'}
                    </td>

                    {/* Movement Date */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {rcpt.movementdate || '-'}
                    </td>

                    {/* DO Ref / SPP */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {rcpt.doreference && (
                        <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                          DO: {rcpt.doreference}
                        </div>
                      )}
                      {rcpt.sppno && (
                        <div className="text-[10px] text-slate-400">
                          SPP: {rcpt.sppno}
                        </div>
                      )}
                      {!rcpt.doreference && !rcpt.sppno && '-'}
                    </td>

                    {/* Warehouse */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Warehouse className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[140px]">{rcpt.warehouse_name || '-'}</span>
                      </div>
                    </td>

                    {/* Vendor */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <span className="truncate max-w-[180px] block font-semibold text-slate-800 dark:text-slate-200">
                        {rcpt.vendor_name || '-'}
                      </span>
                      {rcpt.creator_name && (
                        <span className="text-[10px] text-slate-400 block">
                          By: {rcpt.creator_name}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(rcpt.docstatus, rcpt.docstatus_label)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

