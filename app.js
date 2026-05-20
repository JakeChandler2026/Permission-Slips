const runtime = window.PermissionSlipRuntime;
const config = runtime.config;
const pdfLib = window.PDFLib;
const STORAGE_KEY = "permission-slip-portal-state-v1";

const fieldMap = {
  Event: "event",
  "Dates of event": "dates",
  "Event description": "description",
  Stake: "stake",
  "Event or activity leader": "leaderName",
  "Event or activity leaders phone number": "leaderPhone",
  "Event or activity leaders email": "leaderEmail",
  Participant: "participantName",
  "Participant Name": "participantName",
  "Participant Name too": "participantName",
  "Date of birth": "dateOfBirth",
  "Birth Date": "dateOfBirth",
  "Telephone number": "phone",
  City: "city",
  "State or Province": "state",
  Ward: "ward",
  "Ward (again)": "ward",
  MF: "gender",
  Age: "age",
  "Age (again)": "age",
  Address: "address",
  "Address (again)": "address",
  "Emergency contact parent or guardian": "parentName",
  "Primary phone_1": "primaryPhone",
  "Secondary phone_1": "secondaryPhone",
  "Health Insurance Company": "insuranceCompany",
  Policy: "policyNumber",
  "FatherGuardian if minor": "fatherName",
  "Father's Cell": "fatherCell",
  "MotherGuardian if minor": "motherName",
  "Mother's Cell": "motherCell",
  "Emergency Contact": "emergencyContact",
  "Emergency Contact's Cell": "emergencyPhone",
  "Parent/Guardian Name": "parentName",
  Date: "today",
  "Date_2": "today",
  "Date (P/G signed)": "today",
  "Date (participant signged)": "today",
  "diet explanation": "dietExplanation",
  "Allergy explanation": "allergyExplanation",
  "List of Medications": "medications",
  "Current Medications": "medications",
  "Special needs": "specialNeeds",
  "Other limitations": "specialNeeds",
  "Physician's Name": "physicianName",
  "Physician's Phone": "physicianPhone",
  Height: "height",
  Weight: "weight",
  "Other Medicine List": "otherMedicineList",
  "Participants signature": "signatureText",
  "Parent or guardians signature if participant is a minor": "signatureText",
  "parent initial": "initials",
  "parent initial_2": "initials",
  "parent iniyial 3": "initials"
};

const checkboxMap = {
  "Special diet": "specialDiet",
  Allergies: "allergies",
  "Self Admin": "selfAdmin",
  Surgery: "surgery",
  "Chronic illness": "chronicIllness",
  Asthma: "asthma",
  Diabetes: "diabetes",
  Epilepsy: "epilepsy",
  "Heart trouble": "heartTrouble",
  "High BP": "highBp",
  "Dietary retriction": "specialDiet",
  "Reactions to Medicine": "allergies",
  Acetaminophen: "acetaminophen",
  Antacid: "antacid",
  "Check Box20": "ibuprofen",
  Diphenhyddramine: "diphenhydramine",
  "Other medicine": "otherMedicine"
};

const elements = {
  tabs: document.querySelectorAll(".tab"),
  views: document.querySelectorAll(".view"),
  submissionForm: document.getElementById("submissionForm"),
  activitySelect: document.getElementById("activitySelect"),
  activityTitle: document.getElementById("activityTitle"),
  pdfViewer: document.getElementById("pdfViewer"),
  pdfDownload: document.getElementById("pdfDownload"),
  formStatus: document.getElementById("formStatus"),
  previewPdf: document.getElementById("previewPdf"),
  signaturePad: document.getElementById("signaturePad"),
  signatureName: document.getElementById("signatureName"),
  adoptSignature: document.getElementById("adoptSignature"),
  clearSignature: document.getElementById("clearSignature"),
  adminLogin: document.getElementById("adminLogin"),
  adminSignOut: document.getElementById("adminSignOut"),
  adminStatus: document.getElementById("adminStatus"),
  activityForm: document.getElementById("activityForm"),
  newActivity: document.getElementById("newActivity"),
  activityCards: document.getElementById("activityCards"),
  submissionSearch: document.getElementById("submissionSearch"),
  activityFilter: document.getElementById("activityFilter"),
  refreshAdmin: document.getElementById("refreshAdmin"),
  summaryCards: document.getElementById("summaryCards"),
  submissionRows: document.getElementById("submissionRows")
};

