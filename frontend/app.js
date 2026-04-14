const form = document.getElementById("predictionForm");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const manualOverride = document.getElementById("manualOverride");
const organOverride = document.getElementById("organOverride");
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

// UI Enhancements: Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    toast.innerHTML = `<div class="toast-content"><i class="fa-solid ${icon}"></i><span>${escapeHtml(message)}</span></div>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// UI Enhancements: Theme & Sidebar Logic
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const themeText = document.getElementById('themeToggleText');
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('light-theme')) {
            themeText.textContent = 'Dark Mode';
            icon.className = 'fa-solid fa-moon';
        } else {
            themeText.textContent = 'Light Mode';
            icon.className = 'fa-solid fa-sun';
        }
    });
}
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
    });
}
if (closeSidebar) {
    closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
    });
}

function setRequestState(label, className = "") {
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
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "N/A";
  }
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function toneClass(color, status) {
  const normalizedColor = String(color || "").toLowerCase();
  if (normalizedColor) {
    return `tone-${normalizedColor}`;
  }
  const normalizedStatus = String(status || "").toLowerCase();
  if (normalizedStatus.includes("reject") || normalizedStatus.includes("low")) return "tone-red";
  if (normalizedStatus.includes("normal") || normalizedStatus.includes("high")) return "tone-green";
  if (normalizedStatus.includes("close") || normalizedStatus.includes("abnormal") || normalizedStatus.includes("pending") || normalizedStatus.includes("not_evaluated")) return "tone-blue";
  return "tone-yellow";
}

function resetResults() {
  latestResult = null;
  latestFilename = null;
  reportButton.disabled = true;
  reportStatus.innerHTML = '<i class="fa-solid fa-circle-info"></i> Reports are saved to your Documents folder.';
  jsonOutput.textContent = "{}";
  finalDecisionPanel.className = "decision-banner empty-state glass-inner";
  finalDecisionPanel.innerHTML = '<div class="empty-icon"><i class="fa-solid fa-box-open"></i></div><h3>No Results Yet</h3><p>Upload an image to see modality validation, tissue routing, normality, subtype analysis, and explanations.</p>';
  warningList.innerHTML = "";
  [modalityCard, tissueCard, normalityCard, subtypeCard].forEach((card, index) => {
    const titles = ["Step 0: Modality", "Level 1: Tissue", "Level 2: Normality", "Level 3: Subtype"];
    card.className = "mini-card glass-inner empty";
    card.innerHTML = `<h3>${titles[index]}</h3><p>No result available for this stage.</p>`;
  });
  renderGradcam(null);
  renderChart(organChart, null, "Organ Probability Graph");
  renderChart(subtypeChart, null, "Subtype Probability Graph");
}

function renderWarnings(warnings) {
  if (!warnings || warnings.length === 0) {
    warningList.innerHTML = "";
    return;
  }
  warningList.innerHTML = `
    <div class="warning-list">
      ${warnings.map((warning) => `<div class="warning-item">${escapeHtml(warning)}</div>`).join("")}
    </div>
  `;
}

function populateOrganOverride(options) {
  const currentValue = organOverride.value;
  organOverride.innerHTML = '<option value="">No override</option>';
  (options || []).forEach((option) => {
    const element = document.createElement("option");
    element.value = option.label;
    element.textContent = option.label;
    organOverride.appendChild(element);
  });
  organOverride.value = currentValue;
}

function renderModelStatus(payload) {
  const status = payload.model_status;
  latestModelStatus = status;
  populateOrganOverride(status.organ_options || []);
  const organReady = Boolean(status.organ_ready);
  const subtypeReady = Boolean(status.subtype_ready);
  const organState = organReady ? "Ready" : status.organ_error ? "Load failed" : "Waiting";
  const subtypeState = subtypeReady
    ? "Ready"
    : status.subtype_error
      ? "Load failed"
      : status.subtype_checkpoint_exists
        ? "Waiting to load"
        : "Waiting";
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
    const response = await fetch("/api/health");
    const payload = await response.json();
    renderModelStatus(payload);
  } catch (error) {
    modelStatus.innerHTML = `
      <h2><i class="fa-solid fa-server"></i> Platform Status</h2>
      <p style="color:var(--warning)">Could not reach the local inference server.</p>
    `;
  }
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    // Simulate upload progress
    if(uploadProgressWrapper) {
        uploadProgressWrapper.style.display = 'block';
        uploadFileName.textContent = file.name;
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 30;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            uploadPercentage.textContent = Math.floor(progress) + '%';
            uploadProgressBar.style.width = progress + '%';
            if (progress === 100) setTimeout(() => uploadProgressWrapper.style.display = 'none', 500);
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
    ${formatter(stage)}
  `;
}

function renderDecisionBanner(result) {
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
    <p>${escapeHtml(result.reason || "Decision-support output generated successfully.")}</p>
  `;
}

