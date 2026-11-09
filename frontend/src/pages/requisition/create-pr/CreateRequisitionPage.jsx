import React, { useState, useEffect, useMemo } from 'react';
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
  ChevronsLeft,
  ChevronsRight,
  Upload,
  UploadCloud,
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
  FileSpreadsheet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import ModuleLayout from '../../../layouts/ModuleLayout';
import PageLoader from '../../../components/ui/PageLoader';
import { requisitionApi } from '../../../api/requisition';
import { getCustomSelectStyles } from '../../../components/ui/selectStyles';
import CustomDatePicker from '../../../components/ui/CustomDatePicker';
import { decryptDocumentId } from '../../../utils/crypto';
import ReauthModal from '../../../components/common/ReauthModal';
import ConfirmDeleteModal from '../../../components/common/ConfirmDeleteModal';
import AddLineModal from './components/AddLineModal';
import UploadLinesModal from './components/UploadLinesModal';
import ChatTab from './components/ChatTab';
import ChangeLogTab from './components/ChangeLogTab';
import OrderTab from './components/OrderTab';
import PrintPreviewModal from './components/PrintPreviewModal';

export default function CreateRequisitionPage({ documentIdParam: propDocId }) {
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
  const orgIdDefault = session?.orgId || session?.org_id || 0;
  const userId = session?.user?.id || session?.user?.userId || 0;

  // Active tab state
  const [activeTab, setActiveTab] = useState('header');

  // Master options state
  const [options, setOptions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [invalidToken, setInvalidToken] = useState(false);

  // Document data for existing requisition
  const [docHeader, setDocHeader] = useState(null);
  const [docLines, setDocLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [linesLoaded, setLinesLoaded] = useState(false);

  // Form Fields State
  const [orgId, setOrgId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [pricelistId, setPricelistId] = useState(1000208); // Default Purchase IDR
  const [priorityRule, setPriorityRule] = useState('5'); // Default Medium
  const [dateDoc, setDateDoc] = useState(todayStr);
  const [dateRequired, setDateRequired] = useState(todayStr);
  const [costCenterId, setCostCenterId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [periodId, setPeriodId] = useState('');
  const [checkedById, setCheckedById] = useState('');
  const [approvedById, setApprovedById] = useState('');
  const [description, setDescription] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [tabLoading, setTabLoading] = useState(false);
  const [showAddLineModal, setShowAddLineModal] = useState(false);
  const [selectedLineForEdit, setSelectedLineForEdit] = useState(null);
  const [deletingLineId, setDeletingLineId] = useState(null);
  const [linePendingDelete, setLinePendingDelete] = useState(null);

  // Attachments state
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentError, setAttachmentError] = useState(null);
  const [attachmentPendingDelete, setAttachmentPendingDelete] = useState(null);
  const [deletingAttachment, setDeletingAttachment] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [changeLogCount, setChangeLogCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const totalLineCount = linesLoaded ? docLines.length : (docHeader?.line_count ?? 0);
  const fileInputRef = React.useRef(null);
  const lineFileInputRef = React.useRef(null);

  const handleLineFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSuccessMessage(`File "${file.name}" ready for line item import.`);
    setTimeout(() => setSuccessMessage(null), 4000);
    if (lineFileInputRef.current) {
      lineFileInputRef.current.value = '';
    }
  };

  // Document Action, Print, and Delete modals
  const [showDocActionModal, setShowDocActionModal] = useState(false);
  const [actionPendingConfirm, setActionPendingConfirm] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDeleteDocModal, setShowDeleteDocModal] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const [showUploadLinesModal, setShowUploadLinesModal] = useState(false);
  const [isUploadingExcel, setIsUploadingExcel] = useState(false);
  const [excelUploadProgress, setExcelUploadProgress] = useState({
    total: 0,
    current: 0,
    percent: 0,
    success: 0,
    failed: 0,
    currentRowCode: '',
  });

  // Line items Search, Sort, and Pagination states
  const [lineSearch, setLineSearch] = useState('');
  const [lineSortField, setLineSortField] = useState('line');
  const [lineSortDir, setLineSortDir] = useState('asc');
  const [linePage, setLinePage] = useState(1);
  const [lineLimit, setLineLimit] = useState(10);

  const handleLineSort = (field) => {
    if (lineSortField === field) {
      setLineSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setLineSortField(field);
      setLineSortDir('asc');
    }
  };

  const filteredLines = useMemo(() => {
    if (!docLines || docLines.length === 0) return [];
    if (!lineSearch.trim()) return docLines;
    const q = lineSearch.toLowerCase().trim();
    return docLines.filter(
      (l) =>
        (l.product_code || '').toLowerCase().includes(q) ||
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

      if (['line', 'qty', 'priceactual'].includes(lineSortField)) {
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

  const handleLineSaved = async (mode = 'created') => {
    if (!targetId) return;
    try {
      const [detailRes, linesRes] = await Promise.all([
        requisitionApi.getRequisitionDetail(targetId),
        requisitionApi.getRequisitionLines(targetId),
      ]);
      if (detailRes && detailRes.data) {
        applyRecordData(detailRes.data.header, linesRes?.data || [], false);
      }
      let msg = 'Requisition line item added successfully.';
      if (mode === 'updated') {
        msg = 'Requisition line updated successfully.';
      } else if (mode === 'deleted') {
        msg = 'Requisition line item deleted successfully.';
      }
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to reload lines after saving:', err);
    }
  };

  const handleDeleteLine = (line) => {
    if (!line?.id) return;
    setLinePendingDelete(line);
  };

  const handleConfirmDelete = async () => {
    if (!targetId || !linePendingDelete?.id) return;

    setDeletingLineId(linePendingDelete.id);
    try {
      await requisitionApi.deleteRequisitionLine(targetId, linePendingDelete.id, session?.token);
      await handleLineSaved('deleted');
      setLinePendingDelete(null);
    } catch (err) {
      console.error('Failed to delete requisition line:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete line item via API Engine.';
      if (
        err.response?.status === 401 ||
        errMsg.includes('Token has expired') ||
        errMsg.includes('401')
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

  const handleExecuteExcelImport = async (parsedRows) => {
    if (!parsedRows || parsedRows.length === 0 || !targetId) return;

    // Immediately switch to Lines tab and close import modal so user views real-time progress on the table
    setActiveTab('lines');
    setShowUploadLinesModal(false);
    setIsUploadingExcel(true);

    const total = parsedRows.length;
    let success = 0;
    let failed = 0;
    const failedRows = [];

    setExcelUploadProgress({
      total,
      current: 0,
      percent: 0,
      success: 0,
      failed: 0,
      currentRowCode: '',
    });

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      const current = i + 1;
      const percent = Math.round((current / total) * 100);
      const rowCode = row.product_code || `Row #${row.rowNumber}`;

      setExcelUploadProgress({
        total,
        current,
        percent,
        success,
        failed,
        currentRowCode: rowCode,
      });

      // Validation
      if (!row.product_code) {
        failed++;
        failedRows.push({
          ...row,
          error: 'Product Code is empty / required.',
        });
        continue;
      }

      if (!row.qty || Number(row.qty) <= 0) {
        failed++;
        failedRows.push({
          ...row,
          error: 'Quantity must be a positive number greater than 0.',
        });
        continue;
      }

      try {
        await requisitionApi.createRequisitionLine(
          targetId,
          {
            product_code: row.product_code,
            qty: Number(row.qty),
            priceactual: Number(row.price || 0),
            description: row.description || '',
          },
          session?.token
        );
        success++;
      } catch (err) {
        console.error(`Error importing row ${row.rowNumber}:`, err);
        const errMsg =
          err.response?.data?.message ||
          err.message ||
          'Failed to add line item via API Engine';
        failed++;
        failedRows.push({
          ...row,
          error: errMsg,
        });
      }
    }

    // Keep loading effect active while fetching the newly created requisition lines
    setLoadingLines(true);
    try {
      const [detailRes, linesRes] = await Promise.all([
        requisitionApi.getRequisitionDetail(targetId),
        requisitionApi.getRequisitionLines(targetId),
      ]);
      if (detailRes && detailRes.data) {
        applyRecordData(detailRes.data.header, linesRes?.data || [], false);
      }
    } catch (err) {
      console.error('Failed to refresh requisition lines after import:', err);
    } finally {
      setIsUploadingExcel(false);
      setLoadingLines(false);
    }

    // Report results to user
    if (failedRows.length > 0) {
      // Auto-generate error excel
      try {
        const errorHeaders = [
          'Product Code',
          'Quantity',
          'Price',
          'Description',
          'Error Details',
        ];
        const errorData = failedRows.map((fr) => [
          fr.product_code,
          fr.qty,
          fr.price,
          fr.description,
          fr.error,
        ]);
        const errWs = XLSX.utils.aoa_to_sheet([errorHeaders, ...errorData]);
        errWs['!cols'] = [
          { wch: 22 },
          { wch: 12 },
          { wch: 16 },
          { wch: 36 },
          { wch: 48 },
        ];
        const errWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(errWb, errWs, 'Failed Rows');
        const filename = `requisition-import-errors-${Date.now()}.xlsx`;
        XLSX.writeFile(errWb, filename);
      } catch (dlErr) {
        console.error('Failed to auto-download error excel:', dlErr);
      }

      await Swal.fire({
        icon: 'warning',
        title: 'Import Completed with Errors',
        html: `
          <div style="font-family: monospace; font-size: 13px; text-align: left; line-height: 1.6;">
            <p>Processed total <b>${total}</b> rows:</p>
            <p style="color: #10b981;">✓ Success: <b>${success}</b> rows</p>
            <p style="color: #ef4444;">✗ Failed: <b>${failed}</b> rows</p>
            <div style="margin-top: 12px; padding: 10px; background: ${
              isDark ? '#1e293b' : '#f1f5f9'
            }; border-radius: 8px; font-size: 12px; color: #f59e0b;">
              ⚠️ An Excel report containing the failed rows with the specific error reasons in the rightmost column has been automatically downloaded to your device.
            </div>
          </div>
        `,
        confirmButtonText: 'Understood',
        confirmButtonColor: '#4f46e5',
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    } else {
      await Swal.fire({
        icon: 'success',
        title: 'Import Successful!',
        html: `
          <div style="font-family: monospace; font-size: 13px; text-align: center; line-height: 1.6;">
            <p>All <b>${total}</b> line items have been successfully created and linked to this requisition.</p>
          </div>
        `,
        confirmButtonText: 'Great!',
        confirmButtonColor: '#10b981',
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    }
  };

  const handleExecuteDocAction = async (docAction) => {
    if (!targetId || !docAction) return;
    setProcessingAction(true);
    setError(null);
    try {
      await requisitionApi.processRequisition(
        targetId,
        docAction,
        session?.token
      );
      setSuccessMessage(`Document action "${docAction}" executed successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      setShowDocActionModal(false);
      setActionPendingConfirm(null);

      // Refresh document details
      const detailRes = await requisitionApi.getRequisitionDetail(targetId);
      if (detailRes && detailRes.data) {
        const { header, lines } = detailRes.data;
        applyRecordData(header, lines, true);
      }
    } catch (err) {
      console.error('Failed to execute document action:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to execute document action via API Engine.';
      if (
        err.response?.status === 401 ||
        errMsg.includes('Token has expired') ||
        errMsg.includes('401')
      ) {
        setShowReauthModal(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!targetId) return;
    setDeletingDoc(true);
    setError(null);
    try {
      await requisitionApi.deleteRequisition(targetId, session?.token);
      setShowDeleteDocModal(false);
      navigate('/create-pr', { replace: true });
    } catch (err) {
      console.error('Failed to delete requisition:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete requisition document via API Engine.';
      if (
        err.response?.status === 401 ||
        errMsg.includes('Token has expired') ||
        errMsg.includes('401')
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

  const applyRecordData = (header, lines, populateForm = true) => {
    if (header) {
      setDocHeader(header);
      if (populateForm) {
        setOrgId(header.org_id || '');
        setWarehouseId(header.warehouse_id || '');
        setPricelistId(header.pricelist_id || 1000208);
        setPriorityRule(header.priority_rule || '5');
        setDateDoc(header.datedoc ? header.datedoc.split('T')[0] : todayStr);
        setDateRequired(
          header.daterequired ? header.daterequired.split('T')[0] : todayStr
        );
        setCostCenterId(header.cost_center_id || '');
        setCustomerId(header.c_bpartner_id || '');
        setPeriodId(header.c_period_id || '');
        setCheckedById(header.adw_ad_user_checked_id || '');
        setApprovedById(header.adw_ad_user_approved_id || '');
        setDescription(header.description || '');
      }
    }
    if (lines) {
      setDocLines(lines);
      setLinesLoaded(true);
    }
  };

  const loadLines = async (force = false) => {
    if (isNew || !targetId) return;
    if (linesLoaded && !force) return;
    setLoadingLines(true);
    try {
      const res = await requisitionApi.getRequisitionLines(targetId);
      if (res && res.data) {
        setDocLines(res.data);
        setLinesLoaded(true);
      }
    } catch (err) {
      console.error('Failed to load requisition lines:', err);
    } finally {
      setLoadingLines(false);
    }
  };

  const handleOpenPrintModal = async () => {
    if (!linesLoaded && !isNew && targetId) {
      await loadLines(true);
    }
    setShowPrintModal(true);
  };

  const loadAttachments = async () => {
    if (isNew || !targetId) return;
    setLoadingAttachments(true);
    setAttachmentError(null);
    try {
      const res = await requisitionApi.getAttachments(targetId);
      if (res && res.data) {
        setAttachments(res.data);
      } else {
        setAttachments([]);
      }
    } catch (err) {
      console.error('Failed to load attachments:', err);
      setAttachmentError('Failed to load attachments from iDempiere.');
    } finally {
      setLoadingAttachments(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatAttachmentDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files || e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (file.size > 10 * 1024 * 1024) {
      setAttachmentError('File size exceeds the 10 MB limit.');
      return;
    }

    setUploadingAttachment(true);
    setAttachmentError(null);
    try {
      await requisitionApi.uploadAttachment(targetId, file, session?.token);
      setSuccessMessage(`File "${file.name}" uploaded successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadAttachments();
    } catch (err) {
      console.error('Failed to upload attachment:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to upload attachment.';
      if (
        errMsg.includes('401') ||
        errMsg.includes('Token has expired') ||
        errMsg.includes('token')
      ) {
        setShowReauthModal(true);
      } else {
        setAttachmentError(errMsg);
      }
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmDeleteAttachment = async () => {
    if (!attachmentPendingDelete) return;
    setDeletingAttachment(true);
    setAttachmentError(null);
    try {
      await requisitionApi.deleteAttachment(
        targetId,
        attachmentPendingDelete.file_name,
        session?.token
      );
      setSuccessMessage(
        `Attachment "${attachmentPendingDelete.file_name}" deleted successfully.`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      setAttachmentPendingDelete(null);
      await loadAttachments();
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete attachment.';
      if (
        errMsg.includes('401') ||
        errMsg.includes('Token has expired') ||
        errMsg.includes('token')
      ) {
        setShowReauthModal(true);
      } else {
        setAttachmentError(errMsg);
      }
    } finally {
      setDeletingAttachment(false);
    }
  };

  // Manage PDF preview blob URL
  useEffect(() => {
    if (previewAttachment && previewAttachment.is_pdf) {
      let active = true;
      setLoadingPdf(true);
      const url = requisitionApi.getAttachmentDownloadUrl(
        targetId,
        previewAttachment.file_name,
        false
      );
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
      setLoadingPdf(false);
    }
  }, [previewAttachment, targetId]);

  const handleTabChange = async (newTab) => {
    if (newTab === activeTab) return;
    setActiveTab(newTab);

    // Refresh record data from backend when switching tabs
    if (!isNew && targetId) {
      setTabLoading(true);
      const startTime = Date.now();
      try {
        if (newTab === 'lines') {
          await loadLines();
        } else if (newTab === 'attachments') {
          await loadAttachments();
        } else if (newTab === 'chat') {
          const res = await requisitionApi.getChat(targetId).catch(() => null);
          if (res && res.data) setChatCount(res.data.length);
        } else if (newTab === 'order') {
          const res = await requisitionApi.getOrders(targetId).catch(() => null);
          if (res && res.data) setOrderCount(res.data.length);
        } else if (newTab === 'changelog') {
          const res = await requisitionApi.getChangeLogs(targetId).catch(() => null);
          if (res && res.data) setChangeLogCount(res.data.length);
        } else if (newTab === 'header') {
          const detailRes = await requisitionApi.getRequisitionDetail(targetId);
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

  // Load master options & requisition detail
  useEffect(() => {
    setLoading(true);
    setError(null);

    // If an encrypted token is provided but cannot be decrypted
    if (!isNew && !targetId) {
      setInvalidToken(true);
      setLoading(false);
      return;
    }

    const loadOptions = requisitionApi.getMasterOptions({
      client_id: clientId,
      org_id: orgIdDefault,
    });

    const loadDetail =
      !isNew && targetId
        ? requisitionApi.getRequisitionDetail(targetId)
        : Promise.resolve(null);

    const loadAtts =
      !isNew && targetId
        ? requisitionApi.getAttachments(targetId).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] });

    const loadChatData =
      !isNew && targetId
        ? requisitionApi.getChat(targetId).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] });

    const loadLogsData =
      !isNew && targetId
        ? requisitionApi.getChangeLogs(targetId).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] });

    const loadOrdersData =
      !isNew && targetId
        ? requisitionApi.getOrders(targetId).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] });

    Promise.all([loadOptions, loadDetail, loadAtts, loadChatData, loadLogsData, loadOrdersData])
      .then(([optRes, detailRes, attRes, chatRes, logsRes, ordersRes]) => {
        const optData = optRes.data || {};
        setOptions(optData);

        if (attRes && attRes.data) {
          setAttachments(attRes.data);
        }

        if (chatRes && chatRes.data) {
          setChatCount(chatRes.data.length);
        }

        if (logsRes && logsRes.data) {
          setChangeLogCount(logsRes.data.length);
        }

        if (ordersRes && ordersRes.data) {
          setOrderCount(ordersRes.data.length);
        }

        if (detailRes && detailRes.data) {
          const { header } = detailRes.data;
          applyRecordData(header, null, true);
        } else {
          // Defaults for new record
          if (optData.organizations?.length > 0) {
            const matchedOrg = optData.organizations.find(
              (o) => o.id === orgIdDefault
            );
            setOrgId(matchedOrg ? matchedOrg.id : optData.organizations[0].id);
          }
          if (optData.warehouses?.length > 0) {
            setWarehouseId(optData.warehouses[0].id);
          }
          if (optData.pricelists?.length > 0) {
            const purchaseIdr = optData.pricelists.find((pl) =>
              pl.text.toLowerCase().includes('purchase idr')
            );
            setPricelistId(purchaseIdr ? purchaseIdr.id : optData.pricelists[0].id);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load requisition data:', err);
        setError('Failed to load master data or requisition details.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [clientId, orgIdDefault, isNew, targetId]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError(null);

    if (!orgId || !warehouseId || !pricelistId || !priorityRule || !costCenterId) {
      setError(
        'Please fill in all mandatory fields (Organization, Warehouse, Price List, Priority, Cost Center).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        org_id: Number(orgId),
        warehouse_id: Number(warehouseId),
        pricelist_id: Number(pricelistId),
        priority_rule: String(priorityRule),
        datedoc: dateDoc,
        date_required: dateRequired,
        cost_center_id: costCenterId ? Number(costCenterId) : null,
        description: description.trim(),
        c_bpartner_id: customerId ? Number(customerId) : null,
        c_period_id: periodId ? Number(periodId) : null,
        adw_ad_user_checked_id: checkedById ? Number(checkedById) : null,
        adw_ad_user_approved_id: approvedById ? Number(approvedById) : null,
      };

      if (isNew) {
        await requisitionApi.createRequisition(
          payload,
          { client_id: clientId, user_id: userId },
          session?.token
        );
        navigate('/create-pr', { replace: true });
      } else {
        await requisitionApi.updateRequisition(
          targetId,
          payload,
          session?.token
        );
        setSuccessMessage('Requisition header updated successfully.');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err) {
      console.error('Failed to save requisition:', err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to process requisition via API Engine.';

      if (
        err.response?.status === 401 ||
        errMsg.includes('Token has expired') ||
        errMsg.includes('401')
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

    // Automatically re-submit the requisition header save with the fresh token
    setSubmitting(true);
    try {
      const payload = {
        org_id: Number(orgId),
        warehouse_id: Number(warehouseId),
        pricelist_id: Number(pricelistId),
        priority_rule: String(priorityRule),
        datedoc: dateDoc,
        date_required: dateRequired,
        cost_center_id: costCenterId ? Number(costCenterId) : null,
        description: description.trim(),
        c_bpartner_id: customerId ? Number(customerId) : null,
        c_period_id: periodId ? Number(periodId) : null,
        adw_ad_user_checked_id: checkedById ? Number(checkedById) : null,
        adw_ad_user_approved_id: approvedById ? Number(approvedById) : null,
      };

      if (isNew) {
        await requisitionApi.createRequisition(
          payload,
          { client_id: clientId, user_id: userId },
          newToken
        );
        navigate('/create-pr', { replace: true });
      } else {
        await requisitionApi.updateRequisition(targetId, payload, newToken);
        setSuccessMessage('Requisition header updated successfully.');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (retryErr) {
      console.error('Retry save failed:', retryErr);
      setError(
        retryErr.response?.data?.message ||
          retryErr.message ||
          'Failed to save requisition after token refresh.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Form Select Styles aligned with the index page monospace font
  const formSelectStyles = getCustomSelectStyles(isDark, {
    borderRadius: '0.5rem',
    minHeight: '38px',
    fontSize: '0.75rem',
  });

  const orgOptions =
    options?.organizations?.map((org) => ({ value: org.id, label: org.text })) || [];
  const warehouseOptions =
    options?.warehouses?.map((wh) => ({ value: wh.id, label: wh.text })) || [];
  const pricelistOptions =
    options?.pricelists?.map((pl) => ({
      value: pl.id,
      label: pl.text,
      precision: pl.precision ?? 2,
    })) || [];
  const priorityOptions =
    options?.priorities?.map((prio) => ({
      value: String(prio.value),
      label: prio.name,
    })) || [];
  const costCenterOptions = [
    { value: '', label: '- Select -' },
    ...(options?.cost_centers?.map((cc) => ({ value: cc.id, label: cc.text })) || []),
  ];
  const customerOptions = [
    { value: '', label: '- Select Customer -' },
    ...(options?.customers?.map((cust) => ({ value: cust.id, label: cust.text })) || []),
  ];
  const periodOptions = [
    { value: '', label: '- Select -' },
    ...(options?.periods?.map((per) => ({ value: per.id, label: per.text })) || []),
  ];
  const userOptions = [
    { value: '', label: '- Select -' },
    ...(options?.users?.map((u) => ({ value: u.id, label: u.text })) || []),
  ];

  const clientDisplayName =
    options?.client_name || session?.clientName || 'PT. Adyawinsa Plastics Industry';

  const selectedOrg = orgOptions.find((o) => o.value === Number(orgId)) || null;
  const selectedWh = warehouseOptions.find((w) => w.value === Number(warehouseId)) || null;
  const selectedPl = pricelistOptions.find((p) => p.value === Number(pricelistId)) || null;
  const activePricePrecision =
    selectedPl?.precision ??
    docHeader?.pricelist_precision ??
    2;
  const selectedPrio =
    priorityOptions.find((p) => p.value === String(priorityRule)) || null;
  const selectedCc =
    costCenterOptions.find((c) => c.value === Number(costCenterId)) || costCenterOptions[0];
  const selectedCustomer =
    customerOptions.find((c) => c.value === Number(customerId)) || customerOptions[0];
  const selectedPeriod =
    periodOptions.find((p) => p.value === Number(periodId)) || periodOptions[0];
  const selectedCheckedBy =
    userOptions.find((u) => u.value === Number(checkedById)) || userOptions[0];
  const selectedApprovedBy =
    userOptions.find((u) => u.value === Number(approvedById)) || userOptions[0];

  const displayDocNo = isNew ? '** New **' : docHeader?.documentno || '** View **';
  const displayStatus = isNew ? 'Drafted' : docHeader?.status_label || 'Drafted';

  // Read-only logic:
  // In iDempiere: Completed ('CO', 'CL'), Voided ('VO'), Reversed ('RE') are read-only.
  // Draft ('DR', 'IN') and In Progress ('IP') are editable!
  const currentDocStatus = (docHeader?.docstatus || 'DR').toUpperCase();
  const readOnlyStatuses = ['CO', 'CL', 'VO', 'RE'];
  const isReadOnly = !isNew && readOnlyStatuses.includes(currentDocStatus);

  return (
    <ModuleLayout
      pageTitle={isNew ? 'Create Purchase Requisition' : `Requisition ${displayDocNo}`}
      rootMenuId={1000000}
      rootMenuName="Procurement"
    >
      {loading ? (
        <PageLoader
          message="Loading Requisition Details..."
          subtext="Authenticating record and master options from Enterprise Core"
        />
      ) : invalidToken ? (
        <div className="p-8 text-center space-y-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-sm max-w-md mx-auto">
            Invalid or expired document link. Please return to the requisition list.
          </div>
          <button
            type="button"
            onClick={() => navigate('/create-pr')}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            Back to Requisition List
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
                  {isNew ? 'New Requisition' : displayDocNo}
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
                      ? 'Create a new purchase requisition details'
                      : 'Manage requisition details and lines'}
                  </span>
                </p>
              </div>
            </div>

            {/* Top Right Action Icons Bar */}
            <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0">
              {/* Back to List (Icon only) */}
              <button
                type="button"
                onClick={() => navigate('/create-pr')}
                disabled={submitting || processingAction || deletingDoc}
                title={isNew ? 'Cancel & Back to List' : 'Back to Requisition List'}
                aria-label="Back to List"
                className={`p-2.5 rounded-xl border transition-all cursor-pointer shadow-sm flex items-center justify-center ${
                  isDark
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Save Changes / Create Requisition (Icon only) */}
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || processingAction || deletingDoc}
                  title={isNew ? 'Create Requisition' : 'Save Changes'}
                  aria-label={isNew ? 'Create Requisition' : 'Save Changes'}
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
                  onClick={handleOpenPrintModal}
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
                  title="Delete Requisition Document"
                  aria-label="Delete Requisition Document"
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
                isDark
                  ? 'border-slate-800 bg-slate-950/40'
                  : 'border-slate-200 bg-slate-50/70'
              }`}
            >
              <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Tabs">
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
                  title="Requisition Lines"
                  className={`whitespace-nowrap py-3.5 px-1 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${
                    isNew
                      ? 'border-transparent text-slate-500 cursor-not-allowed opacity-50'
                      : activeTab === 'lines'
                      ? 'border-cyan-400 text-cyan-400 cursor-pointer'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                >
                  <List className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Requisition Lines</span>
                  {!isNew && totalLineCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {totalLineCount}
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
                  <span className="hidden sm:inline">Chat</span>
                  {!isNew && chatCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {chatCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => !isNew && handleTabChange('order')}
                  disabled={isNew}
                  title="Order"
                  className={`whitespace-nowrap py-3.5 px-1 border-b-2 text-xs font-mono font-semibold flex items-center gap-1.5 sm:gap-2 transition-colors ${
                    isNew
                      ? 'border-transparent text-slate-500 cursor-not-allowed opacity-50'
                      : activeTab === 'order'
                      ? 'border-cyan-400 text-cyan-400 cursor-pointer'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Order</span>
                  {!isNew && orderCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {orderCount}
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
                  <span className="hidden sm:inline">Change Log</span>
                  {!isNew && changeLogCount > 0 && (
                    <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {changeLogCount}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Card Body with Tab Loading Effect */}
            {tabLoading ? (
              <div className="p-12 sm:p-20 flex flex-col items-center justify-center min-h-[380px] space-y-4 animate-fadeIn font-mono">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-cyan-400 animate-pulse" />
                  </div>
                </div>
                <div className="text-center space-y-1.5">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    Loading {activeTab === 'header' ? 'Header Details' : activeTab === 'lines' ? 'Requisition Lines' : activeTab === 'attachments' ? 'Attachments' : activeTab === 'chat' ? 'Discussions' : activeTab === 'order' ? 'Linked Orders' : 'Change Log'}...
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Retrieving latest real-time ERP data from backend
                  </p>
                </div>
              </div>
            ) : (
              <>

            {/* Tab Content: Header Tab */}
            {activeTab === 'header' && (
              <form
                onSubmit={handleSubmit}
                className="p-4 sm:p-6 space-y-5 w-full"
              >
                {/* Section 1: General Information */}
                <div>
                  <h3
                    className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center mb-2.5 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    <span className="w-1 h-5 bg-blue-500 rounded mr-3 inline-block" />
                    General Information
                  </h3>

                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 p-5 rounded-xl border shadow-sm ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-white border-slate-200'
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

                      {/* Customer */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Customer
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={selectedCustomer}
                            onChange={(opt) => setCustomerId(opt ? opt.value : '')}
                            options={customerOptions}
                            styles={formSelectStyles}
                            placeholder="- Select Customer -"
                            isDisabled={isReadOnly}
                            isSearchable
                            menuPlacement="auto"
                            minMenuHeight={280}
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Periode */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Periode
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={selectedPeriod}
                            onChange={(opt) => setPeriodId(opt ? opt.value : '')}
                            options={periodOptions}
                            styles={formSelectStyles}
                            placeholder="- Select -"
                            isDisabled={isReadOnly}
                            isSearchable
                            menuPlacement="auto"
                            minMenuHeight={280}
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
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
                            placeholder="Enter document description..."
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
                            isDisabled={isReadOnly}
                            isSearchable
                            menuPlacement="auto"
                            minMenuHeight={280}
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            menuPosition="fixed"
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
                            value={selectedPrio}
                            onChange={(opt) => setPriorityRule(opt ? opt.value : '')}
                            options={priorityOptions}
                            styles={formSelectStyles}
                            placeholder="- Select Priority -"
                            isDisabled={isReadOnly}
                            isSearchable={false}
                            menuPlacement="auto"
                            minMenuHeight={280}
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Date Required */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Date Required <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <CustomDatePicker
                            value={dateRequired}
                            onChange={(val) => setDateRequired(val)}
                            placeholder="Select Date"
                            isDark={isDark}
                            iconPosition="right"
                            displayFormat="D MMM YYYY"
                            inputClassName="font-mono text-xs"
                            disabled={isReadOnly}
                            required
                          />
                        </div>
                      </div>

                      {/* Date Doc */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Date Doc <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <CustomDatePicker
                            value={dateDoc}
                            onChange={(val) => setDateDoc(val)}
                            placeholder="Select Date"
                            isDark={isDark}
                            iconPosition="right"
                            displayFormat="D MMM YYYY"
                            inputClassName="font-mono text-xs"
                            disabled={isReadOnly}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Request Details */}
                <div>
                  <h3
                    className={`text-sm font-bold uppercase tracking-wider font-mono flex items-center mb-2.5 ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    <span className="w-1 h-5 bg-blue-500 rounded mr-3 inline-block" />
                    Request Details
                  </h3>

                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5 p-5 rounded-xl border shadow-sm ${
                      isDark
                        ? 'bg-slate-900/60 border-slate-800'
                        : 'bg-white border-slate-200'
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
                            value={selectedWh}
                            onChange={(opt) => setWarehouseId(opt ? opt.value : '')}
                            options={warehouseOptions}
                            styles={formSelectStyles}
                            placeholder="- Select Warehouse -"
                            isDisabled={isReadOnly}
                            isSearchable
                            menuPlacement="top"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
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
                            value={selectedPl}
                            onChange={(opt) => setPricelistId(opt ? opt.value : '')}
                            options={pricelistOptions}
                            styles={formSelectStyles}
                            placeholder="- Select Price List -"
                            isDisabled={isReadOnly}
                            isSearchable
                            menuPlacement="top"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            menuPosition="fixed"
                          />
                        </div>
                      </div>

                      {/* Cost Center */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 sm:items-center gap-2 sm:gap-4">
                        <label className="text-left sm:text-right text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                          Cost Center <span className="text-rose-500 ml-0.5">*</span>
                        </label>
                        <div className="col-span-1 sm:col-span-2">
                          <Select
                            value={selectedCc}
                            onChange={(opt) => setCostCenterId(opt ? opt.value : '')}
                            options={costCenterOptions}
                            styles={formSelectStyles}
                            placeholder="- Select -"
                            isDisabled={isReadOnly}
                            isSearchable
                            menuPlacement="top"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
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
                            value={selectedCheckedBy}
                            onChange={(opt) => setCheckedById(opt ? opt.value : '')}
                            options={userOptions}
                            styles={formSelectStyles}
                            placeholder="- Select -"
                            isDisabled={isReadOnly}
                            isSearchable
                            menuPlacement="top"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
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
                            value={selectedApprovedBy}
                            onChange={(opt) => setApprovedById(opt ? opt.value : '')}
                            options={userOptions}
                            styles={formSelectStyles}
                            placeholder="- Select -"
                            isDisabled={isReadOnly}
                            isSearchable
                            menuPlacement="top"
                            menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                            menuPosition="fixed"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Tab Content: Lines Tab */}
            {activeTab === 'lines' && (
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
                        Requisition Line Items ({totalLineCount})
                      </h3>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                    {/* Search Box to the left of Add Line button */}
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
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                        >
                          ×
                        </button>
                      )}
                    </div>

                    {!isReadOnly && !isNew && (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Add Line Action (Icon Only) */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedLineForEdit(null);
                            setShowAddLineModal(true);
                          }}
                          title="Add Line Item"
                          aria-label="Add Line Item"
                          className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-md shadow-indigo-500/20 transition cursor-pointer flex items-center justify-center flex-shrink-0"
                        >
                          <Plus className="w-4 h-4 flex-shrink-0" />
                        </button>

                        {/* Upload Lines Action (Opens Large Import Modal) */}
                        <button
                          type="button"
                          onClick={() => setShowUploadLinesModal(true)}
                          title="Upload Lines (Excel / CSV)"
                          aria-label="Upload Lines"
                          className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-center flex-shrink-0 shadow-sm ${
                            isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-800'
                              : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
                          }`}
                        >
                          <Upload className="w-4 h-4 flex-shrink-0" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Table Container styled identically to front table with compact border radius */}
                <div
                  className={`rounded-xl border transition-all duration-300 overflow-hidden w-full min-w-0 max-w-full ${
                    isDark
                      ? 'bg-slate-900/80 border-slate-800'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="overflow-x-auto w-full max-w-full touch-pan-x">
                    <table className="w-full text-left text-xs min-w-[700px]">
                      <thead>
                        <tr
                          className={`border-b text-[10px] font-mono uppercase tracking-wider font-semibold ${
                            isDark
                              ? 'border-slate-800 text-slate-400 bg-slate-950/40'
                              : 'border-slate-200 text-slate-500 bg-slate-50/70'
                          }`}
                        >
                          {renderLineSortHeader('Line', 'line', 'center', 'w-16')}
                          {renderLineSortHeader('Product Code', 'product_code')}
                          {renderLineSortHeader('Product Name', 'product_name')}
                          {renderLineSortHeader('Qty', 'qty', 'right')}
                          {renderLineSortHeader('UOM', 'uom_name')}
                          {renderLineSortHeader('Unit Price', 'priceactual', 'right')}
                          {renderLineSortHeader('Description', 'description')}
                          <th className="px-5 py-3.5 text-center w-14 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody
                        className={`divide-y ${
                          isDark ? 'divide-slate-800/60' : 'divide-slate-100'
                        }`}
                      >
                        {isUploadingExcel ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="py-14 text-center font-mono"
                            >
                              <div className="max-w-md mx-auto space-y-4 px-4 animate-fadeIn">
                                <div className="relative inline-flex items-center justify-center">
                                  <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/20">
                                    <FileSpreadsheet className="w-8 h-8 text-emerald-400 animate-pulse" />
                                  </div>
                                  <Loader2 className="w-20 h-20 absolute text-cyan-400 animate-spin opacity-80" />
                                </div>

                                <div>
                                  <h4 className={`text-sm sm:text-base font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    Importing Excel Requisition Lines...
                                  </h4>
                                  <p className="text-[11px] text-slate-400 mt-1">
                                    Processing row <b>{excelUploadProgress.current}</b> of <b>{excelUploadProgress.total}</b> ({excelUploadProgress.percent}%)
                                  </p>
                                </div>

                                {/* Real-time Progress Bar */}
                                <div className="space-y-1.5 text-left">
                                  <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-indigo-500 rounded-full transition-all duration-300 shadow-md shadow-cyan-500/20"
                                      style={{ width: `${excelUploadProgress.percent}%` }}
                                    />
                                  </div>
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                    <span className="truncate max-w-[240px]">
                                      {excelUploadProgress.currentRowCode ? `Processing: ${excelUploadProgress.currentRowCode}` : 'Preparing import...'}
                                    </span>
                                    <span className="font-bold text-cyan-400">
                                      {excelUploadProgress.percent}% Completed
                                    </span>
                                  </div>
                                </div>

                                {/* Live Counters */}
                                <div className="flex items-center justify-center gap-3 pt-1">
                                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                    ✓ {excelUploadProgress.success} Success
                                  </span>
                                  {excelUploadProgress.failed > 0 && (
                                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                      ✗ {excelUploadProgress.failed} Failed
                                    </span>
                                  )}
                                </div>

                                <p className="text-[10px] text-slate-500">
                                  Requisition lines will populate automatically upon completion.
                                </p>
                              </div>
                            </td>
                          </tr>
                        ) : loadingLines ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="py-16 text-center font-mono text-slate-400"
                            >
                              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-cyan-400" />
                              Loading requisition line items...
                            </td>
                          </tr>
                        ) : paginatedLines.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="py-12 text-center font-mono text-slate-400"
                            >
                              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              {docLines.length === 0
                                ? 'No requisition line items found.'
                                : 'No matching line items found for your search.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedLines.map((line) => (
                            <tr
                              key={line.id}
                              onClick={() => {
                                if (!isReadOnly) {
                                  setSelectedLineForEdit(line);
                                  setShowAddLineModal(true);
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
                              <td
                                className={`px-5 py-2 font-mono text-[10px] text-center ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {line.line}
                              </td>
                              <td
                                className={`px-5 py-2 font-mono text-[10px] ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {line.product_code || '-'}
                              </td>
                              <td
                                className={`px-5 py-2 font-mono text-[10px] ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{line.product_name}</span>
                                  {line.is_po_linked && (
                                    <span
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-amber-500/15 text-amber-500 border border-amber-500/30 flex-shrink-0"
                                      title={`Linked to PO line(s). Ordered qty: ${Number(line.total_ordered_qty || 0).toLocaleString('en-US')}`}
                                    >
                                      PO Linked
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td
                                className={`px-5 py-2 text-right font-mono text-[10px] ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {Number(line.qty).toLocaleString('en-US', {
                                  minimumFractionDigits: line.uom_precision ?? 0,
                                  maximumFractionDigits: line.uom_precision ?? 0,
                                })}
                              </td>
                              <td
                                className={`px-5 py-2 font-mono text-[10px] ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {line.uom_name || '-'}
                              </td>
                              <td
                                className={`px-5 py-2 text-right font-mono text-[10px] ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                Rp {Number(line.priceactual || 0).toLocaleString('en-US', {
                                  minimumFractionDigits: activePricePrecision,
                                  maximumFractionDigits: activePricePrecision,
                                })}
                              </td>
                              <td
                                className={`px-5 py-2 font-mono text-[10px] max-w-xs truncate ${
                                  isDark ? 'text-slate-400' : 'text-slate-500'
                                }`}
                              >
                                {line.description || '-'}
                              </td>
                              <td
                                className="px-5 py-2 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {!isReadOnly && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLine(line)}
                                    disabled={deletingLineId === line.id || line.is_po_linked}
                                    className={`p-1.5 rounded-lg border transition ${
                                      line.is_po_linked
                                        ? 'opacity-40 cursor-not-allowed border-slate-700/60 text-slate-500'
                                        : isDark
                                        ? 'cursor-pointer border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10'
                                        : 'cursor-pointer border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50'
                                    }`}
                                    title={line.is_po_linked ? 'Cannot delete line linked to Purchase Order' : 'Delete line item'}
                                  >
                                    {deletingLineId === line.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                    ) : (
                                      <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div
                    className={`p-3.5 sm:p-4 border-t flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono w-full ${
                      isDark
                        ? 'border-slate-800 text-slate-400'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-4 w-full md:w-auto">
                      <div className="text-[11px] sm:text-xs">
                        Showing{' '}
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {totalLineRows === 0 ? 0 : (linePage - 1) * lineLimit + 1}
                        </span>{' '}
                        to{' '}
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {Math.min(linePage * lineLimit, totalLineRows)}
                        </span>{' '}
                        of{' '}
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          {totalLineRows.toLocaleString()}
                        </span>{' '}
                        records
                      </div>

                      <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                        <span className="text-[10px] sm:text-[11px] text-slate-400">Rows:</span>
                        <select
                          value={lineLimit}
                          onChange={(e) => {
                            setLineLimit(Number(e.target.value));
                            setLinePage(1);
                          }}
                          className={`px-2 py-1 rounded-xl text-xs font-mono border outline-none transition cursor-pointer ${
                            isDark
                              ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-cyan-500/50'
                              : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-indigo-500'
                          }`}
                        >
                          {[10, 15, 25, 50, 100].map((sz) => (
                            <option
                              key={sz}
                              value={sz}
                              className={isDark ? 'bg-slate-900 text-slate-200' : 'bg-white text-slate-800'}
                            >
                              {sz}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Page Navigators */}
                    <div className="flex items-center justify-center sm:justify-end gap-1 sm:gap-1.5 flex-wrap w-full md:w-auto">
                      <button
                        onClick={() => setLinePage(1)}
                        disabled={linePage <= 1}
                        title="First Page"
                        className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronsLeft className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setLinePage(linePage - 1)}
                        disabled={linePage <= 1}
                        title="Previous Page"
                        className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>

                      {getLinePageNumbers().map((p, idx) =>
                        p === '...' ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="px-1.5 py-1 text-slate-500 font-mono select-none text-xs"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={`page-${p}`}
                            onClick={() => setLinePage(p)}
                            className={`min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 px-1.5 sm:px-2 rounded-xl font-bold font-mono text-[11px] sm:text-xs transition cursor-pointer border ${
                              p === linePage
                                ? isDark
                                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                                  : 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : isDark
                                ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => setLinePage(linePage + 1)}
                        disabled={linePage >= totalLinePages}
                        title="Next Page"
                        className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setLinePage(totalLinePages)}
                        disabled={linePage >= totalLinePages}
                        title="Last Page"
                        className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronsRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Content: Attachments Tab */}
            {activeTab === 'attachments' && (
              <div className="p-4 sm:p-6 space-y-6 font-mono">
                {/* Upload Zone (Drag & Drop + Browse) */}
                {!isReadOnly && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleFileUpload(e);
                    }}
                    className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
                      uploadingAttachment
                        ? 'opacity-60 pointer-events-none'
                        : isDark
                        ? 'border-slate-700 hover:border-cyan-500/60 bg-slate-950/30 hover:bg-slate-900/50'
                        : 'border-slate-300 hover:border-cyan-500/60 bg-slate-50/60 hover:bg-cyan-50/30'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingAttachment}
                    />
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div
                        className={`p-3 rounded-full ${
                          isDark
                            ? 'bg-cyan-500/10 text-cyan-400'
                            : 'bg-cyan-50 text-cyan-600'
                        }`}
                      >
                        {uploadingAttachment ? (
                          <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                          <UploadCloud className="w-8 h-8" />
                        )}
                      </div>
                      <div>
                        <p
                          className={`text-sm font-semibold ${
                            isDark ? 'text-slate-200' : 'text-slate-800'
                          }`}
                        >
                          {uploadingAttachment ? (
                            'Uploading attachment to iDempiere...'
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-cyan-500 hover:text-cyan-400 underline underline-offset-2 cursor-pointer font-bold"
                              >
                                Click to upload
                              </button>{' '}
                              or drag and drop file here
                            </>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Supports PDF, PNG, JPG, JPEG, WEBP, DOCX, XLSX (Max 10 MB per file)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachment Error message */}
                {attachmentError && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{attachmentError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachmentError(null)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Header bar of Attachment List */}
                <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-xs font-bold uppercase tracking-wider ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      Uploaded Attachments
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      {attachments.length} {attachments.length === 1 ? 'file' : 'files'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={loadAttachments}
                    disabled={loadingAttachments}
                    title="Refresh attachments list"
                    className={`p-1.5 rounded-lg border text-xs flex items-center gap-1.5 transition cursor-pointer ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        loadingAttachments ? 'animate-spin' : ''
                      }`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>

                {/* List / Cards of Attachments */}
                {loadingAttachments ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                    <span className="text-xs">
                      Loading attachments from iDempiere...
                    </span>
                  </div>
                ) : attachments.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <Paperclip className="w-8 h-8 mx-auto text-slate-400 opacity-40" />
                    <p
                      className={`text-xs font-semibold ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      No attachments uploaded yet
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Upload supporting documents, receipts, quotes, or specifications for this requisition.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {attachments.map((att, idx) => {
                      const isImg = att.is_image;
                      const isPdf = att.is_pdf;
                      const forceDownloadUrl =
                        requisitionApi.getAttachmentDownloadUrl(
                          targetId,
                          att.file_name,
                          true
                        );

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            isDark
                              ? 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                          }`}
                        >
                          {/* File Icon & Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                isPdf
                                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                                  : isImg
                                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                  : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
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

                            <div className="min-w-0">
                              <p
                                className={`text-xs font-bold truncate ${
                                  isDark ? 'text-slate-200' : 'text-slate-800'
                                }`}
                                title={att.file_name}
                              >
                                {att.file_name}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                <span>{formatFileSize(att.file_size)}</span>
                                <span>•</span>
                                <span>{formatAttachmentDate(att.created_at)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Preview / View button */}
                            <button
                              type="button"
                              onClick={() => setPreviewAttachment(att)}
                              title="Preview"
                              className={`p-2 rounded-lg transition cursor-pointer ${
                                isDark
                                  ? 'text-slate-300 hover:text-cyan-400 hover:bg-slate-700/60'
                                  : 'text-slate-600 hover:text-cyan-600 hover:bg-slate-100'
                              }`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Direct Download button */}
                            <a
                              href={forceDownloadUrl}
                              download={att.file_name}
                              title="Download File"
                              className={`p-2 rounded-lg transition cursor-pointer ${
                                isDark
                                  ? 'text-slate-300 hover:text-emerald-400 hover:bg-slate-700/60'
                                  : 'text-slate-600 hover:text-emerald-600 hover:bg-slate-100'
                              }`}
                            >
                              <Download className="w-4 h-4" />
                            </a>

                            {/* Delete button (only when editable) */}
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => setAttachmentPendingDelete(att)}
                                title="Delete Attachment"
                                className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab Content: Chat Tab */}
            {activeTab === 'chat' && (
              <ChatTab
                requisitionId={Number(targetId)}
                displayDocNo={displayDocNo}
                isReadOnly={isReadOnly}
                session={session}
                isDark={isDark}
                onTokenExpired={() => setShowReauthModal(true)}
              />
            )}

            {/* Tab Content: Order Tab */}
            {activeTab === 'order' && !isNew && (
              <OrderTab
                targetId={targetId}
                isDark={isDark}
                onTotalOrdersChange={(count) => setOrderCount(count)}
              />
            )}

            {/* Tab Content: Change Log Tab */}
            {activeTab === 'changelog' && !isNew && (
              <ChangeLogTab
                targetId={targetId}
                isDark={isDark}
                onTotalLogsChange={(count) => setChangeLogCount(count)}
              />
            )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Re-authenticate Modal when iDempiere token expires */}
      <ReauthModal
        isOpen={showReauthModal}
        onClose={() => setShowReauthModal(false)}
        onSuccess={handleReauthSuccess}
      />

      {/* Add / Edit Requisition Line Modal */}
      <AddLineModal
        isOpen={showAddLineModal}
        onClose={() => {
          setShowAddLineModal(false);
          setSelectedLineForEdit(null);
        }}
        requisitionId={Number(targetId)}
        lineData={selectedLineForEdit}
        pricePrecision={activePricePrecision}
        onSuccess={handleLineSaved}
        session={session}
        isDark={isDark}
      />

      {/* Upload Requisition Lines Large Modal */}
      <UploadLinesModal
        isOpen={showUploadLinesModal}
        onClose={() => setShowUploadLinesModal(false)}
        requisitionId={Number(targetId)}
        session={session}
        isDark={isDark}
        onStartImport={handleExecuteExcelImport}
        onSuccess={async (shouldClose) => {
          setLoadingLines(true);
          try {
            const [detailRes, linesRes] = await Promise.all([
              requisitionApi.getRequisitionDetail(targetId),
              requisitionApi.getRequisitionLines(targetId),
            ]);
            if (detailRes && detailRes.data) {
              applyRecordData(detailRes.data.header, linesRes?.data || [], false);
            }
          } catch (err) {
            console.error('Failed to refresh requisition lines after import:', err);
          } finally {
            setLoadingLines(false);
          }
          if (shouldClose) {
            setShowUploadLinesModal(false);
          }
        }}
      />

      {/* Confirm Delete Requisition Line Modal (SweetAlert-style) */}
      <ConfirmDeleteModal
        isOpen={Boolean(linePendingDelete)}
        onClose={() => !deletingLineId && setLinePendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Requisition Line?"
        message="Are you sure you want to delete this line item? This action will remove it from the requisition document."
        itemName={
          linePendingDelete
            ? `Line #${linePendingDelete.line}: [${linePendingDelete.product_code || '-'}] ${linePendingDelete.product_name} (${Number(linePendingDelete.qty).toLocaleString()} ${linePendingDelete.uom_name || ''})`
            : ''
        }
        loading={Boolean(deletingLineId)}
      />

      {/* Confirm Delete Attachment Modal (SweetAlert-style) */}
      <ConfirmDeleteModal
        isOpen={Boolean(attachmentPendingDelete)}
        onClose={() => !deletingAttachment && setAttachmentPendingDelete(null)}
        onConfirm={handleConfirmDeleteAttachment}
        title="Delete Attachment?"
        message="Are you sure you want to delete this attachment? This file will be permanently removed from the requisition."
        itemName={attachmentPendingDelete?.file_name || ''}
        loading={deletingAttachment}
      />

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className={`w-full max-w-4xl max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden font-mono ${
              isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <Paperclip className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <div className="min-w-0">
                  <h3
                    className={`text-xs font-bold truncate ${
                      isDark ? 'text-slate-200' : 'text-slate-800'
                    }`}
                  >
                    {previewAttachment.file_name}
                  </h3>
                  <span className="text-[10px] text-slate-400">
                    {formatFileSize(previewAttachment.file_size)} • {formatAttachmentDate(previewAttachment.created_at)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={requisitionApi.getAttachmentDownloadUrl(
                    targetId,
                    previewAttachment.file_name,
                    false
                  )}
                  target="_blank"
                  rel="noreferrer"
                  title="Open in new window"
                  className={`p-1.5 rounded-lg border transition ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <a
                  href={requisitionApi.getAttachmentDownloadUrl(
                    targetId,
                    previewAttachment.file_name,
                    true
                  )}
                  download={previewAttachment.file_name}
                  title="Download file"
                  className={`p-1.5 rounded-lg border transition ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewAttachment(null)}
                  title="Close preview"
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
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/20">
              {previewAttachment.is_image ? (
                <img
                  src={requisitionApi.getAttachmentDownloadUrl(
                    targetId,
                    previewAttachment.file_name,
                    false
                  )}
                  alt={previewAttachment.file_name}
                  className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-md"
                />
              ) : previewAttachment.is_pdf ? (
                loadingPdf ? (
                  <div className="py-24 flex flex-col items-center justify-center space-y-3 text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
                    <span className="text-xs font-semibold">Loading PDF preview...</span>
                  </div>
                ) : (
                  <iframe
                    src={
                      pdfBlobUrl ||
                      requisitionApi.getAttachmentDownloadUrl(
                        targetId,
                        previewAttachment.file_name,
                        false
                      )
                    }
                    title={previewAttachment.file_name}
                    className="w-full h-[75vh] rounded-lg border border-slate-700/50 bg-white"
                  />
                )
              ) : (
                <div className="py-16 text-center space-y-4">
                  <File className="w-16 h-16 mx-auto text-slate-400 opacity-50" />
                  <p className="text-xs text-slate-400">
                    Preview is not supported for this file type directly in the browser.
                  </p>
                  <a
                    href={requisitionApi.getAttachmentDownloadUrl(
                      targetId,
                      previewAttachment.file_name,
                      true
                    )}
                    download={previewAttachment.file_name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 text-slate-900 hover:bg-cyan-400 transition"
                  >
                    <Download className="w-4 h-4" />
                    Download {previewAttachment.file_name}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Document Modal */}
      <ConfirmDeleteModal
        isOpen={showDeleteDocModal}
        onClose={() => !deletingDoc && setShowDeleteDocModal(false)}
        onConfirm={handleDeleteDocument}
        title="Delete Requisition Document?"
        message={`Are you sure you want to delete purchase requisition ${displayDocNo}? This action cannot be undone and will permanently remove the document and its lines from iDempiere.`}
        itemName={`Requisition Document ${displayDocNo}`}
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
                  <h3
                    className={`text-xs font-bold ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}
                  >
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
                      <h4
                        className={`text-sm font-bold ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        Confirm Action: {actionPendingConfirm === 'CO' ? 'Complete' : actionPendingConfirm === 'VO' ? 'Void' : actionPendingConfirm === 'RE' ? 'Re-Active' : 'Close'}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        {actionPendingConfirm === 'CO'
                          ? 'Are you sure you want to complete this document?'
                          : actionPendingConfirm === 'VO'
                          ? 'Are you sure you want to void this document? This action cannot be undone!'
                          : actionPendingConfirm === 'RE'
                          ? 'Are you sure you want to re-activate this document back to Draft?'
                          : 'Are you sure you want to close this requisition document?'}
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
                              Complete and validate requisition
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
                              Void and cancel this document permanently
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
                            <p className="text-xs font-bold">Re-Active</p>
                            <p className="text-[10px] text-slate-400">
                              Re-open document back to Draft status
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
                              Finalize and close document permanently
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition" />
                      </button>
                    </>
                  ) : (
                    <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                      <AlertCircle className="w-6 h-6 text-slate-500 opacity-60" />
                      <span>No actions available for document status "{displayStatus}".</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Voucher PDF Preview Modal */}
      <PrintPreviewModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        requisition={{
          ...docHeader,
          documentno: displayDocNo,
          datedoc: dateDoc,
          daterequired: dateRequired,
          description: description,
          status_label: displayStatus,
          cost_center_value: selectedCc?.label ? selectedCc.label.split(' ')[0] : (docHeader?.cost_center_value || 'PROD'),
          client_name: clientDisplayName,
          logo_base64: docHeader?.logo_base64 || options?.logo_base64,
        }}
        lines={docLines}
        options={{
          documentno: displayDocNo,
          datedoc: dateDoc,
          description: description,
          logoBase64: docHeader?.logo_base64 || options?.logo_base64,
        }}
        isDark={isDark}
      />
    </ModuleLayout>
  );
}
