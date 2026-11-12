import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Loader2, FileText, AlertCircle } from 'lucide-react';
import { generateRequisitionPdf } from '../../../../utils/requisitionPdfGenerator';
import PdfJsViewer from '../../../../components/common/PdfJsViewer';

const PrintPreviewModal = ({
  isOpen,
  onClose,
  requisition,
  lines = [],
  options = {},
  isDark = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const iframeRef = useRef(null);

  const docNo = requisition?.documentno || options?.documentno || 'Draft';

  useEffect(() => {
    let currentBlobUrl = null;

    if (isOpen) {
      setLoading(true);
      setError(null);

      generateRequisitionPdf(requisition, lines, options)
        .then(({ doc, blob, blobUrl }) => {
          const url = blobUrl || (blob ? URL.createObjectURL(blob) : null);
          currentBlobUrl = url;
          setPdfDoc(doc);
          setPdfUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error generating PDF:', err);
          setError('Failed to generate PDF document preview: ' + (err?.message || 'Unknown error'));
          setLoading(false);
        });
    }

    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [isOpen, requisition, lines, options]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (pdfDoc) {
      pdfDoc.save(`Purchase_Requisition_${docNo}.pdf`);
    } else if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `Purchase_Requisition_${docNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } catch (e) {
        console.warn('Iframe print failed, falling back to window print:', e);
        if (pdfUrl) {
          const printWindow = window.open(pdfUrl, '_blank');
          if (printWindow) {
            printWindow.onload = () => printWindow.print();
          }
        }
      }
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      {/* Full Backdrop with Blur covering 100% of viewport */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Container */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all duration-200 ${
          isDark
            ? 'bg-slate-900 border-slate-700 text-white'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-b flex-shrink-0 ${
            isDark
              ? 'bg-slate-950/70 border-slate-800'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                isDark ? 'bg-cyan-500/10 text-cyan-400' : 'bg-cyan-50 text-cyan-600'
              }`}
            >
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide uppercase">
                  Print Preview
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    isDark
                      ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                      : 'bg-slate-100 text-cyan-700 border border-slate-300'
                  }`}
                >
                  {docNo}
                </span>
              </div>
              <p
                className={`text-[11px] ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Purchase Requisition Voucher • PDF Preview
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !!error}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
              }`}
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !!error}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-900 transition cursor-pointer flex items-center gap-1.5 shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print Voucher"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / PDF Viewer Frame */}
        <div className="flex-1 w-full h-full relative bg-slate-950 flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-xs font-medium">Generating PDF preview...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-3 text-rose-400 p-6 text-center max-w-md">
              <AlertCircle className="w-10 h-10" />
              <p className="text-sm font-semibold">{error}</p>
              <p className="text-xs text-slate-400">
                Please check the document details and try again.
              </p>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <>
              <PdfJsViewer
                url={pdfUrl}
                fileName={`Purchase_Requisition_${docNo}.pdf`}
              />
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                title={`Purchase Requisition ${docNo} Print Frame`}
                className="hidden"
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PrintPreviewModal;

