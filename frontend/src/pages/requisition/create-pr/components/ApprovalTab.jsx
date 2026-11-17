import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  User,
  Calendar,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { requisitionApi } from '../../../../api/requisition';

export default function ApprovalTab({
  targetId,
  isDark,
  onTotalApprovalsChange,
}) {
  const [authorizers, setAuthorizers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAuthorizers = async () => {
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await requisitionApi.getAuthorizers(targetId);
      if (res && res.data) {
        setAuthorizers(res.data);
        if (onTotalApprovalsChange) {
          onTotalApprovalsChange(res.data.length);
        }
      } else {
        setAuthorizers([]);
        if (onTotalApprovalsChange) {
          onTotalApprovalsChange(0);
        }
      }
    } catch (err) {
      console.error('Failed to load requisition authorizers:', err);
      setError('Failed to load approval status records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuthorizers();
  }, [targetId]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: '-', time: '' };
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return { date: String(dateStr), time: '' };
      return {
        date: d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        time: d.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
    } catch {
      return { date: String(dateStr), time: '' };
    }
  };

  const getStatusBadge = (statusCode, label) => {
    const s = (statusCode || '').toUpperCase();
    if (s === 'AP' || s === 'CO') {
      return {
        bg: isDark
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200',
        cardBorder: isDark
          ? 'border-emerald-500/30 hover:border-emerald-500/50'
          : 'border-emerald-200 hover:border-emerald-300',
        dot: 'bg-emerald-500 shadow-emerald-500/50',
        icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
        text: label || 'Approved',
      };
    }
    if (s === 'IP') {
      return {
        bg: isDark
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          : 'bg-amber-50 text-amber-700 border-amber-200',
        cardBorder: isDark
          ? 'border-amber-500/30 hover:border-amber-500/50'
          : 'border-amber-200 hover:border-amber-300',
        dot: 'bg-amber-500 shadow-amber-500/50',
        icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
        text: label || 'In Progress',
      };
    }
    if (s === 'RJ' || s === 'VO') {
      return {
        bg: isDark
          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
          : 'bg-rose-50 text-rose-700 border-rose-200',
        cardBorder: isDark
          ? 'border-rose-500/30 hover:border-rose-500/50'
          : 'border-rose-200 hover:border-rose-300',
        dot: 'bg-rose-500 shadow-rose-500/50',
        icon: <XCircle className="w-3.5 h-3.5 text-rose-500" />,
        text: label || 'Rejected',
      };
    }
    return {
      bg: isDark
        ? 'bg-slate-500/10 text-slate-400 border-slate-500/30'
        : 'bg-slate-100 text-slate-700 border-slate-200',
      cardBorder: isDark
        ? 'border-slate-800 hover:border-slate-700'
        : 'border-slate-200 hover:border-slate-300',
      dot: 'bg-slate-400',
      icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
      text: label || (s ? s : 'Pending'),
    };
  };

  const getFunctionIcon = (name) => {
    const n = (name || '').toLowerCase();
    if (n.includes('legal') || n.includes('legilized')) {
      return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
    if (n.includes('approv')) {
      return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
    }
    return <UserCheck className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 font-mono">
      {/* Tab Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border ${
              isDark
                ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                : 'bg-cyan-50 border-cyan-200 text-cyan-600'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold font-mono tracking-tight text-slate-900 dark:text-slate-100">
                Approval Workflow
              </h3>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                  isDark
                    ? 'bg-slate-800 text-cyan-400 border-slate-700'
                    : 'bg-slate-100 text-cyan-700 border-slate-200'
                }`}
              >
                {authorizers.length} {authorizers.length === 1 ? 'Stage' : 'Stages'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
              Authorized verification & sign-off workflow sequence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadAuthorizers}
            disabled={loading}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-2 transition-all cursor-pointer ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-xs font-mono ${
            isDark
              ? 'bg-rose-950/20 border-rose-500/30 text-rose-400'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && authorizers.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`p-5 rounded-2xl border animate-pulse space-y-4 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 bg-slate-700/40 rounded-full" />
                <div className="h-5 w-24 bg-slate-700/40 rounded-full" />
              </div>
              <div className="h-6 w-36 bg-slate-700/40 rounded-lg" />
              <div className="flex items-center gap-3 pt-2">
                <div className="w-10 h-10 rounded-full bg-slate-700/40" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-32 bg-slate-700/40 rounded" />
                  <div className="h-3 w-20 bg-slate-700/40 rounded" />
                </div>
              </div>
              <div className="h-8 bg-slate-700/40 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && authorizers.length === 0 && (
        <div
          className={`p-8 sm:p-12 rounded-2xl border text-center font-mono ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50/60 border-slate-200'
          }`}
        >
          <div
            className={`w-14 h-14 mx-auto mb-4 rounded-2xl border flex items-center justify-center shadow-lg ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-400'
                : 'bg-white border-slate-200 text-slate-500 shadow-slate-200/50'
            }`}
          >
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
          </div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
            No Approval Records Found
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Approval records will appear here once the document is processed or submitted for verification.
          </p>
        </div>
      )}

      {/* Cards Grid */}
      {authorizers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 font-mono">
          {authorizers.map((item, index) => {
            const badge = getStatusBadge(item.approval_doc_status, item.status_label);
            const dt = formatDateTime(item.updated);
            const hasUpdated = item.updated && dt.date !== '-';

            return (
              <div
                key={item.id || index}
                className={`relative rounded-2xl border p-5 transition-all duration-200 shadow-sm flex flex-col justify-between ${
                  badge.cardBorder
                } ${
                  isDark
                    ? 'bg-slate-900/80 shadow-slate-950/40'
                    : 'bg-white shadow-slate-100'
                }`}
              >
                <div>
                  {/* Card Header: Sequence & Status */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase border ${
                          isDark
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                        }`}
                      >
                        Sequence #{item.sequence || index + 1}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.icon}
                      <span>{badge.text}</span>
                    </span>
                  </div>

                  {/* Function Title (e.g. Checked By, Approved By, Legalized By) */}
                  <div className="flex items-center gap-2 mb-4">
                    <div
                      className={`p-2 rounded-xl border ${
                        isDark
                          ? 'bg-slate-800/80 border-slate-700/80'
                          : 'bg-slate-100 border-slate-200'
                      }`}
                    >
                      {getFunctionIcon(item.name)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {item.name || 'Authorizer Function'}
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Approval Role Stage
                      </p>
                    </div>
                  </div>

                  {/* Approver Person Information */}
                  <div
                    className={`p-3.5 rounded-xl border mb-4 ${
                      isDark
                        ? 'bg-slate-950/40 border-slate-800/80'
                        : 'bg-slate-50/80 border-slate-200/80'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                      Authorized User
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs uppercase border ${
                          isDark
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            : 'bg-cyan-100 text-cyan-800 border-cyan-200'
                        }`}
                      >
                        {item.user_name ? (
                          item.user_name.slice(0, 2)
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {item.user_name || 'Unassigned User'}
                        </div>
                        {item.user_description ? (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {item.user_description}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            {item.user_id ? `User ID: ${item.user_id}` : 'Pending assignment'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description / Comments (if present) */}
                  {item.description && (
                    <div
                      className={`p-3 rounded-xl border mb-4 text-[11px] ${
                        isDark
                          ? 'bg-slate-950/30 border-slate-800/60 text-slate-300'
                          : 'bg-slate-100/60 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase font-bold mb-1">
                        <FileText className="w-3 h-3 text-cyan-400" />
                        <span>Remarks</span>
                      </div>
                      <p className="italic">{item.description}</p>
                    </div>
                  )}
                </div>

                {/* Footer: Date & Time of Approval (Updated) */}
                <div
                  className={`pt-3 border-t flex items-center justify-between text-[11px] ${
                    isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Approved / Updated:</span>
                  </div>
                  <div className="text-right">
                    {hasUpdated ? (
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {dt.date} <span className="text-[10px] text-slate-400">({dt.time})</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
