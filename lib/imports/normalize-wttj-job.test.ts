import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractSkillNames,
  extractToolNames,
  normalizeContractType,
  normalizeRemoteMode,
  normalizeSalaryPeriod,
  normalizeWttjJob,
  stripHtml,
  validateWttjNormalizedJob,
} from "./normalize-wttj-job";

describe("normalizeContractType", () => {
  it("maps WTTJ contract types to French labels", () => {
    assert.equal(normalizeContractType("full_time"), "CDI");
    assert.equal(normalizeContractType("internship"), "Stage");
    assert.equal(normalizeContractType("apprenticeship"), "Alternance");
    assert.equal(normalizeContractType("temporary"), "CDD");
  });

  it("returns null for empty input", () => {
    assert.equal(normalizeContractType(null), null);
    assert.equal(normalizeContractType(""), null);
  });
});

describe("normalizeRemoteMode", () => {
  it("maps WTTJ remote values", () => {
    assert.equal(normalizeRemoteMode("no"), "onsite");
    assert.equal(normalizeRemoteMode("partial"), "hybrid");
    assert.equal(normalizeRemoteMode("full"), "remote");
  });

  it("returns unknown for unrecognized values", () => {
    assert.equal(normalizeRemoteMode("maybe"), "unknown");
    assert.equal(normalizeRemoteMode(null), "unknown");
  });
});

describe("normalizeSalaryPeriod", () => {
  it("normalizes salary period labels", () => {
    assert.equal(normalizeSalaryPeriod("yearly"), "year");
    assert.equal(normalizeSalaryPeriod("monthly"), "month");
    assert.equal(normalizeSalaryPeriod("hourly"), "hour");
  });
});

describe("extractSkillNames", () => {
  it("prefers French skill names", () => {
    const skills = extractSkillNames([
      { name: { fr: "Communication", en: "Communication skills" } },
      { name: { en: "Leadership" } },
    ]);
    assert.deepEqual(skills, ["Communication", "Leadership"]);
  });
});

describe("extractToolNames", () => {
  it("extracts tool names", () => {
    const tools = extractToolNames([
      { name: "Jira" },
      { name: "Figma" },
      { name: "" },
    ]);
    assert.deepEqual(tools, ["Jira", "Figma"]);
  });
});

describe("stripHtml", () => {
  it("removes HTML tags and decodes entities", () => {
    const text = stripHtml("<p>Hello <strong>world</strong> &amp; team</p>");
    assert.equal(text, "Hello world & team");
  });
});

describe("normalizeWttjJob", () => {
  const validItem = {
    id: "wttj-123",
    reference: "REF-1",
    name: "Product Owner",
    url: "https://www.welcometothejungle.com/fr/companies/acme/jobs/po_paris",
    contractType: "full_time",
    remote: "partial",
    language: "fr",
    salaryMin: 45000,
    salaryMax: 55000,
    salaryCurrency: "EUR",
    salaryPeriod: "yearly",
    experienceLevel: 3,
    educationLevel: "Bac+5",
    publishedAt: "2024-06-01T10:00:00.000Z",
    category: "Product",
    subcategory: "Product Management",
    sectors: ["Tech"],
    summary: "<p>Great role</p>",
    offices: [{ city: "Paris", district: "11e", country_code: "FR" }],
    benefits: ["Tickets resto"],
    organizationName: "Acme",
    organizationSlug: "acme",
    organizationLogo: "https://cdn.example.com/logo.png",
    organizationEmployees: 120,
    organizationWebsite: "https://acme.com",
    organizationIndustry: "SaaS",
    description: "<p>Description</p>",
    recruitmentProcess: "<p>3 steps</p>",
    applyUrl: "https://apply.example.com",
    skills: [{ name: { fr: "Agilité", en: "Agility" } }],
    tools: [{ name: "Notion" }],
    profile: "<p>Profile</p>",
  };

  it("normalizes a valid WTTJ item", () => {
    const { job, errors } = normalizeWttjJob(validItem);
    assert.equal(errors.length, 0);
    assert.ok(job);
    assert.equal(job.title, "Product Owner");
    assert.equal(job.company, "Acme");
    assert.equal(job.contract_type, "CDI");
    assert.equal(job.remote_mode, "hybrid");
    assert.equal(job.city, "Paris");
    assert.equal(job.salary_period, "year");
    assert.equal(job.skills[0], "Agilité");
    assert.equal(job.summary, "Great role");
    assert.equal(job.raw_data, validItem);
  });

  it("rejects rows missing required fields", () => {
    const { job, errors } = normalizeWttjJob({ name: "No URL job" });
    assert.equal(job, null);
    assert.ok(errors.length > 0);
  });
});

describe("validateWttjNormalizedJob", () => {
  it("flags missing url", () => {
    const errors = validateWttjNormalizedJob({
      source: "welcome_to_the_jungle",
      source_job_id: null,
      source_reference: null,
      title: "PO",
      company: "Acme",
      company_slug: null,
      company_logo_url: null,
      company_website: null,
      company_industry: null,
      company_size: null,
      contract_type: null,
      remote_mode: "unknown",
      language: null,
      city: null,
      district: null,
      country_code: null,
      salary_min: null,
      salary_max: null,
      salary_currency: null,
      salary_period: null,
      experience_level: null,
      education_level: null,
      category: null,
      subcategory: null,
      sectors: [],
      summary: null,
      description: null,
      profile: null,
      recruitment_process: null,
      benefits: [],
      skills: [],
      tools: [],
      apply_url: null,
      published_at: null,
      url: "",
      status: "new",
      selected: false,
      raw_data: {},
    });
    assert.ok(errors.some((e) => e.includes("url")));
  });
});

describe("duplicate handling", () => {
  it("skips duplicate URLs within the same file during parse", async () => {
    const { parseWttjJson } = await import("./import-wttj-json");
    const json = [
      { name: "Job A", organizationName: "Co", url: "https://example.com/job-a" },
      { name: "Job A dup", organizationName: "Co", url: "https://example.com/job-a" },
    ];
    const result = parseWttjJson(json);
    assert.equal(result.received, 2);
    assert.equal(result.valid.length, 1);
    assert.equal(result.duplicatesWithinFile, 1);
  });
});
