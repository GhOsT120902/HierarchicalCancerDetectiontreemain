import { useState, useRef, useEffect } from 'react';
import { Upload as UploadIcon, FileText, Image as ImageIcon, X, FolderOpen, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

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

async function saveHistoryEntry(result, filename, imageDataUrl, reportId) {
  const email = localStorage.getItem('medai_user_email') || '';
  if (!email || !result) return;
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const thumb = imageDataUrl ? await compressThumbnail(imageDataUrl, 400, 280) : null;
  const entry = { id, timestamp: Date.now(), filename, thumbnailDataUrl: thumb, result, hasReport: true, ...(reportId ? { report_id: reportId } : {}) };
  try {
    await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Email': email },
      body: JSON.stringify({ entry }),
    });
  } catch {}
}

function TestDataBrowser({ onSelect }) {
  const [organs, setOrgans] = useState({});
  const [activeOrgan, setActiveOrgan] = useState('');
  const [loadingImage, setLoadingImage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/test-images')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          const organData = data.organs || {};
          setOrgans(organData);
          setActiveOrgan(Object.keys(organData)[0] || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const organList = Object.keys(organs);
  const subtypes = organs[activeOrgan]?.subtypes || {};

  const handleImageClick = async (organName, subtypeName, filename) => {
    const path = encodeURIComponent(`${organName}/${subtypeName}/${filename}`);
    setLoadingImage(`${subtypeName}/${filename}`);
    try {
      const res = await fetch(`/api/test-image?path=${path}`);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 size={20} className="animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Organ tabs */}
      <div className="flex flex-wrap gap-2 px-4 pt-4 pb-3 border-b border-[var(--border-color)]">
        {organList.map(organ => (
          <button
            key={organ}
            onClick={() => setActiveOrgan(organ)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              activeOrgan === organ
                ? 'bg-cyan-500 text-slate-900'
                : 'border border-[var(--border-color)] text-[var(--text-muted)] hover:border-cyan-500/50 hover:text-cyan-500'
            }`}
          >
            {organ}
          </button>
        ))}
      </div>

      {/* Subtype groups */}
      <div className="max-h-72 overflow-y-auto px-4 py-3 space-y-4">
        {Object.entries(subtypes).map(([subtype, images]) => (
          <div key={subtype}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              {subtype.replace(/_/g, ' ')}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map(filename => {
                const key = `${subtype}/${filename}`;
                const path = encodeURIComponent(`${activeOrgan}/${subtype}/${filename}`);
                const isLoading = loadingImage === key;
                return (
                  <button
                    key={filename}
                    onClick={() => handleImageClick(activeOrgan, subtype, filename)}
                    disabled={loadingImage !== null}
                    title={filename}
                    className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all hover:border-cyan-500 disabled:opacity-60 focus:outline-none focus:border-cyan-500"
                    style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-main)' }}
                  >
                    <img
                      src={`/api/test-image?path=${path}`}
                      alt={filename}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    {isLoading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 size={14} className="animate-spin text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UploadWorkflow({ modelStatus, onPredict, isProcessing, result, reportId }) {
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
      saveHistoryEntry(result, file.name, imageData, reportId);
    }
  }, [result, file, imageData, reportId]);

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
    <div className="flex flex-col gap-4">
      {/* Upload card */}
      <div className="card flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
            <UploadIcon size={18} />
          </div>
          <h2 className="text-lg font-bold">Upload Workflow</h2>
        </div>

        <div
          className={`min-h-[200px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center transition-colors ${
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
            <div className="relative w-full h-full min-h-[180px] flex items-center justify-center group">
              <img src={preview} alt="Scan preview" className="max-h-[220px] object-contain rounded-lg shadow-md" />
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
              <div className="mt-4">
                <div className="text-xs font-semibold text-cyan-500 bg-cyan-500/10 px-3 py-1 rounded-full">
                  Supports JPG, PNG, TIFF, DICOM
                </div>
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

      {/* Test Data Browser accordion */}
      <div className="card overflow-hidden p-0">
        <button
          onClick={() => setShowBrowser(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors"
        >
          <span className="flex items-center gap-2">
            <FolderOpen size={16} className="text-cyan-500" />
            Browse Test Data Samples
          </span>
          {showBrowser ? <ChevronUp size={16} className="text-[var(--text-muted)]" /> : <ChevronDown size={16} className="text-[var(--text-muted)]" />}
        </button>

        {showBrowser && (
          <div className="border-t border-[var(--border-color)]">
            <TestDataBrowser onSelect={handleTestImageSelect} />
          </div>
        )}
      </div>
    </div>
  );
}
