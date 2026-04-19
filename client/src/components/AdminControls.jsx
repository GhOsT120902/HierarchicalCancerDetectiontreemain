import { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Trash2, Edit2, Check, X, RefreshCw, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';

function getAdminHeaders() {
  const token = localStorage.getItem('medai_admin_token') || '';
  return { 'X-Admin-Token': token };
}

function formatRelativeDate(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function AdminEntry({ entry, onDelete, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFilename, setEditFilename] = useState(entry.filename || '');
  const [editNotes, setEditNotes] = useState(entry.notes || '');
  const [saving, setSaving] = useState(false);

  const decision = entry.result?.final_decision || 'Unknown';
  const organ = entry.result?.organ_prediction?.selected_label || entry.result?.organ_prediction?.label || '';
  const subtype = entry.result?.subtype_prediction?.interpreted_label || entry.result?.subtype_prediction?.label || '';
  const summary = [organ, subtype].filter(Boolean).join(' › ') || decision;

  const isMalignant = decision?.toLowerCase().includes('malignant');
  const isBenign = decision?.toLowerCase().includes('benign');
  const isInvalid = decision?.toLowerCase().includes('invalid') || decision?.toLowerCase().includes('rejected');
  const decisionColor = isMalignant ? 'text-red-400' : isBenign ? 'text-green-400' : isInvalid ? 'text-yellow-400' : 'text-[var(--text-muted)]';

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(entry._user_email, entry.id, { filename: editFilename, notes: editNotes });
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center">
          {entry.thumbnailDataUrl ? (
            <img src={entry.thumbnailDataUrl} alt="Scan" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={20} className="text-[var(--text-muted)]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              className="input-field text-sm py-1 px-2 w-full mb-1"
              value={editFilename}
              onChange={e => setEditFilename(e.target.value)}
              placeholder="Filename"
            />
          ) : (
            <p className="font-medium text-sm truncate text-[var(--text-main)]" title={entry.filename}>{entry.filename}</p>
          )}
          <p className="text-xs text-amber-400/80 truncate" title={entry._user_email}>
            {entry._user_email}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{formatRelativeDate(entry.timestamp)}</p>
          <p className={`text-xs font-semibold mt-0.5 ${decisionColor}`}>{summary}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg transition-colors text-green-400 hover:bg-green-500/10"
                title="Save"
              >
                {saving ? <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" /> : <Check size={16} />}
              </button>
              <button
                onClick={() => { setEditing(false); setEditFilename(entry.filename || ''); setEditNotes(entry.notes || ''); }}
                className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-cyan-400 hover:bg-cyan-500/10"
              title="Edit entry"
            >
              <Edit2 size={16} />
            </button>
          )}
          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)]"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => onDelete(entry._user_email, entry.id)}
            className="p-1.5 rounded-lg transition-colors text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10"
            title="Delete entry"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-4 pb-3 border-t border-[var(--border-color)]">
          <label className="text-xs text-[var(--text-muted)] block mb-1 mt-2">Notes</label>
          <textarea
            className="input-field text-sm py-1 px-2 w-full resize-none"
            rows={2}
            value={editNotes}
            onChange={e => setEditNotes(e.target.value)}
            placeholder="Optional notes..."
          />
        </div>
      )}

      {expanded && !editing && (
        <div className="px-4 pb-4 border-t border-[var(--border-color)] pt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">User</span>
            <span className="font-medium text-amber-400 truncate max-w-xs" title={entry._user_email}>{entry._user_email}</span>
          </div>
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
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Final decision</span>
            <span className={`font-semibold ${decisionColor}`}>{decision}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Analysed</span>
            <span className="text-[var(--text-main)]">{new Date(entry.timestamp).toLocaleString()}</span>
          </div>
          {entry.notes && (
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">Notes</span>
              <span className="text-[var(--text-main)]">{entry.notes}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">Entry ID</span>
            <span className="text-[var(--text-main)] font-mono text-xs truncate max-w-xs">{entry.id}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminControls() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleExpiredToken = useCallback(() => {
    localStorage.removeItem('medai_admin_token');
    localStorage.removeItem('medai_is_admin');
    localStorage.removeItem('medai_logged_in');
    window.location.reload();
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/history/all', { headers: getAdminHeaders() });
      if (res.status === 401) { handleExpiredToken(); return; }
      const data = await res.json();
      if (data.ok) setEntries(data.entries || []);
    } catch {}
    setLoading(false);
  }, [handleExpiredToken]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults(null); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/admin/history/search?q=${encodeURIComponent(q)}`, { headers: getAdminHeaders() });
        if (res.status === 401) { handleExpiredToken(); return; }
        const data = await res.json();
        if (data.ok) setSearchResults(data.entries || []);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [opError, setOpError] = useState('');

  const handleDelete = async (userEmail, entryId) => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    setOpError('');
    try {
      const res = await fetch('/api/admin/history/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ user_email: userEmail, entry_id: entryId }),
      });
      if (res.status === 401) { handleExpiredToken(); return; }
      const data = await res.json();
      if (data.ok) {
        setEntries(prev => prev.filter(e => !(e._user_email === userEmail && e.id === entryId)));
        if (searchResults) setSearchResults(prev => prev.filter(e => !(e._user_email === userEmail && e.id === entryId)));
      } else {
        setOpError(data.error || 'Failed to delete entry.');
      }
    } catch {
      setOpError('Could not reach the server.');
    }
  };

  const handleUpdate = async (userEmail, entryId, updates) => {
    setOpError('');
    try {
      const res = await fetch('/api/admin/history/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAdminHeaders() },
        body: JSON.stringify({ user_email: userEmail, entry_id: entryId, updates }),
      });
      if (res.status === 401) { handleExpiredToken(); return; }
      const data = await res.json();
      if (data.ok) {
        const updater = list => list.map(e =>
          e._user_email === userEmail && e.id === entryId ? { ...e, ...updates } : e
        );
        setEntries(prev => updater(prev));
        if (searchResults) setSearchResults(prev => updater(prev));
      } else {
        setOpError(data.error || 'Failed to update entry.');
      }
    } catch {
      setOpError('Could not reach the server.');
    }
  };

  const displayEntries = searchResults !== null ? searchResults : entries;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
          <Shield size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--text-main)]">Admin Controls</h2>
          <p className="text-xs text-[var(--text-muted)]">Manage all users' history entries</p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="ml-auto btn-outline text-xs py-1.5 px-3 disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {opError && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md text-sm flex items-center justify-between">
          <span>{opError}</span>
          <button onClick={() => setOpError('')} className="ml-3 text-[var(--text-muted)] hover:text-[var(--text-main)]">&#10005;</button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
        <input
          type="text"
          className="input-field pl-9 w-full"
          placeholder="Search all users by filename, organ type, result, or entry ID..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm">Loading all entries...</p>
        </div>
      ) : displayEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
          <Shield size={48} className="mb-4 opacity-30" />
          <p className="font-medium text-[var(--text-main)]">
            {searchQuery.trim() ? 'No entries match your search' : 'No history entries found'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)]">
            {displayEntries.length} {displayEntries.length === 1 ? 'entry' : 'entries'}
            {searchQuery.trim() ? ' matching search' : ' across all users'}
          </p>
          {displayEntries.map(entry => (
            <AdminEntry
              key={`${entry._user_email}-${entry.id}`}
              entry={entry}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
