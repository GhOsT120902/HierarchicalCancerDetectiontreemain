// ── AUTH SYSTEM ────────────────────────────────────────────────────────────
const authContainer = document.getElementById("authContainer");
const dashboardContainer = document.getElementById("dashboardContainer");
const loginForm = document.getElementById("loginForm");
const togglePwd = document.getElementById("togglePwd");
const eyeIcon = document.getElementById("eyeIcon");
const pwdInput = document.getElementById("password");
const logoutBtn = document.getElementById("logoutBtn");

const AUTH_PANELS = ['loginPanel', 'createAccountPanel', 'forgotPanel', 'resetPanel'];

function showAuthPanel(id) {
  AUTH_PANELS.forEach(p => {
    const el = document.getElementById(p);
    if (el) el.style.display = p === id ? '' : 'none';
  });
}

// Check if user is already logged in
window.addEventListener('load', () => {
  const isLoggedIn = localStorage.getItem('medai_logged_in');
  if (isLoggedIn === 'true') {
    showDashboard();
  } else {
    showLoginPage();
  }
});

function showLoginPage() {
  if (authContainer) authContainer.style.display = 'flex';
  if (dashboardContainer) dashboardContainer.style.display = 'none';
  showAuthPanel('loginPanel');
}

function showDashboard() {
  if (authContainer) authContainer.style.display = 'none';
  if (dashboardContainer) dashboardContainer.style.display = 'flex';
  if (form) {
    resetResults();
    fetchHealth();
  }
}

function logout() {
  localStorage.removeItem('medai_logged_in');
  localStorage.removeItem('medai_user_email');
  showLoginPage();
  showToast("Logged out successfully", "success");
}

function setBtnState(btn, icon, label, disabled, iconClass, labelText) {
  if (btn) btn.disabled = disabled;
  if (icon) icon.className = iconClass;
  if (label) label.textContent = labelText;
}

// ── Password toggles ────────────────────────────────────────────────────────
function makePwdToggle(toggleId, inputId, iconId) {
  const toggle = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);
  if (!toggle || !input) return;
  toggle.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    if (icon) icon.className = hidden ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
  });
}
makePwdToggle('togglePwd', 'password', 'eyeIcon');
makePwdToggle('toggleRegPwd', 'regPassword', 'regEyeIcon');
makePwdToggle('toggleResetPwd', 'resetPassword', 'resetEyeIcon');

// ── Nav links ──────────────────────────────────────────────────────────────
['backToLoginFromReg', 'backToLoginFromForgot', 'backToLoginFromReset'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', e => { e.preventDefault(); showAuthPanel('loginPanel'); });
});

const forgotLink = document.getElementById('forgotLink');
if (forgotLink) forgotLink.addEventListener('click', e => { e.preventDefault(); showAuthPanel('forgotPanel'); });

const createAccountLink = document.getElementById('createAccountLink');
if (createAccountLink) createAccountLink.addEventListener('click', e => { e.preventDefault(); showAuthPanel('createAccountPanel'); });

// ── Sign In ────────────────────────────────────────────────────────────────
if (loginForm) {
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value;
    const btn = document.getElementById("signInBtn");
    const label = document.getElementById("btnLabel");
    const icon = document.getElementById("btnIcon");

    if (!email) { showToast("Please enter your email address.", "error"); return; }
    if (!password) { showToast("Please enter your password.", "error"); return; }

    setBtnState(btn, icon, label, true, "fa-solid fa-spinner fa-spin", "Signing in...");
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        localStorage.setItem('medai_logged_in', 'true');
        localStorage.setItem('medai_user_email', email.toLowerCase());
        showToast("Login successful!", "success");
        setTimeout(() => { showDashboard(); loginForm.reset(); }, 800);
      } else {
        showToast(data.error || "Login failed.", "error");
      }
    } catch (_) {
      showToast("Could not reach the server.", "error");
    }
    setBtnState(btn, icon, label, false, "fa-solid fa-microchip", "Sign In");
  });
}

// ── Create Account ─────────────────────────────────────────────────────────
const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("regEmail")?.value.trim();
    const password = document.getElementById("regPassword")?.value;
    const confirm = document.getElementById("regConfirm")?.value;
    const btn = document.getElementById("registerBtn");
    const label = document.getElementById("regBtnLabel");
    const icon = document.getElementById("regBtnIcon");

    if (!email) { showToast("Please enter an email address.", "error"); return; }
    if (!password) { showToast("Please enter a password.", "error"); return; }
    if (password !== confirm) { showToast("Passwords do not match.", "error"); return; }

    setBtnState(btn, icon, label, true, "fa-solid fa-spinner fa-spin", "Creating...");
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Account created! Please sign in.", "success");
        registerForm.reset();
        showAuthPanel('loginPanel');
      } else {
        showToast(data.error || "Registration failed.", "error");
      }
    } catch (_) {
      showToast("Could not reach the server.", "error");
    }
    setBtnState(btn, icon, label, false, "fa-solid fa-user-plus", "Create Account");
  });
}

// ── Forgot Password ────────────────────────────────────────────────────────
let _forgotEmail = '';
const forgotForm = document.getElementById("forgotForm");
if (forgotForm) {
  forgotForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("forgotEmail")?.value.trim();
    const btn = document.getElementById("forgotBtn");
    const label = document.getElementById("forgotBtnLabel");
    const icon = document.getElementById("forgotBtnIcon");

    if (!email) { showToast("Please enter your email address.", "error"); return; }

    setBtnState(btn, icon, label, true, "fa-solid fa-spinner fa-spin", "Sending...");
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        _forgotEmail = email;
        forgotForm.reset();
        showToast("Reset code sent — check your inbox.", "success");
        showAuthPanel('resetPanel');
      } else {
        showToast(data.error || "Failed to send reset code.", "error");
      }
    } catch (_) {
      showToast("Could not reach the server.", "error");
    }
    setBtnState(btn, icon, label, false, "fa-solid fa-key", "Send Reset Code");
  });
}

// ── Reset Password ─────────────────────────────────────────────────────────
const resetForm = document.getElementById("resetForm");
if (resetForm) {
  resetForm.addEventListener("submit", async e => {
    e.preventDefault();
    const code = document.getElementById("resetCode")?.value.trim();
    const newPassword = document.getElementById("resetPassword")?.value;
    const btn = document.getElementById("resetBtn");
    const label = document.getElementById("resetBtnLabel");
    const icon = document.getElementById("resetBtnIcon");

    if (!code) { showToast("Please enter the reset code.", "error"); return; }
    if (!newPassword) { showToast("Please enter a new password.", "error"); return; }

    setBtnState(btn, icon, label, true, "fa-solid fa-spinner fa-spin", "Resetting...");
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: _forgotEmail, code, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Password reset successfully! Please sign in.", "success");
        resetForm.reset();
        _forgotEmail = '';
        showAuthPanel('loginPanel');
      } else {
        showToast(data.error || "Reset failed.", "error");
      }
    } catch (_) {
      showToast("Could not reach the server.", "error");
    }
    setBtnState(btn, icon, label, false, "fa-solid fa-lock", "Set New Password");
  });
}

// Logout functionality
if (logoutBtn) {
  logoutBtn.addEventListener("click", logout);
}

const form = document.getElementById("predictionForm");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const manualOverride = document.getElementById("manualOverride");
const organOverride = document.getElementById("organOverride");
const organOverrideRow = document.getElementById("organOverrideRow");
const overrideHint = document.getElementById("overrideHint");
const overrideSection = document.getElementById("overrideSection");
const submitButton = document.getElementById("submitButton");
const reportButton = document.getElementById("reportButton");
const reportStatus = document.getElementById("reportStatus");
const requestState = document.getElementById("requestState");
const modelStatus = document.getElementById("modelStatus");
const finalDecisionPanel = document.getElementById("finalDecisionPanel");
const warningList = document.getElementById("warningList");
const modalityCard = document.getElementById("modalityCard");
const tissueCard = document.getElementById("tissueCard");
const normalityCard = document.getElementById("normalityCard");
const subtypeCard = document.getElementById("subtypeCard");
const gradcamPanel = document.getElementById("gradcamPanel");
const organChart = document.getElementById("organChart");
const subtypeChart = document.getElementById("subtypeChart");
const jsonOutput = document.getElementById("jsonOutput");

