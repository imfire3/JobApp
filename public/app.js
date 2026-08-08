const jobsEl = document.getElementById("jobs");
const jobCountEl = document.getElementById("job-count");
const jobForm = document.getElementById("job-form");
const jobMsg = document.getElementById("job-msg");
const importBtn = document.getElementById("import-wttj");
const importMsg = document.getElementById("import-msg");
const exportExcelBtn = document.getElementById("export-excel");
const exportCsvBtn = document.getElementById("export-csv");
const exportMsg = document.getElementById("export-msg");

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

loadJobs();
