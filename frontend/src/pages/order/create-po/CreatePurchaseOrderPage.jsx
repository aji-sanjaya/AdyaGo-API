import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Select from 'react-select';
import {
  ArrowLeft,
  Save,
  Check,
  AlertCircle,
  FileText,
  List,
  Paperclip,
  MessageSquare,
  Package,
  RefreshCw,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Eye,
  File,
  X,
  Settings,
  Printer,
  CheckCircle2,
  RotateCcw,
  Ban,
  Lock,
  History,
  ShoppingBag,
  PackageCheck,
  Building2,
  Calendar,
  Image,
} from 'lucide-react';
import { idempiereConfig } from '../../../config/idempiere';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import ModuleLayout from '../../../layouts/ModuleLayout';
import PageLoader from '../../../components/ui/PageLoader';
import { orderApi } from '../../../api/order';
import { getCustomSelectStyles } from '../../../components/ui/selectStyles';
import CustomDatePicker from '../../../components/ui/CustomDatePicker';
import { decryptDocumentId, encryptDocumentId } from '../../../utils/crypto';
import ReauthModal from '../../../components/common/ReauthModal';
import ConfirmDeleteModal from '../../../components/common/ConfirmDeleteModal';
import OrderLineForm from './components/OrderLineForm';
import LinkedRequisitionsTab from './components/LinkedRequisitionsTab';
import LinkedReceiptsTab from './components/LinkedReceiptsTab';
import OrderChatTab from './components/OrderChatTab';
import OrderChangeLogTab from './components/OrderChangeLogTab';
import PrintPreviewModal from './components/PrintPreviewModal';
import InvalidDocumentState from '../../../components/common/InvalidDocumentState';
import PdfJsViewer from '../../../components/common/PdfJsViewer';

const normalizeOptions = (raw) => {
  if (!raw) return {};
  const normalizeList = (list) =>
    (list || []).map((item) => ({
      id: item.id !== undefined ? item.id : item.value,
      value: item.id !== undefined ? item.id : item.value,
      name: item.name || item.text || item.label || '',
      text: item.text || item.name || item.label || '',
      label: item.text || item.name || item.label || '',
      ...item,
    }));

  return {
    ...raw,
    organizations: normalizeList(raw.organizations),
    warehouses: normalizeList(raw.warehouses),
    pricelists: normalizeList(raw.pricelists),
    doctypes: normalizeList(raw.doctypes),
    priorities: normalizeList(raw.priorities),
    paymentTerms: normalizeList(raw.payment_terms || raw.paymentTerms),
    payment_terms: normalizeList(raw.payment_terms || raw.paymentTerms),
    taxes: (raw.taxes || []).map((t) => ({
      id: t.id,
      name: t.name || t.text,
      text: t.text || t.name,
      label: t.text || t.name,
      rate: Number(t.rate || 0),
    })),
    projects: normalizeList(raw.projects),
    costCenters: normalizeList(raw.cost_centers || raw.costCenters),
    cost_centers: normalizeList(raw.cost_centers || raw.costCenters),
    approvers: normalizeList(raw.approvers),
    users: normalizeList(raw.users || raw.approvers),
    vendors: normalizeList(raw.vendors),
  };
};

