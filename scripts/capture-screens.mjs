/**
 * Capture les écrans clés de JobTracker (dev server sur :3000).
 * Usage: node scripts/capture-screens.mjs
 */
const { chromium } = require("playwright")
const path = require("path")
const fs = require("fs")

const OUT = path.join(process.cwd(), "public", "landing")
const DOCS = path.join(process.cwd(), "docs", "screenshots")

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  fs.mkdirSync(DOCS, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const page = await (
    await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.25,
    })
  ).newPage()

  const save = async (name) => {
    const file = path.join(OUT, name)
    await page.screenshot({ path: file, fullPage: false })
    fs.copyFileSync(file, path.join(DOCS, name))
    console.log("saved", name)
  }

  const dismiss = async () => {
    for (const label of ["Plus tard", "J’ai compris", "Close", "Fermer"]) {
      const btn = page.getByRole("button", { name: label })
      if (await btn.count()) await btn.first().click({ timeout: 800 }).catch(() => {})
    }
  }

  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" })
  await save("screen-login.png")
  await page.getByRole("button", { name: /Demo/i }).click()
  await page.getByRole("button", { name: /Se connecter/i }).click()
  await page.waitForTimeout(2000)
  await dismiss()

  for (const [name, route] of [
    ["screen-jobs.png", "/jobs"],
    ["screen-dashboard.png", "/dashboard"],
    ["screen-imports.png", "/imports"],
    ["screen-extension.png", "/extension"],
    ["screen-profile.png", "/profile-ai"],
    ["screen-optimize.png", "/profile-ai/optimize"],
    ["screen-settings.png", "/settings"],
    ["screen-applications.png", "/applications"],
  ]) {
    await page.goto(`http://localhost:3000${route}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(600)
    await dismiss()
    if (route === "/jobs") {
      const sw = page.getByRole("switch", { name: /Last 24h/i })
      if ((await sw.count()) && (await sw.getAttribute("aria-checked")) === "true") {
        await sw.click()
        await page.waitForTimeout(400)
      }
    }
    await save(name)
  }

  const jobs = await page.evaluate(async () => {
    const r = await fetch("/api/dashboard/summary")
    const j = await r.json()
    return (j.jobs || []).slice(0, 1).map((x) => x.id)
  })
  if (jobs[0]) {
    await page.goto(`http://localhost:3000/jobs/${jobs[0]}`, { waitUntil: "networkidle" })
    await page.waitForTimeout(1000)
    await save("screen-job-detail.png")
  }

  await browser.close()
  console.log("done → public/landing + docs/screenshots")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
