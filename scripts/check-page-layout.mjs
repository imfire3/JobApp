import { chromium } from "playwright";

/**
 * Vérifie que les pages applicatives occupent toute la largeur disponible
 * sans débordement horizontal. À lancer après `npm run dev`.
 *
 * Ce script est volontairement séparé de la suite de tests : il nécessite
 * un navigateur et un serveur de développement actif.
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.TEST_EMAIL ?? "admin@gmail.com";
const PASSWORD = process.env.TEST_PASSWORD ?? "admin";

const widths = [390, 768, 1440, 1920];
const pages = [
  { name: "Tableau de bord", path: "/dashboard" },
  { name: "Offres", path: "/jobs" },
  { name: "Entreprises", path: "/companies" },
  { name: "Recherche IA", path: "/research" },
  { name: "Candidatures", path: "/applications" },
  { name: "Extension", path: "/extension" },
  { name: "Sources", path: "/sources" },
  { name: "Profil & CV", path: "/profile-ai" },
  { name: "Compte", path: "/settings" },
];

async function dismissOverlays(page) {
  for (const label of ["Plus tard", "J'ai compris", "Fermer"]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.count()) {
      await btn.first().click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(300);
    }
  }
}

async function measurePage(page, route, width) {
  const height = width < 768 ? 844 : 900;
  await page.setViewportSize({ width, height });
  await page.goto(`${BASE_URL}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await dismissOverlays(page);
  await page.waitForTimeout(300);

  return page.evaluate(() => {
    const main = document.querySelector("#main-content");
    if (!main) return { error: "#main-content introuvable" };
    const mainRect = main.getBoundingClientRect();
    const offenders = [];
    for (const el of document.querySelectorAll("main *")) {
      const style = getComputedStyle(el);
      if (style.position === "fixed") continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.right > mainRect.right + 2) {
        let parent = el.parentElement;
        let scrollable = false;
        while (parent && parent !== main) {
          const ps = getComputedStyle(parent);
          if (["auto", "scroll", "hidden"].includes(ps.overflowX)) {
            scrollable = true;
            break;
          }
          parent = parent.parentElement;
        }
        if (!scrollable) {
          offenders.push({
            tag: el.tagName,
            cls: String(el.className).slice(0, 100),
            right: Math.round(r.right),
            mainRight: Math.round(mainRect.right),
          });
        }
      }
    }
    return {
      pageScroll: main.scrollWidth - main.clientWidth,
      bodyScroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      offenders: offenders.slice(0, 5),
      mainWidth: Math.round(mainRect.width),
    };
  });
}

async function discoverDetailIds(page) {
  return page.evaluate(async () => {
    const [jobs, companies] = await Promise.all([
      fetch("/api/jobs").then((r) => r.json()).catch(() => ({})).then((d) => d.jobs ?? []),
      fetch("/api/companies").then((r) => r.json()).catch(() => ({})).then((d) => d.companies ?? []),
    ]);
    const routes = [];
    if (jobs[0]?.id) routes.push(`/jobs/${jobs[0].id}`, `/jobs/${jobs[0].id}/lab`);
    if (companies[0]?.id) routes.push(`/companies/${companies[0].id}`);
    routes.push("/jobs/searches/new");
    return routes;
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
await page.addInitScript(() => {
  try {
    window.localStorage.setItem("jobtracker_extension_seen", "1");
  } catch {}
});

await page.goto(`${BASE_URL}/login`);
await page.fill("#identifier", EMAIL);
await page.fill("#password", PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 20000 }).catch(() => {});

const detailRoutes = await discoverDetailIds(page);

let problems = 0;
const allRoutes = [
  ...pages.map((p) => ({ name: p.name, path: p.path })),
  ...detailRoutes.map((path) => ({ name: path, path })),
];

for (const { name, path: routePath } of allRoutes) {
  for (const width of widths) {
    const report = await measurePage(page, routePath, width);
    const bad =
      (report.pageScroll ?? 0) > 1 ||
      (report.bodyScroll ?? 0) > 1 ||
      (report.offenders && report.offenders.length);
    if (bad) {
      problems++;
      console.log(`✗ ${name} (${routePath}) @${width}px`, JSON.stringify(report));
    } else {
      console.log(`✓ ${name} (${routePath}) @${width}px — mainWidth=${report.mainWidth}`);
    }
  }
}

await browser.close();
process.exit(problems === 0 ? 0 : 1);
