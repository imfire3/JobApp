import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { ApplicationStatus } from "@/types";
import {
  buildDashboardTips,
  buildUpcomingDeadlines,
  computeDashboardStats,
  computeJourney,
  computeProfileProgress,
  pickJourneyHighlight,
  pickRecommendedJob,
  pickRecommendedJobs,
  type DashboardApplication,
  type DashboardJob,
} from "./overview";

const NOW = new Date("2026-03-20T12:00:00.000Z");

function makeJob(overrides: Partial<DashboardJob> & { id: string }): DashboardJob {
  return {
    title: "Product Owner",
    company: "Acme",
    location: "Paris",
    city: null,
    contract_type: "CDI",
    remote: false,
    match_score: null,
    description: null,
    status: "new",
    cover_letter: null,
    published_at: "2026-03-10T09:00:00.000Z",
    imported_at: "2026-03-10T09:00:00.000Z",
    ...overrides,
  };
}

function makeApplication(
  overrides: Partial<DashboardApplication> & { id: string }
): DashboardApplication {
  return {
    company: "Acme",
    position: "Product Owner",
    status: "applied" as ApplicationStatus,
    date_applied: null,
    interview_date: null,
    updated_at: "2026-03-10T09:00:00.000Z",
    ...overrides,
  };
}

describe("computeDashboardStats", () => {
  it("counts offers, active applications, interviews, responses and response rate", () => {
    const jobs = [
      makeJob({ id: "1" }),
      makeJob({ id: "2", status: "applied" }),
      makeJob({ id: "3", status: "archived" }),
    ];
    const applications = [
      makeApplication({ id: "a", status: "to_apply" }),
      makeApplication({ id: "b", status: "applied" }),
      makeApplication({ id: "c", status: "hr_interview" }),
      makeApplication({ id: "d", status: "rejected" }),
      makeApplication({ id: "e", status: "accepted" }),
    ];

    const stats = computeDashboardStats(jobs, applications);

    assert.equal(stats.offers, 3);
    assert.equal(stats.activeOffers, 2);
    assert.equal(stats.applications, 5);
    assert.equal(stats.applicationsSent, 4);
    assert.equal(stats.activeApplications, 2);
    assert.equal(stats.interviews, 1);
    assert.equal(stats.responses, 3);
    assert.equal(stats.responseRate, 75);
  });

  it("keeps the response rate empty until an application is sent", () => {
    const stats = computeDashboardStats(
      [],
      [makeApplication({ id: "a", status: "to_apply" })]
    );

    assert.equal(stats.applicationsSent, 0);
    assert.equal(stats.responseRate, null);
  });
});

describe("pickRecommendedJob", () => {
  it("prefers the best scored actionable offer", () => {
    const jobs = [
      makeJob({ id: "low", match_score: 40 }),
      makeJob({ id: "high", match_score: 92 }),
      makeJob({ id: "applied", match_score: 99, status: "applied" }),
    ];

    assert.equal(pickRecommendedJob(jobs)?.id, "high");
  });

  it("falls back to the most recent offer when nothing is scored", () => {
    const jobs = [
      makeJob({ id: "old", published_at: "2026-01-01T00:00:00.000Z" }),
      makeJob({ id: "new", published_at: "2026-03-01T00:00:00.000Z" }),
    ];

    assert.equal(pickRecommendedJob(jobs)?.id, "new");
  });

  it("uses applied offers when every offer is already in the pipeline", () => {
    const jobs = [
      makeJob({ id: "applied", status: "applied", match_score: 80 }),
      makeJob({ id: "archived", status: "archived", match_score: 95 }),
    ];

    assert.equal(pickRecommendedJob(jobs)?.id, "applied");
  });

  it("returns null without offers", () => {
    assert.equal(pickRecommendedJob([]), null);
  });
});

