import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  Building2,
  Package,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { orderApi } from '../../../../api/order';

export default function LinkedRequisitionsTab({ orderId, isDark, onTotalCountChange }) {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedReqs, setExpandedReqs] = useState({});

  const loadRequisitions = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await orderApi.getLinkedRequisitions(orderId);
      if (res && res.data) {
        setRequisitions(res.data);
        if (onTotalCountChange) {
          onTotalCountChange(res.data.length);
        }
        // Expand all by default
        const initialExpanded = {};
        res.data.forEach((r) => {
          initialExpanded[r.m_requisition_id] = true;
        });
        setExpandedReqs(initialExpanded);
      }
    } catch (err) {
      console.error('Failed to load linked requisitions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequisitions();
  }, [orderId]);

  const toggleExpand = (reqId) => {
    setExpandedReqs((prev) => ({
      ...prev,
      [reqId]: !prev[reqId],
    }));
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
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

  const filteredRequisitions = useMemo(() => {
    if (!searchQuery.trim()) return requisitions;
    const q = searchQuery.toLowerCase();
    return requisitions.filter((r) => {
      const docMatch = r.documentno?.toLowerCase().includes(q);
      const reqMatch = r.requester_name?.toLowerCase().includes(q);
      const descMatch = r.description?.toLowerCase().includes(q);
      const orgMatch = r.org_name?.toLowerCase().includes(q);
      const lineMatch = r.lines?.some(
        (l) =>
          l.product_name?.toLowerCase().includes(q) ||
          l.product_code?.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q)
      );
      return docMatch || reqMatch || descMatch || orgMatch || lineMatch;
    });
  }, [requisitions, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Top Bar: Search & Refresh */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search linked requisitions or items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadRequisitions}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && requisitions.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading linked requisitions...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredRequisitions.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-base font-medium text-slate-800 dark:text-slate-200">
            {searchQuery ? 'No matching linked requisitions found' : 'No linked requisitions'}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            {searchQuery
              ? 'Try modifying your search criteria.'
              : 'This purchase order does not reference any purchase requisition lines.'}
          </p>
        </div>
      )}

      {/* List of Requisitions */}
      <div className="space-y-4">
        {filteredRequisitions.map((req) => {
          const isExpanded = expandedReqs[req.m_requisition_id];
          return (
            <div
              key={req.m_requisition_id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden transition-all"
            >
              {/* Header card */}
              <div
                onClick={() => toggleExpand(req.m_requisition_id)}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 select-none transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-base flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary-500" />
                      {req.documentno}
                    </span>
                    {getStatusBadge(req.docstatus, req.docstatus_label)}
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-medium">
                      {req.lines?.length || 0} line{(req.lines?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                    {req.requester_name && (
                      <span className="flex items-center gap-1">
                        <span className="font-medium text-slate-700 dark:text-slate-300">Requester:</span>{' '}
                        {req.requester_name}
                      </span>
                    )}
                    {req.org_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        {req.org_name}
                      </span>
                    )}
                    {req.datedoc && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Doc: {req.datedoc}
                      </span>
                    )}
                    {req.daterequired && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Required: {req.daterequired}
                      </span>
                    )}
                  </div>

                  {req.description && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                      "{req.description}"
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Total Amount</span>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {formatCurrency(req.totallines)}
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

              {/* Collapsible lines table */}
              {isExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 p-4">
                  <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-3 w-12 text-center">Line</th>
                          <th className="py-2.5 px-3">Item / Description</th>
                          <th className="py-2.5 px-3 w-28 text-right">PR Qty</th>
                          <th className="py-2.5 px-3 w-20">UoM</th>
                          <th className="py-2.5 px-3 w-32 text-right">Price</th>
                          <th className="py-2.5 px-3 w-32 text-right">Net Amount</th>
                          <th className="py-2.5 px-3 w-28 text-right">PO Line / Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                        {req.lines && req.lines.length > 0 ? (
                          req.lines.map((l) => (
                            <tr key={l.m_requisitionline_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 text-center font-mono text-slate-400">{l.line}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {l.product_name || 'Generic Item'}
                                </div>
                                {l.product_code && (
                                  <span className="text-[11px] font-mono text-slate-400">{l.product_code}</span>
                                )}
                                {l.description && (
                                  <div className="text-[11px] text-slate-500 italic mt-0.5">{l.description}</div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-medium">{l.qty}</td>
                              <td className="py-2.5 px-3 text-slate-500">{l.uom_symbol || l.uom_name || '-'}</td>
                              <td className="py-2.5 px-3 text-right">{formatCurrency(l.priceactual)}</td>
                              <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(l.linenetamt)}</td>
                              <td className="py-2.5 px-3 text-right">
                                {l.po_line_no ? (
                                  <span className="inline-flex items-center gap-1 font-mono text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2 py-0.5 rounded text-[11px]">
                                    #{l.po_line_no} ({l.po_qty})
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">-</span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="py-4 text-center text-slate-400">
                              No lines found for this requisition.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
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

