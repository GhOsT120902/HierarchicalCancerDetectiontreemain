import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Shield, Map } from 'lucide-react';

const STEP_KEY   = 'medai_tour_step';
const PAGE_KEY   = 'medai_tour_page';
const ACTIVE_KEY = 'medai_tour_active';

/* ── poll for a data-tour element and return its viewport rect ───────────── */
function useElementRect(target) {
  const [rect, setRect]   = useState(null);
  const prevRef           = useRef(null);

  useEffect(() => {
    if (!target) { setRect(null); return; }
    if (prevRef.current !== target) { setRect(null); prevRef.current = target; }

    let tries = 0, tid;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      } else if (tries++ < 40) {
        tid = setTimeout(measure, 80);
      }
    };
    measure();

    const onResize = () => {
      const el = document.querySelector(`[data-tour="${target}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    window.addEventListener('resize', onResize);
    return () => { clearTimeout(tid); window.removeEventListener('resize', onResize); };
  }, [target]);

  return rect;
}

/* ── dark overlay with a cut-out around rect ────────────────────────────── */
function Spotlight({ rect, pad = 12 }) {
  if (!rect) return <div className="fixed inset-0 z-[9000] pointer-events-none bg-black/72" />;
  const t = Math.max(0, rect.top  - pad);
  const l = Math.max(0, rect.left - pad);
  const w = rect.width  + pad * 2;
  const h = rect.height + pad * 2;
  return (
    <div className="fixed inset-0 z-[9000] pointer-events-none">
      <div style={{ position:'absolute', inset:0, top:0, height:`${t}px`, backgroundColor:'rgba(0,0,0,0.72)' }} />
      <div style={{ position:'absolute', top:`${t}px`, left:0, width:`${l}px`, height:`${h}px`, backgroundColor:'rgba(0,0,0,0.72)' }} />
      <div style={{ position:'absolute', top:`${t}px`, left:`${l+w}px`, right:0, height:`${h}px`, backgroundColor:'rgba(0,0,0,0.72)' }} />
      <div style={{ position:'absolute', top:`${t+h}px`, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.72)' }} />
      <div style={{ position:'absolute', top:`${t}px`, left:`${l}px`, width:`${w}px`, height:`${h}px`, borderRadius:'10px', boxShadow:'0 0 0 3px rgba(34,211,238,0.55)', border:'2px solid rgba(34,211,238,0.75)' }} />
    </div>
  );
}

/* ── compute card position relative to spotlight ─────────────────────────── */
function calcPos(rect, cw, ch, pad = 12) {
  const vw = window.innerWidth, vh = window.innerHeight, gap = 20;
  if (!rect) return { top: (vh - ch) / 2, left: (vw - cw) / 2 };
  const sTop = rect.top - pad, sBot = rect.top + rect.height + pad;
  const sL   = rect.left - pad, sW = rect.width + pad * 2;
  let top = sBot + ch + gap <= vh ? sBot + gap
          : sTop - ch - gap >= 0  ? sTop - ch - gap
          : Math.max(16, Math.min(vh - ch - 16, sTop));
  let left = Math.max(16, Math.min(vw - cw - 16, sL + sW / 2 - cw / 2));
  return { top: Math.round(top), left: Math.round(left) };
}

/* ── tooltip card ─────────────────────────────────────────────────────────── */
function Tooltip({ step, idx, total, rect, onPrev, onNext, onEnd }) {
  const ref   = useRef(null);
  const [pos, setPos] = useState(null);

  useLayoutEffect(() => {
    if (!ref.current) return;
    const { offsetWidth: w, offsetHeight: h } = ref.current;
    setPos(calcPos(rect, w || 390, h || 260));
  }, [rect, idx]);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        zIndex: 9100,
        top:     pos ? pos.top  : 0,
        left:    pos ? pos.left : 0,
        opacity: pos ? 1 : 0,
        transition: pos ? 'top 0.2s ease, left 0.2s ease, opacity 0.15s ease' : 'none',
        width: 390,
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <div
        className="rounded-xl overflow-hidden border shadow-2xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'rgba(34,211,238,0.35)',
          boxShadow: '0 24px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(34,211,238,0.18)',
        }}
      >
        {step.adminOnly && (
          <div className="px-4 py-2.5 flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/25">
            <Shield size={14} className="text-amber-400 shrink-0" />
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Admin Only</span>
            <span className="text-xs text-amber-300/60 ml-1">— hidden from regular users</span>
          </div>
        )}

        <div className="p-5">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <span className="inline-block text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-0.5 mb-1.5">
                {idx + 1} / {total}
              </span>
              <h3 className="text-base font-bold leading-snug text-[var(--text-main)]">{step.title}</h3>
            </div>
            <button onClick={onEnd} aria-label="Skip tour"
              className="mt-0.5 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors shrink-0">
              <X size={15} />
            </button>
          </div>
          <p className="text-sm leading-relaxed text-[var(--text-muted)]">{step.description}</p>
        </div>

        <div className="px-5 pb-4 flex items-center justify-between">
          <button onClick={onEnd} className="text-xs text-[var(--text-muted)] hover:text-red-400 transition-colors">
            Skip
          </button>
          <div className="flex items-center gap-2">
            {idx > 0 && (
              <button onClick={onPrev}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors">
                <ChevronLeft size={13} /> Back
              </button>
            )}
            <button onClick={onNext}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-900 transition-colors shadow shadow-cyan-500/25">
              {idx === total - 1 ? 'Finish' : 'Next'}
              {idx < total - 1 && <ChevronRight size={15} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── step data ────────────────────────────────────────────────────────────── */
export const DASHBOARD_STEPS = [
  { target:'hero-section',      tab:'Dashboard',      page:'dashboard',                   title:'Dashboard Overview',        description:'Welcome to MedAI Clinical Support. The Dashboard gives you a high-level summary of pipeline status, model accuracy metrics, and total scans analysed — your command centre for cancer imaging.' },
  { target:'upload-workflow',   tab:'Upload Scan',    page:'dashboard',                   title:'Upload & Analyse Scans',    description:'Drag and drop a histopathology scan here, or browse from your file system. You can also use the built-in test data browser. Once uploaded, click "Run Intelligent Pipeline" to start the 4-stage AI analysis.' },
  { target:'diagnostic-results',tab:'Upload Scan',    page:'dashboard',                   title:'Diagnostic Results Panel',  description:'Results appear here after analysis. You\'ll see Step 0 (modality validation), Level 1 (tissue type), Level 2 (normal vs abnormal), and Level 3 (cancer subtype) with confidence scores and Grad-CAM visualisations.' },
  { target:'reports-panel',     tab:'Reports',        page:'dashboard',                   title:'Saved Reports',             description:'All your generated diagnostic PDF reports are stored here, grouped by date. Click the PDF button to re-download any report instantly — no need to re-run the analysis.' },
  { target:'history-panel',     tab:'History',        page:'dashboard',                   title:'Analysis History',          description:'Every scan you\'ve analysed is saved here with its thumbnail, result summary, and timestamp. Expand any entry for full details, export a PDF report, or delete individual entries.' },
  { target:'admin-controls',    tab:'Admin Controls', page:'dashboard', adminOnly:true,    title:'Admin Controls',            description:'Admins can view and manage every user\'s history entries across the entire system. Search by email, filename, diagnosis, or organ type. Entries can be edited or deleted globally. Regular users cannot see this section.' },
  { target:'model-accuracy',    tab:'Model Accuracy', page:'dashboard', adminOnly:true,    title:'Model Accuracy Evaluation', description:'Run a full benchmark evaluation of the AI pipeline against the test dataset. Produces per-class precision, recall, and F1 scores at every pipeline level. Admin-exclusive access only.' },
  { target:'settings-panel',    tab:'Settings',       page:'dashboard',                   title:'Account Settings',          description:'Change your account password here. Enter your current password and set a new one (minimum 8 characters). Google sign-in users don\'t need to manage a password here.' },
  { target:'help-panel',        tab:'Help',           page:'dashboard',                   title:'Help & Documentation',      description:'Everything you need to understand MedAI — quick-start guide, pipeline explanation, result interpretation tips, test data usage, FAQ, and clinical disclaimers. Your go-to reference.' },
];

export const LOGIN_STEPS = [
  { target:'signin-form',     page:'login', title:'Sign In',              description:'Enter your registered email address and password to access MedAI. Your session is securely persisted so you stay logged in across refreshes.' },
  { target:'password-toggle', page:'login', title:'Show / Hide Password', description:'Toggle the eye icon to reveal or hide your password as you type — helpful when entering complex passwords on shared screens.' },
  { target:'forgot-password', page:'login', title:'Forgot Password',      description:'Forgotten your password? Click here to receive a 6-digit reset code by email. Enter the code along with your new password to regain access.' },
  { target:'create-account',  page:'login', title:'Create Account',       description:'New users can register with an email and password here. Once registered, you\'ll be able to upload scans and build your analysis history immediately.' },
  { target:'admin-login',     page:'login', title:'Admin Login',          description:'Hospital administrators log in through this separate portal. Admin accounts unlock the Admin Controls and Model Accuracy tabs — click the amber shield to switch to the admin form.' },
  { target:'google-signin',   page:'login', title:'Google Sign-In',       description:'Sign in with your Google account for a seamless, password-free experience. Your Google profile is used to authenticate securely without storing any passwords.' },
];

const ALL = [...DASHBOARD_STEPS, ...LOGIN_STEPS];

/* ── main component ───────────────────────────────────────────────────────── */
export default function GuidedTour({ isLoggedIn, onTabChange, onLogout, onTourComplete }) {
  /* demo session lives in a ref so it survives re-renders without stale closure */
  const demoRef = useRef(localStorage.getItem('medai_demo_mode') === 'true');
  const [isDemoSession, setIsDemoSession] = useState(demoRef.current);

  const [isActive,      setIsActive]      = useState(false);
  const [stepIndex,     setStepIndex]     = useState(0);
  const [tabBusy,       setTabBusy]       = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const step     = ALL[Math.min(stepIndex, ALL.length - 1)];
  const isLogin  = step.page === 'login';
  const pageOK   = isLogin ? !isLoggedIn : isLoggedIn;
  const showTour = isDemoSession && isActive && pageOK && !transitioning;

  const rect = useElementRect(showTour && !tabBusy ? step.target : null);

  /* ── initialise tour from localStorage ─────────────────────────────────── */
  useEffect(() => {
    const demo = localStorage.getItem('medai_demo_mode') === 'true';
    if (demo && !demoRef.current) { demoRef.current = true; setIsDemoSession(true); }
    if (!demoRef.current) return;

    const savedIdx  = parseInt(localStorage.getItem(STEP_KEY)   ?? '-1', 10);
    const savedPage = localStorage.getItem(PAGE_KEY)  ?? '';
    const wasActive = localStorage.getItem(ACTIVE_KEY) === 'true';

    if (wasActive && savedIdx >= 0 && savedPage) {
      const s = ALL[savedIdx];
      if (s && ((s.page === 'login' && !isLoggedIn) || (s.page === 'dashboard' && isLoggedIn))) {
        setStepIndex(savedIdx);
        setIsActive(true);
        return;
      }
    }

    if (localStorage.getItem('medai_tour_autostart') === 'true' && isLoggedIn) {
      localStorage.removeItem('medai_tour_autostart');
      setStepIndex(0);
      setIsActive(true);
    }
  }, [isLoggedIn]);

  /* ── persist current step ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!isActive) return;
    localStorage.setItem(STEP_KEY,   String(stepIndex));
    localStorage.setItem(PAGE_KEY,   step.page);
    localStorage.setItem(ACTIVE_KEY, 'true');
  }, [stepIndex, isActive, step.page]);

  /* ── switch sidebar tab with a brief "busy" pause for DOM to settle ─────── */
  const switchTab = useCallback((tab) => {
    if (!tab || !onTabChange) return;
    setTabBusy(true);
    onTabChange(tab);
    setTimeout(() => setTabBusy(false), 500);
  }, [onTabChange]);

  useEffect(() => {
    if (!isActive) return;
    if (step.tab) switchTab(step.tab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex, isActive]);

  /* ── end / finish tour ─────────────────────────────────────────────────── */
  const endTour = useCallback(() => {
    setIsActive(false);
    localStorage.removeItem(STEP_KEY);
    localStorage.removeItem(PAGE_KEY);
    localStorage.removeItem(ACTIVE_KEY);
    onTourComplete?.();
  }, [onTourComplete]);

  /* ── navigate forward ──────────────────────────────────────────────────── */
  const handleNext = useCallback(() => {
    const next = stepIndex + 1;
    if (next >= ALL.length) { endTour(); return; }

    const nextStep = ALL[next];

    if (nextStep.page === 'login' && isLoggedIn) {
      localStorage.setItem(STEP_KEY,   String(next));
      localStorage.setItem(PAGE_KEY,   'login');
      localStorage.setItem(ACTIVE_KEY, 'true');
      setStepIndex(next);

      setTransitioning(true);
      setTimeout(() => {
        onLogout?.();
        setTimeout(() => setTransitioning(false), 300);
      }, 750);
      return;
    }

    setStepIndex(next);
  }, [stepIndex, isLoggedIn, onLogout, endTour]);

  /* ── navigate back ─────────────────────────────────────────────────────── */
  const handlePrev = useCallback(() => {
    if (stepIndex <= 0) return;
    const prev = stepIndex - 1;
    if (ALL[prev].tab) switchTab(ALL[prev].tab);
    setStepIndex(prev);
  }, [stepIndex, switchTab]);

  /* ── restart from step 0 (only while logged in) ─────────────────────────── */
  const handleRestart = useCallback(() => {
    if (!isLoggedIn) return;
    setStepIndex(0);
    setIsActive(true);
    if (ALL[0].tab) switchTab(ALL[0].tab);
  }, [isLoggedIn, switchTab]);

  if (!isDemoSession) return null;

  const loginStepNum = isActive && !isLoggedIn && isLogin
    ? stepIndex - DASHBOARD_STEPS.length + 1 : 0;

  return (
    <>
      {/* ── page-change loading overlay ─────────────────────────────────── */}
      {transitioning && (
        <div className="fixed inset-0 z-[9500] flex flex-col items-center justify-center gap-4 bg-black/85">
          <div className="w-12 h-12 rounded-full border-[3px] border-cyan-500 border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-cyan-400 tracking-wide">Continuing tour on the login page…</p>
          <p className="text-xs text-slate-400">The tour will resume automatically</p>
        </div>
      )}

      {/* ── spotlight + tooltip ─────────────────────────────────────────── */}
      {showTour && (
        <>
          <Spotlight rect={rect} />
          <Tooltip
            step={step}
            idx={stepIndex}
            total={ALL.length}
            rect={rect}
            onPrev={handlePrev}
            onNext={handleNext}
            onEnd={endTour}
          />
        </>
      )}

      {/* ── login-page progress banner ──────────────────────────────────── */}
      {loginStepNum > 0 && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9200] flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-xs font-semibold backdrop-blur-sm pointer-events-none select-none">
          <Map size={12} />
          Guided tour — login section &nbsp;·&nbsp; {loginStepNum} / {LOGIN_STEPS.length}
        </div>
      )}

      {/* ── floating tour button (logged-in only) ───────────────────────── */}
      {isLoggedIn && (
        <button
          onClick={isActive ? endTour : handleRestart}
          className="fixed bottom-6 right-6 z-[8999] flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95"
          title={isActive ? 'End guided tour' : 'Restart guided tour'}
        >
          <Map size={15} />
          {isActive ? 'Stop Tour' : 'Tour'}
        </button>
      )}
    </>
  );
}
