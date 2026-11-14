import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { Building2, Shield, Network, Warehouse, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { authApi } from '../api/auth';
import { useTheme } from '../context/ThemeContext';

const getSelectStyles = (isDark) => ({
  control: (base, state) => ({
    ...base,
    backgroundColor: isDark
      ? state.isDisabled ? '#0b0f19' : '#020617'
      : state.isDisabled ? '#f1f5f9' : '#ffffff',
    borderColor: isDark
      ? state.isFocused ? '#22d3ee' : '#1e293b'
      : state.isFocused ? '#6366f1' : '#cbd5e1',
    borderRadius: '0.75rem',
    minHeight: '44px',
    boxShadow: state.isFocused
      ? isDark
        ? '0 0 0 3px rgba(34, 211, 238, 0.15)'
        : '0 0 0 3px rgba(99, 102, 241, 0.15)'
      : 'none',
    '&:hover': {
      borderColor: isDark
        ? state.isFocused ? '#22d3ee' : '#334155'
        : state.isFocused ? '#6366f1' : '#94a3b8',
    },
    fontSize: '0.875rem',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    color: isDark ? '#f8fafc' : '#0f172a',
    transition: 'all 0.15s ease-in-out',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: isDark ? '#0f172a' : '#ffffff',
    borderRadius: '0.75rem',
    boxShadow: isDark
      ? '0 20px 30px -5px rgba(0, 0, 0, 0.7)'
      : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
    overflow: 'hidden',
    zIndex: 50,
  }),
  menuList: (base) => ({
    ...base,
    padding: '6px',
    maxHeight: '220px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? '#4f46e5'
      : state.isFocused
        ? isDark ? '#1e293b' : '#eef2ff'
        : 'transparent',
    color: state.isSelected
      ? '#ffffff'
      : state.isFocused
        ? isDark ? '#38bdf8' : '#4338ca'
        : isDark ? '#cbd5e1' : '#1e293b',
    borderRadius: '0.5rem',
    padding: '8px 12px',
    fontSize: '0.875rem',
    fontWeight: state.isSelected ? '600' : '400',
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  }),
  singleValue: (base) => ({
    ...base,
    color: isDark ? '#f8fafc' : '#0f172a',
    fontWeight: '500',
  }),
  input: (base) => ({
    ...base,
    color: isDark ? '#f8fafc' : '#0f172a',
  }),
  placeholder: (base) => ({
    ...base,
    color: isDark ? '#64748b' : '#94a3b8',
    fontSize: '0.875rem',
  }),
  indicatorSeparator: () => ({ display: 'none' }),
});

export default function ContextModal({ initialAuth, credentials: propCredentials, user: propUser, onContextSuccess, onSuccess, onBack }) {
  const user = propUser || initialAuth?.user;
  const credentials = propCredentials || initialAuth?.credentials;
  const handleSuccess = onSuccess || onContextSuccess;
  const { isDark } = useTheme();
  const selectStyles = getSelectStyles(isDark);

  const [clients, setClients] = useState([]);
  const [roles, setRoles] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);

  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // 1. Fetch Clients on Mount
  useEffect(() => {
    let isMounted = true;
    authApi.getClients()
      .then((res) => {
        if (!isMounted) return;
        const list = (res.data || []).map((c) => ({
          value: c.id,
          label: c.text,
        }));
        setClients(list);

        if (list.length > 0) {
          const defaultClient = list.find((c) => c.value === 1000000) || list[0];
          setSelectedClient(defaultClient);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError('Failed to load Tenant/Client: ' + (err.response?.data?.message || err.message));
      })
      .finally(() => {
        if (isMounted) setLoadingClients(false);
      });

    return () => { isMounted = false; };
  }, []);

  // 2. Fetch Roles when Client changes
  useEffect(() => {
    if (!selectedClient?.value || !user?.userId) {
      setRoles([]);
      setSelectedRole(null);
      return;
    }

    setLoadingRoles(true);
    authApi.getRoles(user.userId, selectedClient.value)
      .then((res) => {
        const list = (res.data || []).map((r) => ({
          value: r.id,
          label: r.text,
        }));
        setRoles(list);
        if (list.length > 0) {
          setSelectedRole(list[0]);
        } else {
          setSelectedRole(null);
        }
      })
      .catch((err) => {
        console.error('Error fetching roles:', err);
      })
      .finally(() => {
        setLoadingRoles(false);
      });
  }, [selectedClient, user?.userId]);

  // 3. Fetch Orgs when Role or Client changes
  useEffect(() => {
    if (!selectedRole?.value || !selectedClient?.value || !user?.userId) {
      setOrgs([]);
      setSelectedOrg(null);
      return;
    }

    setLoadingOrgs(true);
    authApi.getOrgs(user.userId, selectedClient.value, selectedRole.value)
      .then((res) => {
        const list = (res.data || []).map((o) => ({
          value: o.id,
          label: o.text,
        }));
        setOrgs(list);
        if (list.length > 0) {
          const defaultOrg = list.find((o) => o.value === 1000000) || list[0];
          setSelectedOrg(defaultOrg);
        } else {
          setSelectedOrg(null);
        }
      })
      .catch((err) => {
        console.error('Error fetching organizations:', err);
      })
      .finally(() => {
        setLoadingOrgs(false);
      });
  }, [selectedRole, selectedClient, user?.userId]);

  // 4. Fetch Warehouses when Org or Role changes
  useEffect(() => {
    if (!selectedRole?.value || !selectedOrg?.value) {
      setWarehouses([]);
      setSelectedWarehouse(null);
      return;
    }

    setLoadingWarehouses(true);
    authApi.getWarehouses(selectedRole.value, selectedOrg.value)
      .then((res) => {
        const list = (res.data || []).map((w) => ({
          value: w.id,
          label: w.text,
        }));
        setWarehouses(list);
        if (list.length > 0) {
          setSelectedWarehouse(list[0]);
        } else {
          setSelectedWarehouse(null);
        }
      })
      .catch((err) => {
        console.error('Error fetching warehouses:', err);
      })
      .finally(() => {
        setLoadingWarehouses(false);
      });
  }, [selectedRole, selectedOrg]);

  const handleClientChange = (val) => {
    setSelectedClient(val);
    setSelectedRole(null);
    setSelectedOrg(null);
    setSelectedWarehouse(null);
    setRoles([]);
    setOrgs([]);
    setWarehouses([]);
  };

  const handleRoleChange = (val) => {
    setSelectedRole(val);
    setSelectedOrg(null);
    setSelectedWarehouse(null);
    setOrgs([]);
    setWarehouses([]);
  };

  const handleOrgChange = (val) => {
    setSelectedOrg(val);
    setSelectedWarehouse(null);
    setWarehouses([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClient?.value || !selectedRole?.value || !selectedOrg?.value) {
      setError('Please select Tenant, Role, and Organization.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await authApi.selectContext({
        username: credentials.username,
        password: credentials.password,
        clientId: selectedClient.value,
        roleId: selectedRole.value,
        orgId: selectedOrg.value,
        warehouseId: selectedWarehouse?.value || null,
      });

      if (handleSuccess) {
        handleSuccess({
          ...res,
          contextDetails: {
            clientName: selectedClient.label,
            roleName: selectedRole.label,
            orgName: selectedOrg.label,
            warehouseName: selectedWarehouse ? selectedWarehouse.label : '-',
          },
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to authenticate enterprise context.');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = selectedClient?.value && selectedRole?.value && selectedOrg?.value && !loadingOrgs && !loadingRoles;

  return (
    <div className="relative w-full max-w-lg">
      {/* Ambient Lighting */}
      <div
        className={`absolute -top-10 -left-10 w-64 h-64 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse ${isDark ? 'bg-indigo-500/15' : 'bg-indigo-500/10'
          }`}
      />
      <div
        className={`absolute -bottom-10 -right-10 w-64 h-64 rounded-full blur-3xl pointer-events-none -z-10 ${isDark ? 'bg-cyan-500/15' : 'bg-cyan-500/10'
          }`}
      />

      {/* Main High-Tech Container */}
      <div
        className={`relative backdrop-blur-2xl rounded-3xl border transition-all duration-300 p-8 sm:p-10 overflow-hidden ${isDark
          ? 'bg-slate-900/80 border-slate-800/80 shadow-[0_20px_50px_rgba(8,11,20,0.8)]'
          : 'bg-white/95 border-slate-200/90 shadow-[0_20px_50px_rgba(99,102,241,0.12)]'
          }`}
      >
        {/* Futuristic HUD Corner Brackets */}
        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500 rounded-tl-xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-500 rounded-tr-xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-500 rounded-bl-xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500 rounded-br-xl pointer-events-none" />

        {/* Header */}
        <div
          className={`flex items-center justify-between mb-6 pb-5 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'
            }`}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              {/* <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" /> */}
              <h2
                className={`text-xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'
                  }`}
              >
                Select Work Context
              </h2>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Signed in as{' '}
              <span className={`font-semibold ${isDark ? 'text-cyan-400' : 'text-indigo-600'}`}>
                {user?.name || user?.username}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className={`text-xs font-mono flex items-center gap-1.5 py-1.5 px-3 rounded-lg border transition ${isDark
              ? 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 border-slate-700/60'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200'
              }`}
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-500" /> Back
          </button>
        </div>

        {error && (
          <div
            className={`mb-6 p-4 rounded-xl border text-xs font-medium flex items-start gap-3 backdrop-blur-md animate-fadeIn ${isDark
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-500" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Client / Tenant */}
          <div>
            <label
              className={`block text-xs font-mono font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
            >
              <Building2 className="w-3.5 h-3.5 text-cyan-500" /> Tenant / Client
            </label>
            <Select
              options={clients}
              value={selectedClient}
              onChange={handleClientChange}
              isLoading={loadingClients}
              isDisabled={loadingClients}
              placeholder="Search or select tenant..."
              noOptionsMessage={() => "No tenants found"}
              styles={selectStyles}
              isSearchable
            />
          </div>

          {/* Role */}
          <div>
            <label
              className={`block text-xs font-mono font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
            >
              <Shield className="w-3.5 h-3.5 text-indigo-500" /> Role
            </label>
            <Select
              options={roles}
              value={selectedRole}
              onChange={handleRoleChange}
              isLoading={loadingRoles}
              isDisabled={loadingRoles || roles.length === 0}
              placeholder="Search or select role..."
              noOptionsMessage={() => "No roles available for this tenant"}
              styles={selectStyles}
              isSearchable
            />
          </div>

          {/* Organization */}
          <div>
            <label
              className={`block text-xs font-mono font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
            >
              <Network className="w-3.5 h-3.5 text-cyan-500" /> Organization
            </label>
            <Select
              options={orgs}
              value={selectedOrg}
              onChange={handleOrgChange}
              isLoading={loadingOrgs}
              isDisabled={loadingOrgs || orgs.length === 0}
              placeholder={loadingOrgs ? "Loading organizations..." : "Select organization..."}
              noOptionsMessage={() => "No organizations available"}
              styles={selectStyles}
              isSearchable
            />
          </div>

          {/* Warehouse */}
          <div>
            <label
              className={`block text-xs font-mono font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
            >
              <Warehouse className="w-3.5 h-3.5 text-indigo-500" /> Warehouse (Optional)
            </label>
            <Select
              options={warehouses}
              value={selectedWarehouse}
              onChange={(val) => setSelectedWarehouse(val)}
              isLoading={loadingWarehouses}
              isDisabled={loadingWarehouses || warehouses.length === 0}
              placeholder={loadingWarehouses ? "Loading warehouses..." : "Select specific warehouse..."}
              noOptionsMessage={() => "No warehouses associated"}
              styles={selectStyles}
              isSearchable
              isClearable
            />
          </div>
          <p></p>
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="group relative w-full mt-6 py-3.5 px-5 rounded-xl font-semibold text-sm text-white overflow-hidden shadow-lg shadow-indigo-600/25 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:shadow-[0_0_25px_rgba(99,102,241,0.5)] active:scale-[0.99]"
          >
            <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:left-[100%] transition-all duration-1000 pointer-events-none" />

            <div className="relative flex items-center justify-center gap-2">
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Preparing ERP Session...</span>
                </>
              ) : (
                <>
                  <span>Access Main Portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </>
              )}
            </div>
          </button>
        </form>
      </div>
    </div >
  );
}
