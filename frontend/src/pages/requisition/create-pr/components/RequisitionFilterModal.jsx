import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { X, Filter, RotateCcw, Calendar, Check, Building, Tag } from 'lucide-react';
import { getCustomSelectStyles } from '../../../../components/ui/selectStyles';
import CustomDatePicker from '../../../../components/ui/CustomDatePicker';

export default function RequisitionFilterModal({
  isOpen,
  onClose,
  status,
  costCenterId,
  dateStart,
  dateEnd,
  costCenters = [],
  onApply,
  onReset,
  isDark,
}) {
  const [localStatus, setLocalStatus] = useState(status || '');
  const [localCostCenterId, setLocalCostCenterId] = useState(costCenterId || '');
  const [localDateStart, setLocalDateStart] = useState(dateStart || '');
  const [localDateEnd, setLocalDateEnd] = useState(dateEnd || '');

  // Synchronize when opened
  useEffect(() => {
    if (isOpen) {
      setLocalStatus(status || '');
      setLocalCostCenterId(costCenterId || '');
      setLocalDateStart(dateStart || '');
      setLocalDateEnd(dateEnd || '');
    }
  }, [isOpen, status, costCenterId, dateStart, dateEnd]);

  if (!isOpen) return null;

  const handleApply = (e) => {
    e.preventDefault();
    onApply({
      status: localStatus,
      costCenterId: localCostCenterId,
      dateStart: localDateStart,
      dateEnd: localDateEnd,
    });
    onClose();
  };

  const handleClear = () => {
    setLocalStatus('');
    setLocalCostCenterId('');
    setLocalDateStart('');
    setLocalDateEnd('');
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

  const costCenterReactOptions = [
    { value: '', label: 'All Cost Centers' },
    ...costCenters.map((cc) => ({
      value: String(cc.id),
      label: cc.text,
    })),
  ];

  const selectedStatusOption = statusReactOptions.find((opt) => opt.value === localStatus) || statusReactOptions[0];
  const selectedCostCenterOption = costCenterReactOptions.find((opt) => opt.value === String(localCostCenterId)) || costCenterReactOptions[0];

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg max-h-[92vh] rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fadeIn ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`p-4 sm:p-6 border-b flex items-center justify-between flex-shrink-0 ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center flex-shrink-0">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight">Filter Options</h3>
              <p className={`text-[11px] sm:text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Filter requisitions by status, cost center, and document date
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 sm:p-2 rounded-xl border transition cursor-pointer ${
              isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Form Body */}
        <form onSubmit={handleApply} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-cyan-400" />
              <span>Document Status</span>
            </label>
            <Select
              value={selectedStatusOption}
              onChange={(opt) => setLocalStatus(opt ? opt.value : '')}
              options={statusReactOptions}
              styles={customSelectStyles}
              isSearchable={false}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>

          {/* Cost Center Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cost Center</span>
            </label>
            <Select
              value={selectedCostCenterOption}
              onChange={(opt) => setLocalCostCenterId(opt ? opt.value : '')}
              options={costCenterReactOptions}
              styles={customSelectStyles}
              isSearchable
              placeholder="Select Cost Center..."
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
          </div>

          {/* Document Date Range Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase font-semibold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Document Date Range</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] font-mono text-slate-500 mb-1">From Date</span>
                <CustomDatePicker
                  value={localDateStart}
                  onChange={(val) => setLocalDateStart(val)}
                  placeholder="From date"
                  isDark={isDark}
                />
              </div>
              <div>
                <span className="block text-[10px] font-mono text-slate-500 mb-1">To Date</span>
                <CustomDatePicker
                  value={localDateEnd}
                  onChange={(val) => setLocalDateEnd(val)}
                  placeholder="To date"
                  isDark={isDark}
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleClear}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-mono transition cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-2xl text-xs font-mono transition cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-mono font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply Filter</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

