import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FlaskConical, Play, RotateCcw, Upload, FolderOpen,
  Loader2, CheckCircle2, AlertTriangle, Filter, X, Download,
} from 'lucide-react';

const ORGAN_OPTIONS = [
  { value: '',                     label: 'All Organs' },
  { value: 'ALL',                  label: 'ALL (Acute Lymphoblastic Leukaemia)' },
  { value: 'Brain Cancer',         label: 'Brain Cancer' },
  { value: 'Breast Cancer',        label: 'Breast Cancer' },
  { value: 'Cervical Cancer',      label: 'Cervical Cancer' },
  { value: 'Kidney Cancer',        label: 'Kidney Cancer' },
  { value: 'Lung and Colon Cancer',label: 'Lung & Colon Cancer' },
  { value: 'Lymphoma',             label: 'Lymphoma' },
  { value: 'Oral Cancer',          label: 'Oral Cancer' },
];

const LEVEL_DEFS = [
  { key: 'organ',     label: 'Level 1 — Organ',    desc: 'Tissue / organ routing' },
  { key: 'normality', label: 'Level 2 — Normality', desc: 'Normal vs Abnormal' },
  { key: 'subtype',   label: 'Level 3 — Subtype',  desc: 'Cancer subtype (abnormal only)' },
];

function pctColor(pct) {
  if (pct >= 90) return { text: 'text-green-500',  bg: 'bg-green-500',  badge: 'text-green-500 bg-green-500/10 border-green-500/30',  card: 'border-green-500/30' };
  if (pct >= 70) return { text: 'text-yellow-500', bg: 'bg-yellow-500', badge: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30', card: 'border-yellow-500/30' };
  return           { text: 'text-red-500',    bg: 'bg-red-500',    badge: 'text-red-500 bg-red-500/10 border-red-500/30',     card: 'border-red-500/30' };
}

function AccuracyBar({ pct }) {
  const c = pctColor(pct);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-main)' }}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${c.bg}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded border shrink-0 ${c.badge}`}>
        {pct}%
      </span>
    </div>
  );
}

function MetricCard({ def, data }) {
  const pct  = data?.accuracy_pct ?? 0;
  const c    = pctColor(pct);
  return (
    <div className={`card border text-center ${c.card}`}>
      <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
        {def.label}
      </p>
      <div className={`text-4xl font-bold mb-1 ${c.text}`}>{pct}%</div>
      <p className="text-xs text-[var(--text-muted)]">
        {data?.correct ?? '—'} / {data?.evaluated ?? '—'} correct
      </p>
      <p className="text-[10px] text-[var(--text-muted)] mt-1">{def.desc}</p>
    </div>
  );
}