let latestResult = null;
let latestFilename = null;
let latestModelStatus = null;

// UI Enhancement References
const dragDropZone = document.getElementById('dragDropZone');
const uploadProgressWrapper = document.getElementById('uploadProgressWrapper');
const uploadProgressBar = document.getElementById('uploadProgressBar');
const uploadFileName = document.getElementById('uploadFileName');
const uploadPercentage = document.getElementById('uploadPercentage');
const themeToggle = document.getElementById('themeToggle');
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
const sidebar = document.getElementById('sidebar');
const toastContainer = document.getElementById('toastContainer');

// ── Toast Notifications ────────────────────────────────────────────────────
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.log(`[Toast] ${type}: ${message}`);
    return;
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success'
    ? '<i class="fa-solid fa-circle-check"></i>'
    : '<i class="fa-solid fa-circle-exclamation"></i>';
  toast.innerHTML = `<div class="toast-content">${icon}<span style="margin-left:10px;">${escapeHtml(message)}</span></div>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s forwards';
    setTimeout(() => toast.remove(), 320);
  }, 4000);
}

// ── Theme & Sidebar ────────────────────────────────────────────────────────
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const themeText = document.getElementById('themeToggleText');
    const icon = themeToggle.querySelector('i');
    if (document.body.classList.contains('light-theme')) {
      if (themeText) themeText.textContent = 'Dark Mode';
      if (icon) icon.className = 'fa-solid fa-moon';
    } else {
      if (themeText) themeText.textContent = 'Light Mode';
      if (icon) icon.className = 'fa-solid fa-sun';
    }
  });
}
if (menuToggle && sidebar) {
  menuToggle.addEventListener('click', () => sidebar.classList.add('mobile-open'));
}
if (closeSidebar && sidebar) {
  closeSidebar.addEventListener('click', () => sidebar.classList.remove('mobile-open'));
}
document.addEventListener('click', (e) => {
  if (sidebar && sidebar.classList.contains('mobile-open') && !sidebar.contains(e.target) && e.target !== menuToggle && !menuToggle?.contains(e.target)) {
    sidebar.classList.remove('mobile-open');
  }
});

// ── Manual Override Toggle ──────────────────────────────────────────────────
if (manualOverride && organOverrideRow) {
  manualOverride.addEventListener('change', () => {
    const checked = manualOverride.checked;
    organOverrideRow.style.display = checked ? 'block' : 'none';
    if (!checked && organOverride) organOverride.value = '';
    if (overrideHint) overrideHint.style.display = 'none';
    if (overrideSection) overrideSection.style.borderColor = '';
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────
function setRequestState(label, className = "") {
  if (!requestState) return;
  requestState.textContent = label;
  requestState.className = `badge ${className}`.trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatConfidence(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "N/A";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function toneClass(color, status) {
  const c = String(color || "").toLowerCase();
  if (c) return `tone-${c}`;
  const s = String(status || "").toLowerCase();
  if (s.includes("reject") || s.includes("low")) return "tone-red";
  if (s.includes("normal") || s.includes("high")) return "tone-green";
  if (s.includes("close") || s.includes("abnormal") || s.includes("pending") || s.includes("not_evaluated")) return "tone-blue";
  return "tone-yellow";
}

function resetResults() {
  latestResult = null;
  latestFilename = null;
  if (reportButton) reportButton.disabled = true;
  if (reportStatus) reportStatus.innerHTML = '<i class="fa-solid fa-circle-info"></i> Reports are saved to your Documents folder.';
  if (jsonOutput) jsonOutput.textContent = "{}";
  if (finalDecisionPanel) {
    finalDecisionPanel.className = "decision-banner empty-state glass-inner";
    finalDecisionPanel.innerHTML = '<div class="empty-icon"><i class="fa-solid fa-box-open"></i></div><h3>No Results Yet</h3><p>Upload an image to see modality validation, tissue routing, normality, subtype analysis, and explanations.</p>';
  }
  if (warningList) warningList.innerHTML = "";
  [modalityCard, tissueCard, normalityCard, subtypeCard].forEach((card, index) => {
    if (!card) return;
    const titles = ["Step 0: Modality", "Level 1: Tissue", "Level 2: Normality", "Level 3: Subtype"];
    card.className = "mini-card glass-inner empty";
    card.innerHTML = `<h3>${titles[index]}</h3><p>No result available for this stage.</p>`;
  });
  renderGradcam(null);
  renderChart(organChart, null, "Organ Probability Graph");
  renderChart(subtypeChart, null, "Subtype Probability Graph");
  if (overrideHint) overrideHint.style.display = 'none';
  if (overrideSection) overrideSection.style.outline = '';
}

function renderWarnings(warnings) {
  if (!warningList) return;
  if (!warnings || warnings.length === 0) { warningList.innerHTML = ""; return; }
  warningList.innerHTML = `
    <div class="warning-list">
      ${warnings.map(w => `<div class="warning-item">${escapeHtml(w)}</div>`).join("")}
    </div>`;
}

function populateOrganOverride(options) {
  if (!organOverride) return;
  const currentValue = organOverride.value;
  organOverride.innerHTML = '<option value="">No override</option>';
  (options || []).forEach(option => {
    const el = document.createElement("option");
    el.value = option.label;
    el.textContent = option.label;
    organOverride.appendChild(el);
  });
  organOverride.value = currentValue;
}

function renderModelStatus(payload) {
  if (!modelStatus) return;
  const status = payload.model_status;
  latestModelStatus = status;
  populateOrganOverride(status.organ_options || []);
  const organReady = Boolean(status.organ_ready);
  const subtypeReady = Boolean(status.subtype_ready);
  const organState = organReady ? "Ready" : status.organ_error ? "Load failed" : "Waiting";
  const subtypeState = subtypeReady ? "Ready" : status.subtype_error ? "Load failed" : status.subtype_checkpoint_exists ? "Waiting to load" : "Waiting";
  modelStatus.innerHTML = `
    <h2><i class="fa-solid fa-server"></i> Platform Status</h2>
    <div class="metric"><span>Device</span><strong><i class="fa-solid fa-microchip"></i> ${escapeHtml(status.device)}</strong></div>
    <div class="metric"><span>Organ Model</span><span class="status-pill ${organReady ? toneClass("GREEN") : toneClass("RED")}">${escapeHtml(organState)}</span></div>
    <div class="metric"><span>Subtype Model</span><span class="status-pill ${subtypeReady ? toneClass("GREEN") : status.subtype_error ? toneClass("RED") : toneClass("BLUE")}">${escapeHtml(subtypeState)}</span></div>
    <div class="metric"><span>Classes Total</span><strong>${escapeHtml(Number(status.organ_class_count || 0) + Number(status.subtype_class_count || 0))}</strong></div>
    ${status.organ_error ? `<p class="helper-text report-status" style="color:var(--danger)">${escapeHtml(status.organ_error)}</p>` : ""}
    ${status.subtype_error ? `<p class="helper-text report-status" style="color:var(--danger)">${escapeHtml(status.subtype_error)}</p>` : ""}
  `;
}

async function fetchHealth() {
  try {
    const response = await fetch("/api/health", { timeout: 3000 });
    const payload = await response.json();
    renderModelStatus(payload);
  } catch (error) {
    console.log("Backend server not available, using demo mode");
    if (modelStatus) {
      // Show demo/offline mode message
      modelStatus.innerHTML = `
        <h2><i class="fa-solid fa-server"></i> Platform Status</h2>
        <div class="metric"><span>Status</span><span class="status-pill tone-blue"><i class="fa-solid fa-wifi"></i> Demo Mode</span></div>
        <p style="color:var(--warning); margin-top: 10px; font-size: 0.9rem;"><i class="fa-solid fa-info-circle"></i> Running in offline demo mode. Backend server not detected. Test the UI with sample data.</p>
        <div class="metric" style="margin-top: 15px;"><span>Device</span><strong>Local (Demo)</strong></div>`;
    }
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    if (uploadProgressWrapper) {
      uploadProgressWrapper.style.display = 'block';
      if (uploadFileName) uploadFileName.textContent = file.name;
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) { progress = 100; clearInterval(interval); }
        if (uploadPercentage) uploadPercentage.textContent = Math.floor(progress) + '%';
        if (uploadProgressBar) uploadProgressBar.style.width = progress + '%';
        if (progress === 100) setTimeout(() => { if (uploadProgressWrapper) uploadProgressWrapper.style.display = 'none'; }, 500);
      }, 100);
    }
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function stageMetric(label, value) {
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${value}</strong></div>`;
}

