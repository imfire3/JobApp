import OpenAI from "openai";
import { z } from "zod";
import {
  buildJobMatchSystemPrompt,
  buildJobMatchUserPrompt,
} from "@/lib/ai/prompts/job-match";
import { parseJobMatchAnalysis } from "@/lib/ai/schemas/job-match";
import {
  mapOpenAIError,
  resolveOpenAIApiKey,
} from "@/lib/openai/api-key";
import type { JobAnalysis, ParsedCvProfile } from "@/types";

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

function getOpenAIClient(apiKey?: string | null) {
  return new OpenAI({ apiKey: resolveOpenAIApiKey(apiKey) });
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
  options?: { systemPrompt?: string | null; apiKey?: string | null }
): Promise<JobAnalysis> {
  const client = getOpenAIClient(options?.apiKey);
  const systemPrompt = buildJobMatchSystemPrompt(options?.systemPrompt);

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
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
  } catch (error) {
    throw mapOpenAIError(error);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return parseJobMatchAnalysis(JSON.parse(content), { cvText: params.cvText });
}

export async function parseCvProfileWithAI(
  cvText: string,
  options?: { apiKey?: string | null }
): Promise<ParsedCvProfile> {
  const client = getOpenAIClient(options?.apiKey);
  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await client.chat.completions.create({
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
  } catch (error) {
    throw mapOpenAIError(error);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty CV parse response");
  return parsedCvSchema.parse(JSON.parse(content));
}
