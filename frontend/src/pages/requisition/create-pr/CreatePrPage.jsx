import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import { idempiereConfig } from '../../../config/idempiere';
import ModuleLayout from '../../../layouts/ModuleLayout';
import { requisitionApi } from '../../../api/requisition';
import PageLoader from '../../../components/ui/PageLoader';
import RequisitionStatsCards from './components/RequisitionStatsCards';
import RequisitionFilterModal from './components/RequisitionFilterModal';
import RequisitionTable from './components/RequisitionTable';
import RequisitionDetailModal from './components/RequisitionDetailModal';
import PrintPreviewModal from './components/PrintPreviewModal';
import { encryptDocumentId } from '../../../utils/crypto';
import { RefreshCw, AlertCircle } from 'lucide-react';

const FILTER_STORAGE_KEY = 'adyago_requisition_filters';
const LEGACY_FILTER_STORAGE_KEY = 'factoryhub_requisition_filters';

const loadSavedFilters = () => {
  try {
    const legacy = localStorage.getItem(LEGACY_FILTER_STORAGE_KEY);
    if (legacy) {
      localStorage.removeItem(LEGACY_FILTER_STORAGE_KEY);
      if (!localStorage.getItem(FILTER_STORAGE_KEY)) {
        localStorage.setItem(FILTER_STORAGE_KEY, legacy);
      }
    }
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

export default function CreatePrPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // Data State
  const [stats, setStats] = useState(null);
  const [requisitions, setRequisitions] = useState([]);
  const [total, setTotal] = useState(0);
  const [options, setOptions] = useState(null);

  // Filters State initialized from localStorage cache
  const savedFilters = React.useMemo(() => loadSavedFilters(), []);
  const [search, setSearch] = useState(savedFilters.search || '');
  const [status, setStatus] = useState(savedFilters.status || '');
  const [costCenterId, setCostCenterId] = useState(savedFilters.costCenterId || '');
  const [dateStart, setDateStart] = useState(savedFilters.dateStart || '');
  const [dateEnd, setDateEnd] = useState(savedFilters.dateEnd || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(savedFilters.limit || 10);
  const [sortBy, setSortBy] = useState(savedFilters.sortBy || 'datedoc');
  const [sortDir, setSortDir] = useState(savedFilters.sortDir || 'desc');

  // Modals State
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printRequisition, setPrintRequisition] = useState(null);
  const [printLines, setPrintLines] = useState([]);
  const [printLoadingId, setPrintLoadingId] = useState(null);

  const handlePrintPreview = async (req) => {
    if (!req?.id) return;
    setPrintLoadingId(req.id);
    try {
      const [detailRes, linesRes] = await Promise.all([
        requisitionApi.getRequisitionDetail(req.id),
        requisitionApi.getRequisitionLines(req.id),
      ]);
      const headerData = detailRes?.data || req;
      const linesData = linesRes?.data || [];
      setPrintRequisition({
        ...req,
        ...headerData,
        status_label: headerData.status_label || headerData.docstatus || req.docstatus,
        cost_center_value: headerData.cost_center_value || req.cost_center_value || req.cost_center_name || 'PROD',
        client_name: headerData.client_name || session?.clientName || idempiereConfig.tenant.name,
        logo_base64: headerData.logo_base64 || options?.logo_base64,
      });
      setPrintLines(linesData);
      setPrintModalOpen(true);
    } catch (err) {
      console.error('Failed to prepare print preview:', err);
    } finally {
      setPrintLoadingId(null);
    }
  };

  const clientId = session?.clientId || session?.client_id || 0;
  const orgId = session?.orgId || session?.org_id || 0;

  const activeFilterCount =
    (status ? 1 : 0) +
    (costCenterId ? 1 : 0) +
    (dateStart ? 1 : 0) +
    (dateEnd ? 1 : 0) +
    (search.trim() ? 1 : 0);

  // Load Master Options once
  useEffect(() => {
    requisitionApi.getMasterOptions({ client_id: clientId, org_id: orgId })
      .then((res) => {
        setOptions(res.data);
      })
      .catch((err) => {
        console.error('Failed to load master options:', err);
      });
  }, [clientId, orgId]);

  // Fetch Requisitions list & stats
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
    if (status) params.status = status;
    if (costCenterId) params.cost_center_id = costCenterId;
    if (dateStart) params.date_start = dateStart;
    if (dateEnd) params.date_end = dateEnd;

    requisitionApi.getRequisitions(params)
      .then((res) => {
        setStats(res.data?.stats);
        setRequisitions(res.data?.requisitions || []);
        setTotal(res.data?.total || 0);
        setLastRefreshed(new Date());
      })
      .catch((err) => {
        console.error('Failed to load requisitions:', err);
        setError('Failed to fetch purchase requisitions from Enterprise Core.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchList();
  }, [clientId, orgId, page, limit, status, costCenterId, dateStart, dateEnd, sortBy, sortDir]);

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
        dateStart ||
        dateEnd ||
        search.trim() ||
        limit !== 10 ||
        sortBy !== 'datedoc' ||
        sortDir !== 'desc'
      );

      if (hasActive) {
        localStorage.setItem(
          FILTER_STORAGE_KEY,
          JSON.stringify({
            status,
            costCenterId,
            dateStart,
            dateEnd,
            search,
            limit,
            sortBy,
            sortDir,
          })
        );
        localStorage.removeItem(LEGACY_FILTER_STORAGE_KEY);
      } else {
        localStorage.removeItem(FILTER_STORAGE_KEY);
        localStorage.removeItem(LEGACY_FILTER_STORAGE_KEY);
      }
    } catch (err) {
      console.error('Failed to save filter cache:', err);
    }
  }, [status, costCenterId, dateStart, dateEnd, search, limit, sortBy, sortDir]);

  const handleResetFilters = () => {
    setStatus('');
    setCostCenterId('');
    setDateStart('');
    setDateEnd('');
    setSearch('');
    setSortBy('datedoc');
    setSortDir('desc');
    setLimit(10);
    setPage(1);
    try {
      localStorage.removeItem(FILTER_STORAGE_KEY);
      localStorage.removeItem(LEGACY_FILTER_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to clear filter cache:', err);
    }
  };

  const handleApplyFilterModal = (filters) => {
    setStatus(filters.status);
    setCostCenterId(filters.costCenterId);
    setDateStart(filters.dateStart);
    setDateEnd(filters.dateEnd);
    setPage(1);
  };

  return (
    <ModuleLayout pageTitle="Purchase Requisitions (Create PR)" rootMenuId={1000000} rootMenuName="Procurement">
      {loading && requisitions.length === 0 && !stats ? (
        <PageLoader
          message="Loading Purchase Requisitions..."
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
              <span className={`text-[10px] sm:text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Updated: {lastRefreshed.toLocaleTimeString()}
              </span>
              <button
                onClick={fetchList}
                disabled={loading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
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
          <RequisitionStatsCards
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
          <RequisitionFilterModal
            isOpen={filterModalOpen}
            onClose={() => setFilterModalOpen(false)}
            status={status}
            costCenterId={costCenterId}
            dateStart={dateStart}
            dateEnd={dateEnd}
            costCenters={options?.cost_centers || []}
            onApply={handleApplyFilterModal}
            onReset={handleResetFilters}
            isDark={isDark}
          />

          {/* Requisition Table with Integrated Action Bar & Server-Side Controls */}
          <RequisitionTable
            requisitions={requisitions}
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
            onViewDetail={(id) => {
              const encId = encryptDocumentId(id);
              navigate(`/create-pr?documentID=${encId}`);
            }}
            onPrintPreview={handlePrintPreview}
            printLoadingId={printLoadingId}
            search={search}
            onSearchChange={setSearch}
            onOpenFilterModal={() => setFilterModalOpen(true)}
            activeFilterCount={activeFilterCount}
            onResetFilters={handleResetFilters}
            onOpenCreate={() => navigate('/create-pr?documentID=new')}
            isDark={isDark}
          />

          {/* Detail / Line Items Modal */}
          <RequisitionDetailModal
            isOpen={!!selectedDetailId}
            requisitionId={selectedDetailId}
            onClose={() => setSelectedDetailId(null)}
            onUpdated={fetchList}
            session={session}
            isDark={isDark}
          />

          {/* Print Voucher PDF Preview Modal */}
          <PrintPreviewModal
            isOpen={printModalOpen}
            onClose={() => {
              setPrintModalOpen(false);
              setPrintRequisition(null);
              setPrintLines([]);
            }}
            requisition={printRequisition}
            lines={printLines}
            options={{
              documentno: printRequisition?.documentno,
            }}
            isDark={isDark}
          />
        </div>
      )}
    </ModuleLayout>
  );
}

