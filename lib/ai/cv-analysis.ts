import OpenAI from "openai";
import {
  buildCvAnalysisUserPrompt,
  CV_ANALYSIS_PROMPT_VERSION,
  CV_ANALYSIS_SYSTEM_PROMPT,
} from "@/lib/ai/prompts/cv-analysis";
import {
  CvAnalysisValidationError,
  parseCvAtsAnalysis,
  type CvAtsAnalysis,
} from "@/lib/ai/schemas/cv-analysis";

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

function getModel() {
  return process.env.OPENAI_MODEL ?? "gpt-4o-mini";
}

export async function analyzeCvForAts(
  cvText: string,
  options?: { systemPrompt?: string | null }
): Promise<{
  analysis: CvAtsAnalysis;
  model: string;
  promptVersion: string;
}> {
  const client = getOpenAIClient();
  const model = getModel();
  const customPrompt = options?.systemPrompt?.trim();
  const systemPrompt = customPrompt || CV_ANALYSIS_SYSTEM_PROMPT;
  const promptVersion = customPrompt ? "custom" : CV_ANALYSIS_PROMPT_VERSION;

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await client.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildCvAnalysisUserPrompt(cvText) },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI request failed";
    throw new Error(message);
  }

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty CV analysis response from OpenAI");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new CvAnalysisValidationError("CV analysis response is not valid JSON");
  }

  const analysis = parseCvAtsAnalysis(parsed);
  return { analysis, model, promptVersion };
}
