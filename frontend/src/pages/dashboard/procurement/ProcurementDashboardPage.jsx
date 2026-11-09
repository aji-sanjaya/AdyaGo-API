import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import ModuleLayout from '../../../layouts/ModuleLayout';
import { dashboardApi } from '../../../api/dashboard';
import PageLoader from '../../../components/ui/PageLoader';
import KpiMetrics from './components/KpiMetrics';
import SpendTrendChart from './components/SpendTrendChart';
import TopSuppliersList from './components/TopSuppliersList';
import RecentOrdersTable from './components/RecentOrdersTable';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function ProcurementDashboardPage() {
  const { session } = useAuth();
  const { isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const clientId = session?.clientId || session?.client_id || 0;
  const orgId = session?.orgId || session?.org_id || 0;

  const fetchData = () => {
    setLoading(true);
    setError(null);

    dashboardApi.getProcurementDashboard(clientId, orgId)
      .then((res) => {
        setData(res.data);
        setLastRefreshed(new Date());
      })
      .catch((err) => {
        console.error('Failed to load procurement dashboard:', err);
        setError('Failed to fetch real-time procurement analytics from Enterprise Core.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [clientId, orgId]);

  const formatIDR = (val) => {
    if (!val || isNaN(val)) return 'IDR 0';
    if (val >= 1_000_000_000) {
      return `IDR ${(val / 1_000_000_000).toFixed(2)}B`;
    }
    if (val >= 1_000_000) {
      return `IDR ${(val / 1_000_000).toFixed(2)}M`;
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  };

  const kpis = data?.kpis;
  const spendTrend = data?.spend_trend || [];
  const topSuppliers = data?.top_suppliers || [];
  const recentOrders = data?.recent_orders || [];

  return (
    <ModuleLayout pageTitle="Procurement Dashboard" rootMenuId={1000030} rootMenuName="Dashboard">
      {loading && !data ? (
        <PageLoader
          message="Loading Procurement Intelligence..."
          subtext="Executing real-time analytics query on Enterprise Core Engine"
        />
      ) : (
        <div className="space-y-6">
          {/* Top Header & Refresh Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400">
                Live Enterprise Stream Connected
              </span>
            </div>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Procurement Intelligence
            </h1>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Real-time purchasing overview, supplier distribution, and commitment tracking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Updated: {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-2xl border border-rose-500/40 bg-rose-950/20 text-rose-300 flex items-center gap-3 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Primary KPI Stat Cards */}
        <KpiMetrics
          kpis={kpis}
          loading={loading}
          isDark={isDark}
          formatIDR={formatIDR}
        />

        {/* Middle Section: Spend Trend & Top Suppliers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <SpendTrendChart
              spendTrend={spendTrend}
              isDark={isDark}
              formatIDR={formatIDR}
            />
          </div>
          <div>
            <TopSuppliersList
              topSuppliers={topSuppliers}
              isDark={isDark}
              formatIDR={formatIDR}
            />
          </div>
        </div>

        {/* Bottom Section: Recent 10 Purchase Orders Table */}
        <RecentOrdersTable
          recentOrders={recentOrders}
          isDark={isDark}
          formatIDR={formatIDR}
        />
      </div>
      )}
    </ModuleLayout>
  );
}
