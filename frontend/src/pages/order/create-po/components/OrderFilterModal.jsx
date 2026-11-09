import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import {
  X,
  Filter,
  RotateCcw,
  Calendar,
  Check,
  Building,
  Tag,
  FileText,
  Briefcase,
  User,
} from 'lucide-react';
import { getCustomSelectStyles } from '../../../../components/ui/selectStyles';
import CustomDatePicker from '../../../../components/ui/CustomDatePicker';

export default function OrderFilterModal({
  isOpen,
  onClose,
  description = '',
  bpartnerId = '',
  costCenterId = '',
  dateStart = '',
  dateEnd = '',
  createdBy = '',
  status = '',
  costCenters = [],
  vendors = [],
  users = [],
  onApply,
  onReset,
  isDark,
}) {
  const [localDescription, setLocalDescription] = useState(description || '');
  const [localBPartnerId, setLocalBPartnerId] = useState(bpartnerId || '');
  const [localCostCenterId, setLocalCostCenterId] = useState(costCenterId || '');
  const [localDateStart, setLocalDateStart] = useState(dateStart || '');
  const [localDateEnd, setLocalDateEnd] = useState(dateEnd || '');
  const [localCreatedBy, setLocalCreatedBy] = useState(createdBy || '');
  const [localStatus, setLocalStatus] = useState(status || '');

  useEffect(() => {
    if (isOpen) {
      setLocalDescription(description || '');
      setLocalBPartnerId(bpartnerId || '');
      setLocalCostCenterId(costCenterId || '');
      setLocalDateStart(dateStart || '');
      setLocalDateEnd(dateEnd || '');
      setLocalCreatedBy(createdBy || '');
      setLocalStatus(status || '');
    }
  }, [isOpen, description, bpartnerId, costCenterId, dateStart, dateEnd, createdBy, status]);

  if (!isOpen) return null;

  const handleApply = (e) => {
    e.preventDefault();
    onApply({
      description: localDescription,
      bpartnerId: localBPartnerId,
      costCenterId: localCostCenterId,
      dateStart: localDateStart,
      dateEnd: localDateEnd,
      createdBy: localCreatedBy,
      status: localStatus,
    });
    onClose();
  };

  const handleClear = () => {
    setLocalDescription('');
    setLocalBPartnerId('');
    setLocalCostCenterId('');
    setLocalDateStart('');
    setLocalDateEnd('');
    setLocalCreatedBy('');
    setLocalStatus('');
    onReset();
    onClose();
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'DR', label: 'Draft (DR)' },
    { value: 'IP', label: 'In Progress (IP)' },
    { value: 'AP', label: 'Approved (AP)' },
    { value: 'CO', label: 'Completed (CO)' },
    { value: 'CL', label: 'Closed (CL)' },
    { value: 'VO', label: 'Voided (VO)' },
  ];

  const customSelectStyles = getCustomSelectStyles(isDark);

  const statusReactOptions = statusOptions.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  const vendorReactOptions = [
    { value: '', label: 'All Business Partners' },
    ...vendors.map((v) => ({
      value: String(v.id),
      label: v.text || v.name || `${v.value} - ${v.name}`,
    })),
  ];

  const costCenterReactOptions = [
    { value: '', label: 'All Cost Centers' },
    ...costCenters.map((cc) => ({
      value: String(cc.id),
      label: cc.text || `${cc.name} (${cc.value})`,
    })),
  ];

  const userReactOptions = [
    { value: '', label: 'All Creators' },
    ...users.map((u) => ({
      value: String(u.id),
      label: u.text || u.name,
    })),
  ];

  const selectedStatusOption =
    statusReactOptions.find((opt) => opt.value === localStatus) || statusReactOptions[0];
  const selectedVendorOption =
    vendorReactOptions.find((opt) => String(opt.value) === String(localBPartnerId)) || vendorReactOptions[0];
  const selectedCostCenterOption =
    costCenterReactOptions.find((opt) => String(opt.value) === String(localCostCenterId)) || costCenterReactOptions[0];
  const selectedUserOption =
    userReactOptions.find((opt) => String(opt.value) === String(localCreatedBy)) || userReactOptions[0];

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/75 backdrop-blur-sm">
      <div
        className={`w-full max-w-4xl max-h-[92vh] rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fadeIn ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-6 border-b flex items-center justify-between flex-shrink-0 ${
            isDark ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base tracking-tight">Filter Purchase Orders</h3>
              <p className={`text-[11px] sm:text-xs mt-0.5 font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Refine orders by partners, cost center, dates, creator, and status
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer ${
              isDark
                ? 'border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'border-slate-200 hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body - 2 Columns Large Grid */}
        <form onSubmit={handleApply} className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* LEFT COLUMN: Description, Business Partner, Cost Center */}
            <div className="space-y-4">
              <div className="border-b border-slate-800/40 pb-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-cyan-400">
                  Document Details
                </span>
              </div>

              {/* 1. Description */}
              <div>
                <label className="block text-[11px] font-mono uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Description</span>
                </label>
                <input
                  type="text"
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  placeholder="Filter by description content..."
                  className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono border outline-none transition ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* 2. Business Partner */}
              <div>
                <label className="block text-[11px] font-mono uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                  <span>Business Partner</span>
                </label>
                <Select
                  options={vendorReactOptions}
                  value={selectedVendorOption}
                  onChange={(opt) => setLocalBPartnerId(opt?.value || '')}
                  styles={customSelectStyles}
                  isSearchable
                  placeholder="Select Business Partner..."
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              {/* 3. Cost Center */}
              <div>
                <label className="block text-[11px] font-mono uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cost Center</span>
                </label>
                <Select
                  options={costCenterReactOptions}
                  value={selectedCostCenterOption}
                  onChange={(opt) => setLocalCostCenterId(opt?.value || '')}
                  styles={customSelectStyles}
                  isSearchable
                  placeholder="Select Cost Center..."
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
            </div>

            {/* RIGHT COLUMN: Date Ordered (Range Date), Created By, Status */}
            <div className="space-y-4">
              <div className="border-b border-slate-800/40 pb-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-indigo-400">
                  Timeline & Status
                </span>
              </div>

              {/* 1. Date Ordered (Range Date) */}
              <div>
                <label className="block text-[11px] font-mono uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Date Ordered (Range Date)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 mb-1 block">From</span>
                    <CustomDatePicker
                      value={localDateStart}
                      onChange={setLocalDateStart}
                      placeholder="Start Date"
                      isDark={isDark}
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 mb-1 block">To</span>
                    <CustomDatePicker
                      value={localDateEnd}
                      onChange={setLocalDateEnd}
                      placeholder="End Date"
                      isDark={isDark}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Created By */}
              <div>
                <label className="block text-[11px] font-mono uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-400" />
                  <span>Created By</span>
                </label>
                <Select
                  options={userReactOptions}
                  value={selectedUserOption}
                  onChange={(opt) => setLocalCreatedBy(opt?.value || '')}
                  styles={customSelectStyles}
                  isSearchable
                  placeholder="Select Created By..."
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>

              {/* 3. Status */}
              <div>
                <label className="block text-[11px] font-mono uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Status</span>
                </label>
                <Select
                  options={statusReactOptions}
                  value={selectedStatusOption}
                  onChange={(opt) => setLocalStatus(opt?.value || '')}
                  styles={customSelectStyles}
                  isSearchable={false}
                  placeholder="Select Document Status..."
                  menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons Footer */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-800/80 mt-6">
            <button
              type="button"
              onClick={handleClear}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl sm:rounded-2xl border text-xs font-mono font-semibold transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-3.5 py-2 rounded-xl sm:rounded-2xl text-xs font-mono font-semibold transition cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-mono font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