describe("pickRecommendedJobs", () => {
  it("returns up to three actionable offers ordered by score", () => {
    const jobs = [
      makeJob({ id: "low", match_score: 40 }),
      makeJob({ id: "high", match_score: 92 }),
      makeJob({ id: "middle", match_score: 71 }),
      makeJob({ id: "applied", match_score: 99, status: "applied" }),
    ];

    assert.deepEqual(
      pickRecommendedJobs(jobs).map((job) => job.id),
      ["high", "middle", "low"]
    );
  });

  it("places unscored offers after the scored ones", () => {
    const jobs = [
      makeJob({ id: "unscored", published_at: "2026-03-19T00:00:00.000Z" }),
      makeJob({ id: "scored", match_score: 55 }),
    ];

    assert.deepEqual(
      pickRecommendedJobs(jobs).map((job) => job.id),
      ["scored", "unscored"]
    );
  });

  it("honours the requested limit", () => {
    const jobs = [
      makeJob({ id: "a", match_score: 90 }),
      makeJob({ id: "b", match_score: 80 }),
      makeJob({ id: "c", match_score: 70 }),
    ];

    assert.equal(pickRecommendedJobs(jobs, 2).length, 2);
  });

  it("returns an empty list without offers", () => {
    assert.deepEqual(pickRecommendedJobs([]), []);
  });
});

describe("buildUpcomingDeadlines", () => {
  it("keeps only future interviews, sorted by date", () => {
    const applications = [
      makeApplication({
        id: "later",
        interview_date: "2026-03-25T14:00:00.000Z",
      }),
      makeApplication({
        id: "past",
        interview_date: "2026-03-10T14:00:00.000Z",
      }),
      makeApplication({
        id: "sooner",
        interview_date: "2026-03-21T09:00:00.000Z",
      }),
      makeApplication({ id: "none" }),
    ];

    const deadlines = buildUpcomingDeadlines(applications, NOW);

    assert.deepEqual(
      deadlines.map((deadline) => deadline.id),
      ["sooner", "later"]
    );
  });

  it("ignores invalid dates", () => {
    const deadlines = buildUpcomingDeadlines(
      [makeApplication({ id: "broken", interview_date: "not-a-date" })],
      NOW
    );

    assert.equal(deadlines.length, 0);
  });

  it("ignores interviews from rejected applications", () => {
    const deadlines = buildUpcomingDeadlines(
      [
        makeApplication({
          id: "rejected",
          status: "rejected",
          interview_date: "2026-03-25T14:00:00.000Z",
        }),
      ],
      NOW
    );

    assert.equal(deadlines.length, 0);
  });
});

describe("computeProfileProgress", () => {
  it("reports 0 % and the first missing milestone", () => {
    const progress = computeProfileProgress({
      hasCv: false,
      hasProfileReviewed: false,
      hasTargets: false,
    });

    assert.equal(progress.percent, 0);
    assert.equal(progress.completed, 0);
    assert.equal(progress.next?.label, "Ajoute ton CV");
  });

  it("reports 100 % with no next action when everything is ready", () => {
    const progress = computeProfileProgress({
      hasCv: true,
      hasProfileReviewed: true,
      hasTargets: true,
    });

    assert.equal(progress.percent, 100);
    assert.equal(progress.completed, 3);
    assert.equal(progress.next, null);
  });

  it("points to the next missing milestone", () => {
    const progress = computeProfileProgress({
      hasCv: true,
      hasProfileReviewed: false,
      hasTargets: true,
    });

    assert.equal(progress.percent, 67);
    assert.equal(progress.next?.label, "Vérifie ton profil");
  });
});

describe("computeJourney", () => {
  it("starts at the CV step", () => {
    const steps = computeJourney({
      hasCv: false,
      offersCount: 0,
      applicationsSent: 0,
      responsesCount: 0,
    });

    assert.deepEqual(
      steps.map((step) => step.state),
      ["current", "upcoming", "upcoming", "upcoming"]
    );
  });

  it("marks every completed step and the next one as current", () => {
    const steps = computeJourney({
      hasCv: true,
      offersCount: 3,
      applicationsSent: 0,
      responsesCount: 0,
    });

    assert.deepEqual(
      steps.map((step) => step.state),
      ["done", "done", "current", "upcoming"]
    );
  });

  it("marks all steps done once a response is received", () => {
    const steps = computeJourney({
      hasCv: true,
      offersCount: 3,
      applicationsSent: 2,
      responsesCount: 1,
    });

    assert.deepEqual(
      steps.map((step) => step.state),
      ["done", "done", "done", "done"]
    );
  });
});