const state = {
  activities: [],
  submissions: [],
  adminSession: null,
  signatureTouched: false,
  signatureAdopted: false,
  drawing: false
};

function todayString() {
  return new Date().toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function createId(prefix) {
  const random = crypto.getRandomValues(new Uint32Array(2)).join("");
  return `${prefix}_${Date.now()}_${random}`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "activity";
}

function setStatus(target, message, kind = "") {
  target.textContent = message;
  target.className = `form-status ${kind}`.trim();
}

function getLocalState() {
  const fallback = {
    activities: [{ id: "default-activity", ...config.defaultActivity }],
    submissions: []
  };

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed) return fallback;
    return {
      activities: parsed.activities?.length ? parsed.activities : fallback.activities,
      submissions: parsed.submissions || []
    };
  } catch {
    return fallback;
  }
}

function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    activities: state.activities,
    submissions: state.submissions
  }));
}

function getClient() {
  return runtime.createClient();
}

function getTemplateBucket() {
  return config.supabase.templatesBucket || "permission-slip-templates";
}

function getActivityPdfUrl(activity) {
  if (activity?.pdfTemplateUrl) return activity.pdfTemplateUrl;
  if (activity?.pdfTemplatePath && runtime.canBootSupabase) {
    const { data } = getClient().storage.from(getTemplateBucket()).getPublicUrl(activity.pdfTemplatePath);
    return data.publicUrl;
  }
  return config.pdfTemplateUrl;
}

function getActivityDefaults(activity) {
  return {
    ward: activity?.ward || "",
    city: activity?.defaultValues?.city || "",
    state: activity?.defaultValues?.state || "",
    ...activity?.defaultValues
  };
}

async function loadActivities() {
  const fallbackActivities = [{ id: "default-activity", ...config.defaultActivity }];
  if (!runtime.canBootSupabase) {
    const local = getLocalState();
    state.activities = local.activities;
    state.submissions = local.submissions;
    return;
  }

  const client = getClient();
  const { data, error } = await client
    .from("permission_activities")
    .select("*")
    .eq("is_active", true)
    .order("starts_on", { ascending: false, nullsFirst: false });

  if (error) {
    state.activities = fallbackActivities;
    throw error;
  }

  state.activities = data.length
    ? data.map(fromActivityRow)
    : fallbackActivities;
}

async function loadAdminSubmissions() {
  if (!runtime.canBootSupabase) {
    const local = getLocalState();
    state.submissions = local.submissions;
    return;
  }

  const client = getClient();
  const { data, error } = await client
    .from("permission_submissions")
    .select("*, activity:permission_activities(name, slug)")
    .order("submitted_at", { ascending: false });

  if (error) throw error;
  state.submissions = data.map(fromSubmissionRow);
}

function fromActivityRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    event: row.event_name || row.name,
    dates: row.event_dates || "",
    description: row.event_description || "",
    stake: row.stake || "",
    leaderName: row.leader_name || "",
    leaderPhone: row.leader_phone || "",
    leaderEmail: row.leader_email || "",
    ward: row.default_ward || "",
    defaultValues: row.default_values || {},
    pdfTemplatePath: row.pdf_template_path || "",
    pdfTemplateUrl: row.pdf_template_url || ""
  };
}

function fromSubmissionRow(row) {
  return {
    id: row.id,
    activityId: row.activity_id,
    activityName: row.activity?.name || row.activity_name || "",
    submittedName: row.submitted_name || row.youth_name,
    youthName: row.youth_name,
    parentName: row.parent_name,
    parentEmail: row.parent_email,
    ward: row.ward,
    submitterIp: row.submitter_ip || row.form_data?.submitterIp || "",
    submittedAt: row.submitted_at,
    pdfPath: row.pdf_path,
    pdfUrl: row.pdf_url || "",
    data: row.form_data || {}
  };
}