function renderChart(container, chart, fallbackTitle = "Probability Graph") {
  if (!chart || !chart.items || chart.items.length === 0) {
    container.className = "chart-card glass-inner empty";
    container.innerHTML = `<h3>${escapeHtml(fallbackTitle)}</h3><p>No chart data available.</p>`;
    return;
  }
  container.className = "chart-card glass-inner";
  container.innerHTML = `
    <h3>${escapeHtml(chart.title || fallbackTitle)}</h3>
    <div class="chart-list">
      ${chart.items.map((item) => `
        <div class="chart-row ${item.highlight ? "top-hit" : ""}">
          <div class="chart-row-header">
              <span class="chart-label">${escapeHtml(item.label)}</span>
              <span class="chart-value">${formatConfidence(item.confidence)}</span>
          </div>
          <div class="chart-track">
            <div class="chart-fill" style="width: ${Math.max(Number(item.confidence) * 100, 1)}%"></div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderGradcam(gradcam) {
  const organCam = gradcam?.organ;
  const subtypeCam = gradcam?.subtype;
  const items = [organCam, subtypeCam].filter(Boolean);
  if (items.length === 0) {
    gradcamPanel.className = "chart-card gradcam-card glass-inner empty";
    gradcamPanel.innerHTML = `
      <h3>Grad-CAM Review</h3>
      <p>No Grad-CAM visual available for this prediction.</p>
    `;
    return;
  }

  gradcamPanel.className = "chart-card gradcam-card glass-inner";
  gradcamPanel.innerHTML = `
    <div class="gradcam-header">
      <h3><i class="fa-solid fa-layer-group"></i> Grad-CAM Review</h3>
      <p>Model attention heatmaps for organ routing and final outcome.</p>
    </div>
    <div class="gradcam-grid">
      ${items.map((item) => `
        <article class="gradcam-item">
          <div class="gradcam-meta">
            <h4>${escapeHtml(item.title || "Grad-CAM")}</h4>
            <p>${escapeHtml(item.label || "Model attention map")}</p>
          </div>
          <div class="gradcam-image-wrap">
              <img
                class="gradcam-image"
                src="data:${escapeHtml(item.mime_type || "image/png")};base64,${item.image_base64}"
                alt="${escapeHtml(item.title || "Grad-CAM visualization")}"
              >
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderResult(result) {
  latestResult = result;
  reportButton.disabled = false;
  jsonOutput.textContent = JSON.stringify(result, null, 2);
  renderDecisionBanner(result);
  renderWarnings(result.warnings || []);
  renderGradcam(result.gradcam);

  renderStageCard(modalityCard, "Step 0: Modality", result.modality, (stage) => `
    ${stageMetric("Type", escapeHtml(stage.type || "N/A"))}
    ${stageMetric("Confidence", formatConfidence(stage.confidence))}
    ${stageMetric("Gap", formatConfidence(stage.confidence_gap))}
    ${stageMetric("Reason", escapeHtml(stage.reason || "None"))}
  `);

  renderStageCard(tissueCard, "Level 1: Tissue", result.organ_prediction, (stage) => `
    ${stageMetric("Label", escapeHtml(stage.selected_label || stage.label || "N/A"))}
    ${stageMetric("Confidence", formatConfidence(stage.selected_confidence ?? stage.confidence))}
    ${stageMetric("Gap", formatConfidence(stage.confidence_gap))}
    ${stageMetric("Top 2", escapeHtml(`${stage.top2_label || "N/A"} (${formatConfidence(stage.top2_confidence)})`))}
  `);

  renderStageCard(normalityCard, "Level 2: Normality", result.normality, (stage) => `
    ${stageMetric("Outcome", escapeHtml(stage.label || stage.status || "N/A"))}
    ${stageMetric("Confidence", formatConfidence(stage.confidence))}
    ${stageMetric("Normal Label", escapeHtml(stage.normal_label || "N/A"))}
    ${stageMetric("Entropy", escapeHtml(stage.entropy ?? "N/A"))}
  `);

  renderStageCard(subtypeCard, "Level 3: Subtype", result.subtype_prediction, (stage) => `
    ${stageMetric("Label", escapeHtml(stage.interpreted_label || stage.label || "N/A"))}
    ${stageMetric("Confidence", formatConfidence(stage.confidence))}
    ${stageMetric("Gap", formatConfidence(stage.confidence_gap))}
    ${stageMetric("Alternatives", escapeHtml((stage.alternatives || []).join(", ") || "None"))}
  `);

  renderChart(organChart, result.charts?.organ, "Organ Probability Graph");
  renderChart(subtypeChart, result.charts?.subtype, "Subtype Probability Graph");

  if (result.model_status) {
    renderModelStatus({ model_status: result.model_status });
  }
}

// Drag & Drop Functionality
if (dragDropZone) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dragDropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults (e) { e.preventDefault(); e.stopPropagation(); }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dragDropZone.addEventListener(eventName, () => dragDropZone.classList.add('dragover'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dragDropZone.addEventListener(eventName, () => dragDropZone.classList.remove('dragover'), false);
    });
    
    dragDropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        let dt = e.dataTransfer;
        let files = dt.files;
        if(files.length > 0) {
            imageInput.files = files;
            // dispatch change event to trigger preview
            imageInput.dispatchEvent(new Event('change'));
        }
    }
}

