import fs from "node:fs";
import path from "node:path";

const explicitFiles = [
  "components/dashboard/dashboard-glance.tsx",
  "components/dashboard/dashboard-journey.tsx",
  "components/dashboard/dashboard-kpis.tsx",
  "components/dashboard/dashboard-overview.tsx",
  "components/dashboard/dashboard-profile-progress.tsx",
  "components/dashboard/dashboard-recommendation.tsx",
  "components/dashboard/dashboard-states.tsx",
  "components/dashboard/dashboard-surface.tsx",
  "components/dashboard/dashboard-tips.tsx",
  "components/dashboard/job-card.tsx",
  "components/dashboard/job-filters.tsx",
  "components/jobs/tracked-jobs-page.tsx",
  "components/jobs/lab/job-detail-lab-page.tsx",
  "app/applications/page.tsx",
];

function collectTsx(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTsx(entryPath);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [entryPath] : [];
  });
}

const files = [
  ...explicitFiles,
  ...collectTsx("components/jobs/analysis"),
].filter((file, index, all) => all.indexOf(file) === index);

const rawColor = /#[\da-f]{3,8}\b|\brgba?\s*\(|\b(?:text|bg|border)-(?:white|black)\b/i;
const violations = [];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (rawColor.test(line)) {
      violations.push(`${file}:${index + 1}: ${line.trim()}`);
    }
  });
}

if (violations.length) {
  console.error("Couleurs littérales trouvées dans les écrans migrés :\n");
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`OK — aucun hex/RGB brut dans ${files.length} fichiers d’interface migrés.`);
}
