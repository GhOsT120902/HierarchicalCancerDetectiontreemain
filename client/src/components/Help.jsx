import { HelpCircle, Upload, Activity, Microscope, FileText, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Info, Layers, Brain, FlaskConical } from 'lucide-react';
import { useState } from 'react';

function Section({ icon: Icon, title, color = 'cyan', children }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3 pb-3 border-b border-[var(--border-color)]">
        <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 flex items-center justify-center text-${color}-500 shrink-0`}>
          <Icon size={18} />
        </div>
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Accordion({ question, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-left hover:bg-[var(--bg-main)] transition-colors"
      >
        <span>{question}</span>
        {open ? <ChevronDown size={15} className="shrink-0 text-[var(--text-muted)]" /> : <ChevronRight size={15} className="shrink-0 text-[var(--text-muted)]" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-[var(--text-muted)] leading-relaxed border-t border-[var(--border-color)] pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function Step({ num, title, desc }) {
  return (
    <div className="flex gap-4">
      <div className="w-7 h-7 rounded-full bg-cyan-500 text-slate-900 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
        {num}
      </div>
      <div>
        <p className="font-semibold text-sm text-[var(--text-main)]">{title}</p>
        <p className="text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function PipelineLevel({ level, label, icon: Icon, color, desc, examples }) {
  return (
    <div className={`rounded-xl border border-${color}-500/30 bg-${color}-500/5 p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={`text-${color}-500`} />
        <span className={`text-xs font-bold uppercase tracking-wider text-${color}-500`}>Level {level}</span>
        <span className="text-sm font-semibold text-[var(--text-main)]">— {label}</span>
      </div>
      <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-2">{desc}</p>
      {examples && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {examples.map(e => (
            <span key={e} className={`text-[11px] px-2 py-0.5 rounded-full border border-${color}-500/30 text-${color}-400 bg-${color}-500/10`}>{e}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  return (
    <div className="max-w-3xl space-y-6">

      {/* Header */}
      <div className="card bg-gradient-to-r from-cyan-500/10 to-transparent border-cyan-500/20">
        <div className="flex items-center gap-3 mb-2">
          <HelpCircle size={22} className="text-cyan-500" />
          <h1 className="text-xl font-bold">Help & Documentation</h1>
        </div>
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          MedAI Clinical Support is a hierarchical AI pipeline for cancer image classification.
          It analyses histopathology scans through three sequential stages — organ routing,
          normality assessment, and cancer subtype identification.
        </p>
      </div>

      {/* Quick Start */}
      <Section icon={Upload} title="Quick Start — Running Your First Analysis">
        <div className="space-y-4">
          <Step num={1} title="Open the Upload Scan tab"
            desc="Click 'Upload Scan' in the sidebar. You can drag and drop an image onto the drop zone or click it to browse your files." />
          <Step num={2} title="Select an image"
            desc="Upload a histopathology image (JPG, PNG, TIFF or DICOM). Alternatively, expand 'Browse Test Data Samples' at the bottom of the panel to pick a built-in sample image directly." />
          <Step num={3} title="Run the pipeline"
            desc="Click 'Run Intelligent Pipeline'. The system will process the image through all three analysis levels automatically." />
          <Step num={4} title="Review results"
            desc="Results appear in the right panel and in the Results tab. You can export a full PDF diagnostic report using the 'Export Report' button." />
        </div>
      </Section>

      {/* Pipeline Levels */}
      <Section icon={Layers} title="How the Three-Level Pipeline Works">
        <p className="text-sm text-[var(--text-muted)] leading-relaxed">
          The pipeline runs sequentially — each level depends on the output of the one before it.
          If an earlier level is inconclusive, later stages may not run.
        </p>
        <div className="space-y-3 mt-2">
          <PipelineLevel
            level={1} label="Organ / Tissue Classification" icon={Microscope} color="cyan"
            desc="The image is first classified into one of eight organ or tissue categories. This determines which specialist subtype model will be used in Level 3."
            examples={['ALL', 'Brain', 'Breast', 'Cervical', 'Kidney', 'Lung & Colon', 'Lymphoma', 'Oral']}
          />
          <PipelineLevel
            level={2} label="Normal vs. Abnormal Assessment" icon={Activity} color="yellow"
            desc="The organ-specific region is assessed to determine whether the tissue appears normal (healthy) or abnormal (potentially cancerous). Normal tissue is not passed to Level 3."
            examples={['NORMAL', 'ABNORMAL']}
          />
          <PipelineLevel
            level={3} label="Cancer Subtype Classification" icon={Brain} color="purple"
            desc="Abnormal tissue is further classified into specific cancer subtypes. This is the most clinically significant output and is only produced when Levels 1 and 2 both succeed."
            examples={['Glioma', 'Malignant', 'Adenocarcinoma', 'Benign', 'Squamous Cell', '…']}
          />
        </div>
      </Section>

      {/* Interpreting Results */}
      <Section icon={Activity} title="Interpreting Results">
        <div className="space-y-3 text-sm text-[var(--text-muted)] leading-relaxed">
          <div className="flex gap-3 p-3 rounded-lg border border-green-500/20 bg-green-500/5">
            <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-green-400">Confidence bars</span> — Each prediction includes a confidence percentage. Higher values indicate stronger model certainty. Values above 70% are generally reliable; below 50% should be treated with caution.
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
            <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-yellow-400">Pipeline stopped early</span> — If the image fails Step 0 validation (e.g., it is not a histopathology image, is blurry, or blank), or Level 1 is uncertain, later stages will not run. A reason is always displayed.
            </div>
          </div>
          <div className="flex gap-3 p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
            <Info size={16} className="text-cyan-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-cyan-400">Manual override</span> — If you know the organ type already, enable "Allow override" in the upload panel and select the organ. This skips Level 1 uncertainty checks and forces the pipeline to continue.
            </div>
          </div>
        </div>
      </Section>

      {/* Test Data */}
      <Section icon={FlaskConical} title="Using Test Data Samples">
        <div className="space-y-2 text-sm text-[var(--text-muted)] leading-relaxed">
          <p>
            The system includes a curated test dataset organised by organ type and cancer subtype.
            You can use these to explore the pipeline without needing your own images.
          </p>
          <ol className="list-decimal list-inside space-y-1 pl-1 mt-2">
            <li>Go to the <strong className="text-[var(--text-main)]">Upload Scan</strong> tab.</li>
            <li>Expand the <strong className="text-[var(--text-main)]">Browse Test Data Samples</strong> accordion at the bottom of the panel.</li>
            <li>Select an organ category using the filter tabs.</li>
            <li>Click any thumbnail to load it into the upload zone.</li>
            <li>Click <strong className="text-[var(--text-main)]">Run Intelligent Pipeline</strong> to analyse it.</li>
          </ol>
          <p className="mt-2 text-xs">
            Test images are grouped by subtype (e.g. <em>brain_glioma</em>, <em>brain_healthy</em>)
            so you can compare how the model responds to different tissue categories.
          </p>
        </div>
      </Section>

      {/* Reports */}
      <Section icon={FileText} title="Reports & History">
        <div className="space-y-2 text-sm text-[var(--text-muted)] leading-relaxed">
          <p><strong className="text-[var(--text-main)]">PDF Reports</strong> — After a scan is analysed, click <em>Export Report</em> to generate a full diagnostic PDF containing the image, all three pipeline level results, and confidence scores.</p>
          <p><strong className="text-[var(--text-main)]">Reports tab</strong> — All previously generated reports are listed here. You can re-download any report from your session history.</p>
          <p><strong className="text-[var(--text-main)]">Results tab</strong> — The most recent analysis result is always accessible here, even after navigating away from the upload screen.</p>
        </div>
      </Section>

      {/* FAQ */}
      <Section icon={HelpCircle} title="Frequently Asked Questions" color="purple">
        <div className="space-y-2">
          <Accordion question="What image formats are supported?">
            The pipeline accepts <strong>JPG, JPEG, PNG, BMP, TIFF</strong> and <strong>DICOM</strong> files.
            Images should be histopathology slides — photographs or non-medical images will be rejected at the Step 0 validation stage.
          </Accordion>
          <Accordion question="Why did the pipeline stop at Step 0?">
            Step 0 is an image validation gate. It checks that the image is a genuine histopathology scan (not a photograph, screenshot, or blank image), and that it meets minimum sharpness and colour requirements.
            If your image was rejected, try using a cleaner, higher-resolution scan. You can also enable <em>Manual override</em> if you are confident in the image quality.
          </Accordion>
          <Accordion question="Why is Level 3 missing from my results?">
            Level 3 (subtype classification) only runs when Level 2 identifies the tissue as <em>ABNORMAL</em>.
            Normal tissue does not receive a cancer subtype prediction — this is by design. If Level 1 was uncertain and the pipeline stopped early, enabling manual organ override will allow Level 3 to run.
          </Accordion>
          <Accordion question="How accurate is the system?">
            Accuracy varies by organ and subtype. You can run a full benchmark from the
            <strong> Model Accuracy</strong> tab (admin access required), which evaluates the pipeline
            against the built-in test dataset and reports per-class precision, recall, and F1 scores.
          </Accordion>
          <Accordion question="Is my data stored or shared?">
            Images and results are processed locally on the server and stored only in your session history on this deployment. No data is sent to external services.
            History entries are associated with your account email and can be deleted by an administrator via the Admin Controls panel.
          </Accordion>
          <Accordion question="How do I change my password?">
            Go to <strong>Settings</strong> in the sidebar. Enter your current password and then your new password (minimum 8 characters). Google sign-in accounts do not have a password to change here.
          </Accordion>
          <Accordion question="What does the 'Allow override' checkbox do?">
            When enabled, you can manually specify the organ/tissue type. The pipeline will skip Level 1 uncertainty rejection and proceed directly to Level 2 and Level 3 using your specified organ. Use this when you already know the tissue source and want a subtype result regardless of Level 1 confidence.
          </Accordion>
        </div>
      </Section>

      {/* Disclaimer */}
      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3 flex gap-3">
        <AlertTriangle size={16} className="text-yellow-500 shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <strong className="text-yellow-400">Clinical Disclaimer —</strong> MedAI is a research and decision-support tool.
          All outputs should be reviewed by a qualified medical professional before being used to inform clinical decisions.
          The system is not a substitute for pathological diagnosis.
        </p>
      </div>

    </div>
  );
}
