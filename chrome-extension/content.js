/**
 * Content script — runs on Welcome to the Jungle and Indeed job pages.
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

  function detectSource() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes("indeed.")) return "indeed";
    if (host.includes("welcometothejungle.")) return "welcome_to_the_jungle";
    return "unknown";
  }

  function isIndeedHost() {
    return detectSource() === "indeed";
  }

  function formatAddress(address) {
    if (!address) return "";
    if (typeof address === "string") return address.trim();
    return [address.addressLocality, address.addressRegion, address.addressCountry]
      .filter(Boolean)
      .join(", ");
  }

  function extractJsonLdLocation(node) {
    const loc = node?.jobLocation;
    if (!loc) return "";
    const locs = Array.isArray(loc) ? loc : [loc];
    const parts = [];
    for (const item of locs) {
      const fromAddress = formatAddress(item?.address);
      if (fromAddress) {
        parts.push(fromAddress);
        continue;
      }
      if (item?.name) parts.push(String(item.name).trim());
    }
    return parts.join(" · ");
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

            const salary =
              node.baseSalary?.value?.value != null
                ? String(node.baseSalary.value.value)
                : typeof node.baseSalary?.value === "number" ||
                    typeof node.baseSalary?.value === "string"
                  ? String(node.baseSalary.value)
                  : "";

            return {
              title: node.title || "",
              company,
              description,
              url: node.url || window.location.href,
              location: extractJsonLdLocation(node),
              salary,
              remote:
                typeof node.jobLocationType === "string" &&
                /TELECOMMUTE/i.test(node.jobLocationType)
                  ? "remote"
                  : "",
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
    if (isIndeedHost()) {
      const indeedApply = document.querySelector(
        'a[href*="indeed.com/apply"], button[aria-label*="Apply"], button[aria-label*="Postuler"], #indeedApplyButton, .jobsearch-IndeedApplyButton-buttonWrapper a, a[data-tn-element="jobHeaderApplyButton"]'
      );
      if (indeedApply?.href) return indeedApply.href.trim();
    }

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
    const selectors = isIndeedHost()
      ? [
          "#jobDescriptionText",
          ".jobsearch-jobDescriptionText",
          '[data-testid="jobsearch-JobComponent-description"]',
          "#job-description",
          '[class*="jobDescription"]',
          "article",
          "main",
        ]
      : [
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
      if (text && text.length > 120) return text;
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
    if (isIndeedHost()) {
      const indeedTitle =
        textOf(
          document.querySelector(
            '[data-testid="jobsearch-JobInfoHeader-title"], .jobsearch-JobInfoHeader-title, h1.jobsearch-JobInfoHeader-title, h2.jobTitle, h1'
          )
        ) || "";
      if (indeedTitle) {
        return indeedTitle.replace(/\s*-\s*job post$/i, "").trim();
      }
    }

    return (
      textOf(document.querySelector("h1")) ||
      metaContent('meta[property="og:title"]') ||
      document.title.split(" - ")[0] ||
      document.title
    );
  }

  function findCompany() {
    if (isIndeedHost()) {
      const indeedCompany =
        textOf(
          document.querySelector(
            '[data-company-name="true"], [data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating a, [data-testid="jobsearch-CompanyInfoContainer"] a'
          )
        ) || "";
      if (indeedCompany) return indeedCompany;

      const og = metaContent('meta[property="og:title"]');
      // Often: "Title - Company | Indeed.com"
      const dashMatch = og.match(/\s-\s(.+?)\s\|/);
      if (dashMatch) return dashMatch[1].trim();
    }

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
    if (isIndeedHost()) {
      const indeedLocation =
        textOf(
          document.querySelector(
            '[data-testid="job-location"], [data-testid="jobsearch-JobInfoHeader-companyLocation"], .jobsearch-JobInfoHeader-subtitle > div, .css-1ojh0uo'
          )
        ) || "";
      if (indeedLocation) return indeedLocation;
    }

    return (
      textOf(document.querySelector('[data-testid="job-header-location"]')) ||
      textOf(document.querySelector('[data-testid*="location"]')) ||
      ""
    );
  }

  function canonicalizeUrl() {
    const href = window.location.href;
    if (!isIndeedHost()) return href.split("?")[0];

    try {
      const u = new URL(href);
      const jk = u.searchParams.get("jk") || u.searchParams.get("vjk");
      if (jk) {
        u.search = "";
        u.hash = "";
        u.searchParams.set("jk", jk);
        return u.toString();
      }
      // Drop noisy tracking params while keeping path
      u.hash = "";
      for (const key of [...u.searchParams.keys()]) {
        if (!["jk", "vjk", "from"].includes(key)) u.searchParams.delete(key);
      }
      return u.toString();
    } catch {
      return href.split("#")[0];
    }
  }

  function parseJobPage() {
    const ld = parseJsonLdJob();
    const source = detectSource();
    const url = canonicalizeUrl();
    const applyUrl = findApplyUrl();

    return {
      source: source === "unknown" ? "welcome_to_the_jungle" : source,
      title: ld?.title || findTitle(),
      company: ld?.company || findCompany(),
      location: ld?.location || findLocation(),
      remote: ld?.remote || "",
      salary: ld?.salary || "",
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

  // Keep legacy name for panel.js / older callers
  window.__jobtrackerParseWttjJob = parseJobPage;
  window.__jobtrackerParseJob = parseJobPage;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "PING") {
      sendResponse({ ok: true });
      return false;
    }

    if (
      message?.type === "PARSE_WTTJ_JOB" ||
      message?.type === "PARSE_JOB"
    ) {
      try {
        const job = parseJobPage();
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
