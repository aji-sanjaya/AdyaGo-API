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
import { orderApi } from '../../../../api/order';

export default function OrderChangeLogTab({ orderId, isDark, onTotalLogsChange }) {
  const [changeLogs, setChangeLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const loadChangeLogs = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const res = await orderApi.getChangeLogs(orderId);
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
  }, [orderId]);

  const filteredLogs = useMemo(() => {
    if (!changeLogs || changeLogs.length === 0) return [];
    if (!searchQuery.trim()) return changeLogs;

    const q = searchQuery.toLowerCase().trim();
    return changeLogs.filter((log) => {
      const colName = (log.column_name || '').toLowerCase();
      const user = (log.user_name || '').toLowerCase();
      const oldVal = (log.old_value || '').toLowerCase();
      const newVal = (log.new_value || '').toLowerCase();
      const table = (log.table_name || '').toLowerCase();

      return (
        colName.includes(q) ||
        user.includes(q) ||
        oldVal.includes(q) ||
        newVal.includes(q) ||
        table.includes(q)
      );
    });
  }, [changeLogs, searchQuery]);

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
    <div className="space-y-4 font-mono">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search column, value, user..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>

          <button
            type="button"
            onClick={loadChangeLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-3" />
          <p className="text-xs text-slate-500 dark:text-slate-400">Loading audit log...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredLogs.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
            <History className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {searchQuery ? 'No matching audit records found' : 'No change logs available'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mt-1">
            {searchQuery ? 'Try clearing or changing your search terms.' : 'Modifications to this order will be tracked here.'}
          </p>
        </div>
      )}

      {/* Logs Table */}
      {!loading && filteredLogs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-40">Date & Time</th>
                  <th className="py-3 px-4 w-36">User</th>
                  <th className="py-3 px-4 w-24">Scope</th>
                  <th className="py-3 px-4 w-44">Field / Column</th>
                  <th className="py-3 px-4">Old Value</th>
                  <th className="py-3 px-4 w-8 text-center"></th>
                  <th className="py-3 px-4">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {paginatedLogs.map((log) => (
                  <tr
                    key={log.ad_changelog_id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatDate(log.created)}</span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[120px]">{log.user_name || 'System'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getTargetBadge(log.table_name)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {log.column_name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {log.table_name} #{log.record_id}
                      </div>
                    </td>
                    <td className="py-3 px-4 break-all max-w-xs">
                      {log.old_value ? (
                        <span className="px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 text-[11px]">
                          {log.old_value}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">null</span>
                      )}
                    </td>
                    <td className="py-3 px-1 text-center">
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                    </td>
                    <td className="py-3 px-4 break-all max-w-xs">
                      {log.new_value ? (
                        <span className="px-2 py-1 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/40 text-[11px] font-medium">
                          {log.new_value}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">null</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-700 dark:text-slate-300">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {Math.min(page * limit, filteredLogs.length)}
              </span>{' '}
              of <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredLogs.length}</span> changes
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-medium">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