function renderStageCard(container, title, stage, formatter) {
  if (!container) return;
  if (!stage) {
    container.className = "mini-card glass-inner empty";
    container.innerHTML = `<h3>${escapeHtml(title)}</h3><p>No result available for this stage.</p>`;
    return;
  }
  const tone = toneClass(stage.color, stage.status);
  container.className = `mini-card glass-inner ${tone}`;
  container.innerHTML = `
    <h3>${escapeHtml(title)}</h3>
    <div class="status-line">
      <span class="status-pill ${tone}"><i class="fa-solid fa-circle-notch"></i> ${escapeHtml(stage.status || "N/A")}</span>
      <span class="stage-color ${tone}">${escapeHtml(stage.color || "")}</span>
    </div>
    ${formatter(stage)}`;
}

function renderDecisionBanner(result) {
  if (!finalDecisionPanel) return;
  const tone = toneClass(result.level3?.color || result.level2?.color || result.level1?.color || result.step0?.color, result.status);
  const isNotOrganImage = result.modality?.rejection_code === "not_organ_image" || result.final_decision === "Not an organ image";
  finalDecisionPanel.className = `decision-banner glass-inner ${tone}`;
  finalDecisionPanel.innerHTML = `
    <div class="decision-kicker"><i class="fa-solid fa-flag-checkered"></i> ${escapeHtml(isNotOrganImage ? "Rejected Input" : "Final Decision")}</div>
    <div class="decision-title">${escapeHtml(result.final_decision || "No decision")}</div>
    <div class="decision-meta">
      <span class="status-pill ${tone}">${escapeHtml(result.status || "N/A")}</span>
      ${isNotOrganImage ? `<span class="status-pill ${tone}">${escapeHtml("Not an organ image")}</span>` : ""}
      <span class="status-pill badge-outline"><i class="fa-solid ${result.override_used ? 'fa-user-pen' : 'fa-robot'}"></i> ${escapeHtml(result.override_used ? "Override used" : "No override used")}</span>
    </div>
    <p>${escapeHtml(result.reason || "Decision-support output generated successfully.")}</p>`;
}

function renderChart(container, chart, fallbackTitle = "Probability Graph") {
  if (!container) return;
  if (!chart || !chart.items || chart.items.length === 0) {
    container.className = "chart-card glass-inner empty";
    container.innerHTML = `<h3>${escapeHtml(fallbackTitle)}</h3><p>No chart data available.</p>`;
    return;
  }
  container.className = "chart-card glass-inner";
  container.innerHTML = `
    <h3>${escapeHtml(chart.title || fallbackTitle)}</h3>
    <div class="chart-list">
      ${chart.items.map(item => `
        <div class="chart-row ${item.highlight ? "top-hit" : ""}">
          <div class="chart-row-header">
            <span class="chart-label">${escapeHtml(item.label)}</span>
            <span class="chart-value">${formatConfidence(item.confidence)}</span>
          </div>
          <div class="chart-track">
            <div class="chart-fill" style="width:${Math.max(Number(item.confidence) * 100, 1)}%"></div>
          </div>
        </div>`).join("")}
    </div>`;
}

function renderGradcam(gradcam) {
  if (!gradcamPanel) return;
  const organCam = gradcam?.organ;
  const subtypeCam = gradcam?.subtype;
  const items = [organCam, subtypeCam].filter(Boolean);
  if (items.length === 0) {
    gradcamPanel.className = "chart-card gradcam-card glass-inner empty";
    gradcamPanel.innerHTML = `<h3>Grad-CAM Review</h3><p>No Grad-CAM visual available for this prediction.</p>`;
    return;
  }
  gradcamPanel.className = "chart-card gradcam-card glass-inner";
  gradcamPanel.innerHTML = `
    <div class="gradcam-header">
      <h3><i class="fa-solid fa-layer-group"></i> Grad-CAM Review</h3>
      <p>Model attention heatmaps for organ routing and final outcome.</p>
    </div>
    <div class="gradcam-grid">
      ${items.map(item => `
        <article class="gradcam-item">
          <div class="gradcam-meta">
            <h4>${escapeHtml(item.title || "Grad-CAM")}</h4>
            <p>${escapeHtml(item.label || "Model attention map")}</p>
          </div>
          <div class="gradcam-image-wrap">
            <img class="gradcam-image"
              src="data:${escapeHtml(item.mime_type || "image/png")};base64,${item.image_base64}"
              alt="${escapeHtml(item.title || "Grad-CAM visualization")}">
          </div>
        </article>`).join("")}
    </div>`;
}

