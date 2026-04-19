import { Menu, Settings, LogOut, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Header({ userEmail, onMenuClick, onSettingsClick, onLogout }) {
  const initial = userEmail ? userEmail.charAt(0).toUpperCase() : 'D';
  const name = userEmail ? userEmail.split('@')[0] : 'Doctor';
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-16 border-b flex items-center justify-between px-6 bg-[var(--bg-card)] border-[var(--border-color)]">
      <div className="flex items-center">
        <button
          onClick={onMenuClick}
          className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1 rounded-md hover:bg-[var(--bg-main)]"
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-xs font-medium text-green-600 dark:text-green-400">System Active</span>
        </div>

        {/* User avatar + dropdown */}
        <div className="relative border-l border-[var(--border-color)] pl-6" ref={dropdownRef}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 rounded-lg px-2 py-1 hover:bg-[var(--bg-main)] transition-colors"
          >
            <div className="text-right hidden md:block">
              <div className="text-sm font-medium text-[var(--text-main)] capitalize leading-tight">{name}</div>
              <div className="text-xs text-[var(--text-muted)]">Oncologist</div>
            </div>
            <div className="w-9 h-9 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 font-bold shadow-sm shrink-0">
              {initial}
            </div>
            <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div
              className="absolute right-0 top-full mt-2 w-44 rounded-xl border shadow-lg z-50 py-1 overflow-hidden"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <button
                onClick={() => { onSettingsClick?.(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors"
              >
                <Settings size={15} className="text-[var(--text-muted)]" />
                Settings
              </button>
              <div className="my-1 border-t border-[var(--border-color)]" />
              <button
                onClick={() => { onLogout?.(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--bg-main)] transition-colors"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
