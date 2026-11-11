import { createHash } from "node:crypto";
import { z } from "zod";
import { WEBSITE_PASTE_PROMPT_VERSION } from "@/lib/ai/prompts/website-paste";
import type { ImportRow } from "@/lib/imports/jobs-file";
import { parseExperienceMinYears, parseRemoteMode, WEBSITE_PASTE_SOURCE } from "@/lib/jobs/normalize";

export const websitePasteRequestSchema = z.object({
  text: z.string().trim().min(1).max(100_000),
  url: z.union([z.literal(""), z.url({ protocol: /^https?$/ })]).default(""),
});

const excerpt = z.string().trim().min(1).max(160).nullable();
export const websitePasteMetadataSchema = z.strictObject({
  title: excerpt,
  company: excerpt,
  location: excerpt,
  contract_type: excerpt,
  remote: excerpt,
  salary: excerpt,
  experience: excerpt,
  published_at: excerpt,
});

type Metadata = z.infer<typeof websitePasteMetadataSchema>;

const NAVIGATION = /^(?:site web|aller au contenu principal|skip to (?:main )?content|retour aux (?:r.{1,2}sultats|offres)|back to (?:results|jobs|search results)|trouver un job|explorer les entreprises|ressources|messages|mon espace|accueil|se connecter|connexion|welcome to the jungle|candidatures?|postuler|apply|enregistrer|save|partager|voir (?:plus|moins)|emplois?|offres? d['’]emploi|fr|en)$/i;
const FOOTER = /^(?:vous cherchez un job|vous recrutez|qui sommes-nous\s*\?|mentions légales)$|^(?:wttj & indeed\s*→|fichier de base\s*:|\d+ offre\(s\) en mémoire)/i;
const MISSIONS = /^vos missions au quotidien$/i;
const QUALIFICATIONS = /^ce que l['’]on cherche$|^qualifications$/i;
const CONTRACT = /^(?:CDI|CDD|stage|alternance|freelance|intérim|apprentissage|permanent|internship|full[- ]time|part[- ]time)$/i;
const REMOTE = /^(?:télétravail|hybride|sur site|présentiel|on[- ]site|(?:100\s*%\s*|full\s*)?remote)\b/i;
const AGE = /^il y a \d+ (?:jours?|semaines?|mois|heures?)$/i;
const SALARY = /\d.*(?:€|\$|£|\bEUR\b|\bUSD\b|\bGBP\b|\bk\b)/i;

function isHeading(line: string): boolean {
  return line.length >= 3 && line.length <= 160 &&
    !NAVIGATION.test(line) && !MISSIONS.test(line) && !QUALIFICATIONS.test(line) &&
    !CONTRACT.test(line) && !REMOTE.test(line) && !AGE.test(line) &&
    !/^(?:https?:\/\/|www\.|salaire\s*:|jobtracker$)/i.test(line);
}

function readWttjHeader(lines: string[]): Partial<Metadata> | null {
  const missionsIndex = lines.findIndex((line) => MISSIONS.test(line));
  if (missionsIndex < 0) return null;

  // A copied WTTJ header includes the logo's alt text and repeats the advertiser.
  const candidates = lines.slice(0, missionsIndex).flatMap((company, index) => {
    const title = lines[index + 1];
    return company === lines[index + 2] && title && title !== company &&
      isHeading(company) && isHeading(title) ? [index] : [];
  });
  if (candidates.length > 1) return null;
  const start = candidates[0] ?? 0;
  const hasLogo = candidates.length === 1;
  const title = lines[start + (hasLogo ? 1 : 0)];
  const company = lines[start + (hasLogo ? 2 : 1)];
  const hiringLine = lines.slice(missionsIndex + 1, missionsIndex + 4)
    .find((line) => title && company &&
      line.toLowerCase().startsWith(`${company} recrute`.toLowerCase()) &&
      line.toLowerCase().includes(title.toLowerCase()));
  if (!title || !company || !isHeading(title) || !isHeading(company) ||
      title === company || (!hasLogo && !hiringLine)) return null;

  const headerLines = lines.slice(start + (hasLogo ? 3 : 2), missionsIndex);
  const contractIndex = headerLines.findIndex((line) => CONTRACT.test(line));
  const contract = contractIndex >= 0 ? headerLines[contractIndex] : null;
  const tags = contractIndex >= 0 ? headerLines.slice(contractIndex + 1, contractIndex + 7) : [];
  const location = tags[0];
  const qualificationsIndex = lines.findIndex((line) => QUALIFICATIONS.test(line));
  const qualifications = qualificationsIndex >= 0
    ? lines.slice(qualificationsIndex + 1).join("\n").split(/\nInformations supplémentaires\n/i)[0]
    : "";

  return {
    title,
    company,
    contract_type: contract,
    location: location && isHeading(location) && !/^(?:>|\d|les compétences)/i.test(location) ? location : null,
    remote: tags.find((line) => REMOTE.test(line)) ?? null,
    salary: tags.find((line) => /^salaire\s*:/i.test(line) && SALARY.test(line)) ?? null,
    experience: qualifications.match(/\b(?:au moins |minimum (?:de )?)?\d+\s+ans\b/i)?.[0] ?? null,
  };
}

function readGroundedMetadata(raw: unknown, text: string): Partial<Metadata> {
  const parsed = websitePasteMetadataSchema.safeParse(raw);
  if (!parsed.success) return {};
  return Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value && text.includes(value)),
  );
}

export async function parseWebsitePaste(
  input: z.infer<typeof websitePasteRequestSchema>,
  extract: (text: string) => Promise<unknown>,
): Promise<ImportRow | null> {
  const lines = input.text.normalize("NFC").split(/\r?\n/).map((line) => line.trim());
  const footerIndex = lines.findIndex((line) => FOOTER.test(line));
  const offerLines = lines.slice(0, footerIndex < 0 ? undefined : footerIndex)
    .filter((line) => !NAVIGATION.test(line));
  const nonEmptyLines = offerLines.filter(Boolean);
  const sourceText = offerLines.join("\n").trim();
  if (!nonEmptyLines.some(isHeading)) return null;

  const header = readWttjHeader(nonEmptyLines);
  const modelInput = sourceText.slice(0, 24_000);
  const metadata = header ?? readGroundedMetadata(
    await extract(modelInput).catch(() => null),
    modelInput,
  );
  // Fail closed: a missing/invalid JSON response is not permission to import the
  // first page label. In particular, navigation and competing headlines aren't jobs.
  const title = metadata.title && isHeading(metadata.title) &&
    nonEmptyLines.includes(metadata.title) ? metadata.title : null;
  if (!title) return null;

  const missionsIndex = header ? offerLines.findIndex((line) => MISSIONS.test(line)) : -1;
  const description = offerLines.slice(Math.max(0, missionsIndex)).join("\n").trim();
  const remoteText = metadata.remote ?? "";
  const remoteMode = /\btélétravail\s+(?:fréquent|occasionnel|partiel)\b/i.test(remoteText)
    ? "hybrid"
    : /\b(?:sans télétravail|pas de télétravail|no remote)\b/i.test(remoteText)
      ? "onsite"
      : parseRemoteMode({ remote: remoteText });
  const date = metadata.published_at && z.iso.date().safeParse(metadata.published_at).success
    ? new Date(metadata.published_at).toISOString()
    : null;
  const hash = createHash("sha256").update(sourceText).digest("hex");

  return {
    rowNumber: 1,
    source: WEBSITE_PASTE_SOURCE,
    title,
    company: metadata.company && isHeading(metadata.company) ? metadata.company : "Entreprise non renseignée",
    location: metadata.location && isHeading(metadata.location) ? metadata.location : null,
    contract_type: metadata.contract_type ?? null,
    remote: remoteMode === "remote" || remoteMode === "hybrid",
    remote_mode: remoteMode,
    salary: metadata.salary && SALARY.test(metadata.salary) ? metadata.salary : null,
    experience_min_years: metadata.experience && /\b\d+\s*(?:ans|years)\b/i.test(metadata.experience)
      ? parseExperienceMinYears(metadata.experience)
      : null,
    posted_at: date,
    url: input.url || `https://paste.local/job-${hash}`,
    description,
    raw_data: {
      pasted_url: input.url || null,
      pasted_text: input.text,
      remote_tag: metadata.remote ?? null,
      publication_label: nonEmptyLines.find((line) => AGE.test(line)) ?? null,
      ...(!header ? { extraction_prompt_version: WEBSITE_PASTE_PROMPT_VERSION } : {}),
    },
  };
}
