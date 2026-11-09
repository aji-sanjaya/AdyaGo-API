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
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  Eye,
  File,
  Image,
  ExternalLink,
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
} from 'lucide-react';
import Swal from 'sweetalert2';
import { idempiereConfig } from '../../../config/idempiere';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import ModuleLayout from '../../../layouts/ModuleLayout';
import PageLoader from '../../../components/ui/PageLoader';
import { orderApi } from '../../../api/order';
import { getCustomSelectStyles } from '../../../components/ui/selectStyles';
import CustomDatePicker from '../../../components/ui/CustomDatePicker';
import { decryptDocumentId } from '../../../utils/crypto';
import ReauthModal from '../../../components/common/ReauthModal';
import ConfirmDeleteModal from '../../../components/common/ConfirmDeleteModal';
import OrderLineModal from './components/OrderLineModal';
import LinkedRequisitionsTab from './components/LinkedRequisitionsTab';
import LinkedReceiptsTab from './components/LinkedReceiptsTab';
import OrderChatTab from './components/OrderChatTab';
import OrderChangeLogTab from './components/OrderChangeLogTab';
import PrintPreviewModal from './components/PrintPreviewModal';

export default function CreatePurchaseOrderPage({ documentIdParam: propDocId }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { isDark } = useTheme();

  // Resolve document ID
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

  // Master options & loading
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);

  // Document data
  const [docHeader, setDocHeader] = useState(null);
  const [docLines, setDocLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [linesLoaded, setLinesLoaded] = useState(false);

  // Form Fields
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
  const [taxId, setTaxId] = useState(idempiereConfig.createPo.defaults.taxId);
  const [costCenterId, setCostCenterId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [checkedById, setCheckedById] = useState('');
  const [approvedById, setApprovedById] = useState('');
  const [description, setDescription] = useState('');

  // Vendor contacts list
  const [vendorContacts, setVendorContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Vendor options for search
  const [vendorOptions, setVendorOptions] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [showLineModal, setShowLineModal] = useState(false);
  const [selectedLineForEdit, setSelectedLineForEdit] = useState(null);
  const [linePendingDelete, setLinePendingDelete] = useState(null);
  const [deletingLineId, setDeletingLineId] = useState(null);

  // Doc Actions & Delete modal
  const [showDocActionModal, setShowDocActionModal] = useState(false);
  const [actionPendingConfirm, setActionPendingConfirm] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState(null);
  const [attachmentPendingDelete, setAttachmentPendingDelete] = useState(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const fileInputRef = useRef(null);

  // Print Modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Counts
  const [chatCount, setChatCount] = useState(0);
  const [changeLogCount, setChangeLogCount] = useState(0);
  const [requisitionCount, setRequisitionCount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);

  const totalLineCount = linesLoaded ? docLines.length : (docHeader?.line_count ?? 0);

  // Format IDR helper
  const formatCurrency = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Status badge helper
  const getStatusBadge = (docStatus, label) => {
    let bg = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    let icon = <RotateCcw className="w-3.5 h-3.5 mr-1 text-slate-500" />;

    if (docStatus === 'CO' || docStatus === 'CL') {
      bg = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50';
      icon = <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />;
    } else if (docStatus === 'DR' || docStatus === 'IN') {
      bg = 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50';
      icon = <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-500" />;
    } else if (docStatus === 'VO' || docStatus === 'RE') {
      bg = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50';
      icon = <Ban className="w-3.5 h-3.5 mr-1 text-rose-500" />;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${bg}`}>
        {icon}
        {label || docStatus || 'Draft'}
      </span>
    );
  };

  // Check if document is read-only
  const isReadOnly = useMemo(() => {
    if (isNew) return false;
    const status = docHeader?.docstatus;
    return status === 'CO' || status === 'CL' || status === 'VO';
  }, [isNew, docHeader]);

  // Initial load: Master options & document detail
  useEffect(() => {
    let isMounted = true;

    const initData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [optRes, docRes] = await Promise.all([
          orderApi.getMasterOptions(clientId, userId, session?.token),
          !isNew && targetId ? orderApi.getOrder(targetId) : Promise.resolve(null),
        ]);

        if (!isMounted) return;

        if (optRes && optRes.data) {
          setOptions(optRes.data);
          // Set initial vendor options if provided
          if (optRes.data.vendors) {
            setVendorOptions(optRes.data.vendors);
          }
        }

        if (docRes && docRes.data) {
          const header = docRes.data.header;
          const lines = docRes.data.lines || [];
          applyRecordData(header, lines, true);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to initialize Purchase Order page:', err);
        const errMsg = err.response?.data?.message || err.message || 'Failed to load order data.';
        if (err.response?.status === 401 || errMsg.includes('Token has expired')) {
          setInvalidToken(true);
          setShowReauthModal(true);
        } else {
          setError(errMsg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initData();

    return () => {
      isMounted = false;
    };
  }, [targetId, isNew, clientId, userId]);

  // Load contacts whenever vendorId changes
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
        setCostCenterId(header.c_costcenter_id || '');
        setProjectId(header.c_project_id || '');
        setCheckedById(header.checkedby_id || '');
        setApprovedById(header.approvedby_id || '');
        setDescription(header.description || '');

        // If vendor not in vendorOptions, add it
        if (header.c_bpartner_id && header.vendor_name) {
          setVendorOptions((prev) => {
            const exists = prev.some((v) => v.id === header.c_bpartner_id);
            if (!exists) {
              return [{ id: header.c_bpartner_id, name: header.vendor_name, value: header.vendor_value }, ...prev];
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

  const handleRefresh = async () => {
    if (isNew || !targetId) return;
    setLoading(true);
    try {
      const res = await orderApi.getOrder(targetId);
      if (res && res.data) {
        applyRecordData(res.data.header, res.data.lines, true);
        setSuccessMessage('Purchase order refreshed successfully.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to refresh order:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered warehouses by org
  const filteredWarehouses = useMemo(() => {
    if (!options?.warehouses) return [];
    if (!orgId) return options.warehouses;
    return options.warehouses.filter((w) => !w.org_id || Number(w.org_id) === Number(orgId));
  }, [options?.warehouses, orgId]);

  // Filtered org options (context rule: only context org unless 0 or '*')
  const orgOptions = useMemo(() => {
    if (!options?.organizations) return [];
    if (!isNew) {
      return options.organizations;
    }
    if (orgIdDefault && orgIdDefault !== 0) {
      const found = options.organizations.find((o) => Number(o.id) === Number(orgIdDefault));
      return found ? [found] : options.organizations;
    }
    return options.organizations;
  }, [options?.organizations, isNew, orgIdDefault]);

  // Vendor options search handler
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

  // Submit Header Form (Create or Update)
  const handleSubmitHeader = async (e) => {
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
      ad_org_id: Number(orgId),
      m_warehouse_id: Number(warehouseId),
      c_doctypetarget_id: Number(docTypeTargetId) || idempiereConfig.createPo.defaults.docTypeId,
      dateordered: dateOrdered,
      datepromised: datePromised,
      c_bpartner_id: Number(vendorId),
      c_bpartner_location_id: vendorContactId ? Number(vendorContactId) : undefined,
      m_pricelist_id: Number(pricelistId) || idempiereConfig.createPo.defaults.pricelistId,
      c_paymentterm_id: Number(paymentTermId) || idempiereConfig.createPo.defaults.paymentTermId,
      paymentrule: paymentRule || idempiereConfig.createPo.defaults.paymentRule,
      priorityrule: priorityRule || idempiereConfig.createPo.defaults.priorityRule,
      c_costcenter_id: costCenterId ? Number(costCenterId) : undefined,
      c_project_id: projectId ? Number(projectId) : undefined,
      checkedby_id: checkedById ? Number(checkedById) : undefined,
      approvedby_id: approvedById ? Number(approvedById) : undefined,
      description: description || '',
    };

    try {
      if (isNew) {
        const res = await orderApi.createOrder(payload, session?.token);
        const newId = res.data?.id;
        setSuccessMessage('Purchase Order created successfully!');
        if (newId) {
          navigate(`/create-po?documentID=${newId}`, { replace: true });
        }
      } else {
        await orderApi.updateOrder(targetId, payload, session?.token);
        setSuccessMessage('Purchase Order header updated successfully!');
        setTimeout(() => setSuccessMessage(null), 4000);
        await handleRefresh();
      }
    } catch (err) {
      console.error('Failed to save purchase order:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save purchase order.';
      if (err.response?.status === 401 || errMsg.includes('Token has expired')) {
        setShowReauthModal(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Line Saved callback
  const handleLineSaved = async (mode) => {
    if (!targetId) return;
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
    }
  };

  // Delete Line confirmation
  const handleConfirmDeleteLine = async () => {
    if (!targetId || !linePendingDelete?.id) return;
    setDeletingLineId(linePendingDelete.id);
    try {
      await orderApi.deleteOrderLine(targetId, linePendingDelete.id, session?.token);
      await handleLineSaved('deleted');
      setLinePendingDelete(null);
    } catch (err) {
      console.error('Failed to delete order line:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to delete line.';
      if (err.response?.status === 401 || errMsg.includes('Token has expired')) {
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
      await handleRefresh();
    } catch (err) {
      console.error('Failed to execute document action:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to execute document action.';
      if (err.response?.status === 401 || errMsg.includes('Token has expired')) {
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
      const errMsg = err.response?.data?.message || err.message || 'Failed to delete purchase order.';
      if (err.response?.status === 401 || errMsg.includes('Token has expired')) {
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
      } else {
        setAttachments([]);
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
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError('File size exceeds the 10 MB limit.');
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
    setDeletingAttachment(true);
    try {
      await orderApi.deleteAttachment(
        targetId,
        attachmentPendingDelete.attachment_id || attachmentPendingDelete.id,
        attachmentPendingDelete.filename,
        session?.token
      );
      setSuccessMessage(`Attachment "${attachmentPendingDelete.filename}" deleted.`);
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

  // Switch tabs and auto-load if needed
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'attachments' && attachments.length === 0) {
      loadAttachments();
    }
  };

  if (loading) {
    return (
      <ModuleLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <PageLoader />
        </div>
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/create-po')}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Back to Purchase Orders"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {isNew ? 'Create Purchase Order' : `PO: ${docHeader?.documentno || 'Draft'}`}
                </h1>
                {!isNew && getStatusBadge(docHeader?.docstatus, docHeader?.docstatus_label)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isNew
                  ? 'Create a new purchase order document linked to requisitions and suppliers'
                  : `ID: ${docHeader?.id} • Created: ${docHeader?.dateordered?.split('T')[0] || '-'} • Org: ${docHeader?.org_name || '-'}`}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {!isNew && (
              <>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>

                <button
                  type="button"
                  onClick={() => setShowPrintModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Preview
                </button>

                {/* Document Action Trigger */}
                {docHeader?.docstatus === 'DR' || docHeader?.docstatus === 'IN' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActionPendingConfirm('CO');
                      setShowDocActionModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl border border-emerald-200 dark:border-emerald-800/60 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    Complete PO
                  </button>
                ) : docHeader?.docstatus === 'CO' ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActionPendingConfirm('RE');
                        setShowDocActionModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 rounded-xl border border-amber-200 dark:border-amber-800/60 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                      Reactivate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionPendingConfirm('CL');
                        setShowDocActionModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionPendingConfirm('VO');
                        setShowDocActionModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-800/60 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-500" />
                      Void
                    </button>
                  </div>
                ) : null}

                {/* Delete Draft Button */}
                {(docHeader?.docstatus === 'DR' || docHeader?.docstatus === 'IN') && (
                  <button
                    type="button"
                    onClick={() => setShowDeleteDocModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200 dark:border-rose-800/60 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                )}
              </>
            )}

            {!isReadOnly && (
              <button
                type="button"
                onClick={handleSubmitHeader}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isNew ? 'Create PO' : 'Save Header'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications / Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 flex items-start justify-between text-rose-700 dark:text-rose-300 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-start justify-between text-emerald-700 dark:text-emerald-300 text-xs">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
            <button type="button" onClick={() => setSuccessMessage(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Financial Summary Banner */}
        {!isNew && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">Subtotal</span>
              <span className="text-lg font-bold">{formatCurrency(docHeader?.totallines)}</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">Tax (PPN)</span>
              <span className="text-lg font-bold text-amber-400">{formatCurrency(docHeader?.taxamt)}</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">PPh23 Withholding</span>
              <span className="text-lg font-bold text-rose-400">
                {docHeader?.adw_withholdingamount ? `-${formatCurrency(docHeader?.adw_withholdingamount)}` : 'Rp 0'}
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">Grand Total</span>
              <span className="text-xl font-extrabold text-primary-400">{formatCurrency(docHeader?.grandtotal)}</span>
            </div>
          </div>
        )}

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => handleTabChange('header')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'header'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Header Detail</span>
          </button>

          {!isNew && (
            <>
              <button
                type="button"
                onClick={() => handleTabChange('lines')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'lines'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <List className="w-4 h-4" />
                <span>Lines</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {totalLineCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('requisitions')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'requisitions'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Requisitions</span>
                {requisitionCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {requisitionCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('receipts')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'receipts'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <PackageCheck className="w-4 h-4" />
                <span>Receipts</span>
                {receiptCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {receiptCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('attachments')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'attachments'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Paperclip className="w-4 h-4" />
                <span>Attachments</span>
                {attachments.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {attachments.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('chat')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'chat'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Discussions</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('changelog')}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === 'changelog'
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Audit Logs</span>
              </button>
            </>
          )}
        </div>

        {/* TAB 1: HEADER DETAIL */}
        {activeTab === 'header' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
            <form onSubmit={handleSubmitHeader} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Organization */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Organization <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    options={orgOptions.map((o) => ({ value: o.id, label: o.name }))}
                    value={
                      orgOptions
                        .map((o) => ({ value: o.id, label: o.name }))
                        .find((o) => Number(o.value) === Number(orgId)) || null
                    }
                    onChange={(selected) => setOrgId(selected ? selected.value : '')}
                    isDisabled={!isNew}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder="Select Organization..."
                  />
                  {!isNew && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Organization is locked after creation.
                    </span>
                  )}
                </div>

                {/* Warehouse */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Warehouse <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    options={filteredWarehouses.map((w) => ({ value: w.id, label: w.name }))}
                    value={
                      filteredWarehouses
                        .map((w) => ({ value: w.id, label: w.name }))
                        .find((w) => Number(w.value) === Number(warehouseId)) || null
                    }
                    onChange={(selected) => setWarehouseId(selected ? selected.value : '')}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder="Select Warehouse..."
                  />
                </div>

                {/* Document Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Document Type
                  </label>
                  <Select
                    options={
                      options?.docTypes?.map((dt) => ({ value: dt.id, label: dt.name })) || [
                        { value: idempiereConfig.createPo.defaults.docTypeId, label: 'Purchase Order' },
                      ]
                    }
                    value={
                      options?.docTypes
                        ?.map((dt) => ({ value: dt.id, label: dt.name }))
                        .find((dt) => Number(dt.value) === Number(docTypeTargetId)) || {
                        value: idempiereConfig.createPo.defaults.docTypeId,
                        label: 'Purchase Order',
                      }
                    }
                    onChange={(selected) => setDocTypeTargetId(selected ? selected.value : '')}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                  />
                </div>

                {/* Date Ordered */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date Ordered <span className="text-rose-500">*</span>
                  </label>
                  <CustomDatePicker
                    value={dateOrdered}
                    onChange={setDateOrdered}
                    disabled={isReadOnly}
                    isDark={isDark}
                  />
                </div>

                {/* Date Promised */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Date Promised <span className="text-rose-500">*</span>
                  </label>
                  <CustomDatePicker
                    value={datePromised}
                    onChange={setDatePromised}
                    disabled={isReadOnly}
                    isDark={isDark}
                  />
                </div>

                {/* Vendor / Supplier */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Vendor / Supplier <span className="text-rose-500">*</span>
                  </label>
                  <Select
                    options={vendorOptions.map((v) => ({
                      value: v.id,
                      label: `${v.name}${v.value ? ` (${v.value})` : ''}`,
                    }))}
                    value={
                      vendorOptions
                        .map((v) => ({
                          value: v.id,
                          label: `${v.name}${v.value ? ` (${v.value})` : ''}`,
                        }))
                        .find((v) => Number(v.value) === Number(vendorId)) || null
                    }
                    onChange={(selected) => {
                      setVendorId(selected ? selected.value : '');
                      setVendorContactId('');
                    }}
                    onInputChange={(val) => handleVendorSearch(val)}
                    isLoading={loadingVendors}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder="Search supplier..."
                    isClearable
                  />
                </div>

                {/* Vendor Contact Person */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Contact Person
                  </label>
                  <Select
                    options={vendorContacts.map((c) => ({
                      value: c.id,
                      label: `${c.name}${c.phone ? ` - ${c.phone}` : ''}`,
                    }))}
                    value={
                      vendorContacts
                        .map((c) => ({
                          value: c.id,
                          label: `${c.name}${c.phone ? ` - ${c.phone}` : ''}`,
                        }))
                        .find((c) => Number(c.value) === Number(vendorContactId)) || null
                    }
                    onChange={(selected) => setVendorContactId(selected ? selected.value : '')}
                    isLoading={loadingContacts}
                    isDisabled={isReadOnly || !vendorId}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder={vendorId ? 'Select Contact Person...' : 'Select Vendor first'}
                    isClearable
                  />
                </div>

                {/* Price List */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Price List
                  </label>
                  <Select
                    options={options?.pricelists?.map((p) => ({ value: p.id, label: p.name })) || []}
                    value={
                      options?.pricelists
                        ?.map((p) => ({ value: p.id, label: p.name }))
                        .find((p) => Number(p.value) === Number(pricelistId)) || null
                    }
                    onChange={(selected) => setPricelistId(selected ? selected.value : '')}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder="Select Price List..."
                  />
                </div>

                {/* Payment Term */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Payment Term
                  </label>
                  <Select
                    options={options?.paymentTerms?.map((pt) => ({ value: pt.id, label: pt.name })) || []}
                    value={
                      options?.paymentTerms
                        ?.map((pt) => ({ value: pt.id, label: pt.name }))
                        .find((pt) => Number(pt.value) === Number(paymentTermId)) || null
                    }
                    onChange={(selected) => setPaymentTermId(selected ? selected.value : '')}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder="Select Payment Term..."
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Priority
                  </label>
                  <Select
                    options={
                      options?.priorities?.map((p) => ({ value: p.value, label: p.label })) || [
                        { value: '3', label: 'High' },
                        { value: '5', label: 'Medium' },
                        { value: '7', label: 'Low' },
                      ]
                    }
                    value={
                      (options?.priorities || [
                        { value: '3', label: 'High' },
                        { value: '5', label: 'Medium' },
                        { value: '7', label: 'Low' },
                      ])
                        .map((p) => ({ value: p.value, label: p.label }))
                        .find((p) => String(p.value) === String(priorityRule)) || null
                    }
                    onChange={(selected) => setPriorityRule(selected ? selected.value : '5')}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                  />
                </div>

                {/* Cost Center */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Cost Center
                  </label>
                  <Select
                    options={options?.costCenters?.map((cc) => ({ value: cc.id, label: `${cc.name} (${cc.value})` })) || []}
                    value={
                      options?.costCenters
                        ?.map((cc) => ({ value: cc.id, label: `${cc.name} (${cc.value})` }))
                        .find((cc) => Number(cc.value) === Number(costCenterId)) || null
                    }
                    onChange={(selected) => setCostCenterId(selected ? selected.value : '')}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder="Select Cost Center..."
                    isClearable
                  />
                </div>

                {/* Project */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Project
                  </label>
                  <Select
                    options={options?.projects?.map((p) => ({ value: p.id, label: `${p.name} (${p.value})` })) || []}
                    value={
                      options?.projects
                        ?.map((p) => ({ value: p.id, label: `${p.name} (${p.value})` }))
                        .find((p) => Number(p.value) === Number(projectId)) || null
                    }
                    onChange={(selected) => setProjectId(selected ? selected.value : '')}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder="Select Project..."
                    isClearable
                  />
                </div>

                {/* Checked By */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Checked By
                  </label>
                  <Select
                    options={options?.users?.map((u) => ({ value: u.id, label: u.name })) || []}
                    value={
                      options?.users
                        ?.map((u) => ({ value: u.id, label: u.name }))
                        .find((u) => Number(u.value) === Number(checkedById)) || null
                    }
                    onChange={(selected) => setCheckedById(selected ? selected.value : '')}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder="Select Reviewer..."
                    isClearable
                  />
                </div>

                {/* Approved By */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Approved By
                  </label>
                  <Select
                    options={options?.users?.map((u) => ({ value: u.id, label: u.name })) || []}
                    value={
                      options?.users
                        ?.map((u) => ({ value: u.id, label: u.name }))
                        .find((u) => Number(u.value) === Number(approvedById)) || null
                    }
                    onChange={(selected) => setApprovedById(selected ? selected.value : '')}
                    isDisabled={isReadOnly}
                    styles={getCustomSelectStyles(isDark)}
                    placeholder="Select Approver..."
                    isClearable
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description / Special Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isReadOnly}
                    placeholder="Enter notes, delivery instructions, or contract references..."
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                  />
                </div>
              </div>

              {!isReadOnly && (
                <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{isNew ? 'Create Purchase Order' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 2: LINES */}
        {activeTab === 'lines' && (
          <div className="space-y-4">
            {/* Lines Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Order Line Items ({docLines.length})
                </span>
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLineForEdit(null);
                      setShowLineModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Line Item
                  </button>
                </div>
              )}
            </div>

            {/* Lines Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[11px]">
                    <tr>
                      <th className="py-3 px-3 w-12 text-center">#</th>
                      <th className="py-3 px-3">Item / Description</th>
                      <th className="py-3 px-3 w-28 text-right">Qty</th>
                      <th className="py-3 px-3 w-16 text-center">UoM</th>
                      <th className="py-3 px-3 w-32 text-right">Price</th>
                      <th className="py-3 px-3 w-16 text-center">Disc</th>
                      <th className="py-3 px-3 w-24 text-center">PPh23</th>
                      <th className="py-3 px-3 w-32 text-right">Total</th>
                      {!isReadOnly && <th className="py-3 px-3 w-20 text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                    {docLines.length > 0 ? (
                      docLines.map((line, idx) => (
                        <tr
                          key={line.id || idx}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-3 text-center font-mono text-slate-400">
                            {line.line || idx + 1}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {line.product_name || line.charge_name || 'Standard Item'}
                            </div>
                            {line.product_value && (
                              <span className="text-[11px] font-mono text-slate-400">
                                {line.product_value}
                              </span>
                            )}
                            {line.description && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                {line.description}
                              </div>
                            )}
                            {line.m_requisitionline_id ? (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded font-mono">
                                Linked PR #{line.m_requisitionline_id}
                              </span>
                            ) : null}
                          </td>
                          <td className="py-3 px-3 text-right font-medium">
                            {line.qtyentered || line.qtyordered || 0}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500">
                            {line.uom_symbol || line.uom_name || '-'}
                          </td>
                          <td className="py-3 px-3 text-right font-medium">
                            {formatCurrency(line.priceactual || line.priceentered)}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-500">
                            {line.discount ? `${line.discount}%` : '-'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {line.adw_iswithholding === 'Y' ? (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                                {line.adw_withholdingrate || 2}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                            {formatCurrency(line.linenetamt)}
                          </td>
                          {!isReadOnly && (
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLineForEdit(line);
                                    setShowLineModal(true);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                  title="Edit Line"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setLinePendingDelete(line)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                  title="Delete Line"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={isReadOnly ? 8 : 9} className="py-12 text-center text-slate-400">
                          <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                          <p className="font-medium text-slate-600 dark:text-slate-300">No line items added yet</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Click "Add Line Item" to add products, charges, or import from Requisitions.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: REQUISITIONS */}
        {activeTab === 'requisitions' && !isNew && (
          <LinkedRequisitionsTab
            orderId={targetId}
            isDark={isDark}
            onTotalCountChange={setRequisitionCount}
          />
        )}

        {/* TAB 4: RECEIPTS */}
        {activeTab === 'receipts' && !isNew && (
          <LinkedReceiptsTab
            orderId={targetId}
            isDark={isDark}
            onTotalCountChange={setReceiptCount}
          />
        )}

        {/* TAB 5: ATTACHMENTS */}
        {activeTab === 'attachments' && !isNew && (
          <div className="space-y-4">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div>
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  Document Attachments ({attachments.length})
                </span>
                <p className="text-xs text-slate-400">Upload quotes, vendor contracts, or specifications (max 10MB)</p>
              </div>

              {!isReadOnly && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition-colors shadow-xs disabled:opacity-50"
                  >
                    {uploadingAttachment ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    Upload File
                  </button>
                </div>
              )}
            </div>

            {attachmentError && (
              <div className="p-3 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/30 text-xs">
                {attachmentError}
              </div>
            )}

            {/* Attachments Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loadingAttachments ? (
                <div className="col-span-full py-12 text-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                  <p className="text-xs">Loading attachments...</p>
                </div>
              ) : attachments.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                  <Paperclip className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                  <p className="font-medium text-slate-600 dark:text-slate-300">No attachments uploaded yet</p>
                </div>
              ) : (
                attachments.map((att, idx) => (
                  <div
                    key={att.id || att.attachment_id || idx}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                        <File className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {att.filename}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {att.filesize ? `${(att.filesize / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => orderApi.downloadAttachment(targetId, att.filename)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => setAttachmentPendingDelete(att)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 6: CHAT & DISCUSSIONS */}
        {activeTab === 'chat' && !isNew && (
          <OrderChatTab
            orderId={targetId}
            displayDocNo={docHeader?.documentno}
            isReadOnly={isReadOnly}
            session={session}
            isDark={isDark}
            onTokenExpired={() => setShowReauthModal(true)}
          />
        )}

        {/* TAB 7: CHANGE LOGS */}
        {activeTab === 'changelog' && !isNew && (
          <OrderChangeLogTab
            orderId={targetId}
            isDark={isDark}
            onTotalLogsChange={setChangeLogCount}
          />
        )}

        {/* MODALS */}
        {/* Add/Edit Line Modal */}
        {showLineModal && (
          <OrderLineModal
            isOpen={showLineModal}
            onClose={() => {
              setShowLineModal(false);
              setSelectedLineForEdit(null);
            }}
            orderId={targetId}
            line={selectedLineForEdit}
            options={options}
            session={session}
            isDark={isDark}
            onSaved={handleLineSaved}
            onTokenExpired={() => {
              setShowLineModal(false);
              setShowReauthModal(true);
            }}
          />
        )}

        {/* Delete Line Modal */}
        {linePendingDelete && (
          <ConfirmDeleteModal
            isOpen={!!linePendingDelete}
            onClose={() => setLinePendingDelete(null)}
            onConfirm={handleConfirmDeleteLine}
            title="Remove Order Line Item"
            message={`Are you sure you want to delete line #${linePendingDelete.line} (${linePendingDelete.product_name || linePendingDelete.charge_name || 'Item'})?`}
            loading={deletingLineId === linePendingDelete.id}
          />
        )}

        {/* Delete Attachment Modal */}
        {attachmentPendingDelete && (
          <ConfirmDeleteModal
            isOpen={!!attachmentPendingDelete}
            onClose={() => setAttachmentPendingDelete(null)}
            onConfirm={handleDeleteAttachment}
            title="Delete Attachment"
            message={`Are you sure you want to delete "${attachmentPendingDelete.filename}"?`}
            loading={deletingAttachment}
          />
        )}

        {/* Delete Entire Document Modal */}
        {showDeleteDocModal && (
          <ConfirmDeleteModal
            isOpen={showDeleteDocModal}
            onClose={() => setShowDeleteDocModal(false)}
            onConfirm={handleDeleteDocument}
            title="Delete Purchase Order"
            message={`Are you sure you want to delete this purchase order (${docHeader?.documentno})? This action cannot be undone.`}
            loading={deletingDoc}
          />
        )}

        {/* Document Action Confirmation Modal */}
        {showDocActionModal && actionPendingConfirm && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-500 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Execute Document Action
                  </h3>
                  <p className="text-xs text-slate-400">Action: {actionPendingConfirm}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to execute action <b>{actionPendingConfirm}</b> on Purchase Order{' '}
                <b>{docHeader?.documentno}</b>?
              </p>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDocActionModal(false);
                    setActionPendingConfirm(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteDocAction(actionPendingConfirm)}
                  disabled={processingAction}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-xs disabled:opacity-50"
                >
                  {processingAction && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Print Preview Modal */}
        {showPrintModal && (
          <PrintPreviewModal
            isOpen={showPrintModal}
            onClose={() => setShowPrintModal(false)}
            order={docHeader}
            lines={docLines}
            options={{
              clientName: session?.clientName || 'ADYAWINSA GROUP',
              orgName: docHeader?.org_name,
            }}
            isDark={isDark}
          />
        )}

        {/* Reauth Modal on 401 */}
        {showReauthModal && (
          <ReauthModal
            isOpen={showReauthModal}
            onClose={() => setShowReauthModal(false)}
            onSuccess={() => {
              setShowReauthModal(false);
              setInvalidToken(false);
              handleRefresh();
            }}
          />
        )}
      </div>
    </ModuleLayout>
  );
}