imageInput.addEventListener("change", (event) => {
  const [file] = event.target.files;
  latestFilename = file ? file.name : null;
  if (!file) {
    imagePreview.style.display = "none";
    previewPlaceholder.style.display = "flex";
    imagePreview.removeAttribute("src");
    resetResults();
    return;
  }
  const previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  imagePreview.style.display = "block";
  previewPlaceholder.style.display = "none";
});

form.addEventListener("submit", async (event) => {
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
  reportButton.disabled = true;
  reportStatus.innerHTML = '<i class="fa-solid fa-circle-info"></i> Reports are saved to your Documents folder.';
  setRequestState("Running", "tone-blue");
  finalDecisionPanel.className = "decision-banner glass-inner tone-blue";
  finalDecisionPanel.innerHTML = `
    <div class="decision-kicker"><i class="fa-solid fa-gears"></i> Pipeline Running</div>
    <div class="decision-title">Analyzing uploaded image</div>
    <div class="progress-bar-bg" style="margin-top: 20px;"><div class="progress-bar-fill" style="width:100%; animation: pulse 1.5s infinite"></div></div>
    <p style="margin-top:20px;">Step 0 validation, tissue routing, normality screening, and subtype analysis are running now.</p>
  `;
  try {
    const imageData = await readFileAsDataUrl(file);
    showToast("Scan uploaded, starting analysis...", "success");
    const response = await fetch("/api/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: file.name,
        image_data: imageData,
        manual_override: manualOverride.checked,
        organ_override: organOverride.value || null,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Prediction request failed.");
    }
    renderResult(payload.result);
    setRequestState("Complete", "tone-green");
    showToast("Analysis complete!", "success");
  } catch (error) {
    resetResults();
    finalDecisionPanel.className = "decision-banner glass-inner tone-red";
    finalDecisionPanel.innerHTML = `<div class="decision-title"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(error.message)}</div>`;
    setRequestState("Error", "tone-red");
    showToast("Error during analysis", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = '<i class="fa-solid fa-microchip"></i> Run Intelligent Pipeline';
  }
});

reportButton.addEventListener("click", async () => {
  if (!latestResult) {
    return;
  }
  reportButton.disabled = true;
  reportButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Exporting...';
  reportStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating report...';
  try {
    const [file] = imageInput.files;
    const imageData = file ? await readFileAsDataUrl(file) : null;
    const response = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename: latestFilename || latestResult.input?.source || "upload",
        result: latestResult,
        image_data: imageData,
        output_dir: latestModelStatus?.report_output_dir || null,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Report generation failed.");
    }
    reportStatus.innerHTML = `<i class="fa-solid fa-check text-success"></i> Report saved: ${payload.report_path}`;
    showToast("Report exported successfully", "success");
  } catch (error) {
    reportStatus.innerHTML = `<i class="fa-solid fa-xmark" style="color:var(--danger)"></i> ${error.message}`;
    showToast("Failed to export report", "error");
  } finally {
    reportButton.disabled = false;
    reportButton.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Export Report';
  }
});

resetResults();
fetchHealth();
