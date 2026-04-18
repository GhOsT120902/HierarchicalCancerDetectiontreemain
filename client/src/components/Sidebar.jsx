import { Activity, LayoutDashboard, Upload as UploadIcon, BarChart2, FileText, History, Settings, Moon, Sun, LogOut } from 'lucide-react';

export default function Sidebar({ onLogout, theme, toggleTheme, activeTab, setActiveTab }) {
  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Upload Scan', icon: UploadIcon },
    { name: 'Results', icon: BarChart2 },
    { name: 'Reports', icon: FileText },
    { name: 'History', icon: History },
    { name: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className="w-64 flex-shrink-0 flex flex-col"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--sidebar-border)',
        color: 'var(--text-sidebar)',
        transition: 'background-color 0.2s, color 0.2s',
      }}
    >
      <div
        className="h-16 flex items-center px-6"
        style={{ borderBottom: '1px solid var(--sidebar-border)' }}
      >
        <Activity className="text-cyan-400 mr-3" size={24} />
        <span className="text-xl font-bold tracking-wide" style={{ color: 'var(--text-main)' }}>MedAI</span>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;
          return (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className="w-full flex items-center px-3 py-2.5 rounded-lg transition-colors"
              style={isActive ? {
                backgroundColor: 'var(--sidebar-active-bg)',
                color: 'var(--sidebar-active-text)',
                fontWeight: 500,
              } : {
                color: 'var(--text-sidebar)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
                  e.currentTarget.style.color = 'var(--text-main)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = '';
                  e.currentTarget.style.color = 'var(--text-sidebar)';
                }
              }}
            >
              <Icon size={18} className="mr-3" />
              {item.name}
            </button>
          );
        })}
      </nav>

      <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center px-3 py-2.5 rounded-lg transition-colors"
          style={{ color: 'var(--text-sidebar)' }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
            e.currentTarget.style.color = 'var(--text-main)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '';
            e.currentTarget.style.color = 'var(--text-sidebar)';
          }}
        >
          {theme === 'dark' ? <Sun size={18} className="mr-3" /> : <Moon size={18} className="mr-3" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button
          onClick={onLogout}
          className="w-full flex items-center px-3 py-2.5 rounded-lg transition-colors text-red-500"
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--sidebar-hover)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '';
          }}
        >
          <LogOut size={18} className="mr-3" />
          Logout
        </button>
      </div>
    </aside>
  );
}
