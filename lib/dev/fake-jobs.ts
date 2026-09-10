import type { ImportedJob } from "@/types"

const FAKE_OFFERS: Array<{
  title: string
  company: string
  source: string
  location: string
  remote: boolean
  salary: string
  description: string
}> = [
  {
    title: "Product Owner",
    company: "Alan",
    source: "Welcome to the Jungle",
    location: "Paris",
    remote: true,
    salary: "60k-72k EUR",
    description:
      "Lead backlog prioritization, product discovery workshops, and delivery coordination with engineering for a B2C insurance product.",
  },
  {
    title: "Senior Product Manager",
    company: "Doctolib",
    source: "LinkedIn",
    location: "Paris",
    remote: true,
    salary: "70k-85k EUR",
    description:
      "Own roadmap for patient experience, define KPIs, run A/B tests, and partner with data, design, and engineering.",
  },
  {
    title: "Product Manager (AI Features)",
    company: "Mistral AI",
    source: "Indeed",
    location: "Paris",
    remote: true,
    salary: "75k-95k EUR",
    description:
      "Drive AI feature strategy, convert user needs into product specs, and deliver LLM-powered workflows.",
  },
  {
    title: "Product Owner Payment",
    company: "Back Market",
    source: "Welcome to the Jungle",
    location: "Paris",
    remote: false,
    salary: "58k-70k EUR",
    description:
      "Manage payment domain backlog, align stakeholders, and improve checkout conversion across Europe.",
  },
  {
    title: "Product Manager Growth",
    company: "BlaBlaCar",
    source: "LinkedIn",
    location: "Paris",
    remote: true,
    salary: "65k-80k EUR",
    description:
      "Own growth loops from activation to retention and run experiments with marketing and product.",
  },
  {
    title: "Product Owner SaaS Platform",
    company: "PayFit",
    source: "Indeed",
    location: "Paris",
    remote: true,
    salary: "62k-76k EUR",
    description:
      "Define platform capabilities, prioritize technical enablers, and ensure reliable delivery.",
  },
  {
    title: "Product Manager B2B",
    company: "Qonto",
    source: "Welcome to the Jungle",
    location: "Paris",
    remote: true,
    salary: "68k-82k EUR",
    description:
      "Lead B2B roadmap for SMB finance workflows and deliver scalable product increments.",
  },
  {
    title: "Product Owner Data",
    company: "SNCF Connect",
    source: "Indeed",
    location: "Lille",
    remote: false,
    salary: "52k-64k EUR",
    description:
      "Prioritize data product backlog and improve reliability of reporting pipelines.",
  },
  {
    title: "Product Manager Marketplace",
    company: "ManoMano",
    source: "LinkedIn",
    location: "Paris",
    remote: true,
    salary: "66k-81k EUR",
    description:
      "Define marketplace strategy, optimize seller-buyer matching, and improve trust signals.",
  },
  {
    title: "Product Builder / Product Manager",
    company: "Swile",
    source: "Welcome to the Jungle",
    location: "Montpellier",
    remote: true,
    salary: "55k-70k EUR",
    description:
      "Ship end-to-end product improvements combining discovery and execution with design and engineering.",
  },
  {
    title: "Proxy Product Owner",
    company: "Datadog",
    source: "LinkedIn",
    location: "Paris",
    remote: true,
    salary: "64k-78k EUR",
    description:
      "Facilitate agile ceremonies, refine backlog with stakeholders, and unblock delivery for a SaaS observability squad.",
  },
  {
    title: "Lead Product Manager",
    company: "Notion",
    source: "Indeed",
    location: "Paris",
    remote: true,
    salary: "80k-100k EUR",
    description:
      "Set product vision for collaboration features, coach PMs, and align GTM with engineering leadership.",
  },
]

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/** Fresh fake job offers for local/dev — unique URLs each call to avoid duplicates. */
export function generateFakeJobs(count = FAKE_OFFERS.length): ImportedJob[] {
  const stamp = Date.now().toString(36)
  const n = Math.max(1, Math.min(count, FAKE_OFFERS.length))

  return FAKE_OFFERS.slice(0, n).map((offer, index) => {
    const slug = `${slugify(offer.company)}-${slugify(offer.title)}-${stamp}-${index}`
    return {
      title: offer.title,
      company: offer.company,
      source: offer.source,
      location: offer.location,
      remote: offer.remote,
      salary: offer.salary,
      contract_type: "CDI",
      posted_at: new Date(Date.now() - index * 45 * 60 * 1000).toISOString(),
      url: `https://jobs.example.com/dev/${slug}`,
      description: offer.description,
    } satisfies ImportedJob
  })
}