function renderResult(result) {
  latestResult = result;
  if (reportButton) reportButton.disabled = false;
  if (jsonOutput) jsonOutput.textContent = JSON.stringify(result, null, 2);
  renderDecisionBanner(result);
  renderWarnings(result.warnings || []);
  renderGradcam(result.gradcam);

  renderStageCard(modalityCard, "Step 0: Modality", result.modality, stage => `
    ${stageMetric("Type", escapeHtml(stage.type || "N/A"))}
    ${stageMetric("Confidence", formatConfidence(stage.confidence))}
    ${stageMetric("Gap", formatConfidence(stage.confidence_gap))}
    ${stageMetric("Reason", escapeHtml(stage.reason || "None"))}`);

  renderStageCard(tissueCard, "Level 1: Tissue", result.organ_prediction, stage => `
    ${stageMetric("Label", escapeHtml(stage.selected_label || stage.label || "N/A"))}
    ${stageMetric("Confidence", formatConfidence(stage.selected_confidence ?? stage.confidence))}
    ${stageMetric("Gap", formatConfidence(stage.confidence_gap))}
    ${stageMetric("Top 2", escapeHtml(`${stage.top2_label || "N/A"} (${formatConfidence(stage.top2_confidence)})`))}` );

  renderStageCard(normalityCard, "Level 2: Normality", result.normality, stage => `
    ${stageMetric("Outcome", escapeHtml(stage.label || stage.status || "N/A"))}
    ${stageMetric("Confidence", formatConfidence(stage.confidence))}
    ${stageMetric("Normal Label", escapeHtml(stage.normal_label || "N/A"))}
    ${stageMetric("Entropy", escapeHtml(stage.entropy ?? "N/A"))}`);

  renderStageCard(subtypeCard, "Level 3: Subtype", result.subtype_prediction, stage => `
    ${stageMetric("Label", escapeHtml(stage.interpreted_label || stage.label || "N/A"))}
    ${stageMetric("Confidence", formatConfidence(stage.confidence))}
    ${stageMetric("Gap", formatConfidence(stage.confidence_gap))}
    ${stageMetric("Alternatives", escapeHtml((stage.alternatives || []).join(", ") || "None"))}`);

  renderChart(organChart, result.charts?.organ, "Organ Probability Graph");
  renderChart(subtypeChart, result.charts?.subtype, "Subtype Probability Graph");

  if (result.model_status) renderModelStatus({ model_status: result.model_status });

  const level1 = result.organ_prediction || result.level1;
  const level1OverrideNeeded = !!(level1?.manual_override_required && !level1?.override_used);
  const step0OverrideNeeded = !!(
    result.final_decision === 'Manual review required before tissue analysis.' &&
    !result.override_used &&
    !level1OverrideNeeded
  );
  const overrideNeeded = level1OverrideNeeded || step0OverrideNeeded;
  if (overrideSection) {
    overrideSection.style.outline = overrideNeeded ? '2px solid var(--warning, #f59e0b)' : '';
    overrideSection.style.borderRadius = overrideNeeded ? '8px' : '';
  }
  if (overrideHint) {
    if (overrideNeeded) {
      const modalityStatus = result.modality?.status || '';
      const isRejected = modalityStatus === 'REJECTED';
      overrideHint.innerHTML = step0OverrideNeeded
        ? `<strong>Override needed:</strong> ${isRejected
            ? 'The modality check rejected this image (low confidence it is histopathology). If you know this is a valid slide, tick the checkbox and re-run.'
            : 'The modality check is uncertain. Tick the checkbox and re-run to proceed past this step.'}`
        : '<strong>Override needed:</strong> The model is uncertain at Level 1. Select an organ above and re-run the pipeline.';
      overrideHint.style.display = 'block';
    } else {
      overrideHint.style.display = 'none';
    }
  }
  if (overrideNeeded) {
    if (manualOverride) manualOverride.checked = true;
    if (organOverrideRow) organOverrideRow.style.display = 'block';
    if (overrideSection) overrideSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// ── Drag & Drop ────────────────────────────────────────────────────────────
if (dragDropZone) {
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => {
    dragDropZone.addEventListener(e, ev => { ev.preventDefault(); ev.stopPropagation(); }, false);
  });
  ['dragenter', 'dragover'].forEach(e => dragDropZone.addEventListener(e, () => dragDropZone.classList.add('dragover'), false));
  ['dragleave', 'drop'].forEach(e => dragDropZone.addEventListener(e, () => dragDropZone.classList.remove('dragover'), false));
  dragDropZone.addEventListener('drop', e => {
    const files = e.dataTransfer.files;
    if (files.length > 0 && imageInput) {
      imageInput.files = files;
      imageInput.dispatchEvent(new Event('change'));
    }
  }, false);
}

// ── Image Preview ──────────────────────────────────────────────────────────
if (imageInput) {
  imageInput.addEventListener("change", event => {
    const [file] = event.target.files;
    latestFilename = file ? file.name : null;
    if (!file) {
      if (imagePreview) { imagePreview.style.display = "none"; imagePreview.removeAttribute("src"); }
      if (previewPlaceholder) previewPlaceholder.style.display = "flex";
      resetResults();
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    if (imagePreview) { imagePreview.src = previewUrl; imagePreview.style.display = "block"; }
    if (previewPlaceholder) previewPlaceholder.style.display = "none";
  });
}

// ── Prediction Form ────────────────────────────────────────────────────────
if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const [file] = imageInput.files;
    if (!file) {
      setRequestState("Select image", "tone-red");
      showToast("Please select an image first", "error");
      return;
    }
    latestFilename = file.name;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    if (reportButton) reportButton.disabled = true;
    if (reportStatus) reportStatus.innerHTML = '<i class="fa-solid fa-circle-info"></i> Reports are saved to your Documents folder.';
    setRequestState("Running", "tone-blue");
    if (finalDecisionPanel) {
      finalDecisionPanel.className = "decision-banner glass-inner tone-blue";
      finalDecisionPanel.innerHTML = `
        <div class="decision-kicker"><i class="fa-solid fa-gears"></i> Pipeline Running</div>
        <div class="decision-title">Analyzing uploaded image</div>
        <div class="progress-bar-bg" style="margin-top:20px;"><div class="progress-bar-fill" style="width:100%;animation:pulse 1.5s infinite"></div></div>
        <p style="margin-top:20px;">Step 0 validation, tissue routing, normality screening, and subtype analysis are running now.</p>`;
    }
    try {
      const imageData = await readFileAsDataUrl(file);
      showToast("Scan uploaded, starting analysis...", "success");
      
      let payload;
      try {
        const response = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            image_data: imageData,
            manual_override: manualOverride ? manualOverride.checked : false,
            organ_override: organOverride ? organOverride.value || null : null,
          }),
          timeout: 5000
        });
        payload = await response.json();
        if (!response.ok || !payload.ok) throw new Error(payload.error || "Prediction failed");
      } catch (apiError) {
        // Use mock data if backend unavailable
        console.log("Backend unavailable, using mock prediction data");
        payload = {
          ok: true,
          result: {
            final_decision: "Analysis Complete (Demo Mode)",
            status: "normal",
            reason: "Demo data: Connect backend server for real analysis.",
            override_used: manualOverride ? manualOverride.checked : false,
            modality: { type: "X-Ray", confidence: 0.95, color: "GREEN", reason: "High confidence detection", confidence_gap: 0.08 },
            organ_prediction: { label: "Chest", selected_label: organOverride && organOverride.value ? organOverride.value : "Chest", confidence: 0.89, selected_confidence: 0.89, confidence_gap: 0.12, top2_label: "Abdomen", top2_confidence: 0.08 },
            normality: { label: "Normal", status: "normal", confidence: 0.92, normal_label: "Normal", entropy: 0.15 },
            subtype_prediction: { label: "Clear", interpreted_label: "Clear Scan", confidence: 0.88, confidence_gap: 0.10, alternatives: ["Slight Opacity", "Moderate Opacity"] },
            charts: {
              organ: { title: "Organ Classification", items: [{ label: "Chest", confidence: 0.89, highlight: true }, { label: "Abdomen", confidence: 0.08 }, { label: "Other", confidence: 0.03 }] },
              subtype: { title: "Subtype Classification", items: [{ label: "Clear Scan", confidence: 0.88, highlight: true }, { label: "Slight Opacity", confidence: 0.10 }, { label: "Moderate Opacity", confidence: 0.02 }] }
            },
            warnings: ["Demo mode: Using sample data", "Connect backend server for actual medical analysis"],
            input: { source: file.name }
          }
        };
      }
      renderResult(payload.result);
      saveHistoryEntry(payload.result, file.name, imageData);
      autoReportPromise = autoGenerateReport(payload.result, file.name);
      setRequestState("Complete", "tone-green");
      showToast("Analysis complete!", "success");
    } catch (error) {
      resetResults();
      if (finalDecisionPanel) {
        finalDecisionPanel.className = "decision-banner glass-inner tone-red";
        finalDecisionPanel.innerHTML = `<div class="decision-title"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(error.message)}</div>`;
      }
      setRequestState("Error", "tone-red");
      showToast("Error during analysis", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = '<i class="fa-solid fa-microchip"></i> Run Intelligent Pipeline';
    }
  });
}

