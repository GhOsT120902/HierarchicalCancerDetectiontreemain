// ── AUTH SYSTEM ────────────────────────────────────────────────────────────
const authContainer = document.getElementById("authContainer");
const dashboardContainer = document.getElementById("dashboardContainer");
const loginForm = document.getElementById("loginForm");
const togglePwd = document.getElementById("togglePwd");
const eyeIcon = document.getElementById("eyeIcon");
const pwdInput = document.getElementById("password");
const logoutBtn = document.getElementById("logoutBtn");

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

// Password visibility toggle
if (togglePwd && pwdInput) {
  togglePwd.addEventListener("click", () => {
    const isHidden = pwdInput.type === "password";
    pwdInput.type = isHidden ? "text" : "password";
    if (eyeIcon) eyeIcon.className = isHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
  });
}

// Login form submission
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

    if (btn) btn.disabled = true;
    if (label) label.textContent = "Signing in...";
    if (icon) icon.className = "fa-solid fa-spinner fa-spin";

    // Simulate async auth
    await new Promise(r => setTimeout(r, 1500));

    if (btn) btn.disabled = false;
    if (label) label.textContent = "Sign In";
    if (icon) icon.className = "fa-solid fa-microchip";

    // Store login state
    localStorage.setItem('medai_logged_in', 'true');
    localStorage.setItem('medai_user_email', email);

    showToast("Login successful! Redirecting...", "success");
    setTimeout(() => {
      showDashboard();
      // Clear form
      if (loginForm) loginForm.reset();
    }, 1200);
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

// ── Report Button ──────────────────────────────────────────────────────────
if (reportButton) {
  reportButton.addEventListener("click", async () => {
    if (!latestResult) return;
    reportButton.disabled = true;
    reportButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
    if (reportStatus) reportStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating report...';
    try {
      const [file] = imageInput ? imageInput.files : [null];
      const imageData = file ? await readFileAsDataUrl(file) : null;
      const filename = latestFilename || latestResult.input?.source || "upload";

      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          result: latestResult,
          image_data: imageData,
        }),
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

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = downloadFilename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

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

// ── Nav Tab Switching ──────────────────────────────────────────────────────
const navDashboard = document.getElementById('navDashboard');
const navAccuracy = document.getElementById('navAccuracy');
const dashboardContent = document.getElementById('dashboardContent');
const accuracyPanel = document.getElementById('accuracyPanel');
const mainHeading = document.querySelector('.header h1');

function showTab(tab) {
  const isDash = tab === 'dashboard';
  if (dashboardContent) dashboardContent.style.display = isDash ? '' : 'none';
  if (accuracyPanel) accuracyPanel.style.display = isDash ? 'none' : '';
  if (navDashboard) navDashboard.classList.toggle('active', isDash);
  if (navAccuracy) navAccuracy.classList.toggle('active', !isDash);
  if (mainHeading) mainHeading.textContent = isDash ? 'Medical Scan Analysis' : 'Model Accuracy';
  if (!isDash && sidebar) sidebar.classList.remove('mobile-open');
}

if (navDashboard) navDashboard.addEventListener('click', e => { e.preventDefault(); showTab('dashboard'); });
if (navAccuracy) navAccuracy.addEventListener('click', e => { e.preventDefault(); showTab('accuracy'); });

// ── Model Accuracy Evaluation ──────────────────────────────────────────────
const runEvalBtn = document.getElementById('runEvalBtn');
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

function renderEvalResults(metrics) {
  if (!metrics || !evalMetricCards) return;

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
  const { status, metrics, error, log } = data;
  setEvalBadge(status);

  if (log && evalLog) evalLog.textContent = log.join('\n');

  if (status === 'running') {
    if (evalProgressSection) evalProgressSection.style.display = '';
    if (evalResultsSection) evalResultsSection.style.display = 'none';
    if (evalErrorSection) evalErrorSection.style.display = 'none';
    if (runEvalBtn) { runEvalBtn.disabled = true; runEvalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...'; }
    if (evalLog) evalLog.scrollTop = evalLog.scrollHeight;
  } else if (status === 'done') {
    if (evalProgressSection) evalProgressSection.style.display = 'none';
    if (evalErrorSection) evalErrorSection.style.display = 'none';
    if (runEvalBtn) { runEvalBtn.disabled = false; runEvalBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i> Re-run Evaluation'; }
    renderEvalResults(metrics);
  } else if (status === 'error') {
    if (evalProgressSection) evalProgressSection.style.display = 'none';
    if (evalErrorSection) { evalErrorSection.style.display = ''; }
    if (evalErrorMsg) evalErrorMsg.textContent = error || 'Unknown error.';
    if (runEvalBtn) { runEvalBtn.disabled = false; runEvalBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Evaluation'; }
  } else {
    if (evalProgressSection) evalProgressSection.style.display = 'none';
    if (runEvalBtn) { runEvalBtn.disabled = false; runEvalBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Evaluation'; }
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
    runEvalBtn.disabled = true;
    runEvalBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Starting...';
    if (evalResultsSection) evalResultsSection.style.display = 'none';
    if (evalErrorSection) evalErrorSection.style.display = 'none';
    try {
      const r = await fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await r.json();
      if (!data.ok) { showToast(data.error || 'Failed to start evaluation', 'error'); runEvalBtn.disabled = false; runEvalBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Evaluation'; return; }
      if (evalProgressSection) evalProgressSection.style.display = '';
      setEvalBadge('running');
      showToast('Evaluation started — this may take a few minutes', 'success');
      evalPollTimer = setTimeout(pollEvalStatus, 2500);
    } catch (err) {
      showToast('Could not reach server', 'error');
      runEvalBtn.disabled = false;
      runEvalBtn.innerHTML = '<i class="fa-solid fa-play"></i> Run Evaluation';
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

// ── Init ───────────────────────────────────────────────────────────────────
if (form) {
  resetResults();
  fetchHealth();
}