describe("pickJourneyHighlight", () => {
  it("highlights the first step still to do", () => {
    const steps = computeJourney({
      hasCv: true,
      offersCount: 2,
      applicationsSent: 0,
      responsesCount: 0,
    });

    assert.equal(pickJourneyHighlight(steps)?.id, "applications");
  });

  it("falls back to the last step when the journey is complete", () => {
    const steps = computeJourney({
      hasCv: true,
      offersCount: 2,
      applicationsSent: 1,
      responsesCount: 1,
    });

    assert.equal(pickJourneyHighlight(steps)?.id, "responses");
  });

  it("returns null without steps", () => {
    assert.equal(pickJourneyHighlight([]), null);
  });
});

describe("buildDashboardTips", () => {
  it("shows the three starter tips without activity", () => {
    const tips = buildDashboardTips({
      jobs: [],
      applications: [],
      profilePercent: 0,
      now: NOW,
    });

    assert.deepEqual(
      tips.map((tip) => tip.id),
      ["extension", "research", "import"]
    );
  });

  it("prioritises an upcoming interview", () => {
    const tips = buildDashboardTips({
      jobs: [],
      applications: [
        makeApplication({
          id: "interview",
          status: "hr_interview",
          interview_date: "2026-03-22T10:00:00.000Z",
        }),
      ],
      profilePercent: 0,
      now: NOW,
    });

    assert.equal(tips[0].id, "interview-interview");
    assert.equal(tips[0].title, "Prépare ton entretien");
    assert.equal(tips[0].tone, "warning");
  });

  it("suggests a follow-up for an old application", () => {
    const tips = buildDashboardTips({
      jobs: [],
      applications: [
        makeApplication({
          id: "old",
          date_applied: "2026-03-01",
          company: "Beta",
        }),
      ],
      profilePercent: 100,
      now: NOW,
    });

    const followUp = tips.find((tip) => tip.id === "follow-up-old");
    assert.ok(followUp);
    assert.equal(followUp.title, "Relance Beta");
  });

  it("suggests analysing an unscored offer only once", () => {
    const tips = buildDashboardTips({
      jobs: [makeJob({ id: "fresh", title: "PM" })],
      applications: [],
      profilePercent: 100,
      now: NOW,
    });

    const ids = tips.map((tip) => tip.id);
    assert.ok(ids.includes("analyze-fresh"));
    assert.ok(!ids.includes("discover-fresh"));
  });

  it("suggests finishing a selected offer's cover letter", () => {
    const tips = buildDashboardTips({
      jobs: [
        makeJob({
          id: "selected",
          status: "selected",
          match_score: 88,
          cover_letter: null,
        }),
      ],
      applications: [],
      profilePercent: 100,
      now: NOW,
    });

    assert.ok(tips.some((tip) => tip.id === "letter-selected"));
  });

  it("reminds to complete the profile when activity exists", () => {
    const tips = buildDashboardTips({
      jobs: [
        makeJob({
          id: "selected",
          status: "selected",
          match_score: 88,
          cover_letter: "Bonjour",
        }),
      ],
      applications: [],
      profilePercent: 50,
      now: NOW,
    });

    assert.equal(tips[0].id, "profile");
  });

  it("never returns more than three tips", () => {
    const tips = buildDashboardTips({
      jobs: [
        makeJob({ id: "a" }),
        makeJob({ id: "b" }),
        makeJob({ id: "c", status: "selected", match_score: 70 }),
      ],
      applications: [
        makeApplication({
          id: "interview",
          status: "hr_interview",
          interview_date: "2026-03-22T10:00:00.000Z",
        }),
        makeApplication({ id: "old", date_applied: "2026-03-01" }),
      ],
      profilePercent: 30,
      now: NOW,
    });

    assert.ok(tips.length <= 3);
  });
});
