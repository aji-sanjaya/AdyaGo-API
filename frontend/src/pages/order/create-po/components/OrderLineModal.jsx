import React, { useState, useEffect } from 'react';
import { X, Check, FileText, AlertCircle, ShoppingCart, Tag, Percent } from 'lucide-react';
import RequisitionLineModal from './RequisitionLineModal';

export default function OrderLineModal({
  isOpen,
  onClose,
  isDark,
  lineData,
  onSave,
  clientId,
  costCenterId,
  products = [],
  charges = [],
  taxes = [],
  headerTaxId,
}) {
  const isEdit = !!lineData?.c_orderline_id;

  const [itemType, setItemType] = useState('product'); // 'product' | 'charge'
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [chargeId, setChargeId] = useState('');
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [taxId, setTaxId] = useState('');
  const [description, setDescription] = useState('');
  const [reqLineId, setReqLineId] = useState(null);
  const [reqDocNo, setReqDocNo] = useState('');
  const [uomName, setUomName] = useState('');
  const [uomId, setUomId] = useState(null);

  // Withholding Tax (PPh23)
  const [isWithholding, setIsWithholding] = useState(false);
  const [withholdingRate, setWithholdingRate] = useState('2');

  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    if (lineData) {
      if (lineData.c_charge_id) {
        setItemType('charge');
        setChargeId(String(lineData.c_charge_id));
        setProductId('');
      } else {
        setItemType('product');
        setProductId(lineData.m_product_id ? String(lineData.m_product_id) : '');
        setChargeId('');
      }
      setQty(String(lineData.qty || 1));
      setPrice(String(lineData.priceentered || lineData.priceactual || 0));
      setDiscount(String(lineData.discount || 0));
      setTaxId(lineData.c_tax_id ? String(lineData.c_tax_id) : String(headerTaxId || ''));
      setDescription(lineData.description || '');
      setReqLineId(lineData.m_requisitionline_id || null);
      setReqDocNo(lineData.requisition_documentno || '');
      setUomName(lineData.uom_symbol || lineData.uom_name || '');
      setUomId(lineData.c_uom_id || null);
      setIsWithholding(!!lineData.is_withholding);
      setWithholdingRate(String(lineData.withholding_rate || 2));
    } else {
      setItemType('product');
      setProductId('');
      setProductSearch('');
      setChargeId('');
      setQty('1');
      setPrice('0');
      setDiscount('0');
      setTaxId(headerTaxId ? String(headerTaxId) : (taxes[0]?.id ? String(taxes[0].id) : ''));
      setDescription('');
      setReqLineId(null);
      setReqDocNo('');
      setUomName('');
      setUomId(null);
      setIsWithholding(false);
      setWithholdingRate('2');
    }
    setError(null);
  }, [isOpen, lineData, headerTaxId, taxes]);

  if (!isOpen) return null;

  // Realtime calculations
  const numQty = parseFloat(qty) || 0;
  const numPrice = parseFloat(price) || 0;
  const numDiscount = parseFloat(discount) || 0;
  const priceActual = numPrice * (1 - numDiscount / 100);
  const lineNet = numQty * priceActual;

  const numWhtRate = parseFloat(withholdingRate) || 0;
  const whtAmt = isWithholding ? (lineNet * numWhtRate) / 100 : 0;

  const selectedTax = taxes.find((t) => String(t.id) === String(taxId));
  const taxRate = selectedTax?.rate || 0;
  const taxAmt = (lineNet * taxRate) / 100;
  const lineTotal = lineNet + taxAmt - whtAmt;

  const handleSelectRequisitionLine = (reqLine) => {
    setItemType('product');
    setProductId(String(reqLine.m_product_id));
    setProductSearch(reqLine.product_value + ' - ' + reqLine.product_name);
    setReqLineId(reqLine.id);
    setReqDocNo(reqLine.po_number);
    setQty(String(reqLine.remaining_qty || reqLine.qty || 1));
    if (reqLine.price > 0) {
      setPrice(String(reqLine.price));
    }
    setUomName(reqLine.uom_symbol || reqLine.uom_name || '');
    setUomId(reqLine.c_uom_id || null);
    if (reqLine.description) {
      setDescription(reqLine.description);
    }
  };

  const handleProductChange = (e) => {
    const val = e.target.value;
    setProductId(val);
    const matched = products.find((p) => String(p.id) === String(val));
    if (matched) {
      setUomName(matched.uom_symbol || matched.uom_name || '');
      setUomId(matched.c_uom_id || null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (itemType === 'product' && !productId) {
      setError('Please select a Product.');
      return;
    }
    if (itemType === 'charge' && !chargeId) {
      setError('Please select a Charge.');
      return;
    }
    if (numQty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (numPrice <= 0 && itemType === 'product') {
      setError('Unit price must be greater than zero.');
      return;
    }
    if (!taxId) {
      setError('Please select a Tax rate.');
      return;
    }

    const payload = {
      m_product_id: itemType === 'product' ? Number(productId) : null,
      c_charge_id: itemType === 'charge' ? Number(chargeId) : null,
      qty: numQty,
      price: numPrice,
      discount: numDiscount,
      c_tax_id: Number(taxId),
      c_uom_id: uomId ? Number(uomId) : null,
      description: description.trim(),
      m_requisitionline_id: reqLineId ? Number(reqLineId) : null,
      is_withholding: isWithholding,
      withholding_rate: isWithholding ? numWhtRate : 0,
    };

    onSave(payload, lineData?.c_orderline_id);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
        <div
          className={`w-full max-w-xl rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 flex flex-col max-h-[90vh] ${
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
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">
                  {isEdit ? 'Edit Purchase Order Line' : 'Add Purchase Order Line'}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  {isEdit ? `Update Line #${lineData.line}` : 'New line item details'}
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Item Type Toggle & From PR button */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setItemType('product');
                    setChargeId('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    itemType === 'product'
                      ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Product Item
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setItemType('charge');
                    setProductId('');
                    setReqLineId(null);
                    setReqDocNo('');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    itemType === 'charge'
                      ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Charge / Expense
                </button>
              </div>

              {itemType === 'product' && (
                <button
                  type="button"
                  onClick={() => setReqModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold hover:bg-cyan-500/30 transition-all"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{reqDocNo ? `PR #${reqDocNo}` : 'From Requisition'}</span>
                </button>
              )}
            </div>

            {/* Product / Charge Selection */}
            {itemType === 'product' ? (
              <div>
                <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
                  Product Item <span className="text-rose-500">*</span>
                </label>
                <select
                  value={productId}
                  onChange={handleProductChange}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                  }`}
                >
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id} className={isDark ? 'bg-slate-800' : 'bg-white'}>
                      {p.text}
                    </option>
                  ))}
                </select>
                {reqDocNo && (
                  <span className="text-[10px] font-mono text-cyan-400 block mt-1">
                    Linked to Requisition: <strong>{reqDocNo}</strong>
                  </span>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
                  Charge / Expense Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={chargeId}
                  onChange={(e) => setChargeId(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                  }`}
                >
                  <option value="">Select charge...</option>
                  {charges.map((c) => (
                    <option key={c.id} value={c.id} className={isDark ? 'bg-slate-800' : 'bg-white'}>
                      {c.text}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Qty, UOM & Unit Price */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none transition-all ${
                      isDark
                        ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                        : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                    }`}
                  />
                  {uomName && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500">
                      {uomName}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
                  Unit Price (IDR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
                  Discount (%)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-bold outline-none transition-all ${
                    isDark
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>
            </div>

            {/* Tax Dropdown */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
                Tax Rate <span className="text-rose-500">*</span>
              </label>
              <select
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none transition-all ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                    : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                }`}
              >
                <option value="">Select tax...</option>
                {taxes.map((t) => (
                  <option key={t.id} value={t.id} className={isDark ? 'bg-slate-800' : 'bg-white'}>
                    {t.text} ({t.rate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Withholding Tax (PPh 23) Checkbox & Rate */}
            <div className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-700/50 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isWithholding}
                    onChange={(e) => setIsWithholding(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/20 bg-slate-800 border-slate-700"
                  />
                  <span className="text-xs font-bold font-mono text-slate-300">
                    Apply Withholding Tax (PPh 23)
                  </span>
                </label>
                {isWithholding && (
                  <span className="text-[10px] font-mono font-bold text-amber-400">
                    - Rp {whtAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>

              {isWithholding && (
                <div className="flex items-center space-x-3 pt-1">
                  <span className="text-xs font-mono text-slate-400">Withholding Rate:</span>
                  <div className="flex items-center space-x-1.5 w-28">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={withholdingRate}
                      onChange={(e) => setWithholdingRate(e.target.value)}
                      className="w-full px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono font-bold text-slate-200 outline-none focus:border-cyan-500"
                    />
                    <span className="text-xs font-mono text-slate-400">%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
                Line Description / Notes
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional specifications, brand, details..."
                className={`w-full px-3.5 py-2 rounded-xl border text-xs font-mono outline-none transition-all ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                    : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>

            {/* Calculation Summary Bar */}
            <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Subtotal (Net)</span>
                <span className="text-xs font-bold text-slate-200">
                  Rp {lineNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase text-cyan-400 block font-bold">Line Total</span>
                <span className="text-sm font-black text-cyan-300">
                  Rp {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800/50">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                  isDark
                    ? 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white'
                    : 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isEdit ? 'Update Line' : 'Add to Order'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Nested Requisition Line Selector Modal */}
      {reqModalOpen && (
        <RequisitionLineModal
          isOpen={reqModalOpen}
          onClose={() => setReqModalOpen(false)}
          isDark={isDark}
          clientId={clientId}
          costCenterId={costCenterId}
          onSelectLine={handleSelectRequisitionLine}
        />
      )}
    </>
  );
}

