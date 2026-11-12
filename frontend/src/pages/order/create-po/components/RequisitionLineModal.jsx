import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  FileText,
  Check,
  AlertCircle,
  Loader2,
  CheckSquare,
  Square,
  ListPlus,
  Filter,
  RotateCcw,
  Building2,
} from 'lucide-react';
import { orderApi } from '../../../../api/order';

export default function RequisitionLineModal({
  isOpen,
  onClose,
  isDark = true,
  clientId,
  costCenterId,
  costCenters = [],
  orderId,
  onSelectLines,
  onSelectLine, // backward compatible fallback
}) {
  const [loading, setLoading] = useState(false);
  const [prNumber, setPrNumber] = useState('');
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState([]);
  const [selectedLineMap, setSelectedLineMap] = useState({});
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState(null);

  const selectedLines = useMemo(() => Object.values(selectedLineMap), [selectedLineMap]);
  const selectedCount = selectedLines.length;

  const costCenterLabel = useMemo(() => {
    if (!costCenterId) return null;
    const found = costCenters.find((cc) => Number(cc.id || cc.value) === Number(costCenterId));
    if (found) {
      return found.label || found.text || found.name || `${found.value}`;
    }
    return `ID #${costCenterId}`;
  }, [costCenterId, costCenters]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load lines when opened or cost center changes
  useEffect(() => {
    if (!isOpen) {
      setSelectedLineMap({});
      return;
    }
    fetchLines(1, prNumber, search);
  }, [isOpen, costCenterId, orderId]);

  const fetchLines = async (pageNum, prNum, searchTerm) => {
    if (!costCenterId && !orderId) {
      setError('Please select a Cost Center on the header tab first. Requisition lines must be filtered by the order cost center.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await orderApi.getRequisitionLines({
        client_id: clientId,
        cost_center_id: costCenterId || undefined,
        order_id: orderId || undefined,
        pr_number: prNum?.trim() || undefined,
        search: searchTerm?.trim() || undefined,
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

  const handleFilterSubmit = (e) => {
    e?.preventDefault();
    fetchLines(1, prNumber, search);
  };

  const handleResetFilter = () => {
    setPrNumber('');
    setSearch('');
    fetchLines(1, '', '');
  };

  const toggleSelectLine = (line) => {
    setSelectedLineMap((prev) => {
      const next = { ...prev };
      if (next[line.id]) {
        delete next[line.id];
      } else {
        next[line.id] = line;
      }
      return next;
    });
  };

  const isAllLoadedSelected = useMemo(() => {
    if (lines.length === 0) return false;
    return lines.every((l) => Boolean(selectedLineMap[l.id]));
  }, [lines, selectedLineMap]);

  const handleToggleSelectAll = () => {
    if (isAllLoadedSelected) {
      // Deselect all loaded lines
      setSelectedLineMap((prev) => {
        const next = { ...prev };
        lines.forEach((l) => {
          delete next[l.id];
        });
        return next;
      });
    } else {
      // Select all loaded lines
      setSelectedLineMap((prev) => {
        const next = { ...prev };
        lines.forEach((l) => {
          next[l.id] = l;
        });
        return next;
      });
    }
  };

  const handleConfirmImport = () => {
    if (selectedCount === 0) return;
    if (onSelectLines) {
      onSelectLines(selectedLines);
    } else if (onSelectLine) {
      onSelectLine(selectedLines[0]);
    }
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-3 sm:p-5 overflow-hidden font-mono">
      {/* Full-screen backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity animate-fadeIn cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Dialog Box */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full max-w-3xl max-h-[90vh] rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fadeIn ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-cyan-950/20'
            : 'bg-white border-slate-200 text-slate-800 shadow-slate-900/15'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 sm:px-6 py-4 border-b flex-shrink-0 ${
            isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-white'
          }`}
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-bold text-base leading-tight">Select Requisition Lines</h3>
                {costCenterLabel ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    <Building2 className="w-3 h-3" />
                    <span>Cost Center: {costCenterLabel}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    <AlertCircle className="w-3 h-3" />
                    <span>No Cost Center Selected</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Lines are filtered by Cost Center from Order Header ({costCenterLabel || 'Required'})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dual Filter Controls: PR Number & Product/Description */}
        <div
          className={`p-4 border-b flex-shrink-0 ${
            isDark ? 'border-slate-800/60 bg-slate-950/20' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <form onSubmit={handleFilterSubmit} className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Filter 1: PR Number */}
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400" />
                <input
                  type="text"
                  placeholder="PR Number (e.g. 1000214)..."
                  value={prNumber}
                  onChange={(e) => setPrNumber(e.target.value)}
                  className={`w-full pl-9 pr-7 py-2 rounded-xl border text-xs font-mono outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                      : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
                  }`}
                />
                {prNumber && (
                  <button
                    type="button"
                    onClick={() => setPrNumber('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Filter 2: Product / Keyword */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
                <input
                  type="text"
                  placeholder="Product code, name, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`w-full pl-9 pr-7 py-2 rounded-xl border text-xs font-mono outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                      : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
                  }`}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] text-slate-400 font-mono">
                Press Enter or click Filter to refine
              </span>
              <div className="flex items-center gap-2">
                {(prNumber || search) && (
                  <button
                    type="button"
                    onClick={handleResetFilter}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition cursor-pointer ${
                      isDark
                        ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-mono font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filter</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Selection Bar & Select All Header */}
        <div
          className={`px-5 py-2.5 border-b flex items-center justify-between text-xs font-mono select-none flex-shrink-0 ${
            isDark ? 'border-slate-800/60 bg-slate-900/80 text-slate-300' : 'border-slate-100 bg-white text-slate-700'
          }`}
        >
          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isAllLoadedSelected}
              onChange={handleToggleSelectAll}
              disabled={lines.length === 0}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/20 cursor-pointer accent-cyan-500"
            />
            <span className="font-bold">
              {isAllLoadedSelected ? 'Deselect All Loaded' : 'Select All Loaded'}
            </span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              {lines.length} line{lines.length === 1 ? '' : 's'} available
            </span>
            {selectedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {selectedCount} selected
              </span>
            )}
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && lines.length === 0 ? (
            <div className="py-14 flex flex-col items-center justify-center text-slate-500 font-mono text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
              <span>Loading requisition lines...</span>
            </div>
          ) : lines.length === 0 ? (
            <div className="py-14 text-center text-slate-400 font-mono text-xs space-y-1">
              <p className="font-bold text-slate-300">No available requisition lines found.</p>
              <p className="text-[11px]">
                {prNumber || search
                  ? 'No lines matched your filter criteria. Try clearing PR number or search keyword.'
                  : 'No approved purchase requisitions available for this cost center.'}
              </p>
            </div>
          ) : (
            lines.map((line) => {
              const isSelected = Boolean(selectedLineMap[line.id]);
              return (
                <div
                  key={line.id}
                  onClick={() => toggleSelectLine(line)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group select-none ${
                    isSelected
                      ? isDark
                        ? 'bg-cyan-500/10 border-cyan-500/50 ring-1 ring-cyan-500/30'
                        : 'bg-cyan-50/70 border-cyan-300 ring-1 ring-cyan-300/40'
                      : isDark
                      ? 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800 hover:border-cyan-500/40'
                      : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0 flex-1 pr-3">
                    {/* Checkbox */}
                    <div className="pt-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectLine(line)}
                        className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/20 cursor-pointer accent-cyan-500"
                      />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex-shrink-0">
                          PR #{line.po_number}
                        </span>
                        <span
                          className={`font-mono text-xs font-bold truncate ${
                            isDark ? 'text-slate-200' : 'text-slate-800'
                          }`}
                        >
                          {line.product_value}
                        </span>
                      </div>
                      <p
                        className={`text-xs font-medium truncate ${
                          isDark ? 'text-slate-300' : 'text-slate-700'
                        }`}
                      >
                        {line.product_name}
                      </p>
                      {line.description && (
                        <p
                          className={`text-[11px] font-mono italic truncate ${
                            isDark ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          {line.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quantity & Unit Price */}
                  <div className="text-right pl-3 flex-shrink-0">
                    <span
                      className={`text-xs font-mono font-bold block ${
                        isDark ? 'text-slate-100' : 'text-slate-900'
                      }`}
                    >
                      Qty: {line.qty} {line.uom_symbol || line.uom_name}
                    </span>
                    {line.price > 0 && (
                      <span
                        className={`text-[10px] font-mono block mt-0.5 ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        @ Rp {line.price.toLocaleString()}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-mono flex items-center justify-end space-x-1 mt-1.5 transition-colors ${
                        isSelected
                          ? 'text-cyan-400 font-bold'
                          : 'text-slate-400 group-hover:text-cyan-400'
                      }`}
                    >
                      <span>{isSelected ? 'Selected' : 'Select'}</span>
                      <Check className={`w-3 h-3 ${isSelected ? 'opacity-100' : 'opacity-40'}`} />
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => fetchLines(page + 1, prNumber, search)}
                disabled={loading}
                className={`px-4 py-2 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
                    : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700 shadow-xs'
                }`}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer with Multi-Select Actions */}
        <div
          className={`px-5 sm:px-6 py-3.5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0 ${
            isDark ? 'border-slate-800/80 bg-slate-900/90' : 'border-slate-100 bg-white'
          }`}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-xs font-mono">
              Selected:{' '}
              <strong className={isDark ? 'text-cyan-400' : 'text-indigo-600'}>
                {selectedCount}
              </strong>{' '}
              line item{selectedCount === 1 ? '' : 's'}
            </span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedLineMap({})}
                className="text-[11px] font-mono text-slate-400 hover:text-rose-400 transition underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 h-[38px] rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={selectedCount === 0}
              className="flex items-center gap-2 px-5 h-[38px] rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-mono text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {selectedCount > 1
                  ? `Import Selected (${selectedCount} Lines Queue)`
                  : selectedCount === 1
                  ? 'Import Selected Line'
                  : 'Select Lines to Import'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
