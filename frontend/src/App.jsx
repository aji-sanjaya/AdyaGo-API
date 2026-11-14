import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeToggle from './components/ThemeToggle';
import TopProgressBar from './components/ui/TopProgressBar';
import LoginPage from './pages/auth/login/LoginPage';
import SelectRolePage from './pages/auth/select-role/SelectRolePage';
import HomePage from './pages/home/HomePage';
import ProcurementDashboardPage from './pages/dashboard/procurement/ProcurementDashboardPage';
import SalesDashboardPage from './pages/dashboard/sales/SalesDashboardPage';
import DeliveryDashboardPage from './pages/dashboard/delivery/DeliveryDashboardPage';
import WarehouseDashboardPage from './pages/dashboard/warehouse/WarehouseDashboardPage';
import CreatePrPage from './pages/requisition/create-pr/CreatePrPage';
import CreateRequisitionPage from './pages/requisition/create-pr/CreateRequisitionPage';
import CreatePoPage from './pages/order/create-po/CreatePoPage';
import CreatePurchaseOrderPage from './pages/order/create-po/CreatePurchaseOrderPage';

function RequisitionIndexDispatcher() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('documentID') || searchParams.get('document_id');

  if (docId) {
    return <CreateRequisitionPage key={docId} documentIdParam={docId} />;
  }

  return <CreatePrPage />;
}

function PoIndexDispatcher() {
  const [searchParams] = useSearchParams();
  const docId = searchParams.get('documentID') || searchParams.get('document_id');

  if (docId) {
    return <CreatePurchaseOrderPage key={docId} documentIdParam={docId} />;
  }

  return <CreatePoPage />;
}

function AppContent() {
  const { isDark } = useTheme();
  const location = useLocation();

  const isModulePage =
    location.pathname.includes('-dashboard') ||
    location.pathname.startsWith('/create-pr') ||
    location.pathname.startsWith('/create-po');

  if (isModulePage) {
    return (
      <main className="w-full min-h-screen">
        <TopProgressBar />
        <Routes>
          <Route
            path="/procurement-dashboard"
            element={
              <ProtectedRoute>
                <ProcurementDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-dashboard"
            element={
              <ProtectedRoute>
                <SalesDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/delivery-dashboard"
            element={
              <ProtectedRoute>
                <DeliveryDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/warehouse-dashboard"
            element={
              <ProtectedRoute>
                <WarehouseDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-pr"
            element={
              <ProtectedRoute>
                <RequisitionIndexDispatcher />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-pr/new"
            element={
              <ProtectedRoute>
                <CreateRequisitionPage key="new" documentIdParam="new" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-po"
            element={
              <ProtectedRoute>
                <PoIndexDispatcher />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-po/new"
            element={
              <ProtectedRoute>
                <CreatePurchaseOrderPage key="new" documentIdParam="new" />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
    );
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif] transition-colors duration-300 ${isDark ? 'bg-[#080c14] text-slate-100' : 'bg-slate-50 text-slate-800'
        }`}
    >
      {/* Top Cyber Transition Bar */}
      <TopProgressBar />

      {/* Floating Theme Switcher */}
      <ThemeToggle />

      {/* Cyber Grid Layer */}
      <div
        className={`absolute inset-0 pointer-events-none -z-20 transition-opacity duration-500 ${isDark
          ? 'bg-[radial-gradient(#1e293b_1px,transparent_1px)] opacity-50'
          : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] opacity-70'
          } [background-size:28px_28px]`}
      />

      {/* Ambient Glow Lights */}
      <div
        className={`absolute top-0 left-1/4 -translate-x-1/2 w-[700px] h-[400px] blur-[120px] pointer-events-none -z-10 transition-all duration-500 ${isDark
          ? 'bg-gradient-to-b from-indigo-600/20 via-cyan-500/10 to-transparent'
          : 'bg-gradient-to-b from-indigo-400/20 via-cyan-400/15 to-transparent'
          }`}
      />
      <div
        className={`absolute bottom-0 right-1/4 w-[600px] h-[400px] blur-[120px] pointer-events-none -z-10 transition-all duration-500 ${isDark
          ? 'bg-gradient-to-t from-cyan-600/15 via-indigo-600/10 to-transparent'
          : 'bg-gradient-to-t from-cyan-500/10 via-indigo-400/10 to-transparent'
          }`}
      />

      {/* Main Routed Area */}
      <main className="w-full flex justify-center items-center z-10 my-auto">
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Context Selection (Semi-protected) */}
          <Route path="/select-role" element={<SelectRolePage />} />

          {/* Protected Main Home Portal Route */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />

          {/* Module Routes */}
          <Route
            path="/procurement-dashboard"
            element={
              <ProtectedRoute>
                <ProcurementDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-dashboard"
            element={
              <ProtectedRoute>
                <SalesDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Default Redirects to /home */}
          <Route path="/dashboard" element={<Navigate to="/home" replace />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>

      {/* High-Tech Footer */}
      <footer
        className={`mt-8 text-center text-xs font-mono flex items-center justify-center gap-3 transition-colors ${isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
      >

        <span>ADYAWINSA GROUP</span>
        <span>&copy; {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
