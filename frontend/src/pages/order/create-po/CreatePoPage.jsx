import React, { useState, useEffect, useMemo } from 'react';
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
import { RefreshCw, AlertCircle } from 'lucide-react';

const FILTER_STORAGE_KEY = 'adyago_order_filters';
const LEGACY_FILTER_STORAGE_KEY = 'factoryhub_order_filters';

const loadSavedFilters = () => {
  try {
    const raw =
      localStorage.getItem(FILTER_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_FILTER_STORAGE_KEY);
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
  const [description, setDescription] = useState(savedFilters.description || '');
  const [bpartnerId, setBpartnerId] = useState(savedFilters.bpartnerId || '');
  const [costCenterId, setCostCenterId] = useState(savedFilters.costCenterId || '');
  const [dateStart, setDateStart] = useState(savedFilters.dateStart || '');
  const [dateEnd, setDateEnd] = useState(savedFilters.dateEnd || '');
  const [createdBy, setCreatedBy] = useState(savedFilters.createdBy || '');
  const [status, setStatus] = useState(savedFilters.status || '');
  const [vendorsList, setVendorsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
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
  const userId = session?.user?.id || session?.user?.userId || 0;

  const activeFilterCount =
    (status ? 1 : 0) +
    (costCenterId ? 1 : 0) +
    (bpartnerId ? 1 : 0) +
    (createdBy ? 1 : 0) +
    (description.trim() ? 1 : 0) +
    (dateStart ? 1 : 0) +
    (dateEnd ? 1 : 0);

  // Load Master Options once
  useEffect(() => {
    orderApi
      .getMasterOptions(clientId, userId, session?.token)
      .then((res) => {
        const optData = res.data || {};
        setOptions(optData);
        if (optData.vendors && optData.vendors.length > 0) {
          setVendorsList(optData.vendors);
        } else {
          orderApi
            .getVendors({ client_id: clientId, limit: 200 })
            .then((vRes) => setVendorsList(vRes.data || []))
            .catch(() => {});
        }
        if (optData.users && optData.users.length > 0) {
          setUsersList(optData.users);
        } else if (optData.approvers) {
          setUsersList(optData.approvers);
        }
      })
      .catch((err) => {
        console.error('Failed to load master options:', err);
      });
  }, [clientId, userId, session?.token]);

  // Fetch Orders list & stats
  const fetchList = () => {
    setLoading(true);
    setError(null);

    const params = {
      client_id: clientId,
      org_id: orgId,
      page,
      limit,
      sort_by: sortBy,
      sort_dir: sortDir,
    };
    if (search.trim()) params.search = search.trim();
    if (description.trim()) params.description = description.trim();
    if (bpartnerId) params.c_bpartner_id = bpartnerId;
    if (createdBy) params.created_by = createdBy;
    if (status) params.status = status;
    if (costCenterId) params.cost_center_id = costCenterId;
    if (dateStart) params.date_start = dateStart;
    if (dateEnd) params.date_end = dateEnd;

    orderApi
      .getOrders(params)
      .then((res) => {
        setStats(res.data?.stats);
        setOrders(res.data?.orders || []);
        setTotal(res.data?.total || 0);
        setLastRefreshed(new Date());
      })
      .catch((err) => {
        console.error('Failed to load purchase orders:', err);
        setError('Failed to fetch purchase orders from Enterprise Core.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchList();
  }, [clientId, orgId, page, limit, status, costCenterId, bpartnerId, createdBy, description, dateStart, dateEnd, sortBy, sortDir]);

  // Debounced Search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchList();
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  // Persist filter options to localStorage cache
  useEffect(() => {
    try {
      const hasActive = Boolean(
        status ||
          costCenterId ||
          bpartnerId ||
          createdBy ||
          description.trim() ||
          dateStart ||
          dateEnd ||
          search.trim() ||
          limit !== 10 ||
          sortBy !== 'dateordered' ||
          sortDir !== 'desc'
      );

      if (hasActive) {
        localStorage.setItem(
          FILTER_STORAGE_KEY,
          JSON.stringify({
            status,
            costCenterId,
            bpartnerId,
            createdBy,
            description,
            dateStart,
            dateEnd,
            search,
            limit,
            sortBy,
            sortDir,
          })
        );
      } else {
        localStorage.removeItem(FILTER_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to save filter cache:', err);
    }
  }, [status, costCenterId, bpartnerId, createdBy, description, dateStart, dateEnd, search, limit, sortBy, sortDir]);

  const handleResetFilters = () => {
    setStatus('');
    setCostCenterId('');
    setBpartnerId('');
    setCreatedBy('');
    setDescription('');
    setDateStart('');
    setDateEnd('');
    setSearch('');
    setPage(1);
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear filter cache:', err);
    }
  };

  const handleApplyFilterModal = (filters) => {
    setDescription(filters.description || '');
    setBpartnerId(filters.bpartnerId || '');
    setCostCenterId(filters.costCenterId || '');
    setDateStart(filters.dateStart || '');
    setDateEnd(filters.dateEnd || '');
    setCreatedBy(filters.createdBy || '');
    setStatus(filters.status || '');
    setPage(1);
  };

  const handlePrintPreview = async (po) => {
    if (!po?.c_order_id) return;
    setPrintLoadingId(po.c_order_id);
    try {
      const detailRes = await orderApi.getOrder(po.c_order_id);
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
    <ModuleLayout
      pageTitle="Purchase Orders (Create PO)"
      rootMenuId={1000000}
      rootMenuName="Procurement"
    >
      {loading && orders.length === 0 && !stats ? (
        <PageLoader
          message="Loading Purchase Orders..."
          subtext="Authenticating records from Enterprise Core Engine"
        />
      ) : (
        <div className="space-y-4 sm:space-y-6 animate-fadeIn w-full min-w-0 max-w-full">
          {/* Top Header & Refresh Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[10px] sm:text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
                  Live Enterprise Stream Connected
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
              <span
                className={`text-[10px] sm:text-[11px] font-mono ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Updated: {lastRefreshed.toLocaleTimeString()}
              </span>
              <button
                type="button"
                onClick={fetchList}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                }`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`}
                />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-3 text-xs font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* KPI Summary Cards */}
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

          {/* Filter Options Modal */}
          <OrderFilterModal
            isOpen={filterModalOpen}
            onClose={() => setFilterModalOpen(false)}
            description={description}
            bpartnerId={bpartnerId}
            costCenterId={costCenterId}
            dateStart={dateStart}
            dateEnd={dateEnd}
            createdBy={createdBy}
            status={status}
            costCenters={options?.cost_centers || options?.costCenters || []}
            vendors={vendorsList}
            users={usersList}
            onApply={handleApplyFilterModal}
            onReset={handleResetFilters}
            isDark={isDark}
          />

          {/* Order Table with Integrated Action Bar & Server-Side Controls */}
          <OrderTable
            orders={orders}
            loading={loading}
            total={total}
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={(field, dir) => {
              setSortBy(field);
              setSortDir(dir);
              setPage(1);
            }}
            onView={(po) => {
              const encId = encryptDocumentId(String(po.c_order_id));
              navigate(`/create-po?documentID=${encId}`);
            }}
            onPrint={handlePrintPreview}
            printLoadingId={printLoadingId}
            search={search}
            onSearchChange={setSearch}
            onOpenFilterModal={() => setFilterModalOpen(true)}
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            onOpenCreate={() => navigate('/create-po?documentID=new')}
            isDark={isDark}
          />

          {/* Print Order PDF Preview Modal */}
          <PrintPreviewModal
            isOpen={printModalOpen}
            onClose={() => {
              setPrintModalOpen(false);
              setPrintOrder(null);
              setPrintLines([]);
            }}
            order={printOrder}
            lines={printLines}
            options={{
              documentno: printOrder?.documentno,
            }}
            isDark={isDark}
          />
        </div>
      )}
    </ModuleLayout>
  );
}