// ── Report Blob Cache ──────────────────────────────────────────────────────
const reportBlobCache = new Map(); // historyEntryId → { blob, dlName }
let latestHistoryEntryId = null;
let autoReportPromise = null;

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function autoGenerateReport(result, filename) {
  const entryId = latestHistoryEntryId;
  if (!entryId) return;
  try {
    const [file] = imageInput ? imageInput.files : [null];
    const imageData = file ? await readFileAsDataUrl(file) : null;
    const resp = await fetch('/api/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, result, image_data: imageData }),
    });
    if (!resp.ok) return;
    const blob = await resp.blob();
    const disposition = resp.headers.get('Content-Disposition') || '';
    const nameMatch = disposition.match(/filename="?([^";\n]+)"?/i);
    const dlName = nameMatch ? nameMatch[1] : `${(filename.replace(/\.[^.]+$/, '') || 'report')}_report.pdf`;
    reportBlobCache.set(entryId, { blob, dlName });
  } catch (_) {}
}

// ── Report Button ──────────────────────────────────────────────────────────
if (reportButton) {
  reportButton.addEventListener("click", async () => {
    if (!latestResult) return;

    // Fast path: blob already cached from auto-generation
    if (latestHistoryEntryId && reportBlobCache.has(latestHistoryEntryId)) {
      const { blob, dlName } = reportBlobCache.get(latestHistoryEntryId);
      triggerDownload(blob, dlName);
      if (reportStatus) reportStatus.innerHTML = '<i class="fa-solid fa-check" style="color:var(--success)"></i> Report downloaded successfully.';
      showToast("Report downloaded!", "success");
      return;
    }

    reportButton.disabled = true;
    reportButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparing...';
    if (reportStatus) reportStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating report...';

    try {
      // Wait for in-flight auto-generation if still running
      if (autoReportPromise) {
        await autoReportPromise;
        if (latestHistoryEntryId && reportBlobCache.has(latestHistoryEntryId)) {
          const { blob, dlName } = reportBlobCache.get(latestHistoryEntryId);
          triggerDownload(blob, dlName);
          if (reportStatus) reportStatus.innerHTML = '<i class="fa-solid fa-check" style="color:var(--success)"></i> Report downloaded successfully.';
          showToast("Report downloaded!", "success");
          return;
        }
      }

      // Fallback: generate fresh
      const [file] = imageInput ? imageInput.files : [null];
      const imageData = file ? await readFileAsDataUrl(file) : null;
      const filename = latestFilename || latestResult.input?.source || "upload";
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, result: latestResult, image_data: imageData }),
      });
      if (!response.ok) {
        let errMsg = "Report generation failed.";
        try { const j = await response.json(); errMsg = j.error || errMsg; } catch (_) {}
        throw new Error(errMsg);
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") || "";
      const nameMatch = disposition.match(/filename="?([^";\n]+)"?/i);
      const downloadFilename = nameMatch ? nameMatch[1] : `${(filename.replace(/\.[^.]+$/, "") || "report")}_report.pdf`;
      triggerDownload(blob, downloadFilename);
      if (reportStatus) reportStatus.innerHTML = '<i class="fa-solid fa-check" style="color:var(--success)"></i> Report downloaded successfully.';
      showToast("Report downloaded!", "success");
    } catch (error) {
      if (reportStatus) reportStatus.innerHTML = `<i class="fa-solid fa-xmark" style="color:var(--danger)"></i> ${error.message}`;
      showToast("Failed to export report", "error");
    } finally {
      reportButton.disabled = false;
      reportButton.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Export Report';
    }
  });
}

