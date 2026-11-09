import React from 'react';
import { Search, Plus, SlidersHorizontal } from 'lucide-react';

export default function RequisitionFilterBar({
  search,
  onSearchChange,
  onOpenFilterModal,
  activeFilterCount = 0,
  onOpenCreate,
  isDark,
}) {
  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border transition-all duration-300 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search by Text */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search document no, description..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs font-mono border outline-none transition ${
              isDark
                ? 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60'
                : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
            }`}
          />
        </div>

        {/* Action Buttons: Filter & New Requisition */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Filter Button (Click to show modal) */}
          <button
            type="button"
            onClick={onOpenFilterModal}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-mono font-semibold transition cursor-pointer ${
              activeFilterCount > 0
                ? isDark
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                  : 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : isDark
                ? 'bg-slate-950/70 hover:bg-slate-800 text-slate-300 border-slate-800'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-cyan-500 text-slate-950">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* New Requisition Button */}
          <button
            type="button"
            onClick={onOpenCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-mono font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Requisition</span>
          </button>
        </div>
      </div>
    </div>
  );
}
