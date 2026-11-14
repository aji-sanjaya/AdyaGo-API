import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../../components/ThemeToggle';
import { authApi } from '../../api/auth';
import ModuleCard from './components/ModuleCard';
import HomeSkeleton from './components/HomeSkeleton';
import PageLoader from '../../components/ui/PageLoader';
import { RefreshCw, LogOut, Sparkles } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { session, logout, prepareSwitchRole } = useAuth();
  const { isDark } = useTheme();

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const roleId = session?.roleId || session?.role_id;
  const user = session?.user;

  useEffect(() => {
    if (!roleId) return;

    let isMounted = true;
    setLoading(true);
    authApi.getWelcomeMenus(roleId)
      .then((res) => {
        if (!isMounted) return;
        setMenus(res.data || []);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load welcome menus:', err);
        setError('Failed to load main menu modules.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [roleId]);

  const handleSwitchRole = () => {
    const success = prepareSwitchRole();
    if (success) {
      navigate('/select-role');
    } else {
      logout();
      navigate('/login');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleOpenMenu = (menu) => {
    sessionStorage.setItem('selected_root_id', String(menu.id));
    sessionStorage.setItem('selected_root_name', menu.name);

    if (menu.path) {
      navigate(menu.path);
    } else {
      navigate('/procurement-dashboard');
    }
  };

  if (loading && menus.length === 0) {
    return <HomeSkeleton />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Application Bar */}
      <header
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl border backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/80 border-slate-800 shadow-[0_10px_30px_rgba(8,11,20,0.6)]'
            : 'bg-white/95 border-slate-200/90 shadow-md shadow-slate-200/50'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl overflow-hidden shadow-md shadow-indigo-500/20 flex-shrink-0 bg-white border border-slate-200/80 p-0.5">
            <img
              src="/apple-touch-icon.png"
              alt="AdyaGo Logo"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                AdyaGo <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">ERP</span>
              </h1>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${
                  isDark
                    ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/30'
                    : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}
              >
                ENTERPRISE
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Autonomous Manufacturing Portal
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <ThemeToggle inline={true} />

          <button
            onClick={handleSwitchRole}
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-mono font-semibold rounded-xl border transition cursor-pointer ${
              isDark
                ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-700 border-slate-700'
                : 'text-slate-700 bg-slate-100 hover:bg-slate-200 border-slate-200'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
            <span>Switch Role</span>
          </button>

          <button
            onClick={handleLogout}
            className={`flex items-center gap-1.5 py-2 px-3 text-xs font-mono font-semibold rounded-xl border transition cursor-pointer ${
              isDark
                ? 'text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border-rose-500/40'
                : 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Welcome Greeting Banner */}
      <div
        className={`p-5 rounded-3xl border backdrop-blur-2xl transition-all duration-300 ${
          isDark
            ? 'bg-slate-900/60 border-slate-800/80'
            : 'bg-white/90 border-slate-200/90 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className={`text-xs font-mono font-semibold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Active Work Session
          </span>
        </div>
        <h2 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-500">{user?.name || user?.username}</span>
        </h2>
        <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Select an authorized operational module below to access core business functions.
        </p>
      </div>

      {/* Main Menu Cards Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-base font-bold font-mono tracking-wider uppercase flex items-center gap-2 ${
            isDark ? 'text-slate-300' : 'text-slate-800'
          }`}>
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>Authorized Main Modules</span>
          </h3>
          <span className={`text-xs font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            {menus.length} Modules Available
          </span>
        </div>

        {loading ? (
          <PageLoader
            message="Loading Authorized Enterprise Modules..."
            subtext="Authenticating role permissions against ADW_Web_Portal_Menus"
          />
        ) : error ? (
          <div
            className={`p-8 rounded-3xl border text-center ${
              isDark ? 'bg-rose-950/20 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}
          >
            <p className="text-sm font-medium">{error}</p>
          </div>
        ) : menus.length === 0 ? (
          <div
            className={`p-12 rounded-3xl border border-dashed text-center ${
              isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-300 bg-white'
            }`}
          >
            <h4 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>
              No Modules Available
            </h4>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Your active role does not have any authorized modules configured.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menus.map((menu) => (
              <ModuleCard
                key={menu.id}
                menu={menu}
                isDark={isDark}
                onOpen={handleOpenMenu}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