function renderActivities() {
  elements.activitySelect.innerHTML = state.activities
    .map((activity) => `<option value="${activity.id}">${escapeHtml(activity.name)}</option>`)
    .join("");

  elements.activityFilter.innerHTML = [
    `<option value="">All activities</option>`,
    ...state.activities.map((activity) => `<option value="${activity.id}">${escapeHtml(activity.name)}</option>`)
  ].join("");

  const params = new URLSearchParams(window.location.search);
  const requested = params.get("activity");
  if (requested) {
    const match = state.activities.find((activity) => activity.slug === requested || activity.id === requested);
    if (match) elements.activitySelect.value = match.id;
  }

  applySelectedActivity();
  renderActivityCards();
}

function applySelectedActivity() {
  const activity = getSelectedActivity();
  elements.activityTitle.textContent = activity.name;
  const pdfUrl = getActivityPdfUrl(activity);
  elements.pdfDownload.href = pdfUrl;
  renderPdfPreview();

  const defaults = getActivityDefaults(activity);
  for (const [name, value] of Object.entries(defaults)) {
    const input = elements.submissionForm.elements[name];
    if (input && !input.value && value !== undefined && value !== null) {
      input.value = String(value);
    }
  }
}

async function renderPdfPreview() {
  if (!elements.pdfViewer) return;
  if (!window.pdfjsLib) {
    elements.pdfViewer.innerHTML = `<p class="pdf-message">Loading PDF preview...</p>`;
    window.addEventListener("pdfjs-ready", renderPdfPreview, { once: true });
    return;
  }

  elements.pdfViewer.innerHTML = `<p class="pdf-message">Rendering PDF preview...</p>`;
  try {
    const pdf = await window.pdfjsLib.getDocument(getActivityPdfUrl(getSelectedActivity())).promise;
    elements.pdfViewer.innerHTML = "";
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.35 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      elements.pdfViewer.appendChild(canvas);
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    }
  } catch (error) {
    elements.pdfViewer.innerHTML = `<p class="pdf-message">PDF preview could not render. Use Open PDF to view the packet.</p>`;
  }
}

function getSelectedActivity() {
  return state.activities.find((activity) => activity.id === elements.activitySelect.value) || state.activities[0];
}

function collectFormData() {
  const formData = new FormData(elements.submissionForm);
  const values = {};
  for (const [key, value] of formData.entries()) values[key] = String(value).trim();

  for (const key of Object.values(checkboxMap)) {
    values[key] = elements.submissionForm.elements[key]?.checked || false;
  }

  const activity = getSelectedActivity();
  const initials = values.parentName
    ? values.parentName.split(/\s+/).map((part) => part[0]).join("").slice(0, 3).toUpperCase()
    : "";

  return {
    ...activity,
    ...values,
    activityId: activity.id,
    activityName: activity.name,
    submittedName: values.participantName,
    signerName: values.signatureName || values.parentName || values.participantName,
    signatureMethod: state.signatureAdopted ? "adopted" : "drawn",
    today: todayString(),
    initials,
    signatureText: `Electronically signed by ${values.signatureName || values.parentName || values.participantName || "participant"} on ${todayString()}`
  };
}

async function fetchPublicIpAddress() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch("https://api.ipify.org?format=json", { signal: controller.signal });
    if (!response.ok) return "";
    const data = await response.json();
    return String(data.ip || "").trim();
  } catch {
    return "";
  } finally {
    clearTimeout(timeout);
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[char]));
}

function signatureHasInk() {
  const canvas = elements.signaturePad;
  const ctx = canvas.getContext("2d");
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let markedPixels = 0;

  for (let index = 3; index < pixels.length; index += 4) {
    if (pixels[index] > 12) {
      markedPixels += 1;
      if (markedPixels > 80) return true;
    }
  }

  return false;
}

