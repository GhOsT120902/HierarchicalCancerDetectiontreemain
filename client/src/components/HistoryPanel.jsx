import { useState, useEffect, useCallback } from 'react';
import { History, FileText, Trash2, Image as ImageIcon, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

function formatRelativeDate(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function HistoryEntry({ entry, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const decision = entry.result?.final_decision || 'Unknown result';
  const organ = entry.result?.organ_prediction?.selected_label || entry.result?.organ_prediction?.label || '';
  const subtype = entry.result?.subtype_prediction?.interpreted_label || entry.result?.subtype_prediction?.label || '';
  const summary = [organ, subtype].filter(Boolean).join(' › ') || decision;

  const handleDownloadReport = async () => {
    if (!entry.result) return;
    setDownloading(true);
    try {
      const resp = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: entry.filename,
          result: entry.result,
          image_data: entry.thumbnailDataUrl || null,
        }),
      });
      if (!resp.ok) throw new Error('Report generation failed.');
      const blob = await resp.blob();
      const disposition = resp.headers.get('Content-Disposition') || '';
      const nameMatch = disposition.match(/filename="?([^";\n]+)"?/i);
      const dlName = nameMatch ? nameMatch[1] : `${entry.filename.replace(/\.[^.]+$/, '') || 'report'}_report.pdf`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = dlName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
    } finally {
      setDownloading(false);
    }
  };

  const isMalignant = decision?.toLowerCase().includes('malignant');
  const isBenign = decision?.toLowerCase().includes('benign');
  const isInvalid = decision?.toLowerCase().includes('invalid') || decision?.toLowerCase().includes('rejected');

  const decisionColor = isMalignant
    ? 'text-red-400'
    : isBenign
    ? 'text-green-400'
    : isInvalid
    ? 'text-yellow-400'
    : 'text-[var(--text-muted)]';

  return (
    <div className="card p-0 overflow-hidden transition-all">
      <div className="flex items-center gap-4 p-4">
        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center">
          {entry.thumbnailDataUrl ? (
            <img src={entry.thumbnailDataUrl} alt="Scan thumbnail" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={24} className="text-[var(--text-muted)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate text-[var(--text-main)]" title={entry.filename}>
            {entry.filename}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatRelativeDate(entry.timestamp)}</p>
          <p className={`text-xs font-semibold mt-1 ${decisionColor}`}>{summary}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDownloadReport}
            disabled={downloading}
            className="btn-outline text-xs py-1.5 px-3 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download PDF report"
          >
            {downloading ? (
              <span className="flex items-center gap-1.5">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <FileText size={14} />
                Report
              </span>
            )}
          </button>

          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]"
            title={expanded ? 'Collapse' : 'Expand details'}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          <button
            onClick={() => onDelete(entry.id)}
            className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10"
            title="Remove from history"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-3 space-y-2 text-sm">
          {organ && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Organ / Tissue</span>
              <span className="font-medium text-[var(--text-main)]">{organ}</span>
            </div>
          )}
          {subtype && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Subtype</span>
              <span className="font-medium text-[var(--text-main)]">{subtype}</span>
            </div>
          )}
          {entry.result?.organ_prediction?.confidence != null && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Organ confidence</span>
              <span className="font-medium text-[var(--text-main)]">
                {(entry.result.organ_prediction.confidence * 100).toFixed(1)}%
              </span>
            </div>
          )}
          {entry.result?.subtype_prediction?.confidence != null && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Subtype confidence</span>
              <span className="font-medium text-[var(--text-main)]">
                {(entry.result.subtype_prediction.confidence * 100).toFixed(1)}%
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Final decision</span>
            <span className={`font-semibold ${decisionColor}`}>{decision}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Analysed</span>
            <span className="text-[var(--text-main)]">{new Date(entry.timestamp).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryPanel() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const userEmail = localStorage.getItem('medai_user_email') || '';

  const migrateLocalHistory = useCallback(async () => {
    if (!userEmail) return;
    const localKey = `medai_history_${userEmail}`;
    const raw = localStorage.getItem(localKey);
    if (!raw) return;
    try {
      const entries = JSON.parse(raw);
      if (!Array.isArray(entries) || entries.length === 0) {
        localStorage.removeItem(localKey);
        return;
      }
      await fetch('/api/history/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Email': userEmail },
        body: JSON.stringify({ entries }),
      });
      localStorage.removeItem(localKey);
    } catch {
    }
  }, [userEmail]);

  const fetchEntries = useCallback(async () => {
    if (!userEmail) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/history', { headers: { 'X-User-Email': userEmail } });
      const data = await r.json();
      if (data.ok) {
        const sorted = (data.entries || []).slice().sort((a, b) => b.timestamp - a.timestamp);
        setEntries(sorted);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    migrateLocalHistory().then(() => fetchEntries());
  }, [migrateLocalHistory, fetchEntries]);

  const handleDelete = async (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    try {
      await fetch('/api/history/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Email': userEmail },
        body: JSON.stringify({ id }),
      });
    } catch {
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear all history? This cannot be undone.')) return;
    setClearing(true);
    try {
      await fetch('/api/history/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Email': userEmail },
        body: JSON.stringify({}),
      });
      setEntries([]);
    } catch {
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <History size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-main)]">Analysis History</h2>
            <p className="text-xs text-[var(--text-muted)]">Your past scan analyses</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEntries}
            disabled={loading}
            className="btn-outline text-xs py-1.5 px-3 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {entries.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="btn-outline text-xs py-1.5 px-3 text-red-400 border-red-500/30 hover:bg-red-500/10 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear All'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm">Loading history...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
          <History size={48} className="mb-4 opacity-30" />
          <p className="font-medium text-[var(--text-main)]">No analyses yet</p>
          <p className="text-sm mt-1">Your completed scan analyses will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">{entries.length} {entries.length === 1 ? 'analysis' : 'analyses'} found</p>
          {entries.map(entry => (
            <HistoryEntry key={entry.id} entry={entry} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
