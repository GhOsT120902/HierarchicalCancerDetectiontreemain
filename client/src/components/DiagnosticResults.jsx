import { useState } from 'react';
import { Activity, BoxSelect, AlertTriangle, ShieldCheck, ChevronDown, ChevronUp, FileText } from 'lucide-react';

export default function DiagnosticResults({ result, onExport }) {
  const [showJson, setShowJson] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportClick = async () => {
    if (!onExport || isExporting) return;
    setIsExporting(true);
    try {
      await onExport();
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const getToneClass = (color) => {
    switch (color?.toLowerCase()) {
      case 'green': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'red': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'yellow': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'blue': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getSimpleColor = (status) => {
    if (!status) return 'text-slate-400';
    if (status.includes('Normal') || status.includes('Valid')) return 'text-green-500';
    if (status.includes('Abnormal') || status.includes('Alert')) return 'text-red-500';
    return 'text-blue-500';
  };

  if (!result) {
    return (
      <div data-tour="diagnostic-results" className="card flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <Activity size={18} />
          </div>
          <h2 className="text-lg font-bold">Diagnostic Results</h2>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-[var(--border-color)] rounded-xl bg-[var(--bg-main)]">
          <BoxSelect size={48} className="text-[var(--text-muted)] mb-4 opacity-50" />
          <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">No Results Yet</h3>
          <p className="text-sm text-[var(--text-muted)] max-w-sm">
            Upload an image to see modality validation, tissue routing, normality, subtype analysis, and explanations.
          </p>
        </div>
      </div>
    );
  }

  const { modality, organ_prediction, normality, subtype_prediction, charts, gradcam } = result;

  return (
    <div data-tour="diagnostic-results" className="card flex flex-col">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <Activity size={18} />
          </div>
          <h2 className="text-lg font-bold">Diagnostic Results</h2>
        </div>

        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-full font-bold text-sm border flex items-center gap-2 ${getToneClass(result.status === 'Abnormal' ? 'red' : 'green')}`}>
            {result.status === 'Abnormal' ? <AlertTriangle size={16} /> : <ShieldCheck size={16} />}
            {result.final_decision}
          </div>
          {onExport && (
            <button
              onClick={handleExportClick}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-cyan-500 hover:bg-cyan-600 disabled:opacity-70 disabled:cursor-not-allowed text-slate-900 transition-colors"
            >
              {isExporting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={15} />
                  Export PDF
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Step 0 */}
        <div className="border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-main)]">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Step 0: Modality</h3>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--text-main)]">{modality?.type || 'N/A'}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getToneClass(modality?.color)}`}>
              {modality?.status || 'Unknown'}
            </span>
          </div>
          <div className="mt-2 text-xs flex justify-between text-[var(--text-muted)]">
            <span>Confidence</span>
            <span className="font-mono">{(modality?.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Level 1 */}
        <div className="border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-main)]">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Level 1: Tissue</h3>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--text-main)]">{organ_prediction?.label || 'N/A'}</span>
            {organ_prediction?.manual_override_required && (
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Override Used</span>
            )}
          </div>
          <div className="mt-2 text-xs flex justify-between text-[var(--text-muted)]">
            <span>Confidence</span>
            <span className="font-mono">{(organ_prediction?.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Level 2 */}
        <div className="border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-main)]">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Level 2: Normality</h3>
          <div className="flex items-center justify-between">
            <span className={`font-semibold ${getSimpleColor(normality?.status)}`}>{normality?.label || 'N/A'}</span>
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getToneClass(normality?.color)}`}>
              {normality?.status || 'Unknown'}
            </span>
          </div>
          <div className="mt-2 text-xs flex justify-between text-[var(--text-muted)]">
            <span>Confidence</span>
            <span className="font-mono">{(normality?.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>

        {/* Level 3 */}
        <div className="border border-[var(--border-color)] rounded-xl p-4 bg-[var(--bg-main)]">
          <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Level 3: Subtype</h3>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--text-main)]">{subtype_prediction?.label || 'N/A'}</span>
          </div>
          <div className="mt-2 text-xs flex justify-between text-[var(--text-muted)]">
            <span>Confidence</span>
            <span className="font-mono">{(subtype_prediction?.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {gradcam && (Object.keys(gradcam).length > 0) && (
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-bold border-b border-[var(--border-color)] pb-2">Grad-CAM Review</h3>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {gradcam.organ && gradcam.organ.image_base64 && (
              <div className="flex-none w-40">
                <img src={`data:${gradcam.organ.mime_type};base64,${gradcam.organ.image_base64}`} alt="Organ GradCAM" className="w-full rounded-lg border border-[var(--border-color)] shadow-sm" />
                <p className="text-xs text-center mt-1 text-[var(--text-muted)]">{gradcam.organ.title}</p>
              </div>
            )}
            {gradcam.subtype && gradcam.subtype.image_base64 && (
              <div className="flex-none w-40">
                <img src={`data:${gradcam.subtype.mime_type};base64,${gradcam.subtype.image_base64}`} alt="Subtype GradCAM" className="w-full rounded-lg border border-[var(--border-color)] shadow-sm" />
                <p className="text-xs text-center mt-1 text-[var(--text-muted)]">{gradcam.subtype.title}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {charts && charts.organ && charts.organ.items && (
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-bold border-b border-[var(--border-color)] pb-2">{charts.organ.title || 'Organ Probability Graph'}</h3>
          <div className="space-y-2">
            {charts.organ.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <div className="w-24 truncate text-[var(--text-muted)] font-medium" title={item.label}>{item.label}</div>
                <div className="flex-1 h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${item.highlight ? 'bg-cyan-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                    style={{ width: `${item.confidence * 100}%` }}
                  ></div>
                </div>
                <div className="w-12 text-right font-mono">{(item.confidence * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {charts && charts.subtype && charts.subtype.items && (
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-bold border-b border-[var(--border-color)] pb-2">{charts.subtype.title || 'Subtype Probability Graph'}</h3>
          <div className="space-y-2">
            {charts.subtype.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <div className="w-24 truncate text-[var(--text-muted)] font-medium" title={item.label}>{item.label}</div>
                <div className="flex-1 h-2 bg-[var(--bg-main)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${item.highlight ? 'bg-red-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                    style={{ width: `${item.confidence * 100}%` }}
                  ></div>
                </div>
                <div className="w-12 text-right font-mono">{(item.confidence * 100).toFixed(1)}%</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-[var(--border-color)]">
        <button 
          onClick={() => setShowJson(!showJson)}
          className="flex items-center justify-between w-full p-2 text-sm font-mono text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] rounded-md transition-colors"
        >
          <span>&lt; /&gt; Developer API Data (Raw JSON)</span>
          {showJson ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        
        {showJson && (
          <div className="mt-2 p-3 bg-slate-950 text-green-400 font-mono text-xs rounded-lg overflow-x-auto">
            <pre>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>

    </div>
  );
}
