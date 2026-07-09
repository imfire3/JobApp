const jobsEl = document.getElementById("jobs");
const jobCountEl = document.getElementById("job-count");
const jobForm = document.getElementById("job-form");
const jobMsg = document.getElementById("job-msg");

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
  wrap.innerHTML = `
    <div class="job-head">
      <div>
        <h3>${escapeHtml(job.title)}</h3>
        <div class="meta">${escapeHtml(job.company)} &middot; ${escapeHtml(job.location)}</div>
      </div>
      <span class="badge">${count} applicant${count === 1 ? "" : "s"}</span>
    </div>
    <p class="desc">${escapeHtml(job.description || "")}</p>
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

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

loadJobs();
