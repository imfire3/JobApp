import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCompleteOnboarding,
  deriveOnboardingStep,
} from "./status";

describe("deriveOnboardingStep", () => {
  it("starts at cv when nothing is ready", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: false,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "cv"
    );
  });

  it("moves to api-keys once CV is present", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      "api-keys"
    );
  });

  it("stays on api-keys until the user finishes the keys step", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: true,
        hasTargets: true,
        hasAnalysis: false,
        hasTrackedSearch: true,
        completed: false,
      }),
      "api-keys"
    );
  });

  it("returns done when completed flag is true", () => {
    assert.equal(
      deriveOnboardingStep({
        hasCv: false,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: true,
      }),
      "done"
    );
  });
});

describe("canCompleteOnboarding", () => {
  it("requires only a CV", () => {
    assert.equal(
      canCompleteOnboarding({
        hasCv: true,
        hasTargets: false,
        hasAnalysis: false,
        hasTrackedSearch: false,
        completed: false,
      }),
      true
    );
    assert.equal(
      canCompleteOnboarding({
        hasCv: false,
        hasTargets: true,
        hasAnalysis: true,
        hasTrackedSearch: true,
        completed: false,
      }),
      false
    );
  });
});
