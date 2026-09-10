/**
 * Capture crisp dark landing screens with seeded fake data.
 * Usage: node scripts/capture-landing-screens.mjs
 */
import { chromium } from "playwright"
import fs from "fs"
import path from "path"

const BASE = "http://localhost:3000"
const OUT = path.join(process.cwd(), "public", "landing")
const DOCS = path.join(process.cwd(), "docs", "screenshots")

const CV = `Vincent Giacalone
Product Manager / Product Owner — Paris

Expérience
Product Owner — Onboarding & Conversion, Fortuneo (2024 – 2025)
- +9 % de conversion d'ouverture de compte via optimisation du funnel d'onboarding
- Backlog, ateliers de découverte, coordination delivery

Product Owner — Growth & Acquisition, Choisir by Impala (2022 – 2024)
- Acquisition, parcours utilisateur, A/B testing
- Collaboration design, data et marketing

Product Designer — UX / Discovery, Unlatch (2020 – 2022)
- Research, wireframes, ateliers stakeholders

Compétences: Product Management, Roadmap, Agile, SQL, Figma, A/B testing
Formation: Master Management
`

const COVER = `Madame, Monsieur,

Je vous contacte au sujet du poste de Product Owner. Mon parcours chez Fortuneo et Choisir by Impala m'a permis de piloter des roadmaps, d'animer des ateliers de découverte et de coordonner la livraison avec design et engineering.

Chez Fortuneo, j'ai contribué à une hausse de 9 % de la conversion d'ouverture de compte en optimisant le funnel d'onboarding. Je souhaite apporter cette approche produit, centrée preuves et résultats, à votre équipe.

Je serais ravi d'échanger sur la mission.

Cordialement,
Vincent Giacalone
`

async function dismiss(page) {
  for (const label of ["Plus tard", "J’ai compris", "J'ai compris", "Passer", "Skip", "Close", "Fermer"]) {
    const btn = page.getByRole("button", { name: new RegExp(label, "i") })
    if (await btn.count()) {
      await btn.first().click({ timeout: 800 }).catch(() => {})
      await page.waitForTimeout(200)
    }
  }
}

async function gotoApp(page, url) {
  await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 60000 })
  await page.waitForTimeout(1100)
  await dismiss(page)
}

