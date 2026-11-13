import React, { useState, useEffect, useMemo } from 'react';
import Select from 'react-select';
import {
  ArrowLeft,
  Check,
  X,
  ShoppingCart,
  Tag,
  FileText,
  AlertCircle,
  Loader2,
  Percent,
  Calculator,
  Building2,
  Lock,
  Trash2,
} from 'lucide-react';
import { orderApi } from '../../../../api/order';
import { getCustomSelectStyles } from '../../../../components/ui/selectStyles';
import RequisitionLineModal from './RequisitionLineModal';
import ConfirmDeleteModal from '../../../../components/common/ConfirmDeleteModal';

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

export default function OrderLineForm({
  isEdit = false,
  lineData = null,
  orderId,
  clientId,
  costCenterId,
  costCenters = [],
  headerTaxId,
  taxes = [],
  pricePrecision = 2,
  currencySymbol = 'Rp',
  session,
  isDark = true,
  onCancel,
  onSuccess,
  onIntermediateSaved,
  onTokenExpired,
}) {
  const [itemType, setItemType] = useState('product'); // 'product' | 'charge'
  const [productId, setProductId] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [chargeId, setChargeId] = useState('');
  const [charges, setCharges] = useState([]);
  const [loadingCharges, setLoadingCharges] = useState(false);

  const [uomPrecision, setUomPrecision] = useState(0);
  const [qty, setQty] = useState(1);
  const [qtyDisplay, setQtyDisplay] = useState('1');
  const [price, setPrice] = useState(0);
  const [priceDisplay, setPriceDisplay] = useState('0');
  const [discount, setDiscount] = useState(0);
  const [discountDisplay, setDiscountDisplay] = useState('0');
  const [taxId, setTaxId] = useState('');
  const [description, setDescription] = useState('');

  const [reqLineId, setReqLineId] = useState(null);
  const [reqDocNo, setReqDocNo] = useState('');
  const [reqRemainingQty, setReqRemainingQty] = useState(null);

  const [uomName, setUomName] = useState('');
  const [uomId, setUomId] = useState(null);

  // PR Lines Queue states
  const [prQueue, setPrQueue] = useState([]);
  const [initialQueueTotal, setInitialQueueTotal] = useState(0);
  const [completedQueueCount, setCompletedQueueCount] = useState(0);
  const [queueSuccessMessage, setQueueSuccessMessage] = useState(null);

  // Withholding Tax (PPh23)
  const [isWithholding, setIsWithholding] = useState(false);
  const [withholdingRate, setWithholdingRate] = useState('2');

  const [reqModalOpen, setReqModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState(null);

  const hasPersistedLine = Boolean(
    isEdit && (lineData?.c_orderline_id || lineData?.id || lineData?.line_id)
  );

  const activeUomPrecision = itemType === 'charge' ? 0 : uomPrecision;

  // Populate data if editing
  useEffect(() => {
    if (lineData) {
      const lineUomPrec = lineData.uom_precision ?? 0;
      if (lineData.c_charge_id) {
        setItemType('charge');
        setChargeId(String(lineData.c_charge_id));
        setProductId('');
        setSelectedProduct(null);
        setUomPrecision(0);
      } else {
        setItemType('product');
        const pId = lineData.m_product_id ? String(lineData.m_product_id) : '';
        setProductId(pId);
        setChargeId('');
        setUomPrecision(lineUomPrec);
        if (pId) {
          const pName = lineData.product_name || 'Product Item';
          const pVal = lineData.product_value ? `${lineData.product_value} - ` : '';
          setSelectedProduct({
            id: Number(pId),
            value: Number(pId),
            label: `${pVal}${pName}`,
            text: `${pVal}${pName}`,
            uom_name: lineData.uom_symbol || lineData.uom_name || '',
            uom_symbol: lineData.uom_symbol || lineData.uom_name || '',
            c_uom_id: lineData.c_uom_id || null,
            uom_precision: lineUomPrec,
          });
        }
      }

      const q = Number(lineData.qtyentered || lineData.qtyordered || lineData.qty || 1);
      const p = Number(lineData.priceactual || lineData.priceentered || 0);
      const d = Number(lineData.discount || 0);

      setQty(q);
      setQtyDisplay(formatNumberWithPrecision(q, lineData.c_charge_id ? 0 : lineUomPrec));
      setPrice(p);
      setPriceDisplay(formatNumberWithPrecision(p, pricePrecision));
      setDiscount(d);
      setDiscountDisplay(formatNumberWithPrecision(d, 2));
      setTaxId(headerTaxId ? String(headerTaxId) : (lineData.c_tax_id ? String(lineData.c_tax_id) : ''));
      setDescription(lineData.description || '');
      setReqLineId(lineData.m_requisitionline_id || null);
      setReqDocNo(lineData.requisition_documentno || '');
      setUomName(lineData.uom_symbol || lineData.uom_name || '');
      setUomId(lineData.c_uom_id || null);
      setIsWithholding(Boolean(lineData.is_withholding || lineData.adw_iswithholding === 'Y'));
      setWithholdingRate(String(lineData.withholding_rate || lineData.adw_withholdingrate || 2));
    } else {
      setItemType('product');
      setProductId('');
      setSelectedProduct(null);
      setChargeId('');
      setUomPrecision(0);
      setQty(1);
      setQtyDisplay('1');
      setPrice(0);
      setPriceDisplay(formatNumberWithPrecision(0, pricePrecision));
      setDiscount(0);
      setDiscountDisplay('0');
      setTaxId(headerTaxId ? String(headerTaxId) : (taxes[0]?.id ? String(taxes[0].id) : ''));
      setDescription('');
      setReqLineId(null);
      setReqDocNo('');
      setReqRemainingQty(null);
      setUomName('');
      setUomId(null);
      setIsWithholding(false);
      setWithholdingRate('2');
    }
    setError(null);
  }, [lineData, headerTaxId, taxes, pricePrecision]);

  // Load Charges on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingCharges(true);
    orderApi
      .getCharges({ client_id: clientId, limit: 100 })
      .then((res) => {
        if (!isMounted) return;
        setCharges(res?.data || []);
      })
      .catch((err) => {
        console.error('Failed to load charges:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingCharges(false);
      });
    return () => {
      isMounted = false;
    };
  }, [clientId]);

  // Initial & Debounced Product Search
  useEffect(() => {
    let isMounted = true;
    setSearchingProducts(true);
    const timer = setTimeout(() => {
      orderApi
        .getProducts({
          client_id: clientId,
          search: productQuery.trim(),
          limit: 30,
        })
        .then((res) => {
          if (!isMounted) return;
          setProductResults(res?.data || []);
        })
        .catch((err) => {
          console.error('Failed to search products:', err);
        })
        .finally(() => {
          if (isMounted) setSearchingProducts(false);
        });
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [productQuery, clientId]);

  // Calculations
  const numQty = Number(qty) || 0;
  const numPrice = Number(price) || 0;
  const numDiscount = Math.min(100, Math.max(0, Number(discount) || 0));
  const priceActual = numPrice * (1 - numDiscount / 100);
  const lineNet = numQty * priceActual;

  const currentTaxId = headerTaxId || taxId;
  const selectedTax = taxes.find((t) => String(t.id) === String(currentTaxId)) || taxes[0];
  const taxRate = Number(selectedTax?.rate || 0);
  const taxAmt = (lineNet * taxRate) / 100;

  const numWhtRate = parseFloat(withholdingRate) || 0;
  const whtAmt = isWithholding ? (lineNet * numWhtRate) / 100 : 0;
  const lineTotal = lineNet + taxAmt - whtAmt;

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol} ${num.toLocaleString('en-US', {
      minimumFractionDigits: pricePrecision,
      maximumFractionDigits: pricePrecision,
    })}`;
  };

  const handleProductSelect = (opt) => {
    if (!opt) {
      setProductId('');
      setSelectedProduct(null);
      setUomName('');
      setUomId(null);
      setUomPrecision(0);
      return;
    }
    const raw = opt.raw || opt;
    const prec = raw.uom_precision ?? 0;
    setUomPrecision(prec);
    setProductId(String(raw.id));
    setSelectedProduct({
      id: raw.id,
      value: raw.id,
      label: raw.text || raw.name,
      text: raw.text || raw.name,
      ...raw,
      uom_precision: prec,
    });
    setUomName(raw.uom_symbol || raw.uom_name || '');
    setUomId(raw.c_uom_id || null);
    setQtyDisplay(formatNumberWithPrecision(qty || 1, prec));
  };

  const populateFromPrLine = (reqLine) => {
    if (!reqLine) return;
    setItemType('product');
    const pId = String(reqLine.m_product_id);
    const linePrec = reqLine.uom_precision ?? 0;
    setUomPrecision(linePrec);
    setProductId(pId);
    setSelectedProduct({
      id: reqLine.m_product_id,
      value: reqLine.m_product_id,
      label: `${reqLine.product_value ? reqLine.product_value + ' - ' : ''}${reqLine.product_name}`,
      text: `${reqLine.product_value ? reqLine.product_value + ' - ' : ''}${reqLine.product_name}`,
      uom_name: reqLine.uom_symbol || reqLine.uom_name || '',
      uom_symbol: reqLine.uom_symbol || reqLine.uom_name || '',
      c_uom_id: reqLine.c_uom_id || null,
      uom_precision: linePrec,
    });
    setReqLineId(reqLine.id);
    setReqDocNo(reqLine.po_number);
    const maxQty = reqLine.remaining_qty != null ? reqLine.remaining_qty : reqLine.qty;
    const finalQty = Number(maxQty || 1);
    setReqRemainingQty(maxQty);
    setQty(finalQty);
    setQtyDisplay(formatNumberWithPrecision(finalQty, linePrec));

    const finalPrice = reqLine.price > 0 ? Number(reqLine.price) : 0;
    setPrice(finalPrice);
    setPriceDisplay(formatNumberWithPrecision(finalPrice, pricePrecision));

    setDiscount(0);
    setDiscountDisplay(formatNumberWithPrecision(0, 2));

    setUomName(reqLine.uom_symbol || reqLine.uom_name || '');
    setUomId(reqLine.c_uom_id || null);
    if (reqLine.description) {
      setDescription(reqLine.description);
    } else {
      setDescription('');
    }
    setError(null);
  };

  const handleQtyBlur = () => {
    if (qty >= 0 && qtyDisplay !== '') {
      setQtyDisplay(formatNumberWithPrecision(qty, activeUomPrecision));
    }
  };

  const handlePriceBlur = () => {
    if (price >= 0 && priceDisplay !== '') {
      setPriceDisplay(formatNumberWithPrecision(price, pricePrecision));
    }
  };

  const handleDiscountBlur = () => {
    if (discount >= 0 && discountDisplay !== '') {
      setDiscountDisplay(formatNumberWithPrecision(discount, 2));
    }
  };

  const handleSelectRequisitionLines = (selectedLines = []) => {
    if (!selectedLines || selectedLines.length === 0) return;
    const [firstLine, ...remaining] = selectedLines;
    populateFromPrLine(firstLine);
    setPrQueue(remaining);
    setInitialQueueTotal(selectedLines.length);
    setCompletedQueueCount(0);
    setReqModalOpen(false);
    if (remaining.length > 0) {
      setQueueSuccessMessage(
        `Loaded PR line 1 of ${selectedLines.length}: PR #${firstLine.po_number} - ${firstLine.product_name}. ${remaining.length} more in queue.`
      );
      setTimeout(() => setQueueSuccessMessage(null), 5000);
    }
  };

  const handleSkipCurrentQueueItem = () => {
    if (prQueue.length === 0) {
      setInitialQueueTotal(0);
      setPrQueue([]);
      return;
    }
    const [nextLine, ...remaining] = prQueue;
    setPrQueue(remaining);
    setCompletedQueueCount((prev) => prev + 1);
    populateFromPrLine(nextLine);
    setQueueSuccessMessage(
      `Skipped PR line. Now reviewing PR #${nextLine.po_number} - ${nextLine.product_name} (${remaining.length} remaining in queue)`
    );
    setTimeout(() => setQueueSuccessMessage(null), 5000);
  };

  const handleCancelQueue = () => {
    setPrQueue([]);
    setInitialQueueTotal(0);
    setCompletedQueueCount(0);
    setQueueSuccessMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (itemType === 'product' && !productId) {
      setError('Please select a Product Item from approved Requisitions using "From Requisition".');
      return;
    }
    if (itemType === 'charge' && !chargeId) {
      setError('Please select a Charge / Expense Type.');
      return;
    }
    if (numQty <= 0) {
      setError('Quantity must be greater than zero.');
      return;
    }
    if (itemType === 'product' && numPrice <= 0) {
      setError('Unit price must be greater than zero.');
      return;
    }
    const finalTaxId = Number(headerTaxId || taxId || selectedTax?.id);
    if (!finalTaxId) {
      setError('Please select a Tax Rate.');
      return;
    }
    if (reqLineId && reqRemainingQty != null && numQty > reqRemainingQty) {
      setError(`Quantity cannot exceed the available Requisition remaining quantity (${reqRemainingQty}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        m_product_id: itemType === 'product' ? Number(productId) : null,
        c_charge_id: itemType === 'charge' ? Number(chargeId) : null,
        qty: numQty,
        price: numPrice,
        discount: numDiscount,
        c_tax_id: finalTaxId,
        c_uom_id: uomId ? Number(uomId) : null,
        description: description.trim(),
        m_requisitionline_id: reqLineId ? Number(reqLineId) : null,
        is_withholding: isWithholding,
        withholding_rate: isWithholding ? numWhtRate : 0,
      };

      if (isEdit) {
        const lineId = lineData.c_orderline_id || lineData.id;
        await orderApi.updateOrderLine(orderId, lineId, payload, session?.token);
        onSuccess?.('updated');
      } else {
        await orderApi.createOrderLine(orderId, payload, { client_id: clientId }, session?.token);

        if (prQueue.length > 0) {
          // Notify parent order page to refresh lines & totals without closing form
          onIntermediateSaved?.('created');

          const [nextLine, ...remaining] = prQueue;
          setPrQueue(remaining);
          setCompletedQueueCount((prev) => prev + 1);
          populateFromPrLine(nextLine);
          setQueueSuccessMessage(
            `Line item saved! Loaded next PR line: PR #${nextLine.po_number} - ${nextLine.product_name} (${remaining.length} remaining in queue)`
          );
          setTimeout(() => setQueueSuccessMessage(null), 5000);
        } else {
          onSuccess?.('created');
        }
      }
    } catch (err) {
      console.error('Failed to save order line item:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to save order line item.';

      if (
        err.response?.status === 401 ||
        errMsg.includes('401') ||
        errMsg.includes('Token has expired')
      ) {
        onTokenExpired?.();
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLine = async () => {
    const lineId = lineData?.c_orderline_id || lineData?.id || lineData?.line_id;
    if (!orderId || !lineId) {
      setError('Unable to delete: Line ID not found.');
      setShowDeleteModal(false);
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await orderApi.deleteOrderLine(orderId, lineId, session?.token);
      setShowDeleteModal(false);
      onSuccess?.('deleted');
    } catch (err) {
      console.error('Failed to delete order line item:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to delete order line item.';

      if (
        err.response?.status === 401 ||
        errMsg.includes('401') ||
        errMsg.includes('Token has expired')
      ) {
        setShowDeleteModal(false);
        onTokenExpired?.();
      } else {
        setError(errMsg);
        setShowDeleteModal(false);
      }
    } finally {
      setDeleting(false);
    }
  };

  const customSelectStyles = getCustomSelectStyles(isDark, {
    borderRadius: '0.75rem',
    minHeight: '38px',
    fontSize: '0.75rem',
  });

  const productOptions = useMemo(() => {
    return productResults.map((p) => ({
      value: p.id,
      label: p.text || `${p.value ? p.value + ' - ' : ''}${p.name}`,
      raw: p,
    }));
  }, [productResults]);

  const chargeOptions = useMemo(() => {
    return charges.map((c) => ({
      value: c.id,
      label: c.text || c.name,
      raw: c,
    }));
  }, [charges]);

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Form Navigation Header */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
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
              <span>{isEdit ? `Edit Order Line Item` : 'Add Order Line Item'}</span>
              {isEdit && lineData?.line && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  Line #{lineData.line}
                </span>
              )}
            </h3>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">
              {isEdit
                ? 'Modify line item quantity, pricing, discounts, tax, or specifications'
                : 'Enter new product or charge item details and save directly into the purchase order'}
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
        {queueSuccessMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono flex items-center space-x-2 animate-in fade-in">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{queueSuccessMessage}</span>
          </div>
        )}

        {/* PR Queue Progress Banner */}
        {initialQueueTotal > 1 && (
          <div
            className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono animate-in fade-in ${
              isDark
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                : 'bg-cyan-50 border-cyan-200 text-cyan-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                {completedQueueCount + 1}/{initialQueueTotal}
              </div>
              <div>
                <h5 className="font-bold text-xs">
                  Requisition Queue: Line {completedQueueCount + 1} of {initialQueueTotal}
                </h5>
                <p className="text-[11px] opacity-80 mt-0.5">
                  PR #{reqDocNo} •{' '}
                  {prQueue.length > 0
                    ? `${prQueue.length} more PR line${prQueue.length === 1 ? '' : 's'} queued for entry`
                    : 'Final PR line item in queue'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {prQueue.length > 0 && (
                <button
                  type="button"
                  onClick={handleSkipCurrentQueueItem}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                    isDark
                      ? 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20'
                      : 'border-cyan-300 text-cyan-800 hover:bg-cyan-100'
                  }`}
                >
                  Skip this Line
                </button>
              )}
              <button
                type="button"
                onClick={handleCancelQueue}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                  isDark
                    ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                    : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                }`}
              >
                Cancel Queue
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Item Type Selection & Requisition Picker */}
        <div
          className={`p-4 rounded-xl border space-y-3.5 ${
            isDark ? 'bg-slate-950/20 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div
              className={`flex items-center space-x-1.5 p-1 rounded-xl border text-xs font-mono ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                disabled={isEdit}
                onClick={() => {
                  if (isEdit) return;
                  setItemType('product');
                  setChargeId('');
                  setQtyDisplay(formatNumberWithPrecision(qty || 1, uomPrecision));
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isEdit ? 'cursor-default' : 'cursor-pointer'
                } ${
                  itemType === 'product'
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold shadow-md shadow-indigo-500/20'
                    : isDark
                    ? 'text-slate-500 hover:text-slate-400 opacity-60'
                    : 'text-slate-400 hover:text-slate-500 opacity-60'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Product Item</span>
              </button>
              <button
                type="button"
                disabled={isEdit}
                onClick={() => {
                  if (isEdit) return;
                  setItemType('charge');
                  setProductId('');
                  setSelectedProduct(null);
                  setReqLineId(null);
                  setReqDocNo('');
                  setReqRemainingQty(null);
                  setUomName('');
                  setUomId(null);
                  setQtyDisplay(formatNumberWithPrecision(qty || 1, 0));
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  isEdit ? 'cursor-default' : 'cursor-pointer'
                } ${
                  itemType === 'charge'
                    ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold shadow-md shadow-indigo-500/20'
                    : isDark
                    ? 'text-slate-500 hover:text-slate-400 opacity-60'
                    : 'text-slate-400 hover:text-slate-500 opacity-60'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Charge / Expense</span>
              </button>
            </div>

            {itemType === 'product' && !isEdit && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReqModalOpen(true)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                    isDark
                      ? 'border-slate-800 bg-slate-950/40 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Select line from approved Purchase Requisition"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{reqDocNo ? `PR #${reqDocNo}` : 'From Requisition'}</span>
                </button>
                {reqDocNo && (
                  <button
                    type="button"
                    onClick={() => {
                      setReqLineId(null);
                      setReqDocNo('');
                      setReqRemainingQty(null);
                      setProductId('');
                      setSelectedProduct(null);
                      setUomName('');
                      setUomId(null);
                    }}
                    title="Clear selected Requisition line"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Product Select or Charge Select */}
          {itemType === 'product' ? (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <span>Product Item</span>
                  <span className="text-rose-500">*</span>
                  <span className="text-[10px] font-normal normal-case text-slate-500 tracking-normal flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" />
                    {isEdit ? '(Locked in edit mode)' : '(Read-only, select via From Requisition)'}
                  </span>
                </label>
                {uomName && (
                  <span className="text-[10px] font-mono text-cyan-400">
                    UOM: <strong>{uomName}</strong>
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={
                    selectedProduct
                      ? selectedProduct.label || selectedProduct.text || ''
                      : ''
                  }
                  placeholder={
                    isEdit
                      ? 'Product item is locked in edit mode'
                      : "Select product via 'From Requisition' button..."
                  }
                  onClick={() => {
                    if (!selectedProduct && !isEdit) setReqModalOpen(true);
                  }}
                  className={`w-full h-[38px] px-3.5 pr-10 text-xs font-mono border rounded-xl transition-colors cursor-not-allowed select-none ${
                    isDark
                      ? 'bg-slate-950/60 border-slate-800 text-slate-200 placeholder:text-slate-600'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400'
                  }`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-slate-500 pointer-events-none">
                  <Lock className="w-3.5 h-3.5" />
                </div>
              </div>
              {reqDocNo && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs font-mono text-orange-600 dark:text-orange-400">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    Linked to Requisition: <strong className="font-bold">{reqDocNo}</strong>
                    {reqRemainingQty != null && ` (Remaining Available: ${reqRemainingQty})`}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Charge / Expense Type <span className="text-rose-500">*</span>
              </label>
              <Select
                value={
                  chargeId
                    ? chargeOptions.find((opt) => String(opt.value) === String(chargeId)) || {
                        value: chargeId,
                        label: `Charge #${chargeId}`,
                      }
                    : null
                }
                onChange={(opt) => {
                  setChargeId(opt ? String(opt.value) : '');
                  setUomName('');
                  setUomId(null);
                }}
                options={chargeOptions}
                styles={customSelectStyles}
                placeholder="Select charge or expense type..."
                isSearchable
                isClearable
                isLoading={loadingCharges}
                menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                menuPosition="fixed"
                minMenuHeight={220}
              />
            </div>
          )}
        </div>

        {/* Section 2: Quantity, Unit Price, Discount & Tax */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Quantity */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                ({activeUomPrecision} dec)
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={qtyDisplay}
                onChange={(e) => {
                  const formatted = formatInputLive(e.target.value, activeUomPrecision);
                  setQtyDisplay(formatted);
                  setQty(parseFormattedNumber(formatted));
                }}
                onBlur={handleQtyBlur}
                placeholder="0"
                className={`w-full h-[38px] pl-3.5 pr-14 text-xs font-mono font-bold text-right rounded-xl border outline-none transition ${
                  isDark
                    ? 'bg-slate-950/70 border-slate-800 text-slate-200 focus:border-cyan-500'
                    : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                }`}
              />
              {uomName && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-cyan-400 uppercase pointer-events-none">
                  {uomName}
                </span>
              )}
            </div>
          </div>

          {/* Unit Price */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                Unit Price ({currencySymbol}) <span className="text-rose-500">*</span>
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
                setPrice(parseFormattedNumber(formatted));
              }}
              onBlur={handlePriceBlur}
              placeholder="0.00"
              className={`w-full h-[38px] px-3.5 text-xs font-mono font-bold text-right rounded-xl border outline-none transition ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200 focus:border-cyan-500'
                  : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
              }`}
            />
          </div>

          {/* Discount (%) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Discount (%)
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                (2 dec)
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                value={discountDisplay}
                onChange={(e) => {
                  let formatted = formatInputLive(e.target.value, 2);
                  const parsed = parseFormattedNumber(formatted);
                  if (parsed > 100) {
                    formatted = '100';
                    setDiscount(100);
                  } else {
                    setDiscount(parsed);
                  }
                  setDiscountDisplay(formatted);
                }}
                onBlur={handleDiscountBlur}
                placeholder="0"
                className={`w-full h-[38px] pl-3.5 pr-8 text-xs font-mono font-bold text-right rounded-xl border outline-none transition ${
                  isDark
                    ? 'bg-slate-950/70 border-slate-800 text-slate-200 focus:border-cyan-500'
                    : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                }`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 pointer-events-none">
                %
              </span>
            </div>
          </div>

          {/* Tax Rate (Read-only, synchronized with Order Header) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Tax Rate <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-mono text-amber-500 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Locked to Header
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={
                  selectedTax
                    ? `${selectedTax.name || selectedTax.text || 'Tax'} (${selectedTax.rate || 0}%)`
                    : 'No Tax (0%)'
                }
                title="Tax rate is locked to match the Order Header tax configuration"
                className={`w-full h-[38px] pl-3.5 pr-9 text-xs font-mono font-bold rounded-xl border outline-none cursor-not-allowed select-none transition ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800 text-slate-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Withholding Tax (PPh 23) Card */}
        <div
          className={`p-4 rounded-xl border space-y-2.5 ${
            isDark ? 'bg-slate-950/20 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isWithholding}
                onChange={(e) => setIsWithholding(e.target.checked)}
                className={`w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/20 cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-300'
                }`}
              />
              <span className={`text-xs font-bold font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Apply Withholding Tax (PPh 23)
              </span>
            </label>
            {isWithholding && (
              <span className="text-xs font-mono font-bold text-amber-500 dark:text-amber-400">
                - {formatCurrency(whtAmt)}
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
                  className={`w-full h-8 px-2.5 text-xs font-mono font-bold rounded-lg border outline-none ${
                    isDark
                      ? 'bg-slate-900 border-slate-700 text-slate-200 focus:border-cyan-500'
                      : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                  }`}
                />
                <span className="text-xs font-mono text-slate-400">%</span>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Line Description / Notes */}
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Line Description / Notes
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter optional specifications, brand, serial, or special instructions..."
            className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono outline-none transition resize-none ${
              isDark
                ? 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
            }`}
          />
        </div>

        {/* Section 5: Calculation Summary Bar */}
        <div
          className={`p-4 sm:p-5 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono ${
            isDark
              ? 'bg-cyan-500/10 border-cyan-500/25'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Net Subtotal
            </span>
            <span
              className={`text-xs sm:text-sm font-bold block mt-0.5 truncate ${
                isDark ? 'text-slate-200' : 'text-slate-900'
              }`}
            >
              {formatCurrency(lineNet)}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              Tax ({taxRate}%)
            </span>
            <span
              className={`text-xs sm:text-sm font-bold block mt-0.5 truncate ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              + {formatCurrency(taxAmt)}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
              PPh 23 {isWithholding ? `(${numWhtRate}%)` : ''}
            </span>
            <span className="text-xs sm:text-sm font-bold text-amber-500 dark:text-amber-400 block mt-0.5 truncate">
              {isWithholding ? `- ${formatCurrency(whtAmt)}` : '-'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-indigo-600 dark:text-cyan-400 block font-bold">
              Line Total
            </span>
            <span className="text-sm sm:text-base font-black text-indigo-600 dark:text-cyan-300 block mt-0.5 truncate">
              {formatCurrency(lineTotal)}
            </span>
          </div>
        </div>

        {/* Section 6: Action Buttons */}
        <div
          className={`flex items-center justify-end gap-3 pt-2 border-t ${
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
          {hasPersistedLine && (
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              disabled={submitting || deleting}
              title="Delete this order line item"
              className={`flex items-center gap-1.5 px-4 h-[38px] rounded-xl border text-xs font-mono font-bold transition cursor-pointer disabled:opacity-50 ${
                isDark
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
            disabled={submitting || deleting}
            className="flex items-center gap-2 px-5 h-[38px] rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-mono text-xs font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Line Item...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>
                  {isEdit
                    ? 'Update Line Item'
                    : prQueue.length > 0
                    ? `Save & Continue (${prQueue.length} More in Queue)`
                    : initialQueueTotal > 1
                    ? 'Save & Finish Queue'
                    : 'Add Line to Order'}
                </span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Requisition Line Picker Modal */}
      {reqModalOpen && (
        <RequisitionLineModal
          isOpen={reqModalOpen}
          onClose={() => setReqModalOpen(false)}
          isDark={isDark}
          clientId={clientId}
          costCenterId={costCenterId}
          costCenters={costCenters}
          orderId={orderId}
          onSelectLines={handleSelectRequisitionLines}
          onSelectLine={(line) => handleSelectRequisitionLines([line])}
        />
      )}

      {/* Delete Confirmation Modal */}
      {hasPersistedLine && (
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          onClose={() => !deleting && setShowDeleteModal(false)}
          onConfirm={handleDeleteLine}
          title="Delete Order Line Item"
          message={`Are you sure you want to delete line #${lineData?.line || ''} (${lineData?.product_name || lineData?.charge_name || selectedProduct?.label || 'Item'})? This action cannot be undone.`}
          loading={deleting}
        />
      )}
    </div>
  );
}

