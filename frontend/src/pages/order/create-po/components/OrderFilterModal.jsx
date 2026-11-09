import React from 'react';
import { X, Filter, RotateCcw, Check } from 'lucide-react';

export default function OrderFilterModal({
  isOpen,
  onClose,
  isDark,
  options,
  filters,
  onApply,
  onReset,
}) {
  const [localFilters, setLocalFilters] = React.useState(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setLocalFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = (e) => {
    e.preventDefault();
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    onReset();
    onClose();
  };

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'DR', label: 'Draft' },
    { value: 'IP', label: 'In Progress' },
    { value: 'CO', label: 'Completed' },
    { value: 'CL', label: 'Closed' },
    { value: 'VO', label: 'Voided' },
    { value: 'RE', label: 'Reversed' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Filter Purchase Orders</h3>
              <p className="text-xs text-slate-500 font-mono">Refine document list criteria</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleApply} className="p-6 space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
              Document Status
            </label>
            <select
              value={localFilters.status || ''}
              onChange={(e) => handleChange('status', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-cyan-500/20 ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                  : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
              }`}
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value} className={isDark ? 'bg-slate-800' : 'bg-white'}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Cost Center Filter */}
          <div>
            <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
              Cost Center
            </label>
            <select
              value={localFilters.costCenterId || ''}
              onChange={(e) => handleChange('costCenterId', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-cyan-500/20 ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                  : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
              }`}
            >
              <option value="">All Cost Centers</option>
              {(options?.cost_centers || []).map((cc) => (
                <option key={cc.id} value={cc.id} className={isDark ? 'bg-slate-800' : 'bg-white'}>
                  {cc.text}
                </option>
              ))}
            </select>
          </div>

          {/* Date Ordered Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
                Date From
              </label>
              <input
                type="date"
                value={localFilters.dateStart || ''}
                onChange={(e) => handleChange('dateStart', e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-cyan-500/20 ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                    : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">
                Date To
              </label>
              <input
                type="date"
                value={localFilters.dateEnd || ''}
                onChange={(e) => handleChange('dateEnd', e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl border text-sm font-medium transition-all outline-none focus:ring-2 focus:ring-cyan-500/20 ${
                  isDark
                    ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-cyan-500'
                    : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
            <button
              type="button"
              onClick={handleReset}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-colors ${
                  isDark
                    ? 'bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white'
                    : 'bg-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
