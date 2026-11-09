import React, { useState, useEffect } from 'react';
import { X, Search, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { orderApi } from '../../../../api/order';

export default function RequisitionLineModal({
  isOpen,
  onClose,
  isDark,
  clientId,
  costCenterId,
  onSelectLine,
}) {
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    fetchLines(1, search);
  }, [isOpen, costCenterId]);

  const fetchLines = async (pageNum, searchTerm) => {
    if (!costCenterId) {
      setError('Please select a Cost Center on the header tab first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await orderApi.getRequisitionLines({
        client_id: clientId,
        cost_center_id: costCenterId,
        search: searchTerm,
        page: pageNum,
        limit: 15,
      });
      if (res && res.data) {
        if (pageNum === 1) {
          setLines(res.data);
        } else {
          setLines((prev) => [...prev, ...res.data]);
        }
        setHasMore(res.has_more || false);
        setPage(pageNum);
      }
    } catch (err) {
      console.error('Failed to load requisition lines:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load requisition lines');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLines(1, search);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 flex flex-col max-h-[85vh] ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Select Requisition Line</h3>
              <p className="text-xs text-slate-500 font-mono">
                Import product from approved PR into PO line
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800/40 flex-shrink-0">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PR number, product code, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl border text-xs font-mono outline-none transition-all ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
              }`}
            />
          </form>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && lines.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
              <span>Loading requisition lines...</span>
            </div>
          ) : lines.length === 0 ? (
            <div className="py-12 text-center text-slate-500 font-mono text-xs">
              No available requisition lines found for this cost center.
            </div>
          ) : (
            lines.map((line) => (
              <div
                key={line.id}
                onClick={() => {
                  onSelectLine(line);
                  onClose();
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                  isDark
                    ? 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-cyan-500/50'
                    : 'bg-slate-50/70 border-slate-200 hover:bg-indigo-50/50 hover:border-indigo-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      PR #{line.po_number}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {line.product_value}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-300">{line.product_name}</p>
                  {line.description && (
                    <p className="text-[11px] text-slate-500 font-mono italic">
                      {line.description}
                    </p>
                  )}
                </div>

                <div className="text-right pl-4 flex-shrink-0">
                  <span className="text-xs font-mono font-bold block text-slate-100">
                    Qty: {line.qty} {line.uom_symbol || line.uom_name}
                  </span>
                  {line.price > 0 && (
                    <span className="text-[10px] font-mono text-slate-400 block">
                      @ Rp {line.price.toLocaleString()}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-cyan-400 group-hover:underline flex items-center justify-end space-x-1 mt-1">
                    <span>Select</span>
                    <Check className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))
          )}

          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => fetchLines(page + 1, search)}
                disabled={loading}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-colors ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

