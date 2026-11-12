import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

// Configure PDF.js worker via Vite's asset URL resolver
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export default function PdfJsViewer({
  url,
  data = null,
  fileName = 'document.pdf',
  className = '',
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
        console.error('PDF.js loading error:', err);
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
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Error rendering PDF page ${pageNum}:`, err);
        }
      }
    },
    [pdfDoc, scale, rotation]
  );

  // Ref map for canvas elements
  const canvasRefs = useRef({});

  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let isMounted = true;
    setRendering(true);

    const renderAll = async () => {
      for (let i = 1; i <= numPages; i++) {
        if (!isMounted) break;
        const canvas = canvasRefs.current[i];
        if (canvas) {
          await renderPage(i, canvas);
        }
      }
      if (isMounted) setRendering(false);
    };

    renderAll();

    return () => {
      isMounted = false;
    };
  }, [pdfDoc, numPages, scale, rotation, renderPage]);

  // Handle scroll to track current page
  const handleScroll = () => {
    if (!containerRef.current || numPages <= 1) return;
    const container = containerRef.current;
    const scrollPos = container.scrollTop + container.clientHeight / 3;

    for (let i = 1; i <= numPages; i++) {
      const canvas = canvasRefs.current[i];
      if (canvas) {
        const top = canvas.offsetTop;
        const height = canvas.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          setCurrentPage(i);
          break;
        }
      }
    }
  };

  const scrollToPage = (pageNum) => {
    const target = Math.max(1, Math.min(pageNum, numPages));
    setCurrentPage(target);
    const canvas = canvasRefs.current[target];
    if (canvas && containerRef.current) {
      canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      className={`flex flex-col w-full h-full select-none overflow-hidden ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'
      } ${className}`}
    >
      {/* PDF.js Viewer Toolbar */}
      <div
        className={`flex flex-wrap items-center justify-between px-3 sm:px-5 py-2 border-b text-xs font-mono gap-2 flex-shrink-0 z-20 ${
          isDark
            ? 'bg-slate-900/90 border-slate-800 backdrop-blur-md'
            : 'bg-white/90 border-slate-200 backdrop-blur-md shadow-sm'
        }`}
      >
        {/* Left: Page Navigation */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollToPage(currentPage - 1)}
            disabled={currentPage <= 1 || loading}
            className={`p-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1 px-2 py-1 rounded-lg border bg-slate-950/20 text-[11px] font-bold">
            <span>Page</span>
            <span className="text-cyan-400 font-bold">{currentPage}</span>
            <span>of</span>
            <span>{numPages || 1}</span>
          </div>

          <button
            type="button"
            onClick={() => scrollToPage(currentPage + 1)}
            disabled={currentPage >= numPages || loading}
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

        {/* Center: Status / PDF.js Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold tracking-wider uppercase">
          <FileText className="w-3 h-3" />
          <span>PDF.js Engine</span>
        </div>

        {/* Right: Zoom & Orientation Controls */}
        <div className="flex items-center gap-1.5">
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
                ? 'border-slate-800 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 hover:bg-slate-100 text-slate-700'
            }`}
            title="Rotate Clockwise (90°)"
          >
            <RotateCw className="w-4 h-4" />
          </button>
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
            <p className="text-xs font-mono">Initializing PDF.js engine & parsing pages...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md space-y-3 text-rose-400">
            <AlertCircle className="w-10 h-10" />
            <p className="text-sm font-bold">Failed to Render Document</p>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          </div>
        )}

        {!loading && !error && numPages > 0 && (
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
