/**
 * Floating side panel UI — always present on WTTJ job pages.
 * Collapsed: thin tab on the right. Expanded: full panel.
 * Exports always overwrite one linked base CSV (Excel-compatible).
 *
 * Wrapped to survive re-injection (extension icon / SPA navigations).
 */
(() => {
  if (globalThis.__jobtrackerPanelLoaded) return;
  globalThis.__jobtrackerPanelLoaded = true;

  const JT_ROOT_ID = "jobtracker-wttj-root";
  const STORAGE_KEY = "wttj_jobs";
  const PANEL_OPEN_KEY = "wttj_panel_open";
  const BASE_FILE_META_KEY = "wttj_base_file_meta";
  const HANDLE_DB = "jobtracker-wttj";
  const HANDLE_STORE = "handles";
  const HANDLE_KEY = "baseCsv";
  const DEFAULT_BASE_NAME = "jobtracker-wttj-jobs.csv";
  const JT_DEBUG_VERSION = "1.2.3";
  const DEFAULT_DEBUG_RUN = "post-fix";

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

    return `\uFEFF${lines.join("\n")}`;
  }

  function yieldToUi() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  function openHandleDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(HANDLE_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(HANDLE_STORE)) {
          db.createObjectStore(HANDLE_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error || new Error("IndexedDB error"));
    });
  }

  async function saveBaseHandle(handle) {
    const db = await openHandleDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, "readwrite");
      tx.objectStore(HANDLE_STORE).put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(tx.error || new Error("Failed to save file handle"));
    });
    db.close();
    await chrome.storage.local.set({
      [BASE_FILE_META_KEY]: { name: handle.name || DEFAULT_BASE_NAME },
    });
  }

  async function loadBaseHandle() {
    const db = await openHandleDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(HANDLE_STORE, "readonly");
      const req = tx.objectStore(HANDLE_STORE).get(HANDLE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () =>
        reject(req.error || new Error("Failed to load file handle"));
    });
    db.close();
    return handle || null;
  }

  async function getBaseFileMeta() {
    const data = await chrome.storage.local.get(BASE_FILE_META_KEY);
    return data[BASE_FILE_META_KEY] || null;
  }

  async function ensureWritePermission(handle) {
    const opts = { mode: "readwrite" };
    let current;
    try {
      current = await Promise.race([
        handle.queryPermission(opts),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("queryPermission timeout")), 2500)
        ),
      ]);
    } catch (error) {
      throw error;
    }
    if (current === "granted") return true;

    // requestPermission can hang forever without a fresh user gesture
    try {
      const requested = await Promise.race([
        handle.requestPermission(opts),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("requestPermission timeout")), 2500)
        ),
      ]);
      return requested === "granted";
    } catch (error) {
      return false;
    }
  }

  async function pickBaseFile() {
    if (typeof window.showSaveFilePicker !== "function") {
      throw new Error(
        "Ce navigateur ne permet pas de lier un fichier. Utilise Chrome/Arc."
      );
    }

    const handle = await window.showSaveFilePicker({
      suggestedName: DEFAULT_BASE_NAME,
      types: [
        {
          description: "CSV Excel",
          accept: {
            "text/csv": [".csv"],
            "application/vnd.ms-excel": [".csv"],
          },
        },
      ],
    });

    await saveBaseHandle(handle);
    return handle;
  }

  async function writeJobsToHandle(handle, jobs, onProgress) {
    const report = async (percent, label) => {
      if (typeof onProgress === "function") {
        onProgress(Math.max(0, Math.min(100, percent)), label);
        await yieldToUi();
      }
    };

    await report(0, "Préparation du CSV…");
    const csv = jobsToCsv(jobs);
    const total = Math.max(csv.length, 1);

    await report(8, "Vérification des permissions…");
    const ok = await ensureWritePermission(handle);
    if (!ok) {
      throw new Error("Permission refusée pour écrire le fichier de base.");
    }

    await report(15, "Ouverture du fichier…");
    let writable;
    try {
      writable = await Promise.race([
        handle.createWritable(),
        new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Ouverture fichier trop longue — ferme le CSV dans Excel/Aperçu."
                )
              ),
            4000
          )
        ),
      ]);
    } catch (error) {
      throw error;
    }

    // Write as string chunks so progress paints and Arc/Chrome stay stable
    const chunkCount = Math.max(12, Math.min(40, Math.ceil(total / 4096)));
    const chunkSize = Math.max(1, Math.ceil(total / chunkCount));
    let offset = 0;
    let lastLoggedBucket = -1;

    while (offset < csv.length) {
      const end = Math.min(offset + chunkSize, csv.length);
      await writable.write(csv.slice(offset, end));
      offset = end;
      const writePct = 15 + Math.round((offset / total) * 80);
      await report(writePct, `Écriture… ${writePct}%`);
      const bucket = Math.floor(writePct / 25);
      if (bucket !== lastLoggedBucket) {
        lastLoggedBucket = bucket;
      }
    }

    await report(96, "Fermeture du fichier…");
    await writable.close();
    await report(100, "Fichier à jour");
  }

  function downloadFallbackCsv(jobs) {
    const csv = jobsToCsv(jobs);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = DEFAULT_BASE_NAME;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function writeBaseFile(jobs, { forcePick = false, onProgress } = {}) {
    let handle = forcePick ? null : await loadBaseHandle();

    if (!handle) {
      onProgress?.(2, "Choix du fichier de base…");
      handle = await pickBaseFile();
    }

    try {
      await writeJobsToHandle(handle, jobs, onProgress);
      return handle.name || DEFAULT_BASE_NAME;
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      if (!forcePick) {
        onProgress?.(5, "Fichier inaccessible — nouveau choix…");
        handle = await pickBaseFile();
        await writeJobsToHandle(handle, jobs, onProgress);
        return handle.name || DEFAULT_BASE_NAME;
      }
      throw error;
    }
  }

  async function getJobs() {
    const data = await chrome.storage.local.get(STORAGE_KEY);
    return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
  }

  async function setJobs(jobs) {
    await chrome.storage.local.set({ [STORAGE_KEY]: jobs });
  }

  async function getPanelOpen() {
    const data = await chrome.storage.local.get(PANEL_OPEN_KEY);
    return Boolean(data[PANEL_OPEN_KEY]);
  }

  async function setPanelOpen(open) {
    await chrome.storage.local.set({ [PANEL_OPEN_KEY]: open });
  }

  function buildPanelDom(shadow) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("panel.css");
    shadow.appendChild(link);

    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "jt-tab";
    tab.id = "jt-tab";
    tab.setAttribute("aria-label", "Ouvrir JobTracker");
    tab.setAttribute("aria-expanded", "false");
    tab.setAttribute("aria-controls", "jt-panel");
    tab.textContent = "JobTracker";
    shadow.appendChild(tab);

    const panel = document.createElement("aside");
    panel.className = "jt-panel";
    panel.id = "jt-panel";
    panel.setAttribute("aria-hidden", "true");
    panel.innerHTML = `
      <div class="jt-header">
        <div>
          <h1>JobTracker — WTTJ</h1>
          <p class="sub">Parse l’offre → un seul fichier Excel/CSV</p>
        </div>
        <button type="button" class="jt-close" id="jt-close" aria-label="Masquer le panneau">×</button>
      </div>
      <div class="jt-body">
        <div id="jt-file" class="jt-file">Aucun fichier de base lié</div>
        <div class="jt-row">
          <button id="jt-link" class="secondary" type="button">Lier / créer le fichier</button>
        </div>
        <div class="jt-row">
          <button id="jt-parse" type="button">Ajouter cette offre</button>
        </div>
        <div class="jt-row">
          <button id="jt-export" class="secondary" type="button">Mettre à jour le fichier</button>
          <button id="jt-clear" class="danger" type="button">Vider</button>
        </div>
        <div id="jt-progress" class="jt-progress" hidden>
          <div class="jt-progress-top">
            <span id="jt-progress-label">Écriture…</span>
            <span id="jt-progress-pct">0%</span>
          </div>
          <div class="jt-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="jt-progress-track">
            <div id="jt-progress-bar" class="jt-progress-bar"></div>
          </div>
        </div>
        <div id="jt-status" class="jt-status">Lie un fichier CSV une fois, puis chaque offre le met à jour.</div>
        <div id="jt-count" class="jt-count"></div>
        <div id="jt-list" class="jt-list"></div>
        <p class="jt-hint">
          Un seul fichier est réécrit (pas de copies). Format CSV ouvrant dans Excel.
          Ferme le CSV dans Excel/Aperçu pendant l’écriture.
          Colonnes : source, title, company, location, remote, salary, posted_at, url, apply_url, description.
        </p>
      </div>
    `;
    shadow.appendChild(panel);

    return { tab, panel };
  }

  function wirePanel(shadow, { tab, panel }) {
    const statusEl = shadow.getElementById("jt-status");
    const countEl = shadow.getElementById("jt-count");
    const listEl = shadow.getElementById("jt-list");
    const fileEl = shadow.getElementById("jt-file");
    const btnLink = shadow.getElementById("jt-link");
    const btnParse = shadow.getElementById("jt-parse");
    const btnExport = shadow.getElementById("jt-export");
    const btnClear = shadow.getElementById("jt-clear");
    const btnClose = shadow.getElementById("jt-close");
    const progressEl = shadow.getElementById("jt-progress");
    const progressLabelEl = shadow.getElementById("jt-progress-label");
    const progressPctEl = shadow.getElementById("jt-progress-pct");
    const progressBarEl = shadow.getElementById("jt-progress-bar");
    const progressTrackEl = shadow.getElementById("jt-progress-track");

    const setStatus = (message, kind = "") => {
      statusEl.textContent = message;
      statusEl.className = `jt-status ${kind}`.trim();
    };

    const setProgress = (percent, label) => {
      const pct = Math.max(0, Math.min(100, Math.round(percent)));
      progressEl.hidden = false;
      progressLabelEl.textContent = label || "Écriture…";
      progressPctEl.textContent = `${pct}%`;
      progressBarEl.style.width = `${pct}%`;
      progressTrackEl.setAttribute("aria-valuenow", String(pct));
    };

    const hideProgress = () => {
      progressEl.hidden = true;
      progressBarEl.style.width = "0%";
      progressPctEl.textContent = "0%";
      progressTrackEl.setAttribute("aria-valuenow", "0");
    };

    const renderFile = async () => {
      const meta = await getBaseFileMeta();
      const handle = await loadBaseHandle();
      if (handle || meta?.name) {
        fileEl.textContent = `Fichier de base : ${handle?.name || meta.name}`;
        fileEl.classList.add("linked");
      } else {
        fileEl.textContent = "Aucun fichier de base lié";
        fileEl.classList.remove("linked");
      }
    };

    const render = (jobs) => {
      countEl.textContent = `${jobs.length} offre(s) en mémoire`;
      listEl.innerHTML = "";

      if (jobs.length === 0) {
        listEl.innerHTML =
          '<div class="jt-item"><span>Aucune offre pour l’instant.</span></div>';
        return;
      }

      for (const job of [...jobs].reverse().slice(0, 20)) {
        const div = document.createElement("div");
        div.className = "jt-item";
        div.innerHTML = `<strong>${escapeHtml(job.title || "Sans titre")}</strong>
          <span>${escapeHtml(job.company || "—")} · ${escapeHtml(job.url || "")}</span>`;
        listEl.appendChild(div);
      }
    };

    const setOpen = async (open) => {
      panel.classList.toggle("is-open", open);
      panel.setAttribute("aria-hidden", open ? "false" : "true");
      tab.setAttribute("aria-expanded", open ? "true" : "false");
      await setPanelOpen(open);
    };

    const syncToBaseFile = async (
      jobs,
      { forcePick = false, showProgress = false } = {}
    ) => {
      if (jobs.length === 0) {
        throw new Error("Rien à écrire. Ajoute d’abord une offre.");
      }

      const startedAt = Date.now();
      try {
        if (showProgress) setProgress(0, "Préparation…");
        const name = await writeBaseFile(jobs, {
          forcePick,
          onProgress: showProgress ? setProgress : undefined,
        });
        await renderFile();
        const ms = Date.now() - startedAt;
        if (showProgress) {
          setProgress(100, `Terminé en ${(ms / 1000).toFixed(1)}s`);
        }
        return { name, ms };
      } catch (error) {
        if (error?.name === "AbortError") {
          throw new Error("Sélection du fichier annulée.");
        }
        throw error;
      }
    };

    tab.addEventListener("click", () => {
      void setOpen(true);
    });

    btnClose.addEventListener("click", () => {
      void setOpen(false);
    });

    btnLink.addEventListener("click", async () => {
      try {
        const jobs = await getJobs();
        if (jobs.length === 0) {
          const handle = await pickBaseFile();
          await writeJobsToHandle(handle, []);
          await renderFile();
          setStatus(
            `Fichier lié : ${handle.name}. Ajoute des offres ensuite.`,
            "ok"
          );
          return;
        }

        const { name } = await syncToBaseFile(jobs, { forcePick: true });
        setStatus(`Fichier de base lié et mis à jour : ${name}`, "ok");
      } catch (error) {
        if (error?.name === "AbortError") {
          setStatus("Sélection annulée.", "err");
          return;
        }
        setStatus(
          error instanceof Error ? error.message : "Liaison impossible",
          "err"
        );
      }
    });

    btnParse.addEventListener("click", async () => {
      btnParse.disabled = true;
      btnExport.disabled = true;
      btnLink.disabled = true;
      btnClear.disabled = true;
      setStatus("Parsing de l’offre…");
      setProgress(5, "Extraction…");

      try {
        if (typeof window.__jobtrackerParseWttjJob !== "function") {
          hideProgress();
          setStatus("Parser indisponible sur cette page.", "err");
          return;
        }

        setProgress(15, "Analyse de la page…");
        const job = window.__jobtrackerParseWttjJob();
        if (!job?.url || !job?.description) {
          hideProgress();
          setStatus("Impossible d’extraire l’URL ou la description.", "err");
          return;
        }

        setProgress(35, "Enregistrement en mémoire…");
        const jobs = await getJobs();
        const existingIndex = jobs.findIndex((j) => j.url === job.url);
        if (existingIndex >= 0) {
          jobs[existingIndex] = job;
        } else {
          jobs.push(job);
        }

        await setJobs(jobs);
        render(jobs);
        setStatus(
          `${existingIndex >= 0 ? "Mis à jour" : "Ajouté"} en mémoire : ${job.title}`
        );

        const hasBase = Boolean(await loadBaseHandle());
        if (hasBase) {
          try {
            setProgress(45, "Écriture du CSV…");
            const name = await writeBaseFile(jobs, {
              onProgress: (pct, label) => {
                // Map file-write 0–100 into overall 45–100
                const mapped = 45 + Math.round((pct / 100) * 55);
                setProgress(mapped, label || "Écriture CSV…");
              },
            });
            setProgress(100, "Terminé");
            setStatus(
              `${existingIndex >= 0 ? "Mis à jour" : "Ajouté"} : ${job.title} → ${name}`,
              "ok"
            );
          } catch (error) {
            hideProgress();
            if (error?.name === "AbortError") {
              setStatus(
                `${existingIndex >= 0 ? "Mis à jour" : "Ajouté"} en mémoire. Relie le fichier pour écrire.`,
                "ok"
              );
            } else {
              setStatus(
                `Offre en mémoire. Écriture CSV bloquée : ${
                  error instanceof Error ? error.message : "échec"
                }. Ferme le CSV puis clique « Mettre à jour le fichier ».`,
                "err"
              );
            }
          }
        } else {
          setProgress(100, "En mémoire");
          setStatus(
            `${existingIndex >= 0 ? "Mis à jour" : "Ajouté"} : ${job.title}. Lie un fichier pour l’enregistrer.`,
            "ok"
          );
        }
      } catch (error) {
        hideProgress();
        setStatus(
          error instanceof Error ? error.message : "Erreur extension",
          "err"
        );
      } finally {
        btnParse.disabled = false;
        btnExport.disabled = false;
        btnLink.disabled = false;
        btnClear.disabled = false;
      }
    });

    btnExport.addEventListener("click", async () => {
      btnExport.disabled = true;
      btnLink.disabled = true;
      btnParse.disabled = true;
      btnClear.disabled = true;
      setStatus("Réécriture du fichier CSV…");
      setProgress(0, "Démarrage…");

      try {
        const jobs = await getJobs();
        const { name, ms } = await syncToBaseFile(jobs, { showProgress: true });
        setStatus(
          `Fichier mis à jour : ${name} (${jobs.length} offre(s)) en ${(ms / 1000).toFixed(1)}s`,
          "ok"
        );
      } catch (error) {
        hideProgress();
        const message =
          error instanceof Error ? error.message : "Écriture impossible";
        // Only fall back to download if write truly failed (not user cancel)
        if (!/annul/i.test(message)) {
          try {
            const jobs = await getJobs();
            if (jobs.length > 0) downloadFallbackCsv(jobs);
            setStatus(
              `${message}. Ferme le CSV (Excel/Aperçu) puis réessaie. Secours : ${DEFAULT_BASE_NAME}`,
              "err"
            );
            return;
          } catch {
            // ignore secondary failure
          }
        }
        setStatus(message, "err");
      } finally {
        btnExport.disabled = false;
        btnLink.disabled = false;
        btnParse.disabled = false;
        btnClear.disabled = false;
      }
    });

    btnClear.addEventListener("click", async () => {
      await setJobs([]);
      render([]);

      const handle = await loadBaseHandle();
      if (handle) {
        try {
          await writeJobsToHandle(handle, []);
          setStatus(
            "Mémoire vidée et fichier de base réinitialisé (en-têtes seuls).",
            "ok"
          );
        } catch {
          setStatus(
            "Mémoire vidée. Impossible d’écrire le fichier (ferme-le puis re-lie-le).",
            "err"
          );
        }
      } else {
        setStatus("Mémoire vidée.", "ok");
      }
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type === "TOGGLE_PANEL") {
        const next = !panel.classList.contains("is-open");
        void setOpen(next).then(() => sendResponse({ ok: true, open: next }));
        return true;
      }
      if (message?.type === "OPEN_PANEL") {
        void setOpen(true).then(() => sendResponse({ ok: true, open: true }));
        return true;
      }
      return false;
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      if (changes[STORAGE_KEY]) {
        const jobs = Array.isArray(changes[STORAGE_KEY].newValue)
          ? changes[STORAGE_KEY].newValue
          : [];
        render(jobs);
      }
      if (changes[BASE_FILE_META_KEY]) {
        void renderFile();
      }
    });

    void (async () => {
      const open = await getPanelOpen();
      await setOpen(open);
      await renderFile();
      render(await getJobs());
    })();
  }

  function ensureSidePanel() {
    if (document.getElementById(JT_ROOT_ID)) return;

    const host = document.createElement("div");
    host.id = JT_ROOT_ID;
    const shadow = host.attachShadow({ mode: "open" });
    const parts = buildPanelDom(shadow);
    document.documentElement.appendChild(host);
    wirePanel(shadow, parts);
  }

  ensureSidePanel();
})();