export default function CreatePurchaseOrderPage({ documentIdParam: propDocId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { isDark } = useTheme();

  // Resolve document ID from prop or URL param
  const rawParam =
    propDocId ||
    searchParams.get('documentID') ||
    searchParams.get('document_id') ||
    'new';

  const decryptedDocId = decryptDocumentId(rawParam);
  const isNew = !rawParam || rawParam === 'new' || decryptedDocId === 'new';
  const targetId = isNew ? null : decryptedDocId;

  const todayStr = new Date().toISOString().split('T')[0];
  const clientId = session?.clientId || session?.client_id || 0;
  const orgIdDefault =
    session?.orgId !== undefined && session?.orgId !== null && session?.orgId !== ''
      ? Number(session.orgId)
      : session?.org_id !== undefined && session?.org_id !== null && session?.org_id !== ''
      ? Number(session.org_id)
      : 0;
  const warehouseIdDefault =
    session?.warehouseId !== undefined && session?.warehouseId !== null && session?.warehouseId !== ''
      ? Number(session.warehouseId)
      : session?.warehouse_id !== undefined && session?.warehouse_id !== null && session?.warehouse_id !== ''
      ? Number(session.warehouse_id)
      : 0;
  const userId = session?.user?.id || session?.user?.userId || 0;

  // Active tab state
  const [activeTab, setActiveTab] = useState('header');

  // Master options state
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);

  // Document data for existing order
  const [docHeader, setDocHeader] = useState(null);
  const [docLines, setDocLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [linesLoaded, setLinesLoaded] = useState(false);

  // Form Fields State
  const [orgId, setOrgId] = useState(isNew && orgIdDefault ? orgIdDefault : '');
  const [warehouseId, setWarehouseId] = useState(isNew && warehouseIdDefault ? warehouseIdDefault : '');
  const [docTypeTargetId, setDocTypeTargetId] = useState(idempiereConfig.createPo.defaults.docTypeId);
  const [dateOrdered, setDateOrdered] = useState(todayStr);
  const [datePromised, setDatePromised] = useState(todayStr);
  const [vendorId, setVendorId] = useState('');
  const [vendorContactId, setVendorContactId] = useState('');
  const [pricelistId, setPricelistId] = useState(idempiereConfig.createPo.defaults.pricelistId);
  const [paymentTermId, setPaymentTermId] = useState(idempiereConfig.createPo.defaults.paymentTermId);
  const [paymentRule, setPaymentRule] = useState(idempiereConfig.createPo.defaults.paymentRule);
  const [priorityRule, setPriorityRule] = useState(idempiereConfig.createPo.defaults.priorityRule);
  const [taxId, setTaxId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [checkedById, setCheckedById] = useState('');
  const [approvedById, setApprovedById] = useState('');
  const [description, setDescription] = useState('');

  // Vendor options for search
  const [vendorOptions, setVendorOptions] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorContacts, setVendorContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Submission & UI States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);

  // Line modal & line management
  const [showLineForm, setShowLineForm] = useState(false);
  const [selectedLineForEdit, setSelectedLineForEdit] = useState(null);
  const [deletingLineId, setDeletingLineId] = useState(null);
  const [linePendingDelete, setLinePendingDelete] = useState(null);

  // Lines Tab Search & Pagination
  const [lineSearch, setLineSearch] = useState('');
  const [lineSortField, setLineSortField] = useState('line');
  const [lineSortDir, setLineSortDir] = useState('asc');
  const [linePage, setLinePage] = useState(1);
  const [lineLimit, setLineLimit] = useState(10);

  // Modals for Actions & Delete
  const [showDocActionModal, setShowDocActionModal] = useState(false);
  const [actionPendingConfirm, setActionPendingConfirm] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState(null);
  const [attachmentPendingDelete, setAttachmentPendingDelete] = useState(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const fileInputRef = useRef(null);

  // Tab counts
  const [chatCount, setChatCount] = useState(0);
  const [changeLogCount, setChangeLogCount] = useState(0);
  const [requisitionCount, setRequisitionCount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);
  const [lineCount, setLineCount] = useState(0);

  const totalLineCount = linesLoaded ? docLines.length : (lineCount || docHeader?.line_count || 0);
  const totalAttachmentCount = attachments.length > 0 ? attachments.length : attachmentCount;
  const hasLines = totalLineCount > 0;

  const formSelectStyles = getCustomSelectStyles(isDark, {
    borderRadius: '0.5rem',
    minHeight: '38px',
    fontSize: '0.75rem',
  });

  const displayDocNo = isNew ? '** New **' : docHeader?.documentno || '** View **';
  const displayStatus = isNew
    ? idempiereConfig.createPo.defaults.documentStatusLabel
    : docHeader?.docstatus_label || docHeader?.docstatus || idempiereConfig.createPo.defaults.documentStatusLabel;

  const currentDocStatus = (docHeader?.docstatus || 'DR').toUpperCase();
  const readOnlyStatuses = idempiereConfig.createPo.statuses.readOnly;
  const isReadOnly = !isNew && readOnlyStatuses.includes(currentDocStatus);

  const clientDisplayName =
    options?.client_name || session?.clientName || idempiereConfig.tenant.name;

  const selectedPl =
    options?.pricelists?.find((p) => Number(p.value || p.id) === Number(pricelistId)) || null;
  const activePricePrecision = docHeader?.price_precision ?? selectedPl?.precision ?? 2;
  const activeCurrencySymbol = docHeader?.currency_symbol || 'Rp';

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `${activeCurrencySymbol} ${num.toLocaleString('en-US', {
      minimumFractionDigits: activePricePrecision,
      maximumFractionDigits: activePricePrecision,
    })}`;
  };

  const withholdingTotal = Number(
    docHeader?.withholdingamount ||
    docHeader?.adw_withholdingamount ||
    docLines?.reduce((sum, l) => {
      const isWh = l.is_withholding || l.adw_iswithholding === 'Y';
      if (!isWh) return sum;
      const amt = Number(l.withholding_amount || l.adw_withholdingamount) || 0;
      if (amt > 0) return sum + amt;
      const rate = Number(l.withholding_rate || l.adw_withholdingrate || 2);
      const lineAmt = Number(l.linenetamt) || ((Number(l.qtyentered || l.qtyordered) || 0) * (Number(l.priceactual || l.priceentered) || 0));
      return sum + (lineAmt * rate / 100);
    }, 0) ||
    0
  );

  const applyRecordData = (header, lines, populateForm = true) => {
    if (header) {
      setDocHeader(header);
      if (populateForm) {
        setOrgId(header.ad_org_id ? Number(header.ad_org_id) : (orgIdDefault ? Number(orgIdDefault) : ''));
        setWarehouseId(header.m_warehouse_id ? Number(header.m_warehouse_id) : (warehouseIdDefault ? Number(warehouseIdDefault) : ''));
        setDocTypeTargetId(header.c_doctypetarget_id || idempiereConfig.createPo.defaults.docTypeId);
        setDateOrdered(header.dateordered ? header.dateordered.split('T')[0] : todayStr);
        setDatePromised(header.datepromised ? header.datepromised.split('T')[0] : todayStr);
        setVendorId(header.c_bpartner_id || '');
        setVendorContactId(header.ad_user_id || '');
        setPricelistId(header.m_pricelist_id || idempiereConfig.createPo.defaults.pricelistId);
        setPaymentTermId(header.c_paymentterm_id || idempiereConfig.createPo.defaults.paymentTermId);
        setPaymentRule(header.paymentrule || idempiereConfig.createPo.defaults.paymentRule);
        setPriorityRule(header.priorityrule || idempiereConfig.createPo.defaults.priorityRule);
        setTaxId(header.c_tax_id ? Number(header.c_tax_id) : '');
        setCostCenterId(header.c_costcenter_id || '');
        setProjectId(header.c_project_id || '');
        setCheckedById(header.checkedby_id || '');
        setApprovedById(header.approvedby_id || '');
        setDescription(header.description || '');

        if (header.c_bpartner_id && (header.vendor_name || header.bpartner_name)) {
          const vName = header.vendor_name || header.bpartner_name;
          const vVal = header.vendor_value || header.bpartner_value || '';
          const vText = `${vVal ? vVal + ' - ' : ''}${vName}`;
          setVendorOptions((prev) => {
            const exists = prev.some((v) => Number(v.id) === Number(header.c_bpartner_id));
            if (!exists) {
              return [
                {
                  id: header.c_bpartner_id,
                  value: header.c_bpartner_id,
                  name: vName,
                  text: vText,
                  label: vText,
                },
                ...prev,
              ];
            }
            return prev;
          });
        }
      }
    }
    if (lines) {
      setDocLines(lines);
      setLinesLoaded(true);
    }
  };

  // Initial Data Load
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    if (!isNew && !targetId) {
      setInvalidToken(true);
      setLoading(false);
      return;
    }

    const loadOptions = orderApi.getMasterOptions(clientId, userId, session?.token);
    const loadDetail = !isNew && targetId ? orderApi.getOrder(targetId) : Promise.resolve(null);
    const loadCounts = !isNew && targetId ? orderApi.getOrderCounts(targetId).catch(() => ({ data: null })) : Promise.resolve({ data: null });

    Promise.all([loadOptions, loadDetail, loadCounts])
      .then(([optRes, detailRes, countsRes]) => {
        if (!isMounted) return;
        const optData = normalizeOptions(optRes?.data || optRes || {});
        setOptions(optData);
        if (optData.vendors && optData.vendors.length > 0) {
          setVendorOptions(optData.vendors);
        } else {
          orderApi
            .searchVendors(clientId, '')
            .then((vRes) => {
              if (!isMounted) return;
              const vList = (vRes?.data || []).map((v) => ({
                id: v.id,
                value: v.id,
                name: v.name || v.text || '',
                text: v.text || v.name || '',
                label: v.text || v.name || '',
              }));
              if (vList.length > 0) {
                setVendorOptions((prev) => (prev.length > 0 ? prev : vList));
              }
            })
            .catch(() => {});
        }

        if (isNew && optData.taxes && optData.taxes.length > 0) {
          setTaxId((prev) => prev || optData.taxes[0].id);
        }

        if (countsRes && countsRes.data) {
          const counts = countsRes.data;
          setAttachmentCount(counts.attachments || 0);
          setChatCount(counts.chats || 0);
          setChangeLogCount(counts.change_logs || 0);
          setRequisitionCount(counts.requisitions || 0);
          setReceiptCount(counts.receipts || 0);
          if (counts.lines !== undefined) {
            setLineCount(counts.lines);
          }
        }

        if (detailRes && detailRes.data) {
          applyRecordData(detailRes.data.header, detailRes.data.lines, true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load purchase order details:', err);
        const errMsg =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to load purchase order.';
        if (
          err.response?.status === 401 ||
          errMsg.includes('401') ||
          errMsg.includes('Token has expired')
        ) {
          setShowReauthModal(true);
        } else {
          setError(errMsg);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [targetId, isNew, clientId, userId]);

  // Load contacts when vendorId changes
  useEffect(() => {
    if (!vendorId) {
      setVendorContacts([]);
      return;
    }

    let isMounted = true;
    setLoadingContacts(true);
    orderApi
      .searchContacts(clientId, vendorId)
      .then((res) => {
        if (!isMounted) return;
        if (res && res.data) {
          setVendorContacts(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load vendor contacts:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingContacts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [vendorId, clientId]);

  // Filtered warehouses by org
  const filteredWarehouses = useMemo(() => {
    if (!options?.warehouses) return [];
    if (!orgId) return options.warehouses;
    return options.warehouses.filter((w) => !w.org_id || Number(w.org_id) === Number(orgId));
  }, [options?.warehouses, orgId]);

  // Filtered org options according to user session role / org context
  const allOrgList = useMemo(
    () => options?.organizations?.map((org) => ({ value: org.id, label: org.label || org.name || org.text })) || [],
    [options?.organizations]
  );

  const isAllOrgsContext =
    !orgIdDefault ||
    orgIdDefault === 0 ||
    session?.contextDetails?.orgName === '* (All)' ||
    session?.contextDetails?.orgName === '*';

  const orgOptions = useMemo(() => {
    if (!isNew) {
      if (isAllOrgsContext) return allOrgList;
      const filtered = allOrgList.filter((org) => Number(org.value) === Number(orgIdDefault));
      if (orgId) {
        const docOrg = allOrgList.find((org) => Number(org.value) === Number(orgId));
        if (docOrg && !filtered.some((f) => Number(f.value) === Number(docOrg.value))) {
          return [...filtered, docOrg];
        }
      }
      return filtered.length > 0 ? filtered : allOrgList;
    }

    if (isAllOrgsContext) return allOrgList;

    const filtered = allOrgList.filter((org) => Number(org.value) === Number(orgIdDefault));
    if (filtered.length > 0) return filtered;

    if (session?.contextDetails?.orgName && session.contextDetails.orgName !== '* (All)') {
      const byName = allOrgList.filter(
        (org) => org.label.trim().toLowerCase() === session.contextDetails.orgName.trim().toLowerCase()
      );
      if (byName.length > 0) return byName;
    }

    return allOrgList;
  }, [allOrgList, isAllOrgsContext, orgIdDefault, session?.contextDetails?.orgName, isNew, orgId]);

  // Vendor async search
  const handleVendorSearch = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) return;
    setLoadingVendors(true);
    try {
      const res = await orderApi.searchVendors(clientId, searchTerm);
      if (res && res.data) {
        setVendorOptions(res.data);
      }
    } catch (err) {
      console.error('Failed to search vendors:', err);
    } finally {
      setLoadingVendors(false);
    }
  };

  // Submit Header Form (Save / Create)
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!orgId) {
      setError('Organization is required.');
      return;
    }
    if (!warehouseId) {
      setError('Warehouse is required.');
      return;
    }
    if (!vendorId) {
      setError('Vendor is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      org_id: Number(orgId),
      ad_org_id: Number(orgId),
      warehouse_id: Number(warehouseId),
      m_warehouse_id: Number(warehouseId),
      doc_type_id: Number(docTypeTargetId) || idempiereConfig.createPo.defaults.docTypeId,
      c_doctypetarget_id: Number(docTypeTargetId) || idempiereConfig.createPo.defaults.docTypeId,
      date_ordered: dateOrdered,
      dateordered: dateOrdered,
      date_promised: datePromised,
      datepromised: datePromised,
      c_bpartner_id: Number(vendorId),
      c_bpartner_location_id: vendorContactId ? Number(vendorContactId) : undefined,
      ad_user_id: vendorContactId ? Number(vendorContactId) : undefined,
      pricelist_id: Number(pricelistId) || idempiereConfig.createPo.defaults.pricelistId,
      m_pricelist_id: Number(pricelistId) || idempiereConfig.createPo.defaults.pricelistId,
      c_paymentterm_id: paymentTermId ? Number(paymentTermId) : undefined,
      paymentrule: paymentRule || idempiereConfig.createPo.defaults.paymentRule,
      priority_rule: priorityRule || idempiereConfig.createPo.defaults.priorityRule,
      priorityrule: priorityRule || idempiereConfig.createPo.defaults.priorityRule,
      c_tax_id: taxId ? Number(taxId) : undefined,
      c_costcenter_id: costCenterId ? Number(costCenterId) : undefined,
      c_project_id: projectId ? Number(projectId) : undefined,
      adw_ad_user_checked_id: checkedById ? Number(checkedById) : undefined,
      checkedby_id: checkedById ? Number(checkedById) : undefined,
      adw_ad_user_approved_id: approvedById ? Number(approvedById) : undefined,
      approvedby_id: approvedById ? Number(approvedById) : undefined,
      description: description.trim(),
    };

    try {
      if (isNew) {
        const res = await orderApi.createOrder(payload, session?.token);
        const newId = res.data?.id;
        setSuccessMessage('Purchase Order created successfully!');
        if (newId) {
          const encId = encryptDocumentId(String(newId));
          navigate(`/create-po?documentID=${encId}`, { replace: true });
        } else {
          navigate('/create-po', { replace: true });
        }
      } else {
        await orderApi.updateOrder(targetId, payload, session?.token);
        setSuccessMessage('Purchase Order header updated successfully.');
        setTimeout(() => setSuccessMessage(null), 4000);
        const detailRes = await orderApi.getOrder(targetId);
        if (detailRes && detailRes.data) {
          applyRecordData(detailRes.data.header, detailRes.data.lines, true);
        }
      }
    } catch (err) {
      console.error('Failed to save purchase order:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to process purchase order.';
      if (
        err.response?.status === 401 ||
        errMsg.includes('401') ||
        errMsg.includes('Token has expired')
      ) {
        setShowReauthModal(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReauthSuccess = async (newToken) => {
    setShowReauthModal(false);
    setError(null);
    setSuccessMessage('Token refreshed! Resuming and saving changes...');

    setSubmitting(true);
    try {
      const payload = {
        org_id: Number(orgId),
        ad_org_id: Number(orgId),
        warehouse_id: Number(warehouseId),
        m_warehouse_id: Number(warehouseId),
        doc_type_id: Number(docTypeTargetId) || idempiereConfig.createPo.defaults.docTypeId,
        c_doctypetarget_id: Number(docTypeTargetId) || idempiereConfig.createPo.defaults.docTypeId,
        date_ordered: dateOrdered,
        dateordered: dateOrdered,
        date_promised: datePromised,
        datepromised: datePromised,
        c_bpartner_id: Number(vendorId),
        c_bpartner_location_id: vendorContactId ? Number(vendorContactId) : undefined,
        ad_user_id: vendorContactId ? Number(vendorContactId) : undefined,
        pricelist_id: Number(pricelistId) || idempiereConfig.createPo.defaults.pricelistId,
        m_pricelist_id: Number(pricelistId) || idempiereConfig.createPo.defaults.pricelistId,
        c_paymentterm_id: paymentTermId ? Number(paymentTermId) : undefined,
        paymentrule: paymentRule || idempiereConfig.createPo.defaults.paymentRule,
        priority_rule: priorityRule || idempiereConfig.createPo.defaults.priorityRule,
        priorityrule: priorityRule || idempiereConfig.createPo.defaults.priorityRule,
        c_tax_id: taxId ? Number(taxId) : undefined,
        c_costcenter_id: costCenterId ? Number(costCenterId) : undefined,
        c_project_id: projectId ? Number(projectId) : undefined,
        adw_ad_user_checked_id: checkedById ? Number(checkedById) : undefined,
        checkedby_id: checkedById ? Number(checkedById) : undefined,
        adw_ad_user_approved_id: approvedById ? Number(approvedById) : undefined,
        approvedby_id: approvedById ? Number(approvedById) : undefined,
        description: description.trim(),
      };

      if (isNew) {
        const res = await orderApi.createOrder(payload, newToken);
        const newId = res.data?.id;
        setSuccessMessage('Purchase Order created successfully!');
        if (newId) {
          const encId = encryptDocumentId(String(newId));
          navigate(`/create-po?documentID=${encId}`, { replace: true });
        } else {
          navigate('/create-po', { replace: true });
        }
      } else {
        await orderApi.updateOrder(targetId, payload, newToken);
        setSuccessMessage('Purchase Order header updated successfully.');
        setTimeout(() => setSuccessMessage(null), 4000);
        const detailRes = await orderApi.getOrder(targetId);
        if (detailRes && detailRes.data) {
          applyRecordData(detailRes.data.header, detailRes.data.lines, true);
        }
      }
    } catch (retryErr) {
      console.error('Retry save failed:', retryErr);
      setError(
        retryErr.response?.data?.message ||
          retryErr.message ||
          'Failed to save purchase order after token refresh.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Refresh lines with loading effect
  const refreshOrderLines = async () => {
    if (!targetId) return;
    setLoadingLines(true);
    try {
      const res = await orderApi.getOrder(targetId);
      if (res && res.data) {
        applyRecordData(res.data.header, res.data.lines, false);
      }
    } catch (err) {
      console.error('Failed to reload lines:', err);
    } finally {
      setTimeout(() => setLoadingLines(false), 250);
    }
  };

  // Line saved callback
  const handleLineSaved = async (mode) => {
    if (!targetId) return;
    setLoadingLines(true);
    try {
      const res = await orderApi.getOrder(targetId);
      if (res && res.data) {
        applyRecordData(res.data.header, res.data.lines, false);
      }
      setSuccessMessage(
        mode === 'deleted'
          ? 'Line item removed successfully.'
          : mode === 'updated'
          ? 'Line item updated successfully.'
          : 'Line item added successfully.'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to reload lines:', err);
    } finally {
      setTimeout(() => setLoadingLines(false), 250);
    }
  };

  // Delete line
  const handleConfirmDeleteLine = async () => {
    const lineId = linePendingDelete?.c_orderline_id || linePendingDelete?.id;
    if (!targetId || !lineId) return;
    setDeletingLineId(lineId);
    try {
      await orderApi.deleteOrderLine(targetId, lineId, session?.token);
      setShowLineForm(false);
      setSelectedLineForEdit(null);
      await handleLineSaved('deleted');
      setLinePendingDelete(null);
    } catch (err) {
      console.error('Failed to delete order line:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to delete line.';
      if (
        err.response?.status === 401 ||
        errMsg.includes('401') ||
        errMsg.includes('Token has expired')
      ) {
        setLinePendingDelete(null);
        setShowReauthModal(true);
      } else {
        alert(errMsg);
      }
    } finally {
      setDeletingLineId(null);
    }
  };

  // Process Document Action (CO, VO, CL, RE)
  const handleExecuteDocAction = async (docAction) => {
    if (!targetId || !docAction) return;
    setProcessingAction(true);
    setError(null);
    try {
      await orderApi.processOrder(targetId, docAction, session?.token);
      setSuccessMessage(`Document action "${docAction}" executed successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setShowDocActionModal(false);
      setActionPendingConfirm(null);

      const detailRes = await orderApi.getOrder(targetId);
      if (detailRes && detailRes.data) {
        applyRecordData(detailRes.data.header, detailRes.data.lines, true);
      }
    } catch (err) {
      console.error('Failed to execute document action:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to execute document action.';
      if (
        err.response?.status === 401 ||
        errMsg.includes('401') ||
        errMsg.includes('Token has expired')
      ) {
        setShowReauthModal(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setProcessingAction(false);
    }
  };

  // Delete entire document
  const handleDeleteDocument = async () => {
    if (!targetId) return;
    setDeletingDoc(true);
    setError(null);
    try {
      await orderApi.deleteOrder(targetId, session?.token);
      setShowDeleteDocModal(false);
      navigate('/create-po', { replace: true });
    } catch (err) {
      console.error('Failed to delete order:', err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to delete purchase order.';
      if (
        err.response?.status === 401 ||
        errMsg.includes('401') ||
        errMsg.includes('Token has expired')
      ) {
        setShowDeleteDocModal(false);
        setShowReauthModal(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setDeletingDoc(false);
    }
  };

  // Attachments Handling
  const loadAttachments = async () => {
    if (isNew || !targetId) return;
    setLoadingAttachments(true);
    setAttachmentError(null);
    try {
      const res = await orderApi.getAttachments(targetId);
      if (res && res.data) {
        setAttachments(res.data);
        setAttachmentCount(res.data.length);
      } else {
        setAttachments([]);
        setAttachmentCount(0);
      }
    } catch (err) {
      console.error('Failed to load attachments:', err);
      setAttachmentError('Failed to load attachments.');
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !targetId) return;
    const file = files[0];

    if (isReadOnly) {
      setAttachmentError('Cannot upload attachments to a completed or read-only purchase order.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError('Security validation failed: File size exceeds the maximum allowed limit of 10MB.');
      return;
    }

    // Security validation: strictly allow only genuine PDF and Image files
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const fileExt = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

    if (!allowedExtensions.includes(fileExt) || (file.type && !allowedMimes.includes(file.type.toLowerCase()))) {
      setAttachmentError('Security validation failed: Only PDF and Image files (JPG, PNG, WEBP) are allowed.');
      return;
    }

    setUploadingAttachment(true);
    setAttachmentError(null);
    try {
      await orderApi.uploadAttachment(targetId, file, session?.token);
      setSuccessMessage(`File "${file.name}" uploaded successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadAttachments();
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to upload attachment.';
      if (errMsg.includes('401') || errMsg.includes('Token has expired')) {
        setShowReauthModal(true);
      } else {
        setAttachmentError(errMsg);
      }
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async () => {
    if (!targetId || !attachmentPendingDelete) return;
    const fileName = attachmentPendingDelete.file_name || attachmentPendingDelete.filename;
    setDeletingAttachment(true);
    try {
      await orderApi.deleteAttachment(
        targetId,
        fileName,
        session?.token
      );
      setSuccessMessage(`Attachment "${fileName}" deleted.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setAttachmentPendingDelete(null);
      await loadAttachments();
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to delete attachment.';
      if (errMsg.includes('401') || errMsg.includes('Token has expired')) {
        setShowReauthModal(true);
      } else {
        setAttachmentError(errMsg);
      }
    } finally {
      setDeletingAttachment(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 B';
    const num = Number(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatAttachmentDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  useEffect(() => {
    const isPdf =
      previewAttachment?.is_pdf ||
      (previewAttachment?.file_name || previewAttachment?.filename || '').toLowerCase().endsWith('.pdf');
    if (previewAttachment && isPdf) {
      let active = true;
      setLoadingPdf(true);
      const fileName = previewAttachment.file_name || previewAttachment.filename;
      const url = orderApi.getAttachmentDownloadUrl(targetId, fileName, false);
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          if (!active) return;
          const blobUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(blobUrl);
        })
        .catch((err) => {
          console.error('Failed to load PDF preview as blob, falling back to direct URL:', err);
          if (active) setPdfBlobUrl(url);
        })
        .finally(() => {
          if (active) setLoadingPdf(false);
        });

      return () => {
        active = false;
        setPdfBlobUrl((prev) => {
          if (prev && prev.startsWith('blob:')) {
            URL.revokeObjectURL(prev);
          }
          return null;
        });
      };
    } else {
      setPdfBlobUrl((prev) => {
        if (prev && prev.startsWith('blob:')) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
    }
  }, [previewAttachment, targetId]);

  // Tab change handler
  const handleTabChange = async (newTab) => {
    if (newTab === activeTab) {
      if (newTab === 'attachments' && !isNew && targetId) {
        setTabLoading(true);
        const startTime = Date.now();
        try {
          await loadAttachments();
        } catch (err) {
          console.error('Failed to reload attachments on tab click:', err);
        } finally {
          const elapsed = Date.now() - startTime;
          setTimeout(() => setTabLoading(false), Math.max(0, 200 - elapsed));
        }
      }
      return;
    }
    if (newTab !== 'lines') {
      setShowLineForm(false);
      setSelectedLineForEdit(null);
    }
    setActiveTab(newTab);

    if (!isNew && targetId) {
      if (newTab === 'attachments') {
        setTabLoading(true);
        const startTime = Date.now();
        try {
          await loadAttachments();
        } catch (err) {
          console.error('Failed to retrieve attachments on tab switch:', err);
        } finally {
          const elapsed = Date.now() - startTime;
          setTimeout(() => setTabLoading(false), Math.max(0, 200 - elapsed));
        }
      } else if (newTab === 'header') {
        setTabLoading(true);
        const startTime = Date.now();
        try {
          const detailRes = await orderApi.getOrder(targetId);
          if (detailRes && detailRes.data) {
            applyRecordData(detailRes.data.header, null, true);
          }
        } catch (err) {
          console.error('Failed to retrieve header details on tab switch:', err);
        } finally {
          const elapsed = Date.now() - startTime;
          setTimeout(() => setTabLoading(false), Math.max(0, 200 - elapsed));
        }
      }
      // Note: 'chat', 'requisitions', 'receipts', and 'changelog' tabs are self-contained
      // components with their own fetch lifecycle. Bypassing redundant parent fetch avoids duplicate hits.
    }
  };

  // Lines Filter, Sort, Pagination
  const filteredLines = useMemo(() => {
    if (!docLines || docLines.length === 0) return [];
    if (!lineSearch.trim()) return docLines;
    const q = lineSearch.toLowerCase().trim();
    return docLines.filter(
      (l) =>
        (l.product_value || '').toLowerCase().includes(q) ||
        (l.product_name || '').toLowerCase().includes(q) ||
        (l.description || '').toLowerCase().includes(q) ||
        String(l.line || '').includes(q) ||
        (l.uom_name || '').toLowerCase().includes(q)
    );
  }, [docLines, lineSearch]);

  const sortedLines = useMemo(() => {
    if (!filteredLines || filteredLines.length === 0) return [];
    return [...filteredLines].sort((a, b) => {
      let aVal = a[lineSortField];
      let bVal = b[lineSortField];

      if (['line', 'qtyentered', 'priceactual', 'linenetamt'].includes(lineSortField)) {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      } else {
        aVal = (aVal || '').toString().toLowerCase();
        bVal = (bVal || '').toString().toLowerCase();
      }

      if (aVal < bVal) return lineSortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return lineSortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredLines, lineSortField, lineSortDir]);

  const totalLineRows = sortedLines.length;
  const totalLinePages = Math.max(1, Math.ceil(totalLineRows / lineLimit));

  const paginatedLines = useMemo(() => {
    const start = (linePage - 1) * lineLimit;
    return sortedLines.slice(start, start + lineLimit);
  }, [sortedLines, linePage, lineLimit]);

  const getLinePageNumbers = () => {
    const pages = [];
    if (totalLinePages <= 5) {
      for (let i = 1; i <= totalLinePages; i++) pages.push(i);
    } else {
      if (linePage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalLinePages);
      } else if (linePage >= totalLinePages - 2) {
        pages.push(1, '...', totalLinePages - 3, totalLinePages - 2, totalLinePages - 1, totalLinePages);
      } else {
        pages.push(1, '...', linePage - 1, linePage, linePage + 1, '...', totalLinePages);
      }
    }
    return pages;
  };

  const handleLineSort = (field) => {
    if (lineSortField === field) {
      setLineSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setLineSortField(field);
      setLineSortDir('asc');
    }
  };

  const renderLineSortHeader = (label, field, align = 'left', customWidth = '') => {
    const isActive = lineSortField === field;
    return (
      <th
        onClick={() => handleLineSort(field)}
        className={`px-5 py-3.5 font-semibold cursor-pointer select-none transition-colors group ${customWidth} ${
          align === 'center'
            ? 'text-center'
            : align === 'right'
            ? 'text-right'
            : 'text-left'
        } ${
          isActive
            ? isDark
              ? 'text-cyan-400 bg-cyan-950/20'
              : 'text-indigo-600 bg-indigo-50/50'
            : isDark
            ? 'hover:text-slate-200'
            : 'hover:text-slate-800'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 w-full ${
            align === 'center'
              ? 'justify-center text-center'
              : align === 'right'
              ? 'justify-end text-right'
              : 'justify-start text-left'
          }`}
        >
          <span>{label}</span>
          {isActive ? (
            lineSortDir === 'asc' ? (
              <ArrowUp className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            )
          ) : (
            <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-30 group-hover:opacity-100 transition-opacity flex-shrink-0" />
          )}
        </div>
      </th>
    );
  };

  const selectedOrg = orgOptions.find((o) => o.value === Number(orgId)) || null;
  const selectedWh = filteredWarehouses.find((w) => w.id === Number(warehouseId)) || null;
  const selectedVendor = vendorOptions.find((v) => Number(v.id) === Number(vendorId)) || null;
  const selectedContact = vendorContacts.find((c) => Number(c.id) === Number(vendorContactId)) || null;

  return (
    <ModuleLayout
      pageTitle={isNew ? 'Create Purchase Order' : `Order ${displayDocNo}`}
      rootMenuId={1000000}
      rootMenuName="Procurement"
    >
      {loading ? (
        <PageLoader
          message="Loading Purchase Order Details..."
          subtext="Authenticating record and master options from Enterprise Core"
        />
      ) : invalidToken ? (
        <InvalidDocumentState
          moduleName="Purchase Order"
          backUrl="/create-po"
          backLabel="Back to Purchase Order List"
          createUrl="/create-po/new"
          createLabel="Create New PO"
          rawToken={rawParam}
        />
      ) : (
        <div className="space-y-6 animate-fadeIn w-full min-w-0">
          {/* Top Header / Breadcrumb */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1
                  className={`text-xl sm:text-2xl font-bold tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {isNew ? 'New Purchase Order' : displayDocNo}
                </h1>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                  {!isNew && (
                    <>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        {displayStatus}
                      </span>
                      <span className="hidden sm:inline">•</span>
                    </>
                  )}
                  <span className="hidden sm:inline">
                    {isNew
                      ? 'Create a new purchase order details'
                      : 'Manage purchase order header, lines, and linked records'}
                  </span>
                </p>
              </div>
            </div>

            {/* Top Right Action Icons Bar */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
              {/* Back to List */}
              <button
                type="button"
                onClick={() => navigate('/create-po')}
                disabled={submitting || processingAction || deletingDoc}
                title={isNew ? 'Cancel & Back to List' : 'Back to Order List'}
                aria-label="Back to List"
                className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center justify-center ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Save Changes / Create Order */}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || processingAction || deletingDoc}
                  title={isNew ? 'Create Purchase Order' : 'Save Changes'}
                  aria-label={isNew ? 'Create Purchase Order' : 'Save Changes'}
                  className="p-2.5 rounded-xl text-white bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Document Action (Gear Icon) */}
              {!isNew && (
                <button
                  type="button"
                  onClick={() => {
                    setActionPendingConfirm(null);
                    setShowDocActionModal(true);
                  }}
                  disabled={submitting || processingAction || deletingDoc}
                  title="Document Action"
                  aria-label="Document Action"
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center justify-center ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:text-cyan-600 hover:bg-slate-50'
                  }`}
                >
                  {processingAction ? (
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  ) : (
                    <Settings className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Print Document (Printer Icon) */}
              {!isNew && (
                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  disabled={submitting || processingAction || deletingDoc}
                  title="Print Document"
                  aria-label="Print Document"
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center justify-center ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-indigo-400 hover:bg-slate-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
                  }`}
                >
                  <Printer className="w-4 h-4" />
                </button>
              )}

              {/* Delete Document (Trash Icon) */}
              {!isNew && !isReadOnly && (
                <button
                  type="button"
                  onClick={() => setShowDeleteDocModal(true)}
                  disabled={submitting || processingAction || deletingDoc}
                  title="Delete Order Document"
                  aria-label="Delete Order Document"
                  className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all cursor-pointer shadow-sm flex items-center justify-center"
                >
                  {deletingDoc ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 dark:text-emerald-400 text-xs font-mono flex items-center gap-3">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono flex items-center gap-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Card with Tabs */}
          <div
            className={`rounded-2xl border shadow-sm overflow-hidden ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* Tabs Header */}
            <div
              className={`border-b px-4 sm:px-8 ${
                isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-white'
              }`}
            >
              <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                <button
                  type="button"
                  onClick={() => handleTabChange('header')}
                  title="Header Details"
                  className={`whitespace-nowrap py-3.5 px-1 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors cursor-pointer ${
                    activeTab === 'header'
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Header Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => !isNew && handleTabChange('lines')}
                  disabled={isNew}
                  title="Order Lines"
                  className={`whitespace-nowrap py-3.5 px-1 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${
                    isNew
                      ? 'border-transparent text-slate-500 cursor-not-allowed opacity-50'
                      : activeTab === 'lines'
                      ? 'border-cyan-400 text-cyan-400 cursor-pointer'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                >
                  <List className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Order Lines</span>
                  {!isNew && totalLineCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {totalLineCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => !isNew && handleTabChange('requisitions')}
                  disabled={isNew}
                  title="Requisitions"
                  className={`whitespace-nowrap py-3.5 px-1 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${
                    isNew
                      ? 'border-transparent text-slate-500 cursor-not-allowed opacity-50'
                      : activeTab === 'requisitions'
                      ? 'border-cyan-400 text-cyan-400 cursor-pointer'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Requisitions</span>
                  {!isNew && requisitionCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {requisitionCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => !isNew && handleTabChange('receipts')}
                  disabled={isNew}
                  title="Receipts"
                  className={`whitespace-nowrap py-3.5 px-1 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${
                    isNew
                      ? 'border-transparent text-slate-500 cursor-not-allowed opacity-50'
                      : activeTab === 'receipts'
                      ? 'border-cyan-400 text-cyan-400 cursor-pointer'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                >
                  <PackageCheck className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Receipts</span>
                  {!isNew && receiptCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {receiptCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => !isNew && handleTabChange('attachments')}
                  disabled={isNew}
                  title="Attachments"
                  className={`whitespace-nowrap py-3.5 px-1 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${
                    isNew
                      ? 'border-transparent text-slate-500 cursor-not-allowed opacity-50'
                      : activeTab === 'attachments'
                      ? 'border-cyan-400 text-cyan-400 cursor-pointer'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                >
                  <Paperclip className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Attachments</span>
                  {!isNew && totalAttachmentCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {totalAttachmentCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => !isNew && handleTabChange('chat')}
                  disabled={isNew}
                  title="Chat"
                  className={`whitespace-nowrap py-3.5 px-1 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${
                    isNew
                      ? 'border-transparent text-slate-500 cursor-not-allowed opacity-50'
                      : activeTab === 'chat'
                      ? 'border-cyan-400 text-cyan-400 cursor-pointer'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Discussions</span>
                  {!isNew && chatCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {chatCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => !isNew && handleTabChange('changelog')}
                  disabled={isNew}
                  title="Change Log"
                  className={`whitespace-nowrap py-3.5 px-1 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${
                    isNew
                      ? 'border-transparent text-slate-500 cursor-not-allowed opacity-50'
                      : activeTab === 'changelog'
                      ? 'border-cyan-400 text-cyan-400 cursor-pointer'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                >
                  <History className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Audit Logs</span>
                  {!isNew && changeLogCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {changeLogCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Tab Loading Overlay */}
            {tabLoading && (
              <div className="p-12 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
                <p className="text-xs font-mono text-slate-400">Refreshing tab contents...</p>
              </div>
            )}

            {/* TAB CONTENT: HEADER */}
            {!tabLoading && activeTab === 'header' && (
              <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
                {/* Section 1: General Information */}
                <div>
                  <h3
                    className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center mb-2.5 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    <span className="w-1 h-5 bg-cyan-400 rounded mr-3 inline-block" />
                    General Information
                  </h3>

                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 p-5 rounded-xl border shadow-sm ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Left Column */}
                    <div className="space-y-2.5">
                      {/* Client */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Client <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <input
                            type="text"
                            value={clientDisplayName}
                            readOnly
                            className={`w-full h-[38px] px-3.5 text-xs font-mono border rounded-lg cursor-not-allowed transition-colors ${
                              isDark
                                ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Document No */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Document No
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={displayDocNo}
                              readOnly
                              className={`w-full h-[38px] pl-10 pr-3.5 text-xs font-mono font-bold border rounded-lg cursor-default ${
                                isDark
                                  ? 'bg-slate-950/70 border-slate-800 text-slate-200'
                                  : 'bg-slate-50 border-slate-200 text-slate-800'
                              }`}
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FileText className="h-4 w-4 text-slate-400" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Target Doc Type */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Target Doc Type <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              options?.doctypes
                                ?.map((dt) => ({ value: dt.id, label: dt.label || dt.text || dt.name }))
                                .find((dt) => Number(dt.value) === Number(docTypeTargetId)) ||
                              (docTypeTargetId ? { value: docTypeTargetId, label: `Doc Type (${docTypeTargetId})` } : null)
                            }
                            onChange={(opt) => setDocTypeTargetId(opt ? opt.value : '')}
                            options={options?.doctypes?.map((dt) => ({ value: dt.id, label: dt.label || dt.text || dt.name })) || []}
                            styles={formSelectStyles}
                            placeholder="- Select Doc Type -"
                            isDisabled={true}
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Cost Center */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Cost Center
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              options?.costCenters
                                ?.map((cc) => ({ value: cc.id, label: cc.label || cc.text || `${cc.name} (${cc.value})` }))
                                .find((cc) => Number(cc.value) === Number(costCenterId)) || null
                            }
                            onChange={(opt) => setCostCenterId(opt ? opt.value : '')}
                            options={options?.costCenters?.map((cc) => ({ value: cc.id, label: cc.label || cc.text || `${cc.name} (${cc.value})` })) || []}
                            styles={formSelectStyles}
                            placeholder="- Select Cost Center -"
                            isDisabled={isReadOnly || hasLines}
                            isClearable
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Project */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Project
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              options?.projects
                                ?.map((p) => ({ value: p.id, label: p.label || p.text || `${p.name} (${p.value})` }))
                                .find((p) => Number(p.value) === Number(projectId)) || null
                            }
                            onChange={(opt) => setProjectId(opt ? opt.value : '')}
                            options={options?.projects?.map((p) => ({ value: p.id, label: p.label || p.text || `${p.name} (${p.value})` })) || []}
                            styles={formSelectStyles}
                            placeholder="- Select Project -"
                            isDisabled={isReadOnly}
                            isClearable
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Description */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-start gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mt-2">
                          Description
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <textarea
                            rows={4}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            readOnly={isReadOnly}
                            placeholder="Enter purchase order description..."
                            className={`w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border outline-none resize-none transition-colors ${
                              isReadOnly
                                ? isDark
                                  ? 'bg-slate-950/70 border-slate-800 text-slate-300 cursor-not-allowed'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 cursor-not-allowed'
                                : isDark
                                ? 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20'
                                : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-2.5">
                      {/* Organization */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Organization <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={selectedOrg}
                            onChange={(opt) => setOrgId(opt ? opt.value : '')}
                            options={orgOptions}
                            styles={formSelectStyles}
                            placeholder="- Select Organization -"
                            isDisabled={isReadOnly || hasLines || !isNew}
                            isSearchable
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Vendor / Supplier */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Vendor <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              selectedVendor
                                ? {
                                    value: selectedVendor.id,
                                    label:
                                      selectedVendor.label ||
                                      selectedVendor.text ||
                                      `${selectedVendor.name || ''}${
                                        selectedVendor.value ? ` (${selectedVendor.value})` : ''
                                      }` ||
                                      'Vendor',
                                  }
                                : null
                            }
                            onChange={(opt) => {
                              setVendorId(opt ? opt.value : '');
                              setVendorContactId('');
                            }}
                            onInputChange={handleVendorSearch}
                            options={vendorOptions.map((v) => ({
                              value: v.id,
                              label:
                                v.label ||
                                v.text ||
                                `${v.name || ''}${v.value ? ` (${v.value})` : ''}` ||
                                'Vendor',
                            }))}
                            styles={formSelectStyles}
                            placeholder="- Search Vendor / Supplier -"
                            isDisabled={isReadOnly}
                            isSearchable
                            isLoading={loadingVendors}
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Contact Person */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Contact Person
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              selectedContact
                                ? { value: selectedContact.id, label: `${selectedContact.name}${selectedContact.phone ? ` - ${selectedContact.phone}` : ''}` }
                                : null
                            }
                            onChange={(opt) => setVendorContactId(opt ? opt.value : '')}
                            options={vendorContacts.map((c) => ({
                              value: c.id,
                              label: `${c.name}${c.phone ? ` - ${c.phone}` : ''}`,
                            }))}
                            styles={formSelectStyles}
                            placeholder={vendorId ? '- Select Contact Person -' : 'Select Vendor first'}
                            isDisabled={isReadOnly || !vendorId}
                            isLoading={loadingContacts}
                            isSearchable
                            isClearable
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Date Ordered */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Date Ordered <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <CustomDatePicker
                            value={dateOrdered}
                            onChange={setDateOrdered}
                            placeholder="Select Date"
                            isDark={isDark}
                            disabled={isReadOnly}
                            required
                          />
                        </div>
                      </div>

                      {/* Date Promised */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Date Promised
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <CustomDatePicker
                            value={datePromised}
                            onChange={setDatePromised}
                            placeholder="Select Date"
                            isDark={isDark}
                            disabled={isReadOnly}
                          />
                        </div>
                      </div>

                      {/* Priority */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Priority
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              options?.priorities
                                ?.map((p) => ({ value: String(p.id || p.value), label: p.label || p.text || p.name }))
                                .find((p) => p.value === String(priorityRule)) || null
                            }
                            onChange={(opt) => setPriorityRule(opt ? opt.value : '5')}
                            options={
                              options?.priorities?.map((p) => ({ value: String(p.id || p.value), label: p.label || p.text || p.name })) || [
                                { value: '3', label: 'High' },
                                { value: '5', label: 'Medium' },
                                { value: '7', label: 'Low' },
                              ]
                            }
                            styles={formSelectStyles}
                            isDisabled={isReadOnly}
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Purchase Tax */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Purchase Tax <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              options?.taxes
                                ?.map((t) => ({ value: t.id, label: t.label || t.name, rate: t.rate }))
                                .find((t) => Number(t.value) === Number(taxId)) || null
                            }
                            onChange={(opt) => setTaxId(opt ? opt.value : '')}
                            options={options?.taxes?.map((t) => ({ value: t.id, label: t.label || t.name, rate: t.rate })) || []}
                            styles={formSelectStyles}
                            placeholder="- Select Purchase Tax -"
                            isDisabled={isReadOnly || hasLines}
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                          {hasLines && (
                            <p className="text-[11px] font-mono text-amber-500/90 mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              Tax cannot be changed when order lines exist
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Order Details */}
                <div>
                  <h3
                    className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center mb-2.5 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    <span className="w-1 h-5 bg-blue-500 rounded mr-3 inline-block" />
                    Order Details
                  </h3>

                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 p-5 rounded-xl border shadow-sm ${
                      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Left Column */}
                    <div className="space-y-2.5">
                      {/* Warehouse */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Warehouse <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              selectedWh
                                ? { value: selectedWh.id, label: selectedWh.label || selectedWh.name || selectedWh.text }
                                : null
                            }
                            onChange={(opt) => setWarehouseId(opt ? opt.value : '')}
                            options={filteredWarehouses.map((w) => ({
                              value: w.id,
                              label: w.label || w.name || w.text,
                            }))}
                            styles={formSelectStyles}
                            placeholder="- Select Warehouse -"
                            isDisabled={isReadOnly}
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Price List */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Price List <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              options?.pricelists
                                ?.map((pl) => ({ value: pl.id, label: pl.label || pl.text || pl.name }))
                                .find((pl) => Number(pl.value) === Number(pricelistId)) || null
                            }
                            onChange={(opt) => setPricelistId(opt ? opt.value : '')}
                            options={options?.pricelists?.map((pl) => ({ value: pl.id, label: pl.label || pl.text || pl.name })) || []}
                            styles={formSelectStyles}
                            placeholder="- Select Price List -"
                            isDisabled={isReadOnly}
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Payment Term */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Payment Term
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              options?.paymentTerms
                                ?.map((pt) => ({ value: pt.id, label: pt.label || pt.text || pt.name }))
                                .find((pt) => Number(pt.value) === Number(paymentTermId)) || null
                            }
                            onChange={(opt) => setPaymentTermId(opt ? opt.value : '')}
                            options={options?.paymentTerms?.map((pt) => ({ value: pt.id, label: pt.label || pt.text || pt.name })) || []}
                            styles={formSelectStyles}
                            placeholder="- Select Payment Term -"
                            isDisabled={isReadOnly}
                            isClearable
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Checked By */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Checked By <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              options?.users
                                ?.map((u) => ({ value: u.id, label: u.label || u.text || u.name }))
                                .find((u) => Number(u.value) === Number(checkedById)) || null
                            }
                            onChange={(opt) => setCheckedById(opt ? opt.value : '')}
                            options={options?.users?.map((u) => ({ value: u.id, label: u.label || u.text || u.name })) || []}
                            styles={formSelectStyles}
                            placeholder="- Select -"
                            isDisabled={isReadOnly}
                            isClearable
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Approved By */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Approved By <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={
                              options?.users
                                ?.map((u) => ({ value: u.id, label: u.label || u.text || u.name }))
                                .find((u) => Number(u.value) === Number(approvedById)) || null
                            }
                            onChange={(opt) => setApprovedById(opt ? opt.value : '')}
                            options={options?.users?.map((u) => ({ value: u.id, label: u.label || u.text || u.name })) || []}
                            styles={formSelectStyles}
                            placeholder="- Select -"
                            isDisabled={isReadOnly}
                            isClearable
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-2.5">
                      {/* Total Amount */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Total Amount
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <input
                            type="text"
                            value={formatCurrency(docHeader?.totallines || 0)}
                            readOnly
                            className={`w-full h-[38px] px-3.5 text-xs font-mono font-medium text-right border rounded-lg cursor-not-allowed transition-colors ${
                              isDark
                                ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Total Tax Amount */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Total Tax Amount
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <input
                            type="text"
                            value={formatCurrency(
                              docHeader?.taxamt !== undefined && docHeader?.taxamt !== null
                                ? docHeader.taxamt
                                : (Number(docHeader?.grandtotal) || 0) - (Number(docHeader?.totallines) || 0)
                            )}
                            readOnly
                            className={`w-full h-[38px] px-3.5 text-xs font-mono font-medium text-right border rounded-lg cursor-not-allowed transition-colors ${
                              isDark
                                ? 'bg-slate-950/70 border-slate-800 text-slate-300'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                            }`}
                          />
                        </div>
                      </div>

                      {/* PPh 23 (Withholding Tax) - Shown only when withholdingTotal > 0 */}
                      {withholdingTotal > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4 transition-all duration-200">
                          <label className="text-left sm:text-right text-xs font-mono font-semibold text-amber-500 dark:text-amber-400">
                            PPh 23
                          </label>
                          <div className="col-span-1 sm:col-span-2">
                            <input
                              type="text"
                              value={`(${formatCurrency(withholdingTotal)})`}
                              readOnly
                              className={`w-full h-[38px] px-3.5 text-xs font-mono font-semibold text-right border rounded-lg cursor-not-allowed transition-colors ${
                                isDark
                                  ? 'bg-slate-950/70 border-slate-800 text-amber-400'
                                  : 'bg-slate-50 border-slate-200 text-amber-600'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {/* Grand Total Amount */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label
                          className={`text-left sm:text-right text-xs font-mono font-bold ${
                            isDark ? 'text-slate-100' : 'text-slate-900'
                          }`}
                        >
                          Grand Total Amount
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <input
                            type="text"
                            value={formatCurrency(
                              Math.max(
                                0,
                                (Number(docHeader?.grandtotal) || 0) - withholdingTotal
                              )
                            )}
                            readOnly
                            className={`w-full h-[38px] px-3.5 text-xs font-mono font-bold text-right border rounded-lg cursor-not-allowed transition-colors ${
                              isDark
                                ? 'bg-slate-950/70 border-slate-800 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Status
                        </label>
                        <div className="col-span-1 sm:col-span-2 flex items-center h-[38px]">
                          <span
                            className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-mono font-bold ${
                              ['NA', 'VO', 'RE'].includes(currentDocStatus)
                                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                : ['CO', 'CL', 'AP'].includes(currentDocStatus)
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : currentDocStatus === 'IP'
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : currentDocStatus === 'DR'
                                ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                                : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {displayStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* TAB CONTENT: LINES */}
            {!tabLoading && activeTab === 'lines' && (
              <div className="p-6 sm:p-8 space-y-5 w-full">
                {showLineForm ? (
                  <OrderLineForm
                    isEdit={Boolean(selectedLineForEdit)}
                    lineData={selectedLineForEdit}
                    orderId={targetId}
                    clientId={clientId}
                    costCenterId={costCenterId}
                    costCenters={options?.costCenters || []}
                    headerTaxId={taxId}
                    taxes={options?.taxes || []}
                    pricePrecision={activePricePrecision}
                    currencySymbol={activeCurrencySymbol}
                    session={session}
                    isDark={isDark}
                    onCancel={() => {
                      setShowLineForm(false);
                      setSelectedLineForEdit(null);
                      refreshOrderLines();
                    }}
                    onSuccess={(mode) => {
                      setShowLineForm(false);
                      setSelectedLineForEdit(null);
                      handleLineSaved(mode);
                    }}
                    onIntermediateSaved={(mode) => {
                      handleLineSaved(mode);
                    }}
                    onTokenExpired={() => {
                      setShowLineForm(false);
                      setShowReauthModal(true);
                    }}
                  />
                ) : (
                  <>
                    {/* Lines Action Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
                          <List className="w-4 h-4" />
                        </div>
                        <div>
                          <h3
                            className={`text-sm sm:text-base font-bold tracking-tight font-mono ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}
                          >
                            Order Line Items ({totalLineCount})
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                        {/* Line Search */}
                        <div className="relative w-full sm:w-64">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={lineSearch}
                            onChange={(e) => {
                              setLineSearch(e.target.value);
                              setLinePage(1);
                            }}
                            placeholder="Search lines..."
                            className={`w-full h-[38px] pl-9 pr-7 rounded-xl text-xs font-mono border outline-none transition ${
                              isDark
                                ? 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60'
                                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
                            }`}
                          />
                          {lineSearch && (
                            <button
                              type="button"
                              onClick={() => {
                                setLineSearch('');
                                setLinePage(1);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
                            >
                              ×
                            </button>
                          )}
                        </div>

                        {!isReadOnly && !isNew && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedLineForEdit(null);
                                setShowLineForm(true);
                              }}
                              title="Add Line Item"
                              aria-label="Add Line Item"
                              className="h-[38px] w-[38px] rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-md shadow-indigo-500/20 transition cursor-pointer flex items-center justify-center flex-shrink-0"
                            >
                              <Plus className="w-4 h-4 flex-shrink-0" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                {/* Lines Table Container */}
                <div
                  className={`rounded-xl border transition-all duration-300 overflow-hidden w-full min-w-0 max-w-full ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  {/* Mobile Lines Card View (Visible only on < md screens) */}
                  <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800/40">
                    {loadingLines ? (
                      <div className="p-8 text-center font-mono text-slate-400 space-y-2">
                        <Loader2 className="w-8 h-8 mx-auto animate-spin text-cyan-400" />
                        <p className="text-xs">Loading order line items...</p>
                      </div>
                    ) : paginatedLines.length === 0 ? (
                      <div className="p-8 text-center font-mono text-slate-400 space-y-2">
                        <Package className="w-8 h-8 mx-auto opacity-30 text-slate-400" />
                        <p className="text-xs">
                          {docLines.length === 0
                            ? 'No purchase order lines found.'
                            : 'No matching line items found for your search.'}
                        </p>
                      </div>
                    ) : (
                      paginatedLines.map((line, idx) => (
                        <div
                          key={line.c_orderline_id || line.id || idx}
                          className={`p-4 transition-colors space-y-3 ${
                            isDark ? 'bg-slate-900/30 hover:bg-slate-900/70' : 'bg-white hover:bg-slate-50/80'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold flex-shrink-0">
                                #{line.line || idx + 1}
                              </span>
                              <span className="font-mono text-xs font-semibold text-slate-400 truncate">
                                {line.product_value || 'Item'}
                              </span>
                            </div>

                            {!isReadOnly && (
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLineForEdit(line);
                                    setShowLineForm(true);
                                  }}
                                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                    isDark
                                      ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                                      : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-200 shadow-sm'
                                  }`}
                                  title="Edit Line"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLinePendingDelete(line)}
                                  className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                                  title="Delete Line"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Product / Charge Name */}
                          <div>
                            <h4
                              onClick={() => {
                                if (!isReadOnly) {
                                  setSelectedLineForEdit(line);
                                  setShowLineForm(true);
                                }
                              }}
                              className={`text-xs sm:text-sm font-mono font-bold leading-tight ${
                                !isReadOnly ? 'cursor-pointer hover:underline text-cyan-400' : isDark ? 'text-slate-100' : 'text-slate-900'
                              }`}
                            >
                              {line.product_name || line.charge_name || 'Line Item'}
                            </h4>
                            {line.description && (
                              <p className="text-[11px] font-mono text-slate-400 mt-1 line-clamp-2">
                                {line.description}
                              </p>
                            )}
                            {line.m_requisitionline_id && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                                Linked PR #{line.m_requisitionline_id}
                              </span>
                            )}
                          </div>

                          {/* Key Metrics Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                            {/* Qty & UoM */}
                            <div
                              className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-white border-slate-200'
                              }`}
                            >
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                Quantity
                              </span>
                              <span className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {Number(line.qty ?? line.qtyentered ?? line.qtyordered ?? 0).toLocaleString('en-US', {
                                  minimumFractionDigits: line.uom_precision ?? 0,
                                  maximumFractionDigits: line.uom_precision ?? 0,
                                })}{' '}
                                <span className="text-cyan-400 font-semibold">{line.uom_symbol || line.uom_name || ''}</span>
                              </span>
                            </div>

                            {/* Unit Price */}
                            <div
                              className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-white border-slate-200'
                              }`}
                            >
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                Unit Price
                              </span>
                              <span className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                                {formatCurrency(line.priceactual || line.priceentered)}
                              </span>
                            </div>

                            {/* Line Total */}
                            <div
                              className={`col-span-2 sm:col-span-1 p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                                isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-white border-slate-200'
                              }`}
                            >
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                Line Total
                              </span>
                              <span className="font-bold text-xs text-emerald-400">
                                {formatCurrency(line.linenetamt || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Desktop / Tablet Table View (Visible only on md+ screens) */}
                  <div className="hidden md:block overflow-x-auto w-full max-w-full touch-pan-x">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead>
                        <tr
                          className={`border-b text-[10px] font-mono uppercase tracking-wider font-semibold ${
                            isDark
                              ? 'border-slate-800 text-slate-400 bg-slate-950/40'
                              : 'border-slate-200 text-slate-500 bg-slate-50/70'
                          }`}
                        >
                          {!isReadOnly && (
                            <th className="px-5 py-3.5 font-semibold text-center w-16">
                              Action
                            </th>
                          )}
                          {renderLineSortHeader('Line', 'line', 'center', 'w-16')}
                          {renderLineSortHeader('Product / Description', 'product_name')}
                          {renderLineSortHeader('Qty', 'qtyentered', 'right', 'w-24')}
                          <th className="px-5 py-3.5 font-semibold text-center w-16">UOM</th>
                          {renderLineSortHeader('Unit Price', 'priceactual', 'right', 'w-32')}
                          {renderLineSortHeader('Disc', 'discount', 'center', 'w-16')}
                          <th className="px-5 py-3.5 font-semibold text-center w-20">PPh 23</th>
                          {renderLineSortHeader('Total', 'linenetamt', 'right', 'w-36')}
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                        {loadingLines ? (
                          <tr>
                            <td
                              colSpan={isReadOnly ? 8 : 9}
                              className="py-16 text-center font-mono text-slate-400"
                            >
                              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-cyan-400" />
                              Loading order line items...
                            </td>
                          </tr>
                        ) : paginatedLines.length > 0 ? (
                          paginatedLines.map((line, idx) => (
                            <tr
                              key={line.c_orderline_id || line.id || idx}
                              onClick={() => {
                                if (!isReadOnly) {
                                  setSelectedLineForEdit(line);
                                  setShowLineForm(true);
                                }
                              }}
                              title={!isReadOnly ? 'Click to edit line' : undefined}
                              className={`transition-colors ${
                                !isReadOnly ? 'cursor-pointer' : ''
                              } ${
                                isDark
                                  ? 'hover:bg-slate-800/60'
                                  : 'hover:bg-[rgb(238_242_255_/_0.7)]'
                              }`}
                            >
                              {!isReadOnly && (
                                <td
                                  className="px-5 py-2 text-center whitespace-nowrap"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedLineForEdit(line);
                                        setShowLineForm(true);
                                      }}
                                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                        isDark
                                          ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                                          : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-200 shadow-xs'
                                      }`}
                                      title="Edit Line"
                                    >
                                      <Settings className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setLinePendingDelete(line)}
                                      className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                                      title="Delete Line"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              )}
                              <td
                                className={`px-5 py-2 font-mono text-[10px] text-center ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {line.line || idx + 1}
                              </td>
                              <td
                                className={`px-5 py-2 font-mono text-[10px] ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{line.product_name || line.charge_name || 'Item'}</span>
                                  {line.m_requisitionline_id ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-mono font-bold flex-shrink-0">
                                      PR #{line.requisition_documentno || line.m_requisitionline_id}
                                    </span>
                                  ) : null}
                                </div>
                                {line.product_value && (
                                  <span className="text-[10px] text-slate-400 block font-mono">
                                    {line.product_value}
                                  </span>
                                )}
                                {line.description && (
                                  <div className="text-[10px] text-slate-500 italic mt-0.5">
                                    {line.description}
                                  </div>
                                )}
                              </td>
                              <td
                                className={`px-5 py-2 text-right font-mono text-[10px] ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {Number(line.qty ?? line.qtyentered ?? line.qtyordered ?? 0).toLocaleString('en-US', {
                                  minimumFractionDigits: line.uom_precision ?? 0,
                                  maximumFractionDigits: line.uom_precision ?? 0,
                                })}
                              </td>
                              <td
                                className={`px-5 py-2 font-mono text-[10px] text-center ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {line.uom_symbol || line.uom_name || '-'}
                              </td>
                              <td
                                className={`px-5 py-2 text-right font-mono text-[10px] ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {formatCurrency(line.priceactual || line.priceentered)}
                              </td>
                              <td
                                className={`px-5 py-2 font-mono text-[10px] text-center ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {line.discount ? `${Number(line.discount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%` : '-'}
                              </td>
                              <td
                                className={`px-5 py-2 font-mono text-[10px] text-center ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {line.is_withholding || line.adw_iswithholding === 'Y' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    {line.withholding_rate || line.adw_withholdingrate || 2}%
                                  </span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td
                                className={`px-5 py-2 text-right font-mono text-[10px] ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {formatCurrency(line.linenetamt)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={isReadOnly ? 8 : 9} className="py-12 text-center text-slate-500 font-mono">
                              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <span>No line items found.</span>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Lines Pagination */}
                  <div
                    className={`px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs ${
                      isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    <div>
                      Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalLineRows === 0 ? 0 : (linePage - 1) * lineLimit + 1}</strong> to{' '}
                      <strong className={isDark ? 'text-white' : 'text-slate-900'}>{Math.min(linePage * lineLimit, totalLineRows)}</strong> of{' '}
                      <strong className={isDark ? 'text-white' : 'text-slate-900'}>{totalLineRows}</strong> lines
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setLinePage((p) => Math.max(1, p - 1))}
                        disabled={linePage <= 1}
                        className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-30 ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {getLinePageNumbers().map((p, idx) =>
                        p === '...' ? (
                          <span key={`ldots-${idx}`} className="px-2 py-1 text-slate-500">
                            ...
                          </span>
                        ) : (
                          <button
                            key={`lpage-${p}`}
                            type="button"
                            onClick={() => setLinePage(p)}
                            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                              linePage === p
                                ? 'bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-sm'
                                : isDark
                                ? 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => setLinePage((p) => Math.min(totalLinePages, p + 1))}
                        disabled={linePage >= totalLinePages}
                        className={`p-1.5 rounded-lg border text-xs transition cursor-pointer disabled:opacity-30 ${
                          isDark
                            ? 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
                  </>
                )}
              </div>
            )}

            {/* TAB CONTENT: REQUISITIONS */}
            {!tabLoading && activeTab === 'requisitions' && !isNew && (
              <div className="p-6 sm:p-8">
                <LinkedRequisitionsTab
                  orderId={targetId}
                  isDark={isDark}
                  onTotalCountChange={setRequisitionCount}
                />
              </div>
            )}

            {/* TAB CONTENT: RECEIPTS */}
            {!tabLoading && activeTab === 'receipts' && !isNew && (
              <div className="p-6 sm:p-8">
                <LinkedReceiptsTab
                  orderId={targetId}
                  isDark={isDark}
                  onTotalCountChange={setReceiptCount}
                />
              </div>
            )}

            {/* TAB CONTENT: ATTACHMENTS */}
            {!tabLoading && activeTab === 'attachments' && !isNew && (
              <div className="p-6 sm:p-8 space-y-4">
                <div
                  className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl border ${
                    isDark
                      ? 'bg-slate-950/40 border-slate-800'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div>
                    <h4
                      className={`text-xs font-mono font-bold uppercase tracking-wider ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      Document Attachments ({totalAttachmentCount})
                    </h4>
                    <p
                      className={`text-[11px] font-mono mt-0.5 ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Upload specifications, quotes, or contracts (max 10MB)
                    </p>
                  </div>

                  {!isReadOnly && (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAttachment}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-mono font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
                      >
                        {uploadingAttachment ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Upload File</span>
                      </button>
                    </div>
                  )}
                </div>

                {attachmentError && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-mono">
                    {attachmentError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {loadingAttachments ? (
                    <div className="col-span-full py-12 text-center text-slate-400 font-mono">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                      <span>Loading attachments...</span>
                    </div>
                  ) : attachments.length === 0 ? (
                    <div
                      className={`col-span-full py-12 text-center font-mono border rounded-xl ${
                        isDark
                          ? 'border-slate-800 text-slate-500 bg-slate-900/30'
                          : 'border-slate-200 text-slate-500 bg-white'
                      }`}
                    >
                      <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <span>No attachments found for this purchase order.</span>
                    </div>
                  ) : (
                    attachments.map((att, idx) => {
                      const fileName = att.file_name || att.filename || 'Attachment';
                      const fileSize = att.file_size || att.filesize || 0;
                      const isPdf = att.is_pdf || fileName.toLowerCase().endsWith('.pdf');
                      const isImg =
                        att.is_image ||
                        ['.jpg', '.jpeg', '.png', '.webp', '.gif'].some((ext) =>
                          fileName.toLowerCase().endsWith(ext)
                        );
                      const createdAt = att.created_at || att.created;

                      return (
                        <div
                          key={att.id || att.attachment_id || idx}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 font-mono transition-all ${
                            isDark
                              ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          {/* File Icon & Info */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                isPdf
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : isImg
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}
                            >
                              {isPdf ? (
                                <FileText className="w-5 h-5" />
                              ) : isImg ? (
                                <Image className="w-5 h-5" />
                              ) : (
                                <File className="w-5 h-5" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs font-bold truncate ${
                                  isDark ? 'text-slate-200' : 'text-slate-800'
                                }`}
                                title={fileName}
                              >
                                {fileName}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span className="font-semibold text-slate-400 dark:text-slate-500">
                                  {formatFileSize(fileSize)}
                                </span>
                                {createdAt && (
                                  <>
                                    <span>•</span>
                                    <span>{formatAttachmentDate(createdAt)}</span>
                                  </>
                                )}
                                {isPdf && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                    PDF
                                  </span>
                                )}
                                {isImg && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                    IMAGE
                                  </span>
                                )}
                              </div>
                              {att.description && (
                                <p className="text-[10px] text-slate-500 italic truncate mt-0.5">
                                  {att.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions: Preview, Download, Delete */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Preview button with Eye icon */}
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              className={`p-2 rounded-lg border transition cursor-pointer ${
                                isDark
                                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-cyan-400'
                                  : 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-cyan-600'
                              }`}
                              title="Preview Attachment"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Download button */}
                            <button
                              type="button"
                              onClick={() => orderApi.downloadAttachment(targetId, fileName)}
                              className={`p-2 rounded-lg border transition cursor-pointer ${
                                isDark
                                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white'
                                  : 'border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                              }`}
                              title="Download Attachment"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => setAttachmentPendingDelete(att)}
                                className="p-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                                title="Delete Attachment"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: CHAT */}
            {!tabLoading && activeTab === 'chat' && !isNew && (
              <OrderChatTab
                orderId={targetId}
                displayDocNo={docHeader?.documentno}
                isReadOnly={isReadOnly}
                session={session}
                isDark={isDark}
                onTokenExpired={() => setShowReauthModal(true)}
                onChatCountChange={(count) => setChatCount(count)}
              />
            )}

            {/* TAB CONTENT: CHANGELOG */}
            {!tabLoading && activeTab === 'changelog' && !isNew && (
              <div className="p-6 sm:p-8">
                <OrderChangeLogTab
                  orderId={targetId}
                  isDark={isDark}
                  onTotalLogsChange={setChangeLogCount}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Line Modal */}
      <ConfirmDeleteModal
        isOpen={!!linePendingDelete}
        onClose={() => setLinePendingDelete(null)}
        onConfirm={handleConfirmDeleteLine}
        title="Remove Order Line Item"
        message={`Are you sure you want to delete line #${linePendingDelete?.line} (${linePendingDelete?.product_name || linePendingDelete?.charge_name || 'Item'})?`}
        loading={deletingLineId === (linePendingDelete?.c_orderline_id || linePendingDelete?.id)}
      />

      {/* Preview Attachment Modal */}
      {previewAttachment && (() => {
        const fileName = previewAttachment.file_name || previewAttachment.filename;
        const fileSize = previewAttachment.file_size || previewAttachment.filesize;
        const isPdf =
          previewAttachment.is_pdf ||
          (fileName || '').toLowerCase().endsWith('.pdf');
        const isImage =
          previewAttachment.is_image ||
          ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].some((ext) =>
            (fileName || '').toLowerCase().endsWith(ext)
          );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
            <div
              className={`w-full ${
                isPdf ? 'max-w-6xl h-[92vh]' : 'max-w-4xl max-h-[90vh]'
              } flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
                isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className={`text-xs font-bold truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                      {fileName}
                    </h3>
                    <span className="text-[10px] text-slate-400">
                      {formatFileSize(fileSize)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setPreviewAttachment(null)}
                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div
                className={`flex-1 min-h-0 flex flex-col ${
                  isPdf
                    ? 'p-0 overflow-hidden w-full h-full'
                    : 'p-4 overflow-auto items-center justify-center bg-slate-950/20 min-h-[300px]'
                }`}
              >
                {isImage ? (
                  <img
                    src={orderApi.getAttachmentDownloadUrl(
                      targetId,
                      fileName,
                      false
                    )}
                    alt={fileName}
                    className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md mx-auto"
                  />
                ) : isPdf ? (
                  loadingPdf ? (
                    <div className="flex-1 w-full h-full flex flex-col items-center justify-center space-y-3 text-slate-400 font-mono">
                      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                      <span className="text-xs font-semibold">Loading PDF preview...</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex-1 min-h-0">
                      <PdfJsViewer
                        url={
                          pdfBlobUrl ||
                          orderApi.getAttachmentDownloadUrl(
                            targetId,
                            fileName,
                            false
                          )
                        }
                        fileName={fileName}
                      />
                    </div>
                  )
                ) : (
                  <div className="py-16 text-center space-y-4 font-mono">
                    <File className="w-16 h-16 mx-auto text-slate-400 opacity-50" />
                    <p className="text-xs text-slate-400">
                      Preview is not supported for this file type directly in the browser.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        orderApi.downloadAttachment(
                          targetId,
                          fileName
                        )
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-900 hover:bg-cyan-400 transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download {fileName}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Delete Attachment Modal */}
      <ConfirmDeleteModal
        isOpen={!!attachmentPendingDelete}
        onClose={() => !deletingAttachment && setAttachmentPendingDelete(null)}
        onConfirm={handleDeleteAttachment}
        title="Delete Attachment?"
        message="Are you sure you want to remove this attached file from iDempiere? This action cannot be undone."
        itemName={attachmentPendingDelete?.file_name || attachmentPendingDelete?.filename || ''}
        loading={deletingAttachment}
      />

      {/* Delete Entire Document Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteDocModal}
        onClose={() => !deletingDoc && setShowDeleteDocModal(false)}
        onConfirm={handleDeleteDocument}
        title="Delete Purchase Order?"
        message={`Are you sure you want to delete purchase order ${displayDocNo}? This action cannot be undone and will permanently remove the order and its lines.`}
        loading={deletingDoc}
      />

      {/* Document Action Modal */}
      {showDocActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
          <div
            className={`w-full max-w-sm rounded-2xl border shadow-2xl overflow-hidden transition-all ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    Document Action
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    Doc: {displayDocNo} • Status: {displayStatus}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDocActionModal(false);
                  setActionPendingConfirm(null);
                }}
                disabled={processingAction}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer transition disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-4">
              {actionPendingConfirm ? (
                /* Confirmation View */
                <div className="space-y-4 py-1 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-center space-y-2">
                    <div
                      className={`w-12 h-12 mx-auto rounded-xl flex items-center justify-center ${
                        actionPendingConfirm === 'VO'
                          ? 'bg-rose-500/15 text-rose-500'
                          : actionPendingConfirm === 'CO'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : actionPendingConfirm === 'RE'
                          ? 'bg-blue-500/15 text-blue-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {actionPendingConfirm === 'VO' ? (
                        <Ban className="w-6 h-6" />
                      ) : actionPendingConfirm === 'CO' ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : actionPendingConfirm === 'RE' ? (
                        <RotateCcw className="w-6 h-6" />
                      ) : (
                        <Lock className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Confirm Action: {idempiereConfig.createPo.workflow.actionLabels[actionPendingConfirm] || actionPendingConfirm}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {idempiereConfig.createPo.workflow.confirmationMessages[actionPendingConfirm] ||
                          'Are you sure you want to proceed with this document action?'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActionPendingConfirm(null)}
                      disabled={processingAction}
                      className={`flex-1 py-2 px-3 text-xs rounded-xl border font-semibold transition cursor-pointer disabled:opacity-50 ${
                        isDark
                          ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExecuteDocAction(actionPendingConfirm)}
                      disabled={processingAction}
                      className={`flex-1 py-2 px-3 text-xs rounded-xl text-white font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md ${
                        actionPendingConfirm === 'VO'
                          ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                          : actionPendingConfirm === 'CO'
                          ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                          : actionPendingConfirm === 'RE'
                          ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                          : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      }`}
                    >
                      {processingAction ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>Confirm</span>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Action Options List */
                <div className="space-y-2.5">
                  {['DR', 'IP', 'IN'].includes(currentDocStatus) ? (
                    <>
                      {/* Complete Action */}
                      <button
                        type="button"
                        onClick={() => setActionPendingConfirm('CO')}
                        disabled={processingAction}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition group cursor-pointer ${
                          isDark
                            ? 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                            : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/20 text-emerald-500">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Complete</p>
                            <p className="text-[10px] text-slate-400">
                              Complete and approve purchase order
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition" />
                      </button>

                      {/* Void Action */}
                      <button
                        type="button"
                        onClick={() => setActionPendingConfirm('VO')}
                        disabled={processingAction}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition group cursor-pointer ${
                          isDark
                            ? 'border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400'
                            : 'border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/20 text-rose-500">
                            <Ban className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Void</p>
                            <p className="text-[10px] text-slate-400">
                              Void and cancel this purchase order permanently
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition" />
                      </button>
                    </>
                  ) : currentDocStatus === 'CO' ? (
                    <>
                      {/* Re-Activate Action */}
                      <button
                        type="button"
                        onClick={() => setActionPendingConfirm('RE')}
                        disabled={processingAction}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition group cursor-pointer ${
                          isDark
                            ? 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400'
                            : 'border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-500">
                            <RotateCcw className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Re-Activate</p>
                            <p className="text-[10px] text-slate-400">
                              Revert status back to draft for modification
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition" />
                      </button>

                      {/* Close Action */}
                      <button
                        type="button"
                        onClick={() => setActionPendingConfirm('CL')}
                        disabled={processingAction}
                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition group cursor-pointer ${
                          isDark
                            ? 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                            : 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-500">
                            <Lock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold">Close</p>
                            <p className="text-[10px] text-slate-400">
                              Close order document permanently
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition" />
                      </button>
                    </>
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400">
                      No further document actions available for status "{displayStatus}".
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        order={{
          ...docHeader,
          client_name: clientDisplayName,
          logo_base64: docHeader?.logo_base64 || options?.logo_base64,
          address_lines: docHeader?.address_lines || options?.address_lines,
        }}
        lines={docLines}
        options={{
          clientName: clientDisplayName,
          orgName: docHeader?.org_name,
          logoBase64: docHeader?.logo_base64 || options?.logo_base64,
          addressLines: docHeader?.address_lines || options?.address_lines,
        }}
        isDark={isDark}
      />

      {/* Reauth Modal on 401 */}
      {showReauthModal && (
        <ReauthModal
          isOpen={showReauthModal}
          onClose={() => setShowReauthModal(false)}
          onSuccess={handleReauthSuccess}
        />
      )}
    </ModuleLayout>
  );
}