function getSignatureName() {
  return String(
    elements.signatureName.value ||
    elements.submissionForm.elements.parentName.value ||
    elements.submissionForm.elements.participantName.value ||
    ""
  ).trim();
}

function adoptSignature() {
  const name = getSignatureName();
  if (!name) {
    setStatus(elements.formStatus, "Type the signer name before adopting a signature.", "error");
    elements.signatureName.focus();
    return;
  }

  elements.signatureName.value = name;
  const canvas = elements.signaturePad;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.fillStyle = "#1f2930";
  ctx.strokeStyle = "rgba(31, 41, 48, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.font = '64px "Brush Script MT", "Segoe Script", "Lucida Handwriting", cursive';
  ctx.textBaseline = "middle";
  ctx.translate(58, canvas.height / 2 + 4);
  ctx.rotate(-0.025);
  ctx.fillText(name, 0, 0, canvas.width - 110);
  ctx.beginPath();
  ctx.moveTo(4, 48);
  ctx.bezierCurveTo(canvas.width * 0.25, 68, canvas.width * 0.55, 58, canvas.width - 120, 66);
  ctx.stroke();
  ctx.restore();
  state.signatureTouched = true;
  state.signatureAdopted = true;
  setStatus(elements.formStatus, "Signature adopted. You can clear it and draw instead.", "success");
}

async function generatePdf(values) {
  const bytes = await fetch(getActivityPdfUrl(getSelectedActivity())).then((response) => response.arrayBuffer());
  const pdfDoc = await pdfLib.PDFDocument.load(bytes);
  const form = pdfDoc.getForm();

  for (const field of form.getFields()) {
    const name = field.getName();
    const textKey = fieldMap[name];
    const checkboxKey = checkboxMap[name];

    try {
      if (textKey && field.constructor.name === "PDFTextField") {
        field.setText(String(values[textKey] || ""));
      } else if (!textKey && field.constructor.name === "PDFTextField" && values[name] !== undefined) {
        field.setText(String(values[name] || ""));
      } else if (checkboxKey && field.constructor.name === "PDFCheckBox") {
        values[checkboxKey] ? field.check() : field.uncheck();
      } else if (!checkboxKey && field.constructor.name === "PDFCheckBox" && values[name] !== undefined) {
        values[name] ? field.check() : field.uncheck();
      }
    } catch (error) {
      console.warn(`Could not fill field ${name}`, error);
    }
  }

  if (signatureHasInk()) {
    await drawSignatureImages(pdfDoc, form);
  }

  form.updateFieldAppearances();
  form.flatten();
  return pdfDoc.save();
}

async function drawSignatureImages(pdfDoc, form) {
  const pngDataUrl = elements.signaturePad.toDataURL("image/png");
  const png = await pdfDoc.embedPng(pngDataUrl);
  const signatureFields = [
    "Participants signature",
    "Parent or guardians signature if participant is a minor"
  ];
  let placements = 0;

  for (const fieldName of signatureFields) {
    try {
      const field = form.getTextField(fieldName);
      const widget = field.acroField.getWidgets()[0];
      const rect = widget.getRectangle();
      const pageRef = widget.P();
      const page = pdfDoc.getPages().find((candidate) => candidate.ref === pageRef) || pdfDoc.getPages()[0];
      const width = Math.min(rect.width || 180, 230);
      const height = Math.min(rect.height || 38, 48);
      page.drawImage(png, {
        x: rect.x,
        y: rect.y - 2,
        width,
        height
      });
      placements += 1;
    } catch {
      // Uploaded packets may not use the original Trek signature field names.
    }
  }

  if (!placements) {
    const pages = pdfDoc.getPages();
    const page = pages[pages.length - 1];
    const { width } = page.getSize();
    page.drawImage(png, {
      x: 72,
      y: 72,
      width: Math.min(260, width - 144),
      height: 72
    });
  }
}

function downloadBytes(bytes, filename) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { blob, url, filename };
}