function PctBadge({ value }) {
  const c = pctColor(value ?? 0);
  return (
    <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${c.badge}`}>
      {(value ?? 0).toFixed(1)}%
    </span>
  );
}

function PerClassTable({ title, perClassObj }) {
  if (!perClassObj || typeof perClassObj !== 'object') return null;
  const rows = Object.entries(perClassObj);
  if (!rows.length) return null;
  return (
    <div className="card overflow-x-auto">
      <h3 className="text-sm font-bold mb-3 pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
        {title}
      </h3>
      <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr className="text-[var(--text-muted)] text-[10px] uppercase">
            <th className="text-left py-1.5 pr-4 font-semibold" style={{ minWidth: 160 }}>Class</th>
            <th className="text-center py-1.5 px-2 font-semibold" style={{ minWidth: 90 }}>Correct&nbsp;/&nbsp;Total</th>
            <th className="text-center py-1.5 px-2 font-semibold" style={{ minWidth: 130 }}>Accuracy</th>
            <th className="text-center py-1.5 px-2 font-semibold" style={{ minWidth: 80 }}>Precision</th>
            <th className="text-center py-1.5 px-2 font-semibold" style={{ minWidth: 80 }}>Recall</th>
            <th className="text-center py-1.5 px-2 font-semibold" style={{ minWidth: 80 }}>F1</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([className, row]) => (
            <tr key={className} style={{ borderTop: '1px solid var(--border-color)' }}>
              <td className="py-2 pr-4 font-medium text-[var(--text-main)]">{className}</td>
              <td className="text-center py-2 px-2 font-mono text-[var(--text-muted)]">
                {row.correct}/{row.total}
              </td>
              <td className="py-2 px-2">
                <AccuracyBar pct={row.accuracy_pct} />
              </td>
              <td className="text-center py-2 px-2">
                <PctBadge value={row.precision} />
              </td>
              <td className="text-center py-2 px-2">
                <PctBadge value={row.recall} />
              </td>
              <td className="text-center py-2 px-2">
                <PctBadge value={row.f1} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  switch (status) {
    case 'running':
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 flex items-center gap-1.5">
          <Loader2 size={12} className="animate-spin" /> Running
        </span>
      );
    case 'done':
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 flex items-center gap-1.5">
          <CheckCircle2 size={12} /> Done
        </span>
      );
    case 'error':
      return (
        <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5">
          <AlertTriangle size={12} /> Error
        </span>
      );
    default:
      return (
        <span
          className="text-xs px-3 py-1 rounded-full text-[var(--text-muted)] border border-[var(--border-color)]"
          style={{ backgroundColor: 'var(--bg-main)' }}
        >
          Idle
        </span>
      );
  }
}

export default function ModelAccuracy() {
  const [status,      setStatus]      = useState('idle');
  const [metrics,     setMetrics]     = useState(null);
  const [log,         setLog]         = useState([]);
  const [evalError,   setEvalError]   = useState('');
  const [organFilter, setOrganFilter] = useState('');
  const [scopeLabel,  setScopeLabel]  = useState('');
  const [totalImages, setTotalImages] = useState(null);
  const [zipFile,     setZipFile]     = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const pollRef     = useRef(null);
  const logRef      = useRef(null);
  const fileInputRef = useRef(null);

  const isRunning = status === 'running';

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const applyState = useCallback((data) => {
    const { status: s, metrics: m, error: e, log: l, organ_filter: of_ } = data;
    if (s)        setStatus(s);
    if (m)        { setMetrics(m); setTotalImages(m.total_images ?? null); }
    if (e)        setEvalError(e);
    if (l?.length) setLog(l);
    if (of_ !== undefined) setScopeLabel(of_ || 'All Organs');
  }, []);

  const pollStatus = useCallback(async () => {
    try {
      const res  = await fetch('/api/evaluate');
      const data = await res.json();
      applyState(data);
      if (data.status === 'running') {
        pollRef.current = setTimeout(pollStatus, 2500);
      } else {
        pollRef.current = null;
      }
    } catch (_) {
      pollRef.current = setTimeout(pollStatus, 4000);
    }
  }, [applyState]);

  useEffect(() => {
    pollStatus();
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startPolling = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = setTimeout(pollStatus, 2500);
  };

  const handleRunEval = async () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    setStatus('running');
    setMetrics(null);
    setLog([]);
    setEvalError('');
    try {
      const res  = await fetch('/api/evaluate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ organ_filter: organFilter || null }),
      });
      const data = await res.json();
      if (!data.ok) {
        setStatus('error');
        setEvalError(data.error || 'Failed to start evaluation.');
        return;
      }
      startPolling();
    } catch (_) {
      setStatus('error');
      setEvalError('Could not reach the server. Check your connection.');
    }
  };

  const handleUploadAndRun = async () => {
    if (!zipFile) return;
    if (pollRef.current) clearTimeout(pollRef.current);
    setIsUploading(true);
    setStatus('running');
    setMetrics(null);
    setLog([]);
    setEvalError('');
    const headers = { 'Content-Type': 'application/zip' };
    if (organFilter) headers['X-Organ-Filter'] = organFilter;
    try {
      const buf  = await zipFile.arrayBuffer();
      const res  = await fetch('/api/evaluate/upload', { method: 'POST', headers, body: buf });
      const data = await res.json();
      if (!data.ok) {
        setStatus('error');
        setEvalError(data.error || 'Upload failed.');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
      startPolling();
    } catch (_) {
      setStatus('error');
      setEvalError('Upload failed — check your connection.');
      setIsUploading(false);
    }
  };

  const clearZip = () => {
    setZipFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadCSV = () => {
    if (!metrics) return;
    const rows = [];
    rows.push(['Section', 'Class', 'Correct', 'Total', 'Accuracy %', 'Precision %', 'Recall %', 'F1 %']);

    LEVEL_DEFS.forEach(def => {
      const data = metrics[def.key];
      if (!data) return;
      rows.push([def.label, 'OVERALL', data.correct ?? '', data.evaluated ?? '', data.accuracy_pct ?? '', '', '', '']);
      const perClass = data.per_class;
      if (perClass && typeof perClass === 'object') {
        Object.entries(perClass).forEach(([className, row]) => {
          rows.push([
            def.label,
            className,
            row.correct ?? '',
            row.total ?? '',
            (row.accuracy_pct ?? 0).toFixed(1),
            (row.precision ?? 0).toFixed(1),
            (row.recall ?? 0).toFixed(1),
            (row.f1 ?? 0).toFixed(1),
          ]);
        });
      }
    });

    const csvContent = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const organ = scopeLabel && scopeLabel !== 'All Organs' ? scopeLabel.replace(/\s+/g, '') : 'AllOrgans';
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `medai_eval_${organ}_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500 shrink-0">
                <FlaskConical size={18} />
              </div>
              <h2 className="text-lg font-bold">Model Accuracy Evaluation</h2>
              <StatusBadge status={status} />
            </div>
            <p className="text-sm text-[var(--text-muted)] ml-11 leading-relaxed">
              Runs all test images through the full inference pipeline and computes per-stage accuracy metrics.
              This may take several minutes on CPU.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[var(--text-muted)]" />
              <select
                value={organFilter}
                onChange={e => setOrganFilter(e.target.value)}
                disabled={isRunning}
                className="input-field text-sm py-1.5"
              >
                {ORGAN_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunEval}
              disabled={isRunning}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <><Loader2 size={16} className="animate-spin" /> Running…</>
              ) : status === 'done' ? (
                <><RotateCcw size={16} /> Re-run Evaluation</>
              ) : (
                <><Play size={16} /> Run Evaluation</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Custom dataset upload ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpen size={16} className="text-cyan-500" />
          <h3 className="font-semibold text-sm">Use Your Own Dataset</h3>
          <span className="text-[10px] text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5">
            Optional
          </span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
          Upload a ZIP file containing images in the required folder structure. The evaluation will run against
          your dataset instead of the built-in test set.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            ['📦', 'Format: .zip only'],
            ['⚖️', 'Max size: 500 MB'],
            ['🖼️', 'Images: JPEG, PNG, BMP, TIFF'],
          ].map(([icon, text]) => (
            <span
              key={text}
              className="text-[11px] text-cyan-500 border border-cyan-500/20 rounded-full px-3 py-1"
              style={{ backgroundColor: 'rgba(6,182,212,0.06)' }}
            >
              {icon} {text}
            </span>
          ))}
        </div>

        <div
          className="rounded-lg p-3 mb-4 font-mono text-[11px] leading-loose border"
          style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
        >
          <span className="text-cyan-500">YourDataset.zip</span><br />
          &nbsp;&nbsp;├── Brain Cancer/<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── glioma/<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── img001.jpg …<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── glioma_normal/<br />
          &nbsp;&nbsp;└── Breast Cancer/<br />
          &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── breast_malignant/ …
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-cyan-500/40 rounded-md text-cyan-500 text-sm cursor-pointer hover:bg-cyan-500/5 transition-colors">
            <Upload size={14} />
            <span className="truncate max-w-[200px]">{zipFile ? zipFile.name : 'Choose ZIP file'}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={e => setZipFile(e.target.files?.[0] || null)}
            />
          </label>

          {zipFile && (
            <button
              onClick={clearZip}
              className="text-[var(--text-muted)] hover:text-red-500 transition-colors"
              title="Remove file"
            >
              <X size={16} />
            </button>
          )}

          <button
            onClick={handleUploadAndRun}
            disabled={!zipFile || isRunning || isUploading}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading
              ? <><Loader2 size={16} className="animate-spin" /> Uploading…</>
              : <><Upload size={16} /> Upload & Run</>}
          </button>
        </div>
      </div>

      {/* ── Progress log ── */}
      {(isRunning || log.length > 0) && (
        <div className="card">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            {isRunning && <Loader2 size={14} className="animate-spin text-cyan-500" />}
            Running inference…
          </h3>
          <pre
            ref={logRef}
            className="text-xs font-mono leading-relaxed rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap"
            style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-muted)' }}
          >
            {log.join('\n') || 'Starting evaluation…'}
          </pre>
        </div>
      )}

      {/* ── Error ── */}
      {status === 'error' && evalError && (
        <div className="card border border-red-500/30" style={{ backgroundColor: 'rgba(239,68,68,0.05)' }}>
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
            <AlertTriangle size={16} />
            Evaluation Failed
          </div>
          <p className="text-sm text-[var(--text-muted)]">{evalError}</p>
        </div>
      )}

      {/* ── Results ── */}
      {status === 'done' && metrics && (
        <>
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Filter size={14} />
            Scope:&nbsp;
            <strong className="text-[var(--text-main)]">{scopeLabel || 'All Organs'}</strong>
            {totalImages != null && (
              <>&nbsp;&bull;&nbsp;{totalImages.toLocaleString()} images evaluated</>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {LEVEL_DEFS.map(def => (
              <MetricCard key={def.key} def={def} data={metrics[def.key]} />
            ))}
          </div>

          <PerClassTable
            title="Level 1 — Organ / Tissue (Per Class)"
            perClassObj={metrics.organ?.per_class}
          />
          <PerClassTable
            title="Level 2 — Normality (Per Class)"
            perClassObj={metrics.normality?.per_class}
          />
          <PerClassTable
            title="Level 3 — Subtype (Per Class, Abnormal Images)"
            perClassObj={metrics.subtype?.per_class}
          />

          <div className="flex justify-end">
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/10 transition-colors"
            >
              <Download size={15} />
              Download CSV
            </button>
          </div>
        </>
      )}

      {/* ── Idle empty state ── */}
      {status === 'idle' && !metrics && (
        <div
          className="card flex flex-col items-center justify-center text-center py-16 border border-dashed border-[var(--border-color)]"
        >
          <FlaskConical size={48} className="text-[var(--text-muted)] mb-4 opacity-40" />
          <h3 className="text-base font-bold text-[var(--text-main)] mb-1">No evaluation results yet</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm">
            Select an organ filter (optional) and click&nbsp;
            <strong className="text-[var(--text-main)]">Run Evaluation</strong> to benchmark
            the model against the test set.
          </p>
        </div>
      )}
    </div>
  );
}
