import { PROFILE_PARSE_SYSTEM_PROMPT, buildProfileParseUserPrompt } from "@/lib/ai/prompts/profile-parse";
import OpenAI from "openai";
import { z } from "zod";
import { logPromptTrace } from "@/lib/ai/prompt-trace";
import {
  buildJobMatchSystemPrompt,
  buildJobMatchUserPrompt,
  JOB_MATCH_PROMPT_VERSION,
} from "@/lib/ai/prompts/job-match";
import {
  buildCvOptimizeSystemPrompt,
  buildCvOptimizeUserPrompt,
  CV_OPTIMIZE_PROMPT_VERSION,
} from "@/lib/ai/prompts/cv-optimize";
import { cvOptimizeResponseSchema, type CvOptimizeResponse } from "@/lib/ai/schemas/cv-optimize";
import { parseJobMatchAnalysis } from "@/lib/ai/schemas/job-match";
import { prepareJobMatchInputs } from "@/lib/jobs/job-match-input";
import { WEBSITE_PASTE_SYSTEM_PROMPT } from "@/lib/ai/prompts/website-paste";
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

export async function extractWebsitePasteWithAI(text: string): Promise<unknown> {
  const response = await getOpenAIClient().chat.completions.create({
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0,
    max_tokens: 650,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: WEBSITE_PASTE_SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify({ text }) },
    ],
  }, { timeout: 8000, maxRetries: 0 });
  return JSON.parse(response.choices[0]?.message?.content ?? "null");
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
  const prepared = prepareJobMatchInputs({
    cvText: params.cvText,
    jobDescription: params.jobDescription,
  });
  const truncatedNote =
    prepared.cvTruncated || prepared.jobTruncated
      ? "Input may be truncated for latency; analyze only the provided text."
      : null;

  let response: OpenAI.Chat.Completions.ChatCompletion;
  const userPrompt = buildJobMatchUserPrompt({
    ...params,
    cvText: prepared.cvText,
    jobDescription: prepared.jobDescription,
    truncatedNote,
  });
  try {
    logPromptTrace({
      feature: "job-match",
      promptVersion: JOB_MATCH_PROMPT_VERSION,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      systemPrompt,
      userPrompt,
    });
    response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 3500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });
  } catch (error) {
    throw mapOpenAIError(error);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  return parseJobMatchAnalysis(JSON.parse(content), {
    cvText: prepared.cvText,
  });
}

export async function optimizeCvForJob(params: {
  cvText: string;
  jobPosting: string;
  candidateConfirmations?: string | null;
}): Promise<CvOptimizeResponse> {
  const client = getOpenAIClient();
  const systemPrompt = buildCvOptimizeSystemPrompt();
  const userPrompt = buildCvOptimizeUserPrompt({
    cvText: params.cvText,
    jobPosting: params.jobPosting,
    candidateConfirmations: params.candidateConfirmations ?? null,
  });

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    logPromptTrace({
      feature: "cv-optimize",
      promptVersion: CV_OPTIMIZE_PROMPT_VERSION,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      systemPrompt,
      userPrompt,
    });
    response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 3500,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (error) {
    throw mapOpenAIError(error);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");
  const parsed = JSON.parse(content);
  return cvOptimizeResponseSchema.parse(parsed);
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
            PROFILE_PARSE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildProfileParseUserPrompt(cvText),
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
