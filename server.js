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

function createJob({
  title,
  company,
  location,
  description,
  source,
  url,
  postedAt,
  status,
}) {
  const job = {
    id: nextJobId++,
    title,
    company,
    location: location || "Unspecified",
    description: description || "",
    source: source || "Manual",
    url: url || null,
    postedAt: postedAt || new Date().toISOString(),
    status: status || "open",
    createdAt: new Date().toISOString(),
    applications: [],
  };
  jobs.push(job);
  return job;
}

// Mock "Welcome to the Jungle" dataset. This is fake data used to test the MVP
// import flow locally — no scraping, no external calls, no database.
const WTTJ_MOCK_JOBS = [
  {
    title: "Product Owner",
    company: "Doctolib",
    location: "Paris, France",
    description:
      "Own the roadmap for a patient-facing product line, write user stories and prioritize the backlog with engineering.",
    url: "https://www.welcometothejungle.com/fr/jobs/product-owner-doctolib",
  },
  {
    title: "Senior Product Manager",
    company: "Qonto",
    location: "Paris, France (Hybrid)",
    description:
      "Drive discovery and delivery for the payments squad, from problem framing to measurable business impact.",
    url: "https://www.welcometothejungle.com/fr/jobs/senior-product-manager-qonto",
  },
  {
    title: "Product Owner",
    company: "BlaBlaCar",
    location: "Remote (France)",
    description:
      "Coordinate cross-functional teams to ship features that improve the carpooling experience for millions of members.",
    url: "https://www.welcometothejungle.com/fr/jobs/product-owner-blablacar",
  },
  {
    title: "Product Manager - Growth",
    company: "Alan",
    location: "Paris, France",
    description:
      "Lead growth experiments across acquisition and activation, working closely with data and marketing.",
    url: "https://www.welcometothejungle.com/fr/jobs/product-manager-growth-alan",
  },
  {
    title: "Technical Product Owner",
    company: "Payfit",
    location: "Lyon, France (Hybrid)",
    description:
      "Bridge product and platform engineering to deliver reliable payroll automation at scale.",
    url: "https://www.welcometothejungle.com/fr/jobs/technical-product-owner-payfit",
  },
  {
    title: "Product Manager",
    company: "Back Market",
    location: "Bordeaux, France",
    description:
      "Shape the seller experience for refurbished electronics and champion a circular economy mission.",
    url: "https://www.welcometothejungle.com/fr/jobs/product-manager-back-market",
  },
  {
    title: "Lead Product Manager",
    company: "Swile",
    location: "Montpellier, France",
    description:
      "Manage a team of PMs and set product strategy for employee benefits and meal vouchers.",
    url: "https://www.welcometothejungle.com/fr/jobs/lead-product-manager-swile",
  },
  {
    title: "Product Owner - Mobile",
    company: "Ledger",
    location: "Paris, France (Hybrid)",
    description:
      "Define and prioritize the mobile wallet roadmap, balancing security constraints with a smooth UX.",
    url: "https://www.welcometothejungle.com/fr/jobs/product-owner-mobile-ledger",
  },
  {
    title: "Product Manager - Data",
    company: "Contentsquare",
    location: "Remote (Europe)",
    description:
      "Own the analytics product area and turn behavioral data into actionable insights for enterprise customers.",
    url: "https://www.welcometothejungle.com/fr/jobs/product-manager-data-contentsquare",
  },
  {
    title: "Junior Product Owner",
    company: "Mirakl",
    location: "Paris, France",
    description:
      "Support senior POs on marketplace features, refine tickets and run sprint ceremonies.",
    url: "https://www.welcometothejungle.com/fr/jobs/junior-product-owner-mirakl",
  },
];

function randomPostedWithin24h() {
  const offsetMs = Math.floor(Math.random() * 24 * 60 * 60 * 1000);
  return new Date(Date.now() - offsetMs).toISOString();
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

// Mock import of "Welcome to the Jungle" jobs. Deduplicates by url so repeated
// calls do not create the same job twice.
app.post("/api/import/wttj/mock", (_req, res) => {
  let imported = 0;
  let duplicates = 0;

  for (const mock of WTTJ_MOCK_JOBS) {
    const alreadyExists = jobs.some((j) => j.url === mock.url);
    if (alreadyExists) {
      duplicates++;
      continue;
    }
    createJob({
      ...mock,
      source: "Welcome to the Jungle",
      postedAt: randomPostedWithin24h(),
      status: "open",
    });
    imported++;
  }

  res.status(201).json({
    imported,
    duplicates,
    total: imported + duplicates,
  });
});

seed();

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`JobApp running on http://localhost:${PORT}`);
  });
}

export { app };
