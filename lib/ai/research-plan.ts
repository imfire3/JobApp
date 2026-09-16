import OpenAI from "openai"
import {
  RESEARCH_PLAN_PROMPT_VERSION,
  RESEARCH_PLAN_SYSTEM_PROMPT,
  buildResearchPlanUserPrompt,
} from "@/lib/ai/prompts/research-plan"
import {
  parseResearchPlan,
  type ResearchPlan,
} from "@/lib/ai/schemas/research-plan"
import {
  mapOpenAIError,
  resolveOpenAIApiKey,
} from "@/lib/openai/api-key"

export async function generateResearchPlan(
  prompt: string,
  options?: { apiKey?: string | null }
): Promise<{ plan: ResearchPlan; promptVersion: string }> {
  const client = new OpenAI({ apiKey: resolveOpenAIApiKey(options?.apiKey) })
  let response: OpenAI.Chat.Completions.ChatCompletion
  try {
    response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: RESEARCH_PLAN_SYSTEM_PROMPT },
        { role: "user", content: buildResearchPlanUserPrompt(prompt) },
      ],
    })
  } catch (error) {
    throw mapOpenAIError(error)
  }

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error("Empty research plan from OpenAI")

  return {
    plan: parseResearchPlan(JSON.parse(content)),
    promptVersion: RESEARCH_PLAN_PROMPT_VERSION,
  }
}
