import OpenAI from "openai";
import { z } from "zod";
import {
  buildJobMatchUserPrompt,
  JOB_MATCH_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/job-match";
import type { JobAnalysis, ParsedCvProfile } from "@/types";

const analysisSchema = z.object({
  match_score: z.number().min(0).max(100),
  match_reasons: z.array(z.string()).min(3).max(8),
  match_gaps: z.array(z.string()).min(2).max(6),
  cover_letter_angle: z.string(),
  keywords_matched: z.array(z.string()).min(1).max(20),
  keywords_missing: z.array(z.string()).min(1).max(20),
  cv_improvements: z.array(z.string()).min(3).max(8),
  job_posting_summary: z.string().min(1),
});

const parsedCvSchema = z.object({
  experiences: z.array(z.string()),
  skills: z.array(z.string()),
  languages: z.array(z.string()),
  education: z.array(z.string()),
  tools: z.array(z.string()),
  years_experience: z.number().nullable(),
  desired_salary: z.number().nullable(),
  desired_locations: z.array(z.string()),
  target_roles: z.array(z.string()),
  preferred_industries: z.array(z.string()),
  soft_skills: z.array(z.string()),
  keywords: z.array(z.string()),
});

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function analyzeJobMatch(
  params: {
    cvText: string;
    targetRoles: string[];
    targetLocations: string[];
    jobTitle: string;
    company: string;
    jobDescription: string;
    location?: string;
    remote?: boolean;
  },
  options?: { systemPrompt?: string | null }
): Promise<JobAnalysis> {
  const client = getOpenAIClient();
  const systemPrompt = options?.systemPrompt?.trim() || JOB_MATCH_SYSTEM_PROMPT;

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: buildJobMatchUserPrompt(params),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = analysisSchema.parse(JSON.parse(content));
  return parsed;
}

export async function parseCvProfileWithAI(cvText: string): Promise<ParsedCvProfile> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Extract a structured job-search profile from the CV text. Return strict JSON with fields: experiences, skills, languages, education, tools, years_experience, desired_salary, desired_locations, target_roles, preferred_industries, soft_skills, keywords. Keep entries concise and deduplicated.",
      },
      {
        role: "user",
        content: cvText,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty CV parse response");
  return parsedCvSchema.parse(JSON.parse(content));
}
