import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { idempiereConfig } from '../../../config/idempiere';
import ModuleLayout from '../../../layouts/ModuleLayout';
import { orderApi } from '../../../api/order';
import PageLoader from '../../../components/ui/PageLoader';
import OrderStatsCards from './components/OrderStatsCards';
import OrderFilterModal from './components/OrderFilterModal';
import OrderTable from './components/OrderTable';
import PrintPreviewModal from './components/PrintPreviewModal';
import { encryptDocumentId } from '../../../utils/crypto';
import { RefreshCw, Plus, Search, Filter, AlertCircle, ShoppingCart } from 'lucide-react';

const FILTER_STORAGE_KEY = 'adyago_po_filters';

const loadSavedFilters = () => {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load filter cache:', err);
  }
  return {};
};

export default function CreatePoPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Data State
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState(null);

  // Filters State initialized from localStorage cache
  const savedFilters = useMemo(() => loadSavedFilters(), []);
  const [search, setSearch] = useState(savedFilters.search || '');
  const [status, setStatus] = useState(savedFilters.status || '');
  const [costCenterId, setCostCenterId] = useState(savedFilters.costCenterId || '');
  const [dateStart, setDateStart] = useState(savedFilters.dateStart || '');
  const [dateEnd, setDateEnd] = useState(savedFilters.dateEnd || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(savedFilters.limit || 10);
  const [sortBy, setSortBy] = useState(savedFilters.sortBy || 'dateordered');
  const [sortDir, setSortDir] = useState(savedFilters.sortDir || 'desc');

  // Modals State
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printOrder, setPrintOrder] = useState(null);
  const [printLines, setPrintLines] = useState([]);
  const [printLoadingId, setPrintLoadingId] = useState(null);

  const clientId = session?.clientId || session?.client_id || 0;
  const orgId = session?.orgId || session?.org_id || 0;
  const roleId = session?.roleId || session?.role_id || 0;

  // Save filters to localStorage whenever they change
  useEffect(() => {
    try {
      const filterData = {
        search,
        status,
        costCenterId,
        dateStart,
        dateEnd,
        limit,
        sortBy,
        sortDir,
      };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filterData));
    } catch (err) {
      console.error('Failed to cache filters:', err);
    }
  }, [search, status, costCenterId, dateStart, dateEnd, limit, sortBy, sortDir]);

  // Load master options once
  useEffect(() => {
    if (!clientId) return;
    orderApi
      .getMasterOptions({ client_id: clientId, org_id: orgId, role_id: roleId })
      .then((res) => {
        if (res && res.data) {
          setOptions(res.data);
        }
      })
      .catch((err) => {
        console.warn('Failed to load master options for PO:', err);
      });
  }, [clientId, orgId, roleId]);

  // Fetch orders list
  const fetchOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const params = {
        client_id: clientId,
        org_id: orgId,
        search,
        status,
        cost_center_id: costCenterId,
        date_start: dateStart,
        date_end: dateEnd,
        page,
        limit,
        sort_by: sortBy,
        sort_dir: sortDir,
      };
      const res = await orderApi.getOrders(params);
      if (res && res.data) {
        setOrders(res.data.orders || []);
        setTotal(res.data.total || 0);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to load purchase orders:', err);
      setError(err?.response?.data?.error || err.message || 'Failed to load purchase orders');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(true);
  }, [clientId, orgId, status, costCenterId, dateStart, dateEnd, page, limit, sortBy, sortDir]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleApplyFilters = (newFilters) => {
    setStatus(newFilters.status || '');
    setCostCenterId(newFilters.costCenterId || '');
    setDateStart(newFilters.dateStart || '');
    setDateEnd(newFilters.dateEnd || '');
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatus('');
    setCostCenterId('');
    setDateStart('');
    setDateEnd('');
    setPage(1);
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    } catch {}
  };

  const handleView = (po) => {
    const encryptedId = encryptDocumentId(String(po.c_order_id));
    navigate(`/create-po?documentID=${encodeURIComponent(encryptedId)}`);
  };

  const handleCreateNew = () => {
    navigate('/create-po?documentID=new');
  };

  const handlePrintPreview = async (po) => {
    if (!po?.c_order_id) return;
    setPrintLoadingId(po.c_order_id);
    try {
      const detailRes = await orderApi.getOrderDetail(po.c_order_id);
      if (detailRes && detailRes.data) {
        setPrintOrder(detailRes.data.header);
        setPrintLines(detailRes.data.lines || []);
        setPrintModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to load order for print preview:', err);
    } finally {
      setPrintLoadingId(null);
    }
  };

  return (
    <ModuleLayout pageTitle="Purchase Order" rootMenuId={1000031} rootMenuName="Procurement">
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h1 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Purchase Orders
                </h1>
                <p className="text-xs font-mono text-slate-500">
                  Procurement Orders & Supplier Management
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            <button
              onClick={() => fetchOrders(true)}
              disabled={loading}
              title="Refresh list"
              className={`p-2.5 rounded-2xl border transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={handleCreateNew}
              className="flex-1 sm:flex-none flex items-center justify-center space-x-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Purchase Order</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center space-x-3 text-xs font-mono">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="underline hover:text-white">
              Dismiss
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <OrderStatsCards
          stats={stats}
          loading={loading}
          isDark={isDark}
          activeStatus={status}
          onSelectStatus={(st) => {
            setStatus(st);
            setPage(1);
          }}
        />

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO no, supplier, desc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-xs font-mono outline-none transition-all ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 shadow-sm'
              }`}
            />
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={() => setFilterModalOpen(true)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl border text-xs font-mono font-bold transition-all ${
                costCenterId || dateStart || dateEnd
                  ? isDark
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                    : 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters</span>
              {(costCenterId || dateStart || dateEnd) && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              )}
            </button>

            {(search || status || costCenterId || dateStart || dateEnd) && (
              <button
                onClick={handleResetFilters}
                className="text-xs font-mono text-slate-500 hover:text-cyan-400 underline transition-colors px-2"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Orders Table */}
        <OrderTable
          orders={orders}
          loading={loading}
          isDark={isDark}
          page={page}
          limit={limit}
          total={total}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          onView={handleView}
          onPrint={handlePrintPreview}
          printLoadingId={printLoadingId}
        />
      </div>

      {/* Filter Modal */}
      <OrderFilterModal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        isDark={isDark}
        options={options}
        filters={{ status, costCenterId, dateStart, dateEnd }}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />

      {/* Print Preview Modal */}
      {printModalOpen && printOrder && (
        <PrintPreviewModal
          isOpen={printModalOpen}
          onClose={() => setPrintModalOpen(false)}
          order={printOrder}
          lines={printLines}
          isDark={isDark}
        />
      )}
    </ModuleLayout>
  );
}
