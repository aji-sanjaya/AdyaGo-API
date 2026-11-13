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
  ChevronDown,
  ChevronUp,
  MapPin,
  Tag,
} from 'lucide-react';
import { orderApi } from '../../../../api/order';

export default function LinkedReceiptsTab({ orderId, isDark, onTotalCountChange }) {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReceipts, setExpandedReceipts] = useState({});

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
        // Expand all by default
        const initialExpanded = {};
        res.data.forEach((r) => {
          initialExpanded[r.m_inout_id] = true;
        });
        setExpandedReceipts(initialExpanded);
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

  const toggleExpand = (rcptId) => {
    setExpandedReceipts((prev) => ({
      ...prev,
      [rcptId]: !prev[rcptId],
    }));
  };

  const formatQty = (qty, precision = 2) => {
    if (qty === null || qty === undefined || isNaN(qty)) return '0';
    return Number(qty).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: precision,
    });
  };

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
      const docMatch = r.documentno?.toLowerCase().includes(q);
      const poRefMatch = r.poreference?.toLowerCase().includes(q);
      const doRefMatch = r.doreference?.toLowerCase().includes(q);
      const sppMatch = r.sppno?.toLowerCase().includes(q);
      const vendorMatch = r.vendor_name?.toLowerCase().includes(q);
      const warehouseMatch = r.warehouse_name?.toLowerCase().includes(q);
      const orgMatch = r.org_name?.toLowerCase().includes(q);
      const descMatch = r.description?.toLowerCase().includes(q);
      const lineMatch = r.lines?.some(
        (l) =>
          l.product_name?.toLowerCase().includes(q) ||
          l.product_code?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          l.locator_value?.toLowerCase().includes(q)
      );
      return docMatch || poRefMatch || doRefMatch || sppMatch || vendorMatch || warehouseMatch || orgMatch || descMatch || lineMatch;
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
            placeholder="Search receipt no, SPP, DO ref, item..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition-all font-mono"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadReceipts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && receipts.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
          <p className="text-sm font-mono text-slate-500 dark:text-slate-400">Loading linked material receipts...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredReceipts.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center font-mono">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <PackageCheck className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">
            {searchQuery ? 'No matching material receipts found' : 'No linked material receipts yet'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            {searchQuery
              ? 'Try modifying your search criteria.'
              : 'There are no Material Receipt (GRN / Surat Jalan) documents linked to this purchase order yet.'}
          </p>
        </div>
      )}

      {/* List of Receipts Breakdown Cards */}
      <div className="space-y-4">
        {filteredReceipts.map((rcpt) => {
          const isExpanded = expandedReceipts[rcpt.m_inout_id];
          const totalQty = rcpt.total_qty || rcpt.lines?.reduce((acc, l) => acc + (l.movementqty || 0), 0) || 0;

          return (
            <div
              key={rcpt.m_inout_id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-all"
            >
              {/* Header card (Clickable to Expand/Collapse) */}
              <div
                onClick={() => toggleExpand(rcpt.m_inout_id)}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 select-none transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold font-mono text-blue-600 dark:text-cyan-400 text-base flex items-center gap-1.5">
                      <PackageCheck className="w-4 h-4 text-cyan-500" />
                      {rcpt.documentno}
                    </span>
                    {getStatusBadge(rcpt.docstatus, rcpt.docstatus_label)}
                    <span className="text-xs font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 px-2.5 py-0.5 rounded-full font-medium">
                      {rcpt.lines?.length || 0} line{(rcpt.lines?.length || 0) !== 1 ? 's' : ''}
                    </span>
                    {rcpt.doctype_name && (
                      <span className="text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-medium">
                        {rcpt.doctype_name}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-500 dark:text-slate-400">
                    {rcpt.movementdate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Movement:</span>{' '}
                        {rcpt.movementdate}
                      </span>
                    )}
                    {rcpt.warehouse_name && (
                      <span className="flex items-center gap-1">
                        <Warehouse className="w-3.5 h-3.5 text-indigo-400" />
                        {rcpt.warehouse_name}
                      </span>
                    )}
                    {rcpt.org_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        {rcpt.org_name}
                      </span>
                    )}
                    {rcpt.doreference && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">DO Ref:</span>{' '}
                        {rcpt.doreference}
                      </span>
                    )}
                    {rcpt.sppno && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">SPP:</span>{' '}
                        {rcpt.sppno}
                      </span>
                    )}
                    {rcpt.vendor_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Vendor:</span>{' '}
                        {rcpt.vendor_name}
                      </span>
                    )}
                  </div>

                  {rcpt.description && (
                    <p className="text-xs font-mono text-slate-600 dark:text-slate-300 italic">
                      "{rcpt.description}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 font-mono">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Total Received Qty</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {formatQty(totalQty, 2)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Collapsible lines container */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 p-3 sm:p-4">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden font-mono">
                    {/* Mobile Lines Card View (Visible only on small screens: < md) */}
                    <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/60">
                      {rcpt.lines && rcpt.lines.length > 0 ? (
                        rcpt.lines.map((l, idx) => {
                          const isLinkedToPo = !!l.po_line_no;
                          return (
                            <div
                              key={l.m_inoutline_id || idx}
                              className={`p-3.5 space-y-2.5 transition-colors ${
                                isDark ? 'bg-slate-900/40 hover:bg-slate-800/40' : 'bg-white hover:bg-slate-50/80'
                              } ${isLinkedToPo ? 'border-l-2 border-l-emerald-500' : ''}`}
                            >
                              {/* Line Header */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold flex-shrink-0">
                                    Line #{l.line || idx + 1}
                                  </span>
                                  {l.product_code && (
                                    <span className="text-xs font-semibold text-slate-400 truncate">
                                      {l.product_code}
                                    </span>
                                  )}
                                </div>
                                {isLinkedToPo ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold flex-shrink-0">
                                    PO Line #{l.po_line_no}
                                    {l.po_qty !== null && l.po_qty !== undefined && (
                                      <span className="opacity-75 font-normal"> (of {formatQty(l.po_qty, 0)})</span>
                                    )}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic flex-shrink-0">Unlinked</span>
                                )}
                              </div>

                              {/* Product Name & Description */}
                              <div>
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-snug">
                                  {l.product_name || 'Generic Item'}
                                </h5>
                                {l.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                    {l.description}
                                  </p>
                                )}
                              </div>

                              {/* Key Metrics Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                {/* Movement Qty */}
                                <div
                                  className={`p-2 rounded-xl border flex flex-col gap-0.5 ${
                                    isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                    Movement Qty
                                  </span>
                                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                    {formatQty(l.movementqty, l.uom_precision || 2)}{' '}
                                    <span className="text-cyan-400 font-semibold">{l.uom_symbol || l.uom_name || ''}</span>
                                  </span>
                                </div>

                                {/* Qty Entered */}
                                <div
                                  className={`p-2 rounded-xl border flex flex-col gap-0.5 ${
                                    isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                    Qty Entered
                                  </span>
                                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                    {formatQty(l.qtyentered, l.uom_precision || 2)}
                                  </span>
                                </div>

                                {/* Locator */}
                                <div
                                  className={`col-span-2 sm:col-span-1 p-2 rounded-xl border flex flex-col gap-0.5 ${
                                    isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-white border-slate-200'
                                  }`}
                                >
                                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                                    <MapPin className="w-3 h-3 text-cyan-400" />
                                    <span>Locator</span>
                                  </span>
                                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                    {l.locator_value || '-'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 text-center text-slate-400 text-xs font-mono">
                          No lines found in this material receipt.
                        </div>
                      )}
                    </div>

                    {/* Desktop / Tablet Table View (Visible only on md+ screens) */}
                    <div className="hidden md:block overflow-x-auto w-full max-w-full">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">Line</th>
                            <th className="py-2.5 px-3">Item / Description</th>
                            <th className="py-2.5 px-3 w-28">Locator</th>
                            <th className="py-2.5 px-3 w-32 text-right">Movement Qty</th>
                            <th className="py-2.5 px-3 w-20">UoM</th>
                            <th className="py-2.5 px-3 w-36 text-center">Matched PO Line</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                          {rcpt.lines && rcpt.lines.length > 0 ? (
                            rcpt.lines.map((l) => {
                              const isLinkedToPo = !!l.po_line_no;
                              return (
                                <tr
                                  key={l.m_inoutline_id}
                                  className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                                    isLinkedToPo ? 'bg-emerald-500/5 dark:bg-emerald-500/10' : ''
                                  }`}
                                >
                                  <td className="py-2.5 px-3 text-center text-slate-400 font-bold">{l.line}</td>
                                  <td className="py-2.5 px-3">
                                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                                      {l.product_name || 'Generic Item'}
                                    </div>
                                    {l.product_code && (
                                      <span className="text-[11px] text-slate-400 block">{l.product_code}</span>
                                    )}
                                    {l.description && (
                                      <div className="text-[11px] text-slate-500 italic mt-0.5">{l.description}</div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                    {l.locator_value ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        {l.locator_value}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                                    {formatQty(l.movementqty, l.uom_precision || 2)}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">{l.uom_symbol || l.uom_name || '-'}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    {isLinkedToPo ? (
                                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                        PO Line #{l.po_line_no}
                                        {l.po_qty !== null && l.po_qty !== undefined && (
                                          <span className="opacity-75 font-normal"> (of {formatQty(l.po_qty, 0)})</span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 text-xs italic">Unlinked</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="py-4 text-center text-slate-400">
                                No lines found in this material receipt.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
