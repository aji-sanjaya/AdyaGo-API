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
import OrderLineModal from './components/OrderLineModal';
import LinkedRequisitionsTab from './components/LinkedRequisitionsTab';
import LinkedReceiptsTab from './components/LinkedReceiptsTab';
import OrderChatTab from './components/OrderChatTab';
import OrderChangeLogTab from './components/OrderChangeLogTab';
import PrintPreviewModal from './components/PrintPreviewModal';

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
  const [showLineModal, setShowLineModal] = useState(false);
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
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState(null);
  const [attachmentPendingDelete, setAttachmentPendingDelete] = useState(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);
  const fileInputRef = useRef(null);

  // Tab counts
  const [chatCount, setChatCount] = useState(0);
  const [changeLogCount, setChangeLogCount] = useState(0);
  const [requisitionCount, setRequisitionCount] = useState(0);
  const [receiptCount, setReceiptCount] = useState(0);

  const totalLineCount = linesLoaded ? docLines.length : (docHeader?.line_count ?? 0);

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

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

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
    const loadAtts = !isNew && targetId ? orderApi.getAttachments(targetId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] });
    const loadChatData = !isNew && targetId ? orderApi.getChat(targetId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] });
    const loadLogsData = !isNew && targetId ? orderApi.getChangeLogs(targetId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] });
    const loadReqsData = !isNew && targetId ? orderApi.getLinkedRequisitions(targetId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] });
    const loadReceiptsData = !isNew && targetId ? orderApi.getLinkedReceipts(targetId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] });

    Promise.all([loadOptions, loadDetail, loadAtts, loadChatData, loadLogsData, loadReqsData, loadReceiptsData])
      .then(([optRes, detailRes, attRes, chatRes, logsRes, reqsRes, receiptsRes]) => {
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

        if (detailRes && detailRes.data) {
          applyRecordData(detailRes.data.header, detailRes.data.lines, true);
        }
        if (attRes && attRes.data) setAttachments(attRes.data);
        if (chatRes && chatRes.data) setChatCount(chatRes.data.length);
        if (logsRes && logsRes.data) setChangeLogCount(logsRes.data.length);
        if (reqsRes && reqsRes.data) setRequisitionCount(reqsRes.data.length);
        if (receiptsRes && receiptsRes.data) setReceiptCount(receiptsRes.data.length);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load purchase order details:', err);
        const errMsg = err.response?.data?.message || err.message || 'Failed to load purchase order.';
        if (err.response?.status === 401 || errMsg.includes('Token has expired')) {
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
      const errMsg = err.response?.data?.message || err.message || 'Failed to process purchase order.';
      if (err.response?.status === 401 || errMsg.includes('Token has expired')) {
        setShowReauthModal(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Line saved callback
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

  // Delete line
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

      const detailRes = await orderApi.getOrder(targetId);
      if (detailRes && detailRes.data) {
        applyRecordData(detailRes.data.header, detailRes.data.lines, true);
      }
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

  // Tab change handler
  const handleTabChange = async (newTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);

    if (!isNew && targetId) {
      setTabLoading(true);
      const startTime = Date.now();
      try {
        if (newTab === 'attachments') {
          await loadAttachments();
        } else if (newTab === 'chat') {
          const res = await orderApi.getChat(targetId).catch(() => null);
          if (res && res.data) setChatCount(res.data.length);
        } else if (newTab === 'requisitions') {
          const res = await orderApi.getLinkedRequisitions(targetId).catch(() => null);
          if (res && res.data) setRequisitionCount(res.data.length);
        } else if (newTab === 'receipts') {
          const res = await orderApi.getLinkedReceipts(targetId).catch(() => null);
          if (res && res.data) setReceiptCount(res.data.length);
        } else if (newTab === 'changelog') {
          const res = await orderApi.getChangeLogs(targetId).catch(() => null);
          if (res && res.data) setChangeLogCount(res.data.length);
        } else if (newTab === 'header') {
          const detailRes = await orderApi.getOrder(targetId);
          if (detailRes && detailRes.data) {
            applyRecordData(detailRes.data.header, null, true);
          }
        }
      } catch (err) {
        console.error('Failed to retrieve latest data on tab switch:', err);
      } finally {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 250 - elapsed);
        setTimeout(() => {
          setTabLoading(false);
        }, delay);
      }
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
        <div className="p-8 text-center space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm max-w-md mx-auto">
            Invalid or expired document link. Please return to the purchase order list.
          </div>
          <button
            type="button"
            onClick={() => navigate('/create-po')}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Back to Purchase Order List
          </button>
        </div>
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
                isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
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
                  {!isNew && attachments.length > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {attachments.length}
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
                {/* Section 1: Order Details */}
                <div>
                  <h3
                    className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center mb-2.5 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    <span className="w-1 h-5 bg-cyan-400 rounded mr-3 inline-block" />
                    Order Details
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
                          PO Number
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
                            placeholder={vendorId ? '- Select Contact -' : 'Select Vendor first'}
                            isDisabled={isReadOnly || !vendorId}
                            isLoading={loadingContacts}
                            isSearchable
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
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            readOnly={isReadOnly}
                            placeholder="Enter notes or contract references..."
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
                            isDisabled={isReadOnly || !isNew}
                            isSearchable
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
                            placeholder="Select Date Ordered"
                            isDark={isDark}
                            disabled={isReadOnly}
                            required
                          />
                        </div>
                      </div>

                      {/* Date Promised */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Date Promised <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <CustomDatePicker
                            value={datePromised}
                            onChange={setDatePromised}
                            placeholder="Select Date Promised"
                            isDark={isDark}
                            disabled={isReadOnly}
                            required
                          />
                        </div>
                      </div>

                      {/* Priority */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Priority <span className="text-rose-500 ml-0.5">*</span>
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
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Warehouse, Accounting & Approvals */}
                <div>
                  <h3
                    className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center mb-2.5 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    <span className="w-1 h-5 bg-blue-500 rounded mr-3 inline-block" />
                    Warehouse & Accounting
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
                            isDisabled={isReadOnly}
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
                    </div>

                    {/* Right Column */}
                    <div className="space-y-2.5">
                      {/* Status */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Status
                        </label>
                        <div className="col-span-1 sm:col-span-2 flex items-center h-[38px]">
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            {displayStatus}
                          </span>
                        </div>
                      </div>

                      {/* Checked By */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Checked By
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
                            placeholder="- Select Reviewer -"
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
                          Approved By
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
                            placeholder="- Select Approver -"
                            isDisabled={isReadOnly}
                            isClearable
                            menuPlacement="auto"
                            menuPosition="fixed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Financial Summary */}
                {!isNew && (
                  <div>
                    <h3
                      className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center mb-2.5 ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      <span className="w-1 h-5 bg-emerald-500 rounded mr-3 inline-block" />
                      Financial Summary
                    </h3>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-sm font-mono">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">Subtotal</span>
                        <span className="text-base font-bold text-slate-200">{formatCurrency(docHeader?.totallines)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">Tax (PPN)</span>
                        <span className="text-base font-bold text-amber-400">{formatCurrency(docHeader?.taxamt)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">PPh23 Withholding</span>
                        <span className="text-base font-bold text-rose-400">
                          {docHeader?.adw_withholdingamount ? `-${formatCurrency(docHeader?.adw_withholdingamount)}` : 'Rp 0'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-medium">Grand Total</span>
                        <span className="text-lg font-black text-cyan-400">{formatCurrency(docHeader?.grandtotal)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}

            {/* TAB CONTENT: LINES */}
            {!tabLoading && activeTab === 'lines' && (
              <div className="p-6 sm:p-8 space-y-5 w-full">
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
                        className={`w-full pl-9 pr-7 py-2 rounded-xl text-xs font-mono border outline-none transition ${
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
                            setShowLineModal(true);
                          }}
                          title="Add Line Item"
                          aria-label="Add Line Item"
                          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-md shadow-indigo-500/20 transition cursor-pointer flex items-center justify-center flex-shrink-0"
                        >
                          <Plus className="w-4 h-4 flex-shrink-0" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Lines Table */}
                <div
                  className={`rounded-xl border transition-all duration-300 overflow-hidden w-full min-w-0 max-w-full ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="overflow-x-auto w-full max-w-full touch-pan-x">
                    <table className="w-full text-left text-xs min-w-[700px] border-collapse font-mono">
                      <thead>
                        <tr
                          className={`border-b text-[10px] font-mono uppercase tracking-wider ${
                            isDark ? 'border-slate-800 text-slate-400 bg-slate-950/40' : 'border-slate-200 text-slate-500 bg-slate-50/70'
                          }`}
                        >
                          {!isReadOnly && <th className="px-3 py-3.5 font-semibold text-center w-16">Action</th>}
                          <th
                            onClick={() => handleLineSort('line')}
                            className="px-3 py-3.5 font-semibold cursor-pointer select-none text-center w-12"
                          >
                            <div className="flex items-center justify-center gap-1">
                              <span>#</span>
                              {lineSortField === 'line' && (
                                lineSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleLineSort('product_name')}
                            className="px-4 py-3.5 font-semibold cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-1">
                              <span>Item / Description</span>
                              {lineSortField === 'product_name' && (
                                lineSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleLineSort('qtyentered')}
                            className="px-3 py-3.5 font-semibold text-right cursor-pointer select-none w-20"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Qty</span>
                              {lineSortField === 'qtyentered' && (
                                lineSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                              )}
                            </div>
                          </th>
                          <th className="px-3 py-3.5 font-semibold text-center w-16">UoM</th>
                          <th
                            onClick={() => handleLineSort('priceactual')}
                            className="px-3 py-3.5 font-semibold text-right cursor-pointer select-none w-28"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Unit Price</span>
                              {lineSortField === 'priceactual' && (
                                lineSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                              )}
                            </div>
                          </th>
                          <th className="px-3 py-3.5 font-semibold text-center w-16">Disc</th>
                          <th className="px-3 py-3.5 font-semibold text-center w-20">PPh23</th>
                          <th
                            onClick={() => handleLineSort('linenetamt')}
                            className="px-4 py-3.5 font-semibold text-right cursor-pointer select-none w-32"
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>Total</span>
                              {lineSortField === 'linenetamt' && (
                                lineSortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-cyan-400" /> : <ArrowDown className="w-3 h-3 text-cyan-400" />
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                        {paginatedLines.length > 0 ? (
                          paginatedLines.map((line, idx) => (
                            <tr
                              key={line.id || idx}
                              className={`transition-colors ${
                                isDark ? 'hover:bg-slate-800/40 text-slate-300' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              {!isReadOnly && (
                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedLineForEdit(line);
                                        setShowLineModal(true);
                                      }}
                                      className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                        isDark
                                          ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700'
                                          : 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-200'
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
                              <td className="px-3 py-2 text-center text-slate-400">
                                {line.line || idx + 1}
                              </td>
                              <td className="px-4 py-2">
                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                  {line.product_name || line.charge_name || 'Item'}
                                </div>
                                {line.product_value && (
                                  <span className="text-[11px] text-slate-400 block font-mono">
                                    {line.product_value}
                                  </span>
                                )}
                                {line.description && (
                                  <div className="text-[11px] text-slate-500 italic mt-0.5">
                                    {line.description}
                                  </div>
                                )}
                                {line.m_requisitionline_id ? (
                                  <span className="inline-flex items-center gap-1 mt-1 text-[10px] bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                                    Linked PR #{line.m_requisitionline_id}
                                  </span>
                                ) : null}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {line.qtyentered || line.qtyordered || 0}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-400">
                                {line.uom_symbol || line.uom_name || '-'}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(line.priceactual || line.priceentered)}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-400">
                                {line.discount ? `${line.discount}%` : '-'}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {line.adw_iswithholding === 'Y' ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                    {line.adw_withholdingrate || 2}%
                                  </span>
                                ) : (
                                  <span className="text-slate-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
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
                      isDark ? 'border-slate-800 bg-slate-950/40 text-slate-400' : 'border-slate-200 bg-slate-50/70 text-slate-600'
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
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                      Document Attachments ({attachments.length})
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Upload specifications, quotes, or contracts (max 10MB)
                    </p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {loadingAttachments ? (
                    <div className="col-span-full py-12 text-center text-slate-400 font-mono">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-400 mb-2" />
                      <span>Loading attachments...</span>
                    </div>
                  ) : attachments.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-slate-500 font-mono border border-slate-800 rounded-xl">
                      <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <span>No attachments found for this purchase order.</span>
                    </div>
                  ) : (
                    attachments.map((att, idx) => (
                      <div
                        key={att.id || att.attachment_id || idx}
                        className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between gap-3 font-mono"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                            <File className="w-4 h-4" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-200 truncate">{att.filename}</p>
                            <p className="text-[10px] text-slate-500">
                              {att.filesize ? `${(att.filesize / 1024).toFixed(1)} KB` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => orderApi.downloadAttachment(targetId, att.filename)}
                            className="p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={() => setAttachmentPendingDelete(att)}
                              className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
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

      {/* Line Modal */}
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
      <ConfirmDeleteModal
        isOpen={!!linePendingDelete}
        onClose={() => setLinePendingDelete(null)}
        onConfirm={handleConfirmDeleteLine}
        title="Remove Order Line Item"
        message={`Are you sure you want to delete line #${linePendingDelete?.line} (${linePendingDelete?.product_name || linePendingDelete?.charge_name || 'Item'})?`}
        loading={deletingLineId === linePendingDelete?.id}
      />

      {/* Delete Attachment Modal */}
      <ConfirmDeleteModal
        isOpen={!!attachmentPendingDelete}
        onClose={() => setAttachmentPendingDelete(null)}
        onConfirm={handleDeleteAttachment}
        title="Delete Attachment"
        message={`Are you sure you want to delete "${attachmentPendingDelete?.filename}"?`}
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
        order={docHeader}
        lines={docLines}
        options={{
          clientName: session?.clientName || 'ADYAWINSA GROUP',
          orgName: docHeader?.org_name,
        }}
        isDark={isDark}
      />

      {/* Reauth Modal on 401 */}
      {showReauthModal && (
        <ReauthModal
          isOpen={showReauthModal}
          onClose={() => setShowReauthModal(false)}
          onSuccess={() => {
            setShowReauthModal(false);
            setInvalidToken(false);
          }}
        />
      )}
    </ModuleLayout>
  );
}
