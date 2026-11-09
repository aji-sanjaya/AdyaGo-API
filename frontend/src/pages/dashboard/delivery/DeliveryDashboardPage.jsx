import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useTheme } from '../../../context/ThemeContext';
import ModuleLayout from '../../../layouts/ModuleLayout';
import { dashboardApi } from '../../../api/dashboard';
import PageLoader from '../../../components/ui/PageLoader';
import DeliveryKpiMetrics from './components/DeliveryKpiMetrics';
import ShipmentTrendChart from './components/ShipmentTrendChart';
import TopDeliveryCustomersList from './components/TopDeliveryCustomersList';
import RecentShipmentsTable from './components/RecentShipmentsTable';
import { RefreshCw, AlertCircle } from 'lucide-react';

export default function DeliveryDashboardPage() {
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

    dashboardApi.getDeliveryDashboard(clientId, orgId)
      .then((res) => {
        setData(res.data);
        setLastRefreshed(new Date());
      })
      .catch((err) => {
        console.error('Failed to load delivery dashboard:', err);
        setError('Failed to fetch real-time delivery intelligence from Enterprise Core.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, [clientId, orgId]);

  const kpis = data?.kpis;
  const shipmentTrend = data?.shipment_trend || [];
  const topCustomers = data?.top_customers || [];
  const recentActivities = data?.recent_activities || [];

  return (
    <ModuleLayout pageTitle="Delivery Achievement Dashboard" rootMenuId={1000030} rootMenuName="Dashboard">
      {loading && !data ? (
        <PageLoader
          message="Loading Delivery Intelligence..."
          subtext="Executing real-time shipment queries on Enterprise Core Engine"
        />
      ) : (
        <div className="space-y-6 animate-fadeIn">
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
                Delivery Achievement
              </h1>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Overview of outbound logistics performance, delivery rate, customer shipment share, and recent dispatches.
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
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
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

          {/* KPI Metrics */}
          <DeliveryKpiMetrics kpis={kpis} loading={loading} isDark={isDark} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8">
              <ShipmentTrendChart shipmentTrend={shipmentTrend} isDark={isDark} />
            </div>
            <div className="lg:col-span-4">
              <TopDeliveryCustomersList topCustomers={topCustomers} isDark={isDark} />
            </div>
          </div>

          {/* Recent Shipments Table */}
          <RecentShipmentsTable recentActivities={recentActivities} isDark={isDark} />
        </div>
      )}
    </ModuleLayout>
  );
}

