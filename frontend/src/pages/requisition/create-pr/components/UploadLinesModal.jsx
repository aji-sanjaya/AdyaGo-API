import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileText,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { requisitionApi } from '../../../../api/requisition';

export default function UploadLinesModal({
  isOpen,
  onClose,
  requisitionId,
  session,
  isDark,
  onSuccess,
  onStartImport,
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Progress state
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressInfo, setProgressInfo] = useState({
    total: 0,
    current: 0,
    success: 0,
    failed: 0,
    currentRowCode: '',
  });

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // 1. Download Template (.xlsx)
  const handleDownloadTemplate = () => {
    try {
      const headers = ['Product Code', 'Quantity', 'Price', 'Description'];
      const sampleData = [
        ['96916B00ZP_5H45', 10, 100000, 'Sample requisition line 1'],
        ['96916B00ZP_5H46', 25, 150000, 'Sample requisition line 2'],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      ws['!cols'] = [
        { wch: 22 }, // Product Code
        { wch: 12 }, // Quantity
        { wch: 16 }, // Price
        { wch: 36 }, // Description
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, 'requisition_lines_template.xlsx');
    } catch (err) {
      console.error('Failed to download template:', err);
      Swal.fire({
        icon: 'error',
        title: 'Download Failed',
        text: 'Failed to generate template file.',
        background: isDark ? '#0f172a' : '#ffffff',
        color: isDark ? '#f8fafc' : '#0f172a',
      });
    }
  };

  // 2. Parse uploaded file
  const processFile = (file) => {
    if (!file) return;
    setParseError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!rawJson || rawJson.length < 2) {
          setParseError('The uploaded file contains no data rows.');
          setParsedRows([]);
          return;
        }

        // Identify header columns
        const headerRow = rawJson[0].map((h) => String(h || '').trim().toLowerCase());
        let prodIdx = headerRow.findIndex(
          (h) => h.includes('product') || h.includes('code') || h.includes('item')
        );
        let qtyIdx = headerRow.findIndex(
          (h) => h.includes('qty') || h.includes('quant')
        );
        let priceIdx = headerRow.findIndex(
          (h) => h.includes('price') || h.includes('unit') || h.includes('cost')
        );
        let descIdx = headerRow.findIndex(
          (h) => h.includes('desc') || h.includes('note') || h.includes('keterangan')
        );

        // Fallback to column index order if matching by name failed
        if (prodIdx === -1) prodIdx = 0;
        if (qtyIdx === -1) qtyIdx = 1;
        if (priceIdx === -1) priceIdx = 2;
        if (descIdx === -1) descIdx = 3;

        const rows = [];
        for (let i = 1; i < rawJson.length; i++) {
          const r = rawJson[i];
          if (!r || r.length === 0) continue;

          // Check if row is completely empty
          const hasContent = r.some(
            (c) => c !== null && c !== undefined && String(c).trim() !== ''
          );
          if (!hasContent) continue;

          const productCode = String(r[prodIdx] || '').trim();
          const qty = Number(r[qtyIdx] || 0);
          const price = Number(r[priceIdx] || 0);
          const description = String(r[descIdx] || '').trim();

          rows.push({
            rowNumber: i + 1,
            product_code: productCode,
            qty: qty,
            price: price,
            description: description,
          });
        }

        if (rows.length === 0) {
          setParseError('No valid rows found in file.');
          setParsedRows([]);
          return;
        }

        setParsedRows(rows);
      } catch (err) {
        console.error('File parsing error:', err);
        setParseError(`Failed to parse file: ${err.message}`);
        setParsedRows([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 3. Execute bulk import row by row
  const handleStartImport = async () => {
    if (!parsedRows || parsedRows.length === 0 || !requisitionId) return;

    if (onStartImport) {
      onStartImport(parsedRows);
      return;
    }

    setIsProcessing(true);
    const total = parsedRows.length;
    let success = 0;
    let failed = 0;
    const failedRows = [];

    setProgressInfo({
      total,
      current: 0,
      success: 0,
      failed: 0,
      currentRowCode: '',
    });

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      setProgressInfo({
        total,
        current: i + 1,
        success,
        failed,
        currentRowCode: row.product_code || `Row #${row.rowNumber}`,
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
          requisitionId,
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

    setIsProcessing(false);

    // End of import process
    if (failedRows.length > 0) {
      // Auto-generate and download Error Excel
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
          { wch: 22 }, // Product Code
          { wch: 12 }, // Quantity
          { wch: 16 }, // Price
          { wch: 36 }, // Description
          { wch: 48 }, // Error Details (5th column)
        ];

        const errWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(errWb, errWs, 'Failed Rows');
        const filename = `requisition-import-errors-${Date.now()}.xlsx`;
        XLSX.writeFile(errWb, filename);
      } catch (dlErr) {
        console.error('Failed to auto-download error excel:', dlErr);
      }

      // Notify user via SweetAlert
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

      if (success > 0 && onSuccess) {
        onSuccess(false);
      }
    } else {
      // 100% Success - No Excel download needed
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

      if (onSuccess) {
        onSuccess(true);
      }
      onClose();
    }
  };

  const percent =
    progressInfo.total > 0
      ? Math.round((progressInfo.current / progressInfo.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 font-mono">
      <div
        className={`w-full max-w-2xl sm:max-w-3xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3
                className={`text-sm sm:text-base font-bold ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Upload Requisition Lines
              </h3>
              <p className="text-[11px] text-slate-400">
                Bulk import line items via standard Excel (.xlsx, .xls) or CSV
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg cursor-pointer transition disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 1: Download Template */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
              isDark
                ? 'bg-slate-950/60 border-slate-800'
                : 'bg-indigo-50/50 border-indigo-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <p
                  className={`text-xs font-bold ${
                    isDark ? 'text-slate-200' : 'text-slate-800'
                  }`}
                >
                  Download Standard Template
                </p>
                <p className="text-[11px] text-slate-400">
                  Headers: Product Code, Quantity, Price, Description
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/30 transition cursor-pointer flex-shrink-0 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Download .XLSX Template</span>
            </button>
          </div>

          {/* Step 2: Upload Dropzone Area */}
          {!isProcessing && (
            <div>
              <label
                className={`block text-xs font-bold uppercase tracking-wider mb-2 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                Upload Excel / CSV File
              </label>

              {!selectedFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                    isDragging
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : isDark
                      ? 'border-slate-700 hover:border-cyan-500/60 bg-slate-950/40 hover:bg-slate-950/70'
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50 hover:bg-indigo-50/30'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <p
                      className={`text-xs sm:text-sm font-bold ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      Click to upload or drag & drop file here
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports .xlsx, .xls, and .csv files up to 5MB
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                  />
                </div>
              ) : (
                /* Selected File Card */
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-xs font-bold truncate ${
                          isDark ? 'text-slate-200' : 'text-slate-800'
                        }`}
                      >
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{(selectedFile.size / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold">
                          {parsedRows.length} valid row(s) ready
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearFile}
                    className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 cursor-pointer transition"
                    title="Remove File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Parsing Error */}
              {parseError && (
                <div className="p-3.5 mt-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}
            </div>
          )}

          {/* Rows Preview Table */}
          {!isProcessing && parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Data Preview (First {Math.min(parsedRows.length, 5)} rows):
                </span>
                <span className="text-[11px] text-cyan-400 font-bold">
                  Total {parsedRows.length} rows to import
                </span>
              </div>
              <div
                className={`rounded-xl border overflow-hidden ${
                  isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="overflow-x-auto max-h-48">
                  <table className="w-full text-left text-xs">
                    <thead
                      className={`text-[10px] uppercase font-bold border-b ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-400'
                          : 'bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">Product Code</th>
                        <th className="py-2 px-3 text-right">Quantity</th>
                        <th className="py-2 px-3 text-right">Price</th>
                        <th className="py-2 px-3">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40 text-[11px]">
                      {parsedRows.slice(0, 5).map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20">
                          <td className="py-1.5 px-3 text-slate-500">{r.rowNumber}</td>
                          <td className="py-1.5 px-3 font-bold text-cyan-400">
                            {r.product_code || '-'}
                          </td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-300">
                            {r.qty}
                          </td>
                          <td className="py-1.5 px-3 text-right text-slate-400">
                            {r.price > 0 ? r.price.toLocaleString() : 'Price List'}
                          </td>
                          <td className="py-1.5 px-3 text-slate-400 truncate max-w-xs">
                            {r.description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Real-Time Processing Progress Display */}
          {isProcessing && (
            <div
              className={`p-6 rounded-2xl border space-y-5 animate-in fade-in duration-200 ${
                isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 animate-spin" />
                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        isDark ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Importing Line Items...
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Processing row <b>{progressInfo.current}</b> of <b>{progressInfo.total}</b> (
                      {percent}%)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    ✓ {progressInfo.success} Success
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    ✗ {progressInfo.failed} Failed
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Current: {progressInfo.currentRowCode}</span>
                  <span>{percent}% Completed</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className={`px-4 py-2 text-xs rounded-xl border font-bold transition cursor-pointer disabled:opacity-50 ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Cancel
          </button>

          {!isProcessing ? (
            <button
              type="button"
              onClick={handleStartImport}
              disabled={parsedRows.length === 0}
              className="px-5 py-2 text-xs rounded-xl text-white font-bold bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 shadow-md shadow-cyan-500/20 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import {parsedRows.length > 0 ? `(${parsedRows.length} Rows)` : ''}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="px-5 py-2 text-xs rounded-xl text-white font-bold bg-slate-700 opacity-60 flex items-center gap-2 cursor-not-allowed"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Importing {progressInfo.current}/{progressInfo.total}...</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

