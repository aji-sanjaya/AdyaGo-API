import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Select from 'react-select';
import { X, Filter, RotateCcw, Calendar, Check, Building } from 'lucide-react';
import { getCustomSelectStyles } from '../../../../components/ui/selectStyles';
import CustomDatePicker from '../../../../components/ui/CustomDatePicker';

export default function OrderFilterModal({
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
      label: cc.text || `${cc.name} (${cc.value})`,
    })),
  ];

  const selectedStatusOption =
    statusReactOptions.find((opt) => opt.value === localStatus) || statusReactOptions[0];
  const selectedCostCenterOption =
    costCenterReactOptions.find((opt) => opt.value === String(localCostCenterId)) || costCenterReactOptions[0];

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg max-h-[92vh] rounded-2xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-300 animate-fadeIn ${
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
              <p className="text-xs font-mono text-slate-500">Refine search criteria and dates</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl transition cursor-pointer ${
              isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Document Status
            </label>
            <Select
              options={statusReactOptions}
              value={selectedStatusOption}
              onChange={(opt) => setLocalStatus(opt?.value || '')}
              styles={customSelectStyles}
              isSearchable={false}
            />
          </div>

          {/* Cost Center */}
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
              Cost Center
            </label>
            <Select
              options={costCenterReactOptions}
              value={selectedCostCenterOption}
              onChange={(opt) => setLocalCostCenterId(opt?.value || '')}
              styles={customSelectStyles}
              isSearchable
              placeholder="Search or select cost center..."
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Date Ordered From
              </label>
              <CustomDatePicker
                value={localDateStart}
                onChange={setLocalDateStart}
                placeholder="Start Date"
                isDark={isDark}
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                Date Ordered To
              </label>
              <CustomDatePicker
                value={localDateEnd}
                onChange={setLocalDateEnd}
                placeholder="End Date"
                isDark={isDark}
              />
            </div>
          </div>

          {/* Action Buttons */}
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
