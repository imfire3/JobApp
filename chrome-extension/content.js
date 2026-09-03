/**
 * Content script — runs on Welcome to the Jungle job pages.
 * Extracts application URL + full description (+ title/company when available).
 *
 * Wrapped to survive re-injection (extension icon / SPA navigations).
 */
(() => {
  if (globalThis.__jobtrackerContentLoaded) return;
  globalThis.__jobtrackerContentLoaded = true;

  function textOf(el) {
    if (!el) return "";
    return (el.innerText || el.textContent || "").replace(/\s+\n/g, "\n").trim();
  }

  function metaContent(selector) {
    const el = document.querySelector(selector);
    return el?.getAttribute("content")?.trim() || "";
  }

  function parseJsonLdJob() {
    const scripts = [
      ...document.querySelectorAll('script[type="application/ld+json"]'),
    ];
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent || "null");
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const graph = item?.["@graph"];
          const candidates = graph
            ? Array.isArray(graph)
              ? graph
              : [graph]
            : [item];
          for (const node of candidates) {
            const type = node?.["@type"];
            const isJob =
              type === "JobPosting" ||
              (Array.isArray(type) && type.includes("JobPosting"));
            if (!isJob) continue;

            const org = node.hiringOrganization;
            const company =
              typeof org === "string" ? org : org?.name || "";

            let description = node.description || "";
            if (description.includes("<")) {
              const tmp = document.createElement("div");
              tmp.innerHTML = description;
              description = textOf(tmp);
            }

            return {
              title: node.title || "",
              company,
              description,
              url: node.url || window.location.href,
              location:
                node.jobLocation?.address?.addressLocality ||
                node.jobLocation?.name ||
                "",
            };
          }
        }
      } catch {
        // ignore malformed JSON-LD
      }
    }
    return null;
  }

  function findApplyUrl() {
    const candidates = [
      ...document.querySelectorAll(
        'a[href*="apply"], a[data-testid*="apply"], a[href*="candidat"]'
      ),
      ...document.querySelectorAll(
        'a[href*="safran"], a[href*="greenhouse"], a[href*="lever"], a[href*="workday"]'
      ),
    ];

    for (const a of candidates) {
      const href = a.href?.trim();
      const label = textOf(a).toLowerCase();
      if (!href) continue;
      if (
        label.includes("postuler") ||
        label.includes("apply") ||
        label.includes("candidat") ||
        href.includes("apply")
      ) {
        return href;
      }
    }

    const buttons = [...document.querySelectorAll("a[href]")].filter((a) => {
      const t = textOf(a).toLowerCase();
      return t === "postuler" || t === "apply" || t.startsWith("postuler");
    });
    return buttons[0]?.href || window.location.href;
  }

  function findDescription() {
    const selectors = [
      '[data-testid="job-section-description"]',
      '[data-testid="job-description"]',
      'section[data-testid*="description"]',
      'div[class*="Description"]',
      "article",
      "main",
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      const text = textOf(el);
      if (text && text.length > 200) return text;
    }

    const blocks = [...document.querySelectorAll("main section, main div")];
    let best = "";
    for (const block of blocks) {
      const t = textOf(block);
      if (t.length > best.length && t.length < 30000) best = t;
    }
    return best;
  }

  function findTitle() {
    return (
      textOf(document.querySelector("h1")) ||
      metaContent('meta[property="og:title"]') ||
      document.title.split(" - ")[0] ||
      document.title
    );
  }

  function findCompany() {
    const fromHeader =
      textOf(document.querySelector('[data-testid="job-header-company"]')) ||
      textOf(document.querySelector('a[href*="/companies/"] span')) ||
      textOf(document.querySelector('a[href*="/companies/"]'));

    if (fromHeader) return fromHeader;

    const og = metaContent('meta[property="og:title"]');
    const at = og.match(/@\s*(.+)$/);
    if (at) return at[1].trim();

    return "";
  }

  function findLocation() {
    return (
      textOf(document.querySelector('[data-testid="job-header-location"]')) ||
      textOf(document.querySelector('[data-testid*="location"]')) ||
      ""
    );
  }

  function parseWttjJob() {
    const ld = parseJsonLdJob();
    const url = window.location.href.split("?")[0];
    const applyUrl = findApplyUrl();

    return {
      source: "welcome_to_the_jungle",
      title: ld?.title || findTitle(),
      company: ld?.company || findCompany(),
      location: ld?.location || findLocation(),
      remote: "",
      salary: "",
      posted_at: new Date().toISOString().slice(0, 10),
      url,
      apply_url: applyUrl,
      description:
        ld?.description ||
        findDescription() ||
        metaContent('meta[property="og:description"]'),
      scraped_at: new Date().toISOString(),
    };
  }

  window.__jobtrackerParseWttjJob = parseWttjJob;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "PING") {
      sendResponse({ ok: true });
      return false;
    }

    if (message?.type === "PARSE_WTTJ_JOB") {
      try {
        const job = parseWttjJob();
        if (!job.url || !job.description) {
          sendResponse({
            ok: false,
            error: "Could not parse description or URL on this page.",
            job,
          });
          return false;
        }
        sendResponse({ ok: true, job });
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "Parse failed",
        });
      }
      return false;
    }

    return false;
  });
})();
