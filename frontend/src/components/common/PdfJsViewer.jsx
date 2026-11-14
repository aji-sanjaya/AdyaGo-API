import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// Primary local worker (bundled by Vite or served from /pdf.worker.min.mjs)
const LOCAL_WORKER_URL = pdfjsWorker || '/pdf.worker.min.mjs';
// CDN fallback worker with guaranteed CORS headers & global edge caching
const CDN_WORKER_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '6.5.438'}/pdf.worker.min.mjs`;

// Set initial worker source
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = LOCAL_WORKER_URL;
}

export default function PdfJsViewer({
  url,
  data = null,
  fileName = 'document.pdf',
  className = '',
  showPrint = true,
  showDownload = true,
  onPrint = null,
  onDownload = null,
}) {
  const { isDark } = useTheme();
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [error, setError] = useState(null);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    if (!url) return;
    try {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          window.open(url, '_blank')?.print();
        }
        setTimeout(() => {
          try {
            document.body.removeChild(iframe);
          } catch (_) {}
        }, 3000);
      };
    } catch (err) {
      console.warn('Print iframe error:', err);
      window.open(url, '_blank')?.print();
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    let loadingTask = null;

    if (!url && !data) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setUseIframeFallback(false);

    const load = async () => {
      try {
        const loadingParams = data ? { data } : { url };
        loadingTask = pdfjsLib.getDocument(loadingParams);
        const doc = await loadingTask.promise;

        if (isCancelled) return;
        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (err) {
        if (isCancelled) return;
        console.warn('PDF.js initial load failed, attempting retry with CDN worker:', err);

        // If initial load failed (e.g. worker module import failure), try CDN worker
        if (pdfjsLib.GlobalWorkerOptions.workerSrc !== CDN_WORKER_URL) {
          try {
            pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_WORKER_URL;
            const loadingParams = data ? { data } : { url };
            loadingTask = pdfjsLib.getDocument(loadingParams);
            const doc = await loadingTask.promise;

            if (isCancelled) return;
            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setCurrentPage(1);
            setLoading(false);
            return;
          } catch (retryErr) {
            console.error('PDF.js CDN worker retry failed:', retryErr);
          }
        }

        // If both workers fail and we have a valid URL, fall back to native browser PDF viewer
        if (url) {
          console.warn('Falling back to native browser PDF viewer');
          setUseIframeFallback(true);
          setLoading(false);
          return;
        }

        setError(err.message || 'Failed to load PDF document.');
        setLoading(false);
      }
    };

    load();

    return () => {
      isCancelled = true;
      if (loadingTask && typeof loadingTask.destroy === 'function') {
        loadingTask.destroy();
      }
    };
  }, [url, data]);

  // Render a specific page to a canvas
  const renderPage = useCallback(
    async (pageNum, canvas) => {
      if (!pdfDoc || !canvas) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale, rotation });
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Support high-DPI displays for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
      } catch (err) {
        // Page rendering cancelled or aborted is benign
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNum} render error:`, err);
        }
      }
    },
    [pdfDoc, scale, rotation]
  );

  // Map to hold canvas references for all rendered pages
  const canvasRefs = useRef({});

  // Render all pages when pdfDoc, scale, or rotation changes
  useEffect(() => {
    if (!pdfDoc || numPages === 0 || useIframeFallback) return;

    let isCancelled = false;
    setRendering(true);

    const renderAll = async () => {
      for (let p = 1; p <= numPages; p++) {
        if (isCancelled) break;
        const canvas = canvasRefs.current[p];
        if (canvas) {
          await renderPage(p, canvas);
        }
      }
      if (!isCancelled) {
        setRendering(false);
      }
    };

    renderAll();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, numPages, scale, rotation, renderPage, useIframeFallback]);

  // Handle page scrolling to update currentPage in header
  const handleScroll = () => {
    if (!containerRef.current || numPages === 0) return;
    const containerTop = containerRef.current.scrollTop;
    let closestPage = 1;
    let minDistance = Infinity;

    for (let p = 1; p <= numPages; p++) {
      const el = canvasRefs.current[p];
      if (el) {
        const offset = Math.abs(el.offsetTop - containerTop - 80);
        if (offset < minDistance) {
          minDistance = offset;
          closestPage = p;
        }
      }
    }
    setCurrentPage(closestPage);
  };

  const scrollToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > numPages) return;
    const el = canvasRefs.current[pageNum];
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.15, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.15, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.15);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div
      className={`relative flex flex-col h-full w-full select-none overflow-hidden ${
        isDark ? 'bg-slate-900/90 text-slate-200' : 'bg-slate-100 text-slate-800'
      } ${className}`}
    >
      {/* Viewer Toolbar */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b text-xs z-10 select-none shadow-sm transition-colors ${
          isDark
            ? 'bg-slate-900/95 border-slate-800/80'
            : 'bg-white/95 border-slate-200'
        }`}
      >
        {/* Left: Page Navigator (Hidden in iframe fallback) */}
        {!useIframeFallback ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollToPage(currentPage - 1)}
              disabled={currentPage <= 1 || loading || numPages === 0}
              className={`p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-mono text-[11px] px-2 py-1 rounded bg-cyan-500/10 text-cyan-500 font-semibold border border-cyan-500/20">
              Page {currentPage} of {numPages || 1}
            </span>

            <button
              type="button"
              onClick={() => scrollToPage(currentPage + 1)}
              disabled={currentPage >= numPages || loading || numPages === 0}
              className={`p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-slate-400">
              Native Browser PDF Viewer
            </span>
          </div>
        )}

        {/* Right: Zoom, Rotate, Print, Download Tools */}
        <div className="flex items-center gap-1.5">
          {!useIframeFallback && (
            <>
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={scale <= 0.5 || loading}
                className={`p-1.5 rounded-lg border transition disabled:opacity-40 ${
                  isDark
                    ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition ${
                  isDark
                    ? 'border-slate-800 hover:bg-slate-800 text-cyan-400 bg-slate-950/40'
                    : 'border-slate-200 hover:bg-slate-100 text-cyan-600 bg-slate-50'
                }`}
                title="Reset Zoom to 100%"
              >
                {Math.round(scale * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={scale >= 3.0 || loading}
                className={`p-1.5 rounded-lg border transition disabled:opacity-40 ${
                  isDark
                    ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                }`}
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>

              <div className="h-4 w-[1px] bg-slate-700/50 mx-0.5" />

              <button
                type="button"
                onClick={handleRotate}
                disabled={loading}
                className={`p-1.5 rounded-lg border transition ${
                  isDark
                    ? 'border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-cyan-400'
                    : 'border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-cyan-600'
                }`}
                title="Rotate Clockwise (90°)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          {(showPrint || showDownload) && (
            <div className="h-4 w-[1px] bg-slate-700/50 mx-0.5" />
          )}

          {/* Native Print button from PDF.js tools */}
          {showPrint && (
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || (!!error && !useIframeFallback)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-cyan-400'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-cyan-600'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Print Document"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          {/* Native Download button from PDF.js tools */}
          {showDownload && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || (!!error && !useIframeFallback)}
              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-cyan-400'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-cyan-600'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* PDF Viewport Canvas Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 w-full h-full overflow-auto p-4 sm:p-6 flex flex-col items-center gap-6 relative transition-colors ${
          isDark ? 'bg-slate-950/80' : 'bg-slate-200/60'
        }`}
      >
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3 py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-xs font-mono">Rendering document preview...</p>
          </div>
        )}

        {/* Iframe fallback when canvas rendering or workers fail */}
        {useIframeFallback && url && (
          <div className="w-full h-full flex-1 flex flex-col items-center min-h-[500px]">
            <iframe
              src={url}
              title={fileName || 'PDF Document'}
              className="w-full h-full flex-1 rounded-lg border border-slate-300 dark:border-slate-800 shadow-2xl bg-white"
            />
          </div>
        )}

        {error && !loading && !useIframeFallback && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md space-y-4 text-rose-400">
            <AlertCircle className="w-10 h-10" />
            <p className="text-sm font-bold">Failed to Render Document</p>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            {url && (
              <button
                type="button"
                onClick={() => setUseIframeFallback(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-md cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View via Built-in Browser Viewer
              </button>
            )}
          </div>
        )}

        {!loading && !error && !useIframeFallback && numPages > 0 && (
          <>
            {Array.from({ length: numPages }, (_, idx) => idx + 1).map((pageNum) => (
              <div
                key={pageNum}
                className="flex flex-col items-center relative group transition-transform"
              >
                {/* Page Number Indicator */}
                <div className="mb-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                  Page {pageNum} of {numPages}
                </div>

                {/* Canvas Container with clean paper drop-shadow */}
                <div
                  className={`rounded-lg overflow-hidden shadow-2xl transition-all border ${
                    isDark ? 'border-slate-800 shadow-cyan-950/20' : 'border-slate-300 shadow-slate-900/15'
                  }`}
                >
                  <canvas
                    ref={(el) => {
                      if (el) canvasRefs.current[pageNum] = el;
                    }}
                    className="block bg-white"
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
