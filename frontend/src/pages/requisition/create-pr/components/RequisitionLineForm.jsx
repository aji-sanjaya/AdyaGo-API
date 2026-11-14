import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import {
  ArrowLeft,
  Check,
  Plus,
  Package,
  AlertCircle,
  Loader2,
  Lock,
  Trash2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import ReauthModal from '../../../../components/common/ReauthModal';
import ConfirmDeleteModal from '../../../../components/common/ConfirmDeleteModal';
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

export default function RequisitionLineForm({
  isEdit = false,
  lineData = null,
  requisitionId,
  pricePrecision = 2,
  session,
  isDark = true,
  onCancel,
  onSuccess,
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
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState(null);
  const [showReauthModal, setShowReauthModal] = useState(false);

  const isPOLinked = Boolean(
    isEdit && (lineData?.is_po_linked || Number(lineData?.total_ordered_qty) > 0)
  );
  const minQty = isPOLinked ? Number(lineData?.total_ordered_qty || 0) : 0;
  const uomPrecision = selectedProduct?.uom_precision ?? (lineData?.uom_precision ?? 0);

  // Initialize or reset form when lineData changes
  useEffect(() => {
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
  }, [lineData, pricePrecision]);

  // Debounced search for products
  useEffect(() => {
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
  }, [productQuery, session]);

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

  const handleDeleteLine = async () => {
    if (!requisitionId || !lineData?.id) return;

    setDeleting(true);
    setError(null);
    try {
      await requisitionApi.deleteRequisitionLine(requisitionId, lineData.id, session?.token);
      setShowDeleteModal(false);
      onSuccess?.('deleted');
    } catch (err) {
      console.error('Failed to delete requisition line:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete line item.';
      if (
        err.response?.status === 401 ||
        errMsg.includes('Token has expired') ||
        errMsg.toLowerCase().includes('token expired')
      ) {
        setShowDeleteModal(false);
        setShowReauthModal(true);
        return;
      }
      setError(errMsg);
    } finally {
      setDeleting(false);
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

  return (
    <div className="space-y-5 w-full animate-fadeIn">
      {/* Header / Breadcrumb Action */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            title="Back to Lines Table"
            className={`p-2 rounded-xl border transition cursor-pointer flex-shrink-0 ${
              isDark
                ? 'border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white'
                : 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3
              className={`text-sm sm:text-base font-bold tracking-tight font-mono flex items-center gap-2 ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              <span>{isEdit ? 'Edit Requisition Line Item' : 'Add Requisition Line Item'}</span>
              {isEdit && lineData?.line && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  Line #{lineData.line}
                </span>
              )}
            </h3>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              {isEdit
                ? 'Modify line item quantity, unit price, or description'
                : 'Attach a new product item and quantity directly into this purchase requisition'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Body Card */}
      <form
        onSubmit={handleSubmit}
        className={`p-5 sm:p-7 rounded-2xl border shadow-sm space-y-5 font-mono ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Error message banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Product Selector */}
        <div
          className={`p-4 rounded-xl border space-y-3.5 ${
            isDark ? 'bg-slate-950/20 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
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
        </div>

        {/* Section 2: Quantity, UOM, and Unit Price (3 columns) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
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
              className={`w-full h-[38px] px-3.5 rounded-xl text-xs font-mono font-bold text-right border outline-none transition ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200 focus:border-cyan-500'
                  : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* UOM (Unit of Measure) Information */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
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
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
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
              className={`w-full h-[38px] px-3.5 rounded-xl text-xs font-mono font-bold text-right border outline-none transition ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200 focus:border-cyan-500'
                  : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
              }`}
            />
          </div>
        </div>

        {/* Section 3: Line Description / Notes */}
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Line Description / Notes
          </label>
          <input
            type="text"
            value={lineDesc}
            onChange={(e) => setLineDesc(e.target.value)}
            placeholder="Optional notes or remarks for this line..."
            className={`w-full h-[38px] px-3.5 rounded-xl text-xs font-mono border outline-none transition ${
              isDark
                ? 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
            }`}
          />
        </div>

        {/* Section 4: Total Net Calculation Card */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono ${
            isDark
              ? 'bg-cyan-500/10 border-cyan-500/25'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3 text-xs text-slate-400">
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
            <span className="text-slate-400 text-xs uppercase font-semibold">Total Net:</span>
            <span className="text-base font-bold text-emerald-500 dark:text-emerald-400">
              Rp {formatNumberWithPrecision(totalLineNet, pricePrecision)}
            </span>
          </div>
        </div>

        {/* Section 5: Action Buttons */}
        <div
          className={`flex items-center justify-end gap-3 pt-3 border-t ${
            isDark ? 'border-slate-800/60' : 'border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting || deleting}
            className={`px-4 h-[38px] rounded-xl border text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Cancel
          </button>

          {/* Delete Button (Displayed in Edit Mode when Line is persisted) */}
          {isEdit && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={submitting || deleting || isPOLinked}
              title={isPOLinked ? 'Cannot delete line linked to PO' : 'Delete this requisition line item'}
              className={`flex items-center gap-1.5 px-4 h-[38px] rounded-xl border text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50 ${
                isPOLinked
                  ? 'opacity-40 cursor-not-allowed border-slate-700/60 text-slate-500'
                  : isDark
                  ? 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300'
                  : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700'
              }`}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </>
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={submitting || deleting || !selectedProduct}
            className="flex items-center gap-2 px-5 h-[38px] rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-mono text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{isEdit ? 'Saving Changes...' : 'Adding Line...'}</span>
              </>
            ) : (
              <>
                {isEdit ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{isEdit ? 'Update Line Item' : 'Add Line to Requisition'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {isEdit && (
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          onClose={() => !deleting && setShowDeleteModal(false)}
          onConfirm={handleDeleteLine}
          title="Delete Requisition Line Item"
          message={`Are you sure you want to delete line #${lineData?.line || ''} (${lineData?.product_name || selectedProduct?.name || 'Item'})? This action cannot be undone.`}
          loading={deleting}
        />
      )}

      {/* Re-authenticate Modal when iDempiere token expires */}
      <ReauthModal
        isOpen={showReauthModal}
        onClose={() => setShowReauthModal(false)}
        onSuccess={handleReauthSuccess}
      />
    </div>
  );
}

