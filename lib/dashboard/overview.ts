import type { Application, ApplicationStatus, Job } from "@/types";

export type DashboardJob = Pick<
  Job,
  | "id"
  | "title"
  | "company"
  | "location"
  | "city"
  | "contract_type"
  | "remote"
  | "match_score"
  | "description"
  | "status"
  | "cover_letter"
  | "published_at"
  | "imported_at"
>;

export type DashboardApplication = Pick<
  Application,
  | "id"
  | "company"
  | "position"
  | "status"
  | "date_applied"
  | "interview_date"
  | "updated_at"
>;

export const ACTIVE_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "applied",
  "hr_interview",
  "technical_interview",
  "case_study",
  "offer",
];

export const INTERVIEW_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "hr_interview",
  "technical_interview",
  "case_study",
];

export const RESPONSE_APPLICATION_STATUSES: readonly ApplicationStatus[] = [
  "hr_interview",
  "technical_interview",
  "case_study",
  "offer",
  "rejected",
  "accepted",
];

const FOLLOW_UP_DAYS = 10;
const MAX_TIPS = 3;

export type DashboardStats = {
  offers: number;
  activeOffers: number;
  applications: number;
  applicationsSent: number;
  activeApplications: number;
  interviews: number;
  responses: number;
  responseRate: number | null;
};

export function computeDashboardStats(
  jobs: DashboardJob[],
  applications: DashboardApplication[]
): DashboardStats {
  const applicationsSent = applications.filter(
    (application) => application.status !== "to_apply"
  ).length;
  const responses = applications.filter((application) =>
    RESPONSE_APPLICATION_STATUSES.includes(application.status)
  ).length;

  return {
    offers: jobs.length,
    activeOffers: jobs.filter((job) => job.status !== "archived").length,
    applications: applications.length,
    applicationsSent,
    activeApplications: applications.filter((application) =>
      ACTIVE_APPLICATION_STATUSES.includes(application.status)
    ).length,
    interviews: applications.filter((application) =>
      INTERVIEW_APPLICATION_STATUSES.includes(application.status)
    ).length,
    responses,
    responseRate:
      applicationsSent === 0
        ? null
        : Math.round((responses / applicationsSent) * 100),
  };
}

const INACTIVE_JOB_STATUSES: ReadonlyArray<Job["status"]> = [
  "applied",
  "interview",
  "offer",
  "rejected",
  "archived",
];

function jobRecency(job: DashboardJob): number {
  const reference = job.published_at ?? job.imported_at;
  const time = reference ? new Date(reference).getTime() : 0;
  return Number.isNaN(time) ? 0 : time;
}

function byMostRecent(a: DashboardJob, b: DashboardJob): number {
  return jobRecency(b) - jobRecency(a);
}

const RECOMMENDED_LIMIT = 3;

/**
 * Best actionable offers: highest match score first, then most recent.
 * Falls back to the best non-archived offers when everything is already applied to.
 */
export function pickRecommendedJobs(
  jobs: DashboardJob[],
  limit: number = RECOMMENDED_LIMIT
): DashboardJob[] {
  if (jobs.length === 0 || limit <= 0) return [];

  const actionable = jobs.filter(
    (job) => !INACTIVE_JOB_STATUSES.includes(job.status)
  );
  const pool =
    actionable.length > 0
      ? actionable
      : jobs.filter((job) => job.status !== "archived");

  if (pool.length === 0) return [];

  const scored = pool
    .filter((job) => job.match_score !== null)
    .sort((a, b) => {
      const scoreDiff = (b.match_score ?? 0) - (a.match_score ?? 0);
      return scoreDiff !== 0 ? scoreDiff : byMostRecent(a, b);
    });
  const unscored = pool
    .filter((job) => job.match_score === null)
    .sort(byMostRecent);

  const ordered = scored.length > 0 ? [...scored, ...unscored] : unscored;

  return ordered.slice(0, limit);
}

/** Best actionable offer, or null when there is none. */
export function pickRecommendedJob(
  jobs: DashboardJob[]
): DashboardJob | null {
  return pickRecommendedJobs(jobs, 1)[0] ?? null;
}

export type DashboardDeadline = {
  id: string;
  company: string;
  position: string;
  date: string;
  status: ApplicationStatus;
};

