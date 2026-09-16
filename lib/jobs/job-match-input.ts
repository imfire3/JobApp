/** Max CV characters sent to the job-match LLM (keeps latency low). */
export const JOB_MATCH_CV_MAX_CHARS = 10_000

/** Max job description characters sent to the job-match LLM. */
export const JOB_MATCH_JOB_MAX_CHARS = 6_000

export function truncateForJobMatch(
  text: string,
  maxChars: number,
  label: "cv" | "job"
): { text: string; truncated: boolean } {
  const normalized = text.trim()
  if (normalized.length <= maxChars) {
    return { text: normalized, truncated: false }
  }
  const marker =
    label === "cv"
      ? "\n\n[…truncated for match…]"
      : "\n\n[…job description truncated for match…]"
  return {
    text: `${normalized.slice(0, maxChars)}${marker}`,
    truncated: true,
  }
}

export function prepareJobMatchInputs(input: {
  cvText: string
  jobDescription: string
}): {
  cvText: string
  jobDescription: string
  cvTruncated: boolean
  jobTruncated: boolean
} {
  const cv = truncateForJobMatch(input.cvText, JOB_MATCH_CV_MAX_CHARS, "cv")
  const job = truncateForJobMatch(
    input.jobDescription,
    JOB_MATCH_JOB_MAX_CHARS,
    "job"
  )
  return {
    cvText: cv.text,
    jobDescription: job.text,
    cvTruncated: cv.truncated,
    jobTruncated: job.truncated,
  }
}
