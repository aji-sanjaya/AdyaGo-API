import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, FileText, AlertCircle } from 'lucide-react';
import { generateOrderPdf } from '../../../../utils/orderPdfGenerator';
import PdfJsViewer from '../../../../components/common/PdfJsViewer';

export default function PrintPreviewModal({
  isOpen,
  onClose,
  order,
  lines = [],
  options = {},
  isDark = true,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const iframeRef = useRef(null);

  const docNo = order?.documentno || options?.documentno || 'Draft';

  useEffect(() => {
    let currentBlobUrl = null;

    if (isOpen) {
      setLoading(true);
      setError(null);

      generateOrderPdf(order, lines, options)
        .then(({ doc, blob, blobUrl }) => {
          const url = blobUrl || (blob ? URL.createObjectURL(blob) : null);
          currentBlobUrl = url;
          setPdfDoc(doc);
          setPdfUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          console.error('Error generating PO PDF:', err);
          setError('Failed to generate PDF document preview: ' + (err?.message || 'Unknown error'));
          setLoading(false);
        });
    }

    return () => {
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [isOpen, order, lines, options]);

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
      pdfDoc.save(`Purchase_Order_${docNo}.pdf`);
    } else if (pdfUrl) {
      const a = document.createElement('a');
      a.href = pdfUrl;
      a.download = `Purchase_Order_${docNo}.pdf`;
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
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

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
            <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-tight">
                Purchase Order Print Preview
              </h3>
              <p className="text-xs text-slate-400">
                Document No: <span className="font-mono font-medium text-primary-400">{docNo}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body / Viewer */}
        <div className="flex-1 relative bg-slate-950/40 overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-xs font-medium">Generating Purchase Order PDF...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-2 p-6 max-w-md text-center">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mb-1">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-rose-400">Preview Error</h4>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
          )}

          {pdfUrl && !loading && !error && (
            <>
              <PdfJsViewer
                url={pdfUrl}
                fileName={`Purchase_Order_${docNo}.pdf`}
                onPrint={handlePrint}
                onDownload={handleDownload}
              />
              <iframe
                ref={iframeRef}
                src={pdfUrl}
                title={`Purchase Order ${docNo} Print Frame`}
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
}

