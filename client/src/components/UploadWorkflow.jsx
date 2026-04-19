import { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, FileText, Image as ImageIcon, X, FolderOpen, ChevronDown } from 'lucide-react';

function compressThumbnail(dataUrl, maxW, maxH) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function saveHistoryEntry(result, filename, imageDataUrl) {
  const email = localStorage.getItem('medai_user_email') || '';
  if (!email || !result) return;
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const thumb = imageDataUrl ? await compressThumbnail(imageDataUrl, 400, 280) : null;
  const entry = { id, timestamp: Date.now(), filename, thumbnailDataUrl: thumb, result, hasReport: true };
  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Email': email },
      body: JSON.stringify({ entry }),
    });
  } catch {}
}

function TestDataBrowser({ onSelect, onClose }) {
  const [organs, setOrgans] = useState({});
  const [activeOrgan, setActiveOrgan] = useState('');
  const [activeSubtype, setActiveSubtype] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingImage, setLoadingImage] = useState(null);

  useEffect(() => {
    fetch('/api/testdata')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setOrgans(data.organs || {});
          const first = Object.keys(data.organs || {})[0] || '';
          setActiveOrgan(first);
          const firstSub = Object.keys((data.organs[first] || {}).subtypes || {})[0] || '';
          setActiveSubtype(firstSub);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const organList = Object.keys(organs);
  const subtypes = organs[activeOrgan]?.subtypes || {};
  const subtypeList = Object.keys(subtypes);
  const images = subtypes[activeSubtype] || [];

  const handleOrganChange = (organ) => {
    setActiveOrgan(organ);
    const firstSub = Object.keys((organs[organ] || {}).subtypes || {})[0] || '';
    setActiveSubtype(firstSub);
  };

  const handleImageClick = async (filename) => {
    const path = encodeURIComponent(`${activeOrgan}/${activeSubtype}/${filename}`);
    setLoadingImage(filename);
    try {
      const res = await fetch(`/api/testdata/image?path=${path}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const previewUrl = URL.createObjectURL(blob);
      const reader = new FileReader();
      reader.onload = () => {
        const fakeFile = new File([blob], filename, { type: blob.type || 'image/jpeg' });
        onSelect(fakeFile, previewUrl, reader.result);
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingImage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <FolderOpen size={17} />
            </div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>Browse Test Images</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--bg-main)]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="px-5 pt-4 pb-3 flex gap-2 flex-wrap border-b" style={{ borderColor: 'var(--border-color)' }}>
              {organList.map(organ => (
                <button
                  key={organ}
                  onClick={() => handleOrganChange(organ)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    activeOrgan === organ
                      ? 'bg-cyan-500 text-slate-900'
                      : 'border hover:border-cyan-500/50 hover:text-cyan-500'
                  }`}
                  style={activeOrgan !== organ ? { borderColor: 'var(--border-color)', color: 'var(--text-muted)' } : {}}
                >
                  {organ}
                </button>
              ))}
            </div>

            <div className="px-5 py-3 flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <label className="text-xs font-medium shrink-0" style={{ color: 'var(--text-muted)' }}>Subtype</label>
              <div className="relative flex-1 max-w-xs">
                <select
                  value={activeSubtype}
                  onChange={e => setActiveSubtype(e.target.value)}
                  className="input-field text-sm py-1.5 pr-8 appearance-none"
                >
                  {subtypeList.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
              </div>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{images.length} image{images.length !== 1 ? 's' : ''}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {images.length === 0 ? (
                <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>No images found in this subtype.</p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {images.map(filename => {
                    const path = encodeURIComponent(`${activeOrgan}/${activeSubtype}/${filename}`);
                    const isLoading = loadingImage === filename;
                    return (
                      <button
                        key={filename}
                        onClick={() => handleImageClick(filename)}
                        disabled={loadingImage !== null}
                        className="relative group rounded-xl overflow-hidden border-2 aspect-square flex items-center justify-center transition-all hover:border-cyan-500 focus:outline-none focus:border-cyan-500 disabled:opacity-60"
                        style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)' }}
                        title={filename}
                      >
                        <img
                          src={`/api/testdata/image?path=${path}`}
                          alt={filename}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        {isLoading && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {filename}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function UploadWorkflow({ modelStatus, onPredict, isProcessing, result }) {
  const [file, setFile] = useState(null);
  const [imageData, setImageData] = useState('');
  const [preview, setPreview] = useState('');
  const [allowOverride, setAllowOverride] = useState(false);
  const [organOverride, setOrganOverride] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef(null);
  const savedResultRef = useRef(null);

  useEffect(() => {
    if (result && result !== savedResultRef.current && file && imageData) {
      savedResultRef.current = result;
      saveHistoryEntry(result, file.name, imageData);
    }
  }, [result, file, imageData]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setImageData('');
      const url = URL.createObjectURL(selected);
      setPreview(url);
      const reader = new FileReader();
      reader.onload = () => setImageData(reader.result);
      reader.readAsDataURL(selected);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const selected = e.dataTransfer.files?.[0];
    if (selected && selected.type.startsWith('image/')) {
      const fakeEvent = { target: { files: [selected] } };
      handleFileChange(fakeEvent);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview('');
    setImageData('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleTestImageSelect = (fakeFile, previewUrl, dataUrl) => {
    setFile(fakeFile);
    setPreview(previewUrl);
    setImageData(dataUrl);
    setShowBrowser(false);
  };

  const handleSubmit = () => {
    if (!file || !imageData) return;
    onPredict({
      filename: file.name,
      image_data: imageData,
      manual_override: allowOverride,
      organ_override: allowOverride ? organOverride : null
    });
  };

  const handleExport = async () => {
    if (!result || !file || !imageData || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, image_data: imageData, result })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `MedAI_Report_${file.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const organOptions = modelStatus?.organ_options || [];

  return (
    <>
      {showBrowser && (
        <TestDataBrowser
          onSelect={handleTestImageSelect}
          onClose={() => setShowBrowser(false)}
        />
      )}

      <div className="card flex flex-col h-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <UploadIcon size={18} />
          </div>
          <h2 className="text-lg font-bold">Upload Workflow</h2>
        </div>

        <div
          className={`flex-1 min-h-[240px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-colors ${
            preview ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-[var(--border-color)] hover:border-cyan-500/50 hover:bg-[var(--bg-main)]'
          }`}
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !preview && fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {preview ? (
            <div className="relative w-full h-full min-h-[200px] flex items-center justify-center group">
              <img src={preview} alt="Scan preview" className="max-h-[240px] object-contain rounded-lg shadow-md" />
              <button
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="absolute top-2 right-2 bg-slate-900/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-[var(--bg-main)] flex items-center justify-center text-[var(--text-muted)] mb-4">
                <ImageIcon size={32} />
              </div>
              <p className="font-medium text-[var(--text-main)] mb-1">Drag & Drop your scan here</p>
              <p className="text-sm text-[var(--text-muted)]">or click to browse from system</p>
              <div className="mt-4 flex items-center gap-3">
                <div className="text-xs font-semibold text-cyan-500 bg-cyan-500/10 px-3 py-1 rounded-full">
                  Supports JPG, PNG, TIFF, DICOM
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowBrowser(true); }}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-[var(--border-color)] text-[var(--text-muted)] hover:border-cyan-500/60 hover:text-cyan-500 transition-colors"
                >
                  <FolderOpen size={13} />
                  Test Data
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={allowOverride}
              onChange={e => setAllowOverride(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border-color)] text-cyan-500 focus:ring-cyan-500 bg-[var(--bg-main)]"
            />
            <span className="text-sm text-[var(--text-main)]">Allow override when Step 0 or Level 1 is uncertain</span>
          </label>

          {allowOverride && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--text-muted)]">Manual organ/tissue override</label>
              <div className="relative">
                <select
                  value={organOverride}
                  onChange={e => setOrganOverride(e.target.value)}
                  className="input-field appearance-none pr-8"
                >
                  <option value="">No override</option>
                  {organOptions.map(opt => (
                    <option key={opt.label} value={opt.label}>{opt.label}</option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              onClick={handleSubmit}
              disabled={!file || !imageData || isProcessing}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  Running...
                </span>
              ) : 'Run Intelligent Pipeline'}
            </button>

            <button
              onClick={handleExport}
              disabled={!result || isExporting}
              className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Export Report
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] pt-2">
            Reports are saved to your Documents folder.
          </p>
        </div>
      </div>
    </>
  );
}