// ── Test Data Browser ──────────────────────────────────────────────────────
(function () {
  const toggle = document.getElementById('testBrowserToggle');
  const panel = document.getElementById('testBrowserPanel');
  const organsEl = document.getElementById('testBrowserOrgans');
  const subtypesEl = document.getElementById('testBrowserSubtypes');
  if (!toggle || !panel) return;

  let testData = null;
  let selectedOrgan = null;
  let selectedThumb = null;
  let loaded = false;

  function formatLabel(raw) {
    return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function renderSubtypes(organ) {
    selectedOrgan = organ;
    if (!testData || !testData.organs[organ]) return;
    const subtypes = testData.organs[organ].subtypes;
    subtypesEl.innerHTML = '';
    for (const [sub, files] of Object.entries(subtypes)) {
      const group = document.createElement('div');
      group.className = 'test-subtype-group';
      const label = document.createElement('div');
      label.className = 'test-subtype-label';
      label.textContent = formatLabel(sub);
      group.appendChild(label);
      const grid = document.createElement('div');
      grid.className = 'test-thumb-grid';
      for (const filename of files) {
        const relPath = encodeURIComponent(`${organ}/${sub}/${filename}`);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'test-thumb';
        btn.title = filename;
        btn.dataset.path = `${organ}/${sub}/${filename}`;
        const img = document.createElement('img');
        img.src = `/api/test-image?path=${relPath}`;
        img.loading = 'lazy';
        img.alt = filename;
        const lbl = document.createElement('span');
        lbl.className = 'thumb-label';
        lbl.textContent = filename;
        btn.appendChild(img);
        btn.appendChild(lbl);
        btn.addEventListener('click', () => selectTestImage(btn));
        grid.appendChild(btn);
      }
      group.appendChild(grid);
      subtypesEl.appendChild(group);
    }
  }

  function renderOrgans() {
    organsEl.innerHTML = '';
    const organs = Object.keys(testData.organs);
    organs.forEach((organ, i) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'test-organ-tab' + (i === 0 ? ' active' : '');
      btn.textContent = organ;
      btn.addEventListener('click', () => {
        organsEl.querySelectorAll('.test-organ-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderSubtypes(organ);
      });
      organsEl.appendChild(btn);
    });
    if (organs.length) renderSubtypes(organs[0]);
  }

  async function loadTestData() {
    if (loaded) return;
    loaded = true;
    organsEl.innerHTML = '<span style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">Loading...</span>';
    try {
      const r = await fetch('/api/test-images');
      const data = await r.json();
      if (data.ok) {
        testData = data;
        renderOrgans();
      } else {
        organsEl.innerHTML = '<span style="color:var(--danger);font-size:0.85rem;">Failed to load test data.</span>';
      }
    } catch (_) {
      loaded = false;
      organsEl.innerHTML = '<span style="color:var(--danger);font-size:0.85rem;">Could not connect to server.</span>';
    }
  }

  async function selectTestImage(btn) {
    const path = btn.dataset.path;
    if (!path || !imageInput) return;
    if (selectedThumb) selectedThumb.classList.remove('selected');
    btn.classList.add('selected');
    selectedThumb = btn;
    try {
      const r = await fetch(`/api/test-image?path=${encodeURIComponent(path)}`);
      const blob = await r.blob();
      const filename = path.split('/').pop();
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      const dt = new DataTransfer();
      dt.items.add(file);
      imageInput.files = dt.files;
      imageInput.dispatchEvent(new Event('change'));
      resetResults();
    } catch (_) {
      showToast('Could not load test image', 'error');
    }
  }

  toggle.addEventListener('click', () => {
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : '';
    toggle.classList.toggle('open', !open);
    if (!open) loadTestData();
  });
})();

// ── Nav Tab Switching ──────────────────────────────────────────────────────
const navDashboard = document.getElementById('navDashboard');
const navAccuracy = document.getElementById('navAccuracy');
const navHelp = document.getElementById('navHelp');
const navSettings = document.getElementById('navSettings');
const dashboardContent = document.getElementById('dashboardContent');
const accuracyPanel = document.getElementById('accuracyPanel');
const helpPanel = document.getElementById('helpPanel');
const settingsPanel = document.getElementById('settingsPanel');
const historyPanel = document.getElementById('historyPanel');
const mainHeading = document.querySelector('.header h1');

const TAB_TITLES = { dashboard: 'Medical Scan Analysis', accuracy: 'Model Accuracy', help: 'Help', settings: 'Settings', history: 'My History' };

function showTab(tab) {
  const panels = { dashboard: dashboardContent, accuracy: accuracyPanel, help: helpPanel, settings: settingsPanel, history: historyPanel };
  const navs = { dashboard: navDashboard, accuracy: navAccuracy, help: navHelp, settings: navSettings };
  Object.entries(panels).forEach(([key, el]) => { if (el) el.style.display = key === tab ? '' : 'none'; });
  Object.entries(navs).forEach(([key, el]) => { if (el) el.classList.toggle('active', key === tab); });
  if (mainHeading) mainHeading.textContent = TAB_TITLES[tab] || 'Medical Scan Analysis';
  if (tab !== 'dashboard' && sidebar) sidebar.classList.remove('mobile-open');
  if (tab === 'history') renderHistoryPanel();
}

if (navDashboard) navDashboard.addEventListener('click', e => { e.preventDefault(); showTab('dashboard'); });
if (navAccuracy) navAccuracy.addEventListener('click', e => { e.preventDefault(); showTab('accuracy'); });
if (navHelp) navHelp.addEventListener('click', e => { e.preventDefault(); showTab('help'); });
if (navSettings) navSettings.addEventListener('click', e => { e.preventDefault(); showTab('settings'); });

// ── Model Accuracy Evaluation ──────────────────────────────────────────────
const runEvalBtn = document.getElementById('runEvalBtn');
const evalOrganSelect = document.getElementById('evalOrganSelect');
const evalStatusBadge = document.getElementById('evalStatusBadge');
const evalProgressSection = document.getElementById('evalProgressSection');
const evalLog = document.getElementById('evalLog');
const evalResultsSection = document.getElementById('evalResultsSection');
const evalMetricCards = document.getElementById('evalMetricCards');
const evalPerClassSection = document.getElementById('evalPerClassSection');
const evalErrorSection = document.getElementById('evalErrorSection');
const evalErrorMsg = document.getElementById('evalErrorMsg');

let evalPollTimer = null;

function setEvalBadge(status) {
  if (!evalStatusBadge) return;
  const map = { idle: ['Idle', ''], running: ['Running', 'tone-blue'], done: ['Complete', 'tone-green'], error: ['Error', 'tone-red'] };
  const [label, cls] = map[status] || ['Unknown', ''];
  evalStatusBadge.textContent = label;
  evalStatusBadge.className = `status-pill ${cls}`.trim();
}

function renderEvalPerClassTable(title, perClass) {
  if (!perClass || !Object.keys(perClass).length) return '';
  const rows = Object.entries(perClass).map(([label, v]) => `
    <tr>
      <td style="padding:6px 10px;">${escapeHtml(label)}</td>
      <td style="padding:6px 10px; text-align:center;">${v.correct}/${v.total}</td>
      <td style="padding:6px 10px; text-align:center;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="flex:1; height:8px; border-radius:4px; background:rgba(255,255,255,0.1); overflow:hidden;">
            <div style="height:100%; width:${v.accuracy_pct}%; background:${v.accuracy_pct >= 90 ? 'var(--success)' : v.accuracy_pct >= 70 ? 'var(--warning)' : 'var(--danger)'}; border-radius:4px; transition:width 0.6s;"></div>
          </div>
          <span style="min-width:46px; font-size:0.85rem;">${v.accuracy_pct}%</span>
        </div>
      </td>
    </tr>`).join('');
  return `
    <section class="glass-inner" style="padding:20px; margin-top:16px;">
      <h3 style="margin-bottom:14px;">${escapeHtml(title)}</h3>
      <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
        <thead><tr style="color:var(--text-muted); font-size:0.8rem; text-transform:uppercase;">
          <th style="padding:6px 10px; text-align:left;">Class</th>
          <th style="padding:6px 10px; text-align:center;">Correct / Total</th>
          <th style="padding:6px 10px; text-align:center;">Accuracy</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function renderEvalResults(metrics, organFilter) {
  if (!metrics || !evalMetricCards) return;

  const scopeLabel = organFilter ? organFilter : 'All Organs';
  const scopeHtml = `<p style="color:var(--text-muted); font-size:0.85rem; margin:-4px 0 12px;">
    <i class="fa-solid fa-filter" style="margin-right:6px;"></i>Scope: <strong style="color:var(--text-primary);">${escapeHtml(scopeLabel)}</strong>
    &bull; ${metrics.total_images ?? '?'} images evaluated
  </p>`;
  if (evalMetricCards) {
    const heading = evalMetricCards.previousElementSibling;
    let scopeEl = document.getElementById('evalScopeLabel');
    if (!scopeEl) {
      scopeEl = document.createElement('div');
      scopeEl.id = 'evalScopeLabel';
      evalResultsSection && evalResultsSection.insertBefore(scopeEl, evalResultsSection.firstChild);
    }
    scopeEl.innerHTML = scopeHtml;
  }

  const levels = [
    { key: 'organ', label: 'Level 1 — Organ', icon: 'fa-magnifying-glass', desc: 'Tissue / organ routing' },
    { key: 'normality', label: 'Level 2 — Normality', icon: 'fa-circle-half-stroke', desc: 'Normal vs Abnormal' },
    { key: 'subtype', label: 'Level 3 — Subtype', icon: 'fa-dna', desc: 'Cancer subtype (abnormal images only)' },
  ];

  evalMetricCards.innerHTML = levels.map(({ key, label, icon, desc }) => {
    const m = metrics[key] || {};
    const pct = m.accuracy_pct ?? 0;
    const color = pct >= 90 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)';
    return `
      <div class="mini-card glass-inner" style="text-align:center; padding:24px;">
        <div style="font-size:2rem; color:${color}; margin-bottom:8px;"><i class="fa-solid ${icon}"></i></div>
        <h3 style="font-size:0.9rem; color:var(--text-muted); margin-bottom:4px;">${escapeHtml(label)}</h3>
        <div style="font-size:2.4rem; font-weight:700; color:${color}; line-height:1;">${pct}%</div>
        <p style="color:var(--text-muted); font-size:0.8rem; margin-top:6px;">${m.correct ?? '?'}/${m.evaluated ?? '?'} &bull; ${escapeHtml(desc)}</p>
      </div>`;
  }).join('');

  if (evalPerClassSection) {
    evalPerClassSection.innerHTML =
      renderEvalPerClassTable('Organ / Tissue — Per Class', metrics.organ?.per_class) +
      renderEvalPerClassTable('Normality — Per Class', metrics.normality?.per_class) +
      renderEvalPerClassTable('Subtype — Per Class (Abnormal Images)', metrics.subtype?.per_class);
  }

  if (evalResultsSection) evalResultsSection.style.display = '';
}

function applyEvalState(data) {
  const { status, metrics, error, log, organ_filter } = data;
  if (organ_filter !== undefined && evalOrganSelect && !evalOrganSelect.disabled) {
    evalOrganSelect.value = organ_filter || '';
  }
  setEvalBadge(status);

  if (log && evalLog) evalLog.textContent = log.join('\n');

  const uploadBtn = document.getElementById('uploadEvalBtn');
  if (status === 'running') {
    if (evalProgressSection) evalProgressSection.style.display = '';
    if (evalResultsSection) evalResultsSection.style.display = 'none';
    if (evalErrorSection) evalErrorSection.style.display = 'none';
    if (evalOrganSelect) evalOrganSelect.disabled = true;
    if (runEvalBtn) { runEvalBtn.disabled = true; runEvalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...'; }
    if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.style.opacity = '0.5'; }
    if (evalLog) evalLog.scrollTop = evalLog.scrollHeight;
  } else if (status === 'done') {
    if (evalProgressSection) evalProgressSection.style.display = 'none';
    if (evalErrorSection) evalErrorSection.style.display = 'none';
    if (evalOrganSelect) evalOrganSelect.disabled = false;
    if (runEvalBtn) { runEvalBtn.disabled = false; runEvalBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Re-run Evaluation'; }
    if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.style.opacity = '1'; uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Run'; }
    renderEvalResults(metrics, organ_filter);
  } else if (status === 'error') {
    if (evalProgressSection) evalProgressSection.style.display = 'none';
    if (evalErrorSection) { evalErrorSection.style.display = ''; }
    if (evalErrorMsg) evalErrorMsg.textContent = error || 'Unknown error.';
    if (evalOrganSelect) evalOrganSelect.disabled = false;
    if (runEvalBtn) { runEvalBtn.disabled = false; runEvalBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Evaluation'; }
    if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.style.opacity = '1'; uploadBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Run'; }
  } else {
    if (evalProgressSection) evalProgressSection.style.display = 'none';
    if (evalOrganSelect) evalOrganSelect.disabled = false;
    if (runEvalBtn) { runEvalBtn.disabled = false; runEvalBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Evaluation'; }
    if (uploadBtn && uploadBtn.disabled) { uploadBtn.style.opacity = '0.5'; }
  }
}

async function pollEvalStatus() {
  try {
    const r = await fetch('/api/evaluate');
    const data = await r.json();
    applyEvalState(data);
    if (data.status === 'running') {
      evalPollTimer = setTimeout(pollEvalStatus, 2500);
    } else {
      evalPollTimer = null;
    }
  } catch (_) {
    evalPollTimer = setTimeout(pollEvalStatus, 4000);
  }
}

if (runEvalBtn) {
  runEvalBtn.addEventListener('click', async () => {
    if (evalPollTimer) clearTimeout(evalPollTimer);
    const organFilter = evalOrganSelect ? evalOrganSelect.value : '';
    runEvalBtn.disabled = true;
    runEvalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Starting...';
    if (evalOrganSelect) evalOrganSelect.disabled = true;
    if (evalResultsSection) evalResultsSection.style.display = 'none';
    if (evalErrorSection) evalErrorSection.style.display = 'none';
    try {
      const r = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organ_filter: organFilter || null }),
      });
      const data = await r.json();
      if (!data.ok) {
        showToast(data.error || 'Failed to start evaluation', 'error');
        runEvalBtn.disabled = false;
        runEvalBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Evaluation';
        if (evalOrganSelect) evalOrganSelect.disabled = false;
        return;
      }
      if (evalProgressSection) evalProgressSection.style.display = '';
      setEvalBadge('running');
      const scopeMsg = organFilter ? `Evaluating ${organFilter}` : 'Evaluation started';
      showToast(`${scopeMsg} — this may take a few minutes`, 'success');
      evalPollTimer = setTimeout(pollEvalStatus, 2500);
    } catch (err) {
      showToast('Could not reach server', 'error');
      runEvalBtn.disabled = false;
      runEvalBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Evaluation';
      if (evalOrganSelect) evalOrganSelect.disabled = false;
    }
  });
}

// ── Custom Dataset Upload ───────────────────────────────────────────────────
const customDatasetInput = document.getElementById('customDatasetInput');
const customDatasetFilename = document.getElementById('customDatasetFilename');
const uploadEvalBtn = document.getElementById('uploadEvalBtn');

if (customDatasetInput) {
  customDatasetInput.addEventListener('change', () => {
    const file = customDatasetInput.files[0];
    if (file) {
      customDatasetFilename.textContent = file.name;
      uploadEvalBtn.disabled = false;
      uploadEvalBtn.style.opacity = '1';
    } else {
      customDatasetFilename.textContent = 'Choose ZIP file';
      uploadEvalBtn.disabled = true;
      uploadEvalBtn.style.opacity = '0.5';
    }
  });
}

if (uploadEvalBtn) {
  uploadEvalBtn.addEventListener('click', async () => {
    const file = customDatasetInput ? customDatasetInput.files[0] : null;
    if (!file) { showToast('Please select a ZIP file first.', 'error'); return; }

    if (evalPollTimer) clearTimeout(evalPollTimer);

    uploadEvalBtn.disabled = true;
    uploadEvalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uploading...';
    if (runEvalBtn) { runEvalBtn.disabled = true; }
    if (evalOrganSelect) evalOrganSelect.disabled = true;
    if (evalResultsSection) evalResultsSection.style.display = 'none';
    if (evalErrorSection) evalErrorSection.style.display = 'none';

    const organFilter = evalOrganSelect ? evalOrganSelect.value : '';
    const headers = { 'Content-Type': 'application/zip' };
    if (organFilter) headers['X-Organ-Filter'] = organFilter;

    try {
      const arrayBuffer = await file.arrayBuffer();
      const r = await fetch('/api/evaluate/upload', {
        method: 'POST',
        headers,
        body: arrayBuffer,
      });
      const data = await r.json();
      if (!data.ok) {
        showToast(data.error || 'Upload failed.', 'error');
        uploadEvalBtn.disabled = false;
        uploadEvalBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Run';
        uploadEvalBtn.style.opacity = '1';
        if (runEvalBtn) { runEvalBtn.disabled = false; }
        if (evalOrganSelect) evalOrganSelect.disabled = false;
        return;
      }
      if (evalProgressSection) evalProgressSection.style.display = '';
      setEvalBadge('running');
      showToast('Custom dataset uploaded — evaluation started', 'success');
      uploadEvalBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Run';
      evalPollTimer = setTimeout(pollEvalStatus, 2500);
    } catch (err) {
      showToast('Could not upload dataset — check connection', 'error');
      uploadEvalBtn.disabled = false;
      uploadEvalBtn.innerHTML = '<i class="fa-solid fa-upload"></i> Upload & Run';
      uploadEvalBtn.style.opacity = '1';
      if (runEvalBtn) { runEvalBtn.disabled = false; }
      if (evalOrganSelect) evalOrganSelect.disabled = false;
    }
  });
}

// On accuracy tab open, refresh status from server
if (navAccuracy) {
  navAccuracy.addEventListener('click', () => {
    fetch('/api/evaluate').then(r => r.json()).then(data => {
      applyEvalState(data);
      if (data.status === 'running' && !evalPollTimer) {
        evalPollTimer = setTimeout(pollEvalStatus, 2500);
      }
    }).catch(() => {});
  });
}

// ── History Storage ────────────────────────────────────────────────────────
const HISTORY_MAX = 50;

function historyKey() {
  const email = localStorage.getItem('medai_user_email') || 'guest';
  return `medai_history_${email}`;
}

function loadHistoryEntries() {
  try { return JSON.parse(localStorage.getItem(historyKey()) || '[]'); } catch (_) { return []; }
}

function saveHistoryEntries(entries) {
  try { localStorage.setItem(historyKey(), JSON.stringify(entries.slice(0, HISTORY_MAX))); } catch (_) {}
}

function compressThumbnail(dataUrl, maxW, maxH, cb) {
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(canvas.toDataURL('image/jpeg', 0.7));
  };
  img.onerror = () => cb(null);
  img.src = dataUrl;
}

function saveHistoryEntry(result, filename, imageDataUrl) {
  const id = Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  latestHistoryEntryId = id;
  const doSave = (thumb) => {
    const entries = loadHistoryEntries();
    entries.unshift({ id, timestamp: Date.now(), filename, thumbnailDataUrl: thumb, result, hasReport: true });
    saveHistoryEntries(entries);
  };
  if (imageDataUrl) {
    compressThumbnail(imageDataUrl, 400, 280, thumb => doSave(thumb));
  } else {
    doSave(null);
  }
}

function markHistoryEntryReported(result) {
  const entries = loadHistoryEntries();
  const decision = result && result.final_decision;
  const idx = entries.findIndex(e => e.result && e.result.final_decision === decision && !e.hasReport);
  if (idx !== -1) {
    entries[idx].hasReport = true;
    entries[idx].reportResult = result;
    saveHistoryEntries(entries);
  }
}

// ── History Panel Rendering ────────────────────────────────────────────────
const historyGrid = document.getElementById('historyGrid');
const historyEmpty = document.getElementById('historyEmpty');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function formatRelativeDate(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderHistoryPanel() {
  if (!historyGrid) return;
  const entries = loadHistoryEntries();
  if (entries.length === 0) {
    if (historyEmpty) historyEmpty.style.display = '';
    historyGrid.innerHTML = '';
    return;
  }
  if (historyEmpty) historyEmpty.style.display = 'none';
  historyGrid.innerHTML = entries.map(entry => {
    const decision = escapeHtml(entry.result?.final_decision || 'Unknown result');
    const organ = escapeHtml(entry.result?.organ_prediction?.selected_label || entry.result?.organ_prediction?.label || '');
    const subtype = escapeHtml(entry.result?.subtype_prediction?.interpreted_label || entry.result?.subtype_prediction?.label || '');
    const summary = [organ, subtype].filter(Boolean).join(' › ') || decision;
    const thumb = entry.thumbnailDataUrl
      ? `<img class="history-card-thumb" src="${entry.thumbnailDataUrl}" alt="Scan thumbnail">`
      : `<div class="history-card-thumb-placeholder"><i class="fa-solid fa-image"></i></div>`;
    return `
      <div class="history-card" data-id="${escapeHtml(entry.id)}">
        ${thumb}
        <div class="history-card-body">
          <div class="history-card-filename" title="${escapeHtml(entry.filename)}">${escapeHtml(entry.filename)}</div>
          <div class="history-card-date"><i class="fa-regular fa-clock"></i> ${formatRelativeDate(entry.timestamp)}</div>
          <div class="history-card-decision">${summary}</div>
        </div>
        <div class="history-card-actions">
          <button class="history-card-btn primary hist-report-btn" data-id="${escapeHtml(entry.id)}" title="Download PDF report">
            <i class="fa-solid fa-file-pdf"></i> Report
          </button>
          <button class="history-card-btn hist-delete-btn" data-id="${escapeHtml(entry.id)}">
            <i class="fa-solid fa-trash"></i> Remove
          </button>
        </div>
      </div>`;
  }).join('');

  historyGrid.querySelectorAll('.hist-report-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const entry = loadHistoryEntries().find(e => e.id === id);
      if (!entry || !entry.result) return;

      // Fast path: blob already in memory cache
      if (reportBlobCache.has(id)) {
        const { blob, dlName } = reportBlobCache.get(id);
        triggerDownload(blob, dlName);
        showToast('Report downloaded!', 'success');
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      try {
        const resp = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: entry.filename, result: entry.result, image_data: entry.thumbnailDataUrl || null }),
        });
        if (!resp.ok) throw new Error('Report generation failed.');
        const blob = await resp.blob();
        const disposition = resp.headers.get('Content-Disposition') || '';
        const nameMatch = disposition.match(/filename="?([^";\n]+)"?/i);
        const dlName = nameMatch ? nameMatch[1] : `${(entry.filename.replace(/\.[^.]+$/, '') || 'report')}_report.pdf`;
        triggerDownload(blob, dlName);
        showToast('Report downloaded!', 'success');
      } catch (e) {
        showToast('Report download failed', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Report';
      }
    });
  });

  historyGrid.querySelectorAll('.hist-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const entries = loadHistoryEntries().filter(e => e.id !== id);
      saveHistoryEntries(entries);
      renderHistoryPanel();
    });
  });
}

if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', () => {
    if (!confirm('Clear all history? This cannot be undone.')) return;
    localStorage.removeItem(historyKey());
    renderHistoryPanel();
    showToast('History cleared', 'success');
  });
}

// ── Profile Avatar & Dropdown ─────────────────────────────────────────────
const profileBtn = document.getElementById('profileBtn');
const profileDropdown = document.getElementById('profileDropdown');
const profileInitials = document.getElementById('profileInitials');
const profileDropdownEmail = document.getElementById('profileDropdownEmail');
const ddHistory = document.getElementById('ddHistory');
const ddSettings = document.getElementById('ddSettings');
const ddLogout = document.getElementById('ddLogout');

function initProfileAvatar() {
  const email = localStorage.getItem('medai_user_email') || '';
  if (profileDropdownEmail) profileDropdownEmail.textContent = email || 'Not signed in';
  if (profileInitials) {
    if (email) {
      const parts = email.split('@')[0].split(/[._\-]/).filter(Boolean);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : email.slice(0, 2).toUpperCase();
      profileInitials.textContent = initials;
    } else {
      profileInitials.textContent = '?';
    }
  }
}

function closeProfileDropdown() {
  if (profileDropdown) profileDropdown.style.display = 'none';
}

if (profileBtn) {
  profileBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = profileDropdown && profileDropdown.style.display !== 'none';
    closeProfileDropdown();
    if (!isOpen && profileDropdown) profileDropdown.style.display = '';
  });
}

document.addEventListener('click', e => {
  if (profileDropdown && profileDropdown.style.display !== 'none') {
    if (!profileDropdown.contains(e.target) && e.target !== profileBtn) closeProfileDropdown();
  }
});

if (ddHistory) {
  ddHistory.addEventListener('click', e => {
    e.preventDefault();
    closeProfileDropdown();
    showTab('history');
  });
}
if (ddSettings) {
  ddSettings.addEventListener('click', e => {
    e.preventDefault();
    closeProfileDropdown();
    showTab('settings');
  });
}
if (ddLogout) {
  ddLogout.addEventListener('click', e => {
    e.preventDefault();
    closeProfileDropdown();
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.click();
  });
}

// ── Change Password Form ───────────────────────────────────────────────────
const changePasswordForm = document.getElementById('changePasswordForm');
const cpCurrent = document.getElementById('cpCurrent');
const cpNew = document.getElementById('cpNew');
const cpConfirm = document.getElementById('cpConfirm');
const cpSubmitBtn = document.getElementById('cpSubmitBtn');
const cpBtnIcon = document.getElementById('cpBtnIcon');
const cpBtnLabel = document.getElementById('cpBtnLabel');

document.querySelectorAll('.pwd-eye-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const inp = document.getElementById(btn.dataset.input);
    const icon = document.getElementById(btn.dataset.icon);
    if (!inp) return;
    const isPass = inp.type === 'password';
    inp.type = isPass ? 'text' : 'password';
    if (icon) { icon.className = isPass ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye'; }
  });
});

if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = localStorage.getItem('medai_user_email') || '';
    if (!email) { showToast('Not signed in', 'error'); return; }
    const current = cpCurrent ? cpCurrent.value : '';
    const newPw = cpNew ? cpNew.value : '';
    const confirm = cpConfirm ? cpConfirm.value : '';
    if (!current || !newPw || !confirm) { showToast('Please fill in all fields', 'error'); return; }
    if (newPw !== confirm) { showToast('New passwords do not match', 'error'); return; }
    if (newPw.length < 6) { showToast('New password must be at least 6 characters', 'error'); return; }
    if (cpSubmitBtn) cpSubmitBtn.disabled = true;
    if (cpBtnIcon) cpBtnIcon.className = 'fa-solid fa-spinner fa-spin';
    if (cpBtnLabel) cpBtnLabel.textContent = 'Updating...';
    try {
      const resp = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, current_password: current, new_password: newPw }),
      });
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || 'Password change failed');
      showToast('Password updated successfully!', 'success');
      changePasswordForm.reset();
    } catch (err) {
      showToast(err.message || 'Failed to update password', 'error');
    } finally {
      if (cpSubmitBtn) cpSubmitBtn.disabled = false;
      if (cpBtnIcon) cpBtnIcon.className = 'fa-solid fa-key';
      if (cpBtnLabel) cpBtnLabel.textContent = 'Update Password';
    }
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
if (form) {
  resetResults();
  fetchHealth();
}
initProfileAvatar();
