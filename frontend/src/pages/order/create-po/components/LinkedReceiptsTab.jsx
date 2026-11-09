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

      {/* Receipts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredReceipts.map((rcpt) => (
          <div
            key={rcpt.m_inout_id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-base flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-primary-500" />
                  {rcpt.documentno}
                </span>
                <span className="text-xs text-slate-400">{rcpt.doctype_name || 'Material Receipt'}</span>
              </div>
              {getStatusBadge(rcpt.docstatus, rcpt.docstatus_label)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              {rcpt.movementdate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Movement: {rcpt.movementdate}</span>
                </div>
              )}
              {rcpt.warehouse_name && (
                <div className="flex items-center gap-1.5">
                  <Warehouse className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{rcpt.warehouse_name}</span>
                </div>
              )}
              {rcpt.sppno && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">SPP No:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{rcpt.sppno}</span>
                </div>
              )}
              {rcpt.doreference && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">DO Ref:</span>
                  <span className="truncate text-slate-800 dark:text-slate-200">{rcpt.doreference}</span>
                </div>
              )}
              {rcpt.vendor_name && (
                <div className="col-span-2 flex items-center gap-1.5 pt-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium text-slate-800 dark:text-slate-200">{rcpt.vendor_name}</span>
                </div>
              )}
              {rcpt.creator_name && (
                <div className="col-span-2 flex items-center gap-1.5 text-slate-400">
                  <User className="w-3.5 h-3.5" />
                  <span>Created by {rcpt.creator_name}</span>
                </div>
              )}
            </div>

            {rcpt.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                "{rcpt.description}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

