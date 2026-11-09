import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  Loader2,
  Calendar,
  Building2,
  Package,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { requisitionApi } from '../../../../api/requisition';

export default function OrderTab({ targetId, isDark, onTotalOrdersChange }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrders, setExpandedOrders] = useState({});

  const loadOrders = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const res = await requisitionApi.getOrders(targetId);
      if (res && res.data) {
        setOrders(res.data);
        if (onTotalOrdersChange) {
          onTotalOrdersChange(res.data.length);
        }
        // Expand all orders by default
        const initialExpanded = {};
        res.data.forEach((o) => {
          initialExpanded[o.id] = true;
        });
        setExpandedOrders(initialExpanded);
      }
    } catch (err) {
      console.error('Failed to load linked purchase orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [targetId]);

  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
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

  const getStatusBadge = (status, label) => {
    const s = (status || '').toUpperCase();
    let bg = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    let icon = <Clock className="w-3 h-3" />;

    if (s === 'CO') {
      bg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      icon = <CheckCircle2 className="w-3 h-3" />;
    } else if (s === 'IP') {
      bg = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25';
      icon = <Loader2 className="w-3 h-3 animate-spin" />;
    } else if (s === 'AP') {
      bg = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/25';
      icon = <CheckCircle2 className="w-3 h-3" />;
    } else if (s === 'CL') {
      bg = 'bg-slate-500/15 text-slate-300 border-slate-500/30';
      icon = <CheckCircle2 className="w-3 h-3" />;
    } else if (s === 'VO' || s === 'RE') {
      bg = 'bg-rose-500/10 text-rose-400 border-rose-500/25';
      icon = <XCircle className="w-3 h-3" />;
    }

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase tracking-wider ${bg}`}
      >
        {icon}
        <span>{label || status || 'Draft'}</span>
      </span>
    );
  };

  // Filtered orders based on search query
  const filteredOrders = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    if (!searchQuery.trim()) return orders;

    const q = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const docNo = (o.documentno || '').toLowerCase();
      const bp = (o.bpartner_name || '').toLowerCase();
      const desc = (o.description || '').toLowerCase();
      const status = (o.status_label || '').toLowerCase();

      // Also check line items
      const hasMatchingLine = o.lines?.some((l) => {
        const pCode = (l.product_code || '').toLowerCase();
        const pName = (l.product_name || '').toLowerCase();
        const lDesc = (l.description || '').toLowerCase();
        return pCode.includes(q) || pName.includes(q) || lDesc.includes(q);
      });

      return (
        docNo.includes(q) ||
        bp.includes(q) ||
        desc.includes(q) ||
        status.includes(q) ||
        hasMatchingLine
      );
    });
  }, [orders, searchQuery]);

  return (
    <div className="p-4 sm:p-6 space-y-5 font-mono">
      {/* Action and Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className={`text-sm sm:text-base font-bold tracking-tight flex items-center gap-2 ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-cyan-400" />
              <span>Linked Purchase Orders (PO)</span>
            </h3>
            {orders.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {orders.length} {orders.length === 1 ? 'Order' : 'Orders'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Purchase orders and product quantities generated from this requisition
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PO, vendor, product..."
              className={`w-full h-8 pl-8 pr-3 text-xs rounded-xl border outline-none transition font-mono ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-cyan-500'
              }`}
            />
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadOrders}
            disabled={loading}
            title="Refresh Orders"
            className={`h-8 px-3 rounded-xl border flex items-center gap-1.5 text-xs transition cursor-pointer flex-shrink-0 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {loading && orders.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-xs">Loading linked purchase orders...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div
          className={`py-14 sm:py-20 rounded-2xl border text-center p-6 flex flex-col items-center justify-center transition ${
            isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mb-3">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-200 mb-1">
            {searchQuery ? 'No Matching Purchase Orders' : 'No Purchase Orders Linked Yet'}
          </h4>
          <p className="text-xs text-slate-400 max-w-md">
            {searchQuery
              ? `No purchase orders match your search "${searchQuery}". Try a different keyword.`
              : 'Purchase orders generated from this requisition will appear here along with their product and quantity details.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = expandedOrders[order.id] !== false;
            return (
              <div
                key={order.id}
                className={`rounded-2xl border transition-all overflow-hidden shadow-sm ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700/80'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* PO Header Bar */}
                <div
                  onClick={() => toggleExpand(order.id)}
                  className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 cursor-pointer select-none transition ${
                    isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-sm sm:text-base font-bold tracking-tight ${
                            isDark ? 'text-slate-400' : 'text-slate-600'
                          }`}
                        >
                          {order.documentno}
                        </span>
                        {getStatusBadge(order.docstatus, order.status_label)}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {order.lines?.length || 0} {order.lines?.length === 1 ? 'Line Item' : 'Line Items'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1.5 text-xs text-slate-400">
                        {/* Business Partner */}
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-300">
                            {order.bpartner_name || '-'}
                          </span>
                        </div>

                        {/* Date Ordered */}
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span>Order Date: {formatDate(order.dateordered)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/60">
                    {order.description && (
                      <span className="text-[11px] text-slate-400 max-w-xs truncate hidden lg:inline" title={order.description}>
                        {order.description}
                      </span>
                    )}
                    <button
                      type="button"
                      className={`p-1.5 rounded-lg border transition ${
                        isDark
                          ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                          : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                      }`}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* PO Line Items Accordion Content */}
                {isExpanded && (
                  <div
                    className={`border-t ${
                      isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50/50'
                    }`}
                  >
                    {order.description && (
                      <div className="px-5 pt-3.5 pb-1 text-xs text-slate-400 italic">
                        Note: {order.description}
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr
                            className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                              isDark
                                ? 'border-slate-800/80 bg-slate-950/60 text-slate-400'
                                : 'border-slate-200 bg-slate-100/70 text-slate-600'
                            }`}
                          >
                            <th className="px-5 py-2.5 text-center w-12">#</th>
                            <th className="px-5 py-2.5 w-24">PR Line</th>
                            <th className="px-5 py-2.5 w-36">Product Code</th>
                            <th className="px-5 py-2.5">Product Name</th>
                            <th className="px-5 py-2.5 text-right w-32">Qty Ordered</th>
                            <th className="px-5 py-2.5 text-right w-32">Qty Delivered</th>
                            <th className="px-5 py-2.5 w-24">UOM</th>
                            <th className="px-5 py-2.5">Description</th>
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y ${
                            isDark ? 'divide-slate-800/60 text-slate-300' : 'divide-slate-200 text-slate-700'
                          }`}
                        >
                          {order.lines && order.lines.length > 0 ? (
                            order.lines.map((item, idx) => (
                              <tr
                                key={item.id || idx}
                                className={`transition-colors ${
                                  isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-100/50'
                                }`}
                              >
                                <td className="px-5 py-2.5 text-center text-slate-400">
                                  {item.line || idx + 1}
                                </td>
                                <td className="px-5 py-2.5 text-slate-400">
                                  {item.requisition_line ? `#${item.requisition_line}` : '-'}
                                </td>
                                <td className="px-5 py-2.5 text-slate-400">
                                  {item.product_code || '-'}
                                </td>
                                <td className="px-5 py-2.5 text-slate-400">
                                  {item.product_name || '-'}
                                </td>
                                <td className="px-5 py-2.5 text-right text-slate-400">
                                  {Number(item.qtyordered).toLocaleString('en-US', {
                                    minimumFractionDigits: item.uom_precision ?? 0,
                                    maximumFractionDigits: item.uom_precision ?? 0,
                                  })}
                                </td>
                                <td className="px-5 py-2.5 text-right text-slate-400">
                                  {Number(item.qtydelivered || 0).toLocaleString('en-US', {
                                    minimumFractionDigits: item.uom_precision ?? 0,
                                    maximumFractionDigits: item.uom_precision ?? 0,
                                  })}
                                </td>
                                <td className="px-5 py-2.5 text-slate-400">
                                  {item.uom_name || '-'}
                                </td>
                                <td className="px-5 py-2.5 text-slate-400 max-w-xs truncate">
                                  {item.description || '-'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-5 py-6 text-center text-xs text-slate-500 italic">
                                No line items associated with this purchase order.
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
      )}
    </div>
  );
}

