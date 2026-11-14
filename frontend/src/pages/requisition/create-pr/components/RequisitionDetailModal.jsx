import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { X, CheckCircle2, Clock, Plus, Package, FileText, Check, Ban, AlertCircle } from 'lucide-react';
import { requisitionApi } from '../../../../api/requisition';
import { getCustomSelectStyles } from '../../../../components/ui/selectStyles';

export default function RequisitionDetailModal({
  isOpen,
  requisitionId,
  onClose,
  onUpdated,
  session,
  isDark,
}) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [activeTab, setActiveTab] = useState('lines'); // 'lines' or 'header'
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Add Line Form State
  const [showAddLine, setShowAddLine] = useState(false);
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [priceActual, setPriceActual] = useState(0);
  const [lineDesc, setLineDesc] = useState('');
  const [lineSubmitting, setLineSubmitting] = useState(false);

  const fetchDetail = () => {
    if (!requisitionId) return;
    setLoading(true);
    setActionError(null);
    requisitionApi.getRequisitionDetail(requisitionId)
      .then((res) => {
        setDetail(res.data);
      })
      .catch((err) => {
        console.error('Failed to fetch detail:', err);
        setActionError('Failed to load requisition details.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (isOpen && requisitionId) {
      fetchDetail();
    }
  }, [isOpen, requisitionId]);

  // Product Search
  useEffect(() => {
    if (!isOpen) return;
    const clientId = session?.clientId || session?.client_id || 0;
    const timer = setTimeout(() => {
      requisitionApi.searchProducts({ client_id: clientId, q: productQuery })
        .then((res) => {
          setProductResults(res.data || []);
        })
        .catch(console.error);
    }, 250);

    return () => clearTimeout(timer);
  }, [productQuery, session]);

  if (!isOpen) return null;

  const header = detail?.header;
  const lines = detail?.lines || [];

  const isDraft = header?.docstatus === 'DR' || header?.docstatus === 'IN';
  const isCompleted = header?.docstatus === 'CO' || header?.docstatus === 'CL';

  const handleAddLine = async (e) => {
    e.preventDefault();
    if (!selectedProduct || qty <= 0) return;

    setLineSubmitting(true);
    setActionError(null);
    try {
      await requisitionApi.createRequisitionLine(requisitionId, {
        product_id: selectedProduct.id,
        qty: Number(qty),
        priceactual: Number(priceActual),
        description: lineDesc.trim(),
      }, session?.token);

      setShowAddLine(false);
      setSelectedProduct(null);
      setProductQuery('');
      setQty(1);
      setPriceActual(0);
      setLineDesc('');
      fetchDetail();
      onUpdated();
    } catch (err) {
      console.error('Failed to add line:', err);
      setActionError(err.response?.data?.message || err.message || 'Failed to add item line.');
    } finally {
      setLineSubmitting(false);
    }
  };

  const handleProcess = async (docAction) => {
    const confirmMsg = docAction === 'CO'
      ? 'Are you sure you want to Complete this requisition?'
      : docAction === 'VO'
      ? 'Are you sure you want to Void this requisition? This action cannot be reversed.'
      : 'Are you sure you want to process this document?';

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(true);
    setActionError(null);
    try {
      await requisitionApi.processRequisition(requisitionId, docAction, session?.token);
      fetchDetail();
      onUpdated();
    } catch (err) {
      console.error('Failed to process requisition:', err);
      setActionError(err.response?.data?.message || err.message || 'Document process action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const customSelectStyles = getCustomSelectStyles(isDark);

  const formatIDR = (val) => {
    if (!val || isNaN(val)) return 'IDR 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className={`w-full max-w-4xl max-h-[92vh] rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fadeIn ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-6 border-b flex items-center justify-between flex-shrink-0 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold font-mono">
                  {header?.documentno ? `PR #${header.documentno}` : 'Requisition Details'}
                </h3>
                {header && (
                  <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold ${
                    isCompleted
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : isDraft
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {header.status_label}
                  </span>
                )}
              </div>
              <p className={`text-[11px] sm:text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {header?.org_name} • {header?.warehouse_name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer ${
                isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Controls */}
        <div className={`px-4 sm:px-6 border-b flex items-center gap-4 text-xs font-mono font-semibold flex-shrink-0 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <button
            onClick={() => setActiveTab('lines')}
            className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'lines'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Requisition Lines ({lines.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('header')}
            className={`py-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'header'
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Document Info</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {actionError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center font-mono text-xs text-slate-500">
              Loading requisition data...
            </div>
          ) : activeTab === 'lines' ? (
            <div className="space-y-4">
              {/* Lines Table Header & Add Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold">Line Items</h4>
                  <p className="text-[11px] text-slate-400">Products and quantities requested</p>
                </div>
                {isDraft && !showAddLine && (
                  <button
                    onClick={() => setShowAddLine(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-mono font-semibold transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                )}
              </div>

              {/* Add Line Form */}
              {showAddLine && (
                <form
                  onSubmit={handleAddLine}
                  className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">Add Line Item</span>
                    <button
                      type="button"
                      onClick={() => setShowAddLine(false)}
                      className="text-slate-500 hover:text-slate-400 text-xs"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Search Product using React-Select */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Search Product SKU / Name *
                    </label>
                    <Select
                      value={selectedProduct ? {
                        value: selectedProduct.id,
                        label: `[${selectedProduct.code}] ${selectedProduct.name} (${selectedProduct.uom_name})`,
                        raw: selectedProduct,
                      } : null}
                      onChange={(opt) => setSelectedProduct(opt ? opt.raw : null)}
                      onInputChange={(val, action) => {
                        if (action.action === 'input-change') setProductQuery(val);
                      }}
                      options={productResults.map((p) => ({
                        value: p.id,
                        label: `[${p.code}] ${p.name} (${p.uom_name})`,
                        raw: p,
                      }))}
                      styles={customSelectStyles}
                      placeholder="Type SKU or product name to search..."
                      isSearchable
                      isClearable
                      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        required
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                        Unit Price (IDR)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={priceActual}
                        onChange={(e) => setPriceActual(e.target.value)}
                        className={`w-full px-3 py-2 rounded-xl text-xs font-mono border outline-none ${
                          isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={lineSubmitting || !selectedProduct}
                      className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-mono font-bold hover:bg-cyan-400 transition cursor-pointer disabled:opacity-50"
                    >
                      {lineSubmitting ? 'Saving...' : 'Add to Requisition'}
                    </button>
                  </div>
                </form>
              )}

              {/* Lines Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800/60 w-full touch-pan-x">
                <table className="w-full text-left text-xs min-w-[560px]">
                  <thead>
                    <tr className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                      isDark ? 'border-slate-800 text-slate-400 bg-slate-950/60' : 'border-slate-200 text-slate-500 bg-slate-50'
                    }`}>
                      <th className="px-4 py-3 font-semibold">Line</th>
                      <th className="px-4 py-3 font-semibold">Product SKU &amp; Name</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">UOM</th>
                      <th className="px-4 py-3 font-semibold text-right">Price Actual</th>
                      <th className="px-4 py-3 font-semibold text-right">Line Net Amt</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                    {lines.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                          No line items found. {isDraft && 'Add your first product above.'}
                        </td>
                      </tr>
                    ) : (
                      lines.map((l) => (
                        <tr key={l.id} className={isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}>
                          <td className="px-4 py-3 font-mono text-slate-500">{l.line}</td>
                          <td className="px-4 py-3 font-mono">
                            <span className="font-bold text-slate-200">[{l.product_code}]</span>{' '}
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{l.product_name}</span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-cyan-400">{l.qty}</td>
                          <td className="px-4 py-3 font-mono text-slate-400">{l.uom_name}</td>
                          <td className="px-4 py-3 font-mono text-right text-slate-400">{formatIDR(l.priceactual)}</td>
                          <td className="px-4 py-3 font-mono text-right font-bold text-emerald-400">{formatIDR(l.linenetamt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Document Info Tab */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 text-[10px] uppercase">Document Number</span>
                <p className="text-sm font-bold text-blue-400 mt-0.5">{header?.documentno}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 text-[10px] uppercase">Status</span>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{header?.status_label}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 text-[10px] uppercase">Organization</span>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{header?.org_name}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 text-[10px] uppercase">Warehouse</span>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{header?.warehouse_name}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 text-[10px] uppercase">Date Doc</span>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{formatDate(header?.datedoc)}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 text-[10px] uppercase">Date Required</span>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{formatDate(header?.daterequired)}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 text-[10px] uppercase">Cost Center</span>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{header?.cost_center_name || '-'}</p>
              </div>
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 text-[10px] uppercase">Total Lines Amount</span>
                <p className="text-sm font-bold text-cyan-400 mt-0.5">{formatIDR(header?.totallines)}</p>
              </div>
              <div className={`col-span-1 sm:col-span-2 p-4 rounded-2xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-slate-400 text-[10px] uppercase">Description / Purpose</span>
                <p className="text-xs text-slate-300 mt-1">{header?.description || 'No description provided.'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Workflow Actions */}
        <div className={`p-4 sm:p-5 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-100 bg-slate-50'
        }`}>
          <div>
            <span className="text-xs font-mono text-slate-400">
              Total Amount: <span className="font-bold text-cyan-400">{formatIDR(header?.totallines)}</span>
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 flex-wrap">
            {isDraft && (
              <>
                <button
                  type="button"
                  disabled={actionLoading || lines.length === 0}
                  onClick={() => handleProcess('CO')}
                  className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{actionLoading ? 'Processing...' : 'Complete'}</span>
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleProcess('VO')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl sm:rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Void</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl sm:rounded-2xl border text-xs font-mono transition cursor-pointer ${
                isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

