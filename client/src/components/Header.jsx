import { Search, Bell, Menu } from 'lucide-react';

export default function Header({ userEmail, onMenuClick }) {
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'D';
  const name = userEmail ? userEmail.split('@')[0] : 'Doctor';

  return (
    <header className="h-16 border-b flex items-center justify-between px-6 bg-[var(--bg-card)] border-[var(--border-color)]">
      <div className="flex-1 flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1 rounded-md hover:bg-[var(--bg-main)]"
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={18} />
          <input 
            type="text" 
            placeholder="Search patient ID, scans..." 
            className="input-field pl-10 h-9 rounded-full bg-[var(--bg-main)] border-transparent focus:bg-transparent focus:border-cyan-500"
          />
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-medium text-green-600 dark:text-green-400">System Active</span>
        </div>

        <button className="relative text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
          <Bell size={20} />
          <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
        </button>

        <div className="flex items-center space-x-3 border-l border-[var(--border-color)] pl-6">
          <div className="text-right hidden md:block">
            <div className="text-sm font-medium text-[var(--text-main)] capitalize">{name}</div>
            <div className="text-xs text-[var(--text-muted)]">Oncologist</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 font-bold shadow-sm">
            {initial}
          </div>
        </div>
      </div>
    </header>
  );
}
