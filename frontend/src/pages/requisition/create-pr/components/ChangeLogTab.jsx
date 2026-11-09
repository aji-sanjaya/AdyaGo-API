import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  Clock,
  ArrowRight,
  Layers,
  FileText,
  List,
} from 'lucide-react';
import { requisitionApi } from '../../../../api/requisition';

export default function ChangeLogTab({ targetId, isDark, onTotalLogsChange }) {
  const [changeLogs, setChangeLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const loadChangeLogs = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const res = await requisitionApi.getChangeLogs(targetId);
      if (res && res.data) {
        setChangeLogs(res.data);
        if (onTotalLogsChange) {
          onTotalLogsChange(res.data.length);
        }
      }
    } catch (err) {
      console.error('Failed to load change logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChangeLogs();
  }, [targetId]);

  // Filtered change logs
  const filteredLogs = useMemo(() => {
    if (!changeLogs || changeLogs.length === 0) return [];
    if (!searchQuery.trim()) return changeLogs;

    const q = searchQuery.toLowerCase().trim();
    return changeLogs.filter((log) => {
      const colLabel = (log.column_label || '').toLowerCase();
      const colName = (log.columnname || '').toLowerCase();
      const user = (log.updated_by_name || '').toLowerCase();
      const oldVal = (log.oldvalue || '').toLowerCase();
      const newVal = (log.newvalue || '').toLowerCase();
      const table = (log.table_name || '').toLowerCase();
      const desc = (log.description || '').toLowerCase();

      return (
        colLabel.includes(q) ||
        colName.includes(q) ||
        user.includes(q) ||
        oldVal.includes(q) ||
        newVal.includes(q) ||
        table.includes(q) ||
        desc.includes(q)
      );
    });
  }, [changeLogs, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / limit) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * limit;
    return filteredLogs.slice(start, start + limit);
  }, [filteredLogs, page, limit]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-GB', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch {
      return dateStr;
    }
  };

  const getEventBadge = (evt) => {
    const event = (evt || 'U').toUpperCase();
    if (event === 'I') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          Insert
        </span>
      );
    }
    if (event === 'D') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          Delete
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
        Update
      </span>
    );
  };

  const getTargetBadge = (tableName) => {
    const isLine = (tableName || '').toLowerCase().includes('line');
    if (isLine) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <List className="w-3 h-3" />
          <span>Line</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        <FileText className="w-3 h-3" />
        <span>Header</span>
      </span>
    );
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 font-mono">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3
              className={`text-sm sm:text-base font-bold ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Document Change Log
            </h3>
            <p className="text-[11px] text-slate-400">
              Audit trail of modifications made to this requisition and its lines
            </p>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search changelogs..."
              className={`w-full pl-9 pr-7 py-2 rounded-xl text-xs font-mono border outline-none transition ${
                isDark
                  ? 'bg-slate-950/70 border-slate-800 text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60'
                  : 'bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={loadChangeLogs}
            disabled={loading}
            title="Refresh Change Logs"
            className={`p-2.5 rounded-xl border transition cursor-pointer flex-shrink-0 shadow-sm ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-800'
                : 'bg-white border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-50'
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        className={`rounded-xl border transition-all duration-300 overflow-hidden w-full ${
          isDark
            ? 'bg-slate-900/80 border-slate-800'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {loading ? (
          <div className="p-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-cyan-400" />
            <p className="text-xs text-slate-400">Loading audit change log...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p
                className={`text-xs sm:text-sm font-bold ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                No change log records found
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {searchQuery
                  ? `No logs match "${searchQuery}"`
                  : 'Modifications made to this document in iDempiere will appear here'}
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead
                className={`text-[10px] uppercase font-bold border-b ${
                  isDark
                    ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Updated At</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Field / Column</th>
                  <th className="py-3 px-4">Old Value</th>
                  <th className="py-3 px-4">New Value</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y text-[11px] ${
                  isDark ? 'divide-slate-800/60' : 'divide-slate-100'
                }`}
              >
                {paginatedLogs.map((log, index) => {
                  const rowNumber = (page - 1) * limit + index + 1;
                  return (
                    <tr
                      key={log.ad_changelog_id || index}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/70'
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center text-slate-500 font-bold">
                        {rowNumber}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDate(log.updated)}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                            {(log.updated_by_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span
                            className={`font-semibold ${
                              isDark ? 'text-slate-200' : 'text-slate-800'
                            }`}
                          >
                            {log.updated_by_name || 'System'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">{getTargetBadge(log.table_name)}</td>
                      <td className="py-2.5 px-4">{getEventBadge(log.eventchangelog)}</td>
                      <td className="py-2.5 px-4">
                        <div>
                          <p
                            className={`font-bold ${
                              isDark ? 'text-slate-200' : 'text-slate-800'
                            }`}
                          >
                            {log.column_label || log.columnname}
                          </p>
                          {log.column_label && log.columnname !== log.column_label && (
                            <p className="text-[10px] text-slate-500">
                              {log.columnname}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono max-w-xs truncate">
                        {log.oldvalue ? (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 line-through">
                            {log.oldvalue}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">null</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono max-w-xs truncate">
                        {log.newvalue ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                            {log.newvalue}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">null</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredLogs.length > 0 && (
          <div
            className={`px-4 sm:px-6 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDark
                ? 'border-slate-800 bg-slate-950/40 text-slate-400'
                : 'border-slate-100 bg-slate-50/50 text-slate-600'
            }`}
          >
            <div className="flex items-center gap-3 text-xs">
              <span>
                Showing <b>{(page - 1) * limit + 1}</b> to{' '}
                <b>{Math.min(page * limit, filteredLogs.length)}</b> of{' '}
                <b>{filteredLogs.length}</b> changes
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="text-[11px] text-slate-500">Rows:</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className={`py-1 px-2 rounded-lg text-xs font-mono border outline-none cursor-pointer ${
                    isDark
                      ? 'bg-slate-900 border-slate-800 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Page Buttons */}
            <div className="flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-transparent hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-transparent hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-bold text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-transparent hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-transparent hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

