import { Brain, Stethoscope, Play } from 'lucide-react';

export default function HeroSection({ modelStatus }) {
  const isError = modelStatus?.error || !modelStatus;

  return (
    <div
      className="rounded-xl shadow-sm p-5 relative overflow-hidden text-white"
      style={{ background: 'linear-gradient(to bottom right, var(--bg-hero-from), var(--bg-hero-to))' }}
    >
      <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        <div className="col-span-2 space-y-5">
          <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold tracking-wider">
            DECISION SUPPORT PIPELINE
          </div>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            AI Powered Cancer Imaging <br className="hidden md:block"/>
            <span className="text-cyan-400">Classification System</span>
          </h1>

          <p className="text-white/70 max-w-2xl leading-relaxed text-sm md:text-base">
            Intelligent scan analysis powered by deep learning. Step 0 validates the input and estimates modality, Level 1 routes tissue, Level 2 decides normal versus abnormal, and Level 3 explains subtype risk with filtered probabilities and safety warnings.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold py-2.5 px-6 rounded-lg transition-colors shadow-lg shadow-cyan-500/20">
              Upload Scan
            </button>
            <button className="border border-white/30 hover:bg-white/10 text-white font-medium py-2.5 px-6 rounded-lg transition-colors flex items-center gap-2">
              <Play size={18} fill="currentColor" />
              Live Demo
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div
              className="backdrop-blur-sm rounded-xl p-4 shadow-lg"
              style={{ backgroundColor: 'var(--bg-hero-card)', border: '1px solid var(--hero-card-border)' }}
            >
              <Brain className="text-cyan-400 mb-2" size={24} />
              <div className="text-2xl font-bold">99.8%</div>
              <div className="text-xs text-white/50 font-medium">Model Accuracy</div>
            </div>
            <div
              className="backdrop-blur-sm rounded-xl p-4 shadow-lg"
              style={{ backgroundColor: 'var(--bg-hero-card)', border: '1px solid var(--hero-card-border)' }}
            >
              <Stethoscope className="text-cyan-400 mb-2" size={24} />
              <div className="text-2xl font-bold">12,450+</div>
              <div className="text-xs text-white/50 font-medium">Scans Analyzed</div>
            </div>
          </div>

          <div
            className="backdrop-blur-sm rounded-xl p-4 shadow-lg"
            style={{ backgroundColor: 'var(--bg-hero-card)', border: '1px solid var(--hero-card-border)' }}
          >
            <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isError ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              Platform Status
            </h3>
            {isError ? (
              <p className="text-xs text-yellow-400">{modelStatus?.error || 'Could not reach the local inference server.'}</p>
            ) : (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/50">Device</span>
                  <span className="font-medium">{modelStatus.device || 'CPU'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Organ Model</span>
                  <span className={`font-medium ${modelStatus.organ_ready ? 'text-green-400' : 'text-yellow-500'}`}>
                    {modelStatus.organ_ready ? 'Ready' : 'Loading'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Subtype Model</span>
                  <span className={`font-medium ${modelStatus.subtype_ready ? 'text-green-400' : 'text-yellow-500'}`}>
                    {modelStatus.subtype_ready ? 'Ready' : 'Loading'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
