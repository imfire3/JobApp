const STORAGE_KEY = "wttj_jobs";

const statusEl = document.getElementById("status");
const countEl = document.getElementById("count");
const listEl = document.getElementById("list");
const btnParse = document.getElementById("btn-parse");
const btnExport = document.getElementById("btn-export");
const btnClear = document.getElementById("btn-clear");

function setStatus(message, kind = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${kind}`.trim();
}

async function getJobs() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function setJobs(jobs) {
  await chrome.storage.local.set({ [STORAGE_KEY]: jobs });
}

function render(jobs) {
  countEl.textContent = `${jobs.length} offre(s) en mémoire`;
  listEl.innerHTML = "";

  if (jobs.length === 0) {
    listEl.innerHTML = '<div class="item"><span>Aucune offre pour l’instant.</span></div>';
    return;
  }

  for (const job of [...jobs].reverse().slice(0, 20)) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<strong>${escapeHtml(job.title || "Sans titre")}</strong>
      <span>${escapeHtml(job.company || "—")} · ${escapeHtml(job.url || "")}</span>`;
    listEl.appendChild(div);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n\r]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

function jobsToCsv(jobs) {
  const headers = [
    "source",
    "title",
    "company",
    "location",
    "remote",
    "salary",
    "posted_at",
    "url",
    "apply_url",
    "description",
  ];

  const lines = [headers.join(",")];
  for (const job of jobs) {
    lines.push(headers.map((h) => csvEscape(job[h] ?? "")).join(","));
  }

  // BOM so Excel opens UTF-8 correctly
  return `\uFEFF${lines.join("\n")}`;
}

function downloadCsv(jobs) {
  const csv = jobsToCsv(jobs);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `wttj-jobs-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING" });
    return true;
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    return true;
  }
}

btnParse.addEventListener("click", async () => {
  btnParse.disabled = true;
  setStatus("Parsing…");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      setStatus("Aucun onglet actif.", "err");
      return;
    }

    if (!/welcometothejungle\.com/i.test(tab.url)) {
      setStatus("Ouvre une page offre sur welcometothejungle.com", "err");
      return;
    }

    if (!/\/jobs\//i.test(tab.url)) {
      setStatus("Va sur une page d’offre (/companies/.../jobs/...).", "err");
      return;
    }

    await ensureContentScript(tab.id);

    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "PARSE_WTTJ_JOB",
    });

    if (!response?.ok || !response.job) {
      setStatus(response?.error || "Parse échoué.", "err");
      return;
    }

    const jobs = await getJobs();
    const existingIndex = jobs.findIndex((j) => j.url === response.job.url);
    if (existingIndex >= 0) {
      jobs[existingIndex] = response.job;
      setStatus(`Mis à jour : ${response.job.title}`, "ok");
    } else {
      jobs.push(response.job);
      setStatus(`Ajouté : ${response.job.title}`, "ok");
    }

    await setJobs(jobs);
    render(jobs);
  } catch (error) {
    setStatus(
      error instanceof Error ? error.message : "Erreur extension",
      "err"
    );
  } finally {
    btnParse.disabled = false;
  }
});

btnExport.addEventListener("click", async () => {
  const jobs = await getJobs();
  if (jobs.length === 0) {
    setStatus("Rien à exporter. Ajoute d’abord une offre.", "err");
    return;
  }
  downloadCsv(jobs);
  setStatus(`Exporté ${jobs.length} offre(s) — ouvre le CSV dans Excel.`, "ok");
});

btnClear.addEventListener("click", async () => {
  await setJobs([]);
  render([]);
  setStatus("Mémoire vidée.", "ok");
});

getJobs().then(render);
