import React from 'react';
import { 
  LayoutDashboard, ShoppingCart, Briefcase, FolderKanban, 
  Banknote, CheckSquare, Calculator, Warehouse 
} from 'lucide-react';

export default function ModuleCard({ menu, isDark, onOpen }) {
  const getMenuIcon = (iconName, menuName) => {
    const name = (iconName || '').toLowerCase();
    const title = (menuName || '').toLowerCase();

    if (name.includes('shop') || title.includes('procurement')) return <ShoppingCart className="w-6 h-6" />;
    if (name.includes('briefcase') || title.includes('approval')) return <Briefcase className="w-6 h-6" />;
    if (name.includes('folder') || title.includes('report')) return <FolderKanban className="w-6 h-6" />;
    if (name.includes('cash') || title.includes('finance')) return <Banknote className="w-6 h-6" />;
    if (name.includes('calc') || title.includes('fa')) return <Calculator className="w-6 h-6" />;
    if (name.includes('ware') || title.includes('ware') || title.includes('pick')) return <Warehouse className="w-6 h-6" />;
    if (name.includes('task') || title.includes('sales')) return <CheckSquare className="w-6 h-6" />;

    return <LayoutDashboard className="w-6 h-6" />;
  };

  return (
    <div
      onClick={() => onOpen(menu)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(menu); }}
      className={`group relative overflow-hidden rounded-3xl border p-6 transition-all duration-300 cursor-pointer ${
        isDark
          ? 'bg-slate-900/80 border-slate-800/80 hover:border-cyan-500/50 hover:shadow-[0_15px_35px_rgba(8,11,20,0.8)]'
          : 'bg-white border-slate-200 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10'
      } hover:-translate-y-1`}
    >
      {/* Background Glow on hover */}
      <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-cyan-500/10 blur-2xl transition-transform duration-300 group-hover:scale-125 pointer-events-none" />

      <div className="relative flex items-start gap-4">
        <div
          className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${
            isDark
              ? 'bg-slate-950/80 border border-slate-800 text-cyan-400 group-hover:border-cyan-500/40 group-hover:text-cyan-300'
              : 'bg-indigo-50 border border-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white'
          }`}
        >
          {getMenuIcon(menu.icon, menu.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-base font-bold tracking-tight truncate ${
              isDark ? 'text-white group-hover:text-cyan-400' : 'text-slate-900 group-hover:text-indigo-600'
            } transition-colors`}>
              {menu.name}
            </h4>
            {menu.sub_items_count > 0 && (
              <span
                className={`inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-mono font-bold ${
                  isDark
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-indigo-100 text-indigo-700'
                }`}
              >
                {menu.sub_items_count}
              </span>
            )}
          </div>
          {menu.description && (
            <p className={`mt-1.5 text-xs leading-relaxed line-clamp-2 ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {menu.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