async function polish(page) {
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-toast], [data-sonner-toaster] { display:none!important; }`,
  }).catch(() => {})
  await page.evaluate(() => {
    document.documentElement.classList.add("dark")
    document.documentElement.classList.remove("light")
    localStorage.setItem("theme", "dark")
    for (const el of document.querySelectorAll("button, a, span, div")) {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim()
      if (
        t === "Reset → LP" ||
        t === "Fake fill data" ||
        t === "Fake fill…" ||
        t.startsWith("Fake fill")
      ) {
        el.style.setProperty("display", "none", "important")
      }
    }
  })
}

async function save(page, name) {
  await polish(page)
  await page.waitForTimeout(300)
  const file = path.join(OUT, name)
  await page.screenshot({ path: file, fullPage: false, type: "png" })
  fs.copyFileSync(file, path.join(DOCS, name))
  console.log("saved", name, fs.statSync(file).size)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  fs.mkdirSync(DOCS, { recursive: true })

  const email = `shot+${Date.now().toString(36)}@jobapp.local`
  const password = "password1"

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    localStorage.setItem("theme", "dark")
    document.documentElement.classList.add("dark")
  })

  console.log("signup", (await context.request.post(`${BASE}/api/auth/signup`, {
    data: { identifier: email, password },
  })).status())
  console.log("login", (await context.request.post(`${BASE}/api/auth/login`, {
    data: { identifier: email, password },
  })).status())

  const profileRes = await context.request.put(`${BASE}/api/profile`, {
    data: {
      cv_text: CV,
      first_name: "Vincent",
      last_name: "Giacalone",
      current_title: "Product Manager / Product Owner",
      bio: "PO/PM orienté growth, onboarding et delivery.",
      skills: ["Product Management", "Agile", "SQL", "Figma", "A/B testing"],
      experience_entries: undefined,
      target_roles: ["Product Owner", "Product Manager"],
      target_locations: ["Paris"],
      profile_reviewed: true,
    },
  })
  console.log("profile", profileRes.status())

  console.log("onboarding", (await context.request.patch(`${BASE}/api/onboarding`, {
    data: { completed: true },
  })).status())

  await gotoApp(page, "/dashboard")
  if (page.url().includes("/login")) throw new Error("auth failed")

  // Fake fill jobs (same as UI button)
  const seed = await context.request.post(`${BASE}/api/dev/seed-jobs`, {
    data: { count: 16 },
    headers: { "content-type": "application/json" },
  })
  const seedText = await seed.text()
  console.log("seed", seed.status(), seedText.slice(0, 160))
  if (seed.status() !== 200) {
    const sample = await context.request.post(`${BASE}/api/import-jobs/sample`)
    console.log("sample", sample.status(), (await sample.text()).slice(0, 160))
  }

  const jobs = ((await (await context.request.get(`${BASE}/api/jobs`)).json()).jobs) || []
  const jobId = jobs[0]?.id
  console.log("jobs", jobs.length, "first", jobId)

  if (jobId) {
    // Analyze for richer match / optimize screens
    const analyze = await context.request.post(`${BASE}/api/analyze-job`, {
      data: { jobId },
      timeout: 120000,
    })
    console.log("analyze", analyze.status(), (await analyze.text()).slice(0, 180))

    await context.request.patch(`${BASE}/api/jobs`, {
      data: { id: jobId, cover_letter: COVER, selected: true },
    })

    await context.request.post(`${BASE}/api/applications`, {
      data: {
        job_id: jobId,
        company: jobs[0].company || "Alan",
        position: jobs[0].title || "Product Owner",
        status: "hr_interview",
        notes: "Super échange, suite technique à planifier.",
        interview_date: new Date(Date.now() + 86400000).toISOString(),
        date_applied: new Date().toISOString().slice(0, 10),
        generated_cover_letter: COVER,
      },
    }).then(async (r) => console.log("application", r.status(), (await r.text()).slice(0, 120)))
      .catch((e) => console.log("application err", e.message))
  }

  await page.reload({ waitUntil: "domcontentloaded" })
  await page.waitForTimeout(1000)
  await dismiss(page)
  await save(page, "screen-dashboard.png")

  await gotoApp(page, "/jobs")
  await page.waitForTimeout(700)
  await save(page, "screen-jobs.png")

  await gotoApp(page, "/imports")
  const csvTab = page.getByRole("button", { name: /CSV\s*\/\s*Excel/i })
  if (await csvTab.count()) await csvTab.first().click().catch(() => {})
  await page.waitForTimeout(400)
  await save(page, "screen-imports.png")

  await gotoApp(page, "/extension")
  await save(page, "screen-extension.png")

  await gotoApp(page, "/profile-ai")
  await page.waitForTimeout(600)
  await save(page, "screen-profile.png")

  if (jobId) {
    await gotoApp(page, `/jobs/${jobId}`)
    await page.waitForTimeout(1500)
    // Wait for analysis UI if still loading
    for (let i = 0; i < 15; i++) {
      const loading = await page.getByText(/Comparaison en cours/i).count()
      const hasMatch = await page.getByText(/MATCH|\/100|Match /i).count()
      if (!loading && hasMatch) break
      if (hasMatch && i > 3) break
      await page.waitForTimeout(1000)
    }
    const overview = page.getByRole("tab", { name: /Vue d'ensemble/i })
    if (await overview.count()) await overview.first().click().catch(() => {})
    await page.waitForTimeout(700)
    await save(page, "screen-job-detail.png")

    const opt = page.getByRole("tab", { name: /Optimiser/i })
    if (await opt.count()) {
      await opt.first().click()
      await page.waitForTimeout(1200)
      await save(page, "screen-optimize.png")
    } else {
      await gotoApp(page, "/profile-ai/optimize")
      await save(page, "screen-optimize.png")
    }

    await gotoApp(page, `/jobs/${jobId}`)
    const cand = page.getByRole("tab", { name: /Candidature/i })
    if (await cand.count()) await cand.first().click()
    await page.waitForTimeout(1000)
    const openBig = page.getByRole("button", { name: /Ouvrir en grand|lettre|letter/i })
    if (await openBig.count()) await openBig.first().click().catch(() => {})
    await page.waitForTimeout(800)
    await save(page, "screen-cover-letter.png")
  }

  await gotoApp(page, "/applications")
  await page.waitForTimeout(900)
  await save(page, "screen-applications.png")

  await browser.close()
  console.log("done")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