export function buildUpcomingDeadlines(
  applications: DashboardApplication[],
  now: Date = new Date()
): DashboardDeadline[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  return applications
    .filter((application) => {
      if (!application.interview_date || application.status === "rejected") {
        return false;
      }
      const time = new Date(application.interview_date).getTime();
      return !Number.isNaN(time) && time >= startOfToday.getTime();
    })
    .sort(
      (a, b) =>
        new Date(a.interview_date as string).getTime() -
        new Date(b.interview_date as string).getTime()
    )
    .map((application) => ({
      id: application.id,
      company: application.company,
      position: application.position,
      date: application.interview_date as string,
      status: application.status,
    }));
}

export function formatEventDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const time = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const startOfDay = (value: Date) => {
    const copy = new Date(value);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const dayDiff = Math.round(
    (startOfDay(date).getTime() - startOfDay(now).getTime()) / 86_400_000
  );

  if (dayDiff === 0) return `Aujourd’hui · ${time}`;
  if (dayDiff === 1) return `Demain · ${time}`;

  const day = new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
  return `${day} · ${time}`;
}

export type ProfileMilestone = {
  id: "cv" | "profile" | "preferences";
  label: string;
  done: boolean;
};

export type ProfileProgress = {
  percent: number;
  completed: number;
  total: number;
  milestones: ProfileMilestone[];
  next: { label: string; href: string } | null;
};

const PROFILE_MILESTONES: ReadonlyArray<{
  id: ProfileMilestone["id"];
  label: string;
  nextLabel: string;
}> = [
  { id: "cv", label: "CV importé", nextLabel: "Ajoute ton CV" },
  { id: "profile", label: "Profil vérifié", nextLabel: "Vérifie ton profil" },
  {
    id: "preferences",
    label: "Préférences définies",
    nextLabel: "Définis tes préférences",
  },
];

export function computeProfileProgress(flags: {
  hasCv: boolean;
  hasProfileReviewed: boolean;
  hasTargets: boolean;
}): ProfileProgress {
  const doneById: Record<ProfileMilestone["id"], boolean> = {
    cv: flags.hasCv,
    profile: flags.hasProfileReviewed,
    preferences: flags.hasTargets,
  };

  const milestones = PROFILE_MILESTONES.map((milestone) => ({
    id: milestone.id,
    label: milestone.label,
    done: doneById[milestone.id],
  }));
  const completed = milestones.filter((milestone) => milestone.done).length;
  const nextMilestone = PROFILE_MILESTONES.find(
    (milestone) => !doneById[milestone.id]
  );

  return {
    percent: Math.round((completed / milestones.length) * 100),
    completed,
    total: milestones.length,
    milestones,
    next: nextMilestone
      ? { label: nextMilestone.nextLabel, href: "/profile-ai" }
      : null,
  };
}

export type JourneyStepState = "done" | "current" | "upcoming";

export type JourneyStep = {
  id: "cv" | "offers" | "applications" | "responses";
  title: string;
  description: string;
  href: string;
  state: JourneyStepState;
};

export function computeJourney(input: {
  hasCv: boolean;
  offersCount: number;
  applicationsSent: number;
  responsesCount: number;
}): JourneyStep[] {
  const completed = [
    input.hasCv,
    input.offersCount > 0,
    input.applicationsSent > 0,
    input.responsesCount > 0,
  ];
  const currentIndex = completed.findIndex((isDone) => !isDone);

  const steps: ReadonlyArray<Omit<JourneyStep, "state">> = [
    {
      id: "cv",
      title: "CV prêt",
      description: "Ton profil est analysé.",
      href: "/profile-ai",
    },
    {
      id: "offers",
      title: "Offres",
      description: "Ajoute et cible les bonnes offres.",
      href: "/jobs",
    },
    {
      id: "applications",
      title: "Candidatures",
      description: "Postule et garde ton suivi à jour.",
      href: "/applications",
    },
    {
      id: "responses",
      title: "Entretiens",
      description: "Suis tes réponses et prépare tes entretiens.",
      href: "/applications",
    },
  ];

  return steps.map((step, index) => ({
    ...step,
    state:
      currentIndex === -1 || index < currentIndex
        ? "done"
        : index === currentIndex
          ? "current"
          : "upcoming",
  }));
}

/** First step still to do, or the last one when the whole journey is done. */
export function pickJourneyHighlight(
  steps: JourneyStep[]
): JourneyStep | null {
  if (steps.length === 0) return null;
  return steps.find((step) => step.state !== "done") ?? steps[steps.length - 1];
}

