import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "public")));

// In-memory data store. Replace with a real database when the app grows.
let nextJobId = 1;
const jobs = [];

function seed() {
  createJob({
    title: "Frontend Engineer",
    company: "Acme Corp",
    location: "Remote",
    description: "Build delightful UIs with modern web tooling.",
  });
  createJob({
    title: "Backend Engineer",
    company: "Globex",
    location: "New York, NY",
    description: "Design and scale APIs and data pipelines.",
  });
}

function createJob({ title, company, location, description }) {
  const job = {
    id: nextJobId++,
    title,
    company,
    location: location || "Unspecified",
    description: description || "",
    createdAt: new Date().toISOString(),
    applications: [],
  };
  jobs.push(job);
  return job;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", jobs: jobs.length });
});

app.get("/api/jobs", (_req, res) => {
  res.json(jobs);
});

app.post("/api/jobs", (req, res) => {
  const { title, company, location, description } = req.body || {};
  if (!title || !company) {
    return res
      .status(400)
      .json({ error: "title and company are required" });
  }
  const job = createJob({ title, company, location, description });
  res.status(201).json(job);
});

app.post("/api/jobs/:id/apply", (req, res) => {
  const job = jobs.find((j) => j.id === Number(req.params.id));
  if (!job) {
    return res.status(404).json({ error: "job not found" });
  }
  const { name, email } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ error: "name and email are required" });
  }
  const application = { name, email, appliedAt: new Date().toISOString() };
  job.applications.push(application);
  res.status(201).json({ job: job.id, application });
});

seed();

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`JobApp running on http://localhost:${PORT}`);
  });
}

export { app };