async function submitToBackend(values, pdfBytes) {
  const fileName = `${slugify(values.activityName)}-${slugify(values.youthName || values.participantName)}-${Date.now()}.pdf`;

  if (!runtime.canBootSupabase) {
    const blobInfo = downloadBytes(pdfBytes, fileName);
    const submission = {
      id: createId("sub"),
      activityId: values.activityId,
      activityName: values.activityName,
      submittedName: values.submittedName || values.participantName,
      youthName: values.participantName,
      parentName: values.parentName,
      parentEmail: values.parentEmail,
      ward: values.ward,
      submitterIp: values.submitterIp || "",
      submittedAt: new Date().toISOString(),
      pdfUrl: blobInfo.url,
      pdfPath: fileName,
      data: values
    };
    state.submissions.unshift(submission);
    saveLocalState();
    return submission;
  }

  const client = getClient();
  const activity = getSelectedActivity();
  const path = `${activity.slug}/${fileName}`;
  const { error: uploadError } = await client.storage
    .from(config.supabase.submissionsBucket)
    .upload(path, new Blob([pdfBytes], { type: "application/pdf" }), { contentType: "application/pdf", upsert: false });

  if (uploadError) throw uploadError;

  const { data, error } = await client
    .from("permission_submissions")
    .insert({
      activity_id: activity.id === "default-activity" ? null : activity.id,
      activity_name: activity.name,
      submitted_name: values.submittedName || values.participantName,
      youth_name: values.participantName,
      youth_birth_date: values.dateOfBirth || null,
      parent_name: values.parentName,
      parent_email: values.parentEmail,
      parent_phone: values.primaryPhone,
      ward: values.ward,
      submitter_ip: values.submitterIp || null,
      pdf_path: path,
      form_data: values
    })
    .select("*, activity:permission_activities(name, slug)")
    .single();

  if (error) throw error;
  return fromSubmissionRow(data);
}

async function getPdfUrl(submission) {
  if (submission.pdfUrl) return submission.pdfUrl;
  if (!runtime.canBootSupabase || !submission.pdfPath) return "";
  const client = getClient();
  const { data, error } = await client.storage
    .from(config.supabase.submissionsBucket)
    .createSignedUrl(submission.pdfPath, 60 * 10);
  if (error) throw error;
  return data.signedUrl;
}

