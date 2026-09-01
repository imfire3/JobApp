import OpenAI from "openai";
import { z } from "zod";
import type { JobAnalysis, ParsedCvProfile } from "@/types";

const analysisSchema = z.object({
  match_score: z.number().min(0).max(100),
  match_reasons: z.array(z.string()).length(5),
  match_gaps: z.array(z.string()).length(3),
  cover_letter_angle: z.string(),
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

export async function analyzeJobMatch(params: {
  cvText: string;
  targetRoles: string[];
  targetLocations: string[];
  jobTitle: string;
  company: string;
  jobDescription: string;
  location?: string;
  remote?: boolean;
}): Promise<JobAnalysis> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a senior career coach specializing in Product Owner and Product Manager roles in France.
Analyze how well a job fits a candidate's CV and preferences.
Return JSON with: match_score (0-100 integer), match_reasons (exactly 5 concise bullets), match_gaps (exactly 3 risks or missing points), cover_letter_angle (one paragraph suggesting the best angle for a cover letter).
Be honest and specific — avoid generic praise.`,
      },
      {
        role: "user",
        content: JSON.stringify({
          cv: params.cvText,
          target_roles: params.targetRoles,
          target_locations: params.targetLocations,
          job: {
            title: params.jobTitle,
            company: params.company,
            location: params.location,
            remote: params.remote,
            description: params.jobDescription,
          },
        }),
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
