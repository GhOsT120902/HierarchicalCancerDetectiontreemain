import { useState, useEffect } from 'react';
import { FileText, Download, Trash2, RefreshCw, CheckCircle2, AlertTriangle, Clock, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  complete:  { label: 'Complete',      icon: CheckCircle2,    cls: 'text-green-500  bg-green-500/10  border-green-500/20'  },
  partial:   { label: 'Override Used', icon: AlertTriangle,   cls: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' },
  uncertain: { label: 'Uncertain',     icon: Clock,           cls: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
  rejected:  { label: 'Rejected',      icon: XCircle,         cls: 'text-red-500    bg-red-500/10    border-red-500/20'    },
};

function groupByDate(reports) {
  return reports.reduce((acc, r) => {
    const d = new Date(r.timestamp).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
    (acc[d] = acc[d] || []).push(r);
    return acc;
  }, {});
}

const DEMO_REPORTS = [
  {
    report_id: 'demo_rpt_001',
    filename: 'brain_glioma_sample_01.jpg',
    timestamp: Date.now() - 2 * 24 * 3600 * 1000,
    status: 'complete',
    final_decision: 'Malignant — Glioma',
    organ: 'Brain Cancer',
  },
  {
    report_id: 'demo_rpt_002',
    filename: 'breast_malignant_biopsy_042.png',
    timestamp: Date.now() - 24 * 3600 * 1000,
    status: 'complete',
    final_decision: 'Malignant — Breast Malignant',
    organ: 'Breast Cancer',
  },
  {
    report_id: 'demo_rpt_003',
    filename: 'cervical_normal_tissue_003.png',
    timestamp: Date.now() - 2 * 3600 * 1000,
    status: 'complete',
    final_decision: 'Normal — No abnormality detected',
    organ: 'Cervical Cancer',
  },
];

export default function ReportsPanel() {
  const isDemoMode = localStorage.getItem('medai_demo_mode') === 'true';
  const [reports, setReports]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(null);
  const email = localStorage.getItem('medai_user_email') || '';

  const fetchReports = async () => {
    if (isDemoMode) {
      setReports(DEMO_REPORTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch('/api/reports', { headers: { 'X-User-Email': email } });
      const data = await res.json();
      if (data.ok) setReports(data.reports || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchReports(); }, []);

  const handleDownload = async (report) => {
    if (isDemoMode) return;
    setDownloading(report.report_id);
    try {
      const res = await fetch(`/api/reports/download?id=${encodeURIComponent(report.report_id)}`, {
        headers: { 'X-User-Email': email },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url  = window.URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        const stem = report.filename.replace(/\.[^.]+$/, '');
        a.download = `MedAI_Report_${stem}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch {}
    setDownloading(null);
  };

  const handleDelete = async (reportId) => {
    try {
      await fetch(`/api/reports?id=${encodeURIComponent(reportId)}`, {
        method: 'DELETE',
        headers: { 'X-User-Email': email },
      });
      setReports(r => r.filter(x => x.report_id !== reportId));
    } catch {}
  };

  const grouped = groupByDate(reports);

  return (
    <div data-tour="reports-panel" className="card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>Saved Reports</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {reports.length} report{reports.length !== 1 ? 's' : ''} · Pre-generated · Instant download
            </p>
          </div>
        </div>
        <button
          onClick={fetchReports}
          disabled={loading}
          className="p-2 rounded-lg transition-colors disabled:opacity-50"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bg-main)'; e.currentTarget.style.color = 'var(--text-main)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : reports.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 text-center rounded-xl border border-dashed"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <FileText size={44} className="mb-3 opacity-30" style={{ color: 'var(--text-muted)' }} />
          <h3 className="font-bold mb-1" style={{ color: 'var(--text-main)' }}>No reports yet</h3>
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
            Run an analysis from the Upload Scan tab. Reports are saved automatically and appear here, ready to download instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                {date}
              </p>
              <div className="space-y-2">
                {items.map(report => {
                  const cfg    = STATUS_CONFIG[report.status] || STATUS_CONFIG.complete;
                  const Icon   = cfg.icon;
                  const isDown = downloading === report.report_id;
                  const time   = new Date(report.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div
                      key={report.report_id}
                      className="flex items-center gap-4 p-4 rounded-xl border transition-colors"
                      style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)' }}
                    >
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500 shrink-0">
                        <FileText size={18} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--text-main)' }}>
                          {report.filename}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {time}
                          {report.final_decision ? ` · ${report.final_decision}` : ''}
                          {report.organ ? ` · ${report.organ}` : ''}
                        </p>
                      </div>

                      <span className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${cfg.cls}`}>
                        <Icon size={12} />
                        {cfg.label}
                      </span>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDownload(report)}
                          disabled={isDown}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 text-slate-900 transition-colors disabled:opacity-60"
                        >
                          {isDown
                            ? <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                            : <Download size={13} />
                          }
                          PDF
                        </button>
                        <button
                          onClick={() => handleDelete(report.report_id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'rgb(239 68 68)'; e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = ''; }}
                          title="Delete report"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