function setupSignaturePad() {
  const canvas = elements.signaturePad;
  const ctx = canvas.getContext("2d");
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#1f2930";

  function point(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] || event;
    return {
      x: (source.clientX - rect.left) * (canvas.width / rect.width),
      y: (source.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function start(event) {
    event.preventDefault();
    state.drawing = true;
    state.signatureTouched = true;
    state.signatureAdopted = false;
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(event) {
    if (!state.drawing) return;
    event.preventDefault();
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function stop() {
    state.drawing = false;
  }

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", stop);
  canvas.addEventListener("pointerleave", stop);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", move, { passive: false });
  canvas.addEventListener("touchend", stop);

  elements.clearSignature.addEventListener("click", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    state.signatureTouched = false;
    state.signatureAdopted = false;
  });

  elements.adoptSignature.addEventListener("click", adoptSignature);
}

function renderAdmin() {
  const query = elements.submissionSearch.value.trim().toLowerCase();
  const selectedActivityId = elements.activityFilter.value;
  const submissions = state.submissions.filter((submission) => {
    const haystack = [
      submission.youthName,
      submission.parentName,
      submission.parentEmail,
      submission.ward,
      submission.activityName,
      submission.submittedName,
      submission.submitterIp
    ].join(" ").toLowerCase();
    const matchesQuery = !query || haystack.includes(query);
    const matchesActivity = !selectedActivityId || submission.activityId === selectedActivityId;
    return matchesQuery && matchesActivity;
  });

  const uniqueYouth = new Set(submissions.map((submission) => submission.youthName?.toLowerCase()).filter(Boolean));
  const byActivity = submissions.reduce((acc, submission) => {
    acc[submission.activityName] = (acc[submission.activityName] || 0) + 1;
    return acc;
  }, {});
  const busiestActivity = Object.entries(byActivity).sort((a, b) => b[1] - a[1])[0];

  elements.summaryCards.innerHTML = [
    ["Submissions", submissions.length],
    ["Youth", uniqueYouth.size],
    ["Activities", Object.keys(byActivity).length],
    ["Most active", busiestActivity ? `${busiestActivity[0]} (${busiestActivity[1]})` : "None"]
  ].map(([label, value]) => `<div class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("");

  elements.submissionRows.innerHTML = submissions.length
    ? submissions.map((submission) => `
      <tr>
        <td>${escapeHtml(submission.submittedName || submission.youthName)}</td>
        <td>${escapeHtml(submission.activityName)}</td>
        <td>${escapeHtml(submission.ward)}</td>
        <td>${escapeHtml(submission.parentName)}<br><span>${escapeHtml(submission.parentEmail)}</span></td>
        <td>${escapeHtml(submission.submitterIp || "Not captured")}</td>
        <td>${escapeHtml(new Date(submission.submittedAt).toLocaleString())}</td>
        <td><button class="secondary open-pdf" data-id="${escapeHtml(submission.id)}" type="button">Open</button></td>
      </tr>
    `).join("")
    : `<tr><td colspan="6">No submissions yet.</td></tr>`;

  renderActivityCards();
}

function renderActivityCards() {
  if (!elements.activityCards) return;
  const counts = state.submissions.reduce((acc, submission) => {
    const key = submission.activityId || submission.activityName;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  elements.activityCards.innerHTML = state.activities.map((activity) => {
    const pdfUrl = getActivityPdfUrl(activity);
    const defaultCount = Object.keys(activity.defaultValues || {}).filter((key) => activity.defaultValues[key]).length;
    const submissionCount = counts[activity.id] || counts[activity.name] || 0;
    return `
      <article class="activity-card">
        <h3>${escapeHtml(activity.name)}</h3>
        <div class="activity-meta">
          <span>${escapeHtml(activity.dates || "No dates set")}</span>
          <span>${escapeHtml(activity.ward || "No default ward")} · ${defaultCount} preset fields</span>
          <span>${submissionCount} submission${submissionCount === 1 ? "" : "s"}</span>
        </div>
        <div class="actions">
          <button class="secondary edit-activity" data-id="${escapeHtml(activity.id)}" type="button">Edit</button>
          <a class="link-button" href="${escapeHtml(pdfUrl)}" target="_blank" rel="noreferrer">Open PDF</a>
        </div>
      </article>
    `;
  }).join("");
}

async function saveActivity(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  const existing = state.activities.find((item) => item.id === data.id);
  const advancedDefaults = parseDefaultValues(data.defaultValuesJson);
  const defaultValues = {
    ...(existing?.defaultValues || {}),
    ...advancedDefaults,
    city: String(data.defaultCity || advancedDefaults.city || "").trim(),
    state: String(data.defaultState || advancedDefaults.state || "").trim()
  };
  Object.keys(defaultValues).forEach((key) => {
    if (defaultValues[key] === "" || defaultValues[key] === null || defaultValues[key] === undefined) {
      delete defaultValues[key];
    }
  });

  const activity = {
    id: data.id || createId("act"),
    slug: slugify(data.slug || data.name),
    name: String(data.name || "").trim(),
    event: String(data.event || data.name || "").trim(),
    dates: String(data.dates || "").trim(),
    description: String(data.description || "").trim(),
    stake: String(data.stake || "").trim(),
    leaderName: String(data.leaderName || "").trim(),
    leaderPhone: String(data.leaderPhone || "").trim(),
    leaderEmail: String(data.leaderEmail || "").trim(),
    ward: String(data.ward || "").trim(),
    defaultValues,
    pdfTemplatePath: existing?.pdfTemplatePath || "",
    pdfTemplateUrl: String(data.pdfTemplateUrl || existing?.pdfTemplateUrl || "").trim()
  };

  if (!runtime.canBootSupabase) {
    const file = form.elements.pdfFile.files?.[0];
    if (file) {
      activity.pdfTemplateUrl = URL.createObjectURL(file);
    }
    state.activities = [activity, ...state.activities.filter((item) => item.id !== activity.id)];
    saveLocalState();
    renderActivities();
    return;
  }

  const client = getClient();
  const file = form.elements.pdfFile.files?.[0];
  if (file) {
    const filePath = `${activity.slug}/${Date.now()}-${slugify(file.name).replace(/-pdf$/, "")}.pdf`;
    const { error: uploadError } = await client.storage
      .from(getTemplateBucket())
      .upload(filePath, file, { contentType: "application/pdf", upsert: false });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = client.storage.from(getTemplateBucket()).getPublicUrl(filePath);
    activity.pdfTemplatePath = filePath;
    activity.pdfTemplateUrl = publicUrlData.publicUrl;
  }

  const payload = {
    slug: activity.slug,
    name: activity.name,
    event_name: activity.event,
    event_dates: activity.dates,
    event_description: activity.description,
    stake: activity.stake,
    leader_name: activity.leaderName,
    leader_phone: activity.leaderPhone,
    leader_email: activity.leaderEmail,
    default_ward: activity.ward,
    default_values: activity.defaultValues,
    pdf_template_path: activity.pdfTemplatePath || null,
    pdf_template_url: activity.pdfTemplateUrl || null,
    is_active: true
  };
  if (activity.id && !activity.id.startsWith("act_")) payload.id = activity.id;

  const { data: row, error } = await client
    .from("permission_activities")
    .upsert(payload, { onConflict: "slug" })
    .select("*")
    .single();

  if (error) throw error;
  const saved = fromActivityRow(row);
  state.activities = [saved, ...state.activities.filter((item) => item.id !== saved.id && item.slug !== saved.slug)];
  renderActivities();
}

function parseDefaultValues(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("Default values must be a JSON object.");
    }
    return parsed;
  } catch (error) {
    throw new Error(`Default values JSON is invalid: ${error.message}`);
  }
}

function editActivity(activityId) {
  const activity = state.activities.find((item) => item.id === activityId);
  if (!activity) return;
  const form = elements.activityForm;
  form.elements.id.value = activity.id;
  form.elements.name.value = activity.name || "";
  form.elements.slug.value = activity.slug || "";
  form.elements.event.value = activity.event || activity.name || "";
  form.elements.dates.value = activity.dates || "";
  form.elements.stake.value = activity.stake || "";
  form.elements.ward.value = activity.ward || "";
  form.elements.defaultCity.value = activity.defaultValues?.city || "";
  form.elements.defaultState.value = activity.defaultValues?.state || "";
  form.elements.leaderName.value = activity.leaderName || "";
  form.elements.leaderPhone.value = activity.leaderPhone || "";
  form.elements.leaderEmail.value = activity.leaderEmail || "";
  form.elements.description.value = activity.description || "";
  form.elements.pdfTemplateUrl.value = activity.pdfTemplateUrl || "";
  form.elements.defaultValuesJson.value = JSON.stringify(activity.defaultValues || {}, null, 2);
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetActivityForm() {
  elements.activityForm.reset();
  elements.activityForm.elements.id.value = "";
  elements.activityForm.elements.defaultValuesJson.value = "";
}

async function signInAdmin(form) {
  if (!runtime.canBootSupabase) {
    state.adminSession = { email: "demo-admin@example.com" };
    setStatus(elements.adminStatus, "Demo admin mode is active.", "success");
    renderAdmin();
    return;
  }

  const client = getClient();
  const email = form.elements.email.value.trim();
  const password = form.elements.password.value;
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  state.adminSession = data.session;
  setStatus(elements.adminStatus, `Signed in as ${email}.`, "success");
  await loadAdminSubmissions();
  renderAdmin();
}

async function signOutAdmin() {
  if (runtime.canBootSupabase) {
    await getClient().auth.signOut();
  }
  state.adminSession = null;
  setStatus(elements.adminStatus, "Signed out.", "success");
}

function bindEvents() {
  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      elements.tabs.forEach((item) => item.classList.toggle("active", item === tab));
      elements.views.forEach((view) => view.classList.toggle("active", view.id === tab.dataset.view));
    });
  });

  elements.activitySelect.addEventListener("change", applySelectedActivity);

  elements.previewPdf.addEventListener("click", async () => {
    try {
      if (!signatureHasInk()) {
        setStatus(elements.formStatus, "Please draw or adopt a signature before previewing the signed PDF.", "error");
        return;
      }
      setStatus(elements.formStatus, "Building preview PDF...");
      const values = collectFormData();
      const bytes = await generatePdf(values);
      downloadBytes(bytes, `${slugify(values.activityName)}-${slugify(values.participantName || "preview")}.pdf`);
      setStatus(elements.formStatus, "Preview opened in a new tab.", "success");
    } catch (error) {
      setStatus(elements.formStatus, error.message || "Unable to preview the PDF.", "error");
    }
  });

  elements.submissionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!signatureHasInk()) {
      setStatus(elements.formStatus, "Please draw or adopt a signature before submitting.", "error");
      return;
    }

    try {
      setStatus(elements.formStatus, "Creating signed PDF and submitting...");
      const values = collectFormData();
      values.submitterIp = await fetchPublicIpAddress();
      const pdfBytes = await generatePdf(values);
      const submission = await submitToBackend(values, pdfBytes);
      state.submissions = [submission, ...state.submissions.filter((item) => item.id !== submission.id)];
      renderAdmin();
      elements.submissionForm.reset();
      elements.clearSignature.click();
      applySelectedActivity();
      setStatus(elements.formStatus, "Submitted. The signed copy has been saved.", "success");
    } catch (error) {
      setStatus(elements.formStatus, error.message || "Submission failed.", "error");
    }
  });

  elements.adminLogin.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      setStatus(elements.adminStatus, "Signing in...");
      await signInAdmin(elements.adminLogin);
    } catch (error) {
      setStatus(elements.adminStatus, error.message || "Unable to sign in.", "error");
    }
  });

  elements.adminSignOut.addEventListener("click", signOutAdmin);

  elements.activityForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await saveActivity(elements.activityForm);
      resetActivityForm();
      setStatus(elements.adminStatus, "Activity saved. Public links use ?activity=activity-slug.", "success");
    } catch (error) {
      setStatus(elements.adminStatus, error.message || "Unable to save activity.", "error");
    }
  });

  elements.newActivity.addEventListener("click", resetActivityForm);

  elements.refreshAdmin.addEventListener("click", async () => {
    try {
      await loadActivities();
      await loadAdminSubmissions();
      renderActivities();
      renderAdmin();
      setStatus(elements.adminStatus, "Dashboard refreshed.", "success");
    } catch (error) {
      setStatus(elements.adminStatus, error.message || "Unable to refresh.", "error");
    }
  });

  elements.submissionSearch.addEventListener("input", renderAdmin);
  elements.activityFilter.addEventListener("change", renderAdmin);

  elements.activityCards.addEventListener("click", (event) => {
    const button = event.target.closest(".edit-activity");
    if (button) editActivity(button.dataset.id);
  });

  elements.submissionRows.addEventListener("click", async (event) => {
    const button = event.target.closest(".open-pdf");
    if (!button) return;
    const submission = state.submissions.find((item) => item.id === button.dataset.id);
    if (!submission) return;
    try {
      const url = await getPdfUrl(submission);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      setStatus(elements.adminStatus, error.message || "Unable to open PDF.", "error");
    }
  });
}

async function init() {
  setupSignaturePad();
  bindEvents();

  try {
    await loadActivities();
    renderActivities();
    renderAdmin();
  } catch (error) {
    if (!state.activities.length) {
      state.activities = [{ id: "default-activity", ...config.defaultActivity }];
    }
    renderActivities();
    renderAdmin();
    setStatus(elements.formStatus, error.message || "Unable to load activities.", "error");
  }
}

init();