export type DashboardTipIcon =
  | "calendar"
  | "send"
  | "sparkles"
  | "briefcase"
  | "file-text"
  | "user"
  | "puzzle"
  | "search"
  | "import";

export type DashboardTipTone = "info" | "success" | "warning";

export type DashboardTip = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: DashboardTipIcon;
  tone: DashboardTipTone;
};

const DEFAULT_TIPS: ReadonlyArray<DashboardTip> = [
  {
    id: "extension",
    icon: "puzzle",
    tone: "info",
    title: "Installe l’extension",
    description: "Enregistre des offres directement depuis le web.",
    href: "/extension",
  },
  {
    id: "research",
    icon: "search",
    tone: "info",
    title: "Recherche avec l’IA",
    description: "Trouve des offres ciblées.",
    href: "/research",
  },
  {
    id: "import",
    icon: "import",
    tone: "info",
    title: "Ajoute une offre",
    description: "Importe ou colle ta première offre.",
    href: "/jobs",
  },
];

function daysSince(iso: string, now: Date): number | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diff = now.getTime() - date.getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

export function buildDashboardTips(input: {
  jobs: DashboardJob[];
  applications: DashboardApplication[];
  profilePercent: number;
  now?: Date;
}): DashboardTip[] {
  const { jobs, applications, profilePercent, now = new Date() } = input;
  const tips: DashboardTip[] = [];
  const usedJobIds = new Set<string>();
  const hasActivity = jobs.length > 0 || applications.length > 0;

  const nextInterview = buildUpcomingDeadlines(applications, now)[0];
  if (nextInterview) {
    tips.push({
      id: `interview-${nextInterview.id}`,
      icon: "calendar",
      tone: "warning",
      title: "Prépare ton entretien",
      description: `${nextInterview.company} · ${nextInterview.position}`,
      href: "/applications",
    });
  }

  const followUp = applications
    .filter((application) => application.status === "applied" && application.date_applied)
    .map((application) => ({
      application,
      days: daysSince(application.date_applied as string, now),
    }))
    .filter(({ days }) => days !== null && days >= FOLLOW_UP_DAYS)
    .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))[0];

  if (followUp) {
    tips.push({
      id: `follow-up-${followUp.application.id}`,
      icon: "send",
      tone: "warning",
      title: `Relance ${followUp.application.company}`,
      description: `Candidature envoyée il y a ${followUp.days} jours sans réponse.`,
      href: "/applications",
    });
  }

  const unanalyzed = [...jobs]
    .filter(
      (job) =>
        job.match_score === null &&
        (job.status === "new" || job.status === "selected")
    )
    .sort(byMostRecent)[0];

  if (unanalyzed) {
    usedJobIds.add(unanalyzed.id);
    tips.push({
      id: `analyze-${unanalyzed.id}`,
      icon: "sparkles",
      tone: "info",
      title: "Analyse une offre",
      description: `${unanalyzed.title} n’a pas encore de score de match.`,
      href: `/jobs/${unanalyzed.id}`,
    });
  }

  const fresh = [...jobs]
    .filter((job) => job.status === "new" && !usedJobIds.has(job.id))
    .sort(byMostRecent)[0];

  if (fresh) {
    usedJobIds.add(fresh.id);
    tips.push({
      id: `discover-${fresh.id}`,
      icon: "briefcase",
      tone: "info",
      title: "Découvre une nouvelle offre",
      description: `${fresh.title} chez ${fresh.company}.`,
      href: `/jobs/${fresh.id}`,
    });
  }

  const letter = [...jobs]
    .filter(
      (job) =>
        job.status === "selected" &&
        !job.cover_letter &&
        !usedJobIds.has(job.id)
    )
    .sort(byMostRecent)[0];

  if (letter) {
    tips.push({
      id: `letter-${letter.id}`,
      icon: "file-text",
      tone: "info",
      title: "Termine ta lettre",
      description: `${letter.title} chez ${letter.company}.`,
      href: `/jobs/${letter.id}`,
    });
  }

  if (hasActivity && profilePercent < 100) {
    tips.push({
      id: "profile",
      icon: "user",
      tone: "info",
      title: "Complète ton profil",
      description: "Améliore la précision de tes scores de match.",
      href: "/profile-ai",
    });
  }

  for (const tip of DEFAULT_TIPS) {
    if (tips.length >= MAX_TIPS) break;
    if (!tips.some((candidate) => candidate.id === tip.id)) {
      tips.push(tip);
    }
  }

  return tips.slice(0, MAX_TIPS);
}
