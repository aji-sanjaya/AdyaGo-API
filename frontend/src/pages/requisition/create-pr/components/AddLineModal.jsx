import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { X, Plus, Package, AlertCircle, Loader2, Pencil, Check, Lock } from 'lucide-react';
import Swal from 'sweetalert2';
import ReauthModal from '../../../../components/common/ReauthModal';
import { requisitionApi } from '../../../../api/requisition';
import { getCustomSelectStyles } from '../../../../components/ui/selectStyles';

// Format number with thousand separators and exact decimals
const formatNumberWithPrecision = (val, precision = 2) => {
  if (val === null || val === undefined || val === '') return '';
  const num = Number(val);
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
};

// Formats input live as user types, preserving decimals up to maxDecimals
const formatInputLive = (val, maxDecimals = 2) => {
  if (!val) return '';
  // Strip all characters except digits and dot
  const clean = String(val).replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  const intPart = parts[0] ? Number(parts[0]).toLocaleString('en-US') : '0';

  if (parts.length > 1) {
    if (maxDecimals === 0) {
      return intPart;
    }
    const decPart = parts[1].slice(0, maxDecimals);
    return `${intPart}.${decPart}`;
  }
  return intPart;
};

// Parse formatted string back to float
const parseFormattedNumber = (val) => {
  if (!val) return 0;
  const clean = String(val).replace(/,/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export default function AddLineModal({
  isOpen,
  onClose,
  requisitionId,
  lineData = null,
  pricePrecision = 2,
  onSuccess,
  session,
  isDark,
}) {
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [qtyDisplay, setQtyDisplay] = useState('1');
  const [priceActual, setPriceActual] = useState(0);
  const [priceDisplay, setPriceDisplay] = useState('0');
  const [lineDesc, setLineDesc] = useState('');
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showReauthModal, setShowReauthModal] = useState(false);

  const isEdit = Boolean(lineData && lineData.id);
  const isPOLinked = Boolean(isEdit && (lineData?.is_po_linked || (Number(lineData?.total_ordered_qty) > 0)));
  const minQty = isPOLinked ? Number(lineData?.total_ordered_qty || 0) : 0;
  const uomPrecision = selectedProduct?.uom_precision ?? 0;

  // Initialize or reset form when modal opens or lineData changes
  useEffect(() => {
    if (isOpen) {
      if (lineData) {
        const uomPrec = lineData.uom_precision ?? 0;
        setSelectedProduct({
          id: lineData.product_id,
          code: lineData.product_code,
          name: lineData.product_name,
          uom_id: lineData.uom_id,
          uom_name: lineData.uom_name,
          uom_precision: uomPrec,
          pricestd: lineData.priceactual,
        });
        const q = lineData.qty ?? 1;
        const p = lineData.priceactual ?? 0;
        setQty(q);
        setQtyDisplay(formatNumberWithPrecision(q, uomPrec));
        setPriceActual(p);
        setPriceDisplay(formatNumberWithPrecision(p, pricePrecision));
        setLineDesc(lineData.description || '');
      } else {
        setSelectedProduct(null);
        setQty(1);
        setQtyDisplay('1');
        setPriceActual(0);
        setPriceDisplay('0');
        setLineDesc('');
      }
      setProductQuery('');
      setProductResults([]);
      setError(null);
    }
  }, [isOpen, lineData, pricePrecision]);

  // Debounced search for products
  useEffect(() => {
    if (!isOpen) return;
    const clientId = session?.clientId || session?.client_id || 0;
    setSearching(true);
    const timer = setTimeout(() => {
      requisitionApi
        .searchProducts({ client_id: clientId, q: productQuery })
        .then((res) => {
          setProductResults(res.data || []);
        })
        .catch((err) => {
          console.error('Failed to search products:', err);
        })
        .finally(() => {
          setSearching(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [productQuery, session, isOpen]);

  // Update default price and UOM when product is selected
  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    if (product) {
      const price = product.pricestd || 0;
      setPriceActual(price);
      setPriceDisplay(formatNumberWithPrecision(price, pricePrecision));
      const uomPrec = product.uom_precision ?? 0;
      setQtyDisplay(formatNumberWithPrecision(qty || 1, uomPrec));
    } else {
      setPriceActual(0);
      setPriceDisplay('0');
    }
  };

  const handlePriceBlur = () => {
    if (priceActual >= 0 && priceDisplay !== '') {
      setPriceDisplay(formatNumberWithPrecision(priceActual, pricePrecision));
    }
  };

  const handleQtyBlur = () => {
    if (qty >= 0 && qtyDisplay !== '') {
      setQtyDisplay(formatNumberWithPrecision(qty, uomPrecision));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      setError('Please select a product item.');
      return;
    }
    if (Number(qty) <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    if (isPOLinked && Number(qty) < minQty) {
      await Swal.fire({
        icon: 'warning',
        title: 'Quantity Ordered Restriction',
        html: `
          <div style="font-family: monospace; font-size: 13px; text-align: left; line-height: 1.6;">
            <p>The revised quantity (<b>${formatNumberWithPrecision(qty, uomPrecision)}</b>) cannot be less than the total Quantity Ordered on the linked Purchase Order(s).</p>
            <div style="margin-top: 10px; padding: 10px; background: ${
              isDark ? '#1e293b' : '#f8fafc'
            }; border-radius: 8px; border: 1px solid ${
              isDark ? '#334155' : '#e2e8f0'
            }; font-size: 12px;">
              <div>• Current PO Ordered Qty: <b style="color: #f59e0b;">${formatNumberWithPrecision(minQty, uomPrecision)}</b></div>
              <div>• Minimum Allowed Qty: <b style="color: #10b981;">${formatNumberWithPrecision(minQty, uomPrecision)}</b></div>
            </div>
          </div>
        `,
        confirmButtonText: 'Understood',
        confirmButtonColor: '#4f46e5',
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        product_id: selectedProduct.id,
        uom_id: selectedProduct.uom_id || 0,
        qty: Number(qty),
        priceactual: Number(priceActual),
        description: lineDesc.trim(),
      };

      if (isEdit) {
        await requisitionApi.updateRequisitionLine(
          requisitionId,
          lineData.id,
          payload,
          session?.token
        );
        onSuccess?.('updated');
      } else {
        await requisitionApi.createRequisitionLine(
          requisitionId,
          payload,
          session?.token
        );
        onSuccess?.('created');
      }

      onClose();
    } catch (err) {
      console.error(isEdit ? 'Failed to update requisition line:' : 'Failed to add requisition line:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        (isEdit ? 'Failed to update requisition line.' : 'Failed to add line item to requisition.');

      const isTokenExpired =
        err.response?.status === 401 ||
        errMsg.includes('401') ||
        errMsg.includes('Token has expired') ||
        errMsg.toLowerCase().includes('token expired');

      if (isTokenExpired) {
        setShowReauthModal(true);
        return;
      }

      if (errMsg.toLowerCase().includes('quantity cannot be less')) {
        Swal.fire({
          icon: 'warning',
          title: 'Quantity Ordered Restriction',
          text: errMsg,
          confirmButtonText: 'Understood',
          confirmButtonColor: '#4f46e5',
          background: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
        });
      }
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReauthSuccess = async (newToken) => {
    setShowReauthModal(false);
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        product_id: selectedProduct.id,
        uom_id: selectedProduct.uom_id || 0,
        qty: Number(qty),
        priceactual: Number(priceActual),
        description: lineDesc.trim(),
      };

      if (isEdit) {
        await requisitionApi.updateRequisitionLine(
          requisitionId,
          lineData.id,
          payload,
          newToken
        );
        onSuccess?.('updated');
      } else {
        await requisitionApi.createRequisitionLine(
          requisitionId,
          payload,
          newToken
        );
        onSuccess?.('created');
      }

      onClose();
    } catch (retryErr) {
      console.error('Failed to save line after token refresh:', retryErr);
      setError(
        retryErr.response?.data?.message ||
          retryErr.message ||
          'Failed to save line item after token refresh.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const customSelectStyles = getCustomSelectStyles(isDark, {
    borderRadius: '0.75rem',
    minHeight: '38px',
    fontSize: '0.75rem',
  });

  const productOptions = productResults.map((p) => ({
    value: p.id,
    label: `[${p.code}] ${p.name} (${p.uom_name || 'Unit'})`,
    raw: p,
  }));

  const totalLineNet = Number(qty || 0) * Number(priceActual || 0);

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={`w-full max-w-2xl sm:max-w-3xl rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 font-mono ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between flex-shrink-0 ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border flex items-center justify-center flex-shrink-0 ${
                isEdit
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                  : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
              }`}
            >
              {isEdit ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight">
                {isEdit ? 'Edit Requisition Line' : 'Add Requisition Line'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEdit
                  ? `Update line #${lineData?.line || ''} item quantity and unit price`
                  : 'Attach a new product item and quantity to this requisition'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          {/* Product Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-bold uppercase text-slate-400">
                Product Item <span className="text-rose-500">*</span>
              </label>
              {selectedProduct?.uom_name && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    UOM: {selectedProduct.uom_name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-300 border border-slate-700/60">
                    Qty Precision: {uomPrecision} dec
                  </span>
                </div>
              )}
            </div>
            <Select
              value={
                selectedProduct
                  ? {
                      value: selectedProduct.id,
                      label: `[${selectedProduct.code}] ${selectedProduct.name} (${selectedProduct.uom_name || 'Unit'})`,
                      raw: selectedProduct,
                    }
                  : null
              }
              onChange={(opt) => handleProductSelect(opt ? opt.raw : null)}
              onInputChange={(val, action) => {
                if (action.action === 'input-change') setProductQuery(val);
              }}
              options={productOptions}
              styles={customSelectStyles}
              placeholder="Search product code or name..."
              isSearchable={!isPOLinked}
              isDisabled={isPOLinked}
              isClearable={!isPOLinked}
              isLoading={searching}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
              menuPosition="fixed"
              minMenuHeight={220}
            />
            {isPOLinked && (
              <div className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-mono flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Product cannot be changed because this line is already linked to Purchase Order line(s).</span>
              </div>
            )}
          </div>

          {/* Quantity, UOM, and Unit Price (3 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Quantity */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-400">
                  Quantity <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  ({uomPrecision} dec)
                </span>
              </div>
              <input
                type="text"
                value={qtyDisplay}
                onChange={(e) => {
                  const formatted = formatInputLive(e.target.value, uomPrecision);
                  setQtyDisplay(formatted);
                  setQty(parseFormattedNumber(formatted));
                }}
                onBlur={handleQtyBlur}
                required
                placeholder="Enter quantity"
                className={`w-full h-[38px] px-3.5 rounded-xl text-xs font-mono text-right border outline-none transition ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-cyan-500'
                    : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'
                }`}
              />
            </div>

            {/* UOM (Unit of Measure) Information */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-400">
                  UOM (Unit of Measure)
                </label>
              </div>
              <input
                type="text"
                readOnly
                value={selectedProduct?.uom_name || '-'}
                placeholder="UOM"
                className={`w-full h-[38px] px-3.5 rounded-xl text-xs font-mono font-bold border outline-none cursor-default transition ${
                  isDark
                    ? 'bg-slate-950/70 border-slate-800 text-cyan-400'
                    : 'bg-slate-50 border-slate-200 text-indigo-600'
                }`}
              />
            </div>

            {/* Unit Price */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase text-slate-400">
                  Unit Price (Rp)
                </label>
                <span className="text-[10px] font-mono text-slate-400">
                  ({pricePrecision} dec)
                </span>
              </div>
              <input
                type="text"
                value={priceDisplay}
                onChange={(e) => {
                  const formatted = formatInputLive(e.target.value, pricePrecision);
                  setPriceDisplay(formatted);
                  setPriceActual(parseFormattedNumber(formatted));
                }}
                onBlur={handlePriceBlur}
                placeholder="Enter unit price"
                className={`w-full h-[38px] px-3.5 rounded-xl text-xs font-mono text-right border outline-none transition ${
                  isDark
                    ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-cyan-500'
                    : 'bg-white border-slate-300 text-slate-800 focus:border-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">
              Line Description
            </label>
            <input
              type="text"
              value={lineDesc}
              onChange={(e) => setLineDesc(e.target.value)}
              placeholder="Optional notes or remarks for this line..."
              className={`w-full h-[38px] px-3.5 rounded-xl text-xs font-mono border outline-none transition ${
                isDark
                  ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                  : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-blue-500'
              }`}
            />
          </div>

          {/* Total Net Calculation Card */}
          <div
            className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono ${
              isDark
                ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>
                Qty:{' '}
                <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  {formatNumberWithPrecision(qty || 0, uomPrecision)} {selectedProduct?.uom_name || ''}
                </strong>
              </span>
              <span>•</span>
              <span>
                Rate:{' '}
                <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>
                  Rp {formatNumberWithPrecision(priceActual || 0, pricePrecision)}
                </strong>
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <span className="text-slate-400 text-xs uppercase">Total Net:</span>
              <span className="text-base font-bold text-emerald-500 dark:text-emerald-400">
                Rp {formatNumberWithPrecision(totalLineNet, pricePrecision)}
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedProduct}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-mono font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span>{isEdit ? 'Saving...' : 'Adding...'}</span>
                </>
              ) : isEdit ? (
                <>
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>Save Changes</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 flex-shrink-0" />
                  <span>Add Line</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>

    {/* Re-authenticate Modal when iDempiere token expires */}
    <ReauthModal
      isOpen={showReauthModal}
      onClose={() => setShowReauthModal(false)}
      onSuccess={handleReauthSuccess}
    />
  </>,
  document.body
);
}
