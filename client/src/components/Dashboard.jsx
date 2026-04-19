import { useState, useEffect, useCallback } from 'react';
import { Settings, Lock, KeyRound, Check, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import HeroSection from './HeroSection';
import UploadWorkflow from './UploadWorkflow';
import DiagnosticResults from './DiagnosticResults';
import ModelAccuracy from './ModelAccuracy';
import HistoryPanel from './HistoryPanel';
import ReportsPanel from './ReportsPanel';
import AdminControls from './AdminControls';

function SettingsPanel() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading]     = useState(false);
  const [message, setMessage]     = useState('');
  const [error, setError]         = useState('');

  const handleChange = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { setError('New passwords do not match.'); return; }
    if (newPw.length < 8)    { setError('New password must be at least 8 characters.'); return; }
    setLoading(true);
    setError('');
    setMessage('');
    const email = localStorage.getItem('medai_user_email') || '';
    try {
      const res  = await fetch('/api/auth/change-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, current_password: currentPw, new_password: newPw }),
      });
      const data = await res.json();
      if (data.ok) {
        setMessage('Password changed successfully.');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
      } else {
        setError(data.error || 'Could not change password.');
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="card">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <Settings size={18} />
          </div>
          <h2 className="text-lg font-bold">Account Settings</h2>
        </div>

        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
          <Lock size={14} className="text-[var(--text-muted)]" />
          Change Password
        </h3>

        {error   && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md mb-4 text-sm">{error}</div>}
        {message && <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-md mb-4 text-sm">{message}</div>}

        <form onSubmit={handleChange} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                type="password"
                required
                className="input-field pl-9"
                placeholder="••••••••"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                type="password"
                required
                className="input-field pl-9"
                placeholder="At least 8 characters"
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Confirm New Password</label>
            <div className="relative">
              <Check className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
              <input
                type="password"
                required
                className="input-field pl-9"
                placeholder="••••••••"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

function getAdminHeaders() {
  const token = localStorage.getItem('medai_admin_token') || '';
  return { 'X-Admin-Token': token };
}

function AdminSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults(null); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/history/search?q=${encodeURIComponent(q)}`, {
          headers: getAdminHeaders(),
        });
        if (res.status === 401) {
          localStorage.removeItem('medai_admin_token');
          localStorage.removeItem('medai_is_admin');
          localStorage.removeItem('medai_logged_in');
          window.location.reload();
          return;
        }
        const data = await res.json();
        if (data.ok) setResults(data.entries || []);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="mb-2">
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Search size={16} className="text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">Admin — Cross-User Search</span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
          <input
            type="text"
            className="input-field pl-9 w-full"
            placeholder="Search all users by filename, organ type, result, or entry ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {results !== null && (
          <div className="mt-3">
            {results.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] text-center py-2">No entries found.</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-xs text-[var(--text-muted)]">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
                {results.map(entry => {
                  const decision = entry.result?.final_decision || 'Unknown';
                  const organ = entry.result?.organ_prediction?.selected_label || entry.result?.organ_prediction?.label || '';
                  const subtype = entry.result?.subtype_prediction?.interpreted_label || entry.result?.subtype_prediction?.label || '';
                  const summary = [organ, subtype].filter(Boolean).join(' › ') || decision;
                  const isMalignant = decision?.toLowerCase().includes('malignant');
                  const isBenign = decision?.toLowerCase().includes('benign');
                  const decisionColor = isMalignant ? 'text-red-400' : isBenign ? 'text-green-400' : 'text-yellow-400';
                  return (
                    <div key={`${entry._user_email}-${entry.id}`} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-main)] border border-[var(--border-color)]">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[var(--text-main)]">{entry.filename}</p>
                        <p className="text-xs text-amber-400/80 truncate" title={entry._user_email}>{entry._user_email}</p>
                        <p className={`text-xs font-semibold ${decisionColor}`}>{summary}</p>
                        <p className="text-xs text-[var(--text-muted)] font-mono truncate">ID: {entry.id}</p>
                      </div>
                      <p className="text-xs text-[var(--text-muted)] flex-shrink-0">
                        {new Date(entry.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ onLogout, theme, toggleTheme }) {
  const [modelStatus, setModelStatus] = useState(null);
  const [result, setResult]           = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError]             = useState(null);
  const [activeTab, setActiveTab]     = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [exportData, setExportData]   = useState(null);
  const userEmail = localStorage.getItem('medai_user_email') || 'doctor@hospital.org';
  const isAdmin = localStorage.getItem('medai_is_admin') === 'true';

  useEffect(() => {
    fetchHealth();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setModelStatus(data.model_status);
      } else {
        setModelStatus({ error: 'Could not reach the local inference server.' });
      }
    } catch {
      setModelStatus({ error: 'Could not reach the local inference server.' });
    }
  };

  const handlePredict = async (payload) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/predict', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data.result);
        setExportData({ filename: payload.filename, imageData: payload.image_data });
        if (data.result.model_status) setModelStatus(data.result.model_status);
        setActiveTab('Results');
      } else {
        setError(data.error || 'The analysis failed. Please try again.');
      }
    } catch {
      setError('Could not reach the analysis server. Please check the connection and try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = useCallback(async () => {
    if (!result || !exportData) return;
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: exportData.filename,
          image_data: exportData.imageData,
          result,
        }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MedAI_Report_${exportData.filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    }
  }, [result, exportData]);

  const renderMain = () => {
    switch (activeTab) {

      case 'Upload Scan':
        return (
          <>
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UploadWorkflow
                modelStatus={modelStatus}
                onPredict={handlePredict}
                isProcessing={isProcessing}
                result={result}
              />
              <DiagnosticResults result={result} />
            </div>
          </>
        );

      case 'Results':
        return result ? (
          <DiagnosticResults result={result} onExport={exportData ? handleExport : null} />
        ) : (
          <div
            className="card flex flex-col items-center justify-center text-center py-20 border border-dashed border-[var(--border-color)]"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <h3 className="text-base font-bold text-[var(--text-main)] mb-2">No results yet</h3>
            <p className="text-sm text-[var(--text-muted)] max-w-sm mb-6">
              Upload a medical scan and run the pipeline to see diagnostic results here.
            </p>
            <button
              onClick={() => setActiveTab('Upload Scan')}
              className="btn-primary"
            >
              Go to Upload Scan
            </button>
          </div>
        );

      case 'Reports':
        return <ReportsPanel />;

      case 'Model Accuracy':
        return <ModelAccuracy />;

      case 'History':
        return <HistoryPanel />;

      case 'Settings':
        return <SettingsPanel />;

      case 'Admin Controls':
        return isAdmin ? <AdminControls /> : null;

      default:
        return (
          <>
            <HeroSection
              modelStatus={modelStatus}
              onUploadClick={() => setActiveTab('Upload Scan')}
            />
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-3 text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <UploadWorkflow
                modelStatus={modelStatus}
                onPredict={handlePredict}
                isProcessing={isProcessing}
                result={result}
              />
              <DiagnosticResults result={result} />
            </div>
          </>
        );
    }
  };

  return (
    <div className="flex h-screen overflow-hidden relative">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: '16rem' }}
      >
        <Sidebar
          onLogout={onLogout}
          theme={theme}
          toggleTheme={toggleTheme}
          activeTab={activeTab}
          setActiveTab={(tab) => { setActiveTab(tab); setSidebarOpen(false); }}
          onClose={() => setSidebarOpen(false)}
          isAdmin={isAdmin}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header userEmail={userEmail} onMenuClick={() => setSidebarOpen(o => !o)} />

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {isAdmin && <AdminSearchBar />}
            {renderMain()}
          </div>
        </main>
      </div>
    </div>
  );
}
