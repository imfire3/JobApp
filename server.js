import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import XLSX from "xlsx";

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

// Export jobs to Excel (XLSX format)
app.get("/api/export/excel", (_req, res) => {
  try {
    // Prepare data for Excel
    const exportData = jobs.map((job) => ({
      ID: job.id,
      Title: job.title,
      Company: job.company,
      Location: job.location,
      Description: job.description,
      Source: job.source,
      URL: job.url || "",
      "Posted At": new Date(job.postedAt).toLocaleString(),
      Status: job.status,
      "Applications": job.applications.length,
      "Created At": new Date(job.createdAt).toLocaleString(),
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(exportData);

    // Auto-size columns
    const colWidths = [
      { wch: 5 },  // ID
      { wch: 30 }, // Title
      { wch: 20 }, // Company
      { wch: 25 }, // Location
      { wch: 50 }, // Description
      { wch: 25 }, // Source
      { wch: 50 }, // URL
      { wch: 20 }, // Posted At
      { wch: 10 }, // Status
      { wch: 12 }, // Applications
      { wch: 20 }, // Created At
    ];
    worksheet["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");

    // Generate buffer
    const excelBuffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Set headers for download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=JobApp_Export_${new Date().toISOString().split('T')[0]}.xlsx`
    );

    res.send(excelBuffer);
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ error: "Failed to export Excel file" });
  }
});

// Export jobs to CSV format
app.get("/api/export/csv", (_req, res) => {
  try {
    // Prepare data for CSV
    const exportData = jobs.map((job) => ({
      ID: job.id,
      Title: job.title,
      Company: job.company,
      Location: job.location,
      Description: job.description.replace(/,/g, ";").replace(/\n/g, " "), // Escape commas and newlines
      Source: job.source,
      URL: job.url || "",
      "Posted At": new Date(job.postedAt).toLocaleString(),
      Status: job.status,
      Applications: job.applications.length,
      "Created At": new Date(job.createdAt).toLocaleString(),
    }));

    // Create workbook and convert to CSV
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);

    // Set headers for download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=JobApp_Export_${new Date().toISOString().split('T')[0]}.csv`
    );

    // Add BOM for Excel compatibility with UTF-8
    res.send("\uFEFF" + csvContent);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({ error: "Failed to export CSV file" });
  }
});

seed();

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`JobApp running on http://localhost:${PORT}`);
  });
}

export { app };
