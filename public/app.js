const jobsEl = document.getElementById("jobs");
const jobCountEl = document.getElementById("job-count");
const jobForm = document.getElementById("job-form");
const jobMsg = document.getElementById("job-msg");
const importBtn = document.getElementById("import-wttj");
const importMsg = document.getElementById("import-msg");
const exportExcelBtn = document.getElementById("export-excel");
const exportCsvBtn = document.getElementById("export-csv");
const exportMsg = document.getElementById("export-msg");
const userProfileEl = document.getElementById("user-profile");

let authConfig = { googleEnabled: false, appleEnabled: false };
let currentUser = null;

async function loadAuthConfig() {
  try {
    const res = await fetch("/api/auth/config");
    authConfig = await res.json();
  } catch (err) {
    console.error("Failed to load auth config:", err);
  }
}

async function loadUser() {
  try {
    const res = await fetch("/api/auth/user");
    const data = await res.json();
    if (data.authenticated) {
      currentUser = data.user;
      renderUserProfile(currentUser);
    } else {
      currentUser = null;
      renderLoginButtons();
    }
  } catch (err) {
    console.error("Failed to load user:", err);
    renderLoginButtons();
  }
}

function renderUserProfile(user) {
  userProfileEl.innerHTML = `
    <div class="user-info">
      ${user.photo ? `<img src="${escapeHtml(user.photo)}" alt="${escapeHtml(user.name)}" class="user-photo" />` : `<div class="user-avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</div>`}
      <div class="user-details">
        <div class="user-name">${escapeHtml(user.name)}</div>
        <div class="user-email">${escapeHtml(user.email)}</div>
      </div>
      <a href="/auth/logout" class="btn-logout">Logout</a>
    </div>
  `;
}

function renderLoginButtons() {
  const buttons = [];
  
  if (authConfig.googleEnabled) {
    buttons.push(`<a href="/auth/google" class="btn-auth btn-google">
      <svg width="18" height="18" viewBox="0 0 18 18">
        <path fill="#4285F4" d="M17.64,9.2c0-0.63-0.06-1.25-0.16-1.84H9v3.49h4.84c-0.21,1.12-0.84,2.07-1.8,2.71v2.26h2.92C16.66,14.09,17.64,11.85,17.64,9.2z"/>
        <path fill="#34A853" d="M9,18c2.43,0,4.47-0.81,5.96-2.18l-2.92-2.26c-0.81,0.54-1.84,0.86-3.04,0.86c-2.34,0-4.32-1.58-5.03-3.71H0.96v2.33C2.44,15.98,5.48,18,9,18z"/>
        <path fill="#FBBC05" d="M3.97,10.71c-0.18-0.54-0.28-1.11-0.28-1.71s0.1-1.17,0.28-1.71V4.96H0.96C0.35,6.18,0,7.55,0,9s0.35,2.82,0.96,4.04L3.97,10.71z"/>
        <path fill="#EA4335" d="M9,3.58c1.32,0,2.51,0.45,3.44,1.35l2.58-2.58C13.46,0.89,11.43,0,9,0C5.48,0,2.44,2.02,0.96,4.96l3.01,2.33C4.68,5.16,6.66,3.58,9,3.58z"/>
      </svg>
      Sign in with Google
    </a>`);
  }
  
  if (authConfig.appleEnabled) {
    buttons.push(`<a href="/auth/apple" class="btn-auth btn-apple">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor">
        <path d="M14.94 5.19A4.38 4.38 0 0 0 13 9.5c-.01 1.95 1.11 3.63 2.69 4.5-.32.92-.71 1.78-1.18 2.58-.68 1.11-1.38 2.21-2.48 2.23-1.07.02-1.42-.63-2.65-.63s-1.6.61-2.6.65c-1.07.04-1.87-1.21-2.56-2.33C2.78 14.34 2 11.09 3.5 8.82a4.8 4.8 0 0 1 4.03-2.48c1.05-.02 2.05.71 2.69.71.64 0 1.84-.88 3.11-.75.53.02 2.01.21 2.96 1.59-.08.05-1.76 1.03-1.75 3.07.01 2.43 2.13 3.25 2.15 3.26-.02.07-.34 1.14-1.11 2.27-.67.98-1.37 1.96-2.47 1.98-1.07.02-1.42-.63-2.65-.63s-1.6.61-2.6.65c-1.07.04-1.87-1.21-2.56-2.33C2.78 14.34 2 11.09 3.5 8.82a4.8 4.8 0 0 1 4.03-2.48c1.05-.02 2.05.71 2.69.71.64 0 1.84-.88 3.11-.75.53.02 2.01.21 2.96 1.59M12.16 2.56c.56.68.99 1.62.88 2.57-1.04-.04-2.28-.7-3.02-1.58-.66-.77-1.24-2-1.02-3.18 1.07.08 2.16.73 2.88 1.57"/>
      </svg>
      Sign in with Apple
    </a>`);
  }
  
  if (buttons.length === 0) {
    userProfileEl.innerHTML = `<div class="auth-notice">Authentication not configured</div>`;
  } else {
    userProfileEl.innerHTML = `<div class="auth-buttons">${buttons.join("")}</div>`;
  }
}

async function loadJobs() {
  const res = await fetch("/api/jobs");
  const jobs = await res.json();
  jobCountEl.textContent = jobs.length;
  jobsEl.innerHTML = "";
  for (const job of jobs.slice().reverse()) {
    jobsEl.appendChild(renderJob(job));
  }
}

function renderJob(job) {
  const wrap = document.createElement("div");
  wrap.className = "job";
  const count = job.applications.length;
  const status = job.status || "open";
  const source = job.source || "Manual";
  const tags = [
    `<span class="tag source">${escapeHtml(source)}</span>`,
    `<span class="tag status status-${escapeHtml(status)}">${escapeHtml(status)}</span>`,
  ];
  if (job.postedAt) {
    tags.push(
      `<span class="tag time" title="${escapeHtml(job.postedAt)}">posted ${timeAgo(job.postedAt)}</span>`,
    );
  }
  const link = job.url
    ? `<a class="joblink" href="${escapeHtml(job.url)}" target="_blank" rel="noopener noreferrer">View offer &#8599;</a>`
    : "";
  wrap.innerHTML = `
    <div class="job-head">
      <div>
        <h3>${escapeHtml(job.title)}</h3>
        <div class="meta">${escapeHtml(job.company)} &middot; ${escapeHtml(job.location)}</div>
      </div>
      <span class="badge">${count} applicant${count === 1 ? "" : "s"}</span>
    </div>
    <div class="tags">${tags.join("")}</div>
    <p class="desc">${escapeHtml(job.description || "")}</p>
    ${link}
    <form class="apply">
      <input name="name" placeholder="Your name" required />
      <input name="email" type="email" placeholder="Your email" required />
      <button type="submit">Apply</button>
    </form>
    <p class="msg"></p>
  `;
  const form = wrap.querySelector("form.apply");
  const msg = wrap.querySelector(".msg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
    };
    const res = await fetch(`/api/jobs/${job.id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      msg.textContent = `Application submitted for ${body.name}!`;
      msg.className = "msg ok";
      form.reset();
      loadJobs();
    } else {
      const err = await res.json();
      msg.textContent = err.error || "Something went wrong";
      msg.className = "msg err";
    }
  });
  return wrap;
}

jobForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    title: jobForm.title.value.trim(),
    company: jobForm.company.value.trim(),
    location: jobForm.location.value.trim(),
    description: jobForm.description.value.trim(),
  };
  const res = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    jobMsg.textContent = "Job posted!";
    jobMsg.className = "msg ok";
    jobForm.reset();
    loadJobs();
  } else {
    const err = await res.json();
    jobMsg.textContent = err.error || "Something went wrong";
    jobMsg.className = "msg err";
  }
});

importBtn.addEventListener("click", async () => {
  importBtn.disabled = true;
  importMsg.textContent = "Importing from Welcome to the Jungle...";
  importMsg.className = "msg";
  try {
    const res = await fetch("/api/import/wttj/mock", { method: "POST" });
    const summary = await res.json();
    if (res.ok) {
      importMsg.textContent = `Imported ${summary.imported} job${summary.imported === 1 ? "" : "s"}, ${summary.duplicates} duplicate${summary.duplicates === 1 ? "" : "s"} skipped (out of ${summary.total}).`;
      importMsg.className = "msg ok";
      loadJobs();
    } else {
      importMsg.textContent = summary.error || "Import failed";
      importMsg.className = "msg err";
    }
  } catch (err) {
    importMsg.textContent = "Import failed";
    importMsg.className = "msg err";
  } finally {
    importBtn.disabled = false;
  }
});

// Export to Excel
exportExcelBtn.addEventListener("click", async () => {
  exportExcelBtn.disabled = true;
  exportMsg.textContent = "Generating Excel file...";
  exportMsg.className = "msg";
  
  try {
    const res = await fetch("/api/export/excel");
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `JobApp_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      exportMsg.textContent = `✅ Excel file downloaded successfully!`;
      exportMsg.className = "msg ok";
      setTimeout(() => {
        exportMsg.textContent = "";
      }, 3000);
    } else {
      exportMsg.textContent = "Export failed";
      exportMsg.className = "msg err";
    }
  } catch (err) {
    exportMsg.textContent = "Export failed: " + err.message;
    exportMsg.className = "msg err";
  } finally {
    exportExcelBtn.disabled = false;
  }
});

// Export to CSV
exportCsvBtn.addEventListener("click", async () => {
  exportCsvBtn.disabled = true;
  exportMsg.textContent = "Generating CSV file...";
  exportMsg.className = "msg";
  
  try {
    const res = await fetch("/api/export/csv");
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `JobApp_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      exportMsg.textContent = `✅ CSV file downloaded successfully!`;
      exportMsg.className = "msg ok";
      setTimeout(() => {
        exportMsg.textContent = "";
      }, 3000);
    } else {
      exportMsg.textContent = "Export failed";
      exportMsg.className = "msg err";
    }
  } catch (err) {
    exportMsg.textContent = "Export failed: " + err.message;
    exportMsg.className = "msg err";
  } finally {
    exportCsvBtn.disabled = false;
  }
});

function timeAgo(iso) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "recently";
  const diffMs = Date.now() - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

// Initialize authentication and load jobs
(async function init() {
  await loadAuthConfig();
  await loadUser();
  loadJobs();
})();
